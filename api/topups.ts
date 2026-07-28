import { Router } from "express";
import { db, usersTable, topupsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import crypto from "crypto";
import { createPaymentLink, verifyPayment } from "../lib/accountpe.js";
import { requireAuth } from "../lib/requireAuth.js";
import { sendTopupEmail } from "../lib/mailer.js";

const router = Router();

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

function formatTopup(t: typeof topupsTable.$inferSelect) {
  return { ...t, amountEur: parseFloat(t.amountEur) };
}

/**
 * Atomically credit the user balance for a topup.
 * Uses WHERE status='pending' to guarantee at-most-once execution —
 * even if two requests race, only one UPDATE will match and return a row.
 * Returns true if this call was the one that credited the balance.
 */
async function atomicCredit(topupId: string, userId: string, amountEur: string): Promise<boolean> {
  // 1. Atomically flip status pending → completed
  const [credited] = await db
    .update(topupsTable)
    .set({ status: "completed", updatedAt: new Date() })
    .where(and(eq(topupsTable.id, topupId), eq(topupsTable.status, "pending")))
    .returning({ id: topupsTable.id });

  if (!credited) {
    // Already processed by another request (webhook racing with poll, etc.)
    return false;
  }

  // 2. Credit the balance — only runs if step 1 succeeded
  await db
    .update(usersTable)
    .set({
      balance: sql`balance + ${amountEur}::numeric`,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));

  return true;
}

// GET /api/topups — list user's recharge history
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const topups = await db
    .select()
    .from(topupsTable)
    .where(eq(topupsTable.userId, userId))
    .orderBy(desc(topupsTable.createdAt));
  res.json(topups.map(formatTopup));
});

// POST /api/topups/initiate — create AccountPe payment link for wallet top-up
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
      // Redirect via backend so AccountPe's ?status=&transaction_id= are handled server-side
      redirectUrl: `${serverUrl}/api/topups/return?topupId=${topupId}`,
    });

    const [topup] = await db
      .insert(topupsTable)
      .values({
        id: topupId,
        userId,
        amountEur: amountEur.toFixed(4),
        status: "pending",
        paymentUrl: checkoutUrl,
        externalId: transactionId,
      })
      .returning();

    res.json({ topupId: topup.id, checkoutUrl, amountEur });
  } catch (err) {
    req.log.error({ err }, "Failed to create AccountPe topup link");
    res.status(502).json({ error: "Impossible d'initier le paiement. Veuillez réessayer." });
  }
});

// POST /api/topups/webhook — AccountPe callback → credit user balance (atomic)
router.post("/webhook", async (req, res) => {
  res.status(200).json({ received: true });

  const { transaction_id } = req.body as { transaction_id?: string };
  if (!transaction_id) return;

  try {
    const { isPaid } = await verifyPayment(transaction_id);
    if (!isPaid) return;

    const [topup] = await db
      .select()
      .from(topupsTable)
      .where(eq(topupsTable.externalId, transaction_id))
      .limit(1);

    if (!topup) return;

    const credited = await atomicCredit(topup.id, topup.userId, topup.amountEur);
    if (credited) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, topup.userId)).limit(1);
      if (u?.email) sendTopupEmail({ to: u.email, name: u.name, amountEur: parseFloat(topup.amountEur), status: "credited" }).catch(() => {});
    }
  } catch (err) {
    console.error("Topup webhook error:", err);
  }
});

