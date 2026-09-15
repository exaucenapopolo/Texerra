import { Router, type Request, type Response } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAuth.js";
import { Timestamp, AggregateField } from "firebase-admin/firestore";

const router = Router();

const MARGIN_RATE = 0.65;

/* ────────────────────────────────────────────────────────────────── */
/* Helpers                                                            */
/* ────────────────────────────────────────────────────────────────── */

function parseRange(req: Request): { startIso: string; endIso: string } {
  const now = new Date();
  const startParam = req.query.start as string | undefined;
  const endParam = req.query.end as string | undefined;

  if (startParam && endParam) {
    const start = new Date(startParam);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endParam);
    end.setHours(23, 59, 59, 999);
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
    try { return (value as Timestamp).toDate().toISOString(); } catch { return new Date(0).toISOString(); }
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

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/stats                                               */
/* ────────────────────────────────────────────────────────────────── */

router.get("/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const usersCol = firestoreDb.collection("users");
    const ordersCol = firestoreDb.collection("orders");
    const topupsCol = firestoreDb.collection("topups");

    const [
      totalUsersSnap, newUsersSnap,
      totalOrdersSnap, completedOrdersSnap, activeOrdersSnap, pendingOrdersSnap, cancelledOrdersSnap, expiredOrdersSnap,
      completedTopupsSnap, totalTopupAmountSnap,
      revenueSnap,
    ] = await Promise.all([
      usersCol.count().get(),
      usersCol.where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).count().get(),

      ordersCol.where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).count().get(),
      ordersCol.where("status", "==", "completed").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).count().get(),
      ordersCol.where("status", "==", "active").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).count().get(),
      ordersCol.where("status", "==", "pending_payment").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).count().get(),
      ordersCol.where("status", "==", "cancelled").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).count().get(),
      ordersCol.where("status", "==", "expired").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).count().get(),

      topupsCol.where("status", "==", "completed").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).count().get(),
      topupsCol.where("status", "==", "completed").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).aggregate({ total: AggregateField.sum("amountEurNum") }).get(),

      ordersCol.where("status", "==", "completed").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).aggregate({ total: AggregateField.sum("priceNum") }).get(),
    ]);

    const revenue = (revenueSnap.data().total as number) || 0;
    const margin = revenue * MARGIN_RATE;
    const supplierCost = revenue * (1 - MARGIN_RATE);

    res.json({
      totalUsers: totalUsersSnap.data().count,
      newUsers: newUsersSnap.data().count,
      totalOrders: totalOrdersSnap.data().count,
      completedOrders: completedOrdersSnap.data().count,
      activeOrders: activeOrdersSnap.data().count,
      pendingOrders: pendingOrdersSnap.data().count,
      cancelledOrders: cancelledOrdersSnap.data().count,
      expiredOrders: expiredOrdersSnap.data().count,
      totalTopups: completedTopupsSnap.data().count,
      totalTopupAmount: (totalTopupAmountSnap.data().total as number) || 0,
      revenue, margin, marginPercent: MARGIN_RATE * 100, supplierCost,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Erreur lors du calcul des statistiques" });
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
      firestoreDb.collection("orders").where("status", "==", "completed").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).orderBy("createdAt", "asc").limit(2000).get(),
      firestoreDb.collection("topups").where("status", "==", "completed").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).orderBy("createdAt", "asc").limit(2000).get(),
      firestoreDb.collection("users").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).orderBy("createdAt", "asc").limit(2000).get(),
    ]);

    const bucket = new Map<string, { revenue: number; topups: number; orders: number; margin: number; users: number }>();
    function getKey(date: Date): string {
      if (groupByMonth) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return date.toISOString().slice(0, 10);
    }
    function ensureBucket(key: string) {
      if (!bucket.has(key)) bucket.set(key, { revenue: 0, topups: 0, orders: 0, margin: 0, users: 0 });
      return bucket.get(key)!;
    }

    ordersSnap.forEach((doc) => {
      const d = doc.data();
      const date = new Date(getCreatedAtIso(d.createdAt));
      const b = ensureBucket(getKey(date));
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      b.revenue += price;
      b.margin += price * MARGIN_RATE;
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

    const series = Array.from(bucket.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
    res.json(series);
  } catch (err) {
    console.error("Admin chart error:", err);
    res.status(500).json({ error: "Erreur lors du calcul du graphique" });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/orders                                              */
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

    if (status && status !== "all") query = query.where("status", "==", status);

    const countSnap = await query.count().get();
    const total = countSnap.data().count;
    const offset = (page - 1) * pageSize;
    const snap = await query.limit(pageSize).offset(offset).get();

    const orders = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        userId: d.userId,
        countryCode: d.countryCode,
        serviceCode: d.serviceCode,
        phoneNumber: d.phoneNumber,
        status: d.status,
        price: num(d.priceNum) ?? num(d.price, 0) ?? 0,
        costUsd: num(d.costUsdNum) ?? num(d.costUsd),
        margin: num(d.marginNum) ?? num(d.margin),
        createdAt: getCreatedAtIso(d.createdAt),
      };
    });

    res.json({ orders, total, page, pageSize });
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des commandes" });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/topups                                              */
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

    if (status && status !== "all") query = query.where("status", "==", status);

    const countSnap = await query.count().get();
    const total = countSnap.data().count;
    const offset = (page - 1) * pageSize;
    const snap = await query.limit(pageSize).offset(offset).get();

    const topups = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        userId: d.userId,
        amountEur: num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0,
        status: d.status,
        externalId: d.externalId,
        createdAt: getCreatedAtIso(d.createdAt),
      };
    });

    res.json({ topups, total, page, pageSize });
  } catch (err) {
    console.error("Admin topups error:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des dépôts" });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/users                                               */
