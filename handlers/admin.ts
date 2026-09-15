import { Router, type Request, type Response } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAuth.js";
import { Timestamp } from "firebase-admin/firestore";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface DateRange {
  start: Date;
  end: Date;
}

interface StatsResult {
  totalUsers: number;
  newUsers: number;
  totalTopups: number;
  totalTopupAmount: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  expiredOrders: number;
  revenue: number;
  supplierCost: number;
  margin: number;
  marginPercent: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRange(req: Request): DateRange {
  const now = new Date();
  const startParam = req.query.start as string | undefined;
  const endParam = req.query.end as string | undefined;

  if (startParam && endParam) {
    const start = new Date(startParam);
    const end = new Date(endParam);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Par défaut : aujourd'hui
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

router.get("/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);

    // Agrégations parallèles — aucune lecture de documents
    const [
      totalUsers,
      newUsers,
      totalTopups,
      totalTopupAmount,
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      expiredOrders,
      revenueAgg,
      supplierCostAgg,
      marginAgg,
    ] = await Promise.all([
      // Total utilisateurs (toute la base)
      firestoreDb.collection("users").count().get(),

      // Nouveaux utilisateurs sur la période
      firestoreDb
        .collection("users")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .count()
        .get(),

      // Dépôts sur la période
      firestoreDb
        .collection("topups")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .count()
        .get(),

      // Montant total des dépôts
      firestoreDb
        .collection("topups")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .aggregate({
          total: { sum: "amountEur" },
        })
        .get(),

      // Commandes totales sur la période
      firestoreDb
        .collection("orders")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .count()
        .get(),

      // Commandes réussies (active)
      firestoreDb
        .collection("orders")
        .where("status", "==", "active")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .count()
        .get(),

      // Commandes en attente
      firestoreDb
        .collection("orders")
        .where("status", "==", "pending_payment")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .count()
        .get(),

      // Commandes annulées
      firestoreDb
        .collection("orders")
        .where("status", "==", "cancelled")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .count()
        .get(),

      // Commandes expirées
      firestoreDb
        .collection("orders")
        .where("status", "==", "expired")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .count()
        .get(),

      // CA (somme des prix des commandes actives)
      firestoreDb
        .collection("orders")
        .where("status", "==", "active")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .aggregate({
          total: { sum: "price" },
        })
        .get(),

      // Coût fournisseur (uniquement nouvelles commandes avec costUsd)
      firestoreDb
        .collection("orders")
        .where("status", "==", "active")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .aggregate({
          total: { sum: "costUsd" },
        })
        .get(),

      // Marge (uniquement nouvelles commandes avec margin)
      firestoreDb
        .collection("orders")
        .where("status", "==", "active")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .aggregate({
          total: { sum: "margin" },
        })
        .get(),
    ]);

    const revenue = (revenueAgg.data().total as number) || 0;
    const supplierCost = (supplierCostAgg.data().total as number) || 0;
    const margin = (marginAgg.data().total as number) || 0;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

    const result: StatsResult = {
      totalUsers: totalUsers.data().count,
      newUsers: newUsers.data().count,
      totalTopups: totalTopups.data().count,
      totalTopupAmount: (totalTopupAmount.data().total as number) || 0,
      totalOrders: totalOrders.data().count,
      completedOrders: completedOrders.data().count,
      pendingOrders: pendingOrders.data().count,
      cancelledOrders: cancelledOrders.data().count,
      expiredOrders: expiredOrders.data().count,
      revenue,
      supplierCost,
      margin,
      marginPercent,
    };

    res.json(result);
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Erreur lors du calcul des statistiques" });
  }
});

// ─── GET /api/admin/chart ─────────────────────────────────────────────────────

router.get("/chart", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = parseRange(req);
    const startTs = toTimestamp(start);
    const endTs = toTimestamp(end);

    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Si la période dépasse 90 jours, on regroupe par mois
    const groupByMonth = daysDiff > 90;

    // Récupérer les commandes actives de la période (limité pour éviter les surlectures)
    const ordersSnap = await firestoreDb
      .collection("orders")
      .where("status", "==", "active")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .orderBy("createdAt", "asc")
      .limit(2000) // limite de sécurité
      .get();

    // Récupérer les dépôts de la période
    const topupsSnap = await firestoreDb
      .collection("topups")
      .where("status", "==", "completed")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .orderBy("createdAt", "asc")
      .limit(2000)
      .get();

    // Récupérer les nouveaux utilisateurs de la période
    const usersSnap = await firestoreDb
      .collection("users")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .orderBy("createdAt", "asc")
      .limit(2000)
      .get();

    // Regroupement par jour ou par mois
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
      const data = doc.data();
      const date = (data.createdAt as Timestamp).toDate();
      const key = getKey(date);
      const b = ensureBucket(key);
      b.revenue += parseFloat(data.price ?? "0");
      b.margin += parseFloat(data.margin ?? "0");
      b.orders += 1;
    });

    topupsSnap.forEach((doc) => {
      const data = doc.data();
      const date = (data.createdAt as Timestamp).toDate();
      const key = getKey(date);
      const b = ensureBucket(key);
      b.topups += parseFloat(data.amountEur ?? "0");
    });

    usersSnap.forEach((doc) => {
      const data = doc.data();
      const date = (data.createdAt as Timestamp).toDate();
      const key = getKey(date);
      const b = ensureBucket(key);
      b.users += 1;
    });

    const sortedKeys = Array.from(bucket.keys()).sort();
    const series = sortedKeys.map((key) => ({
      date: key,
      ...bucket.get(key)!,
    }));

    res.json(series);
  } catch (err) {
    console.error("Admin chart error:", err);
    res.status(500).json({ error: "Erreur lors du calcul du graphique" });
  }
});

// ─── GET /api/admin/orders ────────────────────────────────────────────────────

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

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    // Compter le total
    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    // Pagination
    const offset = (page - 1) * pageSize;
    const snap = await query.limit(pageSize).offset(offset).get();

    const orders = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        countryCode: data.countryCode,
        serviceCode: data.serviceCode,
        phoneNumber: data.phoneNumber,
        status: data.status,
        price: parseFloat(data.price ?? "0"),
        costUsd: data.costUsd ? parseFloat(data.costUsd) : null,
        margin: data.margin ? parseFloat(data.margin) : null,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      };
    });

    res.json({ orders, total, page, pageSize });
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des commandes" });
  }
});

// ─── GET /api/admin/topups ────────────────────────────────────────────────────

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

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    const offset = (page - 1) * pageSize;
    const snap = await query.limit(pageSize).offset(offset).get();

    const topups = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        amountEur: parseFloat(data.amountEur ?? "0"),
        status: data.status,
        externalId: data.externalId,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      };
    });

    res.json({ topups, total, page, pageSize });
  } catch (err) {
    console.error("Admin topups error:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des dépôts" });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

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
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        balance: parseFloat(data.balance ?? "0"),
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      };
    });

    res.json({ users, total, page, pageSize });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
  }
});

export default router;