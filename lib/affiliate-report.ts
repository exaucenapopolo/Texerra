// Fichier : src/lib/affiliate-report.ts

/**
 * Helpers pour la génération de rapports PDF + email.
 * Aucune dépendance serveur — tout fonctionne côté client.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ClientRow, CommissionRow } from "./affiliate-api";

/* ═══════════════════════════════════════════════════════════
 * 1. FILTRES DE DATE
 * ═══════════════════════════════════════════════════════════ */

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "year"
  | "custom";

export interface DateRange {
  start: Date | null;
  end: Date | null;
  label: string;
}

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "today", label: "Aujourd'hui" },
  { value: "yesterday", label: "Hier" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "year", label: "Cette année" },
  { value: "custom", label: "Personnalisé" },
];

export function getDateRange(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { start: todayStart, end: null, label: "Aujourd'hui" };
    case "yesterday": {
      const y = new Date(todayStart);
      y.setDate(y.getDate() - 1);
      return { start: y, end: todayStart, label: "Hier" };
    }
    case "week": {
      const day = todayStart.getDay();
      const diff = day === 0 ? 6 : day - 1; // lundi = 1er jour
      const start = new Date(todayStart);
      start.setDate(start.getDate() - diff);
      return { start, end: null, label: "Cette semaine" };
    }
    case "month": {
      const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
      return { start, end: null, label: "Ce mois-ci" };
    }
    case "year": {
      const start = new Date(todayStart.getFullYear(), 0, 1);
      return { start, end: null, label: "Cette année" };
    }
    case "custom": {
      const s = customStart ? new Date(customStart + "T00:00:00") : null;
      const e = customEnd ? new Date(customEnd + "T23:59:59") : null;
      let label = "Période personnalisée";
      if (customStart && customEnd) {
        label = `Du ${formatDateShort(customStart)} au ${formatDateShort(customEnd)}`;
      }
      return { start: s, end: e, label };
    }
    case "all":
    default:
      return { start: null, end: null, label: "Tout l'historique" };
  }
}

export function isInRange(iso: string | undefined, range: DateRange): boolean {
  if (!iso) return false;
  if (!range.start && !range.end) return true;
  const d = new Date(iso);
  if (range.start && d < range.start) return false;
  if (range.end && d > range.end) return false;
  return true;
}

/* ═══════════════════════════════════════════════════════════
 * 2. FORMATAGE
 * ═══════════════════════════════════════════════════════════ */

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

/* ═══════════════════════════════════════════════════════════
 * 3. TYPES DE RAPPORT
 * ═══════════════════════════════════════════════════════════ */

export interface ReportPayload {
  commercial: {
    name: string;
    email: string;
    affiliateCode: string;
    commissionRate: number;
  };
  period: string;
  /** Pays et ville — remplis par le commercial dans le PDF/email */
  country: string;
  city: string;
  kpis: {
    clientsCount: number;
    totalSales: number;
    totalCommissions: number;
    available: number;
    totalPaid: number;
  };
  clients: ClientRow[];
  commissions: CommissionRow[];
}

/* ═══════════════════════════════════════════════════════════
 * 4. GÉNÉRATION PDF
 * ═══════════════════════════════════════════════════════════ */

export function generateReportPdf(data: ReportPayload): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ─── HEADER BANDEAU ───
  doc.setFillColor(249, 115, 22); // orange-500
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Texerra SMS", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport d'activité commerciale", 14, 22);

  // ─── INFOS COMMERCIAL ───
  doc.setTextColor(30, 30, 30);
  let y = 40;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Informations du commercial", 14, y);
  y += 3;
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 7;

  doc.setFontSize(10);
  const infoRows: [string, string][] = [
    ["Nom", data.commercial.name],
    ["Code d'affiliation", data.commercial.affiliateCode],
    ["Email", data.commercial.email],
    ["Taux de commission", `${data.commercial.commissionRate}%`],
    ["Période", data.period],
    ["Pays", data.country || "________________"],
    ["Ville", data.city || "________________"],
  ];
  for (const [k, v] of infoRows) {
    doc.setFont("helvetica", "bold");
    doc.text(`${k} :`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, 60, y);
    y += 6;
  }

  // ─── KPIs ───
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Clients apportés", String(data.kpis.clientsCount)],
      ["Ventes générées", formatEur(data.kpis.totalSales)],
      ["Commissions gagnées", formatEur(data.kpis.totalCommissions)],
      ["Disponible au retrait", formatEur(data.kpis.available)],
      ["Déjà payé", formatEur(data.kpis.totalPaid)],
    ],
    theme: "striped",
    headStyles: { fillColor: [249, 115, 22], textColor: 255 },
    styles: { fontSize: 10 },
  });

  // ─── CLIENTS ───
  const finalY1 = (doc as any).lastAutoTable?.finalY ?? y;
  if (data.clients.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    autoTable(doc, {
      startY: finalY1 + 10,
      head: [["Client", "Email", "Date d'attribution", "Source"]],
      body: data.clients.map((c) => [
        c.name,
        c.email,
        formatDate(c.attributedAt),
        c.source === "link" ? "Lien" : "Admin",
      ]),
      theme: "grid",
      headStyles: { fillColor: [249, 115, 22], textColor: 255 },
      styles: { fontSize: 9 },
    });
  }

  // ─── COMMISSIONS ───
  const finalY2 = (doc as any).lastAutoTable?.finalY ?? finalY1;
  if (data.commissions.length > 0) {
    autoTable(doc, {
      startY: finalY2 + 10,
      head: [["Commande", "Vente", "Taux", "Commission", "Statut", "Date"]],
      body: data.commissions.map((c) => [
        `#${c.orderId.slice(0, 8)}`,
        formatEur(c.orderAmount),
        `${c.commissionRate}%`,
        formatEur(c.commissionAmount),
        c.status,
        formatDate(c.createdAt),
      ]),
      theme: "grid",
      headStyles: { fillColor: [249, 115, 22], textColor: 255 },
      styles: { fontSize: 9 },
    });
  }

  // ─── PIED DE PAGE ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Généré le ${new Date().toLocaleString("fr-FR")} — Page ${i}/${pageCount}`,
      14,
      pageHeight - 8
    );
    doc.text("texerra.sms@gmail.com", pageWidth - 14, pageHeight - 8, {
      align: "right",
    });
  }

  return doc;
}