/* ────────────────────────────────────────────────────────────────── */

router.get("/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req);

    const query = firestoreDb.collection("users").orderBy("createdAt", "desc");
    const countSnap = await query.count().get();
    const total = countSnap.data().count;
    const offset = (page - 1) * pageSize;
    const snap = await query.limit(pageSize).offset(offset).get();

    const users = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        email: d.email,
        name: d.name,
        phone: d.phone,
        balance: num(d.balance, 0) ?? 0,
        createdAt: getCreatedAtIso(d.createdAt),
      };
    });

    res.json({ users, total, page, pageSize });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
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
    const MAX_ROWS = 20000;
    const all: any[] = [];

    const snap = await firestoreDb.collection("orders")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc")
      .limit(MAX_ROWS)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data();
      if (status && status !== "all" && d.status !== status) continue;
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      all.push({
        id: doc.id,
        createdAt: getCreatedAtIso(d.createdAt),
        userId: d.userId,
        countryCode: d.countryCode,
        serviceCode: d.serviceCode,
        phoneNumber: d.phoneNumber,
        status: d.status,
        price,
        margin: d.status === "completed" ? price * MARGIN_RATE : null,
      });
    }

    if (format === "json") { res.json({ orders: all, total: all.length }); return; }

    const startDay = startIso.slice(0, 10);
    const endDay = endIso.slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="commandes-${startDay}_${endDay}.csv"`);
    res.write("\uFEFF");
    res.write(csvRow(["Date", "Utilisateur (ID)", "Pays", "Service", "Numéro", "Statut", "Prix (€)", "Marge (€)"]) + "\n");
    for (const o of all) {
      res.write(csvRow([
        new Date(o.createdAt).toLocaleString("fr-FR"),
        o.userId, o.countryCode, o.serviceCode, o.phoneNumber, o.status,
        o.price?.toFixed(2) ?? "",
        o.margin != null ? o.margin.toFixed(2) : "",
      ]) + "\n");
    }
    res.end();
  } catch (err) {
    console.error("Export orders error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Erreur lors de l'export" });
    else res.end();
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
    const MAX_ROWS = 20000;
    const all: any[] = [];

    const snap = await firestoreDb.collection("topups")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc")
      .limit(MAX_ROWS)
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
      });
    }

    if (format === "json") { res.json({ topups: all, total: all.length }); return; }

    const startDay = startIso.slice(0, 10);
    const endDay = endIso.slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="depots-${startDay}_${endDay}.csv"`);
    res.write("\uFEFF");
    res.write(csvRow(["Date", "Utilisateur (ID)", "Montant (€)", "Statut", "Référence"]) + "\n");
    for (const t of all) {
      res.write(csvRow([
        new Date(t.createdAt).toLocaleString("fr-FR"),
        t.userId,
        t.amountEur?.toFixed(2) ?? "",
        t.status,
        t.externalId ?? "",
      ]) + "\n");
    }
    res.end();
  } catch (err) {
    console.error("Export topups error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Erreur lors de l'export" });
    else res.end();
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/users/export                                        */
/* ────────────────────────────────────────────────────────────────── */

