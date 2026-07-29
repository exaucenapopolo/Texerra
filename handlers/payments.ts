import { Router, type Request, type Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { cert, applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { createPaymentLink, verifyPayment } from "../lib/accountpe.js";
import { buyNumber } from "../lib/grizzlysms.js";
import { getCachedPrices, sellingPrice, countryIdFromCode } from "../lib/priceCache.js";

const router = Router();

const InitiatePaymentBody = z.object({
  orderId: z.string().min(1, "orderId requis"),
  name: z.string().trim().min(1, "name requis"),
  email: z.string().trim().email("email invalide"),
  mobile: z.string().trim().min(1, "mobile requis"),
  countryIso: z.string().trim().min(2).max(3).optional(),
});

type InitiatePaymentBodyType = z.infer<typeof InitiatePaymentBody>;

let firestoreDb: Firestore | null = null;

function getAdminDb(): Firestore {
  if (firestoreDb) return firestoreDb;

  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson) as any;
        initializeApp({
          credential: cert(serviceAccount),
        });
      } catch (error) {
        console.error("Impossible de parser FIREBASE_SERVICE_ACCOUNT_JSON :", error);
        initializeApp({
          credential: applicationDefault(),
        });
      }
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        } as any),
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
      });
    }
  }

  firestoreDb = getFirestore();
  return firestoreDb;
}

function getServerUrl(): string {
  if (process.env.SERVER_URL) return process.env.SERVER_URL;
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:8080";
}

// EUR → devise locale pour la facturation AccountPe
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
  ZM: { currency: "ZMW", eurRate: 27 },
  MZ: { currency: "MZN", eurRate: 63 },
  ET: { currency: "ETB", eurRate: 130 },
};

router.post("/initiate", async (req: Request, res: Response) => {
  const parsed = InitiatePaymentBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Données invalides",
      details: parsed.error.issues,
    });
    return;
  }

  const { orderId, name, email, mobile, countryIso } = parsed.data;

  try {
    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }

    const order = orderSnap.data() as {
      id?: string;
      countryCode?: string;
      serviceCode?: string;
      status?: string;
      price?: string | number;
      currency?: string;
      phoneNumber?: string | null;
      externalOrderId?: string | null;
      createdAt?: unknown;
      updatedAt?: unknown;
    };

    if (!order.countryCode || !order.serviceCode) {
      res.status(400).json({ error: "Commande incomplète" });
      return;
    }

    const prices = await getCachedPrices();
    const countryId = countryIdFromCode(order.countryCode);
    const priceEur = sellingPrice(prices, countryId, order.serviceCode);

    if (priceEur === null) {
      res.status(400).json({ error: "Ce service n'est pas disponible pour ce pays." });
      return;
    }

    const isoUpper = (countryIso ?? "CM").toUpperCase();
    const currencyInfo = BUYER_CURRENCY[isoUpper] ?? { currency: "XAF", eurRate: 655.96 };
    const amountLocal = Math.ceil(priceEur * currencyInfo.eurRate);

    const transactionId = `TEX-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const paymentId = crypto.randomUUID();
    const serverUrl = getServerUrl();

    const { checkoutUrl } = await createPaymentLink({
      countryCode: isoUpper,
      name,
      email,
      mobile: mobile.replace(/\D/g, ""),
      amount: amountLocal,
      currency: currencyInfo.currency,
      transactionId,
      description: `Texerra — numéro virtuel`,
      callbackUrl: `${serverUrl}/api/payments/webhook`,
      redirectUrl: `${serverUrl}/order?orderId=${orderId}`,
    });

    const paymentDoc = {
      id: paymentId,
      orderId,
      method: "accountpe",
      amount: priceEur.toFixed(4),
      currency: "EUR",
      status: "processing",
      reference: transactionId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection("payments").doc(paymentId).set(paymentDoc);

    await orderRef.set(
      {
        status: "pending_payment",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({
      ...paymentDoc,
      amount: parseFloat(paymentDoc.amount),
      checkoutUrl,
    });
  } catch (err) {
    const logger = (req as any).log || console;
    logger.error?.({ err }, "Failed to create AccountPe payment link");
    logger.error?.({ err }, "Failed to create AccountPe payment link");
    res.status(502).json({ error: "Impossible d'initier le paiement. Veuillez réessayer." });
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  res.status(200).json({ received: true });

  const { transaction_id } = req.body as { transaction_id?: string };
  if (!transaction_id) return;

  try {
    const db = getAdminDb();

    const { isPaid } = await verifyPayment(transaction_id);
    if (!isPaid) return;

    const paymentsQuery = await db
      .collection("payments")
      .where("reference", "==", transaction_id)
      .limit(1)
      .get();

    if (paymentsQuery.empty) return;

    const paymentDoc = paymentsQuery.docs[0];
    const payment = paymentDoc.data() as {
      id?: string;
      orderId?: string;
      status?: string;
      reference?: string;
      amount?: string | number;
      currency?: string;
    };

    if (!payment.orderId || payment.status === "completed") return;

    await paymentDoc.ref.set(
      {
        status: "completed",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const orderRef = db.collection("orders").doc(payment.orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) return;

    const order = orderSnap.data() as {
      countryCode?: string;
      serviceCode?: string;
      status?: string;
    };

    if (order.status !== "pending_payment") return;
    if (!order.countryCode || !order.serviceCode) return;

    const countryId = countryIdFromCode(order.countryCode);
    const grizzlyOrder = await buyNumber(countryId, order.serviceCode);

    await orderRef.set(
      {
        phoneNumber: `+${grizzlyOrder.phone}`,
        externalOrderId: String(grizzlyOrder.id),
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    const logger = (req as any).log || console;
    logger.error?.({ err }, "Webhook processing error");
    logger.error?.({ err }, "Webhook processing error");
  }
});

router.get("/:id/status", async (req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const paymentId = String(req.params.id);
    const paymentSnap = await db.collection("payments").doc(paymentId).get();

    if (!paymentSnap.exists) {
      res.status(404).json({ error: "Paiement introuvable" });
      return;
    }

    const payment = paymentSnap.data() as {
      amount?: string | number;
      [key: string]: unknown;
    };

    res.json({
      ...payment,
      amount: typeof payment.amount === "string" ? parseFloat(payment.amount) : payment.amount,
    });
  } catch (err) {
    console.error("Erreur lors de la lecture du paiement :", err);
    res.status(500).json({ error: "Impossible de lire le statut du paiement" });
  }
});

export default router;
