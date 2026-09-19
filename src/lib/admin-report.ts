// Fichier : src/lib/admin-report.ts

/**
 * Helpers pour le dashboard administrateur.
 * - Conversion EUR → FCFA (parité fixe 1 EUR = 655.957 XAF)
 * - Génération PDF de rapports admin
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ═══════════════════════════════════════════════════════════
 * CONVERSION EUR → FCFA
 * ═══════════════════════════════════════════════════════════ */

/** Parité fixe officielle : 1 EUR = 655.957 FCFA (XAF/XOF) */
export const EUR_TO_FCFA = 655.957;

export function toFcfa(eur: number): number {
  return Math.round(eur * EUR_TO_FCFA);
}

export function formatFcfa(eur: number): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(toFcfa(eur)) + " FCFA"
  );
}

export function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function formatDual(eur: number): string {
  return `${formatEur(eur)} • ${formatFcfa(eur)}`;
}

/* ═══════════════════════════════════════════════════════════
 * TYPES
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

export interface AdminReportPayload {
  period: string;
  generatedAt: string;
  global: {
    totalSales: number;
    totalCommissions: number;
    availableCommissions: number;
    reserved: number;
    totalPaid: number;
    activeCommercials: number;
    totalAttributions: number;
  };
  leaderboard: LeaderboardRow[];
}

/* ═══════════════════════════════════════════════════════════
 * GÉNÉRATION PDF ADMIN
 * ═══════════════════════════════════════════════════════════ */

export function generateAdminReportPdf(data: AdminReportPayload): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ─── HEADER ───
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Texerra SMS — Rapport Administrateur", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Période : ${data.period}`, 14, 22);

  // ─── KPIs GLOBAUX ───
  let y = 40;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Indicateurs globaux", 14, y);
  y += 3;
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Indicateur", "EUR", "FCFA"]],
    body: [
      [
        "Ventes affiliées",
        formatEur(data.global.totalSales),
        formatFcfa(data.global.totalSales),
      ],
      [
        "Commissions générées",
        formatEur(data.global.totalCommissions),
        formatFcfa(data.global.totalCommissions),
      ],
      [
        "Commissions disponibles",
        formatEur(data.global.availableCommissions),
        formatFcfa(data.global.availableCommissions),
      ],
      [
        "Réservé (retraits en cours)",
        formatEur(data.global.reserved),
        formatFcfa(data.global.reserved),
      ],
      [
        "Total payé",
        formatEur(data.global.totalPaid),
        formatFcfa(data.global.totalPaid),
      ],
      ["Commerciaux actifs", String(data.global.activeCommercials), "—"],
      ["Clients attribués", String(data.global.totalAttributions), "—"],
    ],
    theme: "striped",
    headStyles: { fillColor: [249, 115, 22], textColor: 255 },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 55, halign: "right" },
      2: { cellWidth: 55, halign: "right" },
    },
  });

  // ─── CLASSEMENT ───
  const finalY1 = (doc as any).lastAutoTable?.finalY ?? y;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Classement des commerciaux", 14, finalY1 + 12);

  const leaderboardBody = data.leaderboard.map((r) => [
    `#${r.rank}`,
    r.name,
    r.affiliateCode,
    String(r.clientsCount),
    String(r.salesCount),
    formatEur(r.totalSales),
    formatEur(r.totalCommissions),
    formatFcfa(r.totalCommissions),
  ]);

  autoTable(doc, {
    startY: finalY1 + 16,
    head: [
      [
        "Rang",
        "Nom",
        "Code",
        "Clients",
        "Ventes",
        "Ventes (€)",
        "Comm. (€)",
        "Comm. (FCFA)",
      ],
    ],
    body: leaderboardBody,
    theme: "grid",
    headStyles: { fillColor: [249, 115, 22], textColor: 255 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 35 },
      2: { cellWidth: 22 },
      3: { cellWidth: 15, halign: "right" },
      4: { cellWidth: 15, halign: "right" },
      5: { cellWidth: 25, halign: "right" },
      6: { cellWidth: 25, halign: "right" },
      7: { cellWidth: 28, halign: "right" },
    },
  });

  // ─── FOOTER ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Généré le ${new Date(data.generatedAt).toLocaleString("fr-FR")}`,
      14,
      pageHeight - 8
    );
    doc.text(
      `Page ${i}/${pageCount}`,
      pageWidth - 14,
      pageHeight - 8,
      { align: "right" }
    );
  }

  return doc;
}

export function downloadAdminReport(data: AdminReportPayload) {
  const doc = generateAdminReportPdf(data);
  const date = new Date().toISOString().slice(0, 10);
  const safePeriod = data.period.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  doc.save(`rapport-admin-${safePeriod}-${date}.pdf`);
}

/* ═══════════════════════════════════════════════════════════
 * MÉDAILLES
 * ═══════════════════════════════════════════════════════════ */

export function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export function rankColor(rank: number): string {
  if (rank === 1) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  if (rank === 2) return "text-gray-600 bg-gray-100 border-gray-300";
  if (rank === 3) return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-gray-500 bg-gray-50 border-gray-200";
}
