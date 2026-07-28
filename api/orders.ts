import { Router } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import { CreateOrderBody } from "@workspace/api-zod";
import crypto from "crypto";
import { buyNumber, checkOrder, cancelOrder, finishOrder, GRIZZLY_COUNTRIES } from "../lib/grizzlysms.js";
import { getCachedPrices, countryIdFromCode, sellingPrice } from "../lib/priceCache.js";
import { sendOrderEmail, sendCancellationEmail } from "../lib/mailer.js";
import { requireAuth } from "../lib/requireAuth.js";

const router = Router();

/**
 * Atomically refund the order price to the user balance using a Firestore transaction.
 * Prevents double-refund if already cancelled or expired.
 */
async function atomicRefundOrder(orderId: string, userId: string, priceNum: number, newStatus: "cancelled" | "expired"): Promise<boolean> {
  const orderRef = firestoreDb.collection("orders").doc(orderId);
  const userRef = firestoreDb.collection("users").doc(userId);

  return await firestoreDb.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) return false;
    
    const orderData = orderDoc.data();
    if (!orderData || (orderData.status !== 'active' && orderData.status !== 'pending_payment')) {
      return false; // Already processed
    }

    const userDoc = await transaction.get(userRef);
    const currentBalance = userDoc.exists ? parseFloat(userDoc.data()?.balance ?? "0") : 0;

    // Update order status
    transaction.update(orderRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    // Credit balance back
    transaction.set(userRef, {
      balance: (currentBalance + priceNum).toFixed(4),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return true;
  });
}

// GET /api/orders — orders for the authenticated user
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const snapshot = await firestoreDb.collection("orders")
      .where("userId", "==", userId)
      .get();

    const orders = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        price: data.price ? parseFloat(data.price) : null,
      };
    });

    // Sort by creation date descending
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(orders);
  } catch (err) {
    const logger = (req as any).log || console;
    logger.error({ err }, "Failed to fetch orders from Firestore");
    res.status(500).json({ error: "Impossible de récupérer les commandes" });
  }
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
  } catch (err: any) {
    const logger = (req as any).log || console;
    logger.error({ err }, "Failed to fetch prices");
    res.status(500).json({ error: "Impossible de récupérer les prix" });
    return;
  }

  const userRef = firestoreDb.collection("users").doc(userId);
  let orderId = crypto.randomUUID();

  // Check and deduct balance atomically using a Firestore transaction
  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error("user_not_found");
      }

      const userData = userDoc.data();
      const currentBalance = parseFloat(userData?.balance ?? "0");

      if (currentBalance < priceEur) {
        throw new Error("insufficient_balance");
      }

      transaction.update(userRef, {
        balance: (currentBalance - priceEur).toFixed(4),
        updatedAt: new Date().toISOString(),
      });
    });
  } catch (err: any) {
    if (err.message === "user_not_found") {
      res.status(401).json({ error: "Utilisateur introuvable" });
      return;
    }
    if (err.message === "insufficient_balance") {
      res.status(402).json({ error: "Solde insuffisant", required: priceEur });
      return;
    }
    res.status(500).json({ error: "Erreur lors de la vérification du solde" });
    return;
  }

  let grizzlyOrder: { id: number; phone: string };
  try {
    grizzlyOrder = await buyNumber(countryId, serviceCode);
  } catch (err: any) {
    // Refund balance on failure atomically
    await firestoreDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists) {
        const currentBalance = parseFloat(userDoc.data()?.balance ?? "0");
        transaction.update(userRef, {
          balance: (currentBalance + priceEur).toFixed(4),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    const logger = (req as any).log || console;
    logger.error({ err }, "Failed to buy GrizzlySMS number");
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
  const orderData = {
    id: orderId,
    userId,
    countryCode,
    serviceCode,
    phoneNumber: `+${grizzlyOrder.phone}`,
    externalOrderId: String(grizzlyOrder.id),
    status: "active",
    price: priceEur.toFixed(4),
    currency: "EUR",
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };

  await firestoreDb.collection("orders").doc(orderId).set(orderData);

  res.status(201).json({
    ...orderData,
    price: priceEur,
    expiresAt,
  });

  // Email de confirmation — non-bloquant
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  if (userData?.email) {
    sendOrderEmail({
      to: userData.email,
      name: userData.name,
      phoneNumber: orderData.phoneNumber,
      serviceCode: orderData.serviceCode,
      countryCode: orderData.countryCode,
      priceEur,
      expiresAt,
      orderId,
    }).catch(() => {});
  }
});

// GET /api/orders/:id — get order + poll SMS + auto-refund on expire
router.get("/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const orderId = String(req.params.id);

  const orderRef = firestoreDb.collection("orders").doc(orderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  const order = orderDoc.data()!;
  if (order.userId !== userId) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }

  const expiresAtDate = new Date(order.expiresAt);

  // Auto-expire if past expiry time and still active
  if (order.status === "active" && order.expiresAt && new Date() > expiresAtDate) {
    if (order.externalOrderId) {
      cancelOrder(parseInt(order.externalOrderId, 10)).catch(() => {});
    }
    if (order.price && order.userId) {
      await atomicRefundOrder(orderId, order.userId, parseFloat(order.price), "expired");
    }
    const freshDoc = await orderRef.get();
    const freshData = freshDoc.data()!;
    res.json({ ...freshData, price: freshData.price ? parseFloat(freshData.price) : null });
    return;
  }

  // Poll GrizzlySMS for SMS if order is active and no code yet
  if (order.status === "active" && order.externalOrderId && !order.smsCode) {
    try {
      const result = await checkOrder(parseInt(order.externalOrderId, 10));

      if (result.status === "received" && result.code) {
        await orderRef.update({
          smsCode: result.code,
          smsText: result.code,
          status: "completed",
          updatedAt: new Date().toISOString(),
        });

        finishOrder(parseInt(order.externalOrderId, 10)).catch(() => {});

        const updatedDoc = await orderRef.get();
        const updatedData = updatedDoc.data()!;
        res.json({ ...updatedData, price: updatedData.price ? parseFloat(updatedData.price) : null });
        return;
      }

      if (result.status === "cancelled") {
        if (order.price && order.userId) {
          await atomicRefundOrder(orderId, order.userId, parseFloat(order.price), "expired");
        }
        const freshDoc = await orderRef.get();
        const freshData = freshDoc.data()!;
        res.json({ ...freshData, price: freshData.price ? parseFloat(freshData.price) : null });
        return;
      }
    } catch (err) {
      const logger = (req as any).log || console;
      logger.warn({ err }, "GrizzlySMS checkOrder error (non-fatal)");
    }
  }

  res.json({ ...order, price: order.price ? parseFloat(order.price) : null });
});

