// Fichier : handlers/affiliate.ts

/**
 * Routeur Express regroupant TOUTES les routes d'affiliation.
 * Monté sur /api/affiliate dans api/index.ts.
 *
 * Aucune Function Vercel supplémentaire n'est créée.
 *
 * ➕ CORRECTION : Auto-liaison Firebase UID ↔ commercial par email.
 *    - Un admin crée un commercial avec son email.
 *    - Au premier login du commercial, requireCommercial détecte
 *      qu'aucun enregistrement n'est lié à ce firebaseUid, cherche
 *      par email et lie automatiquement les deux.
 *
 * ➕ AJOUT : Route /admin/leaderboard pour le classement des commerciaux.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { firestoreDb, getAdminAuth } from "../lib/firebase-admin.js";
import { requireAuth } from "../lib/requireAuth.js";
import { sendAdminContactEmail, sendPartnerApprovalEmail } from "../lib/mailer.js";

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


function affiliateNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function affiliateDateIso(value: unknown): string {
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in (value as object)) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
    } catch { return new Date(0).toISOString(); }
  }
  return new Date(0).toISOString();
}

/* ═══════════════════════════════════════════════════════════
 * MIDDLEWARES
 * ═══════════════════════════════════════════════════════════ */

/**
 * ➕ CORRECTION MAJEURE : Middleware exigeant un commercial.
 *
 * Étapes :
 *  1. Vérifie l'authentification Firebase.
 *  2. Cherche un commercial lié au firebaseUid.
 *  3. Si introuvable → cherche par email (auto-liaison).
 *  4. Si trouvé par email ET firebaseUid null → lie automatiquement.
 *  5. Si toujours introuvable → 403.
 */
