import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth-context";
import { downloadAdminFullDataPdf } from "../lib/admin-report";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ────────────────────────────────────────────────────────────────── */
/* Constantes                                                         */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Taux de secours utilisé uniquement pour les commandes qui n'ont
 * réellement aucun champ de marge (marginNum / margin) en base.
 */
const MARGIN_RATE_FALLBACK = 0.65;
const EUR_TO_XAF = 655.96;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

/* ────────────────────────────────────────────────────────────────── */
/* Résolution des pays                                                */
/* ────────────────────────────────────────────────────────────────── */

type CountryInfo = { name: string; flag: string; iso: string };

const PHONE_PREFIX_MAP: Array<{ prefix: string; info: CountryInfo }> = [
  { prefix: "237", info: { name: "Cameroun", flag: "🇨🇲", iso: "CM" } },
  { prefix: "225", info: { name: "Côte d'Ivoire", flag: "🇨🇮", iso: "CI" } },
  { prefix: "221", info: { name: "Sénégal", flag: "🇸🇳", iso: "SN" } },
  { prefix: "234", info: { name: "Nigéria", flag: "🇳🇬", iso: "NG" } },
  { prefix: "233", info: { name: "Ghana", flag: "🇬🇭", iso: "GH" } },
  { prefix: "229", info: { name: "Bénin", flag: "🇧🇯", iso: "BJ" } },
  { prefix: "226", info: { name: "Burkina Faso", flag: "🇧🇫", iso: "BF" } },
  { prefix: "223", info: { name: "Mali", flag: "🇲🇱", iso: "ML" } },
  { prefix: "228", info: { name: "Togo", flag: "🇹🇬", iso: "TG" } },
  { prefix: "227", info: { name: "Niger", flag: "🇳🇪", iso: "NE" } },
  { prefix: "224", info: { name: "Guinée", flag: "🇬🇳", iso: "GN" } },
  { prefix: "241", info: { name: "Gabon", flag: "🇬🇦", iso: "GA" } },
  { prefix: "235", info: { name: "Tchad", flag: "🇹🇩", iso: "TD" } },
  { prefix: "242", info: { name: "Congo", flag: "🇨🇬", iso: "CG" } },
  { prefix: "243", info: { name: "RD Congo", flag: "🇨🇩", iso: "CD" } },
  { prefix: "254", info: { name: "Kenya", flag: "🇰🇪", iso: "KE" } },
  { prefix: "255", info: { name: "Tanzanie", flag: "🇹🇿", iso: "TZ" } },
  { prefix: "256", info: { name: "Ouganda", flag: "🇺🇬", iso: "UG" } },
  { prefix: "250", info: { name: "Rwanda", flag: "🇷🇼", iso: "RW" } },
  { prefix: "212", info: { name: "Maroc", flag: "🇲🇦", iso: "MA" } },
  { prefix: "213", info: { name: "Algérie", flag: "🇩🇿", iso: "DZ" } },
  { prefix: "216", info: { name: "Tunisie", flag: "🇹🇳", iso: "TN" } },
  { prefix: "218", info: { name: "Libye", flag: "🇱🇾", iso: "LY" } },
  { prefix: "220", info: { name: "Gambie", flag: "🇬🇲", iso: "GM" } },
  { prefix: "231", info: { name: "Liberia", flag: "🇱🇷", iso: "LR" } },
  { prefix: "232", info: { name: "Sierra Leone", flag: "🇸🇱", iso: "SL" } },
  { prefix: "240", info: { name: "Guinée équatoriale", flag: "🇬🇶", iso: "GQ" } },
  { prefix: "245", info: { name: "Guinée-Bissau", flag: "🇬🇼", iso: "GW" } },
  { prefix: "251", info: { name: "Éthiopie", flag: "🇪🇹", iso: "ET" } },
  { prefix: "257", info: { name: "Burundi", flag: "🇧🇮", iso: "BI" } },
  { prefix: "258", info: { name: "Mozambique", flag: "🇲🇿", iso: "MZ" } },
  { prefix: "261", info: { name: "Madagascar", flag: "🇲🇬", iso: "MG" } },
  { prefix: "263", info: { name: "Zimbabwe", flag: "🇿🇼", iso: "ZW" } },
  { prefix: "264", info: { name: "Namibie", flag: "🇳🇦", iso: "NA" } },
  { prefix: "265", info: { name: "Malawi", flag: "🇲🇼", iso: "MW" } },
  { prefix: "267", info: { name: "Botswana", flag: "🇧🇼", iso: "BW" } },
  { prefix: "591", info: { name: "Bolivie", flag: "🇧🇴", iso: "BO" } },
  { prefix: "593", info: { name: "Équateur", flag: "🇪🇨", iso: "EC" } },
  { prefix: "595", info: { name: "Paraguay", flag: "🇵🇾", iso: "PY" } },
  { prefix: "598", info: { name: "Uruguay", flag: "🇺🇾", iso: "UY" } },
  { prefix: "20", info: { name: "Égypte", flag: "🇪🇬", iso: "EG" } },
  { prefix: "27", info: { name: "Afrique du Sud", flag: "🇿🇦", iso: "ZA" } },
  { prefix: "971", info: { name: "Émirats arabes unis", flag: "🇦🇪", iso: "AE" } },
  { prefix: "966", info: { name: "Arabie saoudite", flag: "🇸🇦", iso: "SA" } },
  { prefix: "972", info: { name: "Israël", flag: "🇮🇱", iso: "IL" } },
  { prefix: "90", info: { name: "Turquie", flag: "🇹🇷", iso: "TR" } },
  { prefix: "86", info: { name: "Chine", flag: "🇨🇳", iso: "CN" } },
  { prefix: "91", info: { name: "Inde", flag: "🇮🇳", iso: "IN" } },
  { prefix: "92", info: { name: "Pakistan", flag: "🇵🇰", iso: "PK" } },
  { prefix: "93", info: { name: "Afghanistan", flag: "🇦🇫", iso: "AF" } },
  { prefix: "94", info: { name: "Sri Lanka", flag: "🇱🇰", iso: "LK" } },
  { prefix: "95", info: { name: "Myanmar", flag: "🇲🇲", iso: "MM" } },
  { prefix: "98", info: { name: "Iran", flag: "🇮🇷", iso: "IR" } },
  { prefix: "60", info: { name: "Malaisie", flag: "🇲🇾", iso: "MY" } },
  { prefix: "61", info: { name: "Australie", flag: "🇦🇺", iso: "AU" } },
  { prefix: "62", info: { name: "Indonésie", flag: "🇮🇩", iso: "ID" } },
  { prefix: "63", info: { name: "Philippines", flag: "🇵🇭", iso: "PH" } },
  { prefix: "64", info: { name: "Nouvelle-Zélande", flag: "🇳🇿", iso: "NZ" } },
  { prefix: "65", info: { name: "Singapour", flag: "🇸🇬", iso: "SG" } },
  { prefix: "66", info: { name: "Thaïlande", flag: "🇹🇭", iso: "TH" } },
  { prefix: "81", info: { name: "Japon", flag: "🇯🇵", iso: "JP" } },
  { prefix: "82", info: { name: "Corée du Sud", flag: "🇰🇷", iso: "KR" } },
  { prefix: "84", info: { name: "Viêt Nam", flag: "🇻🇳", iso: "VN" } },
  { prefix: "51", info: { name: "Pérou", flag: "🇵🇪", iso: "PE" } },
  { prefix: "52", info: { name: "Mexique", flag: "🇲🇽", iso: "MX" } },
  { prefix: "54", info: { name: "Argentine", flag: "🇦🇷", iso: "AR" } },
  { prefix: "55", info: { name: "Brésil", flag: "🇧🇷", iso: "BR" } },
  { prefix: "56", info: { name: "Chili", flag: "🇨🇱", iso: "CL" } },
  { prefix: "57", info: { name: "Colombie", flag: "🇨🇴", iso: "CO" } },
  { prefix: "58", info: { name: "Venezuela", flag: "🇻🇪", iso: "VE" } },
  { prefix: "30", info: { name: "Grèce", flag: "🇬🇷", iso: "GR" } },
  { prefix: "31", info: { name: "Pays-Bas", flag: "🇳🇱", iso: "NL" } },
  { prefix: "32", info: { name: "Belgique", flag: "🇧🇪", iso: "BE" } },
  { prefix: "33", info: { name: "France", flag: "🇫🇷", iso: "FR" } },
  { prefix: "34", info: { name: "Espagne", flag: "🇪🇸", iso: "ES" } },
  { prefix: "36", info: { name: "Hongrie", flag: "🇭🇺", iso: "HU" } },
  { prefix: "39", info: { name: "Italie", flag: "🇮🇹", iso: "IT" } },
  { prefix: "40", info: { name: "Roumanie", flag: "🇷🇴", iso: "RO" } },
  { prefix: "41", info: { name: "Suisse", flag: "🇨🇭", iso: "CH" } },
  { prefix: "43", info: { name: "Autriche", flag: "🇦🇹", iso: "AT" } },
  { prefix: "44", info: { name: "Royaume-Uni", flag: "🇬🇧", iso: "GB" } },
  { prefix: "45", info: { name: "Danemark", flag: "🇩🇰", iso: "DK" } },
  { prefix: "46", info: { name: "Suède", flag: "🇸🇪", iso: "SE" } },
  { prefix: "47", info: { name: "Norvège", flag: "🇳🇴", iso: "NO" } },
  { prefix: "48", info: { name: "Pologne", flag: "🇵🇱", iso: "PL" } },
  { prefix: "49", info: { name: "Allemagne", flag: "🇩🇪", iso: "DE" } },
  { prefix: "351", info: { name: "Portugal", flag: "🇵🇹", iso: "PT" } },
  { prefix: "353", info: { name: "Irlande", flag: "🇮🇪", iso: "IE" } },
  { prefix: "380", info: { name: "Ukraine", flag: "🇺🇦", iso: "UA" } },
  { prefix: "7", info: { name: "Russie / Kazakhstan", flag: "🇷🇺", iso: "RU" } },
  { prefix: "1", info: { name: "États-Unis / Canada", flag: "🇺🇸", iso: "US" } },
];

PHONE_PREFIX_MAP.sort((a, b) => b.prefix.length - a.prefix.length);

const ISO_TO_COUNTRY = new Map<string, CountryInfo>();
for (const e of PHONE_PREFIX_MAP) {
  if (e.info.iso && !ISO_TO_COUNTRY.has(e.info.iso)) {
    ISO_TO_COUNTRY.set(e.info.iso, e.info);
  }
}

function resolveCountry(
  phone: string | undefined,
  code: string | number | undefined
): CountryInfo {
  if (phone) {
    const clean = String(phone).replace(/\D/g, "");
    for (const entry of PHONE_PREFIX_MAP) {
      if (clean.startsWith(entry.prefix)) return entry.info;
    }
  }
  if (typeof code === "string") {
    if (/^[A-Za-z]{2}$/.test(code)) {
      const upper = code.toUpperCase();
      const c = ISO_TO_COUNTRY.get(upper);
      if (c) return c;
    }
  }
  return { name: `Code ${code ?? "?"}`, flag: "🌍", iso: "" };
}

function countryFromIso(iso?: string | null): CountryInfo | null {
  if (!iso) return null;
  return ISO_TO_COUNTRY.get(String(iso).toUpperCase()) ?? null;
}

/* ────────────────────────────────────────────────────────────────── */
/* Utilitaires                                                        */
/* ────────────────────────────────────────────────────────────────── */

type Period =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "week"
  | "month"
  | "year"
  | "all"
  | "custom";

