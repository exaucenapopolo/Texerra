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


/**
 * Génère le PDF de l'export administrateur complet reçu depuis
 * GET /api/admin/export/full?format=json. Les sections utilisent toutes les
 * lignes renvoyées par l'API et indiquent si le plafond serveur a été atteint.
 */
export function downloadAdminFullDataPdf(data: any, filename = "texerra-export-administrateur.pdf"): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const users = Array.isArray(data?.users) ? data.users : [];
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const topups = Array.isArray(data?.topups) ? data.topups : [];
  const affiliation = data?.affiliation ?? {};
  const commercials = Array.isArray(affiliation.commercials) ? affiliation.commercials : [];
  const commissions = Array.isArray(affiliation.commissions) ? affiliation.commissions : [];
  const attributions = Array.isArray(affiliation.attributions) ? affiliation.attributions : [];
  const withdrawals = Array.isArray(affiliation.withdrawals) ? affiliation.withdrawals : [];
  const completedOrders = orders.filter((row: any) => row.status === "completed");
  const amount = (row: any, primary: string, secondary?: string) => Number(row?.[primary] ?? (secondary ? row?.[secondary] : 0) ?? 0) || 0;
  const money = (value: number) => `${value.toFixed(2)} €`;
  const displayDate = (value: any) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("fr-FR");
  };
  const revenue = completedOrders.reduce((sum: number, row: any) => sum + amount(row, "priceNum", "price"), 0);
  const margin = completedOrders.reduce((sum: number, row: any) => {
    const price = amount(row, "priceNum", "price");
    const rawMargin = row?.marginNum ?? row?.margin;
    const actualMargin = rawMargin === null || rawMargin === undefined || rawMargin === "" ? NaN : Number(rawMargin);
    return sum + (Number.isFinite(actualMargin) ? actualMargin : price * 0.65);
  }, 0);
  const generatedAt = displayDate(data?.generatedAt ?? new Date().toISOString());
  const periodStart = String(data?.period?.start ?? "").slice(0, 10);
  const periodEnd = String(data?.period?.end ?? "").slice(0, 10);

  doc.setFillColor(201, 95, 45);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Texerra SMS — Export administrateur", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Période : ${periodStart || "—"} au ${periodEnd || "—"}  |  Généré le ${generatedAt}`, margin, 19);

  autoTable(doc, {
    startY: 31,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Utilisateurs exportés", users.length], ["Commandes exportées", orders.length],
      ["Commandes réussies", completedOrders.length], ["Chiffre d'affaires réussi", money(revenue)],
      ["Marge des commandes réussies", money(margin)], ["Dépôts exportés", topups.length],
      ["Dépôts réussis", topups.filter((row: any) => row.status === "completed").length],
      ["Commerciaux", commercials.length], ["Commissions", commissions.length],
      ["Attributions clients", attributions.length], ["Retraits", withdrawals.length],
      ["Export partiel (plafond serveur atteint)", data?.coverage?.truncated ? "Oui — consulter la période ou le JSON" : "Non"],
    ],
    theme: "grid",
    headStyles: { fillColor: [201, 95, 45], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: margin, right: margin },
  });

  const addSection = (title: string, headers: string[], rows: any[][]) => {
    doc.addPage("a4", "landscape");
    doc.setTextColor(35, 40, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, margin, 13);
    autoTable(doc, {
      startY: 19,
      head: [headers],
      body: rows.length ? rows : [["Aucune donnée", ...headers.slice(1).map(() => "")]],
      theme: "grid",
      headStyles: { fillColor: [201, 95, 45], textColor: 255 },
      styles: { fontSize: 6.5, cellPadding: 1.6, overflow: "linebreak" },
      bodyStyles: { textColor: [45, 50, 55] },
      margin: { left: margin, right: margin, bottom: 13 },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
    });
  };

  addSection("Utilisateurs", ["UID", "Inscription", "Nom", "E-mail", "Téléphone", "Pays", "Solde"], users.map((row: any) => [row.id, displayDate(row.createdAt), row.name ?? "", row.email ?? "", row.phone ?? "", row.countryName ?? row.countryIso ?? "", money(amount(row, "balance"))]));
  addSection("Commandes", ["ID", "UID utilisateur", "Date", "Service", "Pays", "Numéro", "Statut", "Prix", "Marge"], orders.map((row: any) => [row.id, row.userId ?? "", displayDate(row.createdAt), row.serviceName ?? row.serviceCode ?? "", row.countryName ?? row.countryCode ?? "", row.phoneNumber ?? "", row.status ?? "", money(amount(row, "priceNum", "price")), money(amount(row, "marginNum", "margin"))]));
  addSection("Dépôts", ["ID", "UID utilisateur", "Date", "Montant EUR", "Montant local", "Devise", "Pays", "Statut", "Référence"], topups.map((row: any) => [row.id, row.userId ?? "", displayDate(row.createdAt), money(amount(row, "amountEurNum", "amountEur")), amount(row, "amountLocal"), row.localCurrency ?? "", row.countryIso ?? "", row.status ?? "", row.externalId ?? ""]));
  addSection("Commerciaux", ["ID", "Nom", "E-mail", "Pays", "Code affilié", "UID Firebase", "Statut", "Taux %"], commercials.map((row: any) => [row.id, row.name ?? "", row.email ?? "", row.country ?? "", row.affiliateCode ?? "", row.firebaseUid ?? "", row.status ?? "", amount(row, "commissionRate")]));
  addSection("Commissions", ["ID", "Commercial", "Client", "Commande", "Vente", "Marge", "Commission", "Statut", "Date"], commissions.map((row: any) => [row.id, row.commercialId ?? "", row.customerId ?? "", row.orderId ?? "", money(amount(row, "orderAmount")), money(amount(row, "orderMargin")), money(amount(row, "commissionAmount")), row.status ?? "", displayDate(row.createdAt)]));
  addSection("Attributions", ["ID", "Commercial", "Client", "Code affilié", "Source", "Date"], attributions.map((row: any) => [row.id, row.commercialId ?? "", row.customerId ?? "", row.affiliateCode ?? "", row.source ?? "", displayDate(row.createdAt)]));
  addSection("Retraits", ["ID", "Commercial", "Montant", "Statut", "Méthode", "Date demande", "Date mise à jour"], withdrawals.map((row: any) => [row.id, row.commercialId ?? "", money(amount(row, "amount")), row.status ?? "", row.method ?? "", displayDate(row.requestedAt), displayDate(row.updatedAt)]));

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 125, 130);
    doc.text(`Texerra SMS · Document administratif · ${page}/${pages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 5, { align: "right" });
  }
  doc.save(filename);
}
