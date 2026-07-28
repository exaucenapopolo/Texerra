import { Router } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import crypto from "crypto";
import { createPaymentLink, verifyPayment } from "../lib/accountpe.js";
import * as requireAuthModule from "../lib/requireAuth.js";
import { sendTopupEmail } from "../lib/mailer.js";

const router = Router();

// Supporte export default OU export nommé requireAuth
const requireAuth =
  (requireAuthModule as any).default ??
  (requireAuthModule as any).requireAuth;

if (typeof requireAuth !== "function") {
  throw new Error(
    'Le middleware "../lib/requireAuth.js" doit exporter une fonction valide (default ou requireAuth).'
  );
}

function getServerUrl(): string {
  if (process.env.REPLIT_DOMAINS) return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "http://localhost:8080";
}

const BUYER_CURRENCY: Record<string, { currency: string; eurRate: number }> = {
  CM: { currency: "XAF", eurRate: 655.96 },
  CI: { currency: "XOF", eurRate: 655.96 },
  SN: { currency: "XOF", eurRate: 655.96 },
  BJ: { currency: "XOF", eurRate: 655.96 },
  BF: { currency: "XOF", eurRate: 655.96 },
  ML: { currency: "XOF", eurRate: 655.96 },
  TG: { currency: "XOF", eurRate: 655.96 },
  NE: { currency: "XOF", eurRate: 655.96 },
  GN: { currency: "XOF", eurRate: 655.96 },
  GA: { currency: "XAF", eurRate: 655.96 },
  TD: { currency: "XAF", eurRate: 655.96 },
  CG: { currency: "XAF", eurRate: 655.96 },
  CD: { currency: "CDF", eurRate: 2800 },
  NG: { currency: "NGN", eurRate: 1750 },
  GH: { currency: "GHS", eurRate: 16 },
  KE: { currency: "KES", eurRate: 140 },
  TZ: { currency: "TZS", eurRate: 2700 },
  UG: { currency: "UGX", eurRate: 3900 },
  RW: { currency: "RWF", eurRate: 1350 },
  MA: { currency: "MAD", eurRate: 10.8 },
  EG: { currency: "EGP", eurRate: 52 },
  ZA: { currency: "ZAR", eurRate: 20 },
};

function formatTopup(t: any) {
  return { 
    ...t, 
    amountEur: typeof t.amountEur === "string" ? parseFloat(t.amountEur) : (t.amountEur ?? 0) 
  };
}

/**
 * Crédite atomiquement le solde de l'utilisateur pour une recharge via une transaction Firestore.
 */
async function atomicCredit(topupId: string, userId: string, amountEur: string | number): Promise<boolean> {
  const topupRef = firestoreDb.collection("topups").doc(topupId);
  const userRef = firestoreDb.collection("users").doc(userId);
  const eurVal = typeof amountEur === "string" ? parseFloat(amountEur) : amountEur;

  try {
    return await firestoreDb.runTransaction(async (transaction) => {
      const topupDoc = await transaction.get(topupRef);
      if (!topupDoc.exists) return false;
      const topupData = topupDoc.data();
      if (topupData?.status !== "pending") return false;

      // Mise à jour du statut de la recharge
      transaction.update(topupRef, {
        status: "completed",
        updatedAt: new Date().toISOString(),
      });

      // Mise à jour atomique du solde utilisateur
      const userDoc = await transaction.get(userRef);
      let currentBalance = 0;
      if (userDoc.exists) {
        currentBalance = parseFloat(userDoc.data()?.balance ?? "0");
      }
      const newBalance = (currentBalance + eurVal).toFixed(4);

      if (userDoc.exists) {
        transaction.update(userRef, {
          balance: newBalance,
          updatedAt: new Date().toISOString(),
        });
      } else {
        transaction.set(userRef, {
          balance: newBalance,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return true;
    });
  } catch (err) {
    console.error("Firestore transaction error in atomicCredit:", err);
    return false;
  }
}

// GET /api/topups — Liste l'historique des recharges de l'utilisateur
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;

    const snapshot = await firestoreDb
      .collection("topups")
      .where("userId", "==", userId)
      .get();

    const topups = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Tri par date décroissante
    topups.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json(topups.map(formatTopup));
  } catch (err) {
    console.error("Erreur lors de la récupération des recharges :", err);
    res.status(500).json({ error: "Impossible de récupérer l'historique des recharges" });
  }
});

