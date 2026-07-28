const PAYIN_BASE = "https://api.accountpe.com/api/payin";
const TOKEN_TTL_MS = 25 * 60 * 1000;

interface TokenCache {
  token: string | null;
  expiresAt: number | null;
  inFlightPromise: Promise<string> | null;
}

const cache: TokenCache = {
  token: null,
  expiresAt: null,
  inFlightPromise: null,
};

export function invalidateToken(): void {
  cache.token = null;
  cache.expiresAt = null;
}

export async function getToken(): Promise<string> {
  const now = Date.now();
  if (cache.token && cache.expiresAt && cache.expiresAt > now + 120_000) {
    return cache.token;
  }
  if (cache.inFlightPromise) {
    return cache.inFlightPromise;
  }

  cache.inFlightPromise = (async () => {
    try {
      const res = await fetch(`${PAYIN_BASE}/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: process.env.ACCOUNTPE_USERNAME,
          password: process.env.ACCOUNTPE_PASSWORD,
        }),
      });
      if (!res.ok) throw new Error(`AccountPe auth failed: ${res.status}`);
      const data = (await res.json()) as { token?: string };
      if (!data.token) throw new Error("No token in AccountPe auth response");
      cache.token = data.token;
      cache.expiresAt = Date.now() + TOKEN_TTL_MS;
      return data.token;
    } finally {
      cache.inFlightPromise = null;
    }
  })();

  return cache.inFlightPromise;
}

async function payinRequest<T>(path: string, body: unknown, retried = false): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${PAYIN_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401 && !retried) {
    invalidateToken();
    return payinRequest<T>(path, body, true);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AccountPe ${path} failed [${res.status}]: ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface CreatePaymentLinkParams {
  countryCode: string;
  name: string;
  email: string;
  mobile: string;
  amount: number;
  currency: string;
  transactionId: string;
  description: string;
  callbackUrl: string;
  redirectUrl: string;
}

export interface CreatePaymentLinkResult {
  checkoutUrl: string;
  paymentId: string;
}

export async function createPaymentLink(
  params: CreatePaymentLinkParams
): Promise<CreatePaymentLinkResult> {
  const res = await payinRequest<{ data?: { id?: string; payment_link?: string }; payment_link?: string; checkoutUrl?: string }>(
    "/create_payment_links",
    {
      country_code: params.countryCode,
      name: params.name,
      email: params.email,
      mobile: params.mobile.replace(/\D/g, ""),
      amount: params.amount,
      currency: params.currency,
      transaction_id: params.transactionId,
      description: params.description,
      pass_digital_charge: true,
      callback_url: params.callbackUrl,
      redirect_url: params.redirectUrl,
      return_url: params.redirectUrl,
    }
  );

  const checkoutUrl =
    res.data?.payment_link ??
    (res as { payment_link?: string }).payment_link ??
    (res as { checkoutUrl?: string }).checkoutUrl ??
    "";

  const paymentId = res.data?.id ?? "";

  if (!checkoutUrl) {
    throw new Error(`AccountPe returned no checkout URL: ${JSON.stringify(res)}`);
  }

  return { checkoutUrl, paymentId };
}

export type PaymentStatus = "pending" | "success" | "failed" | "refunded";

/**
 * Vérifie le statut d'un paiement AccountPe.
 * AccountPe peut renvoyer le statut sous de nombreuses formes — on cherche dans toute la réponse.
 */
export async function verifyPayment(transactionId: string): Promise<{ status: PaymentStatus; isPaid: boolean; rawResponse?: unknown }> {
  const res = await payinRequest<Record<string, unknown>>(
    "/payment_link_status",
    { transaction_id: transactionId }
  );

  // Log complet pour débogage
  console.log("[AccountPe verifyPayment] raw response:", JSON.stringify(res));

  // Chercher le statut dans tous les emplacements possibles
  const candidates = [
    (res as any)?.data?.data?.attributes?.status,
    (res as any)?.data?.attributes?.status,
    (res as any)?.data?.status,
    (res as any)?.status,
    (res as any)?.payment_status,
    (res as any)?.transaction_status,
    (res as any)?.state,
  ].filter(v => v !== undefined && v !== null);

  console.log("[AccountPe verifyPayment] status candidates:", candidates);

  const raw = candidates[0] ?? "unknown";

  // Normaliser en PaymentStatus — source: guide AccountPe/SwyChr officiel
  function normalize(v: unknown): PaymentStatus {
    // Succès
    if (
      v === 1 || v === "1" ||
      v === "success"    || v === "SUCCESS"    ||
      v === "successful" || v === "SUCCESSFUL" ||
      v === "paid"       || v === "PAID"       ||
      v === "completed"  || v === "COMPLETED"  ||
      v === "approved"   || v === "APPROVED"
    ) return "success";
    // Échec / expiré (3 = expired, 5 et 6 = autres erreurs selon le guide)
    if (
      v === 2 || v === "2" ||
      v === 3 || v === "3" ||
      v === 5 || v === "5" ||
      v === 6 || v === "6" ||
      v === "failed"   || v === "FAILED"   ||
      v === "expired"  || v === "EXPIRED"  ||
      v === "declined" || v === "DECLINED" ||
      v === "rejected" || v === "REJECTED" ||
      v === "cancelled"|| v === "CANCELLED"
    ) return "failed";
    if (v === "refunded" || v === "REFUNDED") return "refunded";
    return "pending";
  }

  const status = normalize(raw);
  const isPaid = status === "success";

  console.log(`[AccountPe verifyPayment] txId=${transactionId} raw=${JSON.stringify(raw)} → status=${status} isPaid=${isPaid}`);

  return { status, isPaid, rawResponse: res };
}
