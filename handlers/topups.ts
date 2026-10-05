import { Router } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import crypto from "crypto";
import { createPaymentLink, verifyPayment } from "../lib/accountpe.js";
import {
  createCheckout,
  getPaymentStatus,
  convertToXaf,
  NELSIUS_FX_RATES,
} from "../lib/nelsiuspay.js";
import * as requireAuthModule from "../lib/requireAuth.js";
import { sendTopupEmail } from "../lib/mailer.js";

const router = Router();

const requireAuth =
  (requireAuthModule as any).default ??
  (requireAuthModule as any).requireAuth;

if (typeof requireAuth !== "function") {
  throw new Error(
    'Le middleware "../lib/requireAuth.js" doit exporter une fonction valide (default ou requireAuth).'
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Helpers                                                            */
/* ────────────────────────────────────────────────────────────────── */

function getAppBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.REPLIT_DOMAINS)
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  if (process.env.REPLIT_DEV_DOMAIN)
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "http://localhost:8080";
}

function getServerUrl(): string {
  return getAppBaseUrl();
}

const PAYMENT_FEE_RATE = 1.015;

/* ────────────────────────────────────────────────────────────────── */
/* Devises / pays                                                    */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Devises locales pour AccountPe.
 * ⚠️  Ces taux ne concernent QUE AccountPe (Mobile Money).
 *     NelsiusPay utilise NELSIUS_FX_RATES (EUR→XAF, USD→XAF) — voir lib/nelsiuspay.ts.
 */
const BUYER_CURRENCY: Record<string, { currency: string; eurRate: number }> = {
  CM: { currency: "XAF", eurRate: 655.96 },
  CG: { currency: "XAF", eurRate: 655.96 },
  CD: { currency: "CDF", eurRate: 2800 },
  SN: { currency: "XOF", eurRate: 655.96 },
  CI: { currency: "XOF", eurRate: 655.96 },
  GA: { currency: "XAF", eurRate: 655.96 },
  NG: { currency: "NGN", eurRate: 1750 },
  TG: { currency: "XOF", eurRate: 655.96 },
  BJ: { currency: "XOF", eurRate: 655.96 },
  ML: { currency: "XOF", eurRate: 655.96 },
  NE: { currency: "XOF", eurRate: 655.96 },
  GH: { currency: "GHS", eurRate: 16 },
  KE: { currency: "KES", eurRate: 140 },
  UG: { currency: "UGX", eurRate: 3900 },
  TZ: { currency: "TZS", eurRate: 2700 },
  ZM: { currency: "ZMW", eurRate: 27 },
  RW: { currency: "RWF", eurRate: 1350 },
  BF: { currency: "XOF", eurRate: 655.96 },
};

function formatTopup(t: any) {
  return {
    ...t,
    amountEur:
      typeof t.amountEur === "string"
        ? parseFloat(t.amountEur)
        : t.amountEur ?? 0,
  };
}

/* ────────────────────────────────────────────────────────────────── */
/* Crédit atomique                                                   */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Crédite atomiquement le solde de l'utilisateur pour une recharge.
 * IDEMPOTENT : si la recharge est déjà "completed", ne fait rien.
 */