function getDateRange(period: Period, customStart?: string, customEnd?: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "7d":
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case "week": {
      const day = now.getDay() || 7;
      start.setDate(now.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "year":
      start.setMonth(0, 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "all":
      start.setFullYear(2000, 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "custom":
      if (customStart) start.setTime(new Date(customStart).getTime());
      if (customEnd) end.setTime(new Date(customEnd).getTime());
      end.setHours(23, 59, 59, 999);
      break;
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function apiFetch<T = any>(path: string, token: string): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${msg || "Erreur inconnue"}`);
  }
  return res.json();
}

async function apiPost<T = any>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `API ${res.status}`);
  return data as T;
}

async function downloadBlob(path: string, filename: string, token: string) {
  const res = await fetch(`/api/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Export échoué (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openPdfPrint(
  title: string,
  summary: string[],
  columns: string[],
  rows: (string | number | null | undefined)[][]
) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Autorisez les pop-ups pour exporter en PDF.");
    return;
  }
  const esc = (s: unknown) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
    );
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px;color:#111;margin:0}
h1{font-size:20px;margin:0 0 4px}
.summary{display:flex;gap:16px;flex-wrap:wrap;margin:8px 0 16px;font-size:13px}
.summary span{background:#f4f4f5;padding:4px 10px;border-radius:6px}
.summary span b{color:#111}
p.meta{color:#666;font-size:12px;margin:0 0 16px}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f4f4f5;font-weight:600;text-transform:uppercase;letter-spacing:.03em;font-size:10px}
tr:nth-child(even) td{background:#fafafa}
@media print{@page{size:A4 landscape;margin:10mm}body{padding:0}h1{font-size:16px}}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="summary">${summary.map((s) => `<span>${s}</span>`).join("")}</div>
<p class="meta">TEXERRA SMS — Généré le ${new Date().toLocaleString("fr-FR")}</p>
<table>
<thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
<tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>
</table>
<script>setTimeout(function(){window.print()},300);</script>
</body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function toCfa(eur: number): string {
  return `${Math.round(eur * EUR_TO_XAF).toLocaleString("fr-FR")} F`;
}

function cleanForWa(phone: string): string {
  return String(phone).replace(/\D/g, "");
}

function isWhatsAppService(serviceCode: string): boolean {
  const s = (serviceCode || "").toLowerCase();
  return s === "wa" || s === "wb";
}

function firstName(name: string | undefined | null): string {
  if (!name) return "cher client";
  const trimmed = name.trim();
  if (!trimmed) return "cher client";
  return trimmed.split(/\s+/)[0];
}

/* ────────────────────────────────────────────────────────────────── */
/* Modèles de messages WhatsApp / Email                               */
/* ────────────────────────────────────────────────────────────────── */

type UserContactProfile = {
  createdAt?: string | null;
  lastSignInAt?: string | null;
  lastOrderAt?: string | null;
  completedOrders?: number;
  totalOrders?: number;
};

type MessageContext =
  | {
      kind: "order";
      date: string;
      id: string;
      status: string;
      service: string;
      country: string;
      number: string;
      amount: number;
    }
  | {
      kind: "topup";
      date: string;
      id: string;
      status: string;
      amount: number;
      country: string;
      currency?: string;
      localAmount?: number | null;
      reference?: string;
      provider?: string;
    };

type MessageTemplate = {
  id: string;
  group: "general" | "order" | "topup";
  label: string;
  preview: string;
  whatsappBody: (name: string, profile?: UserContactProfile, context?: MessageContext) => string;
  emailSubject: (name: string, profile?: UserContactProfile, context?: MessageContext) => string;
  emailBody: (name: string, profile?: UserContactProfile, context?: MessageContext) => string;
};

function formatContactDate(value?: string | null): string {
  if (!value) return "information non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "information non disponible";
  return date.toLocaleString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function contactProfileFacts(profile?: UserContactProfile): string {
  if (!profile) return "";
  const signup = profile.createdAt
    ? `Votre compte Texerra a été créé le ${formatContactDate(profile.createdAt)}.`
    : "La date de création de votre compte n’est pas disponible dans notre historique.";
  const activity = profile.lastSignInAt
    ? `La dernière connexion enregistrée sur votre compte date du ${formatContactDate(profile.lastSignInAt)}.`
    : profile.lastOrderAt
      ? `Nous ne disposons pas d’une heure de dernière connexion fiable ; votre dernière activité enregistrée est une commande du ${formatContactDate(profile.lastOrderAt)}.`
      : "Nous ne disposons pas d’une date de dernière connexion suffisamment fiable pour vous l’indiquer.";
  const count = Number.isFinite(profile.completedOrders)
    ? `Vous avez déjà réalisé ${profile.completedOrders ?? 0} commande(s) réussie(s) sur ${profile.totalOrders ?? 0} commande(s) enregistrée(s) sur la plateforme.`
    : "Nous suivons votre historique afin de mieux vous accompagner.";
  return `${signup}\n${activity}\n${count}`;
}

function contextStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: "réussi", success: "réussi", successful: "réussi", succeeded: "réussi",
    active: "actif", pending: "en attente", pending_payment: "en attente de paiement",
    failed: "échoué", error: "échoué", cancelled: "annulé", expired: "expiré", rejected: "refusé",
  };
  return labels[String(status || "").toLowerCase()] || status || "non précisé";
}

function messageContextFacts(context?: MessageContext): string {
  if (!context) return "";
  if (context.kind === "order") {
    return `Commande : ${context.id}\nDate : ${formatContactDate(context.date)}\nService choisi : ${context.service || "non précisé"}\nPays du numéro : ${context.country || "non précisé"}\nNuméro acheté : ${context.number || "non renseigné"}\nMontant : ${Number(context.amount || 0).toFixed(2)} €\nÉtat enregistré : ${contextStatusLabel(context.status)}`;
  }
  const local = context.localAmount != null && context.currency
    ? `\nMontant indiqué par le moyen de paiement : ${context.localAmount} ${context.currency}`
    : "";
  return `Dépôt : ${context.id}\nDate : ${formatContactDate(context.date)}\nMontant : ${Number(context.amount || 0).toFixed(2)} €${local}\nPays : ${context.country || "non renseigné"}\nMoyen de paiement : ${context.provider || "non précisé"}\nStatut enregistré : ${contextStatusLabel(context.status)}${context.reference ? `\nRéférence : ${context.reference}` : ""}`;
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "relance", group: "general", label: "Prendre de vos nouvelles et vous inviter à revenir",
    preview: "Un message personnalisé qui reprend votre inscription, votre activité et votre historique de commandes.",
    whatsappBody: (name, profile) => `Bonjour ${name},\n\nNous espérons sincèrement que vous allez bien. Nous souhaitions prendre de vos nouvelles, car cela fait quelque temps que nous ne vous avons pas vu utiliser Texerra.\n\n${contactProfileFacts(profile)}\n\nNous avons apprécié vous compter parmi nos utilisateurs et aimerions savoir si tout se passe bien de votre côté. Avez-vous rencontré une difficulté, un service indisponible ou un problème lors d’une commande ou d’un dépôt ?\n\nVotre retour nous aidera à vous apporter une réponse utile. Vous pouvez nous répondre ici ou reprendre vos activités depuis https://www.texerra.site/dashboard.`,
    emailSubject: () => "Nous souhaitions prendre de vos nouvelles — Texerra SMS",
    emailBody: (name, profile) => `Nous espérons que vous allez bien. Nous prenons un moment pour vous écrire parce que votre présence sur Texerra compte pour nous. Nous avons apprécié vous accueillir sur notre plateforme et nous aimerions savoir comment se passe votre expérience aujourd’hui.\n\n${contactProfileFacts(profile)}\n\nNous ne souhaitons pas vous envoyer une simple relance automatique. Nous aimerions surtout comprendre si quelque chose vous a empêché de revenir : un code SMS non reçu, un service qui n’a pas répondu à vos attentes, une recharge difficile à effectuer, un moyen de paiement ou tout autre point que nous pourrions améliorer.\n\nVous pouvez nous répondre directement à cet e-mail en expliquant librement ce qui s’est passé. Notre équipe prendra le temps d’examiner votre retour et de vous accompagner.\n\nPour retrouver vos informations et reprendre votre activité, ouvrez votre tableau de bord Texerra. Nous serons heureux de vous retrouver.`,
  },
  {
    id: "retour", group: "general", label: "Invitation à revenir découvrir Texerra",
    preview: "Une invitation chaleureuse à reprendre ses commandes sans pression commerciale.",
    whatsappBody: (name, profile) => `Bonjour ${name},\n\nNous voulions simplement vous rappeler que votre espace Texerra est toujours disponible.\n\n${contactProfileFacts(profile)}\n\nVous pouvez retrouver les services et les pays disponibles, consulter votre solde et passer une nouvelle commande quand vous en aurez besoin. Si vous souhaitez être conseillé avant de commander, dites-le-nous : nous vous aiderons à choisir.\n\nAccédez à votre espace : https://www.texerra.site/dashboard.`,
    emailSubject: () => "Votre espace Texerra est prêt lorsque vous en avez besoin",
    emailBody: (name, profile) => `Nous sommes heureux de vous compter parmi les personnes qui ont déjà choisi Texerra SMS. Nous vous écrivons pour vous rappeler que votre espace reste accessible et que vous pouvez reprendre vos activités au moment qui vous convient.\n\n${contactProfileFacts(profile)}\n\nVous pouvez consulter les services disponibles, choisir le pays adapté à votre besoin, vérifier votre solde et retrouver vos anciennes commandes directement depuis votre tableau de bord. Si vous hésitez sur le service ou le pays à sélectionner, répondez à cet e-mail : nous pouvons vous orienter avant votre prochain achat.\n\nNous préférons vous proposer une aide utile plutôt que vous pousser à commander sans connaître votre besoin. Votre confiance mérite cette attention.`,
  },
  {
    id: "encouragement", group: "general", label: "Encouragement et reconnaissance personnalisés",
    preview: "Remercie le client avec son nombre de commandes réussies, sa date d’inscription et sa dernière activité.",
    whatsappBody: (name, profile) => `Bonjour ${name},\n\nNous tenions à vous adresser un vrai merci pour la confiance que vous accordez à Texerra SMS. Votre présence et chacune de vos commandes comptent pour notre équipe.\n\n${contactProfileFacts(profile)}\n\nNous apprécions le fait que vous ayez choisi notre plateforme pour vos besoins de vérification. Nous souhaitons continuer à mériter cette confiance et rendre vos prochaines utilisations aussi simples que possible.\n\nComment se passe votre expérience actuellement ? Y a-t-il une amélioration ou une assistance qui vous serait utile ? Vous pouvez nous répondre directement.`,
    emailSubject: (name) => `Merci pour votre confiance, ${name} — Texerra SMS`,
    emailBody: (name, profile) => `Nous souhaitions prendre le temps de vous remercier personnellement pour la confiance que vous avez accordée à Texerra SMS. Vous avez choisi notre plateforme, vous avez créé votre espace et vous avez déjà pris le temps d’utiliser nos services. Nous ne considérons pas cela comme acquis.\n\n${contactProfileFacts(profile)}\n\nChaque commande réussie représente pour nous bien plus qu’une opération : c’est une personne qui a choisi de nous faire confiance pour un besoin concret. Nous sommes reconnaissants de vous avoir accompagné jusque-là et nous voulons continuer à vous offrir un service fiable, des informations claires et une assistance attentive lorsque vous en avez besoin.\n\nNous aimerions également savoir si tout se passe bien pour vous. Votre expérience est-elle satisfaisante ? Avez-vous rencontré une difficulté que nous devrions connaître ? Même une remarque simple peut nous aider à améliorer la plateforme.\n\nMerci de faire partie de l’aventure Texerra. Nous serons heureux de vous retrouver pour votre prochaine utilisation.`,
  },
  {
    id: "support", group: "general", label: "Prise de nouvelles et proposition d’assistance",
    preview: "Vérifier qu’aucun problème ne bloque le client et proposer une aide concrète.",
    whatsappBody: (name, profile) => `Bonjour ${name},\n\nNous espérons que tout va bien. Nous aimerions vérifier que votre utilisation de Texerra se déroule correctement.\n\n${contactProfileFacts(profile)}\n\nAvez-vous rencontré un problème avec un numéro, la réception d’un SMS, une commande ou un dépôt ? Dites-nous simplement ce qui vous bloque. Nous regarderons votre situation et vous indiquerons les prochaines étapes.`,
    emailSubject: () => "Texerra SMS — pouvons-nous vous aider sur un point précis ?",
    emailBody: (name, profile) => `Nous vous contactons afin de nous assurer que votre expérience sur Texerra se déroule dans de bonnes conditions. Nous savons qu’un problème ponctuel — un SMS qui tarde, une commande qui n’aboutit pas ou une recharge dont le statut semble incertain — peut être frustrant.\n\n${contactProfileFacts(profile)}\n\nSi vous avez rencontré l’une de ces situations, ou toute autre difficulté, répondez à ce message en nous donnant quelques détails. Nous pourrons alors vérifier les informations utiles et vous proposer une solution adaptée au lieu de vous laisser chercher seul.\n\nMême si tout fonctionne correctement, un simple retour de votre part nous fera plaisir. Votre satisfaction reste importante pour nous.`,
  },
  {
    id: "satisfaction", group: "general", label: "Demander un avis sur l’expérience",
    preview: "Une demande d’avis sincère avec invitation à signaler les améliorations attendues.",
    whatsappBody: (name, profile) => `Bonjour ${name},\n\nVotre avis nous intéresse réellement.\n\n${contactProfileFacts(profile)}\n\nComment évaluez-vous votre expérience sur Texerra ? Qu’est-ce qui vous a plu et que devrions-nous améliorer ? Vous pouvez nous répondre librement, même si votre remarque concerne un détail. Nous lisons les retours de nos utilisateurs pour faire évoluer le service.`,
    emailSubject: () => "Votre expérience nous intéresse — Texerra SMS",
    emailBody: (name, profile) => `Nous aimerions recueillir votre avis sur votre expérience avec Texerra SMS. Nous savons que chaque utilisateur a des besoins différents et que la meilleure façon de progresser est d’écouter les personnes qui utilisent réellement la plateforme.\n\n${contactProfileFacts(profile)}\n\nQu’est-ce qui vous a donné satisfaction ? À l’inverse, y a-t-il une étape qui vous a semblé compliquée, un service que vous n’avez pas trouvé ou une information qui vous a manqué ? Vous pouvez nous faire part de vos observations sans avoir à suivre un questionnaire.\n\nNous vous remercions par avance de prendre quelques instants pour nous répondre. Votre avis sera pris en considération par notre équipe.`,
  },
  {
    id: "commercial", group: "general", label: "Invitation à devenir partenaire commercial",
    preview: "Présenter clairement le programme d’affiliation et proposer un accompagnement.",
    whatsappBody: (name, profile) => `Bonjour ${name},\n\nNous vous remercions d’avoir choisi Texerra SMS. Nous aimerions vous présenter une possibilité de collaboration qui pourrait vous intéresser.\n\n${contactProfileFacts(profile)}\n\nVous pouvez recommander nos services à votre entourage ou à votre communauté grâce à un lien personnel. Pour chaque commande éligible réalisée par un client attribué, vous percevez 50 % de la marge générée par cette commande, selon les conditions du programme. Il ne s’agit pas d’un salaire fixe : votre rémunération dépend des ventes réalisées.\n\nSi vous souhaitez en savoir plus, répondez à ce message. Nous pouvons vous expliquer le fonctionnement, vous aider à démarrer et vous accompagner dans votre prospection.`,
    emailSubject: () => "Une possibilité de collaboration avec Texerra SMS",
    emailBody: (name, profile) => `Nous souhaitons vous proposer une possibilité de collaboration au sein du programme commercial de Texerra SMS. Cette invitation s’adresse aux personnes qui connaissent déjà nos services et qui pourraient les faire découvrir à de nouveaux utilisateurs.\n\n${contactProfileFacts(profile)}\n\nLe principe est simple : vous partagez votre lien de recommandation et les clients qui s’inscrivent et réalisent des commandes éligibles vous sont attribués. Vous percevez alors 50 % de la marge générée par chaque commande attribuée, conformément aux règles du programme. Il ne s’agit pas d’un salaire fixe ni d’une commission calculée sur le chiffre d’affaires brut.\n\nSi cette collaboration vous intéresse, répondez à cet e-mail. Nous pourrons vous présenter l’espace commercial, les outils mis à votre disposition et des méthodes concrètes pour trouver vos premiers clients. Vous pouvez également nous dire quels moyens ou supports vous aideraient à démarrer.`,
  },
  {
    id: "fidelisation", group: "general", label: "Remerciement pour la fidélité",
    preview: "Reconnaître la relation dans la durée et rester disponible pour le client.",
    whatsappBody: (name, profile) => `Bonjour ${name},\n\nNous souhaitions vous remercier pour la place que Texerra occupe dans vos habitudes.\n\n${contactProfileFacts(profile)}\n\nVotre fidélité nous encourage à continuer d’améliorer la qualité de nos services. Si vous avez une suggestion ou un besoin particulier, nous serions heureux de vous écouter. Merci de nous avoir fait confiance.`,
    emailSubject: () => "Nous vous remercions de votre fidélité — Texerra SMS",
    emailBody: (name, profile) => `Nous tenions à vous remercier pour la confiance que vous continuez à accorder à Texerra SMS. Une relation avec un utilisateur ne se résume pas au nombre de commandes : elle se construit aussi par la confiance, les retours et la possibilité de vous accompagner lorsque vous en avez besoin.\n\n${contactProfileFacts(profile)}\n\nNous souhaitons garder cette relation dans la durée et continuer à améliorer notre service. Si vous avez une suggestion, une attente particulière ou une difficulté que nous n’avons pas encore résolue, nous vous invitons à nous en parler. Nous prendrons le temps de vous répondre.\n\nMerci de faire confiance à Texerra.`,
  },
  {
    id: "remerciement", group: "general", label: "Remerciement après une interaction",
    preview: "Remercier chaleureusement et inviter à faire part de toute difficulté.",
    whatsappBody: (name, profile) => `Bonjour ${name},\n\nUn grand merci d’avoir choisi Texerra SMS. Nous apprécions sincèrement la confiance que vous nous accordez.\n\n${contactProfileFacts(profile)}\n\nNous espérons que notre service répond à vos attentes. Si un point mérite notre attention, n’hésitez pas à nous le signaler. Nous serons heureux de vous accompagner lors de vos prochaines utilisations.`,
    emailSubject: () => "Merci d’avoir choisi Texerra SMS",
    emailBody: (name, profile) => `Nous souhaitions vous remercier sincèrement d’avoir choisi Texerra SMS. Nous savons que vous avez plusieurs possibilités et nous apprécions que vous ayez décidé de nous confier vos besoins de vérification par SMS.\n\n${contactProfileFacts(profile)}\n\nNotre objectif est de vous proposer une expérience claire, pratique et accompagnée. Si vous avez une remarque sur une commande, une recharge, le choix d’un pays ou la disponibilité d’un service, vous pouvez nous écrire en réponse à cet e-mail.\n\nMerci encore pour votre confiance. Nous serons heureux de vous retrouver sur votre espace Texerra.`,
  },
  {
    id: "order_feedback", group: "order", label: "Suivi personnalisé d’une commande",
    preview: "Reprendre les détails exacts de la commande et demander si tout s’est bien passé.",
    whatsappBody: (name, _profile, context) => `Bonjour ${name},\n\nNous revenons vers vous au sujet de cette commande effectuée sur Texerra :\n\n${messageContextFacts(context)}\n\nNous aimerions savoir si tout s’est bien passé pour vous. Avez-vous pu utiliser le numéro dans l’application concernée ? Avez-vous reçu le SMS attendu ou rencontré une difficulté ?\n\nVotre retour nous permettra de vérifier ce qui doit l’être et de mieux vous accompagner.`,
    emailSubject: (_name, _profile, context) => `Suivi de votre commande Texerra${context?.kind === "order" ? ` du ${formatContactDate(context.date).split(" à ")[0]}` : ""}`,
    emailBody: (name, _profile, context) => `Nous vous écrivons au sujet d’une commande précise enregistrée sur votre compte Texerra. Nous aimerions simplement vérifier que le service a répondu à votre besoin et que vous avez pu utiliser le numéro sans difficulté.\n\n${messageContextFacts(context)}\n\nTout s’est-il bien déroulé après l’achat ? Avez-vous reçu le code SMS attendu et pu l’utiliser dans l’application choisie ? Si le numéro n’a pas fonctionné comme prévu, si le code n’est pas arrivé ou si vous avez rencontré une autre difficulté, merci de nous expliquer ce qui s’est passé.\n\nNous ne voulons pas supposer que tout s’est bien passé : votre réponse nous aidera à comprendre la situation de cette commande et à vous proposer une aide adaptée. Vous pouvez répondre directement à cet e-mail en rappelant les détails ci-dessus.`,
  },
  {
    id: "order_problem", group: "order", label: "Vérifier un problème sur la commande",
    preview: "Demander des précisions sur une commande avec statut non abouti ou incertain.",
    whatsappBody: (name, _profile, context) => `Bonjour ${name},\n\nNous souhaitons faire le point avec vous sur cette commande :\n\n${messageContextFacts(context)}\n\nPouvez-vous nous dire ce qui s’est passé de votre côté ? Le numéro a-t-il été délivré, le code a-t-il été reçu, ou l’application a-t-elle refusé la vérification ? Nous allons examiner votre retour.`,
    emailSubject: () => "Besoin de votre retour concernant une commande Texerra",
    emailBody: (name, _profile, context) => `Nous avons souhaité revenir vers vous au sujet de la commande ci-dessous afin de vérifier que vous n’êtes pas resté avec une difficulté non résolue.\n\n${messageContextFacts(context)}\n\nPouvez-vous nous expliquer ce qui s’est passé après cette commande ? Le numéro était-il accessible ? Le SMS est-il arrivé ? Avez-vous rencontré un refus de la part de l’application ou un autre message d’erreur ?\n\nNous vous remercions de nous donner autant de détails que possible, sans partager votre mot de passe ni d’autres informations confidentielles. Notre équipe pourra ainsi examiner l’opération et vous indiquer la marche à suivre.`,
  },
  {
    id: "topup_success", group: "topup", label: "Féliciter après un dépôt réussi",
    preview: "Confirmer les informations du dépôt et inviter à passer une commande.",
    whatsappBody: (name, _profile, context) => `Bonjour ${name},\n\nNous vous confirmons que votre dépôt apparaît comme réussi sur Texerra.\n\n${messageContextFacts(context)}\n\nMerci pour votre confiance. Votre solde est disponible pour vos prochaines commandes. Vous pouvez maintenant choisir un service et le pays correspondant à votre besoin. Si vous souhaitez un conseil, notre équipe reste disponible.`,
    emailSubject: () => "Votre dépôt est confirmé sur Texerra — merci pour votre confiance",
    emailBody: (name, _profile, context) => `Nous sommes heureux de vous confirmer que le dépôt repris ci-dessous apparaît comme réussi dans notre système. Merci d’avoir choisi Texerra pour effectuer cette opération.\n\n${messageContextFacts(context)}\n\nVous pouvez retrouver cette opération dans l’historique de votre espace et utiliser votre solde pour passer une commande. Plusieurs services et pays sont proposés sur la plateforme ; prenez le temps de sélectionner ceux qui correspondent à votre besoin.\n\nSi le montant affiché ne correspond pas à ce que vous attendiez, ou si vous avez la moindre question concernant cette recharge, répondez à cet e-mail afin que nous puissions vérifier avec vous.`,
  },
  {
    id: "topup_pending", group: "topup", label: "Vérifier un dépôt encore en attente",
    preview: "Demander si le client a été débité et lui expliquer le bouton Vérifier.",
    whatsappBody: (name, _profile, context) => `Bonjour ${name},\n\nNous faisons le point sur votre dépôt qui apparaît actuellement en attente.\n\n${messageContextFacts(context)}\n\nPouvez-vous nous confirmer si votre compte Mobile Money ou votre carte a bien été débité ? Vous pouvez aussi ouvrir votre tableau de bord, consulter l’historique des dépôts puis cliquer sur « Vérifier » sur la ligne concernée pour actualiser son statut. Si vous avez déjà été débité, ne relancez pas un paiement avant vérification : répondez-nous et nous allons vous accompagner.`,
    emailSubject: () => "Votre dépôt est toujours en attente : vérifions ensemble",
    emailBody: (name, _profile, context) => `Nous vous contactons au sujet du dépôt ci-dessous, qui apparaît encore avec le statut « en attente » dans notre système. Nous souhaitons nous assurer que votre paiement s’est déroulé correctement et éviter que vous soyez obligé de recommencer inutilement.\n\n${messageContextFacts(context)}\n\nPouvez-vous nous confirmer si votre compte Mobile Money ou votre carte bancaire a bien été débité pour cette opération ?\n\nVous pouvez également ouvrir votre tableau de bord Texerra, accéder à l’historique des dépôts et cliquer sur le bouton « Vérifier » de la ligne correspondante. Le statut sera actualisé si le prestataire de paiement a transmis une nouvelle information.\n\nSi le montant a été débité, nous vous invitons à ne pas effectuer un second paiement avant que nous ayons vérifié la première opération. Répondez à cet e-mail en nous indiquant le moyen de paiement utilisé et ce que vous constatez. Nous prendrons le temps de vous aider.`,
  },
  {
    id: "topup_failed", group: "topup", label: "Faire le point sur un dépôt échoué",
    preview: "Demander si un débit a eu lieu, expliquer quoi vérifier et proposer une nouvelle tentative prudente.",
    whatsappBody: (name, _profile, context) => `Bonjour ${name},\n\nNous avons remarqué que le dépôt ci-dessous apparaît comme échoué. Nous souhaitons vérifier avec vous ce qui s’est réellement passé.\n\n${messageContextFacts(context)}\n\nVotre Mobile Money ou votre carte a-t-il été débité malgré ce statut ? Si oui, ne relancez pas immédiatement le paiement : contactez-nous avec la référence afin que nous puissions vérifier. Si aucun débit n’a eu lieu, vous pourrez réessayer depuis votre espace. Y a-t-il eu un message d’erreur ou une difficulté particulière ?`,
    emailSubject: () => "À propos de votre dépôt Texerra — vérifions le résultat",
    emailBody: (name, _profile, context) => `Nous revenons vers vous au sujet du dépôt ci-dessous, qui apparaît comme échoué dans notre système. Nous sommes désolés si cette opération vous a occasionné une gêne et souhaitons surtout vérifier que votre argent n’a pas été débité sans que votre solde soit crédité.\n\n${messageContextFacts(context)}\n\nPouvez-vous nous indiquer si votre compte Mobile Money ou votre carte bancaire a été débité ? Si un débit a bien eu lieu, merci de ne pas effectuer un nouveau paiement pour le moment et de nous répondre avec la référence de l’opération afin que nous puissions effectuer les vérifications nécessaires.\n\nSi aucun montant n’a été débité, vous pourrez tenter un nouveau dépôt depuis votre espace Texerra. Si un message d’erreur est apparu ou si vous ne comprenez pas le statut affiché, transmettez-nous simplement son contenu. Nous sommes disponibles pour vous accompagner et trouver avec vous la meilleure suite à donner.`,
  },
];
const STORAGE_KEY = "texerra:admin:period";

/* ────────────────────────────────────────────────────────────────── */
/* Composant principal                                                */
/* ────────────────────────────────────────────────────────────────── */

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const [period, setPeriod] = useState<Period>(() => {
    const v = localStorage.getItem(STORAGE_KEY) as Period | null;
    return v || "today";
  });
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [orderStatus, setOrderStatus] = useState("all");
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(20);

  const [topupStatus, setTopupStatus] = useState("all");
  const [topupPage, setTopupPage] = useState(1);
  const [topupPageSize, setTopupPageSize] = useState(20);

  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(20);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchDebounced, setUserSearchDebounced] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [userSort, setUserSort] = useState("recent");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [topUsersPeriod, setTopUsersPeriod] = useState("week");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState({ templateId: "", subject: "", body: "" });
  const [sendingMessage, setSendingMessage] = useState(false);

  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [fullExportFormat, setFullExportFormat] = useState<"xls" | "json" | "pdf">("xls");
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modèle de message : picker
  const [messagePickerOpen, setMessagePickerOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<{
    name: string;
    channel: "whatsapp" | "email";
    phone?: string;
    email?: string;
    userId?: string;
    stats?: { completedOrders: number; totalOrders: number };
    profile?: UserContactProfile;
    context?: MessageContext;
  } | null>(null);

  // Référence vers la section Utilisateurs (pour "Voir utilisateur")
  const usersSectionRef = useRef<HTMLDivElement>(null);

  const { start, end } = getDateRange(period, customStart, customEnd);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, period);
  }, [period]);

  useEffect(() => {
    if (!user) {
      setFirebaseToken(null);
      return;
    }
    let cancelled = false;
    user
      .getIdToken()
      .then((t: string) => {
        if (!cancelled) setFirebaseToken(t);
      })
      .catch(() => {
        if (!cancelled) setFirebaseToken(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!profileUserId || !firebaseToken) {
      setProfileData(null);
      setProfileError(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    apiFetch(`/users/${encodeURIComponent(profileUserId)}/profile`, firebaseToken)
      .then((data) => { if (!cancelled) setProfileData(data); })
      .catch((error) => { if (!cancelled) setProfileError(error instanceof Error ? error.message : "Erreur de chargement"); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [profileUserId, firebaseToken]);

  // Debounce de la recherche utilisateur (350 ms)
  useEffect(() => {
    const id = setTimeout(() => {
      setUserSearchDebounced(userSearch.trim());
      setUserPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [userSearch]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const statsQuery = useQuery({
    queryKey: ["admin-stats", start, end],
    queryFn: () => apiFetch(`/stats?start=${start}&end=${end}`, firebaseToken!),
    enabled: !!firebaseToken,
    staleTime: 60_000,
  });
  const chartQuery = useQuery({
    queryKey: ["admin-chart", start, end],
    queryFn: () => apiFetch(`/chart?start=${start}&end=${end}`, firebaseToken!),
    enabled: !!firebaseToken,
    staleTime: 60_000,
  });
  const servicePerformanceQuery = useQuery({
    queryKey: ["admin-service-performance", start, end],
    queryFn: () => apiFetch(`/service-performance?start=${start}&end=${end}`, firebaseToken!),
    enabled: !!firebaseToken,
    staleTime: 60_000,
  });
  const ordersQuery = useQuery({
    queryKey: ["admin-orders", start, end, orderStatus, orderPage, orderPageSize],
    queryFn: () =>
      apiFetch(
        `/orders?start=${start}&end=${end}&status=${orderStatus}&page=${orderPage}&pageSize=${orderPageSize}`,
        firebaseToken!
      ),
    enabled: !!firebaseToken,
    staleTime: 30_000,
  });
  const topupsQuery = useQuery({
    queryKey: ["admin-topups", start, end, topupStatus, topupPage, topupPageSize],
    queryFn: () =>
      apiFetch(
        `/topups?start=${start}&end=${end}&status=${topupStatus}&page=${topupPage}&pageSize=${topupPageSize}`,
        firebaseToken!
      ),
    enabled: !!firebaseToken,
    staleTime: 30_000,
  });
  const usersQuery = useQuery({
    queryKey: [
      "admin-users",
      userPage,
      userPageSize,
      userSearchDebounced,
      userFilter,
      userSort,
      topUsersPeriod,
    ],
    queryFn: () =>
      apiFetch(
        `/users?page=${userPage}&pageSize=${userPageSize}&search=${encodeURIComponent(
          userSearchDebounced
        )}&filter=${userFilter}&sort=${userSort}&topPeriod=${topUsersPeriod}`,
        firebaseToken!
      ),
    enabled: !!firebaseToken,
    staleTime: 30_000,
  });

  if (authLoading || !firebaseToken) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Chargement du tableau de bord…
      </div>
    );
  }

  const stats = statsQuery.data;
  const chartData = chartQuery.data ?? [];

  // Solde des utilisateurs non encore dépensé = dépôts réussis − revenus
  const unusedBalance = stats
    ? Math.max(0, (stats.totalTopupAmount || 0) - (stats.revenue || 0))
    : 0;

  async function copyToClipboard(text: string, label = "Copié !") {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`✓ ${label}`);
    } catch {
      setToast("Impossible de copier");
    }
  }

  function viewUser(userId: string) {
    if (!userId) return;
    setUserSearch(userId);
    setUserFilter("all");
    setUserSort("recent");
    setUserPage(1);
    setTimeout(() => {
      usersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function openMessagePicker(
    name: string,
    channel: "whatsapp" | "email",
    phone?: string,
    email?: string,
    userId?: string,
    stats?: { completedOrders: number; totalOrders: number },
    context?: MessageContext
  ) {
    const initialProfile: UserContactProfile = {
      completedOrders: stats?.completedOrders,
      totalOrders: stats?.totalOrders,
    };
    setMessageTarget({ name: name || "Client", channel, phone, email, userId, stats, profile: initialProfile, context });
    setMessageDraft({ templateId: "", subject: "", body: "" });
    setMessagePickerOpen(true);

    // À l'ouverture du contact, charger le profil détaillé une seule fois pour
    // personnaliser le message avec l'inscription, la dernière connexion et
    // la dernière commande connue. Aucun chargement massif en arrière-plan.
    if (channel === "email" && userId && firebaseToken) {
      apiFetch(`/users/${encodeURIComponent(userId)}/profile`, firebaseToken)
        .then((data) => {
          const profile = data?.user;
          setMessageTarget((current) => {
            if (!current || current.userId !== userId) return current;
            return {
              ...current,
              profile: {
                createdAt: profile?.createdAt ?? null,
                lastSignInAt: profile?.auth?.lastSignInTime ?? profile?.lastSignInAt ?? null,
                lastOrderAt: data?.orders?.[0]?.createdAt ?? null,
                completedOrders: Number(profile?.stats?.completedOrders ?? current.stats?.completedOrders ?? 0),
                totalOrders: Number(profile?.stats?.totalOrders ?? current.stats?.totalOrders ?? 0),
              },
            };
          });
        })
        .catch(() => {
          // Le modèle reste utilisable avec les informations déjà connues du tableau.
        });
    }
  }

  function handleTemplateSelect(template: MessageTemplate) {
    if (!messageTarget) return;
    const displayName = messageTarget.name?.trim() ? messageTarget.name.trim() : "cher client";
    const fn = firstName(displayName);

    if (messageTarget.channel === "whatsapp") {
      if (!messageTarget.phone) { setToast("Pas de téléphone disponible"); return; }
      const clean = cleanForWa(messageTarget.phone);
      const text = encodeURIComponent(template.whatsappBody(fn, messageTarget.profile ?? messageTarget.stats, messageTarget.context));
      window.open(`https://wa.me/${clean}?text=${text}`, "_blank", "noopener,noreferrer");
      if (messageTarget.userId && firebaseToken) {
        apiPost("/contact/log", firebaseToken, {
          userId: messageTarget.userId,
          channel: "whatsapp",
          templateId: template.id,
          subject: template.label,
        }).catch(() => {});
      }
      setToast("WhatsApp ouvert. Le contact est enregistré comme initié, pas comme envoyé.");
      setMessagePickerOpen(false);
      setMessageTarget(null);
      return;
    }

    if (!messageTarget.email) { setToast("Pas d'email disponible"); return; }
    setMessageDraft({
      templateId: template.id,
      subject: template.emailSubject(fn),
      body: template.emailBody(displayName, messageTarget.profile ?? messageTarget.stats, messageTarget.context),
    });
  }

  async function sendEmailDraft() {
    if (!messageTarget?.userId || !firebaseToken) {
      setToast("Impossible d'identifier ce client pour l'envoi sécurisé.");
      return;
    }
    if (!messageDraft.subject.trim() || !messageDraft.body.trim()) {
      setToast("L'objet et le message sont obligatoires.");
      return;
    }
    try {
      setSendingMessage(true);
      await apiPost("/contact/email", firebaseToken, {
        userId: messageTarget.userId,
        templateId: messageDraft.templateId || "custom",
        subject: messageDraft.subject.trim(),
        message: messageDraft.body.trim(),
      });
      setToast(`E-mail envoyé à ${messageTarget.email}.`);
      setMessagePickerOpen(false);
      setMessageTarget(null);
      setMessageDraft({ templateId: "", subject: "", body: "" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      if (profileUserId) {
        const refreshed = await apiFetch(`/users/${encodeURIComponent(profileUserId)}/profile`, firebaseToken);
        setProfileData(refreshed);
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Échec de l'envoi.");
    } finally {
      setSendingMessage(false);
    }
  }

  function openUserProfile(userId: string) {
    if (!userId) return;
    setProfileData(null);
    setProfileUserId(userId);
  }

  async function sendInAppNotification(userId: string) {
    if (!firebaseToken) return;
    const title = window.prompt("Titre de la notification", "Un message de l'équipe Texerra");
    if (!title?.trim()) return;
    const message = window.prompt("Contenu de la notification");
    if (!message?.trim()) return;
    try {
      await apiPost("/notifications", firebaseToken, { userId, title: title.trim(), message: message.trim() });
      setToast("Notification envoyée dans l'application.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Échec de la notification.");
    }
  }

  function userExportIds(): string[] {
    if (selectedUserIds.length) return selectedUserIds.slice(0, 200);
    return (usersQuery.data?.users ?? []).map((u: any) => String(u.id)).slice(0, 200);
  }

  async function markUsersExported(ids: string[]) {
    if (!ids.length || !firebaseToken) return;
    await apiPost("/users/export/mark", firebaseToken, { ids });
    setSelectedUserIds([]);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function handleOrdersCsv() {
    try {
      setExporting("orders-csv");
      await downloadBlob(
        `/orders/export?format=csv&start=${start}&end=${end}&status=${orderStatus}`,
        `commandes-${start}_${end}.csv`,
        firebaseToken!
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  async function handleOrdersExcel() {
    try {
      setExporting("orders-xls");
      await downloadBlob(
        `/orders/export?format=xls&start=${start}&end=${end}&status=${orderStatus}`,
        `commandes-${start}_${end}.xls`,
        firebaseToken!
      );
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleOrdersPdf() {
    try {
      setExporting("orders-pdf");
      const data = await apiFetch(
        `/orders/export?format=json&start=${start}&end=${end}&status=${orderStatus}`,
        firebaseToken!
      );
      const orders = data.orders as any[];
      const completed = orders.filter((o) => o.status === "completed");
      const totalRevenue = completed.reduce((s, o) => s + (o.price || 0), 0);
      const totalMargin = completed.reduce(
        (s, o) =>
          s +
          (typeof o.margin === "number" && Number.isFinite(o.margin)
            ? o.margin
            : (o.price || 0) * MARGIN_RATE_FALLBACK),
        0
      );
      openPdfPrint(
        `Commandes — ${start} → ${end}`,
        [
          `Total : <b>${orders.length}</b> commandes`,
          `Réussies : <b>${completed.length}</b>`,
          `Revenus : <b>${totalRevenue.toFixed(2)} €</b> (≈ <b>${toCfa(totalRevenue)}</b>)`,
          `Marge réelle : <b>${totalMargin.toFixed(2)} €</b> (≈ <b>${toCfa(totalMargin)}</b>)`,
        ],
        [
          "Date",
          "Utilisateur",
          "Email",
          "Pays",
          "Service",
          "Numéro",
          "Statut",
          "Prix (€)",
          "Prix (FCFA)",
          "Marge (€)",
          "Marge (FCFA)",
        ],
        orders.map((o) => {
          const isCompleted = o.status === "completed";
          const margin =
            isCompleted && typeof o.margin === "number" && Number.isFinite(o.margin)
              ? o.margin
              : isCompleted
              ? (o.price || 0) * MARGIN_RATE_FALLBACK
              : null;
          return [
            new Date(o.createdAt).toLocaleString("fr-FR"),
            o.userName || o.user?.name || "—",
            o.userEmail || o.user?.email || "—",
            o.countryCode,
            o.serviceCode,
            o.phoneNumber,
            o.status,
            o.price?.toFixed(2) ?? "",
            toCfa(o.price ?? 0),
            margin != null ? margin.toFixed(2) : "—",
            margin != null ? toCfa(margin) : "—",
          ];
        })
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  async function handleTopupsCsv() {
    try {
      setExporting("topups-csv");
      await downloadBlob(
        `/topups/export?format=csv&start=${start}&end=${end}&status=${topupStatus}`,
        `depots-${start}_${end}.csv`,
        firebaseToken!
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  async function handleTopupsExcel() {
    try {
      setExporting("topups-xls");
      await downloadBlob(
        `/topups/export?format=xls&start=${start}&end=${end}&status=${topupStatus}`,
        `depots-${start}_${end}.xls`,
        firebaseToken!
      );
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleTopupsPdf() {
    try {
      setExporting("topups-pdf");
      const data = await apiFetch(
        `/topups/export?format=json&start=${start}&end=${end}&status=${topupStatus}`,
        firebaseToken!
      );
      const topups = data.topups as any[];
      const completed = topups.filter((t) => t.status === "completed");
      const totalAmount = completed.reduce((s, t) => s + (t.amountEur || 0), 0);
      openPdfPrint(
        `Dépôts — ${start} → ${end}`,
        [
          `Total affiché : <b>${topups.length}</b>`,
          `Réussis : <b>${completed.length}</b>`,
          `Montant encaissé : <b>${totalAmount.toFixed(2)} €</b> (≈ <b>${toCfa(totalAmount)}</b>)`,
        ],
        ["Date", "Utilisateur", "Email", "Montant (€)", "Montant (FCFA)", "Pays", "Statut", "Référence"],
        topups.map((t) => [
          new Date(t.createdAt).toLocaleString("fr-FR"),
          t.userName || t.user?.name || "—",
          t.userEmail || t.user?.email || "—",
          t.amountEur?.toFixed(2) ?? "",
          toCfa(t.amountEur ?? 0),
          t.countryIso ?? "—",
          t.status,
          t.externalId ?? "—",
        ])
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  async function handleUsersCsv() {
    const ids = userExportIds();
    if (!ids.length) { setToast("Aucun utilisateur à exporter sur cette page."); return; }
    try {
      setExporting("users-csv");
      await downloadBlob(`/users/export?format=csv&ids=${encodeURIComponent(ids.join(","))}`, `utilisateurs-texerra-${ids.length}.csv`, firebaseToken!);
      await markUsersExported(ids);
      setToast(`${ids.length} utilisateur(s) exporté(s).`);
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleUsersVcf() {
    const ids = userExportIds();
    if (!ids.length) { setToast("Aucun utilisateur à exporter sur cette page."); return; }
    try {
      setExporting("users-vcf");
      await downloadBlob(`/users/export?format=vcf&ids=${encodeURIComponent(ids.join(","))}`, `contacts-texerra-${ids.length}.vcf`, firebaseToken!);
      await markUsersExported(ids);
      setToast(`${ids.length} contact(s) exporté(s).`);
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleUsersExcel() {
    const ids = userExportIds();
    if (!ids.length) { setToast("Aucun utilisateur à exporter sur cette page."); return; }
    try {
      setExporting("users-xls");
      await downloadBlob(
        `/users/export?format=xls&ids=${encodeURIComponent(ids.join(","))}`,
        `utilisateurs-texerra-${ids.length}.xls`,
        firebaseToken!
      );
      await markUsersExported(ids);
      setToast(`${ids.length} profil(s) exporté(s) au format Excel.`);
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleUsersPdf() {
    const ids = userExportIds();
    if (!ids.length) { setToast("Aucun utilisateur à exporter sur cette page."); return; }
    try {
      setExporting("users-pdf");
      const data = await apiFetch(`/users/export?format=json&ids=${encodeURIComponent(ids.join(","))}`, firebaseToken!);
      const users = data.users as any[];
      openPdfPrint(
        `Utilisateurs — ${users.length} sélectionnés`,
        [`Total : <b>${users.length}</b> utilisateurs`],
        ["Inscription", "Nom", "Email", "Téléphone", "Solde (€)", "Solde (FCFA)"],
        users.map((u) => [new Date(u.createdAt).toLocaleString("fr-FR"), u.name || "—", u.email || "—", u.phone || "—", u.balance?.toFixed(2) ?? "0.00", toCfa(u.balance ?? 0)])
      );
      await markUsersExported(ids);
      setToast(`${users.length} profil(s) exporté(s).`);
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleFullAdminExport() {
    try {
      setExporting("full-admin");
      const filename = `texerra-export-administrateur-${start}_${end}`;
      if (fullExportFormat === "pdf") {
        const data = await apiFetch(`/export/full?format=json&start=${start}&end=${end}`, firebaseToken!);
        downloadAdminFullDataPdf(data, `${filename}.pdf`);
      } else {
        await downloadBlob(`/export/full?format=${fullExportFormat}&start=${start}&end=${end}`, `${filename}.${fullExportFormat}`, firebaseToken!);
      }
      setToast("Export des données administrateur téléchargé.");
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleMigrate() {
    if (!confirm("Migrer les anciennes données ?\n\nCette opération est idempotente et sûre."))
      return;
    try {
      setMigrating(true);
      setMigrationResult(null);
      const res = await fetch("/api/admin/migrate", {
        method: "POST",
        headers: { Authorization: `Bearer ${firebaseToken}` },
      });
      if (!res.ok) throw new Error(`Migration échouée (${res.status})`);
      const data = await res.json();
      setMigrationResult(
        data.message ||
          `✓ ${data.ordersMigrated} commandes et ${data.topupsMigrated} dépôts mis à jour.`
      );
      qc.invalidateQueries();
    } catch (e) {
      setMigrationResult(`✗ ${(e as Error).message}`);
    } finally {
      setMigrating(false);
    }
  }

  const busy = (k: string) => exporting === k;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Tableau de bord administrateur
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Période : <span className="font-medium text-foreground">{start}</span> →{" "}
              <span className="font-medium text-foreground">{end}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Format de l'export complet"
              value={fullExportFormat}
              onChange={(event) => setFullExportFormat(event.target.value as "xls" | "json" | "pdf")}
              className="px-3 py-1.5 rounded-lg border border-border bg-white text-sm"
              title="Choisir le format de l'export administrateur"
            >
              <option value="xls">Excel — plusieurs feuilles</option>
              <option value="pdf">PDF — rapport complet</option>
              <option value="json">JSON — données brutes</option>
            </select>
            <button
              onClick={handleFullAdminExport}
              disabled={busy("full-admin")}
              className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm font-semibold disabled:opacity-50"
              title="Télécharger les indicateurs, utilisateurs, dépôts, commandes et données d'affiliation"
            >
              {busy("full-admin") ? "Préparation…" : `Télécharger toutes les données (${fullExportFormat.toUpperCase()})`}
            </button>
            {(
              [
                ["today", "Aujourd'hui"],
                ["yesterday", "Hier"],
                ["7d", "7 jours"],
                ["30d", "30 jours"],
                ["week", "Cette semaine"],
                ["month", "Ce mois"],
                ["year", "Cette année"],
                ["all", "Tout"],
                ["custom", "Personnalisé"],
              ] as [Period, string][]
            ).map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  period === p
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-white border-border hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Migration */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            {migrating ? "Migration en cours…" : "🔧 Migrer les anciennes données"}
          </button>
          {migrationResult && (
            <span className="text-muted-foreground">{migrationResult}</span>
          )}
        </div>

        {/* Période personnalisée */}
        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-3 bg-white border rounded-xl p-3 shadow-sm">
            <label className="text-sm font-medium">Du</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/60"
            />
            <label className="text-sm font-medium">au</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/60"
            />
          </div>
        )}

        {/* Cartes statistiques */}
        {statsQuery.isError && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
            Erreur lors du chargement des statistiques :{" "}
            {(statsQuery.error as Error)?.message ?? "inconnue"}
          </div>
        )}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              label="Utilisateurs"
              value={stats.totalUsers.toLocaleString("fr-FR")}
              sub={`+${stats.newUsers} nouveaux`}
              icon="👥"
              color="blue"
            />
            <StatCard
              label="Dépôts réussis"
              value={`${stats.totalTopupAmount.toFixed(2)} €`}
              secondary={toCfa(stats.totalTopupAmount)}
              sub={`${stats.totalTopups} validé${stats.totalTopups > 1 ? "s" : ""} · tous pays`}
              icon="💰"
              color="emerald"
            />
            <StatCard
              label="Commandes"
              value={stats.totalOrders.toLocaleString("fr-FR")}
              sub={`${stats.completedOrders} réussies · ${stats.activeOrders} en cours`}
              icon="📦"
              color="orange"
            />
            <StatCard
              label="Revenus"
              value={`${stats.revenue.toFixed(2)} €`}
              secondary={toCfa(stats.revenue)}
              sub={`Marge réelle ${stats.marginPercent.toFixed(1)} %`}
              icon="📈"
              color="purple"
            />
            <StatCard
              label="Solde non utilisé"
              value={`${unusedBalance.toFixed(2)} €`}
              secondary={toCfa(unusedBalance)}
              sub="Dépôts non encore dépensés"
              icon="🏦"
              color="teal"
            />
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniStat label="Réussies" value={stats.completedOrders} highlight />
            <MiniStat label="En cours" value={stats.activeOrders} />
            <MiniStat label="En attente" value={stats.pendingOrders} />
            <MiniStat label="Annulées" value={stats.cancelledOrders} />
            <MiniStat label="Expirées" value={stats.expiredOrders} />
            <MiniStat
              label="Marge réelle"
              value={`${stats.margin.toFixed(2)} €`}
              sub={toCfa(stats.margin)}
              highlight
            />
          </div>
        )}

        {/* Graphique */}
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Évolution sur la période</h2>
          {chartQuery.isError && (
            <p className="text-sm text-red-600">
              Erreur lors du chargement du graphique :{" "}
              {(chartQuery.error as Error)?.message ?? "inconnue"}
            </p>
          )}
          {!chartQuery.isError && chartData.length === 0 && !chartQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Aucune donnée sur cette période.</p>
          )}
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  name="Revenus (€)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="topups"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Dépôts (€)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#ea580c"
                  strokeWidth={2}
                  name="Commandes réussies"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Marge réelle (€)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#dc2626"
                  strokeWidth={2}
                  name="Inscriptions"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Analyse des services : seules les commandes réussies sont comptées. */}
        <section className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Services les plus commandés</h2>
              <p className="text-sm text-muted-foreground mt-1">Classement calculé uniquement à partir des commandes réussies sur la période sélectionnée.</p>
            </div>
            <button onClick={() => servicePerformanceQuery.refetch()} disabled={servicePerformanceQuery.isFetching} className="px-3 py-1.5 border rounded-lg text-xs font-medium disabled:opacity-50">
              {servicePerformanceQuery.isFetching ? "Actualisation…" : "Actualiser"}
            </button>
          </div>
          {servicePerformanceQuery.isError && <p className="text-sm text-red-600">Impossible de charger le classement : {(servicePerformanceQuery.error as Error)?.message ?? "erreur inconnue"}</p>}
          {servicePerformanceQuery.isLoading ? <p className="text-sm text-muted-foreground">Calcul des services les plus utilisés…</p> : null}
          {servicePerformanceQuery.data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Commandes réussies" value={servicePerformanceQuery.data.totals.successfulOrders} highlight />
                <MiniStat label="Services utilisés" value={servicePerformanceQuery.data.totals.services} />
                <MiniStat label="Chiffre d'affaires" value={`${Number(servicePerformanceQuery.data.totals.revenue || 0).toFixed(2)} €`} />
                <MiniStat label="Marge générée" value={`${Number(servicePerformanceQuery.data.totals.margin || 0).toFixed(2)} €`} highlight />
              </div>
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr><th className="p-3 text-left">Rang</th><th className="p-3 text-left">Service</th><th className="p-3 text-right">Commandes réussies</th><th className="p-3 text-right">Utilisateurs</th><th className="p-3 text-right">Chiffre d'affaires</th><th className="p-3 text-right">Marge générée</th><th className="p-3 text-right">Part</th></tr></thead>
                  <tbody>
                    {(servicePerformanceQuery.data.services || []).map((service: any, index: number) => (
                      <tr key={service.serviceCode} className="border-t hover:bg-slate-50/70">
                        <td className="p-3 text-muted-foreground">{index + 1}</td>
                        <td className="p-3"><div className="font-semibold">{service.serviceName}</div><div className="text-xs text-muted-foreground">{String(service.serviceCode).toUpperCase()}</div></td>
                        <td className="p-3 text-right font-semibold">{Number(service.successfulOrders).toLocaleString("fr-FR")}</td>
                        <td className="p-3 text-right">{Number(service.uniqueUsers).toLocaleString("fr-FR")}</td>
                        <td className="p-3 text-right">{Number(service.revenue || 0).toFixed(2)} €</td>
                        <td className="p-3 text-right font-semibold text-emerald-700">{Number(service.margin || 0).toFixed(2)} €</td>
                        <td className="p-3 text-right">{Number(service.sharePercent || 0).toFixed(1)} %</td>
                      </tr>
                    ))}
                    {!servicePerformanceQuery.data.services?.length && <tr><td colSpan={7} className="p-5 text-center text-muted-foreground">Aucune commande réussie sur cette période.</td></tr>}
                  </tbody>
                </table>
              </div>
              {servicePerformanceQuery.data.truncated && <p className="text-xs text-amber-700">Attention : le calcul a atteint la limite de {Number(servicePerformanceQuery.data.scanned).toLocaleString("fr-FR")} commandes. Réduisez la période pour obtenir un classement exhaustif.</p>}
            </>
          )}
        </section>

        {/* Commandes */}
        <Section
          title="Commandes"
          filters={[
            ["all", "Toutes"],
            ["completed", "Réussies"],
            ["active", "En cours"],
            ["pending_payment", "En attente"],
            ["cancelled", "Annulées"],
            ["expired", "Expirées"],
          ]}
          activeFilter={orderStatus}
          onFilterChange={(v) => {
            setOrderStatus(v);
            setOrderPage(1);
          }}
          pageSize={orderPageSize}
          onPageSizeChange={(s) => {
            setOrderPageSize(s);
            setOrderPage(1);
          }}
          actions={
            <>
              <ExportBtn onClick={handleOrdersCsv} disabled={busy("orders-csv")}>
                {busy("orders-csv") ? "…" : "CSV"}
              </ExportBtn>
              <ExportBtn onClick={handleOrdersExcel} disabled={busy("orders-xls")}>
                {busy("orders-xls") ? "…" : "Excel"}
              </ExportBtn>
              <ExportBtn onClick={handleOrdersPdf} disabled={busy("orders-pdf")}>
                {busy("orders-pdf") ? "…" : "PDF"}
              </ExportBtn>
            </>
          }
        >
          {ordersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground p-3">Chargement…</p>
          ) : ordersQuery.isError ? (
            <div className="p-3 text-sm text-red-700 bg-red-50 border-t border-red-100">
              Erreur lors de la récupération des commandes :{" "}
              {(ordersQuery.error as Error)?.message ?? "inconnue"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Utilisateur</th>
                      <th className="text-left p-2 font-medium">Pays</th>
                      <th className="text-left p-2 font-medium">Service</th>
                      <th className="text-left p-2 font-medium">Numéro</th>
                      <th className="text-right p-2 font-medium">Prix</th>
                      <th className="text-right p-2 font-medium">Prix (FCFA)</th>
                      <th className="text-left p-2 font-medium">Statut</th>
                      <th className="text-right p-2 font-medium">Marge</th>
                      <th className="text-center p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersQuery.data?.orders?.map((o: any) => {
                      const country = resolveCountry(o.phoneNumber, o.countryCode);
                      const isCompleted = o.status === "completed";
                      const realMargin =
                        typeof o.margin === "number" && Number.isFinite(o.margin)
                          ? o.margin
                          : null;
                      const displayMargin = isCompleted
                        ? realMargin != null
                          ? realMargin
                          : o.price * MARGIN_RATE_FALLBACK
                        : null;
                      const userName = o.user?.name || "";
                      const userEmail = o.user?.email || "";
                      const userPhone = o.user?.phone || "";
                      return (
                        <tr
                          key={o.id}
                          className="border-t hover:bg-secondary/30 transition-colors"
                        >
                          <td className="p-2 whitespace-nowrap text-xs">
                            {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {o.user ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium">
                                  {userName || "—"}
                                </span>
                                {userEmail && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {userEmail}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {o.userId?.slice(0, 8) ?? "—"}
                              </span>
                            )}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <span className="text-lg leading-none">{country.flag}</span>
                              <span className="text-xs">{country.name}</span>
                            </span>
                          </td>
                          <td className="p-2">
                            <span className="inline-block text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">
                              {o.serviceCode}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-xs">{o.phoneNumber}</td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {o.price.toFixed(2)} €
                          </td>
                          <td className="p-2 text-right whitespace-nowrap text-muted-foreground">
                            {toCfa(o.price)}
                          </td>
                          <td className="p-2">
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="p-2 text-right whitespace-nowrap text-muted-foreground">
                            {displayMargin != null ? `${displayMargin.toFixed(2)} €` : "—"}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-1">
                              <ActionBtn
                                title="Copier le numéro"
                                onClick={() =>
                                  copyToClipboard(o.phoneNumber, "Numéro copié !")
                                }
                              >
                                <CopyIcon />
                              </ActionBtn>
                              {o.userId && (
                                <ActionBtn
                                  title="Voir l'utilisateur"
                                  onClick={() => viewUser(o.userId)}
                                >
                                  <SearchIcon />
                                </ActionBtn>
                              )}
                              {userEmail && (
                                <ActionBtn
                                  title="Contacter par email"
                                  variant="mail"
                                  onClick={() =>
                                    openMessagePicker(userName, "email", undefined, userEmail, o.userId, undefined, {
                                      kind: "order", date: o.createdAt, id: o.id, status: o.status,
                                      service: ({ wa: "WhatsApp", wb: "WhatsApp Business", ig: "Instagram", tg: "Telegram", fb: "Facebook", go: "Google", tk: "TikTok", tw: "Twitter / X", ap: "Apple", am: "Amazon", ms: "Microsoft", dc: "Discord", sc: "Snapchat", nf: "Netflix", ub: "Uber", ln: "LinkedIn", pp: "PayPal", bn: "Binance", vi: "Viber", yt: "YouTube", wc: "WeChat", sp: "Spotify", si: "Signal" } as Record<string, string>)[String(o.serviceCode || "").toLowerCase()] || String(o.serviceCode || "Service"),
                                      country: `${country.flag} ${country.name}`, number: o.phoneNumber || "", amount: Number(o.price || 0),
                                    })
                                  }
                                >
                                  <SendMailIcon />
                                </ActionBtn>
                              )}
                              {userPhone && (
                                <ActionBtn
                                  title="Écrire sur WhatsApp au client"
                                  variant="whatsapp"
                                  onClick={() =>
                                    openMessagePicker(userName, "whatsapp", userPhone, undefined, o.userId)
                                  }
                                >
                                  <WhatsAppIcon />
                                </ActionBtn>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {ordersQuery.data?.orders?.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="p-4 text-center text-muted-foreground"
                        >
                          Aucune commande sur cette période
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={orderPage}
                total={ordersQuery.data?.total ?? 0}
                pageSize={orderPageSize}
                onChange={setOrderPage}
              />
            </>
          )}
        </Section>

        {/* Dépôts */}
        <Section
          title="Dépôts / Recharges"
          filters={[
            ["all", "Tous"],
            ["completed", "Réussis"],
            ["pending", "En attente"],
            ["failed", "Échoués"],
          ]}
          activeFilter={topupStatus}
          onFilterChange={(v) => {
            setTopupStatus(v);
            setTopupPage(1);
          }}
          pageSize={topupPageSize}
          onPageSizeChange={(s) => {
            setTopupPageSize(s);
            setTopupPage(1);
          }}
          actions={
            <>
              <ExportBtn onClick={handleTopupsCsv} disabled={busy("topups-csv")}>
                {busy("topups-csv") ? "…" : "CSV"}
              </ExportBtn>
              <ExportBtn onClick={handleTopupsExcel} disabled={busy("topups-xls")}>
                {busy("topups-xls") ? "…" : "Excel"}
              </ExportBtn>
              <ExportBtn onClick={handleTopupsPdf} disabled={busy("topups-pdf")}>
                {busy("topups-pdf") ? "…" : "PDF"}
              </ExportBtn>
            </>
          }
        >
          {topupsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground p-3">Chargement…</p>
          ) : topupsQuery.isError ? (
            <div className="p-3 text-sm text-red-700 bg-red-50 border-t border-red-100">
              Erreur lors de la récupération des dépôts :{" "}
              {(topupsQuery.error as Error)?.message ?? "inconnue"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Utilisateur</th>
                      <th className="text-right p-2 font-medium">Montant (€)</th>
                      <th className="text-right p-2 font-medium">Montant (FCFA)</th>
                      <th className="text-left p-2 font-medium">Pays</th>
                      <th className="text-left p-2 font-medium">Statut</th>
                      <th className="text-left p-2 font-medium">Référence</th>
                      <th className="text-center p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topupsQuery.data?.topups?.map((t: any) => {
                      const country = countryFromIso(t.countryIso);
                      const userName = t.user?.name || "";
                      const userEmail = t.user?.email || "";
                      const userPhone = t.user?.phone || "";
                      return (
                        <tr
                          key={t.id}
                          className="border-t hover:bg-secondary/30 transition-colors"
                        >
                          <td className="p-2 whitespace-nowrap text-xs">
                            {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            {t.user ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-medium">
                                  {userName || "—"}
                                </span>
                                {userEmail && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {userEmail}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {t.userId?.slice(0, 8) ?? "—"}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-medium">
                            {t.amountEur.toFixed(2)} €
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {toCfa(t.amountEur)}
                          </td>
                          <td className="p-2 whitespace-nowrap text-xs">
                            {country ? (
                              <span className="flex items-center gap-1.5">
                                <span className="text-lg leading-none">
                                  {country.flag}
                                </span>
                                <span>{country.name}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {t.countryIso ?? "—"}
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <StatusBadge status={t.status} />
                          </td>
                          <td className="p-2 font-mono text-xs text-muted-foreground">
                            {t.externalId ?? "—"}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-1">
                              {t.userId && (
                                <ActionBtn
                                  title="Voir l'utilisateur"
                                  onClick={() => viewUser(t.userId)}
                                >
                                  <SearchIcon />
                                </ActionBtn>
                              )}
                              {userPhone && (
                                <ActionBtn
                                  title="Contacter sur WhatsApp"
                                  variant="whatsapp"
                                  onClick={() =>
                                    openMessagePicker(userName, "whatsapp", userPhone, undefined, t.userId)
                                  }
                                >
                                  <WhatsAppIcon />
                                </ActionBtn>
                              )}
                              {userEmail && (
                                <ActionBtn
                                  title="Contacter par email"
                                  variant="mail"
                                  onClick={() =>
                                    openMessagePicker(userName, "email", undefined, userEmail, t.userId, undefined, {
                                      kind: "topup", date: t.createdAt, id: t.id, status: t.status,
                                      amount: Number(t.amountEur || 0), country: country ? `${country.flag} ${country.name}` : t.countryIso || "Non renseigné",
                                      currency: t.localCurrency || undefined, localAmount: t.amountLocal ?? null,
                                      reference: t.externalId || undefined, provider: t.provider || t.paymentMethod || undefined,
                                    })
                                  }
                                >
                                  <SendMailIcon />
                                </ActionBtn>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {topupsQuery.data?.topups?.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-4 text-center text-muted-foreground"
                        >
                          Aucun dépôt sur cette période
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={topupPage}
                total={topupsQuery.data?.total ?? 0}
                pageSize={topupPageSize}
                onChange={setTopupPage}
              />
            </>
          )}
        </Section>

        {/* Utilisateurs */}
        <div ref={usersSectionRef}>
          <Section
            title="Utilisateurs"
            filters={[
              ["all", "Tous"],
              ["top", "Meilleurs utilisateurs"],
              ["hasOrders", "Ayant déjà commandé"],
              ["hasBalance", "Solde > 0"],
              ["neverOrdered", "Jamais commandé"],
            ]}
            activeFilter={userFilter}
            onFilterChange={(v) => {
              setUserFilter(v);
              setUserPage(1);
            }}
            pageSize={userPageSize}
            onPageSizeChange={(s) => {
              setUserPageSize(s);
              setUserPage(1);
            }}
            actions={
              <>
                <ExportBtn onClick={handleUsersCsv} disabled={busy("users-csv")}>
                  {busy("users-csv") ? "…" : "CSV"}
                </ExportBtn>
                <ExportBtn onClick={handleUsersExcel} disabled={busy("users-xls")}>
                  {busy("users-xls") ? "…" : "Excel"}
                </ExportBtn>
                <ExportBtn onClick={handleUsersPdf} disabled={busy("users-pdf")}>
                  {busy("users-pdf") ? "…" : "PDF"}
                </ExportBtn>
                <ExportBtn
                  onClick={handleUsersVcf}
                  disabled={busy("users-vcf")}
                  variant="primary"
                >
                  {busy("users-vcf") ? "…" : "Contacts .vcf"}
                </ExportBtn>
              </>
            }
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const visible = (usersQuery.data?.users ?? []).map((u: any) => String(u.id));
                    setSelectedUserIds((current) => current.length === visible.length && visible.every((id: string) => current.includes(id)) ? current.filter((id) => !visible.includes(id)) : [...new Set([...current, ...visible])]);
                  }}
                  className="px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-secondary"
                >
                  {selectedUserIds.length ? `${selectedUserIds.length} sélectionné(s)` : "Sélectionner la page"}
                </button>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Début du nom, e-mail, téléphone ou ID…"
                  className="flex-1 min-w-[220px] border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/60"
                />
                {userFilter === "top" && (
                  <select value={topUsersPeriod} onChange={(e) => { setTopUsersPeriod(e.target.value); setUserPage(1); }} className="border rounded-lg px-2 py-1.5 text-xs bg-white">
                    <option value="today">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="year">Cette année</option>
                    <option value="all">Depuis le début</option>
                  </select>
                )}
                <select
                  value={userSort}
                  onChange={(e) => {
                    setUserSort(e.target.value);
                    setUserPage(1);
                  }}
                  className="border rounded-lg px-2 py-1.5 text-xs bg-white hover:border-primary/40 focus:outline-none focus:border-primary/60"
                >
                  <option value="recent">Plus récents</option>
                  <option value="oldest">Plus anciens</option>
                  <option value="balanceDesc">Solde décroissant</option>
                  <option value="completedOrdersDesc">
                    Plus de commandes réussies
                  </option>
                </select>
              </div>
            }
          >
            {userFilter !== "all" && userFilter !== "top" && !userSearchDebounced && (
              <p className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border-y border-amber-100">
                Pour préserver les quotas Firestore, ce filtre s’applique à la page d’utilisateurs actuellement chargée, et non à un balayage de toute la base. Augmentez le nombre d’éléments par page ou utilisez la recherche pour affiner la sélection.
              </p>
            )}
            {userFilter === "top" && usersQuery.data?.truncated && (
              <p className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border-y border-amber-100">
                Classement calculé sur les {topUsersPeriod === "all" ? "50 000" : "10 000"} commandes les plus récentes de la période. Le plafond a été atteint : ce classement peut être partiel.
              </p>
            )}
            {usersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground p-3">Chargement…</p>
            ) : usersQuery.isError ? (
              <div className="p-3 text-sm text-red-700 bg-red-50 border-t border-red-100">
                Erreur lors de la récupération des utilisateurs :{" "}
                {(usersQuery.error as Error)?.message ?? "inconnue"}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="text-left p-2 font-medium"><input type="checkbox" aria-label="Sélectionner tous les utilisateurs visibles" checked={(usersQuery.data?.users?.length ?? 0) > 0 && usersQuery.data.users.every((u: any) => selectedUserIds.includes(String(u.id)))} onChange={(e) => { const visible = (usersQuery.data?.users ?? []).map((u: any) => String(u.id)); setSelectedUserIds((current) => e.target.checked ? [...new Set([...current, ...visible])] : current.filter((id) => !visible.includes(id))); }} /></th>
                        <th className="text-left p-2 font-medium">Inscription</th>
                        <th className="text-left p-2 font-medium">Nom</th>
                        <th className="text-left p-2 font-medium">E-mail</th>
                        <th className="text-left p-2 font-medium">Téléphone</th>
                        <th className="text-left p-2 font-medium">Pays</th>
                        <th className="text-right p-2 font-medium">Solde (€)</th>
                        <th className="text-right p-2 font-medium">Solde (FCFA)</th>
                        <th className="text-right p-2 font-medium">Commandes réussies</th>
                        <th className="text-left p-2 font-medium">Commercial</th>
                        <th className="text-center p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersQuery.data?.users?.map((u: any) => {
                        const s = u.stats ?? {};
                        return (
                          <tr
                            key={u.id}
                            className="border-t hover:bg-secondary/30 transition-colors"
                          >
                            <td className="p-2"><input type="checkbox" aria-label={`Sélectionner ${u.name || u.email || u.id}`} checked={selectedUserIds.includes(String(u.id))} onChange={(e) => setSelectedUserIds((current) => e.target.checked ? [...new Set([...current, String(u.id)])] : current.filter((id) => id !== String(u.id)))} /></td>
                            <td className="p-2 whitespace-nowrap text-xs">
                              {new Date(u.createdAt).toLocaleString("fr-FR")}
                            </td>
                            <td className="p-2">
                              <div>{u.name || "—"}</div>
                              {u.lastExportedAt && <div className="text-[10px] text-emerald-700 mt-0.5" title={`Exporté ${u.exportCount ?? 1} fois · dernier export ${new Date(u.lastExportedAt).toLocaleString("fr-FR")}`}>Déjà exporté</div>}
                            </td>
                            <td className="p-2 text-muted-foreground text-xs">
                              {u.email || "—"}
                            </td>
                            <td className="p-2 font-mono text-xs">{u.phone || "—"}</td>
                            <td className="p-2 text-xs whitespace-nowrap">{u.countryName ? <span>{u.countryFlag || countryFromIso(u.countryIso)?.flag || "🌍"} {u.countryName}</span> : <span className="text-muted-foreground">À détecter</span>}</td>
                            <td className="p-2 text-right font-medium">
                              {u.balance.toFixed(2)} €
                            </td>
                            <td className="p-2 text-right text-muted-foreground">
                              {toCfa(u.balance)}
                            </td>
                            <td className="p-2 text-right whitespace-nowrap">
                              <span
                                className="inline-flex items-center gap-1"
                                title={`${s.completedOrders ?? 0} commande(s) réussie(s) sur ${s.totalOrders ?? 0} commande(s) au total`}
                              >
                                <span className="inline-flex items-center justify-center text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {s.completedOrders ?? 0}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  / {s.totalOrders ?? 0}
                                </span>
                              </span>
                            </td>
                            <td className="p-2 text-xs">
                              {u.affiliate ? <div><div className="font-medium">{u.affiliate.commercialName}</div><div className="text-muted-foreground">{u.affiliate.affiliateCode}</div></div> : <span className="text-muted-foreground">Direct</span>}
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-center gap-1">
                                <ActionBtn title="Ouvrir la fiche utilisateur" onClick={() => openUserProfile(u.id)}><SearchIcon /></ActionBtn>
                                {u.name && (
                                  <ActionBtn
                                    title="Copier le nom"
                                    onClick={() =>
                                      copyToClipboard(u.name, "Nom copié !")
                                    }
                                  >
                                    <CopyIcon />
                                  </ActionBtn>
                                )}
                                {u.phone && (
                                  <>
                                    <ActionBtn
                                      title="Copier le téléphone"
                                      onClick={() =>
                                        copyToClipboard(u.phone, "Téléphone copié !")
                                      }
                                    >
                                      <PhoneIcon />
                                    </ActionBtn>
                                    <ActionBtn
                                      title="Contacter sur WhatsApp"
                                      variant="whatsapp"
                                      onClick={() =>
                                        openMessagePicker(
                                          u.name || "",
                                          "whatsapp",
                                          u.phone,
                                          undefined,
                                          u.id,
                                          s
                                        )
                                      }
                                    >
                                      <WhatsAppIcon />
                                    </ActionBtn>
                                  </>
                                )}
                                {u.email && (
                                  <>
                                    <ActionBtn
                                      title="Copier l'email"
                                      onClick={() =>
                                        copyToClipboard(u.email, "Email copié !")
                                      }
                                    >
                                      <MailIcon />
                                    </ActionBtn>
                                    <ActionBtn
                                      title="Contacter par email"
                                      variant="mail"
                                      onClick={() =>
                                        openMessagePicker(
                                          u.name || "",
                                          "email",
                                          undefined,
                                          u.email,
                                          u.id,
                                          s
                                        )
                                      }
                                    >
                                      <SendMailIcon />
                                    </ActionBtn>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {usersQuery.data?.users?.length === 0 && (
                        <tr>
                          <td
                            colSpan={11}
                            className="p-4 text-center text-muted-foreground"
                          >
                            Aucun utilisateur ne correspond à votre recherche
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={userPage}
                  total={usersQuery.data?.total ?? 0}
                  pageSize={userPageSize}
                  onChange={setUserPage}
                />
              </>
            )}
          </Section>
        </div>
      </div>

      {/* Fiche utilisateur détaillée — chargée uniquement à l'ouverture */}
      {profileUserId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-6" onClick={() => setProfileUserId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between gap-3 z-10">
              <div><h3 className="font-bold text-lg">Fiche utilisateur</h3><p className="text-xs text-muted-foreground">Profil, activité, commandes et historique de contact</p></div>
              <button onClick={() => setProfileUserId(null)} className="text-xl px-2" aria-label="Fermer">×</button>
            </div>
            {profileLoading ? <div className="p-8 text-center text-muted-foreground">Chargement du profil…</div> : profileError ? <div className="p-6 text-sm text-red-700">{profileError}</div> : profileData?.user && (
              <div className="p-5 space-y-6">
                {profileData.dataWarnings?.length ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {profileData.dataWarnings.join(" ")}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><div className="text-xl font-bold">{profileData.user.name || "Utilisateur"}</div><div className="text-sm text-muted-foreground">{profileData.user.email}</div><div className="text-xs text-muted-foreground mt-1">UID : {profileData.user.id}</div><div className="text-xs text-muted-foreground mt-1">Pays : {profileData.user.countryName ? `${profileData.user.countryFlag || countryFromIso(profileData.user.countryIso)?.flag || "🌍"} ${profileData.user.countryName}` : "Non détecté"}</div></div>
                  <div className="flex flex-wrap gap-2">
                    {profileData.user.email && <button onClick={() => openMessagePicker(profileData.user.name, "email", undefined, profileData.user.email, profileData.user.id, { completedOrders: profileData.user.stats.completedOrders, totalOrders: profileData.user.stats.totalOrders })} className="px-3 py-2 rounded-lg border text-sm">Contacter par e-mail</button>}
                    {profileData.user.phone && <button onClick={() => openMessagePicker(profileData.user.name, "whatsapp", profileData.user.phone, undefined, profileData.user.id)} className="px-3 py-2 rounded-lg border text-sm">WhatsApp</button>}
                    <button onClick={() => sendInAppNotification(profileData.user.id)} className="px-3 py-2 rounded-lg border text-sm">Notifier dans l'application</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-muted-foreground">Inscription</div><div className="text-sm font-semibold">{new Date(profileData.user.createdAt).toLocaleString("fr-FR")}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-muted-foreground">Dernière connexion</div><div className="text-sm font-semibold">{profileData.user.auth?.lastSignInTime ? new Date(profileData.user.auth.lastSignInTime).toLocaleString("fr-FR") : "Non disponible"}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-muted-foreground">Commandes réussies</div><div className="text-lg font-bold text-emerald-700">{profileData.user.stats.completedOrders}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-muted-foreground">Solde actuel</div><div className="text-lg font-bold">{Number(profileData.user.balance || 0).toFixed(2)} €</div></div>
                </div>
                {profileData.user.affiliate && <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm"><strong>Client attribué à :</strong> {profileData.user.affiliate.name} · {profileData.user.affiliate.affiliateCode} · {profileData.user.affiliate.country || "Pays non renseigné"}</div>}
                <section><h4 className="font-semibold mb-2">Dernières commandes et numéros achetés</h4><div className="overflow-x-auto border rounded-xl"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Pays</th><th className="p-2 text-left">Service</th><th className="p-2 text-left">Numéro</th><th className="p-2 text-left">Code SMS</th><th className="p-2 text-left">Statut</th><th className="p-2 text-right">Prix</th></tr></thead><tbody>{(profileData.orders || []).map((o: any) => { const c = resolveCountry(o.phoneNumber, o.countryCode); return <tr key={o.id} className="border-t"><td className="p-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleString("fr-FR")}</td><td className="p-2">{c.flag} {c.name}</td><td className="p-2">{o.serviceName || o.serviceCode}</td><td className="p-2 font-mono">{o.phoneNumber}</td><td className="p-2 font-mono font-semibold">{o.smsCode || "—"}</td><td className="p-2">{o.status}</td><td className="p-2 text-right">{Number(o.price || 0).toFixed(2)} €</td></tr>; })}{!profileData.orders?.length && <tr><td colSpan={7} className="p-3 text-center text-muted-foreground">Aucune commande trouvée.</td></tr>}</tbody></table></div></section>
                <section><h4 className="font-semibold mb-2">Historique des contacts</h4><div className="space-y-2">{(profileData.contactHistory || []).map((item: any) => <div key={item.id} className="border rounded-lg px-3 py-2 text-xs"><div className="flex flex-wrap justify-between gap-2"><strong>{item.channel === "email" ? "E-mail" : item.channel === "whatsapp" ? "WhatsApp" : item.channel} · {item.status === "sent" ? "Envoyé" : item.status === "opened" ? "WhatsApp ouvert" : "Initiée"}</strong><span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString("fr-FR")}</span></div><div className="text-muted-foreground mt-1">{item.subject || item.templateId || "Contact"}</div></div>)}{!profileData.contactHistory?.length && <p className="text-xs text-muted-foreground">Aucun contact enregistré pour le moment.</p>}</div></section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Picker de modèle de message */}
      {messagePickerOpen && messageTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => {
            setMessagePickerOpen(false);
            setMessageTarget(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {messageTarget.channel === "whatsapp"
                  ? "Message WhatsApp"
                  : "Message email"}
              </h3>
              <button
                onClick={() => {
                  setMessagePickerOpen(false);
                  setMessageTarget(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Destinataire :{" "}
              <span className="font-medium text-foreground">
                {messageTarget.name || "Client"}
              </span>
              {messageTarget.channel === "whatsapp" && messageTarget.phone && (
                <> · {messageTarget.phone}</>
              )}
              {messageTarget.channel === "email" && messageTarget.email && (
                <> · {messageTarget.email}</>
              )}
            </p>
            <div className="space-y-1.5 overflow-y-auto flex-1 -mx-1 px-1">
              {MESSAGE_TEMPLATES.filter((t) => {
                const context = messageTarget.context;
                if (t.group !== (context?.kind ?? "general")) return false;
                if (context?.kind === "order") {
                  return context.status === "completed" || context.status === "active"
                    ? t.id === "order_feedback"
                    : t.id === "order_problem";
                }
                if (context?.kind === "topup") {
                  return context.status === "completed" ? t.id === "topup_success"
                    : context.status === "pending" || context.status === "pending_payment"
                      ? t.id === "topup_pending"
                      : t.id === "topup_failed";
                }
                return true;
              }).map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t)}
                  className="w-full text-left px-3 py-2 rounded-lg border hover:bg-secondary/40 hover:border-primary/40 transition-colors"
                >
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {t.preview}
                  </p>
                </button>
              ))}
            </div>
            {messageTarget.channel === "email" && messageDraft.templateId && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <label className="text-xs font-semibold text-gray-600">Objet</label>
                <input value={messageDraft.subject} onChange={(e) => setMessageDraft((d) => ({ ...d, subject: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" maxLength={180} />
                <label className="text-xs font-semibold text-gray-600">Message (modifiable avant envoi)</label>
                <textarea value={messageDraft.body} onChange={(e) => setMessageDraft((d) => ({ ...d, body: e.target.value }))} rows={14} maxLength={12000} className="w-full border rounded-lg px-3 py-2 text-sm leading-relaxed" />
                <button onClick={sendEmailDraft} disabled={sendingMessage || !messageTarget.userId} className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                  {sendingMessage ? "Envoi via Resend…" : "Envoyer l'e-mail"}
                </button>
                {!messageTarget.userId && <p className="text-xs text-red-600">Identifiant utilisateur manquant : l'envoi sécurisé est désactivé.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Composants UI                                                     */
/* ────────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  secondary,
  sub,
  icon,
  color = "blue",
}: {
  label: string;
  value: string;
  secondary?: string;
  sub?: string;
  icon?: string;
  color?: "blue" | "emerald" | "orange" | "purple" | "teal";
}) {
  const bg = {
    blue: "bg-blue-50 border-blue-100",
    emerald: "bg-emerald-50 border-emerald-100",
    orange: "bg-orange-50 border-orange-100",
    purple: "bg-purple-50 border-purple-100",
    teal: "bg-teal-50 border-teal-100",
  }[color];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {secondary && (
        <p className="text-sm font-semibold text-foreground/70 mt-0.5">≈ {secondary}</p>
      )}
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-center shadow-sm transition-all hover:shadow-md ${
        highlight ? "bg-blue-50 border-blue-200" : "bg-white"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
      {sub && <p className="text-xs font-medium text-foreground/70 mt-0.5">≈ {sub}</p>}
    </div>
  );
}

function Section({
  title,
  filters,
  activeFilter,
  onFilterChange,
  pageSize,
  onPageSizeChange,
  actions,
  toolbar,
  children,
}: {
  title: string;
  filters?: [string, string][];
  activeFilter?: string;
  onFilterChange?: (v: string) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b bg-secondary/20">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {filters && (
            <div className="flex flex-wrap gap-1">
              {filters.map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => onFilterChange?.(v)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    activeFilter === v
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-white hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {pageSize != null && onPageSizeChange && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Afficher</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="border rounded-lg px-2 py-1 text-xs bg-white hover:border-primary/40 focus:outline-none focus:border-primary/60"
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground">par page</span>
            </div>
          )}
          {actions && <div className="flex gap-1 ml-auto">{actions}</div>}
        </div>
      </div>
      {toolbar && <div className="p-3 border-b bg-white">{toolbar}</div>}
      {children}
    </div>
  );
}

function ExportBtn({
  onClick,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all disabled:opacity-50 ${
        variant === "primary"
          ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm"
          : "bg-white hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      {children}
    </button>
  );
}

function ActionBtn({
  onClick,
  title,
  variant,
  children,
}: {
  onClick: () => void;
  title: string;
  variant?: "whatsapp" | "mail";
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-all";
  const style =
    variant === "whatsapp"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
      : variant === "mail"
      ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
      : "bg-white border-border text-muted-foreground hover:bg-secondary hover:border-primary/40 hover:text-foreground";
  return (
    <button type="button" onClick={onClick} title={title} className={`${base} ${style}`}>
      {children}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );
}

function SendMailIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    expired: "bg-gray-50 text-gray-700 border-gray-200",
  };
  const labels: Record<string, string> = {
    active: "En cours",
    completed: "Réussie",
    pending: "En attente",
    pending_payment: "En attente",
    cancelled: "Annulée",
    failed: "Échoué",
    expired: "Expirée",
  };
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${
        map[status] ?? "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between p-3 border-t text-sm bg-secondary/20">
      <span className="text-xs text-muted-foreground">
        {total === 0
          ? "Aucun résultat"
          : `${from}–${to} sur ${total} résultat${total > 1 ? "s" : ""}`}
        {totalPages > 1 && ` · page ${page} / ${totalPages}`}
      </span>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:border-primary/40 transition-colors"
          >
            ←
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:border-primary/40 transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}