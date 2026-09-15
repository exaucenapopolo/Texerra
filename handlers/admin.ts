import { Router, type Request, type Response } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAuth.js";
import { Timestamp, AggregateField } from "firebase-admin/firestore";

const router = Router();

/* ────────────────────────────────────────────────────────────────── */
/* Helpers                                                            */
/* ────────────────────────────────────────────────────────────────── */

function parseRange(req: Request): { start: Date; end: Date } {
  const now = new Date();
  const startParam = req.query.start as string | undefined;
  const endParam = req.query.end as string | undefined;

  if (startParam && endParam) {
    const start = new Date(startParam);
    const end = new Date(endParam);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
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

function num(v: unknown, fallback: number | null = null): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/stats                                               */
/* ────────────────────────────────────────────────────────────────── */

router.get("/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);

    const usersCol = firestoreDb.collection("users");
    const ordersCol = firestoreDb.collection("orders");
    const topupsCol = firestoreDb.collection("topups");

    const [
      totalUsersSnap,
      newUsersSnap,
      totalTopupsSnap,
      totalTopupAmountSnap,
      totalOrdersSnap,
      completedOrdersSnap,
      pendingOrdersSnap,
      cancelledOrdersSnap,
      expiredOrdersSnap,
      revenueSnap,
      supplierCostSnap,
      marginSnap,
    ] = await Promise.all([
      usersCol.count().get(),
      usersCol.where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).count().get(),
      topupsCol.where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).count().get(),
      topupsCol
        .where("status", "==", "completed")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .aggregate({ total: AggregateField.sum("amountEurNum") })
        .get(),
      ordersCol.where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).count().get(),
      ordersCol.where("status", "==", "active").where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).count().get(),
      ordersCol.where("status", "==", "pending_payment").where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).count().get(),
      ordersCol.where("status", "==", "cancelled").where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).count().get(),
      ordersCol.where("status", "==", "expired").where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).count().get(),
      ordersCol
        .where("status", "==", "active")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .aggregate({ total: AggregateField.sum("priceNum") })
        .get(),
      ordersCol
        .where("status", "==", "active")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .aggregate({ total: AggregateField.sum("costUsdNum") })
        .get(),
      ordersCol
        .where("status", "==", "active")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .aggregate({ total: AggregateField.sum("marginNum") })
        .get(),
    ]);

    const revenue = (revenueSnap.data().total as number) || 0;
    const supplierCost = (supplierCostSnap.data().total as number) || 0;
    const margin = (marginSnap.data().total as number) || 0;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

    res.json({
      totalUsers: totalUsersSnap.data().count,
      newUsers: newUsersSnap.data().count,
      totalTopups: totalTopupsSnap.data().count,
      totalTopupAmount: (totalTopupAmountSnap.data().total as number) || 0,
      totalOrders: totalOrdersSnap.data().count,
      completedOrders: completedOrdersSnap.data().count,
      pendingOrders: pendingOrdersSnap.data().count,
      cancelledOrders: cancelledOrdersSnap.data().count,
      expiredOrders: expiredOrdersSnap.data().count,
      revenue,
      supplierCost,
      margin,
      marginPercent,
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
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const groupByMonth = daysDiff > 90;

    const [ordersSnap, topupsSnap, usersSnap] = await Promise.all([
      firestoreDb.collection("orders").where("status", "==", "active").where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).orderBy("createdAt", "asc").limit(2000).get(),
      firestoreDb.collection("topups").where("status", "==", "completed").where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).orderBy("createdAt", "asc").limit(2000).get(),
      firestoreDb.collection("users").where("createdAt", ">=", startTs).where("createdAt", "<=", endTs).orderBy("createdAt", "asc").limit(2000).get(),
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
      const key = getKey((d.createdAt as Timestamp).toDate());
      const b = ensureBucket(key);
      b.revenue += num(d.priceNum) ?? num(d.price, 0) ?? 0;
      b.margin += num(d.marginNum) ?? num(d.margin, 0) ?? 0;
      b.orders += 1;
    });
    topupsSnap.forEach((doc) => {
      const d = doc.data();
      const key = getKey((d.createdAt as Timestamp).toDate());
      const b = ensureBucket(key);
      b.topups += num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0;
    });
    usersSnap.forEach((doc) => {
      const d = doc.data();
      const key = getKey((d.createdAt as Timestamp).toDate());
      const b = ensureBucket(key);
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
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;

    let query: FirebaseFirestore.Query = firestoreDb
      .collection("orders")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
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
        createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
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
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;

    let query: FirebaseFirestore.Query = firestoreDb
      .collection("topups")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
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
        createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
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
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;

    const query = firestoreDb
      .collection("users")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .orderBy("createdAt", "desc");

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
        createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
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
/*  ?format=csv|json &start &end &status                              */
/* ────────────────────────────────────────────────────────────────── */

router.get("/orders/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);
    const status = req.query.status as string | undefined;
    const format = ((req.query.format as string) || "csv").toLowerCase();

    const BATCH_SIZE = 500;
    const MAX_ROWS = 20000;
    const all: any[] = [];
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    while (all.length < MAX_ROWS) {
      let q: FirebaseFirestore.Query = firestoreDb
        .collection("orders")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .orderBy("createdAt", "desc")
        .limit(BATCH_SIZE);

      if (status && status !== "all") q = q.where("status", "==", status);
      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        const d = doc.data();
        all.push({
          id: doc.id,
          createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
          userId: d.userId,
          countryCode: d.countryCode,
          serviceCode: d.serviceCode,
          phoneNumber: d.phoneNumber,
          status: d.status,
          price: num(d.priceNum) ?? num(d.price, 0) ?? 0,
          costUsd: num(d.costUsdNum) ?? num(d.costUsd),
          margin: num(d.marginNum) ?? num(d.margin),
        });
      }
      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < BATCH_SIZE) break;
    }

    if (format === "json") {
      res.json({ orders: all, total: all.length });
      return;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="commandes-${start}_${end}.csv"`);
    res.write("\uFEFF");
    res.write(csvRow(["Date", "Utilisateur (ID)", "Pays", "Service", "Numéro", "Statut", "Prix (€)", "Coût fournisseur (USD)", "Marge (€)"]) + "\n");
    for (const o of all) {
      res.write(
        csvRow([
          new Date(o.createdAt).toLocaleString("fr-FR"),
          o.userId,
          o.countryCode,
          o.serviceCode,
          o.phoneNumber,
          o.status,
          o.price?.toFixed(2) ?? "",
          o.costUsd != null ? o.costUsd.toFixed(4) : "",
          o.margin != null ? o.margin.toFixed(2) : "",
        ]) + "\n"
      );
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
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);
    const status = req.query.status as string | undefined;
    const format = ((req.query.format as string) || "csv").toLowerCase();

    const BATCH_SIZE = 500;
    const MAX_ROWS = 20000;
    const all: any[] = [];
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    while (all.length < MAX_ROWS) {
      let q: FirebaseFirestore.Query = firestoreDb
        .collection("topups")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .orderBy("createdAt", "desc")
        .limit(BATCH_SIZE);

      if (status && status !== "all") q = q.where("status", "==", status);
      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        const d = doc.data();
        all.push({
          id: doc.id,
          createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
          userId: d.userId,
          amountEur: num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0,
          status: d.status,
          externalId: d.externalId,
        });
      }
      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < BATCH_SIZE) break;
    }

    if (format === "json") {
      res.json({ topups: all, total: all.length });
      return;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="depots-${start}_${end}.csv"`);
    res.write("\uFEFF");
    res.write(csvRow(["Date", "Utilisateur (ID)", "Montant (€)", "Statut", "Référence"]) + "\n");
    for (const t of all) {
      res.write(
        csvRow([
          new Date(t.createdAt).toLocaleString("fr-FR"),
          t.userId,
          t.amountEur?.toFixed(2) ?? "",
          t.status,
          t.externalId ?? "",
        ]) + "\n"
      );
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
/*  ?format=csv|vcf|json &start &end                                  */
/* ────────────────────────────────────────────────────────────────── */

router.get("/users/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);
    const format = ((req.query.format as string) || "csv").toLowerCase();

    const BATCH_SIZE = 500;
    const MAX_ROWS = 50000;
    const all: any[] = [];
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    while (all.length < MAX_ROWS) {
      let q: FirebaseFirestore.Query = firestoreDb
        .collection("users")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .orderBy("createdAt", "desc")
        .limit(BATCH_SIZE);

      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        const d = doc.data();
        all.push({
          id: doc.id,
          createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
          name: d.name ?? "",
          email: d.email ?? "",
          phone: d.phone ?? "",
          balance: num(d.balance, 0) ?? 0,
        });
      }
      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < BATCH_SIZE) break;
    }

    if (format === "json") {
      res.json({ users: all, total: all.length });
      return;
    }

    if (format === "vcf") {
      res.setHeader("Content-Type", "text/vcard; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="contacts-texerra-${start}_${end}.vcf"`);
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
    res.setHeader("Content-Disposition", `attachment; filename="utilisateurs-${start}_${end}.csv"`);
    res.write("\uFEFF");
    res.write(csvRow(["Inscription", "Nom", "Email", "Téléphone", "Solde (€)", "ID"]) + "\n");
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
    if (!res.headersSent) res.status(500).json({ error: "Erreur lors de l'export" });
    else res.end();
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* POST /api/admin/migrate                                            */
/*  Backfill des champs numériques sur les anciens documents.         */
/*  Idempotent — peut être relancé plusieurs fois sans risque.        */
/* ────────────────────────────────────────────────────────────────── */

router.post("/migrate", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const BATCH_SIZE = 500;
    const MAX_DOCS = 50000;
    let ordersMigrated = 0;
    let topupsMigrated = 0;

    // ── Migration des commandes
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    while (ordersMigrated < MAX_DOCS) {
      let q: FirebaseFirestore.Query = firestoreDb.collection("orders").orderBy("__name__").limit(BATCH_SIZE);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;

      const batch = firestoreDb.batch();
      let n = 0;
      for (const doc of snap.docs) {
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
      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < BATCH_SIZE) break;
    }

    // ── Migration des dépôts
    lastDoc = null;
    while (topupsMigrated < MAX_DOCS) {
      let q: FirebaseFirestore.Query = firestoreDb.collection("topups").orderBy("__name__").limit(BATCH_SIZE);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;

      const batch = firestoreDb.batch();
      let n = 0;
      for (const doc of snap.docs) {
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
      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < BATCH_SIZE) break;
    }

    res.json({
      ok: true,
      ordersMigrated,
      topupsMigrated,
      message: "Migration terminée. Les anciennes données sans champ numérique ont été complétées.",
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: "Erreur lors de la migration", details: String(err) });
  }
});

export default router;