function requireCommercial(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, async () => {
    try {
      const userId = (req as any).userId as string;

      // ─── Étape 1 : Recherche par firebaseUid (cas nominal) ───
      let commercial: Commercial | null = await getCommercialByUid(userId);

      // ─── Étape 2 : Auto-liaison par email ───
      if (!commercial) {
        // Récupérer l'email depuis le document utilisateur
        const userDoc = await firestoreDb.collection("users").doc(userId).get();
        const userEmail = (userDoc.data()?.email as string | undefined)?.toLowerCase();

        if (userEmail) {
          // Chercher un commercial actif avec le même email et sans firebaseUid
          const snap = await firestoreDb
            .collection("commercials")
            .where("email", "==", userEmail)
            .limit(1)
            .get();

          if (!snap.empty) {
            const doc = snap.docs[0];
            const data = doc.data();

            // Lier seulement si le commercial n'a pas déjà un firebaseUid
            if (!data.firebaseUid) {
              await doc.ref.update({
                firebaseUid: userId,
                updatedAt: new Date().toISOString(),
              });

              console.log(
                `[affiliate] ✅ Auto-linked commercial ${doc.id} (${userEmail}) to Firebase UID ${userId}`
              );

              // Journaliser cette auto-liaison pour audit
              await auditLog({
                actorId: userId,
                actorRole: "system",
                action: "auto_link_commercial",
                entityType: "commercials",
                entityId: doc.id,
                metadataSafe: { email: userEmail, firebaseUid: userId },
              });

              commercial = {
                ...(data as Commercial),
                id: doc.id,
                firebaseUid: userId,
              };
            } else if (data.firebaseUid === userId) {
              // Déjà lié (cas rare : race condition)
              commercial = {
                ...(data as Commercial),
                id: doc.id,
              };
            } else {
              // Le commercial est déjà lié à un AUTRE firebaseUid
              console.warn(
                `[affiliate] ⚠️ Commercial ${doc.id} already linked to another UID (${data.firebaseUid}), refusing link to ${userId}`
              );
            }
          }
        }
      }

      // ─── Étape 3 : Vérification finale ───
      if (!commercial) {
        res.status(403).json({
          error: "Ce compte n’est pas encore enregistré comme commercial.",
          code: "COMMERCIAL_NOT_FOUND",
        });
        return;
      }

      const commercialStatus = String((commercial as any).status ?? "active");
      const pendingContract = commercialStatus === "pending_contract" || (
        commercialStatus === "inactive" &&
        !!(commercial as any).applicationId &&
        !(commercial as any).contractVerifiedAt &&
        !(commercial as any).accessRevokedAt
      );
      if (pendingContract) {
        res.status(403).json({
          error: "Votre candidature est approuvée, mais votre contrat doit encore être signé et validé par Texerra SMS.",
          code: "COMMERCIAL_CONTRACT_PENDING",
        });
        return;
      }
      if (commercialStatus !== "active") {
        res.status(403).json({
          error: "Vos droits commerciaux ont été désactivés. Votre compte Texerra reste accessible comme compte utilisateur normal.",
          code: "COMMERCIAL_INACTIVE",
        });
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

/* ═══════════════════════════════════════════════════════════
 * ROUTE PUBLIQUE : VISIT
 * ═══════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════
 * ROUTE CLIENT : CLAIM
 * ═══════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════
 * ROUTES COMMERCIAL
 * ═══════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════
 * ROUTES ADMIN
 * ═══════════════════════════════════════════════════════════ */

/** Candidatures commerciales : consultation, approbation et refus */
router.get("/admin/partner-applications", requireAffiliateAdmin, async (_req: Request, res: Response) => {
  try {
    const snap = await firestoreDb.collection("partner_applications").orderBy("submittedAt", "desc").limit(200).get();
    res.status(200).json({ applications: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (err) {
    console.error("[affiliate/admin/partner-applications GET] error:", err);
    res.status(500).json({ error: "Impossible de récupérer les candidatures." });
  }
});

router.patch("/admin/partner-applications/:id", requireAffiliateAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId as string;
    const applicationId = String(req.params.id ?? "").trim();
    const action = String(req.body?.action ?? "");
    if (!applicationId || !["approve", "reject"].includes(action)) { res.status(400).json({ error: "Action ou candidature invalide." }); return; }
    const applicationRef = firestoreDb.collection("partner_applications").doc(applicationId);
    const applicationSnap = await applicationRef.get();
    if (!applicationSnap.exists) { res.status(404).json({ error: "Candidature introuvable." }); return; }
    const application = applicationSnap.data()!;
    if (action === "reject") {
      if (application.status === "approved") { res.status(409).json({ error: "Cette candidature est déjà approuvée." }); return; }
      await applicationRef.set({ status: "rejected", rejectedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
      await auditLog({ actorId: adminId, actorRole: "admin", action: "reject_partner_application", entityType: "partner_applications", entityId: applicationId, metadataSafe: { email: application.email } });
      res.status(200).json({ ok: true, status: "rejected" }); return;
    }
    if (application.status === "approved" && application.commercialId) {
      const existing = await firestoreDb.collection("commercials").doc(String(application.commercialId)).get();
      if (existing.exists) {
        res.status(200).json({ ok: true, status: "approved", commercial: { id: existing.id, ...existing.data() }, emailSent: application.approvalEmailStatus === "sent" });
        return;
      }
    }
    const email = String(application.email ?? "").trim().toLowerCase();
    const name = String(application.name ?? [application.firstName, application.lastName].filter(Boolean).join(" ")).trim();
    if (!email.includes("@") || !name) { res.status(400).json({ error: "Les informations de cette candidature sont incomplètes." }); return; }
    const applicantUid = String(application.applicantUid ?? applicationId);
    const country = String(application.country ?? application.city ?? "").trim();
    const city = String(application.city ?? "").trim();
    const whatsappPhone = String(application.whatsappPhone ?? "").trim();
    const existingByEmail = await firestoreDb.collection("commercials").where("email", "==", email).limit(1).get();
    const createUniqueAffiliateCode = async () => {
      const baseCode = name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").slice(0, 8) || "COM";
      let code = "TX-" + baseCode;
      let counter = 0;
      while (true) {
        const codeSnap = await firestoreDb.collection("commercials").where("affiliateCode", "==", code).limit(1).get();
        if (codeSnap.empty) return code;
        counter++;
        code = "TX-" + baseCode + counter;
        if (counter > 999) return "TX-" + baseCode + "-" + Date.now().toString(36).toUpperCase();
      }
    };

    let commercial: any;
    const now = new Date().toISOString();
    if (!existingByEmail.empty) {
      const doc = existingByEmail.docs[0];
      const existing = doc.data();
      const affiliateCode = String(existing.affiliateCode ?? "") || await createUniqueAffiliateCode();
      const commissionRate = Number(existing.commissionRate ?? 50);
      const firebaseUid = String(existing.firebaseUid ?? "") || applicantUid;
      await doc.ref.set({
        id: doc.id,
        firebaseUid,
        name,
        email,
        country,
        city,
        whatsappPhone,
        affiliateCode,
        commissionRate,
        status: "pending_contract",
        applicationId,
        updatedAt: now,
      }, { merge: true });
      commercial = {
        ...existing,
        id: doc.id,
        firebaseUid,
        name,
        email,
        country,
        city,
        whatsappPhone,
        affiliateCode,
        commissionRate,
        status: "pending_contract",
        applicationId,
        updatedAt: now,
      };
    } else {
      const affiliateCode = await createUniqueAffiliateCode();
      const commercialRef = firestoreDb.collection("commercials").doc("partner-" + applicationId);
      commercial = {
        id: commercialRef.id,
        firebaseUid: applicantUid,
        name,
        email,
        country,
        city,
        whatsappPhone,
        affiliateCode,
        commissionRate: 50,
        status: "pending_contract",
        createdAt: now,
        updatedAt: now,
        applicationId,
      };
      await commercialRef.create(commercial);
    }
    const approvedAt = new Date().toISOString();
    await applicationRef.set({ status: "approved", commercialId: commercial.id, approvedAt, updatedAt: approvedAt, contractStatus: "awaiting_signature", approvalEmailStatus: "pending" }, { merge: true });
    await auditLog({ actorId: adminId, actorRole: "admin", action: "approve_partner_application", entityType: "partner_applications", entityId: applicationId, metadataSafe: { email, commercialId: commercial.id, commissionRate: commercial.commissionRate } });
    let emailSent = false, emailError: string | null = null;
    try {
      await sendPartnerApprovalEmail({ to: email, name, affiliateCode: String(commercial.affiliateCode ?? ""), affiliateLink: "https://www.texerra.site/?ref=" + encodeURIComponent(String(commercial.affiliateCode ?? "")), commissionRate: Number(commercial.commissionRate ?? 50) });
      emailSent = true;
      await applicationRef.set({ approvalEmailStatus: "sent", approvalEmailSentAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Envoi du courriel impossible.";
      await applicationRef.set({ approvalEmailStatus: "failed", approvalEmailError: emailError }, { merge: true });
    }
    res.status(200).json({ ok: true, status: "approved", commercial, emailSent, emailError });
  } catch (err) {
    console.error("[affiliate/admin/partner-applications PATCH] error:", err);
    res.status(500).json({ error: "Impossible de traiter cette candidature." });
  }
});

router.post("/admin/partner-applications/:id/resend", requireAffiliateAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "").trim();
    const ref = firestoreDb.collection("partner_applications").doc(id);
    const snap = await ref.get();
    if (!snap.exists) { res.status(404).json({ error: "Candidature introuvable." }); return; }
    const app = snap.data()!;
    if (app.status !== "approved" || !app.commercialId) { res.status(409).json({ error: "Cette candidature n'est pas encore approuvée." }); return; }
    const commercialSnap = await firestoreDb.collection("commercials").doc(String(app.commercialId)).get();
    if (!commercialSnap.exists) { res.status(404).json({ error: "Fiche commerciale introuvable." }); return; }
    const commercial = commercialSnap.data()!;
    await sendPartnerApprovalEmail({ to: String(app.email), name: String(app.name), affiliateCode: String(commercial.affiliateCode), affiliateLink: "https://www.texerra.site/?ref=" + encodeURIComponent(String(commercial.affiliateCode)), commissionRate: Number(commercial.commissionRate ?? 50) });
    await ref.set({ approvalEmailStatus: "sent", approvalEmailSentAt: new Date().toISOString(), approvalEmailError: null }, { merge: true });
    res.status(200).json({ ok: true, emailSent: true });
  } catch (err) {
    console.error("[affiliate/admin/partner-applications resend] error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Échec de l'envoi du courriel." });
  }
});

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
          country: d.country ?? "",
          city: d.city ?? "",
          whatsappPhone: d.whatsappPhone ?? "",
          affiliateCode: d.affiliateCode,
          commissionRate: d.commissionRate,
          status: d.status === "inactive" && d.applicationId && !d.contractVerifiedAt && !d.accessRevokedAt ? "pending_contract" : (d.status ?? "active"),
          createdAt: d.createdAt,
          firebaseUid: d.firebaseUid ?? null,
        };
      });

      res.status(200).json({ commercials });
    } catch (err) {
      console.error("[affiliate/admin/commercials GET] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);


/** Modifier les informations de contact autorisées. L’adresse e-mail reste immuable. */
router.patch("/admin/commercials/:id", requireAffiliateAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId as string;
    const id = String(req.params.id ?? "").trim();
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (!id) { res.status(400).json({ error: "Identifiant commercial manquant." }); return; }
    if (Object.prototype.hasOwnProperty.call(body, "email")) {
      res.status(400).json({ error: "L’adresse e-mail du commercial ne peut pas être modifiée." });
      return;
    }
    const name = sanitizeString(body.name, 100);
    const country = sanitizeString(body.country, 100);
    const whatsappPhone = sanitizeString(body.whatsappPhone, 30).replace(/[\s().-]/g, "");
    if (!name) { res.status(400).json({ error: "Le nom du commercial est obligatoire." }); return; }
    if (whatsappPhone && !/^\+[1-9]\d{7,14}$/.test(whatsappPhone)) {
      res.status(400).json({ error: "Le numéro WhatsApp doit être au format international, par exemple +237..." });
      return;
    }
    const ref = firestoreDb.collection("commercials").doc(id);
    const snap = await ref.get();
    if (!snap.exists) { res.status(404).json({ error: "Commercial introuvable." }); return; }
    await ref.update({ name, country, whatsappPhone, updatedAt: new Date().toISOString() });
    await auditLog({
      actorId: adminId,
      actorRole: "admin",
      action: "update_commercial_profile",
      entityType: "commercials",
      entityId: id,
      metadataSafe: { updatedFields: ["name", "country", "whatsappPhone"] },
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[affiliate/admin/commercials profile] error:", err);
    res.status(500).json({ error: "Impossible de mettre à jour les informations du commercial." });
  }
});

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
      const country = sanitizeString(body.country, 80);
      const commissionRate = Math.min(
        Math.max(parseNumber(body.commissionRate, 50), 0),
        100
      );

      if (!name || !email.includes("@")) {
        res.status(400).json({ error: "Nom ou email invalide" });
        return;
      }

      // Vérifier qu'un commercial avec cet email n'existe pas déjà
      const existingEmail = await firestoreDb
        .collection("commercials")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!existingEmail.empty) {
        res.status(409).json({ error: "Un commercial avec cet email existe déjà" });
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

      // ➕ Vérifier si un utilisateur Firebase existe déjà avec cet email
      //    pour lier immédiatement (évite d'attendre le premier login).
      let initialFirebaseUid: string | null = null;
      try {
        const userSnap = await firestoreDb
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();
        if (!userSnap.empty) {
          initialFirebaseUid = userSnap.docs[0].id;
        }
      } catch (err) {
        console.warn("[affiliate/admin/commercials POST] email lookup failed:", err);
      }

      const commercialRef = firestoreDb.collection("commercials").doc();
      const commercial = {
        id: commercialRef.id,
        firebaseUid: initialFirebaseUid,
        name,
        email,
        country,
        affiliateCode,
        commissionRate,
        status: "inactive",
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
        metadataSafe: {
          name,
          email,
          country,
          affiliateCode,
          commissionRate,
          linkedImmediately: !!initialFirebaseUid,
        },
      });

      res.status(201).json({ ok: true, commercial });
    } catch (err) {
      console.error("[affiliate/admin/commercials POST] error:", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

/** Envoi de messages Resend à un commercial ou à l'un de ses clients attribués. */
router.post("/admin/contact", requireAffiliateAdmin, async (req: Request, res: Response) => {
  try {
    const targetType = String(req.body?.targetType ?? "");
    const targetId = String(req.body?.targetId ?? "");
    const subject = String(req.body?.subject ?? "").trim().slice(0, 180);
    const message = String(req.body?.message ?? "").trim().slice(0, 12000);
    const templateId = String(req.body?.templateId ?? "custom").slice(0, 80);
    if (!targetId || !subject || !message || !["commercial", "client"].includes(targetType)) {
      res.status(400).json({ error: "Destinataire, objet et message obligatoires." });
      return;
    }

    const isCommercial = targetType === "commercial";
    const targetRef = firestoreDb.collection(isCommercial ? "commercials" : "users").doc(targetId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) { res.status(404).json({ error: "Destinataire introuvable." }); return; }
    const target = targetSnap.data()!;
    const email = String(target.email ?? "").trim();
    if (!email) { res.status(400).json({ error: "Aucune adresse e-mail disponible pour ce destinataire." }); return; }

    const sent = await sendAdminContactEmail({
      to: email,
      name: String(target.name ?? "cher partenaire"),
      subject,
      message,
      dashboardUrl: isCommercial ? "https://www.texerra.site/commercial" : "https://www.texerra.site/dashboard",
    });
    const log = {
      channel: "email", status: "sent", templateId, subject, message,
      recipient: email, recipientName: String(target.name ?? ""),
      recipientType: targetType, recipientId: targetId,
      resendId: sent.id ?? null, createdAt: new Date().toISOString(),
    };
    const historyRef = targetRef.collection("contactHistory").doc();
    const batch = firestoreDb.batch();
    batch.set(historyRef, log);
    batch.set(firestoreDb.collection("admin_contact_logs").doc(historyRef.id), { ...log, userId: isCommercial ? null : targetId, commercialId: isCommercial ? targetId : null });
    await batch.commit();
    res.json({ ok: true, id: sent.id ?? null, message: "E-mail envoyé avec succès." });
  } catch (err) {
    console.error("[affiliate/admin/contact] error:", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Échec de l'envoi du message." });
  }
});

/** Fiche liée du commercial : compte utilisateur normal + dernières commandes. */
router.get("/admin/commercials/:id/account", requireAffiliateAdmin, async (req: Request, res: Response) => {
  const commercialId = String(req.params.id ?? "").trim();
  const dataWarnings: string[] = [];
  try {
    if (!commercialId) { res.status(400).json({ error: "Identifiant commercial manquant." }); return; }
    const commercialRef = firestoreDb.collection("commercials").doc(commercialId);
    const commercialSnap = await commercialRef.get();
    if (!commercialSnap.exists) { res.status(404).json({ error: "Commercial introuvable." }); return; }

    const commercial = commercialSnap.data()!;
    const usersCol = firestoreDb.collection("users");
    const commercialEmail = String(commercial.email ?? "").trim();
    let userSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    let authMatch: any = null;

    if (commercial.firebaseUid) {
      try { userSnap = await usersCol.doc(String(commercial.firebaseUid)).get(); }
      catch (error) {
        console.warn("Commercial account: Firebase UID profile lookup failed:", error);
        dataWarnings.push("Lecture du profil utilisateur par UID temporairement indisponible.");
      }
    }
    if (userSnap?.exists && commercialEmail) {
      const linkedEmail = String(userSnap.data()?.email ?? "").trim().toLowerCase();
      if (linkedEmail && linkedEmail !== commercialEmail.toLowerCase()) userSnap = null;
    }

    // Firebase Auth est facultatif : son absence ne doit pas empêcher l'accès
    // au document Firestore ni à la recherche par e-mail.
    if (!userSnap?.exists && commercialEmail) {
      try { authMatch = await getAdminAuth().getUserByEmail(commercialEmail); }
      catch (error) {
        console.warn("Commercial account: Firebase Auth email lookup unavailable:", error);
        dataWarnings.push("Les métadonnées Firebase Auth ne sont pas accessibles ; la recherche Firestore par e-mail a été tentée.");
      }
      if (authMatch) {
        try { userSnap = await usersCol.doc(authMatch.uid).get(); }
        catch (error) {
          console.warn("Commercial account: Auth UID Firestore lookup failed:", error);
          dataWarnings.push("Le profil Firestore associé au compte Auth n'a pas pu être lu.");
        }
      }
    }

    if (!userSnap?.exists && commercialEmail) {
      for (const emailVariant of [...new Set([commercialEmail, commercialEmail.toLowerCase()])]) {
        try {
          const linked = await usersCol.where("email", "==", emailVariant).limit(1).get();
          if (!linked.empty) { userSnap = linked.docs[0]; break; }
        } catch (error) {
          console.warn("Commercial account: Firestore email lookup failed:", error);
          dataWarnings.push("La recherche du profil par e-mail a rencontré une erreur.");
        }
      }
    }

    const contactHistory = await (async () => {
      const history = commercialRef.collection("contactHistory");
      try {
        const snap = await history.orderBy("createdAt", "desc").limit(20).get();
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.warn("Commercial account: ordered contact history failed; bounded fallback:", error);
        const snap = await history.limit(20).get();
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => new Date(affiliateDateIso(b.createdAt)).getTime() - new Date(affiliateDateIso(a.createdAt)).getTime());
      }
    })().catch((error) => {
      console.warn("Commercial account: contact history unavailable:", error);
      dataWarnings.push("L'historique des contacts du commercial est indisponible.");
      return [];
    });

    const commercialInfo = { id: commercialId, name: commercial.name ?? "", email: commercial.email ?? "", country: commercial.country ?? "" };
    if (!userSnap?.exists && !authMatch) {
      res.json({ linked: false, contactHistory, dataWarnings, commercial: commercialInfo });
      return;
    }

    const uid = userSnap?.exists ? userSnap.id : String(authMatch.uid);
    const user = userSnap?.exists ? userSnap.data()! : {
      id: uid,
      name: authMatch?.displayName ?? commercial.name ?? "",
      email: authMatch?.email ?? commercialEmail,
      phone: authMatch?.phoneNumber ?? "",
      createdAt: authMatch?.metadata?.creationTime ? new Date(authMatch.metadata.creationTime).toISOString() : null,
      balance: 0,
    };

    if (userSnap?.exists && commercial.firebaseUid !== uid) {
      try { await commercialRef.update({ firebaseUid: uid, updatedAt: new Date().toISOString() }); }
      catch (error) { console.warn("Commercial account: UID link persistence skipped:", error); }
    }

    const ordersBase = firestoreDb.collection("orders").where("userId", "==", uid);
    let ordersDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    try {
      ordersDocs = (await ordersBase.orderBy("createdAt", "desc").limit(15).get()).docs;
    } catch (error) {
      console.warn("Commercial account: recent order query failed; bounded fallback:", error);
      try {
        const fallback = await ordersBase.limit(1000).get();
        ordersDocs = fallback.docs.slice().sort((a, b) => new Date(affiliateDateIso(b.data().createdAt)).getTime() - new Date(affiliateDateIso(a.data().createdAt)).getTime()).slice(0, 15);
      } catch (fallbackError) {
        console.error("Commercial account: recent order fallback unavailable:", fallbackError);
        dataWarnings.push("L'historique des commandes du compte est temporairement indisponible.");
      }
    }

    const [allCountResult, completedCountResult] = await Promise.allSettled([
      ordersBase.count().get(),
      ordersBase.where("status", "==", "completed").count().get(),
    ]);
    let fallbackOrderDocs: FirebaseFirestore.QueryDocumentSnapshot[] | null = null;
    if (allCountResult.status === "rejected" || completedCountResult.status === "rejected") {
      try { fallbackOrderDocs = (await ordersBase.limit(5000).get()).docs; }
      catch (error) {
        console.warn("Commercial account: count fallback unavailable:", error);
        dataWarnings.push("Les compteurs historiques n'ont pas pu être recalculés.");
      }
    }
    const totalOrders = allCountResult.status === "fulfilled" ? allCountResult.value.data().count : (fallbackOrderDocs?.length ?? ordersDocs.length);
    const successfulOrders = completedCountResult.status === "fulfilled" ? completedCountResult.value.data().count : (fallbackOrderDocs?.filter((doc) => doc.data().status === "completed").length ?? ordersDocs.filter((doc) => doc.data().status === "completed").length);

    let lastSignInAt: string | null = authMatch?.metadata?.lastSignInTime ?? null;
    let emailVerified: boolean | null = authMatch ? Boolean(authMatch.emailVerified) : null;
    if (!lastSignInAt || emailVerified === null) {
      try {
        const authUser = await getAdminAuth().getUser(uid);
        lastSignInAt = authUser.metadata.lastSignInTime ?? lastSignInAt;
        emailVerified = authUser.emailVerified;
      } catch (error) {
        console.warn("Commercial account: optional Auth metadata unavailable:", error);
      }
    }

    const orders = ordersDocs.map((doc) => {
      const order = doc.data();
      return {
        id: doc.id,
        status: order.status ?? "unknown",
        price: affiliateNumber(order.priceNum) ?? affiliateNumber(order.price, 0) ?? 0,
        margin: affiliateNumber(order.marginNum) ?? affiliateNumber(order.margin),
        createdAt: affiliateDateIso(order.createdAt),
        serviceCode: order.serviceCode ?? "",
        serviceName: order.serviceName ?? "",
        countryCode: order.countryCode ?? "",
        phoneNumber: order.phoneNumber ?? "",
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      linked: true,
      contactHistory,
      dataWarnings,
      commercial: commercialInfo,
      user: {
        id: uid,
        name: user.name ?? "",
        email: user.email ?? commercialEmail,
        phone: user.phone ?? user.phoneNumber ?? "",
        countryIso: user.countryIso ?? "",
        countryName: user.countryName ?? "",
        countryFlag: user.countryFlag ?? "",
        balance: affiliateNumber(user.balance, 0) ?? 0,
        currency: user.currency ?? "EUR",
        createdAt: affiliateDateIso(user.createdAt ?? authMatch?.metadata?.creationTime),
        lastSignInAt,
        emailVerified,
        totalOrders,
        successfulOrders,
        totalSuccessfulSpend: affiliateNumber(user.totalSuccessfulSpend, 0) ?? 0,
      },
      orders,
    });
  } catch (err) {
    console.error("[affiliate/admin/commercial account] error:", { commercialId, error: err });
    res.status(500).json({
      error: "Impossible de charger le compte utilisateur du commercial.",
      details: err instanceof Error ? err.message : String(err),
      code: (err as any)?.code ?? null,
    });
  }
});

/** Clients rattachés à un commercial : même collection d'attributions que le dashboard client. */
router.get("/admin/commercials/:id/clients", requireAffiliateAdmin, async (req: Request, res: Response) => {
  try {
    const commercialId = String(req.params.id);
    const page = Math.max(parseInt(String(req.query.page ?? "1"),10) || 1,1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize ?? "20"),10) || 20,1),50);
    const base = firestoreDb.collection("affiliate_attributions").where("commercialId","==",commercialId);
    const [totalSnap, attributionsSnap] = await Promise.all([base.count().get(), base.orderBy("createdAt","desc").offset((page-1)*pageSize).limit(pageSize).get()]);
    const ids = attributionsSnap.docs.map((doc) => String(doc.data().customerId ?? ""));
    const users = new Map<string, any>();
    for (let i=0;i<ids.length;i+=30) {
      const docs = await firestoreDb.getAll(...ids.slice(i,i+30).map((id)=>firestoreDb.collection("users").doc(id)));
      for (const doc of docs) if (doc.exists) users.set(doc.id,doc.data());
    }
    const clients = attributionsSnap.docs.map((doc) => {
      const a = doc.data(); const u = users.get(String(a.customerId));
      return { id: String(a.customerId), name: u?.name ?? "Client", email: u?.email ?? "", phone: u?.phone ?? "", countryIso: u?.countryIso ?? "", countryName: u?.countryName ?? "", countryFlag: u?.countryFlag ?? "", attributedAt: a.createdAt ?? null, source: a.source ?? "link", balance: Number(u?.balance ?? 0), successfulOrders: Number(u?.successfulOrdersCount ?? 0) };
    });
    res.json({ clients, pagination: { page, pageSize, total: totalSnap.data().count, totalPages: Math.ceil(totalSnap.data().count/pageSize) } });
  } catch (err) {
    console.error("[affiliate/admin/commercial clients] error:", err);
    res.status(500).json({ error: "Impossible de charger les clients attribués." });
  }
});

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

/** Révoquer les droits ou activer après confirmation obligatoire du contrat signé. */
router.patch("/admin/commercials/:id/status", requireAffiliateAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId as string;
    const id = String(req.params.id ?? "").trim();
    const status = String(req.body?.status ?? "");
    const contractSignedConfirmed = req.body?.contractSignedConfirmed === true;
    if (!id || !["active", "inactive"].includes(status)) {
      res.status(400).json({ error: "Statut commercial invalide." });
      return;
    }
    if (status === "active" && !contractSignedConfirmed) {
      res.status(400).json({
        error: "Activation bloquée : confirmez que le contrat signé a été reçu et vérifié.",
        code: "SIGNED_CONTRACT_CONFIRMATION_REQUIRED",
      });
      return;
    }
    const ref = firestoreDb.collection("commercials").doc(id);
    const snap = await ref.get();
    if (!snap.exists) { res.status(404).json({ error: "Commercial introuvable." }); return; }
    const previous = snap.data() ?? {};
    const previousStatus = String(previous.status ?? "inactive");
    const now = new Date().toISOString();
    if (status === "active") {
      await ref.update({
        status: "active",
        updatedAt: now,
        contractVerifiedAt: now,
        contractVerifiedBy: adminId,
        accessRevokedAt: null,
        accessRevokedBy: null,
      });
    } else {
      await ref.update({
        status: "inactive",
        updatedAt: now,
        accessRevokedAt: now,
        accessRevokedBy: adminId,
      });
    }
    const applicationId = String(previous.applicationId ?? "");
    if (applicationId) {
      await firestoreDb.collection("partner_applications").doc(applicationId).set({
        contractStatus: status === "active" ? "signed_verified" : "access_revoked",
        contractVerifiedAt: status === "active" ? now : (previous.contractVerifiedAt ?? null),
        updatedAt: now,
      }, { merge: true });
    }
    await auditLog({
      actorId: adminId,
      actorRole: "admin",
      action: status === "active" ? "activate_commercial_after_contract" : "revoke_commercial_access",
      entityType: "commercials",
      entityId: id,
      metadataSafe: { previousStatus, status, contractSignedConfirmed },
    });
    res.status(200).json({ ok: true, status });
  } catch (err) {
    console.error("[affiliate/admin/commercials/status] error:", err);
    res.status(500).json({ error: "Impossible de modifier le statut du commercial." });
  }
});

