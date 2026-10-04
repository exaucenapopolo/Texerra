import { Router, type Request, type Response } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAuth.js";
import { Timestamp } from "firebase-admin/firestore";

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
    const search = String(req.query.search ?? "").trim().toLowerCase();
    const filter = String(req.query.filter ?? "all");
    const sort = String(req.query.sort ?? "recent");

    // 1. Fetch (avec plafond) de tous les users et toutes les commandes
    const [usersSnap, ordersSnap] = await Promise.all([
      firestoreDb.collection("users").limit(MAX_FETCH).get(),
      firestoreDb.collection("orders").limit(MAX_FETCH).get(),
    ]);

    // 2. Agrégation en mémoire des stats de commandes par utilisateur
    const statsMap = new Map<string, UserStats>();
    for (const doc of ordersSnap.docs) {
      const d = doc.data();
      const uid = String(d.userId ?? "");
      if (!uid) continue;
      if (!statsMap.has(uid)) {
        statsMap.set(uid, {
          totalOrders: 0,
          completedOrders: 0,
          activeOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          expiredOrders: 0,
          totalSpent: 0,
        });
      }
      const s = statsMap.get(uid)!;
      s.totalOrders += 1;
      const st = d.status;
      if (st === "completed") {
        s.completedOrders += 1;
        s.totalSpent += num(d.priceNum) ?? num(d.price, 0) ?? 0;
      } else if (st === "active") s.activeOrders += 1;
      else if (st === "pending_payment" || st === "pending") s.pendingOrders += 1;
      else if (st === "cancelled") s.cancelledOrders += 1;
      else if (st === "expired") s.expiredOrders += 1;
    }

    // 3. Enrichissement
    let enriched = usersSnap.docs.map((doc) => {
      const d = doc.data();
      const s =
        statsMap.get(doc.id) ??
        ({
          totalOrders: 0,
          completedOrders: 0,
          activeOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          expiredOrders: 0,
          totalSpent: 0,
        } as UserStats);
      return {
        id: doc.id,
        email: d.email ?? "",
        name: d.name ?? "",
        phone: d.phone ?? "",
        balance: num(d.balance, 0) ?? 0,
        createdAt: getCreatedAtIso(d.createdAt),
        stats: s,
      };
    });

    // 4. Recherche (nom, email, téléphone, ID exact)
    if (search) {
      enriched = enriched.filter((u) => {
        const n = (u.name || "").toLowerCase();
        const e = (u.email || "").toLowerCase();
        const p = (u.phone || "").toLowerCase();
        const id = u.id.toLowerCase();
        return (
          n.includes(search) ||
          e.includes(search) ||
          p.includes(search) ||
          id === search
        );
      });
    }

    // 5. Filtres
    if (filter === "hasOrders") {
      enriched = enriched.filter((u) => u.stats.totalOrders > 0);
    } else if (filter === "hasBalance") {
      enriched = enriched.filter((u) => u.balance > 0);
    } else if (filter === "neverOrdered") {
      enriched = enriched.filter((u) => u.stats.totalOrders === 0);
    } else if (filter === "top") {
      enriched = enriched.filter((u) => u.stats.completedOrders > 0);
    }

    // 6. Tri
    if (filter === "top" || sort === "completedOrdersDesc") {
      enriched.sort((a, b) => {
        if (b.stats.completedOrders !== a.stats.completedOrders) {
          return b.stats.completedOrders - a.stats.completedOrders;
        }
        return b.stats.totalOrders - a.stats.totalOrders;
      });
    } else if (sort === "balanceDesc") {
      enriched.sort((a, b) => b.balance - a.balance);
    } else if (sort === "oldest") {
      enriched.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else {
      // recent (défaut)
      enriched.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // 7. Pagination
    const total = enriched.length;
    const offset = (page - 1) * pageSize;
    const pageUsers = enriched.slice(offset, offset + pageSize);

    res.json({ users: pageUsers, total, page, pageSize });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des utilisateurs",
      details: String(err),
    });
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
    const all: any[] = [];

    const snap = await firestoreDb
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(MAX_FETCH)
      .get();

    for (const doc of snap.docs) {
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