async function atomicCredit(
  topupId: string,
  userId: string,
  amountEur: string | number
): Promise<boolean> {
  const topupRef = firestoreDb.collection("topups").doc(topupId);
  const userRef = firestoreDb.collection("users").doc(userId);
  const eurVal =
    typeof amountEur === "string" ? parseFloat(amountEur) : amountEur;

  try {
    return await firestoreDb.runTransaction(async (transaction) => {
      const topupDoc = await transaction.get(topupRef);
      const userDoc = await transaction.get(userRef);

      if (!topupDoc.exists) return false;
      const topupData = topupDoc.data();

      // Idempotence : si déjà completed, on ne crédite pas
      if (topupData?.status !== "pending") return false;

      let currentBalance = 0;
      if (userDoc.exists) {
        currentBalance = parseFloat(userDoc.data()?.balance ?? "0");
      }
      const newBalance = (currentBalance + eurVal).toFixed(4);

      transaction.update(topupRef, {
        status: "completed",
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

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

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/topups — Liste l'historique                              */
/* ────────────────────────────────────────────────────────────────── */

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

    topups.sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    res.json(topups.map(formatTopup));
  } catch (err) {
    console.error("Erreur lors de la récupération des recharges :", err);
    res
      .status(500)
      .json({ error: "Impossible de récupérer l'historique des recharges" });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* POST /api/topups — Création du paiement                           */
/* ────────────────────────────────────────────────────────────────── */

router.post("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const {
    amountEur,
    name,
    email,
    mobile,
    countryIso,
    paymentMethod = "mobile_money",
  } = req.body as {
    amountEur?: number;
    name?: string;
    email?: string;
    mobile?: string;
    countryIso?: string;
    paymentMethod?: "mobile_money" | "card";
  };

  if (!amountEur || amountEur < 0.5 || amountEur > 500) {
    res
      .status(400)
      .json({ error: "Montant invalide (min 0.50€, max 500€)" });
    return;
  }

  if (!name || !email || !mobile) {
    res.status(400).json({ error: "Champs requis: name, email, mobile" });
    return;
  }

  /* ── Validation du pays ── */
  const isoRaw =
    typeof countryIso === "string" ? countryIso.trim().toUpperCase() : "";

  if (!isoRaw && paymentMethod === "mobile_money") {
    res.status(400).json({
      error:
        "Le pays de paiement est requis. Veuillez sélectionner un pays.",
    });
    return;
  }

  /* ═══════════════════════════════════════════════════════════════
   * PAYMENT METHOD : CARTE BANCAIRE → NelsiusPay
   * ═══════════════════════════════════════════════════════════════ */
  if (paymentMethod === "card") {
    const topupId = crypto.randomUUID();
    const reference = `TEX-NELSIUS-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    try {
      // Conversion EUR → XAF avec les taux Texerra centralisés
      const providerAmount = convertToXaf(amountEur, "EUR");

      const appUrl = getAppBaseUrl();

      const checkout = await createCheckout({
        amount: providerAmount,
        currency: "XAF",
        reference,
        return_url: `${appUrl}/api/topups/return?topupId=${topupId}&provider=nelsiuspay`,
        cancel_url: `${appUrl}/wallet?topup=${topupId}&result=failed`,
        customer_email: email,
        customer_phone: mobile.replace(/\D/g, ""),
        customer_name: name,
        description: `Texerra — recharge solde ${amountEur.toFixed(2)}€`,
      });

      const topupData = {
        id: topupId,
        userId,
        amountEur: amountEur.toFixed(4),
        amountEurNum: amountEur,
        providerAmount,
        providerCurrency: "XAF",
        provider: "nelsiuspay",
        method: "card",
        reference,
        conversionRate: NELSIUS_FX_RATES.EUR_TO_XAF,
        sourceCurrency: "EUR",
        status: "pending",
        paymentUrl: checkout.checkout_url,
        externalId: reference,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await firestoreDb.collection("topups").doc(topupId).set(topupData);

      res.json({
        topupId,
        checkoutUrl: checkout.checkout_url,
        amountEur,
        provider: "nelsiuspay",
      });
    } catch (err) {
      const logger = (req as any).log || console;
      logger.error({ err }, "Failed to create NelsiusPay checkout link");
      res.status(502).json({
        error:
          "Impossible d'initier le paiement par carte. Veuillez réessayer.",
      });
    }
    return;
  }

  /* ═══════════════════════════════════════════════════════════════
   * PAYMENT METHOD : MOBILE MONEY → AccountPe (existant)
   * ═══════════════════════════════════════════════════════════════ */

  const currencyInfo = BUYER_CURRENCY[isoRaw];
  if (!currencyInfo) {
    res.status(400).json({ error: "Pays de paiement non supporté." });
    return;
  }

  const isoUpper = isoRaw;
  const amountLocal = Math.ceil(
    amountEur * currencyInfo.eurRate * PAYMENT_FEE_RATE
  );

  const topupId = crypto.randomUUID();
  const transactionId = `TEX-TOP-${Date.now()}-${crypto
    .randomBytes(3)
    .toString("hex")}`;
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
      amountEurNum: amountEur,
      amountLocal,
      localCurrency: currencyInfo.currency,
      countryIso: isoUpper,
      feeRate: PAYMENT_FEE_RATE - 1,
      provider: "accountpe",
      method: "mobile_money",
      status: "pending",
      paymentUrl: checkoutUrl,
      externalId: transactionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firestoreDb.collection("topups").doc(topupId).set(topupData);

    res.json({ topupId, checkoutUrl, amountEur, provider: "accountpe" });
  } catch (err) {
    const logger = (req as any).log || console;
    logger.error({ err }, "Failed to create AccountPe topup link");
    res
      .status(502)
      .json({ error: "Impossible d'initier le paiement. Veuillez réessayer." });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* POST /api/topups/webhook — Callback AccountPe                     */
/* ────────────────────────────────────────────────────────────────── */

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

    const credited = await atomicCredit(
      topup.id,
      topup.userId,
      topup.amountEur
    );

    if (credited) {
      const userDoc = await firestoreDb
        .collection("users")
        .doc(topup.userId)
        .get();
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

/* ────────────────────────────────────────────────────────────────── */
/* POST /api/topups/webhook/nelsiuspay — Callback NelsiusPay         */
/* ────────────────────────────────────────────────────────────────── */

router.post("/webhook/nelsiuspay", async (req, res) => {
  res.status(200).json({ received: true });

  const body = req.body as {
    event?: string;
    reference?: string;
    status?: string;
  };

  const reference = body.reference;
  if (!reference) return;

  try {
    // Retrouver la recharge par référence
    const snapshot = await firestoreDb
      .collection("topups")
      .where("reference", "==", reference)
      .limit(1)
      .get();

    if (snapshot.empty) return;

    const topupDoc = snapshot.docs[0];
    const topup = { id: topupDoc.id, ...topupDoc.data() } as any;

    if (topup.provider !== "nelsiuspay") return;

    // Vérification du statut auprès de NelsiusPay (source de vérité)
    const details = await getPaymentStatus(reference);

    // Vérifier le montant et la devise
    if (details.currency !== "XAF") {
      console.warn(
        `NelsiusPay webhook: devise inattendue ${details.currency} pour ${reference}`
      );
      return;
    }

    if (details.status === "completed") {
      const credited = await atomicCredit(
        topup.id,
        topup.userId,
        topup.amountEur
      );

      if (credited) {
        const userDoc = await firestoreDb
          .collection("users")
          .doc(topup.userId)
          .get();
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
    } else if (details.status === "failed") {
      if (topup.status === "pending") {
        await firestoreDb.collection("topups").doc(topup.id).update({
          status: "failed",
          updatedAt: new Date().toISOString(),
        });

        const userDoc = await firestoreDb
          .collection("users")
          .doc(topup.userId)
          .get();
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
      }
    }
  } catch (err) {
    console.error("NelsiusPay webhook error:", err);
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/topups/return                                            */
/* ────────────────────────────────────────────────────────────────── */

router.get("/return", async (req, res) => {
  const {
    topupId,
    transaction_id,
    provider,
  } = req.query as {
    topupId?: string;
    transaction_id?: string;
    provider?: string;
  };

  const serverUrl = getServerUrl();
  const frontendBase = serverUrl;

  if (!topupId && !transaction_id) {
    res.redirect(`${frontendBase}/wallet`);
    return;
  }

  try {
    let topup: any = null;

    if (topupId) {
      const doc = await firestoreDb
        .collection("topups")
        .doc(String(topupId))
        .get();
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
        topup = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
      }
    }

    if (!topup) {
      res.redirect(`${frontendBase}/wallet`);
      return;
    }

    // Si déjà completed, on redirige directement
    if (topup.status === "completed") {
      res.redirect(
        `${frontendBase}/wallet?topup=${topup.id}&result=credited`
      );
      return;
    }

    if (topup.status === "failed") {
      res.redirect(
        `${frontendBase}/wallet?topup=${topup.id}&result=failed`
      );
      return;
    }

    /* ── Vérification selon le provider ── */
    if (topup.provider === "nelsiuspay") {
      const ref = topup.reference ?? (transaction_id as string | undefined);
      if (!ref) {
        res.redirect(`${frontendBase}/wallet?topup=${topup.id}`);
        return;
      }

      const details = await getPaymentStatus(ref);

      if (details.status === "completed") {
        const credited = await atomicCredit(
          topup.id,
          topup.userId,
          topup.amountEur
        );
        res.redirect(
          `${frontendBase}/wallet?topup=${topup.id}&result=credited`
        );

        if (credited) {
          const userDoc = await firestoreDb
            .collection("users")
            .doc(topup.userId)
            .get();
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

      if (details.status === "failed") {
        await firestoreDb.collection("topups").doc(topup.id).update({
          status: "failed",
          updatedAt: new Date().toISOString(),
        });

        res.redirect(
          `${frontendBase}/wallet?topup=${topup.id}&result=failed`
        );

        const userDoc = await firestoreDb
          .collection("users")
          .doc(topup.userId)
          .get();
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

      res.redirect(
        `${frontendBase}/wallet?topup=${topup.id}&result=pending`
      );
      return;
    }

    /* ── AccountPe (existant) ── */
    const txId = topup.externalId ?? (transaction_id as string | undefined);
    if (!txId) {
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}`);
      return;
    }

    const { isPaid, status: providerStatus } = await verifyPayment(txId);

    if (isPaid) {
      const credited = await atomicCredit(
        topup.id,
        topup.userId,
        topup.amountEur
      );
      res.redirect(
        `${frontendBase}/wallet?topup=${topup.id}&result=credited`
      );

      if (credited) {
        const userDoc = await firestoreDb
          .collection("users")
          .doc(topup.userId)
          .get();
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

      res.redirect(
        `${frontendBase}/wallet?topup=${topup.id}&result=failed`
      );

      const userDoc = await firestoreDb
        .collection("users")
        .doc(topup.userId)
        .get();
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
    console.error("Return handler error:", err);
    res.redirect(
      `${frontendBase}/wallet?topup=${topupId ?? ""}&result=pending`
    );
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/topups/:id/status                                        */
/* ────────────────────────────────────────────────────────────────── */

router.get("/:id/status", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const doc = await firestoreDb
    .collection("topups")
    .doc(String(req.params.id))
    .get();
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
  const shouldCheck =
    (topup.status === "pending" || force) && !!topup.externalId;

  if (shouldCheck) {
    try {
      /* ── Vérification NelsiusPay ── */
      if (topup.provider === "nelsiuspay") {
        const details = await getPaymentStatus(topup.reference);

        if (details.status === "completed") {
          await atomicCredit(topup.id, topup.userId, topup.amountEur);
          const freshDoc = await firestoreDb
            .collection("topups")
            .doc(topup.id)
            .get();
          const fresh = { id: freshDoc.id, ...freshDoc.data() };
          res.json({ ...formatTopup(fresh), _justCredited: true });
          return;
        }

        if (details.status === "failed" && topup.status === "pending") {
          await firestoreDb.collection("topups").doc(topup.id).update({
            status: "failed",
            updatedAt: new Date().toISOString(),
          });

          const freshDoc = await firestoreDb
            .collection("topups")
            .doc(topup.id)
            .get();
          const fresh = { id: freshDoc.id, ...freshDoc.data() };
          res.json(formatTopup(fresh));
          return;
        }

        // pending → on renvoie l'état actuel
        res.json(formatTopup(topup));
        return;
      }

      /* ── Vérification AccountPe (existant) ── */
      const { isPaid, status: providerStatus } = await verifyPayment(
        topup.externalId!
      );

      if (isPaid) {
        await atomicCredit(topup.id, topup.userId, topup.amountEur);
        const freshDoc = await firestoreDb
          .collection("topups")
          .doc(topup.id)
          .get();
        const fresh = { id: freshDoc.id, ...freshDoc.data() };
        res.json({ ...formatTopup(fresh), _justCredited: true });
        return;
      }

      if (providerStatus === "failed" && topup.status === "pending") {
        await firestoreDb.collection("topups").doc(topup.id).update({
          status: "failed",
          updatedAt: new Date().toISOString(),
        });

        const freshDoc = await firestoreDb
          .collection("topups")
          .doc(topup.id)
          .get();
        const fresh = { id: freshDoc.id, ...freshDoc.data() };
        res.json(formatTopup(fresh));
        return;
      }
    } catch (err) {
      const logger = (req as any).log || console;
      logger.warn?.(
        { err },
        "Verify error during status check (non-fatal)"
      );
    }
  }

  res.json(formatTopup(topup));
});

export default router;