// Fichier : lib/affiliate-commission.ts

/**
 * Service de calcul et de gestion des commissions.
 *
 * ➕ LOGIQUE CORRIGÉE :
 *   La commission = TAUX% × MARGE nette de Texerra
 *   Ce qui équivaut à ~33% du chiffre d'affaires
 *   (car la marge représente environ 66,67% du CA avec le coefficient ×3)
 *
 * Exemple :
 *   - Client paie 1,00 € (CA)
 *   - Coût fournisseur : 0,33 €
 *   - Marge Texerra : 0,67 €
 *   - Commission (50% marge) : 0,335 € ≈ 0,33 €
 *   - Ce qui revient à 33,5% du CA
 *
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
  /** Chiffre d'affaires (prix payé par le client) */
  orderAmount: number;
  /** Marge nette Texerra (peut être null si données indisponibles) */
  orderMargin: number | null;
  /** Taux appliqué sur la marge (ex: 50) */
  commissionRate: number;
  /** Commission versée au commercial */
  commissionAmount: number;
  /** Équivalent en % du CA (pour affichage) */
  commissionCaEquivalent: number;
  /** Indique si la marge a été estimée (données manquantes) */
  marginEstimated: boolean;
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
/** Ratio de marge par défaut (2/3 = 66,67% du CA, correspond à un coefficient ×3) */
const DEFAULT_MARGIN_RATIO = 2 / 3;

/* ═══════════════════════════════════════════════════════════
 * 1. CRÉATION IDEMPOTENTE
 * ═══════════════════════════════════════════════════════════ */

/**
 * Crée une commission pour une commande éligible.
 *
 * @param orderId         ID unique de la commande
 * @param customerId      UID Firebase du client
 * @param orderAmount     Chiffre d'affaires de la commande (prix payé)
 * @param orderMargin     Marge nette Texerra (optionnel — estimée si null)
 *
 * Idempotent : si une commission existe déjà pour cet orderId, retourne une erreur.
 * Atomique : transaction Firestore (commission + compteur balance).
 */
export async function createCommissionForOrder(
  orderId: string,
  customerId: string,
  orderAmount: number,
  orderMargin: number | null = null
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

  // 3. Calcul de la commission (basé sur la MARGE)
  let marginUsed: number;
  let marginEstimated = false;

  if (
    orderMargin !== null &&
    orderMargin !== undefined &&
    Number.isFinite(orderMargin) &&
    orderMargin > 0
  ) {
    // Cas nominal : on a la vraie marge
    marginUsed = orderMargin;
  } else {
    // Fallback : estimer la marge à partir du CA
    // (cas rare où le fournisseur n'a pas fourni les données de coût)
    marginUsed = Number((orderAmount * DEFAULT_MARGIN_RATIO).toFixed(4));
    marginEstimated = true;
    console.warn(
      `[commission] ⚠️ Marge absente pour la commande ${orderId}, estimation à partir du CA (${marginUsed})`
    );
  }

  // Commission = taux% × marge
  const commissionAmount = Number(((marginUsed * rate) / 100).toFixed(4));
  // Équivalent en % du CA (pour transparence)
  const commissionCaEquivalent = Number(
    ((commissionAmount / orderAmount) * 100).toFixed(2)
  );

  // 4. Transaction idempotente
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
      orderAmount: Number(orderAmount.toFixed(4)),
      orderMargin: marginEstimated ? null : Number(marginUsed.toFixed(4)),
      commissionRate: rate,
      commissionAmount,
      commissionCaEquivalent,
      marginEstimated,
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

/* ═══════════════════════════════════════════════════════════
 * 2. REVERSAL
 * ═══════════════════════════════════════════════════════════ */

/**
 * Inverse une commission (remboursement / annulation).
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

/* ═══════════════════════════════════════════════════════════
 * 3. LECTURE
 * ═══════════════════════════════════════════════════════════ */

export async function getCommissionByOrder(
  orderId: string
): Promise<Commission | null> {
  const doc = await firestoreDb
    .collection("affiliate_commissions")
    .doc(orderId)
    .get();
  return doc.exists ? (doc.data() as Commission) : null;
}
