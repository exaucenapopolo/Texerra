import { Router, type Request, type Response } from "express";
import { firestoreDb, getAdminAuth } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAuth.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { sendAdminContactEmail } from "../lib/mailer.js";

const router = Router();

/**
 * Taux de secours utilisé uniquement pour les anciennes commandes qui
 * n'ont réellement aucun champ de marge (marginNum / margin).
 * La marge réelle enregistrée (marginNum) reste prioritaire partout.
 */
const MARGIN_RATE = 0.65;

/** Plafond d'extraction pour les agrégations en mémoire. */
const MAX_FETCH = 50000;

/* ────────────────────────────────────────────────────────────────── */
/* Helpers                                                            */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Parse "YYYY-MM-DD" en date locale (minuit local pour start, 23:59:59.999
 * local pour end). Évite les décalages de fuseau dus à new Date("YYYY-MM-DD").
 */
function parseLocalDate(str: string, endOfDay: boolean): Date {
  const parts = str.split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
  }
  const d = new Date(str);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

function parseRange(req: Request): { startIso: string; endIso: string } {
  const now = new Date();
  const startParam = req.query.start as string | undefined;
  const endParam = req.query.end as string | undefined;

  if (startParam && endParam) {
    const start = parseLocalDate(startParam, false);
    const end = parseLocalDate(endParam, true);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function parsePagination(req: Request, defaultSize = 20): { page: number; pageSize: number } {
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const raw = parseInt(req.query.pageSize as string) || defaultSize;
  const pageSize = Math.min(Math.max(raw, 5), 200);
  return { page, pageSize };
}

function getCreatedAtIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in (value as object)) {
    try {
      return (value as Timestamp).toDate().toISOString();
    } catch {
      return new Date(0).toISOString();
    }
  }
  return new Date(0).toISOString();
}

function num(v: unknown, fallback: number | null = null): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function escapeCsv(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes(";")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(",");
}

/**
 * Renvoie la marge réelle d'une commande.
 * Priorité : marginNum > margin (string/number) > null (fallback externe).
 */
function computeOrderMargin(d: any): number | null {
  const m = num(d?.marginNum) ?? num(d?.margin);
  return m;
}

type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
};

/**
 * Récupère un lot d'utilisateurs par leurs IDs (batch getAll).
 * Renvoie une Map id → informations publiques.
 */
async function fetchUsersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
  const map = new Map<string, PublicUser>();
  const unique = Array.from(new Set(ids.filter((x) => typeof x === "string" && x.length > 0)));
  if (unique.length === 0) return map;

  const CHUNK = 200;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const refs = chunk.map((id) => firestoreDb.collection("users").doc(id));
    try {
      const docs = await firestoreDb.getAll(...refs);
      for (const doc of docs) {
        if (!doc.exists) continue;
        const d = doc.data() as any;
        map.set(doc.id, {
          id: doc.id,
          name: d?.name ?? "",
          email: d?.email ?? "",
          phone: d?.phone ?? "",
          balance: num(d?.balance, 0) ?? 0,
        });
      }
    } catch (err) {
      console.error("fetchUsersByIds chunk error:", err);
    }
  }
  return map;
}

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/stats                                               */
/* Multi-pays : aucune restriction par pays.                          */
/* Marge : somme des marginNum réels (fallback MARGIN_RATE).          */
/* ────────────────────────────────────────────────────────────────── */

