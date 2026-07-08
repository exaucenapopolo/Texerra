import { Router } from "express";
import { db, ordersTable, usersTable } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";
import { CreateOrderBody } from "@workspace/api-zod";
import crypto from "crypto";
import { buyNumber, checkOrder, cancelOrder, finishOrder, GRIZZLY_COUNTRIES } from "../lib/grizzlysms.js";
import { getCachedPrices, countryIdFromCode, sellingPrice } from "../lib/priceCache.js";
import { sendOrderEmail, sendCancellationEmail } from "../lib/mailer.js";
import { requireAuth } from "../lib/requireAuth.js";

const router = Router();

/**
 * Atomically refund the order price to the user balance.
 * Uses WHERE status IN (active|pending_payment) to avoid double-refund.
 * Returns true if the refund was applied.
 */
async function atomicRefundOrder(orderId: string, userId: string, price: string, newStatus: "cancelled" | "expired"): Promise<boolean> {
  const [updated] = await db
    .update(ordersTable)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(and(
      eq(ordersTable.id, orderId),
      // Only refund if the order was still active (prevents double-refund)
      sql`status IN ('active', 'pending_payment')`
    ))
    .returning({ id: ordersTable.id });

  if (!updated) return false; // already cancelled/expired/completed

  // Credit balance back
  await db
    .update(usersTable)
    .set({
      balance: sql`balance + ${price}::numeric`,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));

  return true;
}

// GET /api/orders — orders for the authenticated user
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt));
  res.json(orders.map((o) => ({ ...o, price: o.price ? parseFloat(o.price) : null })));
});

// POST /api/orders — create order and immediately buy number (deducts from balance)
router.post("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides" });
    return;
  }

  const { countryCode, serviceCode } = parsed.data;
  const countryId = countryIdFromCode(countryCode);

  if (!GRIZZLY_COUNTRIES[countryId]) {
    res.status(400).json({ error: `Pays inconnu: ${countryCode}` });
    return;
  }

  // Fetch price
  let priceEur: number;
  try {
    const prices = await getCachedPrices();
    const p = sellingPrice(prices, countryId, serviceCode);
    if (p === null) {
      res.status(400).json({ error: "Service non disponible pour ce pays" });
      return;
    }
    priceEur = p;
  } catch (err) {
    req.log.error({ err }, "Failed to fetch prices");
    res.status(500).json({ error: "Impossible de récupérer les prix" });
    return;
  }

  // Check user balance
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Utilisateur introuvable" });
    return;
  }

  const balance = parseFloat(user.balance ?? "0");
  if (balance < priceEur) {
    res.status(402).json({ error: "Solde insuffisant", required: priceEur, balance });
    return;
  }

  // Deduct balance atomically (only if balance still >= price)
  const [deducted] = await db
    .update(usersTable)
    .set({
      balance: sql`balance - ${priceEur.toFixed(4)}::numeric`,
      updatedAt: new Date(),
    })
    .where(and(eq(usersTable.id, userId), sql`balance >= ${priceEur.toFixed(4)}::numeric`))
    .returning({ id: usersTable.id });

  if (!deducted) {
    res.status(402).json({ error: "Solde insuffisant", required: priceEur, balance });
    return;
  }

  let grizzlyOrder: { id: number; phone: string };
  try {
    grizzlyOrder = await buyNumber(countryId, serviceCode);
  } catch (err: any) {
    // Refund balance on failure
    await db.update(usersTable)
      .set({
        balance: sql`balance + ${priceEur.toFixed(4)}::numeric`,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId));

    req.log.error({ err }, "Failed to buy GrizzlySMS number");
    if (err.message === "no_numbers") {
      res.status(503).json({ error: "no_numbers" });
    } else if (err.message === "no_balance") {
      res.status(503).json({ error: "no_balance" });
    } else {
      res.status(502).json({ error: "provider_error" });
    }
    return;
  }

  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  const [order] = await db
    .insert(ordersTable)
    .values({
      id: crypto.randomUUID(),
      userId,
      countryCode,
      serviceCode,
      phoneNumber: `+${grizzlyOrder.phone}`,
      externalOrderId: String(grizzlyOrder.id),
      status: "active",
      price: priceEur.toFixed(4),
      currency: "EUR",
      expiresAt,
    })
    .returning();

  res.status(201).json({ ...order, price: order.price ? parseFloat(order.price) : null });

  // Email de confirmation — non-bloquant
  if (user.email) {
    sendOrderEmail({
      to: user.email, name: user.name,
      phoneNumber: order.phoneNumber,
      serviceCode: order.serviceCode,
      countryCode: order.countryCode,
      priceEur,
      expiresAt: order.expiresAt,
      orderId: order.id,
    }).catch(() => {});
  }
});

