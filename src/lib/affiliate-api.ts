// Fichier : src/lib/affiliate-api.ts

/**
 * Client API pour le système d'affiliation Texerra.
 * Toutes les requêtes passent par /api/affiliate (Function Vercel unique).
 */

import { auth } from "./firebase";

const API_BASE = "/api/affiliate";

/* ─────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────── */

export interface CommercialProfile {
  id: string;
  name: string;
  email: string;
  affiliateCode: string;
  commissionRate: number;
  status: "active" | "inactive";
}

export interface CommercialKpis {
  clientsCount: number;
  totalSales: number;
  totalCommissions: number;
  available: number;
  totalPaid: number;
}

export interface MeResponse {
  commercial: CommercialProfile;
  kpis: CommercialKpis;
}

export interface ClientRow {
  id: string;
  email: string;
  name: string;
  attributedAt: string;
  source: "link" | "admin";
}

export interface ClientsResponse {
  clients: ClientRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CommissionRow {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "available" | "paid" | "reversed";
  createdAt: string;
  reversedAt?: string;
  reversalReason?: string;
}

export interface CommissionsResponse {
  commissions: CommissionRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface WithdrawalRow {
  id: string;
  amount: number;
  method: string;
  destinationMasked: string;
  status: "pending" | "approved" | "paid" | "rejected" | "cancelled";
  requestedAt: string;
  processedAt?: string;
  adminNote?: string;
}

export interface WithdrawalsResponse {
  withdrawals: WithdrawalRow[];
}

export interface AdminStats {
  totalSales: number;
  totalCommissions: number;
  availableCommissions: number;
  reserved: number;
  totalPaid: number;
  activeCommercials: number;
  totalAttributions: number;
}

/* ─────────────────────────────────────────────
 * CORE FETCH
 * ───────────────────────────────────────────── */

async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // important pour le cookie d'affiliation
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg =
      (data as any)?.error ?? `Erreur ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

/* ─────────────────────────────────────────────
 * API PUBLIQUE / CLIENT
 * ───────────────────────────────────────────── */

/** Capture du ref : pose le cookie côté serveur */
export async function captureReferral(ref: string): Promise<void> {
  await fetch(`${API_BASE}/visit?ref=${encodeURIComponent(ref)}`, {
    credentials: "include",
  });
}

/** Attribution post-authentification */
export async function claimReferral(): Promise<{
  ok: boolean;
  attribution?: unknown;
}> {
  return apiCall("/claim", { method: "POST" });
}

/* ─────────────────────────────────────────────
 * API COMMERCIAL
 * ───────────────────────────────────────────── */

export function getMe(): Promise<MeResponse> {
  return apiCall("/me");
}

export function getClients(page = 1, pageSize = 20): Promise<ClientsResponse> {
  return apiCall(`/clients?page=${page}&pageSize=${pageSize}`);
}

export function getCommissions(
  page = 1,
  pageSize = 20
): Promise<CommissionsResponse> {
  return apiCall(`/commissions?page=${page}&pageSize=${pageSize}`);
}

export function getWithdrawals(): Promise<WithdrawalsResponse> {
  return apiCall("/withdrawals");
}

export function requestWithdrawal(payload: {
  amount: number;
  method: string;
  destinationMasked: string;
}): Promise<{ ok: boolean; request: WithdrawalRow }> {
  return apiCall("/withdrawals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ─────────────────────────────────────────────
 * API ADMIN
 * ───────────────────────────────────────────── */

export interface AdminCommercialRow {
  id: string;
  name: string;
  email: string;
  affiliateCode: string;
  commissionRate: number;
  status: "active" | "inactive";
  createdAt: string;
}

export function adminListCommercials(): Promise<{
  commercials: AdminCommercialRow[];
}> {
  return apiCall("/admin/commercials");
}

export function adminCreateCommercial(payload: {
  name: string;
  email: string;
  commissionRate?: number;
}): Promise<{ ok: boolean; commercial: AdminCommercialRow }> {
  return apiCall("/admin/commercials", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adminUpdateRate(
  commercialId: string,
  commissionRate: number
): Promise<{ ok: boolean }> {
  return apiCall(`/admin/commercials/${commercialId}/rate`, {
    method: "PATCH",
    body: JSON.stringify({ commissionRate }),
  });
}

export function adminListWithdrawals(status?: string): Promise<{
  withdrawals: (WithdrawalRow & {
    commercialName: string;
    commercialCode: string;
  })[];
}> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiCall(`/admin/withdrawals${qs}`);
}

export function adminProcessWithdrawal(
  withdrawalId: string,
  status: "approved" | "paid" | "rejected" | "cancelled",
  adminNote?: string
): Promise<{ ok: boolean }> {
  return apiCall(`/admin/withdrawals/${withdrawalId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, adminNote }),
  });
}

export function adminGetStats(): Promise<{ kpis: AdminStats }> {
  return apiCall("/admin/stats");
  }
