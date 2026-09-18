// Fichier : handlers/affiliate.ts

/**
 * Routeur Express regroupant TOUTES les routes d'affiliation.
 * Monté sur /api/affiliate dans api/index.ts.
 *
 * Aucune Function Vercel supplémentaire n'est créée.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import { requireAuth } from "../lib/requireAuth.js";

import {
  checkRateLimit,
  auditLog,
  isValidAffiliateCode,
  sanitizeString,
  parseNumber,
  isAdminEmail,
} from "../lib/affiliate-security.js";

import {
  createReferralCookie,
  readReferralCookie,
  clearReferralCookie,
  claimAttribution,
  getCommercialByUid,
  getCommercialByCode,
  type Commercial,
} from "../lib/affiliate-attribution.js";

import {
  createCommissionForOrder,
  reverseCommission,
} from "../lib/affiliate-commission.js";

import {
  getAvailableBalance,
  createWithdrawalRequest,
  processWithdrawal,
} from "../lib/affiliate-withdrawal.js";

const router = Router();

/* ─────────────────────────────────────────────
 * MIDDLEWARES
 * ───────────────────────────────────────────── */

/**
 * Middleware : exige un commercial authentifié.
 * Charge la fiche commercial dans req.commercial.
 */
function requireCommercial(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, async () => {
    try {
      const userId = (req as any).userId as string;
      const commercial = await getCommercialByUid(userId);
      if (!commercial) {
        res.status(403).json({ error: "Accès commercial requis" });
        return;
      }
      (req as any).commercial = commercial;
      next();
    } catch (err) {
      console.error("[affiliate] requireCommercial failed:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });
}

/**
 * Middleware : exige un administrateur authentifié.
 */
function requireAffiliateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  requireAuth(req, res, async () => {
    try {
      const userId = (req as any).userId as string;
      const userDoc = await firestoreDb.collection("users").doc(userId).get();
      const email = userDoc.data()?.email as string | undefined;

      if (!isAdminEmail(email)) {
        res.status(403).json({ error: "Accès administrateur requis" });
        return;
      }
      next();
    } catch (err) {
      console.error("[affiliate] requireAffiliateAdmin failed:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });
}

/* ─────────────────────────────────────────────
 * ROUTE PUBLIQUE : VISIT
 * ───────────────────────────────────────────── */

router.get("/visit", async (req: Request, res: Response) => {
  try {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      req.ip ??
      "unknown";

    if (!checkRateLimit(`visit:${ip}`, 30, 60_000)) {
      res.status(429).json({ error: "Trop de requêtes" });
      return;
    }

    const ref = sanitizeString(req.query.ref, 20);
    if (!ref || !isValidAffiliateCode(ref)) {
      res.status(400).json({ error: "Code d'affiliation invalide" });
      return;
    }

    const commercial = await getCommercialByCode(ref);
    if (!commercial) {
      res.status(404).json({ error: "Commercial introuvable" });
      return;
    }

    res.setHeader("Set-Cookie", createReferralCookie(ref));
    res.status(200).json({ ok: true, code: ref });
  } catch (err) {
    console.error("[affiliate/visit] error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ─────────────────────────────────────────────
 * ROUTE CLIENT : CLAIM
 * ───────────────────────────────────────────── */

router.post("/claim", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const proof = readReferralCookie(req.headers.cookie);

    if (!proof) {
      res.status(400).json({ error: "Aucune preuve d'affiliation" });
      return;
    }

    const result = await claimAttribution(userId, proof.code, "link");
    if (!result.success) {
      res.status(409).json({ error: result.reason });
      return;
    }

    res.setHeader("Set-Cookie", clearReferralCookie());
    res.status(200).json({ ok: true, attribution: result.attribution });
  } catch (err) {
    console.error("[affiliate/claim] error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* ─────────────────────────────────────────────
 * ROUTES COMMERCIAL
 * ───────────────────────────────────────────── */

/** GET /me — Profil + KPIs */
router.get(
  "/me",
  requireCommercial,
  async (req: Request, res: Response) => {
    try {
      const commercial = (req as any).commercial as Commercial;

      const [clientsCountSnap, commissionsSnap, paidSnap] = await Promise.all([
        firestoreDb
          .collection("affiliate_attributions")
          .where("commercialId", "==", commercial.id)
          .count()
          .get(),
        firestoreDb
          .collection("affiliate_commissions")
          .where("commercialId", "==", commercial.id)
          .get(),
        firestoreDb
          .collection("withdrawal_requests")
          .where("commercialId", "==", commercial.id)
          .where("status", "==", "paid")
          .get(),
      ]);

      const totalSales = commissionsSnap.docs.reduce(
        (s, d) => s + (d.data().orderAmount ?? 0),
        0
      );
      const totalCommissions = commissionsSnap.docs.reduce(
        (s, d) =>
          d.data().status === "reversed"
            ? s
            : s + (d.data().commissionAmount ?? 0),
        0
      );
      const totalPaid = paidSnap.docs.reduce(
        (s, d) => s + (d.data().amount ?? 0),
        0
      );
      const available = await getAvailableBalance(commercial.id);

      res.status(200).json({
        commercial: {
          id: commercial.id,
          name: commercial.name,
          email: commercial.email,
          affiliateCode: commercial.affiliateCode,
          commissionRate: commercial.commissionRate,
          status: commercial.status,
        },
        kpis: {
          clientsCount: clientsCountSnap.data().count,
          totalSales,
          totalCommissions,
          available,
          totalPaid,
        },
      });
    } catch (err) {
      console.error("[affiliate/me] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** GET /clients?page=1 — Clients attribués */
router.get(
  "/clients",
  requireCommercial,
  async (req: Request, res: Response) => {
    try {
      const commercial = (req as any).commercial as Commercial;
      const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
      const pageSize = Math.min(
        parseInt(String(req.query.pageSize ?? "20"), 10) || 20,
        100
      );

      const baseQuery = firestoreDb
        .collection("affiliate_attributions")
        .where("commercialId", "==", commercial.id);

      const [totalSnap, snap] = await Promise.all([
        baseQuery.count().get(),
        baseQuery
          .orderBy("createdAt", "desc")
          .offset((page - 1) * pageSize)
          .limit(pageSize)
          .get(),
      ]);

      const clients = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data();
          const userDoc = await firestoreDb
            .collection("users")
            .doc(data.customerId)
            .get();
          const u = userDoc.data() ?? {};
          const email = String(u.email ?? "");
          const maskedEmail = email
            ? email.replace(/(.{2}).*(@.*)/, "$1***$2")
            : "***";
          return {
            id: data.customerId,
            email: maskedEmail,
            name: u.name ?? "Client",
            attributedAt: data.createdAt,
            source: data.source,
          };
        })
      );

      res.status(200).json({
        clients,
        pagination: {
          page,
          pageSize,
          total: totalSnap.data().count,
          totalPages: Math.ceil(totalSnap.data().count / pageSize),
        },
      });
    } catch (err) {
      console.error("[affiliate/clients] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** GET /commissions?page=1 — Ledger */
router.get(
  "/commissions",
  requireCommercial,
  async (req: Request, res: Response) => {
    try {
      const commercial = (req as any).commercial as Commercial;
      const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
      const pageSize = Math.min(
        parseInt(String(req.query.pageSize ?? "20"), 10) || 20,
        100
      );

      const baseQuery = firestoreDb
        .collection("affiliate_commissions")
        .where("commercialId", "==", commercial.id);

      const [totalSnap, snap] = await Promise.all([
        baseQuery.count().get(),
        baseQuery
          .orderBy("createdAt", "desc")
          .offset((page - 1) * pageSize)
          .limit(pageSize)
          .get(),
      ]);

      const commissions = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          orderId: d.orderId,
          orderAmount: d.orderAmount,
          commissionRate: d.commissionRate,
          commissionAmount: d.commissionAmount,
          status: d.status,
          createdAt: d.createdAt,
          reversedAt: d.reversedAt,
          reversalReason: d.reversalReason,
        };
      });

      res.status(200).json({
        commissions,
        pagination: {
          page,
          pageSize,
          total: totalSnap.data().count,
          totalPages: Math.ceil(totalSnap.data().count / pageSize),
        },
      });
    } catch (err) {
      console.error("[affiliate/commissions] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** GET /withdrawals — Historique */
router.get(
  "/withdrawals",
  requireCommercial,
  async (req: Request, res: Response) => {
    try {
      const commercial = (req as any).commercial as Commercial;

      const snap = await firestoreDb
        .collection("withdrawal_requests")
        .where("commercialId", "==", commercial.id)
        .orderBy("requestedAt", "desc")
        .limit(50)
        .get();

      const withdrawals = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          amount: d.amount,
          method: d.method,
          destinationMasked: d.destinationMasked,
          status: d.status,
          requestedAt: d.requestedAt,
          processedAt: d.processedAt,
          adminNote: d.adminNote,
        };
      });

      res.status(200).json({ withdrawals });
    } catch (err) {
      console.error("[affiliate/withdrawals] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** POST /withdrawals — Créer demande */
router.post(
  "/withdrawals",
  requireCommercial,
  async (req: Request, res: Response) => {
    try {
      const commercial = (req as any).commercial as Commercial;

      if (commercial.status !== "active") {
        res.status(403).json({ error: "Commercial inactif" });
        return;
      }

      if (!checkRateLimit(`withdrawal:${commercial.id}`, 5, 3600_000)) {
        res.status(429).json({ error: "Trop de demandes de retrait" });
        return;
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const amount = parseNumber(body.amount, 0);
      const method = sanitizeString(body.method, 30);
      const destinationMasked = sanitizeString(body.destinationMasked, 50);

      if (amount <= 0 || amount > 100000) {
        res.status(400).json({ error: "Montant invalide" });
        return;
      }

      const result = await createWithdrawalRequest(
        commercial.id,
        amount,
        method,
        destinationMasked
      );

      if (!result.success) {
        res.status(400).json({ error: result.reason });
        return;
      }

      await auditLog({
        actorId: commercial.id,
        actorRole: "commercial",
        action: "create_withdrawal",
        entityType: "withdrawal_requests",
        entityId: result.request!.id,
        metadataSafe: { amount, method },
      });

      res.status(201).json({ ok: true, request: result.request });
    } catch (err) {
      console.error("[affiliate/withdrawals POST] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/* ─────────────────────────────────────────────
 * ROUTES ADMIN
 * ───────────────────────────────────────────── */

/** GET /admin/commercials — Liste */
router.get(
  "/admin/commercials",
  requireAffiliateAdmin,
  async (_req: Request, res: Response) => {
    try {
      const snap = await firestoreDb
        .collection("commercials")
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();

      const commercials = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          email: d.email,
          affiliateCode: d.affiliateCode,
          commissionRate: d.commissionRate,
          status: d.status,
          createdAt: d.createdAt,
        };
      });

      res.status(200).json({ commercials });
    } catch (err) {
      console.error("[affiliate/admin/commercials GET] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** POST /admin/commercials — Créer */
router.post(
  "/admin/commercials",
  requireAffiliateAdmin,
  async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).userId as string;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = sanitizeString(body.name, 100);
      const email = sanitizeString(body.email, 150).toLowerCase();
      const commissionRate = Math.min(
        Math.max(parseNumber(body.commissionRate, 50), 0),
        100
      );

      if (!name || !email.includes("@")) {
        res.status(400).json({ error: "Nom ou email invalide" });
        return;
      }

      // Générer un code unique
      const baseCode =
        name
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 8) || "COM";

      let affiliateCode = `TX-${baseCode}`;
      let counter = 0;
      while (true) {
        const existing = await firestoreDb
          .collection("commercials")
          .where("affiliateCode", "==", affiliateCode)
          .limit(1)
          .get();
        if (existing.empty) break;
        counter++;
        affiliateCode = `TX-${baseCode}${counter}`;
        if (counter > 999) {
          affiliateCode = `TX-${baseCode}-${Date.now()
            .toString(36)
            .toUpperCase()}`;
          break;
        }
      }

      const commercialRef = firestoreDb.collection("commercials").doc();
      const commercial = {
        id: commercialRef.id,
        firebaseUid: null,
        name,
        email,
        affiliateCode,
        commissionRate,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await commercialRef.set(commercial);

      await auditLog({
        actorId: adminId,
        actorRole: "admin",
        action: "create_commercial",
        entityType: "commercials",
        entityId: commercialRef.id,
        metadataSafe: { name, email, affiliateCode, commissionRate },
      });

      res.status(201).json({ ok: true, commercial });
    } catch (err) {
      console.error("[affiliate/admin/commercials POST] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** PATCH /admin/commercials/:id/rate — Modifier taux */
router.patch(
  "/admin/commercials/:id/rate",
  requireAffiliateAdmin,
  async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).userId as string;
      const commercialId = String(req.params.id);

      const body = (req.body ?? {}) as Record<string, unknown>;
      const newRate = parseNumber(body.commissionRate, -1);
      if (newRate < 0 || newRate > 100) {
        res.status(400).json({ error: "Taux invalide (0-100)" });
        return;
      }

      const ref = firestoreDb.collection("commercials").doc(commercialId);
      const doc = await ref.get();
      if (!doc.exists) {
        res.status(404).json({ error: "Commercial introuvable" });
        return;
      }

      const previousRate = doc.data()?.commissionRate;
      await ref.update({
        commissionRate: newRate,
        updatedAt: new Date().toISOString(),
      });

      await auditLog({
        actorId: adminId,
        actorRole: "admin",
        action: "update_commission_rate",
        entityType: "commercials",
        entityId: commercialId,
        metadataSafe: { previousRate, newRate },
      });

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[affiliate/admin/commercials/rate] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** GET /admin/withdrawals?status=pending — Liste */
router.get(
  "/admin/withdrawals",
  requireAffiliateAdmin,
  async (req: Request, res: Response) => {
    try {
      const status = sanitizeString(req.query.status, 20);

      let query = firestoreDb
        .collection("withdrawal_requests")
        .orderBy("requestedAt", "desc")
        .limit(100);

      if (status) {
        query = firestoreDb
          .collection("withdrawal_requests")
          .where("status", "==", status)
          .orderBy("requestedAt", "desc")
          .limit(100);
      }

      const snap = await query.get();

      const withdrawals = await Promise.all(
        snap.docs.map(async (doc) => {
          const d = doc.data();
          const commercialDoc = await firestoreDb
            .collection("commercials")
            .doc(d.commercialId)
            .get();
          const c = commercialDoc.data() ?? {};
          return {
            ...d,
            id: doc.id,
            commercialName: c.name ?? "Inconnu",
            commercialCode: c.affiliateCode ?? "",
          };
        })
      );

      res.status(200).json({ withdrawals });
    } catch (err) {
      console.error("[affiliate/admin/withdrawals GET] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** PATCH /admin/withdrawals/:id — Traiter */
router.patch(
  "/admin/withdrawals/:id",
  requireAffiliateAdmin,
  async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).userId as string;
      const withdrawalId = String(req.params.id);

      const body = (req.body ?? {}) as Record<string, unknown>;
      const newStatus = sanitizeString(body.status, 20) as
        | "approved"
        | "paid"
        | "rejected"
        | "cancelled";
      const adminNote = sanitizeString(body.adminNote, 500);

      if (!["approved", "paid", "rejected", "cancelled"].includes(newStatus)) {
        res.status(400).json({ error: "Statut invalide" });
        return;
      }

      const result = await processWithdrawal(
        withdrawalId,
        adminId,
        newStatus,
        adminNote
      );

      if (!result.success) {
        res.status(400).json({ error: result.reason });
        return;
      }

      await auditLog({
        actorId: adminId,
        actorRole: "admin",
        action: "process_withdrawal",
        entityType: "withdrawal_requests",
        entityId: withdrawalId,
        metadataSafe: { newStatus, adminNote },
      });

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[affiliate/admin/withdrawals PATCH] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** GET /admin/stats — KPIs globaux */
router.get(
  "/admin/stats",
  requireAffiliateAdmin,
  async (_req: Request, res: Response) => {
    try {
      const [commissionsSnap, withdrawalsSnap, commercialsSnap, attributionsSnap] =
        await Promise.all([
          firestoreDb.collection("affiliate_commissions").get(),
          firestoreDb.collection("withdrawal_requests").get(),
          firestoreDb.collection("commercials").get(),
          firestoreDb.collection("affiliate_attributions").count().get(),
        ]);

      const totalSales = commissionsSnap.docs.reduce(
        (s, d) => s + (d.data().orderAmount ?? 0),
        0
      );
      const totalCommissions = commissionsSnap.docs.reduce(
        (s, d) =>
          d.data().status === "reversed"
            ? s
            : s + (d.data().commissionAmount ?? 0),
        0
      );
      const availableCommissions = commissionsSnap.docs
        .filter((d) => d.data().status === "available")
        .reduce((s, d) => s + (d.data().commissionAmount ?? 0), 0);

      const reserved = withdrawalsSnap.docs
        .filter((d) => ["pending", "approved"].includes(d.data().status))
        .reduce((s, d) => s + (d.data().amount ?? 0), 0);

      const totalPaid = withdrawalsSnap.docs
        .filter((d) => d.data().status === "paid")
        .reduce((s, d) => s + (d.data().amount ?? 0), 0);

      const activeCommercials = commercialsSnap.docs.filter(
        (d) => d.data().status === "active"
      ).length;

      res.status(200).json({
        kpis: {
          totalSales,
          totalCommissions,
          availableCommissions,
          reserved,
          totalPaid,
          activeCommercials,
          totalAttributions: attributionsSnap.data().count,
        },
      });
    } catch (err) {
      console.error("[affiliate/admin/stats] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/* ─────────────────────────────────────────────
 * EXPORTS UTILITAIRES (pour handlers/orders.ts)
 * ───────────────────────────────────────────── */

export { createCommissionForOrder, reverseCommission };

export default router;