// GET /api/orders/:id — get order + poll SMS + auto-refund on expire
router.get("/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, String(req.params.id)))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  if (order.userId !== userId) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  // Auto-expire if past expiry time and still active
  if (order.status === "active" && order.expiresAt && new Date() > order.expiresAt) {
    if (order.externalOrderId) {
      cancelOrder(parseInt(order.externalOrderId, 10)).catch(() => {});
    }
    if (order.price && order.userId) {
      await atomicRefundOrder(order.id, order.userId, order.price, "expired");
    }
    const [fresh] = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).limit(1);
    res.json({ ...fresh, price: fresh.price ? parseFloat(fresh.price) : null });
    return;
  }

  // Poll GrizzlySMS for SMS if order is active and no code yet
  if (order.status === "active" && order.externalOrderId && !order.smsCode) {
    try {
      const result = await checkOrder(parseInt(order.externalOrderId, 10));

      if (result.status === "received" && result.code) {
        const [updated] = await db
          .update(ordersTable)
          .set({ smsCode: result.code, smsText: result.code, status: "completed", updatedAt: new Date() })
          .where(eq(ordersTable.id, order.id))
          .returning();

        finishOrder(parseInt(order.externalOrderId, 10)).catch(() => {});

        res.json({ ...updated, price: updated.price ? parseFloat(updated.price) : null });
        return;
      }

      if (result.status === "cancelled") {
        // Provider cancelled — refund and mark expired
        if (order.price && order.userId) {
          await atomicRefundOrder(order.id, order.userId, order.price, "expired");
        }
        const [fresh] = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).limit(1);
        res.json({ ...fresh, price: fresh.price ? parseFloat(fresh.price) : null });
        return;
      }
    } catch (err) {
      req.log.warn({ err }, "GrizzlySMS checkOrder error (non-fatal)");
    }
  }

  res.json({ ...order, price: order.price ? parseFloat(order.price) : null });
});

// POST /api/orders/:id/cancel — cancel order (refund to balance, atomic)
router.post("/:id/cancel", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, String(req.params.id)))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  if (order.userId !== userId) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  // Cancel at provider (non-blocking)
  if (order.externalOrderId) {
    cancelOrder(parseInt(order.externalOrderId, 10)).catch(() => {});
  }

  // Atomic refund — prevents double-refund if already cancelled
  if (order.price && order.userId) {
    const refunded = await atomicRefundOrder(order.id, order.userId, order.price, "cancelled");
    if (!refunded) {
      // Already cancelled/completed, just return current state
      res.json({ ...order, price: order.price ? parseFloat(order.price) : null });
      return;
    }
    const [fresh] = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).limit(1);
    res.json({ ...fresh, price: fresh.price ? parseFloat(fresh.price) : null });

    // Email d'annulation avec remboursement — non-bloquant
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (u?.email) sendCancellationEmail({
      to: u.email, name: u.name,
      phoneNumber: order.phoneNumber,
      serviceCode: order.serviceCode,
      countryCode: order.countryCode,
      refundEur: order.price ? parseFloat(order.price) : null,
      orderId: order.id,
    }).catch(() => {});
    return;
  }

  // No price to refund, just cancel
  const [updated] = await db
    .update(ordersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(ordersTable.id, String(req.params.id)))
    .returning();

  res.json({ ...updated, price: updated.price ? parseFloat(updated.price) : null });

  // Email d'annulation sans remboursement — non-bloquant
  const [u2] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (u2?.email) sendCancellationEmail({
    to: u2.email, name: u2.name,
    phoneNumber: order.phoneNumber,
    serviceCode: order.serviceCode,
    countryCode: order.countryCode,
    refundEur: null,
    orderId: order.id,
  }).catch(() => {});
});

export default router;
