import { Router } from "express";
import { db, paymentsTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
type InitiatePaymentBodyType = { orderId?: string; name?: string; email?: string; mobile?: string; countryIso?: string };
const InitiatePaymentBody = {
  safeParse(body: unknown) {
    const b = body as InitiatePaymentBodyType;
    if (!b?.orderId || !b?.name || !b?.email || !b?.mobile) return { success: false as const, error: { issues: [] } };
    return { success: true as const, data: b as Required<Omit<InitiatePaymentBodyType, "countryIso">> & Pick<InitiatePaymentBodyType, "countryIso"> };
  }
};
import crypto from "crypto";
import { createPaymentLink, verifyPayment } from "../lib/accountpe.js";
import { buyNumber } from "../lib/grizzlysms.js";
import { getCachedPrices, sellingPrice, countryIdFromCode } from "../lib/priceCache.js";

const router = Router();

function getServerUrl(): string {
  if (process.env.SERVER_URL) return process.env.SERVER_URL;
  if (process.env.REPLIT_DOMAINS) return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "http://localhost:8080";
}

// EUR → local currency for AccountPe billing
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

router.post("/initiate", async (req, res) => {
  const parsed = InitiatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.issues });
    return;
  }

  const { orderId, name, email, mobile, countryIso } = parsed.data;

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }

  try {
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

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        id: paymentId,
        orderId,
        method: "accountpe",
        amount: priceEur.toFixed(4),
        currency: "EUR",
        status: "processing",
        reference: transactionId,
      })
      .returning();

    res.json({ ...payment, amount: parseFloat(payment.amount), checkoutUrl });
  } catch (err) {
    req.log.error({ err }, "Failed to create AccountPe payment link");
    res.status(502).json({ error: "Impossible d'initier le paiement. Veuillez réessayer." });
  }
});

router.post("/webhook", async (req, res) => {
  res.status(200).json({ received: true });

  const { transaction_id } = req.body as { transaction_id?: string };
  if (!transaction_id) return;

  try {
    const { isPaid } = await verifyPayment(transaction_id);
    if (!isPaid) return;

    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.reference, transaction_id))
      .limit(1);

    if (!payment || payment.status === "completed") return;

    await db.update(paymentsTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(paymentsTable.id, payment.id));

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, payment.orderId)).limit(1);
    if (!order || order.status !== "pending_payment") return;

    // Buy number on GrizzlySMS
    const countryId = countryIdFromCode(order.countryCode);
    const grizzlyOrder = await buyNumber(countryId, order.serviceCode);

    await db.update(ordersTable)
      .set({
        phoneNumber: `+${grizzlyOrder.phone}`,
        externalOrderId: String(grizzlyOrder.id),
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));
  } catch (err) {
    req.log.error({ err }, "Webhook processing error");
  }
});

router.get("/:id/status", async (req, res) => {
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, String(req.params.id))).limit(1);
  if (!payment) { res.status(404).json({ error: "Paiement introuvable" }); return; }
  res.json({ ...payment, amount: parseFloat(payment.amount) });
});

export default router;