// POST /api/orders/:id/cancel — cancel order (refund to balance, atomic)
router.post("/:id/cancel", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const orderId = String(req.params.id);

  const orderRef = firestoreDb.collection("orders").doc(orderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    res.status(404).json({ error: "Commande introuvable" });
    return;
  }

  const order = orderDoc.data()!;
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
    const refunded = await atomicRefundOrder(orderId, order.userId, parseFloat(order.price), "cancelled");
    if (!refunded) {
      res.json({ ...order, price: order.price ? parseFloat(order.price) : null });
      return;
    }
    const freshDoc = await orderRef.get();
    const freshData = freshDoc.data()!;
    res.json({ ...freshData, price: freshData.price ? parseFloat(freshData.price) : null });

    // Email d'annulation avec remboursement — non-bloquant
    const userDoc = await firestoreDb.collection("users").doc(userId).get();
    const u = userDoc.data();
    if (u?.email) {
      sendCancellationEmail({
        to: u.email,
        name: u.name,
        phoneNumber: order.phoneNumber,
        serviceCode: order.serviceCode,
        countryCode: order.countryCode,
        refundEur: order.price ? parseFloat(order.price) : null,
        orderId,
      }).catch(() => {});
    }
    return;
  }

  // No price to refund, just cancel
  await orderRef.update({
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  });

  const updatedDoc = await orderRef.get();
  const updatedData = updatedDoc.data()!;
  res.json({ ...updatedData, price: updatedData.price ? parseFloat(updatedData.price) : null });

  // Email d'annulation sans remboursement — non-bloquant
  const userDoc2 = await firestoreDb.collection("users").doc(userId).get();
  const u2 = userDoc2.data();
  if (u2?.email) {
    sendCancellationEmail({
      to: u2.email,
      name: u2.name,
      phoneNumber: order.phoneNumber,
      serviceCode: order.serviceCode,
      countryCode: order.countryCode,
      refundEur: null,
      orderId,
    }).catch(() => {});
  }
});

export default router;
           
