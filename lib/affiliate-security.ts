// Fichier : lib/affiliate-security.ts

/**
 * Helpers de sécurité pour le système d'affiliation Texerra.
 * - Rate limiting en mémoire (suffisant pour Vercel Hobby)
 * - Journalisation d'audit
 * - Validation d'inputs
 * - Vérification administrateur
 */

import { firestoreDb } from "./firebase-admin.js";

/* ─────────────────────────────────────────────
 * 1. RATE LIMITING (in-memory, safe pour Hobby)
 * ───────────────────────────────────────────── */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Vérifie si une clé a dépassé la limite de requêtes.
 * Retourne true si autorisé, false si bloqué.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  cleanupRateLimitStore();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

/**
 * Nettoyage périodique pour éviter la fuite mémoire.
 * Appelé à chaque check, ne fait rien si le store est petit.
 */
export function cleanupRateLimitStore(): void {
  if (rateLimitStore.size < 1000) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

/* ─────────────────────────────────────────────
 * 2. AUDIT LOG
 * ───────────────────────────────────────────── */

export interface AuditLogEntry {
  actorId: string;
  actorRole: "admin" | "commercial" | "system";
  action: string;
  entityType: string;
  entityId: string;
  metadataSafe: Record<string, unknown>;
}

/**
 * Enregistre une action sensible dans le journal d'audit.
 * Ne bloque jamais le flux principal en cas d'erreur.
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await firestoreDb.collection("affiliate_audit_logs").add({
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadataSafe: entry.metadataSafe,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[affiliate-security] auditLog failed:", err);
  }
}

/* ─────────────────────────────────────────────
 * 3. VALIDATION
 * ───────────────────────────────────────────── */

/**
 * Valide un code d'affiliation : 3 à 20 caractères alphanumériques + tirets.
 */
export function isValidAffiliateCode(code: string): boolean {
  return /^[A-Z0-9-]{3,20}$/i.test(code);
}

/**
 * Nettoie une chaîne : trim + limite de longueur.
 */
export function sanitizeString(value: unknown, maxLength = 200): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

/**
 * Parse un nombre, retourne fallback si invalide.
 */
export function parseNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

/* ─────────────────────────────────────────────
 * 4. VÉRIFICATION ADMIN
 * ───────────────────────────────────────────── */

/**
 * Liste des emails administrateurs autorisés.
 * Configurable via ADMIN_EMAILS (séparés par virgules).
 */
function getAdminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS ?? "exaucenapopolo2@gmail.com";
  return env
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Vérifie si un email est administrateur.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}