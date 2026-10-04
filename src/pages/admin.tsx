import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth-context";
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

type MessageTemplate = {
  id: string;
  label: string;
  preview: string;
  whatsappBody: (name: string) => string;
  emailSubject: (name: string) => string;
  emailBody: (name: string) => string;
};

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "relance",
    label: "Relance client",
    preview: "Ça fait un moment que nous n'avons pas eu de vos nouvelles…",
    whatsappBody: (name) =>
      `Bonjour ${name} 👋\n\n` +
      `Ça fait un moment que nous n'avons pas eu de vos nouvelles sur TEXERRA SMS. Nous espérons que tout va bien !\n\n` +
      `Si vous avez besoin d'un nouveau numéro ou si vous avez la moindre question, n'hésitez pas à nous écrire — nous sommes là pour vous aider. 🙏`,
    emailSubject: () => `TEXERRA SMS — On prend de vos nouvelles`,
    emailBody: (name) =>
      `Bonjour ${name},\n\n` +
      `Ça fait un moment que nous n'avons pas eu de vos nouvelles. Nous espérons que tout va bien !\n\n` +
      `Si vous avez besoin d'un nouveau numéro ou si vous avez la moindre question, n'hésitez pas à nous répondre.\n\n` +
      `À très bientôt,\nL'équipe TEXERRA SMS`,
  },
  {
    id: "retour",
    label: "Invitation à revenir",
    preview: "Revenez découvrir les nouveaux numéros disponibles sur TEXERRA…",
    whatsappBody: (name) =>
      `Bonjour ${name} 👋\n\n` +
      `Nous avons le plaisir de vous informer que de nouveaux numéros sont disponibles sur TEXERRA SMS à des prix très avantageux.\n\n` +
      `Si vous souhaitez tester à nouveau nos services, nous serions ravis de vous accompagner. Répondez simplement à ce message ! 🚀`,
    emailSubject: () => `TEXERRA SMS — De nouveaux numéros vous attendent`,
    emailBody: (name) =>
      `Bonjour ${name},\n\n` +
      `Nous avons le plaisir de vous informer que de nouveaux numéros sont disponibles sur TEXERRA SMS à des prix très avantageux.\n\n` +
      `Si vous souhaitez tester à nouveau nos services, nous serions ravis de vous accompagner.\n\n` +
      `Bien cordialement,\nL'équipe TEXERRA SMS`,
  },
  {
    id: "encouragement",
    label: "Encouragement",
    preview: "Merci pour votre confiance, continuez ainsi !",
    whatsappBody: (name) =>
      `Bonjour ${name} 👋\n\n` +
      `Nous tenions à vous remercier sincèrement pour votre confiance et votre fidélité envers TEXERRA SMS. 🙏\n\n` +
      `Vous êtes un utilisateur précieux pour nous et nous sommes ravis de vous compter parmi nos clients. Continuez comme ça ! 💪`,
    emailSubject: () => `Merci pour votre confiance, ${name} !`,
    emailBody: (name) =>
      `Bonjour ${name},\n\n` +
      `Nous tenions à vous remercier sincèrement pour votre confiance et votre fidélité envers TEXERRA SMS.\n\n` +
      `Vous êtes un utilisateur précieux pour nous et nous sommes ravis de vous compter parmi nos clients.\n\n` +
      `Bien à vous,\nL'équipe TEXERRA SMS`,
  },
  {
    id: "support",
    label: "Support / problème",
    preview: "Rencontrez-vous le moindre souci avec votre numéro ?",
    whatsappBody: (name) =>
      `Bonjour ${name} 👋\n\n` +
      `Nous espérons que tout se passe bien avec votre numéro sur TEXERRA SMS.\n\n` +
      `Si vous rencontrez le moindre souci ou si vous avez une question, n'hésitez pas à nous le dire — nous ferons notre maximum pour vous aider rapidement. 🙏`,
    emailSubject: () => `TEXERRA SMS — Besoin d'aide ?`,
    emailBody: (name) =>
      `Bonjour ${name},\n\n` +
      `Nous espérons que tout se passe bien avec votre numéro sur TEXERRA SMS.\n\n` +
      `Si vous rencontrez le moindre souci ou si vous avez une question, n'hésitez pas à nous répondre — nous ferons notre maximum pour vous aider rapidement.\n\n` +
      `Cordialement,\nL'équipe TEXERRA SMS`,
  },
  {
    id: "satisfaction",
    label: "Vérification de satisfaction",
    preview: "Comment se passe votre expérience sur TEXERRA SMS ?",
    whatsappBody: (name) =>
      `Bonjour ${name} 👋\n\n` +
      `Nous serions très heureux d'avoir votre avis : comment se passe votre expérience sur TEXERRA SMS ?\n\n` +
      `Votre retour nous aide à nous améliorer et à mieux vous servir. Merci d'avance ! 🙏`,
    emailSubject: () => `Votre avis compte pour nous — TEXERRA SMS`,
    emailBody: (name) =>
      `Bonjour ${name},\n\n` +
      `Nous serions très heureux d'avoir votre avis : comment se passe votre expérience sur TEXERRA SMS ?\n\n` +
      `Votre retour nous aide à nous améliorer et à mieux vous servir.\n\n` +
      `Merci d'avance,\nL'équipe TEXERRA SMS`,
  },
  {
    id: "commercial",
    label: "Proposition commercial / affiliation",
    preview: "Gagnez 50 % de la marge en recommandant TEXERRA SMS…",
    whatsappBody: (name) =>
      `Bonjour ${name} 👋\n\n` +
      `Nous avons remarqué que vous utilisez régulièrement TEXERRA SMS et nous vous en remercions sincèrement 🙏\n\n` +
      `Nous avons une proposition à vous faire : vous pouvez désormais recommander ou revendre nos services et percevoir une commission correspondant à 50 % de la marge générée sur chaque commande.\n\n` +
      `Si cela vous intéresse, répondez simplement à ce message et nous vous expliquerons tout en détail. 🚀`,
    emailSubject: () => `TEXERRA SMS — Gagnez 50 % de la marge en nous recommandant`,
    emailBody: (name) =>
      `Bonjour ${name},\n\n` +
      `Nous avons remarqué que vous utilisez régulièrement TEXERRA SMS et nous vous en remercions sincèrement.\n\n` +
      `Nous avons une proposition à vous faire : vous pouvez désormais recommander ou revendre nos services et percevoir une commission correspondant à 50 % de la marge générée sur chaque commande.\n\n` +
      `Si cela vous intéresse, répondez simplement à cet e-mail et nous vous expliquerons tout en détail.\n\n` +
      `Bien cordialement,\nL'équipe TEXERRA SMS`,
  },
  {
    id: "fidelisation",
    label: "Fidélisation",
    preview: "Merci pour votre fidélité, nous tenons à vous…",
    whatsappBody: (name) =>
      `Bonjour ${name} 👋\n\n` +
      `Vous faites partie de nos clients les plus fidèles et nous tenons à vous remercier chaleureusement 🙏\n\n` +
      `Sachez que nous sommes toujours disponibles pour vous accompagner. À très bientôt sur TEXERRA SMS !`,
    emailSubject: () => `Merci pour votre fidélité — TEXERRA SMS`,
    emailBody: (name) =>
      `Bonjour ${name},\n\n` +
      `Vous faites partie de nos clients les plus fidèles et nous tenons à vous remercier chaleureusement.\n\n` +
      `Sachez que nous sommes toujours disponibles pour vous accompagner.\n\n` +
      `Chaleureusement,\nL'équipe TEXERRA SMS`,
  },
  {
    id: "remerciement",
    label: "Remerciement",
    preview: "Un grand merci pour votre confiance.",
    whatsappBody: (name) =>
      `Bonjour ${name} 👋\n\n` +
      `Un grand merci pour votre confiance et pour avoir choisi TEXERRA SMS. 🙏\n\n` +
      `Nous restons à votre entière disposition si vous avez la moindre question. À très bientôt !`,
    emailSubject: () => `Un grand merci de la part de TEXERRA SMS`,
    emailBody: (name) =>
      `Bonjour ${name},\n\n` +
      `Un grand merci pour votre confiance et pour avoir choisi TEXERRA SMS.\n\n` +
      `Nous restons à votre entière disposition si vous avez la moindre question.\n\n` +
      `À très bientôt,\nL'équipe TEXERRA SMS`,
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

  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
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
    ],
    queryFn: () =>
      apiFetch(
        `/users?page=${userPage}&pageSize=${userPageSize}&search=${encodeURIComponent(
          userSearchDebounced
        )}&filter=${userFilter}&sort=${userSort}`,
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
    email?: string
  ) {
    setMessageTarget({ name: name || "Client", channel, phone, email });
    setMessagePickerOpen(true);
  }

  function handleTemplateSelect(template: MessageTemplate) {
    if (!messageTarget) return;
    const displayName = messageTarget.name?.trim()
      ? messageTarget.name.trim()
      : "cher client";
    const fn = firstName(displayName);

    if (messageTarget.channel === "whatsapp") {
      if (!messageTarget.phone) {
        setToast("Pas de téléphone disponible");
        return;
      }
      const clean = cleanForWa(messageTarget.phone);
      const text = encodeURIComponent(template.whatsappBody(fn));
      window.open(`https://wa.me/${clean}?text=${text}`, "_blank", "noopener,noreferrer");
    } else {
      if (!messageTarget.email) {
        setToast("Pas d'email disponible");
        return;
      }
      const subject = encodeURIComponent(template.emailSubject(fn));
      const body = encodeURIComponent(template.emailBody(displayName));
      window.location.href = `mailto:${messageTarget.email}?subject=${subject}&body=${body}`;
    }
    setMessagePickerOpen(false);
    setMessageTarget(null);
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
    try {
      setExporting("users-csv");
      await downloadBlob(`/users/export?format=csv`, `utilisateurs-texerra.csv`, firebaseToken!);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  async function handleUsersVcf() {
    try {
      setExporting("users-vcf");
      await downloadBlob(`/users/export?format=vcf`, `contacts-texerra.vcf`, firebaseToken!);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  async function handleUsersPdf() {
    try {
      setExporting("users-pdf");
      const data = await apiFetch(`/users/export?format=json`, firebaseToken!);
      const users = data.users as any[];
      openPdfPrint(
        `Utilisateurs — annuaire complet`,
        [`Total : <b>${users.length}</b> utilisateurs`],
        ["Inscription", "Nom", "Email", "Téléphone", "Solde (€)", "Solde (FCFA)"],
        users.map((u) => [
          new Date(u.createdAt).toLocaleString("fr-FR"),
          u.name || "—",
          u.email || "—",
          u.phone || "—",
          u.balance?.toFixed(2) ?? "0.00",
          toCfa(u.balance ?? 0),
        ])
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExporting(null);
    }
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
                      const hasWa = isWhatsAppService(o.serviceCode);
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
                              {hasWa && o.phoneNumber && (
                                <ActionBtn
                                  title="Contacter sur WhatsApp"
                                  variant="whatsapp"
                                  onClick={() =>
                                    openMessagePicker(
                                      userName,
                                      "whatsapp",
                                      o.phoneNumber
                                    )
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
                                    openMessagePicker(userName, "email", undefined, userEmail)
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
                                    openMessagePicker(userName, "whatsapp", userPhone)
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
                                    openMessagePicker(userName, "whatsapp", userPhone)
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
                                    openMessagePicker(userName, "email", undefined, userEmail)
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
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Rechercher par nom, email, téléphone ou ID…"
                  className="flex-1 min-w-[220px] border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary/60"
                />
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
                        <th className="text-left p-2 font-medium">Inscription</th>
                        <th className="text-left p-2 font-medium">Nom</th>
                        <th className="text-left p-2 font-medium">E-mail</th>
                        <th className="text-left p-2 font-medium">Téléphone</th>
                        <th className="text-right p-2 font-medium">Solde (€)</th>
                        <th className="text-right p-2 font-medium">Solde (FCFA)</th>
                        <th className="text-right p-2 font-medium">Commandes</th>
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
                            <td className="p-2 whitespace-nowrap text-xs">
                              {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="p-2">{u.name || "—"}</td>
                            <td className="p-2 text-muted-foreground text-xs">
                              {u.email || "—"}
                            </td>
                            <td className="p-2 font-mono text-xs">{u.phone || "—"}</td>
                            <td className="p-2 text-right font-medium">
                              {u.balance.toFixed(2)} €
                            </td>
                            <td className="p-2 text-right text-muted-foreground">
                              {toCfa(u.balance)}
                            </td>
                            <td className="p-2 text-right whitespace-nowrap">
                              <span
                                className="inline-flex items-center gap-1"
                                title={`Total : ${s.totalOrders ?? 0} · En cours : ${
                                  s.activeOrders ?? 0
                                } · En attente : ${s.pendingOrders ?? 0} · Annulées : ${
                                  s.cancelledOrders ?? 0
                                } · Expirées : ${s.expiredOrders ?? 0}`}
                              >
                                <span className="inline-flex items-center justify-center text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {s.completedOrders ?? 0}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  / {s.totalOrders ?? 0}
                                </span>
                              </span>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-center gap-1">
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
                                          u.phone
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
                                          u.email
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
                            colSpan={8}
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
              {MESSAGE_TEMPLATES.map((t) => (
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