// GET /api/topups/return — AccountPe redirect back after payment (public, no auth)
// AccountPe appends: ?status=1&transaction_id=TEX-TOP-xxx to our redirectUrl
router.get("/return", async (req, res) => {
  const { topupId, transaction_id } = req.query as { topupId?: string; transaction_id?: string };

  // Determine frontend redirect base
  const serverUrl = getServerUrl();
  const frontendBase = serverUrl; // same domain — proxy routes /wallet to frontend

  if (!topupId && !transaction_id) {
    res.redirect(`${frontendBase}/wallet`);
    return;
  }

  try {
    // Find the topup by internal id OR by externalId (AccountPe transaction_id)
    let topup: typeof topupsTable.$inferSelect | undefined;

    if (topupId) {
      const rows = await db.select().from(topupsTable).where(eq(topupsTable.id, String(topupId))).limit(1);
      topup = rows[0];
    }
    if (!topup && transaction_id) {
      const rows = await db.select().from(topupsTable).where(eq(topupsTable.externalId, String(transaction_id))).limit(1);
      topup = rows[0];
    }

    if (!topup) {
      res.redirect(`${frontendBase}/wallet`);
      return;
    }

    // Already processed — go straight to success
    if (topup.status === "completed") {
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=credited`);
      return;
    }
    if (topup.status === "failed") {
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=failed`);
      return;
    }

    // Verify with AccountPe
    const txId = topup.externalId ?? transaction_id as string | undefined;
    if (!txId) {
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}`);
      return;
    }

    const { isPaid, status: providerStatus } = await verifyPayment(txId);

    if (isPaid) {
      const credited = await atomicCredit(topup.id, topup.userId, topup.amountEur);
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=credited`);
      if (credited) {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, topup.userId)).limit(1);
        if (u?.email) sendTopupEmail({ to: u.email, name: u.name, amountEur: parseFloat(topup.amountEur), status: "credited" }).catch(() => {});
      }
      return;
    }

    if (providerStatus === "failed") {
      await db
        .update(topupsTable)
        .set({ status: "failed", updatedAt: new Date() })
        .where(and(eq(topupsTable.id, topup.id), eq(topupsTable.status, "pending")));
      res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=failed`);
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, topup.userId)).limit(1);
      if (u?.email) sendTopupEmail({ to: u.email, name: u.name, amountEur: parseFloat(topup.amountEur), status: "failed" }).catch(() => {});
      return;
    }

    // Still pending
    res.redirect(`${frontendBase}/wallet?topup=${topup.id}&result=pending`);
  } catch (err) {
    console.error("AccountPe return handler error:", err);
    res.redirect(`${frontendBase}/wallet?topup=${topupId ?? ""}&result=pending`);
  }
});

// GET /api/topups/:id/status — check topup status, optionally force-verifying with provider
router.get("/:id/status", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const [topup] = await db
    .select()
    .from(topupsTable)
    .where(eq(topupsTable.id, String(req.params.id)))
    .limit(1);

  if (!topup || topup.userId !== userId) {
    res.status(404).json({ error: "Recharge introuvable" });
    return;
  }

  // Force-verify with AccountPe when: still pending OR explicitly requested via ?force=true
  const force = req.query.force === "true";
  const shouldCheck = (topup.status === "pending" || force) && !!topup.externalId;

  if (shouldCheck) {
    try {
      const { isPaid, status: providerStatus } = await verifyPayment(topup.externalId!);

      if (isPaid) {
        const credited = await atomicCredit(topup.id, topup.userId, topup.amountEur);
        const [fresh] = await db.select().from(topupsTable).where(eq(topupsTable.id, topup.id)).limit(1);
        res.json({ ...formatTopup(fresh), _justCredited: credited });
        return;
      }

      // Mark as failed if provider confirms failure
      if (providerStatus === "failed" && topup.status === "pending") {
        await db
          .update(topupsTable)
          .set({ status: "failed", updatedAt: new Date() })
          .where(and(eq(topupsTable.id, topup.id), eq(topupsTable.status, "pending")));

        const [fresh] = await db.select().from(topupsTable).where(eq(topupsTable.id, topup.id)).limit(1);
        res.json(formatTopup(fresh));
        return;
      }
    } catch (err) {
      req.log.warn({ err }, "AccountPe verify error during status check (non-fatal)");
    }
  }

  res.json(formatTopup(topup));
});

export default router;