export function downloadReportPdf(data: ReportPayload) {
  const doc = generateReportPdf(data);
  const safeName = data.commercial.affiliateCode.replace(/[^A-Z0-9-]/gi, "");
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`rapport-${safeName}-${date}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
 * 5. EMAIL VERS LA DIRECTION
 * ═══════════════════════════════════════════════════════════ */

const REPORT_RECIPIENT = "texerra.sms@gmail.com";
const MAILTO_BODY_LIMIT = 1500; // limite de sécurité (~2000 max en pratique)

export function buildReportEmailBody(
  data: ReportPayload,
  maxItemsPerSection = 15
): string {
  const lines: string[] = [
    `Rapport d'activité commerciale — Texerra SMS`,
    ``,
    `Bonjour l'équipe,`,
    ``,
    `Voici mon rapport d'activité pour la période : ${data.period}.`,
    ``,
    `─── INFORMATIONS ───`,
    `Nom : ${data.commercial.name}`,
    `Code : ${data.commercial.affiliateCode}`,
    `Email : ${data.commercial.email}`,
    `Taux appliqué : ${data.commercial.commissionRate}%`,
    `Pays : ${data.country || "[à compléter]"}`,
    `Ville : ${data.city || "[à compléter]"}`,
    ``,
    `─── INDICATEURS ───`,
    `Clients apportés : ${data.kpis.clientsCount}`,
    `Ventes générées : ${formatEur(data.kpis.totalSales)}`,
    `Commissions gagnées : ${formatEur(data.kpis.totalCommissions)}`,
    `Disponible au retrait : ${formatEur(data.kpis.available)}`,
    `Déjà payé : ${formatEur(data.kpis.totalPaid)}`,
    ``,
  ];

  if (data.clients.length > 0) {
    lines.push(`─── CLIENTS (${data.clients.length}) ───`);
    const shown = data.clients.slice(0, maxItemsPerSection);
    for (const c of shown) {
      lines.push(`• ${c.name} | ${c.email} | ${formatDate(c.attributedAt)}`);
    }
    if (data.clients.length > maxItemsPerSection) {
      lines.push(
        `... et ${data.clients.length - maxItemsPerSection} autres (voir PDF)`
      );
    }
    lines.push("");
  }

  if (data.commissions.length > 0) {
    lines.push(`─── COMMISSIONS (${data.commissions.length}) ───`);
    const shown = data.commissions.slice(0, maxItemsPerSection);
    for (const c of shown) {
      lines.push(
        `• #${c.orderId.slice(0, 8)} | Vente ${formatEur(c.orderAmount)} | Commission ${formatEur(c.commissionAmount)} | ${c.status}`
      );
    }
    if (data.commissions.length > maxItemsPerSection) {
      lines.push(
        `... et ${data.commissions.length - maxItemsPerSection} autres (voir PDF)`
      );
    }
    lines.push("");
  }

  lines.push(`───`);
  lines.push(`Rapport généré automatiquement depuis l'espace commercial Texerra SMS.`);
  lines.push(`Le PDF correspondant est disponible en pièce jointe.`);
  lines.push(``);
  lines.push(`Cordialement,`);
  lines.push(data.commercial.name);

  return lines.join("\n");
}

export function openReportEmail(data: ReportPayload) {
  const subject = `Rapport commercial — ${data.commercial.name} — ${data.period}`;
  let body = buildReportEmailBody(data);

  // Tronquer si trop long (les clients mail limitent l'URL mailto)
  if (body.length > MAILTO_BODY_LIMIT) {
    body =
      body.slice(0, MAILTO_BODY_LIMIT) +
      "\n\n[...] Contenu tronqué. Voir le PDF joint pour les détails complets.";
  }

  const url = `mailto:${REPORT_RECIPIENT}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  window.location.href = url;
}

export const REPORT_EMAIL = REPORT_RECIPIENT;
