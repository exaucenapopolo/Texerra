// Fichier : lib/affiliate-withdrawal.ts

/**
 * Service de gestion des retraits commerciaux.
 * - Solde reconstruit via le compteur commercial_balances
 * - Réservation atomique (anti race condition)
 * - Workflow strict des statuts
 */

import { firestoreDb } from "./firebase-admin.js";

export interface WithdrawalRequest {
  id: string;
  commercialId: string;
  amount: number;
  method: string;
  destinationMasked: string;
  status: "pending" | "approved" | "paid" | "rejected" | "cancelled";
  requestedAt: string;
  processedAt?: string;
  adminId?: string;
  adminNote?: string;
}

export interface CreateWithdrawalResult {
  success: boolean;
  reason?: string;
  request?: WithdrawalRequest;
}

const DEFAULT_MIN_WITHDRAWAL = 10;
const ALLOWED_METHODS = ["mobile_money", "bank_transfer", "crypto"] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["paid", "cancelled"],
  paid: [],
  rejected: [],
  cancelled: [],
};

/* ─────────────────────────────────────────────
 * 1. SOLDE DISPONIBLE
 * ───────────────────────────────────────────── */

/**
 * Calcule le solde disponible d'un commercial.
 * available = earned - reserved - paidOut
 */
export async function getAvailableBalance(
  commercialId: string
): Promise<number> {
  const balanceDoc = await firestoreDb
    .collection("commercial_balances")
    .doc(commercialId)
    .get();

  if (!balanceDoc.exists) return 0;

  const data = balanceDoc.data();
  const earned = Number(data?.earned ?? 0);
  const reserved = Number(data?.reserved ?? 0);
  const paidOut = Number(data?.paidOut ?? 0);

  return Math.max(0, Number((earned - reserved - paidOut).toFixed(4)));
}

/* ─────────────────────────────────────────────
 * 2. CONFIG
 * ───────────────────────────────────────────── */

async function getMinWithdrawal(): Promise<number> {
  try {
    const doc = await firestoreDb.collection("config").doc("affiliate").get();
    const value = doc.data()?.minWithdrawal;
    if (typeof value === "number" && value > 0) return value;
  } catch {
    // ignore
  }
  return DEFAULT_MIN_WITHDRAWAL;
}

/* ─────────────────────────────────────────────
 * 3. CRÉATION DEMANDE
 * ───────────────────────────────────────────── */

/**
 * Crée une demande de retrait avec réservation atomique.
 * Re-vérifie le solde dans la transaction (anti race condition).
 */
export async function createWithdrawalRequest(
  commercialId: string,
  amount: number,
  method: string,
  destinationMasked: string
): Promise<CreateWithdrawalResult> {
  // Validations
  if (!commercialId) {
    return { success: false, reason: "invalid_commercial_id" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, reason: "invalid_amount" };
  }
  if (!ALLOWED_METHODS.includes(method as any)) {
    return { success: false, reason: "invalid_method" };
  }
  if (!destinationMasked || destinationMasked.length < 3) {
    return { success: false, reason: "invalid_destination" };
  }

  const minWithdrawal = await getMinWithdrawal();
  if (amount < minWithdrawal) {
    return { success: false, reason: `minimum_withdrawal_${minWithdrawal}` };
  }

  const balanceRef = firestoreDb
    .collection("commercial_balances")
    .doc(commercialId);
  const requestRef = firestoreDb.collection("withdrawal_requests").doc();

  return await firestoreDb.runTransaction(async (transaction) => {
    const balanceDoc = await transaction.get(balanceRef);
    const earned = Number(balanceDoc.data()?.earned ?? 0);
    const reserved = Number(balanceDoc.data()?.reserved ?? 0);
    const paidOut = Number(balanceDoc.data()?.paidOut ?? 0);
    const available = earned - reserved - paidOut;

    if (amount > available) {
      return { success: false, reason: "insufficient_balance" };
    }

    const request: WithdrawalRequest = {
      id: requestRef.id,
      commercialId,
      amount: Number(amount.toFixed(4)),
      method,
      destinationMasked: destinationMasked.slice(0, 50),
      status: "pending",
      requestedAt: new Date().toISOString(),
    };

    transaction.set(requestRef, request);
    transaction.set(
      balanceRef,
      {
        commercialId,
        earned: Number(earned.toFixed(4)),
        reserved: Number((reserved + amount).toFixed(4)),
        paidOut: Number(paidOut.toFixed(4)),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true, request };
  });
}

/* ─────────────────────────────────────────────
 * 4. TRAITEMENT ADMIN
 * ───────────────────────────────────────────── */

/**
 * Traite une demande de retrait (admin).
 * Met à jour le compteur balance dans la même transaction.
 */
export async function processWithdrawal(
  withdrawalId: string,
  adminId: string,
  newStatus: "approved" | "paid" | "rejected" | "cancelled",
  adminNote?: string
): Promise<{ success: boolean; reason?: string }> {
  if (!withdrawalId) return { success: false, reason: "invalid_id" };

  const withdrawalRef = firestoreDb
    .collection("withdrawal_requests")
    .doc(withdrawalId);

  return await firestoreDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(withdrawalRef);
    if (!doc.exists) return { success: false, reason: "not_found" };

    const data = doc.data()!;
    const current = data.status as string;
    const amount = Number(data.amount ?? 0);
    const commercialId = data.commercialId as string;

    if (!VALID_TRANSITIONS[current]?.includes(newStatus)) {
      return {
        success: false,
        reason: `invalid_transition_${current}_to_${newStatus}`,
      };
    }

    const balanceRef = firestoreDb
      .collection("commercial_balances")
      .doc(commercialId);
    const balanceDoc = await transaction.get(balanceRef);
    const earned = Number(balanceDoc.data()?.earned ?? 0);
    const reserved = Number(balanceDoc.data()?.reserved ?? 0);
    const paidOut = Number(balanceDoc.data()?.paidOut ?? 0);

    let newReserved = reserved;
    let newPaidOut = paidOut;

    if (newStatus === "paid") {
      newReserved = Math.max(0, reserved - amount);
      newPaidOut = paidOut + amount;
    } else if (newStatus === "rejected" || newStatus === "cancelled") {
      newReserved = Math.max(0, reserved - amount);
    }
    // approved : pas de changement

    transaction.update(withdrawalRef, {
      status: newStatus,
      processedAt: new Date().toISOString(),
      adminId,
      adminNote: adminNote ? adminNote.slice(0, 500) : null,
    });

    transaction.set(
      balanceRef,
      {
        commercialId,
        earned: Number(earned.toFixed(4)),
        reserved: Number(newReserved.toFixed(4)),
        paidOut: Number(newPaidOut.toFixed(4)),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true };
  });
}