router.get("/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const usersCol = firestoreDb.collection("users");
    const ordersCol = firestoreDb.collection("orders");
    const topupsCol = firestoreDb.collection("topups");

    const [
      totalUsersSnap,
      newUsersSnap,
      totalOrdersSnap,
      activeOrdersSnap,
      pendingOrdersSnap,
      cancelledOrdersSnap,
      expiredOrdersSnap,
      completedOrdersDataSnap,
      completedTopupsDataSnap,
    ] = await Promise.all([
      usersCol.count().get(),
      usersCol
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),

      ordersCol
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),
      ordersCol
        .where("status", "==", "active")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),
      ordersCol
        .where("status", "==", "pending_payment")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),
      ordersCol
        .where("status", "==", "cancelled")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),
      ordersCol
        .where("status", "==", "expired")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),

      // Récupération des commandes réussies pour calcul marge réelle
      ordersCol
        .where("status", "==", "completed")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .limit(MAX_FETCH)
        .get(),

      // Récupération des topups réussis (tous pays confondus)
      topupsCol
        .where("status", "==", "completed")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .limit(MAX_FETCH)
        .get(),
    ]);

    // Revenus + marge réelle
    let revenue = 0;
    let margin = 0;
    for (const doc of completedOrdersDataSnap.docs) {
      const d = doc.data();
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      const realMargin = computeOrderMargin(d);
      revenue += price;
      margin += realMargin != null ? realMargin : price * MARGIN_RATE;
    }

    // Total déposé (tous pays) avec compatibilité des anciennes données
    let totalTopupAmount = 0;
    for (const doc of completedTopupsDataSnap.docs) {
      const d = doc.data();
      totalTopupAmount += num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0;
    }

    const supplierCost = Math.max(0, revenue - margin);
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : MARGIN_RATE * 100;

    res.json({
      totalUsers: totalUsersSnap.data().count,
      newUsers: newUsersSnap.data().count,
      totalOrders: totalOrdersSnap.data().count,
      completedOrders: completedOrdersDataSnap.docs.length,
      activeOrders: activeOrdersSnap.data().count,
      pendingOrders: pendingOrdersSnap.data().count,
      cancelledOrders: cancelledOrdersSnap.data().count,
      expiredOrders: expiredOrdersSnap.data().count,
      totalTopups: completedTopupsDataSnap.docs.length,
      totalTopupAmount,
      revenue,
      margin,
      marginPercent,
      supplierCost,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({
      error: "Erreur lors du calcul des statistiques",
      details: String(err),
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/chart                                               */
/* ────────────────────────────────────────────────────────────────── */

router.get("/chart", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const start = new Date(startIso);
    const end = new Date(endIso);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const groupByMonth = daysDiff > 90;

    const [ordersSnap, topupsSnap, usersSnap] = await Promise.all([
      firestoreDb
        .collection("orders")
        .where("status", "==", "completed")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .orderBy("createdAt", "asc")
        .limit(2000)
        .get(),
      firestoreDb
        .collection("topups")
        .where("status", "==", "completed")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .orderBy("createdAt", "asc")
        .limit(2000)
        .get(),
      firestoreDb
        .collection("users")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .orderBy("createdAt", "asc")
        .limit(2000)
        .get(),
    ]);

    const bucket = new Map<
      string,
      { revenue: number; topups: number; orders: number; margin: number; users: number }
    >();

    function getKey(date: Date): string {
      if (groupByMonth) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
      return date.toISOString().slice(0, 10);
    }
    function ensureBucket(key: string) {
      if (!bucket.has(key)) {
        bucket.set(key, { revenue: 0, topups: 0, orders: 0, margin: 0, users: 0 });
      }
      return bucket.get(key)!;
    }

    ordersSnap.forEach((doc) => {
      const d = doc.data();
      const date = new Date(getCreatedAtIso(d.createdAt));
      const b = ensureBucket(getKey(date));
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      const realMargin = computeOrderMargin(d);
      b.revenue += price;
      b.margin += realMargin != null ? realMargin : price * MARGIN_RATE;
      b.orders += 1;
    });
    topupsSnap.forEach((doc) => {
      const d = doc.data();
      const date = new Date(getCreatedAtIso(d.createdAt));
      const b = ensureBucket(getKey(date));
      b.topups += num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0;
    });
    usersSnap.forEach((doc) => {
      const d = doc.data();
      const date = new Date(getCreatedAtIso(d.createdAt));
      const b = ensureBucket(getKey(date));
      b.users += 1;
    });

    const series = Array.from(bucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
    res.json(series);
  } catch (err) {
    console.error("Admin chart error:", err);
    res.status(500).json({
      error: "Erreur lors du calcul du graphique",
      details: String(err),
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/orders                                              */
/* Filtre statut + période + pagination + infos utilisateur.          */
/* ────────────────────────────────────────────────────────────────── */

router.get("/orders", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const status = req.query.status as string | undefined;
    const { page, pageSize } = parsePagination(req);

    let query: FirebaseFirestore.Query = firestoreDb
      .collection("orders")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc");

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const countSnap = await query.count().get();
    const total = countSnap.data().count;
    const offset = (page - 1) * pageSize;
    const snap = await query.limit(pageSize).offset(offset).get();

    // Jointure utilisateurs
    const userIds = snap.docs.map((doc) => String(doc.data().userId ?? "")).filter(Boolean);
    const usersMap = await fetchUsersByIds(userIds);

    const orders = snap.docs.map((doc) => {
      const d = doc.data();
      const uid = String(d.userId ?? "");
      const u = usersMap.get(uid);
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      return {
        id: doc.id,
        userId: uid,
        user: u
          ? { id: u.id, name: u.name, email: u.email, phone: u.phone }
          : null,
        countryCode: d.countryCode,
        serviceCode: d.serviceCode,
        phoneNumber: d.phoneNumber,
        status: d.status,
        price,
        costUsd: num(d.costUsdNum) ?? num(d.costUsd),
        margin: computeOrderMargin(d),
        createdAt: getCreatedAtIso(d.createdAt),
      };
    });

    res.json({ orders, total, page, pageSize });
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des commandes",
      details: String(err),
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/topups                                              */
/* Multi-pays : tous les dépôts sont inclus, countryIso est informatif.*/
/* ────────────────────────────────────────────────────────────────── */

router.get("/topups", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const status = req.query.status as string | undefined;
    const { page, pageSize } = parsePagination(req);

    let query: FirebaseFirestore.Query = firestoreDb
      .collection("topups")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc");

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const countSnap = await query.count().get();
    const total = countSnap.data().count;
    const offset = (page - 1) * pageSize;
    const snap = await query.limit(pageSize).offset(offset).get();

    const userIds = snap.docs.map((doc) => String(doc.data().userId ?? "")).filter(Boolean);
    const usersMap = await fetchUsersByIds(userIds);

    const topups = snap.docs.map((doc) => {
      const d = doc.data();
      const uid = String(d.userId ?? "");
      const u = usersMap.get(uid);
      return {
        id: doc.id,
        userId: uid,
        user: u
          ? { id: u.id, name: u.name, email: u.email, phone: u.phone }
          : null,
        amountEur: num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0,
        amountLocal: num(d.amountLocal),
        localCurrency: d.localCurrency ?? null,
        countryIso: d.countryIso ?? null,
        status: d.status,
        externalId: d.externalId ?? null,
        createdAt: getCreatedAtIso(d.createdAt),
      };
    });

    res.json({ topups, total, page, pageSize });
  } catch (err) {
    console.error("Admin topups error:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des dépôts",
      details: String(err),
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/users                                               */
/* Recherche, filtres, tri, pagination, stats de commandes.           */
/* ────────────────────────────────────────────────────────────────── */

type UserStats = {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  expiredOrders: number;
  totalSpent: number;
};

router.get("/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req);
    const rawSearch = String(req.query.search ?? "").trim();
    const search = rawSearch.toLowerCase();
    const filter = String(req.query.filter ?? "all");
    const sort = String(req.query.sort ?? "recent");
    const usersCol = firestoreDb.collection("users");

    // Classement par commandes réellement réussies. Il n'est calculé que lorsque
    // l'administrateur ouvre ce filtre, sur la période choisie (pas au chargement).
    if (filter === "top") {
      const topPeriod = String(req.query.topPeriod ?? "week");
      const localNow = new Date(Date.now() + 60 * 60 * 1000); // Africa/Douala (UTC+1)
      const localStart = new Date(localNow);
      localStart.setUTCHours(0, 0, 0, 0);
      if (topPeriod === "week") {
        const day = localStart.getUTCDay() || 7;
        localStart.setUTCDate(localStart.getUTCDate() - day + 1);
      } else if (topPeriod === "month") localStart.setUTCDate(1);
      else if (topPeriod === "year") { localStart.setUTCMonth(0, 1); }
      else if (topPeriod === "all") localStart.setTime(new Date("2000-01-01T00:00:00Z").getTime() + 60 * 60 * 1000);
      const queryLimit = topPeriod === "all" ? MAX_FETCH : 10000;
      let ordersQuery: FirebaseFirestore.Query = firestoreDb.collection("orders");
      if (topPeriod !== "all") {
        const startIso = new Date(localStart.getTime() - 60 * 60 * 1000).toISOString();
        ordersQuery = ordersQuery.where("createdAt", ">=", startIso);
      }
      const rankingOrders = await ordersQuery.orderBy("createdAt", "desc").limit(queryLimit).get();
      const rankMap = new Map<string, UserStats>();
      for (const doc of rankingOrders.docs) {
        const d = doc.data(); const uid = String(d.userId ?? "");
        if (!uid) continue;
        const stat = rankMap.get(uid) ?? { totalOrders: 0, completedOrders: 0, activeOrders: 0, pendingOrders: 0, cancelledOrders: 0, expiredOrders: 0, totalSpent: 0 };
        stat.totalOrders += 1;
        if (d.status === "completed") { stat.completedOrders += 1; stat.totalSpent += num(d.priceNum) ?? num(d.price, 0) ?? 0; }
        else if (d.status === "active") stat.activeOrders += 1;
        else if (d.status === "pending_payment" || d.status === "pending") stat.pendingOrders += 1;
        else if (d.status === "cancelled") stat.cancelledOrders += 1;
        else if (d.status === "expired") stat.expiredOrders += 1;
        rankMap.set(uid, stat);
      }
      const ranked = [...rankMap.entries()].filter(([, stat]) => stat.completedOrders > 0).sort((a,b) => b[1].completedOrders - a[1].completedOrders || b[1].totalSpent - a[1].totalSpent);
      const total = ranked.length;
      const selected = ranked.slice((page - 1) * pageSize, page * pageSize);
      const userRefs = selected.map(([id]) => usersCol.doc(id));
      const profileDocs = userRefs.length ? await firestoreDb.getAll(...userRefs) : [];
      const users = profileDocs.filter((doc) => doc.exists).map((doc) => {
        const d = doc.data()!; const stat = rankMap.get(doc.id)!;
        return { id: doc.id, name: d.name ?? "", email: d.email ?? "", phone: d.phone ?? "", balance: num(d.balance, 0) ?? 0, createdAt: getCreatedAtIso(d.createdAt), lastExportedAt: d.lastExportedAt ?? null, exportCount: Number(d.exportCount ?? 0), stats: stat, affiliate: null as any };
      });
      if (users.length) {
        const byCustomer = new Map<string, FirebaseFirestore.DocumentData>();
        for (let i = 0; i < users.length; i += 30) {
          const group = users.slice(i, i + 30).map((u) => u.id);
          const attribSnap = await firestoreDb.collection("affiliate_attributions").where("customerId", "in", group).get();
          for (const doc of attribSnap.docs) byCustomer.set(String(doc.data().customerId), doc.data());
        }
        const commercialIds = [...new Set([...byCustomer.values()].map((a) => String(a.commercialId ?? "")).filter(Boolean))];
        const commercialDocs = await Promise.all(commercialIds.map((id) => firestoreDb.collection("commercials").doc(id).get()));
        const commercialMap = new Map(commercialDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
        for (const user of users) {
          const a = byCustomer.get(user.id); if (!a) continue;
          const c: any = commercialMap.get(String(a.commercialId));
          user.affiliate = { commercialId: String(a.commercialId), commercialName: String(c?.name ?? "Commercial"), affiliateCode: String(a.affiliateCode ?? c?.affiliateCode ?? "") };
        }
      }
      res.json({ users, total, page, pageSize, rankingPeriod: topPeriod, truncated: rankingOrders.size >= queryLimit });
      return;
    }

    // Recherche ciblée : UID exact, début d'e-mail, de nom ou de téléphone.
    // Une recherche ne déclenche plus une lecture des 50 000 profils.
    let userDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    let total = 0;
    if (search) {
      const candidates = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      const exact = await usersCol.doc(rawSearch).get();
      if (exact.exists) candidates.set(exact.id, exact as FirebaseFirestore.QueryDocumentSnapshot);
      const prefixQueries: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
      const emailPrefix = usersCol.orderBy("email").startAt(search).endAt(search + "\uf8ff").limit(100).get();
      prefixQueries.push(emailPrefix);
      const nameVariants = [...new Set([rawSearch, rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1)])];
      for (const variant of nameVariants) {
        prefixQueries.push(usersCol.orderBy("name").startAt(variant).endAt(variant + "\uf8ff").limit(100).get());
      }
      if (/^[+\d\s()-]+$/.test(rawSearch)) {
        const phonePrefix = usersCol.orderBy("phone").startAt(rawSearch).endAt(rawSearch + "\uf8ff").limit(100).get();
        prefixQueries.push(phonePrefix);
      }
      const matches = await Promise.all(prefixQueries);
      for (const snap of matches) for (const doc of snap.docs) candidates.set(doc.id, doc);
      userDocs = [...candidates.values()].filter((doc) => {
        const d = doc.data();
        return String(d.email ?? "").toLowerCase().startsWith(search)
          || String(d.name ?? "").toLowerCase().startsWith(search)
          || String(d.phone ?? "").replace(/\D/g, "").startsWith(search.replace(/\D/g, ""))
          || doc.id.toLowerCase() === search;
      });
      total = userDocs.length;
    } else {
      const order = sort === "oldest" ? "asc" : "desc";
      const [pageSnap, countSnap] = await Promise.all([
        usersCol.orderBy("createdAt", order).offset((page - 1) * pageSize).limit(pageSize).get(),
        usersCol.count().get(),
      ]);
      userDocs = pageSnap.docs;
      total = countSnap.data().count;
    }

    // Une seule requête groupée récupère les commandes des seuls utilisateurs
    // de la page, au lieu de lire toutes les commandes de toute la plateforme.
    let enriched = userDocs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        email: d.email ?? "",
        name: d.name ?? "",
        phone: d.phone ?? "",
        balance: num(d.balance, 0) ?? 0,
        createdAt: getCreatedAtIso(d.createdAt),
        lastSignInAt: d.lastSignInAt ?? null,
        successfulOrdersCount: Number(d.successfulOrdersCount ?? 0),
        totalOrdersCount: Number(d.totalOrdersCount ?? 0),
        lastExportedAt: d.lastExportedAt ?? null,
        exportCount: Number(d.exportCount ?? 0),
        affiliate: null as null | { commercialId: string; commercialName: string; affiliateCode: string },
        stats: {
          totalOrders: Number(d.totalOrdersCount ?? 0),
          completedOrders: Number(d.successfulOrdersCount ?? 0),
          activeOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          expiredOrders: 0,
          totalSpent: Number(d.totalSuccessfulSpend ?? 0),
        } as UserStats,
      };
    });

    // Les compteurs enregistrés sur le profil évitent de relire toutes les
    // commandes à chaque affichage. Les anciens profils sont vérifiés avec
    // des agrégations count() (aucun document commande n'est téléchargé).
    if (userDocs.length) {
      const ids = userDocs.map((doc) => doc.id);
      const legacyUsers = userDocs.filter((doc) => {
        const d = doc.data();
        return d.totalOrdersCount === undefined || d.successfulOrdersCount === undefined;
      });
      if (legacyUsers.length) {
        const legacyStats = await Promise.all(legacyUsers.map(async (doc) => {
          const uid = doc.id;
          const [totalSnap, completedSnap] = await Promise.all([
            firestoreDb.collection("orders").where("userId", "==", uid).count().get(),
            firestoreDb.collection("orders").where("userId", "==", uid).where("status", "==", "completed").count().get(),
          ]);
          const counts = { totalOrders: totalSnap.data().count, successfulOrdersCount: completedSnap.data().count };
          await firestoreDb.collection("users").doc(uid).set(counts, { merge: true });
          return { uid, totalOrders: counts.totalOrders, completedOrders: counts.successfulOrdersCount };
        }));
        const legacyMap = new Map(legacyStats.map((item) => [item.uid, item]));
        enriched = enriched.map((u) => {
          const source = userDocs.find((doc) => doc.id === u.id)?.data() ?? {};
          const legacy = legacyMap.get(u.id);
          if (!legacy) return u;
          return {
            ...u,
            stats: {
              ...u.stats,
              totalOrders: source.totalOrdersCount === undefined ? legacy.totalOrders : u.stats.totalOrders,
              completedOrders: source.successfulOrdersCount === undefined ? legacy.completedOrders : u.stats.completedOrders,
            },
          };
        });
      }

      // Attribution affiliée : une lecture bornée aux clients visibles.
      for (let i = 0; i < ids.length; i += 30) {
        const group = ids.slice(i, i + 30);
        const attribSnap = await firestoreDb.collection("affiliate_attributions").where("customerId", "in", group).get();
        const commercialIds = [...new Set(attribSnap.docs.map((d) => String(d.data().commercialId ?? "")).filter(Boolean))];
        const commercialDocs = await Promise.all(commercialIds.map((id) => firestoreDb.collection("commercials").doc(id).get()));
        const commercialMap = new Map(commercialDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
        const byCustomer = new Map(attribSnap.docs.map((d) => [String(d.data().customerId), d.data()]));
        enriched = enriched.map((u) => {
          const a = byCustomer.get(u.id);
          if (!a) return u;
          const c: any = commercialMap.get(String(a.commercialId));
          return { ...u, affiliate: { commercialId: String(a.commercialId), commercialName: String(c?.name ?? "Commercial"), affiliateCode: String(a.affiliateCode ?? c?.affiliateCode ?? "") } };
        });
      }
    }

    if (filter === "hasOrders") enriched = enriched.filter((u) => u.stats.totalOrders > 0);
    else if (filter === "hasBalance") enriched = enriched.filter((u) => u.balance > 0);
    else if (filter === "neverOrdered") enriched = enriched.filter((u) => u.stats.totalOrders === 0);
    else if (filter === "top") enriched = enriched.filter((u) => u.stats.completedOrders > 0);

    if (sort === "balanceDesc") enriched.sort((a, b) => b.balance - a.balance);
    else if (sort === "completedOrdersDesc" || filter === "top") {
      enriched.sort((a, b) => b.stats.completedOrders - a.stats.completedOrders || b.stats.totalOrders - a.stats.totalOrders);
    } else if (sort === "oldest") enriched.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Recherche = résultat ciblé paginé ; sans recherche, Firestore a déjà paginé.
    const pageUsers = search ? enriched.slice((page - 1) * pageSize, page * pageSize) : enriched;
    res.json({ users: pageUsers, total: filter === "all" ? total : enriched.length, page, pageSize, searchMode: !!search });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs", details: String(err) });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/users/:id — fiche détaillée à la demande             */
/* ────────────────────────────────────────────────────────────────── */
router.get("/users/:id/profile", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "");
    const userRef = firestoreDb.collection("users").doc(id);
    const [userSnap, ordersSnap, attributionSnap] = await Promise.all([
      userRef.get(),
      firestoreDb.collection("orders").where("userId", "==", id).orderBy("createdAt", "desc").limit(25).get(),
      firestoreDb.collection("affiliate_attributions").where("customerId", "==", id).limit(1).get(),
    ]);
    if (!userSnap.exists) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
    const d = userSnap.data()!;
    let authMeta: any = null;
    try {
      const authUser = await getAdminAuth().getUser(id);
      authMeta = { creationTime: authUser.metadata.creationTime ?? null, lastSignInTime: authUser.metadata.lastSignInTime ?? null, emailVerified: authUser.emailVerified };
    } catch { /* Certains comptes historiques peuvent ne plus être présents dans Firebase Auth. */ }
    let affiliate: any = null;
    if (!attributionSnap.empty) {
      const a = attributionSnap.docs[0].data();
      const commercialSnap = await firestoreDb.collection("commercials").doc(String(a.commercialId)).get();
      const c = commercialSnap.data();
      affiliate = { commercialId: a.commercialId, affiliateCode: a.affiliateCode, name: c?.name ?? "Commercial", email: c?.email ?? "", country: c?.country ?? "" };
    }
    const serviceLabels: Record<string, string> = {
      wa: "WhatsApp", wb: "WhatsApp Business", ig: "Instagram", tg: "Telegram",
      fb: "Facebook", go: "Google", tk: "TikTok", tw: "Twitter / X",
      ap: "Apple", am: "Amazon", ms: "Microsoft", dc: "Discord",
      sc: "Snapchat", nf: "Netflix", ub: "Uber", ln: "LinkedIn",
      pp: "PayPal", bn: "Binance", vi: "Viber", yt: "YouTube",
      wc: "WeChat", sp: "Spotify", si: "Signal", td: "TikTok",
    };
    const orders = ordersSnap.docs.map((doc) => {
      const o = doc.data();
      const serviceCode = String(o.serviceCode ?? "");
      return { id: doc.id, createdAt: getCreatedAtIso(o.createdAt), status: o.status ?? "unknown", serviceCode, serviceName: o.serviceName ?? serviceLabels[serviceCode] ?? serviceCode.toUpperCase(), countryCode: o.countryCode ?? "", phoneNumber: o.phoneNumber ?? "", smsCode: o.smsCode ?? null, price: num(o.priceNum) ?? num(o.price, 0) ?? 0, margin: computeOrderMargin(o) };
    });
    const totalOrdersSnap = await firestoreDb.collection("orders").where("userId", "==", id).count().get();
    const successfulOrdersSnap = await firestoreDb.collection("orders").where("userId", "==", id).where("status", "==", "completed").count().get();
    const historySnap = await userRef.collection("contactHistory").orderBy("createdAt", "desc").limit(20).get();
    res.json({
      user: { id, name: d.name ?? "", email: d.email ?? "", phone: d.phone ?? "", balance: num(d.balance, 0) ?? 0, currency: d.currency ?? "EUR", createdAt: getCreatedAtIso(d.createdAt), updatedAt: d.updatedAt ?? null, auth: authMeta, stats: { totalOrders: totalOrdersSnap.data().count, completedOrders: successfulOrdersSnap.data().count, totalSuccessfulSpend: num(d.totalSuccessfulSpend, 0) ?? 0 }, affiliate },
      orders,
      contactHistory: historySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    });
  } catch (err) {
    console.error("Admin user detail error:", err);
    res.status(500).json({ error: "Impossible de charger la fiche utilisateur" });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* POST /api/admin/contact/email — vrai envoi via Resend               */
/* ────────────────────────────────────────────────────────────────── */
router.post("/contact/email", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = String(req.body?.userId ?? "");
    const subject = String(req.body?.subject ?? "").trim().slice(0, 180);
    const message = String(req.body?.message ?? "").trim().slice(0, 12000);
    const templateId = String(req.body?.templateId ?? "custom").slice(0, 80);
    if (!userId || !subject || !message) { res.status(400).json({ error: "Destinataire, objet et message sont obligatoires." }); return; }
    const userSnap = await firestoreDb.collection("users").doc(userId).get();
    if (!userSnap.exists) { res.status(404).json({ error: "Utilisateur introuvable." }); return; }
    const user = userSnap.data()!;
    const email = String(user.email ?? "").trim();
    if (!email) { res.status(400).json({ error: "Cet utilisateur n'a pas d'adresse e-mail." }); return; }
    const sent = await sendAdminContactEmail({ to: email, name: String(user.name ?? "cher client"), subject, message, contextLabel: "Message personnel de l'équipe Texerra SMS" });
    const log = { channel: "email", status: "sent", templateId, subject, message, recipient: email, recipientName: String(user.name ?? ""), resendId: sent.id ?? null, createdAt: new Date().toISOString() };
    const batch = firestoreDb.batch();
    const historyRef = firestoreDb.collection("users").doc(userId).collection("contactHistory").doc();
    batch.set(historyRef, log);
    const globalRef = firestoreDb.collection("admin_contact_logs").doc(historyRef.id);
    batch.set(globalRef, { ...log, userId });
    await batch.commit();
    res.json({ ok: true, id: sent.id ?? null, message: "E-mail envoyé avec succès." });
  } catch (err) {
    console.error("Admin email send error:", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Échec de l'envoi de l'e-mail." });
  }
});

/* Journalise une prise de contact WhatsApp (ou une tentative manuelle). */
router.post("/contact/log", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = String(req.body?.userId ?? "");
    const channel = String(req.body?.channel ?? "");
    const templateId = String(req.body?.templateId ?? "custom").slice(0, 80);
    const subject = String(req.body?.subject ?? "").slice(0, 180);
    if (!userId || !["whatsapp", "email", "call"].includes(channel)) { res.status(400).json({ error: "Paramètres de contact invalides." }); return; }
    const userRef = firestoreDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) { res.status(404).json({ error: "Utilisateur introuvable." }); return; }
    const log = { channel, status: channel === "whatsapp" ? "opened" : "initiated", templateId, subject, recipient: userSnap.data()?.email ?? "", createdAt: new Date().toISOString() };
    const historyRef = userRef.collection("contactHistory").doc();
    const batch = firestoreDb.batch();
    batch.set(historyRef, log);
    batch.set(firestoreDb.collection("admin_contact_logs").doc(historyRef.id), { ...log, userId });
    await batch.commit();
    res.json({ ok: true });
  } catch (err) {
    console.error("Admin contact log error:", err);
    res.status(500).json({ error: "Impossible d'enregistrer le contact." });
  }
});

/* Notification interne de l'application, envoyée par l'administration. */
router.post("/notifications", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = String(req.body?.userId ?? "");
    const title = String(req.body?.title ?? "").trim().slice(0, 120);
    const message = String(req.body?.message ?? "").trim().slice(0, 1500);
    if (!userId || !title || !message) { res.status(400).json({ error: "Utilisateur, titre et message obligatoires." }); return; }
    const ref = firestoreDb.collection("users").doc(userId).collection("notifications").doc();
    await ref.set({ id: ref.id, type: "admin_message", title, message, read: false, createdAt: new Date().toISOString() });
    res.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("Admin notification error:", err);
    res.status(500).json({ error: "Impossible d'envoyer la notification." });
  }
});

/* Marque uniquement les profils réellement exportés. */
router.post("/users/export/mark", requireAdmin, async (req: Request, res: Response) => {
  try {
    const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map((id: unknown) => String(id)).filter(Boolean))].slice(0, 200);
    if (!ids.length) { res.status(400).json({ error: "Aucun utilisateur sélectionné." }); return; }
    const now = new Date().toISOString();
    const batch = firestoreDb.batch();
    for (const id of ids) {
      batch.set(firestoreDb.collection("users").doc(id), { lastExportedAt: now, exportCount: FieldValue.increment(1) }, { merge: true });
    }
    await batch.commit();
    res.json({ ok: true, marked: ids.length, lastExportedAt: now });
  } catch (err) {
    console.error("Mark user export error:", err);
    res.status(500).json({ error: "Impossible d'enregistrer les exports." });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/export/full — export explicite, jamais chargé au rendu */
/* ────────────────────────────────────────────────────────────────── */
router.get("/export/full", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const [usersSnap, ordersSnap, topupsSnap, commercialsSnap, commissionsSnap, attributionsSnap, withdrawalsSnap] = await Promise.all([
      firestoreDb.collection("users").orderBy("createdAt", "desc").limit(MAX_FETCH).get(),
      firestoreDb.collection("orders").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).orderBy("createdAt", "desc").limit(MAX_FETCH).get(),
      firestoreDb.collection("topups").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).orderBy("createdAt", "desc").limit(MAX_FETCH).get(),
      firestoreDb.collection("commercials").limit(MAX_FETCH).get(),
      firestoreDb.collection("affiliate_commissions").limit(MAX_FETCH).get(),
      firestoreDb.collection("affiliate_attributions").limit(MAX_FETCH).get(),
      firestoreDb.collection("withdrawal_requests").limit(MAX_FETCH).get(),
    ]);
    const encode = (snap: FirebaseFirestore.QuerySnapshot) => snap.docs.map((doc) => {
      const d = doc.data();
      return { id: doc.id, ...d, createdAt: d.createdAt ? getCreatedAtIso(d.createdAt) : null };
    });
    const counts = await Promise.all([
      firestoreDb.collection("users").count().get(), firestoreDb.collection("orders").count().get(),
      firestoreDb.collection("topups").count().get(), firestoreDb.collection("commercials").count().get(),
      firestoreDb.collection("affiliate_commissions").count().get(), firestoreDb.collection("affiliate_attributions").count().get(),
    ]);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="texerra-admin-${startIso.slice(0,10)}-${endIso.slice(0,10)}.json"`);
    res.json({
      generatedAt: new Date().toISOString(), period: { start: startIso, end: endIso },
      coverage: {
        limits: { users: MAX_FETCH, orders: MAX_FETCH, topups: MAX_FETCH, affiliateCollections: MAX_FETCH },
        totalAvailable: { users: counts[0].data().count, orders: counts[1].data().count, topups: counts[2].data().count, commercials: counts[3].data().count, commissions: counts[4].data().count, attributions: counts[5].data().count },
        exported: { users: usersSnap.size, orders: ordersSnap.size, topups: topupsSnap.size, commercials: commercialsSnap.size, commissions: commissionsSnap.size, attributions: attributionsSnap.size, withdrawals: withdrawalsSnap.size },
        truncated: usersSnap.size >= MAX_FETCH || ordersSnap.size >= MAX_FETCH || topupsSnap.size >= MAX_FETCH || commercialsSnap.size >= MAX_FETCH || commissionsSnap.size >= MAX_FETCH || attributionsSnap.size >= MAX_FETCH || withdrawalsSnap.size >= MAX_FETCH,
      },
      users: encode(usersSnap), orders: encode(ordersSnap), topups: encode(topupsSnap),
      affiliation: { commercials: encode(commercialsSnap), commissions: encode(commissionsSnap), attributions: encode(attributionsSnap), withdrawals: encode(withdrawalsSnap) },
    });
  } catch (err) {
    console.error("Full admin export error:", err);
    res.status(500).json({ error: "Erreur pendant l'export complet", details: String(err) });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/orders/export                                       */
/* ────────────────────────────────────────────────────────────────── */

router.get("/orders/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const status = req.query.status as string | undefined;
    const format = ((req.query.format as string) || "csv").toLowerCase();
    const all: any[] = [];

    const snap = await firestoreDb
      .collection("orders")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc")
      .limit(MAX_FETCH)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data();
      if (status && status !== "all" && d.status !== status) continue;
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      const realMargin = computeOrderMargin(d);
      all.push({
        id: doc.id,
        createdAt: getCreatedAtIso(d.createdAt),
        userId: d.userId,
        countryCode: d.countryCode,
        serviceCode: d.serviceCode,
        phoneNumber: d.phoneNumber,
        status: d.status,
        price,
        margin:
          d.status === "completed"
            ? realMargin != null
              ? realMargin
              : price * MARGIN_RATE
            : null,
      });
    }

    // Jointure user pour l'export
    const usersMap = await fetchUsersByIds(all.map((o) => String(o.userId ?? "")));
    for (const o of all) {
      const u = usersMap.get(String(o.userId ?? ""));
      o.userName = u?.name ?? "";
      o.userEmail = u?.email ?? "";
    }

    if (format === "json") {
      res.json({ orders: all, total: all.length });
      return;
    }

    const startDay = startIso.slice(0, 10);
    const endDay = endIso.slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="commandes-${startDay}_${endDay}.csv"`
    );
    res.write("\uFEFF");
    res.write(
      csvRow([
        "Date",
        "Utilisateur",
        "Email",
        "Utilisateur (ID)",
        "Pays",
        "Service",
        "Numéro",
        "Statut",
        "Prix (€)",
        "Marge (€)",
      ]) + "\n"
    );
    for (const o of all) {
      res.write(
        csvRow([
          new Date(o.createdAt).toLocaleString("fr-FR"),
          o.userName,
          o.userEmail,
          o.userId,
          o.countryCode,
          o.serviceCode,
          o.phoneNumber,
          o.status,
          o.price?.toFixed(2) ?? "",
          o.margin != null ? o.margin.toFixed(2) : "",
        ]) + "\n"
      );
    }
    res.end();
  } catch (err) {
    console.error("Export orders error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur lors de l'export", details: String(err) });
    } else res.end();
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/topups/export                                       */
/* ────────────────────────────────────────────────────────────────── */

router.get("/topups/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const status = req.query.status as string | undefined;
    const format = ((req.query.format as string) || "csv").toLowerCase();
    const all: any[] = [];

    const snap = await firestoreDb
      .collection("topups")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc")
      .limit(MAX_FETCH)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data();
      if (status && status !== "all" && d.status !== status) continue;
      all.push({
        id: doc.id,
        createdAt: getCreatedAtIso(d.createdAt),
        userId: d.userId,
        amountEur: num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0,
        status: d.status,
        externalId: d.externalId,
        countryIso: d.countryIso ?? null,
        localCurrency: d.localCurrency ?? null,
        amountLocal: num(d.amountLocal),
      });
    }

    const usersMap = await fetchUsersByIds(all.map((t) => String(t.userId ?? "")));
    for (const t of all) {
      const u = usersMap.get(String(t.userId ?? ""));
      t.userName = u?.name ?? "";
      t.userEmail = u?.email ?? "";
    }

    if (format === "json") {
      res.json({ topups: all, total: all.length });
      return;
    }

    const startDay = startIso.slice(0, 10);
    const endDay = endIso.slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="depots-${startDay}_${endDay}.csv"`
    );
    res.write("\uFEFF");
    res.write(
      csvRow([
        "Date",
        "Utilisateur",
        "Email",
        "Utilisateur (ID)",
        "Montant (€)",
        "Pays",
        "Devise locale",
        "Montant local",
        "Statut",
        "Référence",
      ]) + "\n"
    );
    for (const t of all) {
      res.write(
        csvRow([
          new Date(t.createdAt).toLocaleString("fr-FR"),
          t.userName,
          t.userEmail,
          t.userId,
          t.amountEur?.toFixed(2) ?? "",
          t.countryIso ?? "",
          t.localCurrency ?? "",
          t.amountLocal ?? "",
          t.status,
          t.externalId ?? "",
        ]) + "\n"
      );
    }
    res.end();
  } catch (err) {
    console.error("Export topups error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur lors de l'export", details: String(err) });
    } else res.end();
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/users/export                                        */
/* ────────────────────────────────────────────────────────────────── */

router.get("/users/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const format = ((req.query.format as string) || "csv").toLowerCase();
    const requestedIds = String(req.query.ids ?? "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 200);
    const all: any[] = [];
    let docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (requestedIds.length) {
      for (let i = 0; i < requestedIds.length; i += 30) {
        const refs = requestedIds.slice(i, i + 30).map((id) => firestoreDb.collection("users").doc(id));
        const found = await firestoreDb.getAll(...refs);
        docs.push(...found.filter((doc) => doc.exists) as FirebaseFirestore.QueryDocumentSnapshot[]);
      }
    } else {
      const snap = await firestoreDb.collection("users").orderBy("createdAt", "desc").limit(MAX_FETCH).get();
      docs = snap.docs;
    }

    for (const doc of docs) {
      const d = doc.data();
      all.push({
        id: doc.id,
        createdAt: getCreatedAtIso(d.createdAt),
        name: d.name ?? "",
        email: d.email ?? "",
        phone: d.phone ?? "",
        balance: num(d.balance, 0) ?? 0,
      });
    }

    if (format === "json") {
      res.json({ users: all, total: all.length });
      return;
    }

    if (format === "vcf") {
      res.setHeader("Content-Type", "text/vcard; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contacts-texerra.vcf"`
      );
      for (const u of all) {
        const baseName = u.name && String(u.name).trim() ? u.name : u.email;
        const fullName = `TEXERRA SMS - ${baseName}`;
        const [first, ...rest] = String(baseName).split(" ");
        res.write("BEGIN:VCARD\r\n");
        res.write("VERSION:3.0\r\n");
        res.write(`FN:${fullName}\r\n`);
        res.write(`N:${rest.join(" ")};${first};;;\r\n`);
        res.write(`ORG:TEXERRA SMS;\r\n`);
        if (u.phone) res.write(`TEL;TYPE=CELL:${u.phone}\r\n`);
        if (u.email) res.write(`EMAIL;TYPE=INTERNET:${u.email}\r\n`);
        res.write(`NOTE:Client Texerra SMS\r\n`);
        res.write("END:VCARD\r\n");
      }
      res.end();
      return;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="utilisateurs-texerra.csv"`
    );
    res.write("\uFEFF");
    res.write(
      csvRow(["Inscription", "Nom", "Email", "Téléphone", "Solde (€)", "ID"]) + "\n"
    );
    for (const u of all) {
      res.write(
        csvRow([
          new Date(u.createdAt).toLocaleString("fr-FR"),
          u.name,
          u.email,
          u.phone,
          u.balance?.toFixed(2) ?? "0.00",
          u.id,
        ]) + "\n"
      );
    }
    res.end();
  } catch (err) {
    console.error("Export users error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur lors de l'export", details: String(err) });
    } else res.end();
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* POST /api/admin/migrate                                            */
/* ────────────────────────────────────────────────────────────────── */

router.post("/migrate", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const FETCH_LIMIT = 20000;
    const BATCH_SIZE = 400;
    let ordersScanned = 0,
      ordersMigrated = 0,
      topupsScanned = 0,
      topupsMigrated = 0;

    const ordersSnap = await firestoreDb.collection("orders").limit(FETCH_LIMIT).get();
    ordersScanned = ordersSnap.docs.length;
    for (let i = 0; i < ordersSnap.docs.length; i += BATCH_SIZE) {
      const chunk = ordersSnap.docs.slice(i, i + BATCH_SIZE);
      const batch = firestoreDb.batch();
      let n = 0;
      for (const doc of chunk) {
        const d = doc.data();
        const upd: Record<string, unknown> = {};
        if (d.priceNum == null) {
          const p = num(d.price);
          if (p != null) upd.priceNum = p;
        }
        if (d.marginNum == null) {
          const m = num(d.margin);
          if (m != null) upd.marginNum = m;
        }
        if (d.costUsdNum == null) {
          const c = num(d.costUsd);
          if (c != null) upd.costUsdNum = c;
        }
        if (Object.keys(upd).length > 0) {
          batch.update(doc.ref, upd);
          n++;
        }
      }
      if (n > 0) await batch.commit();
      ordersMigrated += n;
    }

    const topupsSnap = await firestoreDb.collection("topups").limit(FETCH_LIMIT).get();
    topupsScanned = topupsSnap.docs.length;
    for (let i = 0; i < topupsSnap.docs.length; i += BATCH_SIZE) {
      const chunk = topupsSnap.docs.slice(i, i + BATCH_SIZE);
      const batch = firestoreDb.batch();
      let n = 0;
      for (const doc of chunk) {
        const d = doc.data();
        if (d.amountEurNum == null) {
          const a = num(d.amountEur);
          if (a != null) {
            batch.update(doc.ref, { amountEurNum: a });
            n++;
          }
        }
      }
      if (n > 0) await batch.commit();
      topupsMigrated += n;
    }

    res.json({
      ok: true,
      ordersScanned,
      ordersMigrated,
      topupsScanned,
      topupsMigrated,
      message: `Scan : ${ordersScanned} commandes, ${topupsScanned} dépôts. Migré : ${ordersMigrated} commandes, ${topupsMigrated} dépôts.`,
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({
      error: "Erreur lors de la migration",
      details: String(err),
    });
  }
});

export default router;