router.get("/users/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const format = ((req.query.format as string) || "csv").toLowerCase();
    const MAX_ROWS = 50000;
    const all: any[] = [];

    const snap = await firestoreDb.collection("users").orderBy("createdAt", "desc").limit(MAX_ROWS).get();

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

    if (format === "json") { res.json({ users: all, total: all.length }); return; }

    if (format === "vcf") {
      res.setHeader("Content-Type", "text/vcard; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="contacts-texerra.vcf"`);
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
    res.setHeader("Content-Disposition", `attachment; filename="utilisateurs-texerra.csv"`);
    res.write("\uFEFF");
    res.write(csvRow(["Inscription", "Nom", "Email", "Téléphone", "Solde (€)", "ID"]) + "\n");
    for (const u of all) {
      res.write(csvRow([
        new Date(u.createdAt).toLocaleString("fr-FR"),
        u.name, u.email, u.phone,
        u.balance?.toFixed(2) ?? "0.00",
        u.id,
      ]) + "\n");
    }
    res.end();
  } catch (err) {
    console.error("Export users error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Erreur lors de l'export" });
    else res.end();
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* POST /api/admin/migrate                                            */
/* ────────────────────────────────────────────────────────────────── */

router.post("/migrate", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const FETCH_LIMIT = 20000;
    const BATCH_SIZE = 400;
    let ordersScanned = 0, ordersMigrated = 0, topupsScanned = 0, topupsMigrated = 0;

    const ordersSnap = await firestoreDb.collection("orders").limit(FETCH_LIMIT).get();
    ordersScanned = ordersSnap.docs.length;
    for (let i = 0; i < ordersSnap.docs.length; i += BATCH_SIZE) {
      const chunk = ordersSnap.docs.slice(i, i + BATCH_SIZE);
      const batch = firestoreDb.batch();
      let n = 0;
      for (const doc of chunk) {
        const d = doc.data();
        const upd: Record<string, unknown> = {};
        if (d.priceNum == null) { const p = num(d.price); if (p != null) upd.priceNum = p; }
        if (d.marginNum == null) { const m = num(d.margin); if (m != null) upd.marginNum = m; }
        if (d.costUsdNum == null) { const c = num(d.costUsd); if (c != null) upd.costUsdNum = c; }
        if (Object.keys(upd).length > 0) { batch.update(doc.ref, upd); n++; }
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
          if (a != null) { batch.update(doc.ref, { amountEurNum: a }); n++; }
        }
      }
      if (n > 0) await batch.commit();
      topupsMigrated += n;
    }

    res.json({
      ok: true, ordersScanned, ordersMigrated, topupsScanned, topupsMigrated,
      message: `Scan : ${ordersScanned} commandes, ${topupsScanned} dépôts. Migré : ${ordersMigrated} commandes, ${topupsMigrated} dépôts.`,
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: "Erreur lors de la migration", details: String(err) });
  }
});

export default router;