// POST /api/topups/initiate — Création du lien de paiement
router.post("/initiate", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { amountEur, name, email, mobile, countryIso } = req.body as {
    amountEur?: number;
    name?: string;
    email?: string;
    mobile?: string;
    countryIso?: string;
  };

  if (!amountEur || amountEur < 0.5 || amountEur > 500) {
    res.status(400).json({ error: "Montant invalide (min 0.50€, max 500€)" });
    return;
  }

  if (!name || !email || !mobile) {
    res.status(400).json({ error: "Champs requis: name, email, mobile" });
    return;
  }

  const isoUpper = (countryIso ?? "CM").toUpperCase();
  const currencyInfo = BUYER_CURRENCY[isoUpper] ?? { currency: "XAF", eurRate: 655.96 };
  const amountLocal = Math.ceil(amountEur * currencyInfo.eurRate);

  const topupId = crypto.randomUUID();
  const transactionId = `TEX-TOP-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const serverUrl = getServerUrl();

  try {
    const { checkoutUrl } = await createPaymentLink({
      countryCode: isoUpper,
      name,
      email,
      mobile: mobile.replace(/\D/g, ""),
      amount: amountLocal,
      currency: currencyInfo.currency,
      transactionId,
      description: `Texerra — recharge solde ${amountEur.toFixed(2)}€`,
      callbackUrl: `${serverUrl}/api/topups/webhook`,
      redirectUrl: `${serverUrl}/api/topups/return?topupId=${topupId}`,
    });

    const topupData = {
      id: topupId,
      userId,
      amountEur: amountEur.toFixed(4),
      status: "pending",
      paymentUrl: checkoutUrl,
      externalId: transactionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firestoreDb.collection("topups").doc(topupId).set(topupData);

    res.json({ topupId, checkoutUrl, amountEur });
  } catch (err) {
    const logger = (req as any).log || console;
    logger.error({ err }, "Failed to create AccountPe topup link");
    res.status(502).json({ error: "Impossible d'initier le paiement. Veuillez réessayer." });
  }
});

// POST /api/topups/webhook — Callback
router.post("/webhook", async (req, res) => {
  res.status(200).json({ received: true });

  const { transaction_id } = req.body as { transaction_id?: string };
  if (!transaction_id) return;

  try {
    const { isPaid } = await verifyPayment(transaction_id);
    if (!isPaid) return;

    const snapshot = await firestoreDb
      .collection("topups")
      .where("externalId", "==", transaction_id)
      .limit(1)
      .get();

    if (snapshot.empty) return;
    const topupDoc = snapshot.docs[0];
    const topup = { id: topupDoc.id, ...topupDoc.data() } as any;

    const credited = await atomicCredit(topup.id, topup.userId, topup.amountEur);

    if (credited) {
      const userDoc = await firestoreDb.collection("users").doc(topup.userId).get();
      if (userDoc.exists) {
        const u = userDoc.data() as any;
        if (u?.email) {
          sendTopupEmail({
            to: u.email,
            name: u.name || "Utilisateur",
            amountEur: parseFloat(topup.amountEur),
            status: "credited",
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("Topup webhook error:", err);
  }
});

// GET /api/topups/return
router.get("/return", async (req, res) => {
  const { topupId, transaction_id } = req.query as { topupId?: string; transaction_id?: string };

  const serverUrl = getServerUrl();
  const frontendBase = serverUrl;

  if (!topupId && !transaction_id) {
    res.redirect(`${frontendBase}/wallet`);
    return;
  }

  try {
    let topup: any = null;

    if (topupId) {
      const doc = await firestoreDb.collection("topups").doc(String(topupId)).get();
      if (doc.exists) {
        topup = { id: doc.id, ...doc.data() };
      }
    }

    if (!topup && transaction_id) {
      const snapshot = await firestoreDb
        .collection("topups")
        .where("externalId", "==", String(transaction_id))
        .limit(1)
        .get();
      if (!snapshot.empty) {
        topup = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
    }

    if (!topup) {
      res.redirect(`${frontendBase}/wallet`);
      return;
    }

    if (topup.status === "completed") {
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=credited`);
      return;
    }

    if (topup.status === "failed") {
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=failed`);
      return;
    }

    const txId = topup.externalId ?? (transaction_id as string | undefined);
    if (!txId) {
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}`);
      return;
    }

    const { isPaid, status: providerStatus } = await verifyPayment(txId);

    if (isPaid) {
      const credited = await atomicCredit(topup.id, topup.userId, topup.amountEur);
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=credited`);

      if (credited) {
        const userDoc = await firestoreDb.collection("users").doc(topup.userId).get();
        if (userDoc.exists) {
          const u = userDoc.data() as any;
          if (u?.email) {
            sendTopupEmail({
              to: u.email,
              name: u.name || "Utilisateur",
              amountEur: parseFloat(topup.amountEur),
              status: "credited",
            }).catch(() => {});
          }
        }
      }
      return;
    }

    if (providerStatus === "failed") {
      await firestoreDb.collection("topups").doc(topup.id).update({
        status: "failed",
        updatedAt: new Date().toISOString(),
      });

      res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=failed`);

      const userDoc = await firestoreDb.collection("users").doc(topup.userId).get();
      if (userDoc.exists) {
        const u = userDoc.data() as any;
        if (u?.email) {
          sendTopupEmail({
            to: u.email,
            name: u.name || "Utilisateur",
            amountEur: parseFloat(topup.amountEur),
            status: "failed",
          }).catch(() => {});
        }
      }
      return;
    }

    res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=pending`);
  } catch (err) {
    console.error("AccountPe return handler error:", err);
    res.redirect(`${frontendBase}/wallet?topup=${topupId ?? ""}&result=pending`);
  }
});

// GET /api/topups/:id/status
router.get("/:id/status", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const doc = await firestoreDb.collection("topups").doc(String(req.params.id)).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Recharge introuvable" });
    return;
  }

  const topup = { id: doc.id, ...doc.data() } as any;

  if (topup.userId !== userId) {
    res.status(404).json({ error: "Recharge introuvable" });
    return;
  }

  const force = req.query.force === "true";
  const shouldCheck = (topup.status === "pending" || force) && !!topup.externalId;

  if (shouldCheck) {
    try {
      const { isPaid, status: providerStatus } = await verifyPayment(topup.externalId!);

      if (isPaid) {
        await atomicCredit(topup.id, topup.userId, topup.amountEur);
        const freshDoc = await firestoreDb.collection("topups").doc(topup.id).get();
        const fresh = { id: freshDoc.id, ...freshDoc.data() };
        res.json({ ...formatTopup(fresh), _justCredited: true });
        return;
      }

      if (providerStatus === "failed" && topup.status === "pending") {
        await firestoreDb.collection("topups").doc(topup.id).update({
          status: "failed",
          updatedAt: new Date().toISOString(),
        });

        const freshDoc = await firestoreDb.collection("topups").doc(topup.id).get();
        const fresh = { id: freshDoc.id, ...freshDoc.data() };
        res.json(formatTopup(fresh));
        return;
      }
    } catch (err) {
      const logger = (req as any).log || console;
      logger.warn?.({ err }, "AccountPe verify error during status check (non-fatal)");
    }
  }

  res.json(formatTopup(topup));
});

export default router;
                                      