/** GET /admin/leaderboard?period=today|week|month|year|all — Classement */
router.get(
  "/admin/leaderboard",
  requireAffiliateAdmin,
  async (req: Request, res: Response) => {
    try {
      const period = sanitizeString(req.query.period, 20) || "all";

      // Calculer la date de début selon la période
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      let start: Date | null = null;

      switch (period) {
        case "today":
          start = todayStart;
          break;
        case "week": {
          const day = todayStart.getDay();
          const diff = day === 0 ? 6 : day - 1; // lundi = 1er jour
          start = new Date(todayStart);
          start.setDate(start.getDate() - diff);
          break;
        }
        case "month":
          start = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
          break;
        case "year":
          start = new Date(todayStart.getFullYear(), 0, 1);
          break;
        case "all":
        default:
          start = null;
      }

      const startIso = start?.toISOString();

      // Récupérer toutes les données en parallèle
      const [
        commercialsSnap,
        commissionsSnap,
        attributionsSnap,
        balancesSnap,
      ] = await Promise.all([
        firestoreDb.collection("commercials").get(),
        firestoreDb.collection("affiliate_commissions").get(),
        firestoreDb.collection("affiliate_attributions").get(),
        firestoreDb.collection("commercial_balances").get(),
      ]);

      // Mapper les balances par commercialId
      const balancesMap = new Map<
        string,
        { earned: number; reserved: number; paidOut: number }
      >();
      for (const doc of balancesSnap.docs) {
        const d = doc.data();
        balancesMap.set(doc.id, {
          earned: Number(d.earned ?? 0),
          reserved: Number(d.reserved ?? 0),
          paidOut: Number(d.paidOut ?? 0),
        });
      }

      // Agréger par commercial
      const rows = commercialsSnap.docs.map((c) => {
        const cd = c.data();
        const commercialId = c.id;

        // Filtrer les commissions de ce commercial sur la période
        const comms = commissionsSnap.docs.filter((x) => {
          const xd = x.data();
          if (xd.commercialId !== commercialId) return false;
          if (xd.status === "reversed") return false;
          if (startIso && (!xd.createdAt || xd.createdAt < startIso)) return false;
          return true;
        });

        const totalSales = comms.reduce(
          (s, x) => s + Number(x.data().orderAmount ?? 0),
          0
        );
        const totalCommissions = comms.reduce(
          (s, x) => s + Number(x.data().commissionAmount ?? 0),
          0
        );

        // Clients attribués sur la période
        const clientsCount = attributionsSnap.docs.filter((a) => {
          const ad = a.data();
          if (ad.commercialId !== commercialId) return false;
          if (startIso && (!ad.createdAt || ad.createdAt < startIso)) return false;
          return true;
        }).length;

        const balance = balancesMap.get(commercialId) ?? {
          earned: 0,
          reserved: 0,
          paidOut: 0,
        };
        const available = Math.max(
          0,
          balance.earned - balance.reserved - balance.paidOut
        );

        return {
          commercialId,
          name: cd.name ?? "Inconnu",
          email: cd.email ?? "",
          affiliateCode: cd.affiliateCode ?? "",
          commissionRate: Number(cd.commissionRate ?? 50),
          status: cd.status ?? "active",
          clientsCount,
          salesCount: comms.length,
          totalSales: Number(totalSales.toFixed(2)),
          totalCommissions: Number(totalCommissions.toFixed(2)),
          available: Number(available.toFixed(2)),
          paidOut: Number(balance.paidOut.toFixed(2)),
        };
      });

      // Trier par commissions décroissantes
      rows.sort((a, b) => b.totalCommissions - a.totalCommissions);

      // Ajouter le rang
      const leaderboard = rows.map((r, i) => ({ ...r, rank: i + 1 }));

      res.status(200).json({
        period,
        leaderboard,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[affiliate/admin/leaderboard] error:", err);
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

/* ═══════════════════════════════════════════════════════════
 * EXPORTS UTILITAIRES (pour handlers/orders.ts)
 * ═══════════════════════════════════════════════════════════ */

export { createCommissionForOrder, reverseCommission };

export default router;