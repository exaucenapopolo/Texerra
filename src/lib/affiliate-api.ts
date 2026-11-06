// Fichier : src/lib/affiliate-api.ts

/**
 * Client API pour le système d'affiliation Texerra.
 * Toutes les requêtes passent par /api/affiliate (Function Vercel unique).
 */

import { auth } from "./firebase";

const API_BASE = "/api/affiliate";

export class AffiliateApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AffiliateApiError";
    this.code = code;
    this.status = status;
  }
}

/* ─────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────── */

export interface CommercialProfile {
  id: string;
  name: string;
  email: string;
  affiliateCode: string;
  commissionRate: number;
  status: "active" | "inactive" | "pending_contract";
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
    const payload = data as any;
    const errorMsg = payload?.error ?? `Erreur ${res.status}`;
    const detail = path.startsWith("/admin/") && payload?.details ? String(payload.details) : "";
    throw new AffiliateApiError(detail ? `${errorMsg} — ${detail}` : errorMsg, String(payload?.code ?? ""), res.status);
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
  country?: string;
  city?: string;
  whatsappPhone?: string;
  affiliateCode: string;
  commissionRate: number;
  status: "active" | "inactive" | "pending_contract";
  createdAt: string;
  firebaseUid?: string | null;
}

export interface PartnerApplicationRow {
  id: string; applicantUid: string; firstName: string; lastName: string; name: string;
  city: string; country?: string; whatsappPhone: string; email: string;
  status: "pending" | "approved" | "rejected"; submittedAt: string;
  commercialId?: string; approvalEmailStatus?: "pending" | "sent" | "failed";
}
export function adminListPartnerApplications(): Promise<{ applications: PartnerApplicationRow[] }> {
  return apiCall("/admin/partner-applications");
}
export function adminProcessPartnerApplication(id: string, action: "approve" | "reject"): Promise<{
  ok: boolean; status: string; commercial?: AdminCommercialRow; emailSent?: boolean; emailError?: string | null;
}> {
  return apiCall("/admin/partner-applications/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify({ action }) });
}
export function adminResendPartnerApprovalEmail(id: string): Promise<{ ok: boolean; emailSent: boolean }> {
  return apiCall("/admin/partner-applications/" + encodeURIComponent(id) + "/resend", { method: "POST" });
}

export function adminListCommercials(): Promise<{
  commercials: AdminCommercialRow[];
}> {
  return apiCall("/admin/commercials");
}

export function adminCreateCommercial(payload: {
  name: string;
  email: string;
  country: string;
  commissionRate?: number;
}): Promise<{ ok: boolean; commercial: AdminCommercialRow }> {
  return apiCall("/admin/commercials", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface AdminCommercialAccount {
  linked: boolean;
  contactHistory?: Array<{ id: string; channel?: string; status?: string; subject?: string; createdAt: string }>;
  dataWarnings?: string[];
  commercial: { id: string; name: string; email: string; country?: string };
  user?: { id: string; name: string; email: string; phone: string; countryIso?: string; countryName?: string; countryFlag?: string; balance: number; createdAt: string; lastSignInAt: string | null; totalOrders: number; successfulOrders: number; totalSuccessfulSpend: number };
  orders?: Array<{ id: string; status: string; price: number; createdAt: string; serviceCode: string; phoneNumber: string }>;
}

export function adminGetCommercialAccount(id: string): Promise<AdminCommercialAccount> {
  return apiCall(`/admin/commercials/${encodeURIComponent(id)}/account`);
}

export function adminSendAffiliateContact(payload: {
  targetType: "commercial" | "client";
  targetId: string;
  templateId: string;
  subject: string;
  message: string;
}): Promise<{ ok: boolean; id?: string; message: string }> {
  return apiCall("/admin/contact", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adminGetCommercialClients(id: string, page = 1): Promise<{
  clients: Array<{ id: string; name: string; email: string; phone: string; countryIso?: string; countryName?: string; countryFlag?: string; attributedAt: string; source: string; balance: number; successfulOrders: number }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  return apiCall(`/admin/commercials/${encodeURIComponent(id)}/clients?page=${page}&pageSize=20`);
}

export function adminUpdateStatus(commercialId: string, status: "active" | "inactive", contractSignedConfirmed = false): Promise<{ ok: boolean; status: "active" | "inactive" }> {
  return apiCall("/admin/commercials/" + encodeURIComponent(commercialId) + "/status", {
    method: "PATCH", body: JSON.stringify({ status, contractSignedConfirmed }),
  });
}

export function adminUpdateCommercialDetails(payload: {
  id: string;
  name: string;
  country: string;
  whatsappPhone: string;
}): Promise<{ ok: boolean }> {
  return apiCall("/admin/commercials/" + encodeURIComponent(payload.id), {
    method: "PATCH",
    body: JSON.stringify({
      name: payload.name,
      country: payload.country,
      whatsappPhone: payload.whatsappPhone,
    }),
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

/* ═══════════════════════════════════════════════════════════
 * ADMIN — LEADERBOARD (NOUVEAU)
 * ═══════════════════════════════════════════════════════════ */

export interface LeaderboardRow {
  commercialId: string;
  name: string;
  email: string;
  affiliateCode: string;
  commissionRate: number;
  status: string;
  clientsCount: number;
  salesCount: number;
  totalSales: number;
  totalCommissions: number;
  available: number;
  paidOut: number;
  rank: number;
}

export interface LeaderboardResponse {
  period: string;
  generatedAt: string;
  leaderboard: LeaderboardRow[];
}

export function adminGetLeaderboard(
  period: "today" | "week" | "month" | "year" | "all" = "all"
): Promise<LeaderboardResponse> {
  return apiCall(`/admin/leaderboard?period=${period}`);
  }
