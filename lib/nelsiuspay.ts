/**
 * lib/nelsiuspay.ts
 *
 * Client serveur pour l'API NelsiusPay.
 * Doc officielle : https://nelsiuspay.com/fr/api-doc
 *
 * ⚠️  Ne JAMAIS importer ce fichier côté frontend.
 *     La clé NELSIUSPAY_API_KEY ne doit jamais être exposée au navigateur.
 */

const NELSIUSPAY_BASE = "https://api.nelsiuspay.com/api/v1";

/* ────────────────────────────────────────────────────────────────── */
/* Types                                                              */
/* ────────────────────────────────────────────────────────────────── */

export interface NelsiusCheckoutParams {
  /** Montant dans la devise du fournisseur (XAF) */
  amount: number;
  /** Devise du paiement (XAF) */
  currency: string;
  /** Référence unique Texerra (ex: TEX-NELSIUS-XXXXXXXX) */
  reference: string;
  /** URL de retour après paiement réussi */
  return_url: string;
  /** URL de retour si l'utilisateur annule */
  cancel_url: string;
  /** Email du client */
  customer_email: string;
  /** Téléphone du client */
  customer_phone: string;
  /** Nom du client (optionnel) */
  customer_name?: string;
  /** Description affichée sur la page de paiement */
  description?: string;
}

export interface NelsiusCheckoutResult {
  checkout_url: string;
  payment_id?: string;
  reference: string;
}

export type NelsiusPaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "unknown";

export interface NelsiusPaymentDetails {
  reference: string;
  status: NelsiusPaymentStatus;
  amount: number;
  currency: string;
  provider_transaction_code?: string;
  raw?: unknown;
}

/* ────────────────────────────────────────────────────────────────── */
/* Helpers                                                            */
/* ────────────────────────────────────────────────────────────────── */

function getApiKey(): string {
  const key = process.env.NELSIUSPAY_API_KEY;
  if (!key) {
    throw new Error(
      "NELSIUSPAY_API_KEY manquante. Ajoutez-la dans les variables d'environnement."
    );
  }
  return key;
}

async function nelsiusRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  const { method = "GET", body } = options;

  const res = await fetch(`${NELSIUSPAY_BASE}${path}`, {
    method,
    headers: {
      "X-Api-Key": getApiKey(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    // Ne jamais logger la clé API
    throw new Error(
      `NelsiusPay ${path} a échoué [${res.status}]: ${text}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `NelsiusPay ${path} a renvoyé une réponse non-JSON: ${text}`
    );
  }
}

/* ────────────────────────────────────────────────────────────────── */
/* API publique                                                       */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Crée une session de checkout hébergée NelsiusPay.
 * Le client est redirigé vers `checkout_url`.
 */
export async function createCheckout(
  params: NelsiusCheckoutParams
): Promise<NelsiusCheckoutResult> {
  const payload = {
    amount: params.amount,
    currency: params.currency,
    reference: params.reference,
    return_url: params.return_url,
    cancel_url: params.cancel_url,
    customer_email: params.customer_email,
    customer_phone: params.customer_phone,
    customer_name: params.customer_name ?? undefined,
    description: params.description ?? undefined,
    // Indique que les frais sont à la charge du client
    // (pass_digital_charge: true → le client paie les frais)
    pass_digital_charge: true,
  };

  const res = await nelsiusRequest<{
    data?: {
      checkout_url?: string;
      payment_link?: string;
      id?: string;
      reference?: string;
    };
    checkout_url?: string;
    payment_link?: string;
  }>("/checkout/initiate", {
    method: "POST",
    body: payload,
  });

  const checkoutUrl =
    res.data?.checkout_url ??
    res.data?.payment_link ??
    res.checkout_url ??
    res.payment_link ??
    "";

  if (!checkoutUrl) {
    throw new Error(
      `NelsiusPay n'a renvoyé aucune URL de checkout: ${JSON.stringify(res)}`
    );
  }

  return {
    checkout_url: checkoutUrl,
    payment_id: res.data?.id,
    reference: res.data?.reference ?? params.reference,
  };
}

/**
 * Récupère le statut d'un paiement NelsiusPay par sa référence.
 * Le serveur est la source de vérité.
 */
export async function getPaymentStatus(
  reference: string
): Promise<NelsiusPaymentDetails> {
  const res = await nelsiusRequest<{
    data?: {
      reference?: string;
      status?: string;
      payment_status?: string;
      amount?: number;
      currency?: string;
      transaction_code?: string;
      provider_transaction_code?: string;
    };
    reference?: string;
    status?: string;
    payment_status?: string;
    amount?: number;
    currency?: string;
  }>(`/payments/${encodeURIComponent(reference)}`);

  const d = res.data ?? res;

  const rawStatus = (d as any).status ?? (d as any).payment_status ?? "unknown";

  const status: NelsiusPaymentStatus =
    rawStatus === "completed" || rawStatus === "success" || rawStatus === "paid"
      ? "completed"
      : rawStatus === "failed" ||
        rawStatus === "cancelled" ||
        rawStatus === "declined"
      ? "failed"
      : rawStatus === "pending"
      ? "pending"
      : "unknown";

  return {
    reference: (d as any).reference ?? reference,
    status,
    amount: Number((d as any).amount ?? 0),
    currency: (d as any).currency ?? "XAF",
    provider_transaction_code:
      (d as any).provider_transaction_code ??
      (d as any).transaction_code ??
      undefined,
    raw: res,
  };
}

/* ────────────────────────────────────────────────────────────────── */
/* Constantes de conversion                                          */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Taux de conversion Texerra — centralisés ici.
 * Le frontend utilise les mêmes taux via currencies.ts.
 *
 * EUR → XAF : ×655
 * USD → XAF : ×590
 */
export const NELSIUS_FX_RATES = {
  /** 1 EUR = 655 XAF (taux Texerra, aligné frontend) */
  EUR_TO_XAF: 655,
  /** 1 USD = 590 XAF (taux Texerra, aligné frontend) */
  USD_TO_XAF: 590,
} as const;

/**
 * Convertit un montant EUR ou USD en XAF pour NelsiusPay.
 */
export function convertToXaf(
  amount: number,
  sourceCurrency: "EUR" | "USD"
): number {
  const rate =
    sourceCurrency === "EUR"
      ? NELSIUS_FX_RATES.EUR_TO_XAF
      : NELSIUS_FX_RATES.USD_TO_XAF;
  return Math.round(amount * rate);
}
