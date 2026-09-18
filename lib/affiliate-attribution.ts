// Fichier : lib/affiliate-attribution.ts

/**
 * Système d'attribution des clients aux commerciaux.
 * - Cookie signé HMAC (anti-falsification)
 * - Attribution persistante et atomique
 * - Anti auto-affiliation
 */

import crypto from "crypto";
import { firestoreDb } from "./firebase-admin.js";

/* ─────────────────────────────────────────────
 * 1. TYPES
 * ───────────────────────────────────────────── */

export interface ReferralProof {
  code: string;
  capturedAt: string;
  signature: string;
}

export interface Attribution {
  id: string;
  customerId: string;
  commercialId: string;
  affiliateCode: string;
  source: "link" | "admin";
  createdAt: string;
  overriddenAt?: string;
  overrideReason?: string;
}

export interface Commercial {
  id: string;
  firebaseUid?: string;
  name: string;
  email: string;
  affiliateCode: string;
  commissionRate: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

/* ─────────────────────────────────────────────
 * 2. COOKIE SIGNÉ HMAC
 * ───────────────────────────────────────────── */

const COOKIE_NAME = "tx_ref";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours

function getCookieSecret(): string {
  const secret = process.env.AFFILIATE_COOKIE_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AFFILIATE_COOKIE_SECRET manquant ou trop court en production"
      );
    }
    return "dev-affiliate-secret-not-for-prod-change-me-please";
  }
  return secret;
}

function signPayload(code: string, capturedAt: string): string {
  return crypto
    .createHmac("sha256", getCookieSecret())
    .update(`${code}:${capturedAt}`)
    .digest("hex");
}

/**
 * Crée la valeur du cookie Set-Cookie pour l'affiliation.
 */
export function createReferralCookie(code: string): string {
  const capturedAt = new Date().toISOString();
  const signature = signPayload(code, capturedAt);
  const payload = Buffer.from(
    JSON.stringify({ code, capturedAt, signature } satisfies ReferralProof)
  ).toString("base64url");

  const isProd = process.env.NODE_ENV === "production";
  const flags = [
    `${COOKIE_NAME}=${payload}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE}`,
    "SameSite=Lax",
    "HttpOnly",
  ];
  if (isProd) flags.push("Secure");

  return flags.join("; ");
}

/**
 * Lit et vérifie le cookie d'affiliation.
 * Retourne null si absent ou signature invalide.
 */
export function readReferralCookie(
  cookieHeader?: string
): ReferralProof | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;

  try {
    const encoded = match.slice(COOKIE_NAME.length + 1);
    const decoded = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as ReferralProof;

    if (!decoded.code || !decoded.capturedAt || !decoded.signature) return null;

    const expected = signPayload(decoded.code, decoded.capturedAt);
    const a = Buffer.from(decoded.signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Retourne la valeur du cookie pour le supprimer.
 */
export function clearReferralCookie(): string {
  const isProd = process.env.NODE_ENV === "production";
  const flags = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
    "HttpOnly",
  ];
  if (isProd) flags.push("Secure");
  return flags.join("; ");
}

/* ─────────────────────────────────────────────
 * 3. LECTURE / ÉCRITURE
 * ───────────────────────────────────────────── */

export async function getAttribution(
  customerId: string
): Promise<Attribution | null> {
  const doc = await firestoreDb
    .collection("affiliate_attributions")
    .doc(customerId)
    .get();
  return doc.exists ? (doc.data() as Attribution) : null;
}

export async function getCommercialByUid(
  uid: string
): Promise<Commercial | null> {
  const snap = await firestoreDb
    .collection("commercials")
    .where("firebaseUid", "==", uid)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { ...(data as Commercial), id: snap.docs[0].id };
}

export async function getCommercialByCode(
  code: string
): Promise<Commercial | null> {
  const snap = await firestoreDb
    .collection("commercials")
    .where("affiliateCode", "==", code)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { ...(data as Commercial), id: snap.docs[0].id };
}

/* ─────────────────────────────────────────────
 * 4. CLAIM ATOMIQUE
 * ───────────────────────────────────────────── */

export interface ClaimResult {
  success: boolean;
  reason?: string;
  attribution?: Attribution;
}

/**
 * Attribue un client à un commercial de manière atomique.
 * - Si déjà attribué : ne remplace jamais automatiquement.
 * - Anti auto-affiliation vérifié.
 * - Transaction Firestore garantit l'unicité.
 */
export async function claimAttribution(
  customerId: string,
  affiliateCode: string,
  source: "link" | "admin" = "link"
): Promise<ClaimResult> {
  const commercial = await getCommercialByCode(affiliateCode);
  if (!commercial) {
    return { success: false, reason: "commercial_not_found_or_inactive" };
  }

  // Anti auto-affiliation
  const customerDoc = await firestoreDb
    .collection("users")
    .doc(customerId)
    .get();
  const customerEmail = customerDoc.data()?.email as string | undefined;
  if (
    customerEmail &&
    commercial.email &&
    customerEmail.toLowerCase() === commercial.email.toLowerCase()
  ) {
    return { success: false, reason: "self_referral_not_allowed" };
  }

  const attributionRef = firestoreDb
    .collection("affiliate_attributions")
    .doc(customerId);

  return await firestoreDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(attributionRef);
    if (existing.exists) {
      return { success: false, reason: "already_attributed" };
    }

    const attribution: Attribution = {
      id: customerId,
      customerId,
      commercialId: commercial.id,
      affiliateCode,
      source,
      createdAt: new Date().toISOString(),
    };

    transaction.set(attributionRef, attribution);
    return { success: true, attribution };
  });
}