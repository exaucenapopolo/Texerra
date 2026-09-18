// Fichier : lib/affiliate-commission.ts

/**
 * Service de calcul et de gestion des commissions.
 * Idempotent : une commande = une seule commission (clé = orderId).
 * Le compteur "commercial_balances" est mis à jour dans la même transaction.
 */

import { firestoreDb } from "./firebase-admin.js";
import { getAttribution } from "./affiliate-attribution.js";

export interface Commission {
  id: string;
  commercialId: string;
  customerId: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "available" | "paid" | "reversed";
  createdAt: string;
  reversedAt?: string;
  reversalReason?: string;
}

export interface CreateCommissionResult {
  success: boolean;
  reason?: string;
  commission?: Commission;
}

const DEFAULT_COMMISSION_RATE = 50;

/* ─────────────────────────────────────────────
 * 1. CRÉATION IDEMPOTENTE
 * ───────────────────────────────────────────── */

/**
 * Crée une commission pour une commande éligible.
 * Idempotent : si une commission existe déjà pour cet orderId, retourne une erreur.
 * Atomique : transaction Firestore (commission + compteur balance).
 */
export async function createCommissionForOrder(
  orderId: string,
  customerId: string,
  orderAmount: number
): Promise<CreateCommissionResult> {
  if (!orderId || !customerId) {
    return { success: false, reason: "invalid_params" };
  }
  if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
    return { success: false, reason: "invalid_order_amount" };
  }

  // 1. Vérifier l'attribution
  const attribution = await getAttribution(customerId);
  if (!attribution) {
    return { success: false, reason: "customer_not_attributed" };
  }

  // 2. Vérifier le commercial
  const commercialSnap = await firestoreDb
    .collection("commercials")
    .doc(attribution.commercialId)
    .get();

  if (!commercialSnap.exists) {
    return { success: false, reason: "commercial_not_found" };
  }
  const commercialData = commercialSnap.data();
  if (commercialData?.status !== "active") {
    return { success: false, reason: "commercial_inactive" };
  }

  const rate = Number(
    commercialData?.commissionRate ?? DEFAULT_COMMISSION_RATE
  );
  const commissionAmount = Number(((orderAmount * rate) / 100).toFixed(4));

  // 3. Transaction idempotente
  const commissionRef = firestoreDb
    .collection("affiliate_commissions")
    .doc(orderId);
  const balanceRef = firestoreDb
    .collection("commercial_balances")
    .doc(attribution.commercialId);

  return await firestoreDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(commissionRef);
    if (existing.exists) {
      return { success: false, reason: "commission_already_exists" };
    }

    const balanceDoc = await transaction.get(balanceRef);
    const earned = Number(balanceDoc.data()?.earned ?? 0);
    const reserved = Number(balanceDoc.data()?.reserved ?? 0);
    const paidOut = Number(balanceDoc.data()?.paidOut ?? 0);

    const commission: Commission = {
      id: orderId,
      commercialId: attribution.commercialId,
      customerId,
      orderId,
      orderAmount,
      commissionRate: rate,
      commissionAmount,
      status: "available",
      createdAt: new Date().toISOString(),
    };

    transaction.set(commissionRef, commission);
    transaction.set(
      balanceRef,
      {
        commercialId: attribution.commercialId,
        earned: Number((earned + commissionAmount).toFixed(4)),
        reserved: Number(reserved.toFixed(4)),
        paidOut: Number(paidOut.toFixed(4)),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true, commission };
  });
}

/* ─────────────────────────────────────────────
 * 2. REVERSAL
 * ───────────────────────────────────────────── */

/**
 * Inverse une commission (remboursement / annulation).
 * Refuse si déjà reversed, paid, ou si le solde a déjà été dépensé.
 */
export async function reverseCommission(
  orderId: string,
  reason: string
): Promise<{ success: boolean; reason?: string }> {
  if (!orderId) return { success: false, reason: "invalid_order_id" };

  const commissionRef = firestoreDb
    .collection("affiliate_commissions")
    .doc(orderId);

  return await firestoreDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(commissionRef);
    if (!doc.exists) return { success: false, reason: "commission_not_found" };

    const data = doc.data() as Commission;
    if (data.status === "reversed") {
      return { success: false, reason: "already_reversed" };
    }
    if (data.status === "paid") {
      return { success: false, reason: "already_paid" };
    }

    const balanceRef = firestoreDb
      .collection("commercial_balances")
      .doc(data.commercialId);
    const balanceDoc = await transaction.get(balanceRef);
    const earned = Number(balanceDoc.data()?.earned ?? 0);
    const reserved = Number(balanceDoc.data()?.reserved ?? 0);
    const paidOut = Number(balanceDoc.data()?.paidOut ?? 0);

    const available = earned - reserved - paidOut;
    if (available < data.commissionAmount) {
      return { success: false, reason: "commission_already_spent" };
    }

    transaction.update(commissionRef, {
      status: "reversed",
      reversedAt: new Date().toISOString(),
      reversalReason: reason.slice(0, 500),
    });

    transaction.set(
      balanceRef,
      {
        commercialId: data.commercialId,
        earned: Number((earned - data.commissionAmount).toFixed(4)),
        reserved: Number(reserved.toFixed(4)),
        paidOut: Number(paidOut.toFixed(4)),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true };
  });
}

/* ─────────────────────────────────────────────
 * 3. LECTURE
 * ───────────────────────────────────────────── */

export async function getCommissionByOrder(
  orderId: string
): Promise<Commission | null> {
  const doc = await firestoreDb
    .collection("affiliate_commissions")
    .doc(orderId)
    .get();
  return doc.exists ? (doc.data() as Commission) : null;
}