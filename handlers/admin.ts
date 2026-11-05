import { Router, type Request, type Response } from "express";
import { firestoreDb, getAdminAuth } from "../lib/firebase-admin.js";
import { requireAdmin } from "../lib/requireAuth.js";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { sendAdminContactEmail } from "../lib/mailer.js";

const router = Router();

/**
 * Taux de secours utilisé uniquement pour les anciennes commandes qui
 * n'ont réellement aucun champ de marge (marginNum / margin).
 * La marge réelle enregistrée (marginNum) reste prioritaire partout.
 */
const MARGIN_RATE = 0.65;

/** Plafond d'extraction pour les agrégations en mémoire. */
const MAX_FETCH = 50000;

/* ────────────────────────────────────────────────────────────────── */
/* Helpers                                                            */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Parse "YYYY-MM-DD" en date locale (minuit local pour start, 23:59:59.999
 * local pour end). Évite les décalages de fuseau dus à new Date("YYYY-MM-DD").
 */
function parseLocalDate(str: string, endOfDay: boolean): Date {
  const parts = str.split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
  }
  const d = new Date(str);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

function parseRange(req: Request): { startIso: string; endIso: string } {
  const now = new Date();
  const startParam = req.query.start as string | undefined;
  const endParam = req.query.end as string | undefined;

  if (startParam && endParam) {
    const start = parseLocalDate(startParam, false);
    const end = parseLocalDate(endParam, true);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function parsePagination(req: Request, defaultSize = 20): { page: number; pageSize: number } {
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const raw = parseInt(req.query.pageSize as string) || defaultSize;
  const pageSize = Math.min(Math.max(raw, 5), 200);
  return { page, pageSize };
}

function getCreatedAtIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in (value as object)) {
    try {
      return (value as Timestamp).toDate().toISOString();
    } catch {
      return new Date(0).toISOString();
    }
  }
  return new Date(0).toISOString();
}

function num(v: unknown, fallback: number | null = null): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function escapeCsv(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes(";")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(",");
}


/** Excel 2003 XML Workbook : permet de fournir un vrai classeur multi-feuilles
 * sans ajouter de dépendance lourde au projet ou à Vercel. */
function xmlEscape(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[char] as string));
}

function spreadsheetXml(sheets: Array<{ name: string; headers: string[]; rows: unknown[][] }>): string {
  const worksheetXml = sheets.map((sheet) => {
    const renderRow = (values: unknown[], header = false) => `<Row>${values.map((value) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return `<Cell${header ? ' ss:StyleID="Header"' : ""}><Data ss:Type="Number">${value}</Data></Cell>`;
      }
      if (typeof value === "boolean") {
        return `<Cell${header ? ' ss:StyleID="Header"' : ""}><Data ss:Type="String">${value ? "Oui" : "Non"}</Data></Cell>`;
      }
      let normalized = value;
      if (normalized && typeof normalized === "object") {
        if ("toDate" in (normalized as object)) {
          try { normalized = (normalized as Timestamp).toDate().toISOString(); } catch { normalized = ""; }
        } else if (normalized instanceof Date) normalized = normalized.toISOString();
        else normalized = JSON.stringify(normalized);
      }
      return `<Cell${header ? ' ss:StyleID="Header"' : ""}><Data ss:Type="String">${xmlEscape(normalized)}</Data></Cell>`;
    }).join("")}</Row>`;
    return `<Worksheet ss:Name="${xmlEscape(sheet.name.slice(0, 31))}"><Table>${renderRow(sheet.headers, true)}${sheet.rows.map((row) => renderRow(row)).join("")}</Table></Worksheet>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">` +
    `<Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#A84B25" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style></Styles>${worksheetXml}</Workbook>`;
}

function sendExcelWorkbook(
  res: Response,
  filename: string,
  sheets: Array<{ name: string; headers: string[]; rows: unknown[][] }>
): void {
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(`\uFEFF${spreadsheetXml(sheets)}`);
}

/**
 * Renvoie la marge réelle d'une commande.
 * Priorité : marginNum > margin (string/number) > null (fallback externe).
 */
function computeOrderMargin(d: any): number | null {
  const m = num(d?.marginNum) ?? num(d?.margin);
  return m;
}

type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
};

/**
 * Récupère un lot d'utilisateurs par leurs IDs (batch getAll).
 * Renvoie une Map id → informations publiques.
 */
async function fetchUsersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
  const map = new Map<string, PublicUser>();
  const unique = Array.from(new Set(ids.filter((x) => typeof x === "string" && x.length > 0)));
  if (unique.length === 0) return map;

  const CHUNK = 200;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const refs = chunk.map((id) => firestoreDb.collection("users").doc(id));
    try {
      const docs = await firestoreDb.getAll(...refs);
      for (const doc of docs) {
        if (!doc.exists) continue;
        const d = doc.data() as any;
        map.set(doc.id, {
          id: doc.id,
          name: d?.name ?? "",
          email: d?.email ?? "",
          phone: d?.phone ?? "",
          balance: num(d?.balance, 0) ?? 0,
        });
      }
    } catch (err) {
      console.error("fetchUsersByIds chunk error:", err);
    }
  }
  return map;
}

/** Date de tri compatible avec les anciens ISO et les Timestamp Firestore. */
function profileDateMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "toDate" in (value as object)) {
    try { return (value as Timestamp).toDate().getTime(); } catch { return 0; }
  }
  const time = new Date(String(value ?? "")).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** Lecture optimisée, avec solution de repli si l'index de tri manque. */
async function getProfileOrders(userId: string, limit = 25): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const base = firestoreDb.collection("orders").where("userId", "==", userId);
  try {
    return (await base.orderBy("createdAt", "desc").limit(limit).get()).docs;
  } catch (error) {
    console.warn("Profile orders: indexed query failed; bounded fallback:", error);
    const fallback = await base.limit(1000).get();
    return fallback.docs.slice().sort((a, b) => profileDateMillis(b.data().createdAt) - profileDateMillis(a.data().createdAt)).slice(0, limit);
  }
}

/** Les count() sont préférés pour ne pas télécharger tous les documents. */
async function getProfileOrderCounts(userId: string): Promise<{ total: number; completed: number }> {
  const base = firestoreDb.collection("orders").where("userId", "==", userId);
  const [totalResult, completedResult] = await Promise.allSettled([
    base.count().get(),
    base.where("status", "==", "completed").count().get(),
  ]);
  if (totalResult.status === "fulfilled" && completedResult.status === "fulfilled") {
    return { total: totalResult.value.data().count, completed: completedResult.value.data().count };
  }
  console.warn("Profile order count aggregation failed; bounded fallback.");
  const docs = await base.limit(5000).get();
  return {
    total: totalResult.status === "fulfilled" ? totalResult.value.data().count : docs.size,
    completed: completedResult.status === "fulfilled" ? completedResult.value.data().count : docs.docs.filter((doc) => doc.data().status === "completed").length,
  };
}

async function getProfileContactHistory(userRef: FirebaseFirestore.DocumentReference, limit = 20) {
  const history = userRef.collection("contactHistory");
  try {
    const snap = await history.orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn("Profile contact history ordered query failed; bounded fallback:", error);
    const snap = await history.limit(limit).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => profileDateMillis(b.createdAt) - profileDateMillis(a.createdAt));
  }
}

/* ────────────────────────────────────────────────────────────────── */
/* OBJECTIFS MENSUELS ADMIN                                           */
/* Les objectifs sont conservés par mois dans Firestore.              */
/* Les résultats sont calculés à partir des données réelles.          */
/* Fuseau métier : Africa/Douala.                                     */
/* ────────────────────────────────────────────────────────────────── */

type MonthlyObjectiveTargets = {
  newUsers: number;
  completedTopups: number;
  topupAmount: number;
  completedOrders: number;
  revenue: number;
  margin: number;
};

const MONTHLY_OBJECTIVE_KEYS: Array<keyof MonthlyObjectiveTargets> = [
  "newUsers", "completedTopups", "topupAmount",
  "completedOrders", "revenue", "margin",
];

function getDoualaDateParts(date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Limites d'une journée locale à Douala (UTC+1). */
function getDoualaBoundaryIso(year: number, month: number, day: number, endOfDay: boolean): string {
  const date = endOfDay
    ? new Date(Date.UTC(year, month - 1, day, 22, 59, 59, 999))
    : new Date(Date.UTC(year, month - 1, day, -1, 0, 0, 0));
  return date.toISOString();
}

function normalizeMonthlyObjectiveTargets(value: any): MonthlyObjectiveTargets {
  const result = {} as MonthlyObjectiveTargets;
  for (const key of MONTHLY_OBJECTIVE_KEYS) {
    const parsed = num(value?.[key], 0) ?? 0;
    result[key] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
  return result;
}

async function readMonthlyObjectiveMetrics(
  year: number,
  month: number,
  elapsedDays: number
): Promise<{
  newUsers: number;
  completedTopups: number;
  topupAmount: number;
  completedOrders: number;
  revenue: number;
  margin: number;
  truncated: boolean;
  scannedOrders: number;
  scannedTopups: number;
}> {
  const empty = {
    newUsers: 0, completedTopups: 0, topupAmount: 0,
    completedOrders: 0, revenue: 0, margin: 0,
    truncated: false, scannedOrders: 0, scannedTopups: 0,
  };
  if (elapsedDays < 1) return empty;

  const startIso = getDoualaBoundaryIso(year, month, 1, false);
  const endIso = getDoualaBoundaryIso(year, month, elapsedDays, true);
  const usersQuery = firestoreDb.collection("users")
    .where("createdAt", ">=", startIso).where("createdAt", "<=", endIso);
  const topupsQuery = firestoreDb.collection("topups")
    .where("status", "==", "completed")
    .where("createdAt", ">=", startIso).where("createdAt", "<=", endIso);
  const ordersQuery = firestoreDb.collection("orders")
    .where("status", "==", "completed")
    .where("createdAt", ">=", startIso).where("createdAt", "<=", endIso);

  const [usersCountSnap, topupsCountSnap, ordersCountSnap, topupsDataSnap, ordersDataSnap] =
    await Promise.all([
      usersQuery.count().get(),
      topupsQuery.count().get(),
      ordersQuery.count().get(),
      topupsQuery.limit(MAX_FETCH).get(),
      ordersQuery.limit(MAX_FETCH).get(),
    ]);

  let topupAmount = 0;
  for (const doc of topupsDataSnap.docs) {
    const data = doc.data();
    topupAmount += num(data.amountEurNum) ?? num(data.amountEur, 0) ?? 0;
  }

  let revenue = 0;
  let margin = 0;
  for (const doc of ordersDataSnap.docs) {
    const data = doc.data();
    const price = num(data.priceNum) ?? num(data.price, 0) ?? 0;
    const realMargin = computeOrderMargin(data);
    revenue += price;
    margin += realMargin != null ? realMargin : price * MARGIN_RATE;
  }

  const newUsers = usersCountSnap.data().count;
  const completedTopups = topupsCountSnap.data().count;
  const completedOrders = ordersCountSnap.data().count;
  return {
    newUsers, completedTopups, topupAmount, completedOrders, revenue, margin,
    truncated: completedTopups > topupsDataSnap.size || completedOrders > ordersDataSnap.size,
    scannedOrders: ordersDataSnap.size,
    scannedTopups: topupsDataSnap.size,
  };
}

/**
 * GET /api/admin/objectives?month=YYYY-MM
 * Progression du mois et comparaison avec la même durée du mois précédent.
 */
router.get("/objectives", requireAdmin, async (req: Request, res: Response) => {
  try {
    const monthKey = String(req.query.month ?? "");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
      res.status(400).json({ error: "Mois invalide. Format attendu : YYYY-MM." });
      return;
    }

    const [year, month] = monthKey.split("-").map(Number);
    if (year < 2020 || year > 2100) {
      res.status(400).json({ error: "Année hors limites." });
      return;
    }

    const today = getDoualaDateParts();
    const selectedIndex = year * 12 + month - 1;
    const currentIndex = today.year * 12 + today.month - 1;
    const daysInMonth = getDaysInMonth(year, month);
    const elapsedDays = selectedIndex < currentIndex
      ? daysInMonth
      : selectedIndex === currentIndex ? today.day : 0;
    const remainingDays = selectedIndex === currentIndex
      ? Math.max(0, daysInMonth - elapsedDays + 1)
      : Math.max(0, daysInMonth - elapsedDays);

    const previousDate = new Date(Date.UTC(year, month - 2, 1));
    const previousYear = previousDate.getUTCFullYear();
    const previousMonth = previousDate.getUTCMonth() + 1;
    const previousDaysInMonth = getDaysInMonth(previousYear, previousMonth);
    const previousElapsedDays = elapsedDays > 0
      ? Math.min(elapsedDays, previousDaysInMonth)
      : 0;

    const [objectiveSnap, actual, previous] = await Promise.all([
      firestoreDb.collection("adminMonthlyObjectives").doc(monthKey).get(),
      readMonthlyObjectiveMetrics(year, month, elapsedDays),
      readMonthlyObjectiveMetrics(previousYear, previousMonth, previousElapsedDays),
    ]);

    const saved = objectiveSnap.exists ? objectiveSnap.data() : null;
    res.json({
      month: monthKey,
      hasObjective: Boolean(saved),
      targets: normalizeMonthlyObjectiveTargets(saved?.targets),
      actual,
      previous,
      period: {
        daysInMonth, elapsedDays, remainingDays,
        previousMonth: `${previousYear}-${String(previousMonth).padStart(2, "0")}`,
        previousElapsedDays,
      },
      truncated: actual.truncated || previous.truncated,
    });
  } catch (err) {
    console.error("Admin monthly objectives error:", err);
    res.status(500).json({
      error: "Erreur lors du calcul des objectifs mensuels",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

/** Crée ou met à jour les six objectifs du mois sélectionné. */
router.put("/objectives", requireAdmin, async (req: Request, res: Response) => {
  try {
    const monthKey = String(req.body?.month ?? "");
    const rawTargets = req.body?.targets;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
      res.status(400).json({ error: "Mois invalide. Format attendu : YYYY-MM." });
      return;
    }
    if (!rawTargets || typeof rawTargets !== "object" || Array.isArray(rawTargets)) {
      res.status(400).json({ error: "Les objectifs du mois sont obligatoires." });
      return;
    }

    const targets = {} as MonthlyObjectiveTargets;
    for (const key of MONTHLY_OBJECTIVE_KEYS) {
      const raw = rawTargets[key];
      const parsed = raw === "" || raw == null ? 0 : Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000) {
        res.status(400).json({ error: `Valeur invalide pour l'objectif : ${key}.` });
        return;
      }
      targets[key] = parsed;
    }

    const ref = firestoreDb.collection("adminMonthlyObjectives").doc(monthKey);
    const existing = await ref.get();
    await ref.set({
      month: monthKey,
      targets,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });

    res.json({ ok: true, month: monthKey, targets });
  } catch (err) {
    console.error("Admin monthly objectives save error:", err);
    res.status(500).json({
      error: "Impossible d'enregistrer les objectifs mensuels",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/stats                                               */
/* Multi-pays : aucune restriction par pays.                          */
/* Marge : somme des marginNum réels (fallback MARGIN_RATE).          */
/* ────────────────────────────────────────────────────────────────── */

router.get("/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const usersCol = firestoreDb.collection("users");
    const ordersCol = firestoreDb.collection("orders");
    const topupsCol = firestoreDb.collection("topups");

    const [
      totalUsersSnap,
      newUsersSnap,
      totalOrdersSnap,
      activeOrdersSnap,
      pendingOrdersSnap,
      cancelledOrdersSnap,
      expiredOrdersSnap,
      completedOrdersDataSnap,
      completedTopupsDataSnap,
    ] = await Promise.all([
      usersCol.count().get(),
      usersCol
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),

      ordersCol
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),
      ordersCol
        .where("status", "==", "active")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),
      ordersCol
        .where("status", "==", "pending_payment")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),
      ordersCol
        .where("status", "==", "cancelled")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),
      ordersCol
        .where("status", "==", "expired")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .count()
        .get(),

      // Récupération des commandes réussies pour calcul marge réelle
      ordersCol
        .where("status", "==", "completed")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .limit(MAX_FETCH)
        .get(),

      // Récupération des topups réussis (tous pays confondus)
      topupsCol
        .where("status", "==", "completed")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .limit(MAX_FETCH)
        .get(),
    ]);

    // Revenus + marge réelle
    let revenue = 0;
    let margin = 0;
    for (const doc of completedOrdersDataSnap.docs) {
      const d = doc.data();
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      const realMargin = computeOrderMargin(d);
      revenue += price;
      margin += realMargin != null ? realMargin : price * MARGIN_RATE;
    }

    // Total déposé (tous pays) avec compatibilité des anciennes données
    let totalTopupAmount = 0;
    for (const doc of completedTopupsDataSnap.docs) {
      const d = doc.data();
      totalTopupAmount += num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0;
    }

    const supplierCost = Math.max(0, revenue - margin);
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : MARGIN_RATE * 100;

    res.json({
      totalUsers: totalUsersSnap.data().count,
      newUsers: newUsersSnap.data().count,
      totalOrders: totalOrdersSnap.data().count,
      completedOrders: completedOrdersDataSnap.docs.length,
      activeOrders: activeOrdersSnap.data().count,
      pendingOrders: pendingOrdersSnap.data().count,
      cancelledOrders: cancelledOrdersSnap.data().count,
      expiredOrders: expiredOrdersSnap.data().count,
      totalTopups: completedTopupsDataSnap.docs.length,
      totalTopupAmount,
      revenue,
      margin,
      marginPercent,
      supplierCost,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({
      error: "Erreur lors du calcul des statistiques",
      details: String(err),
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/service-performance                                */
/* Classement établi uniquement sur les commandes réussies.          */
/* ────────────────────────────────────────────────────────────────── */
router.get("/service-performance", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const snap = await firestoreDb.collection("orders")
      .where("status", "==", "completed")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc")
      .limit(MAX_FETCH)
      .get();

    const labels: Record<string, string> = {
      wa: "WhatsApp", wb: "WhatsApp Business", ig: "Instagram", tg: "Telegram", fb: "Facebook", go: "Google", tk: "TikTok", tw: "Twitter / X",
      ap: "Apple", am: "Amazon", ms: "Microsoft", dc: "Discord", sc: "Snapchat", nf: "Netflix", ub: "Uber", ln: "LinkedIn",
      pp: "PayPal", bn: "Binance", vi: "Viber", yt: "YouTube", wc: "WeChat", sp: "Spotify", si: "Signal", td: "TikTok",
    };
    const grouped = new Map<string, { serviceCode: string; serviceName: string; successfulOrders: number; revenue: number; margin: number; users: Set<string> }>();
    let totalRevenue = 0;
    let totalMargin = 0;

    for (const doc of snap.docs) {
      const order = doc.data();
      const code = String(order.serviceCode ?? order.service ?? "unknown").trim().toLowerCase() || "unknown";
      const revenue = num(order.priceNum) ?? num(order.price, 0) ?? 0;
      const actualMargin = computeOrderMargin(order);
      const margin = actualMargin !== null ? actualMargin : revenue * MARGIN_RATE;
      let row = grouped.get(code);
      if (!row) {
        row = { serviceCode: code, serviceName: String(order.serviceName ?? labels[code] ?? code.toUpperCase()), successfulOrders: 0, revenue: 0, margin: 0, users: new Set<string>() };
        grouped.set(code, row);
      }
      row.successfulOrders += 1;
      row.revenue += revenue;
      row.margin += margin;
      if (order.userId) row.users.add(String(order.userId));
      totalRevenue += revenue;
      totalMargin += margin;
    }

    const services = Array.from(grouped.values()).map((row) => ({
      serviceCode: row.serviceCode,
      serviceName: row.serviceName,
      successfulOrders: row.successfulOrders,
      uniqueUsers: row.users.size,
      revenue: row.revenue,
      margin: row.margin,
      averageOrderValue: row.successfulOrders ? row.revenue / row.successfulOrders : 0,
      sharePercent: snap.size ? (row.successfulOrders / snap.size) * 100 : 0,
    })).sort((a, b) => b.successfulOrders - a.successfulOrders || b.revenue - a.revenue);

    res.json({
      services,
      period: { start: startIso, end: endIso },
      totals: { successfulOrders: snap.size, revenue: totalRevenue, margin: totalMargin, services: services.length },
      scanned: snap.size,
      truncated: snap.size >= MAX_FETCH,
    });
  } catch (err) {
    console.error("Admin service performance error:", err);
    res.status(500).json({ error: "Impossible de calculer les services les plus commandés.", details: err instanceof Error ? err.message : String(err) });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/chart                                               */
/* ────────────────────────────────────────────────────────────────── */

router.get("/chart", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const start = new Date(startIso);
    const end = new Date(endIso);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const groupByMonth = daysDiff > 90;

    const [ordersSnap, topupsSnap, usersSnap] = await Promise.all([
      firestoreDb
        .collection("orders")
        .where("status", "==", "completed")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .orderBy("createdAt", "asc")
        .limit(2000)
        .get(),
      firestoreDb
        .collection("topups")
        .where("status", "==", "completed")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .orderBy("createdAt", "asc")
        .limit(2000)
        .get(),
      firestoreDb
        .collection("users")
        .where("createdAt", ">=", startIso)
        .where("createdAt", "<=", endIso)
        .orderBy("createdAt", "asc")
        .limit(2000)
        .get(),
    ]);

    const bucket = new Map<
      string,
      { revenue: number; topups: number; orders: number; margin: number; users: number }
    >();

    function getKey(date: Date): string {
      if (groupByMonth) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
      return date.toISOString().slice(0, 10);
    }
    function ensureBucket(key: string) {
      if (!bucket.has(key)) {
        bucket.set(key, { revenue: 0, topups: 0, orders: 0, margin: 0, users: 0 });
      }
      return bucket.get(key)!;
    }

    ordersSnap.forEach((doc) => {
      const d = doc.data();
      const date = new Date(getCreatedAtIso(d.createdAt));
      const b = ensureBucket(getKey(date));
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      const realMargin = computeOrderMargin(d);
      b.revenue += price;
      b.margin += realMargin != null ? realMargin : price * MARGIN_RATE;
      b.orders += 1;
    });
    topupsSnap.forEach((doc) => {
      const d = doc.data();
      const date = new Date(getCreatedAtIso(d.createdAt));
      const b = ensureBucket(getKey(date));
      b.topups += num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0;
    });
    usersSnap.forEach((doc) => {
      const d = doc.data();
      const date = new Date(getCreatedAtIso(d.createdAt));
      const b = ensureBucket(getKey(date));
      b.users += 1;
    });

    const series = Array.from(bucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
    res.json(series);
  } catch (err) {
    console.error("Admin chart error:", err);
    res.status(500).json({
      error: "Erreur lors du calcul du graphique",
      details: String(err),
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/orders                                              */
/* Filtre statut + période + pagination + infos utilisateur.          */
/* ────────────────────────────────────────────────────────────────── */

router.get("/orders", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const status = req.query.status as string | undefined;
    const { page, pageSize } = parsePagination(req);

    let query: FirebaseFirestore.Query = firestoreDb
      .collection("orders")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc");

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const countSnap = await query.count().get();
    const total = countSnap.data().count;
    const offset = (page - 1) * pageSize;
    const snap = await query.limit(pageSize).offset(offset).get();

    // Jointure utilisateurs
    const userIds = snap.docs.map((doc) => String(doc.data().userId ?? "")).filter(Boolean);
    const usersMap = await fetchUsersByIds(userIds);

    const orders = snap.docs.map((doc) => {
      const d = doc.data();
      const uid = String(d.userId ?? "");
      const u = usersMap.get(uid);
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      return {
        id: doc.id,
        userId: uid,
        user: u
          ? { id: u.id, name: u.name, email: u.email, phone: u.phone }
          : null,
        countryCode: d.countryCode,
        serviceCode: d.serviceCode,
        phoneNumber: d.phoneNumber,
        status: d.status,
        price,
        costUsd: num(d.costUsdNum) ?? num(d.costUsd),
        margin: computeOrderMargin(d),
        createdAt: getCreatedAtIso(d.createdAt),
      };
    });

    res.json({ orders, total, page, pageSize });
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des commandes",
      details: String(err),
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/topups                                              */
/* Multi-pays : tous les dépôts sont inclus, countryIso est informatif.*/
/* ────────────────────────────────────────────────────────────────── */

router.get("/topups", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const status = req.query.status as string | undefined;
    const { page, pageSize } = parsePagination(req);

    let query: FirebaseFirestore.Query = firestoreDb
      .collection("topups")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc");

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const countSnap = await query.count().get();
    const total = countSnap.data().count;
    const offset = (page - 1) * pageSize;
    const snap = await query.limit(pageSize).offset(offset).get();

    const userIds = snap.docs.map((doc) => String(doc.data().userId ?? "")).filter(Boolean);
    const usersMap = await fetchUsersByIds(userIds);

    const topups = snap.docs.map((doc) => {
      const d = doc.data();
      const uid = String(d.userId ?? "");
      const u = usersMap.get(uid);
      return {
        id: doc.id,
        userId: uid,
        user: u
          ? { id: u.id, name: u.name, email: u.email, phone: u.phone }
          : null,
        amountEur: num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0,
        amountLocal: num(d.amountLocal),
        localCurrency: d.localCurrency ?? null,
        countryIso: d.countryIso ?? null,
        status: d.status,
        externalId: d.externalId ?? null,
        provider: d.provider ?? d.paymentProvider ?? d.method ?? null,
        paymentMethod: d.paymentMethod ?? d.method ?? null,
        createdAt: getCreatedAtIso(d.createdAt),
      };
    });

    res.json({ topups, total, page, pageSize });
  } catch (err) {
    console.error("Admin topups error:", err);
    res.status(500).json({
      error: "Erreur lors de la récupération des dépôts",
      details: String(err),
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/users                                               */
/* Recherche, filtres, tri, pagination, stats de commandes.           */
/* ────────────────────────────────────────────────────────────────── */

type UserStats = {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  expiredOrders: number;
  totalSpent: number;
};

router.get("/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req);
    const rawSearch = String(req.query.search ?? "").trim();
    const search = rawSearch.toLowerCase();
    const filter = String(req.query.filter ?? "all");
    const sort = String(req.query.sort ?? "recent");
    const usersCol = firestoreDb.collection("users");

    // Classement par commandes réellement réussies. Il n'est calculé que lorsque
    // l'administrateur ouvre ce filtre, sur la période choisie (pas au chargement).
    if (filter === "top") {
      const topPeriod = String(req.query.topPeriod ?? "week");
      const localNow = new Date(Date.now() + 60 * 60 * 1000); // Africa/Douala (UTC+1)
      const localStart = new Date(localNow);
      localStart.setUTCHours(0, 0, 0, 0);
      if (topPeriod === "week") {
        const day = localStart.getUTCDay() || 7;
        localStart.setUTCDate(localStart.getUTCDate() - day + 1);
      } else if (topPeriod === "month") localStart.setUTCDate(1);
      else if (topPeriod === "year") { localStart.setUTCMonth(0, 1); }
      else if (topPeriod === "all") localStart.setTime(new Date("2000-01-01T00:00:00Z").getTime() + 60 * 60 * 1000);
      const queryLimit = topPeriod === "all" ? MAX_FETCH : 10000;
      let ordersQuery: FirebaseFirestore.Query = firestoreDb.collection("orders");
      if (topPeriod !== "all") {
        const startIso = new Date(localStart.getTime() - 60 * 60 * 1000).toISOString();
        ordersQuery = ordersQuery.where("createdAt", ">=", startIso);
      }
      const rankingOrders = await ordersQuery.orderBy("createdAt", "desc").limit(queryLimit).get();
      const rankMap = new Map<string, UserStats>();
      for (const doc of rankingOrders.docs) {
        const d = doc.data(); const uid = String(d.userId ?? "");
        if (!uid) continue;
        const stat = rankMap.get(uid) ?? { totalOrders: 0, completedOrders: 0, activeOrders: 0, pendingOrders: 0, cancelledOrders: 0, expiredOrders: 0, totalSpent: 0 };
        stat.totalOrders += 1;
        if (d.status === "completed") { stat.completedOrders += 1; stat.totalSpent += num(d.priceNum) ?? num(d.price, 0) ?? 0; }
        else if (d.status === "active") stat.activeOrders += 1;
        else if (d.status === "pending_payment" || d.status === "pending") stat.pendingOrders += 1;
        else if (d.status === "cancelled") stat.cancelledOrders += 1;
        else if (d.status === "expired") stat.expiredOrders += 1;
        rankMap.set(uid, stat);
      }
      const ranked = [...rankMap.entries()].filter(([, stat]) => stat.completedOrders > 0).sort((a,b) => b[1].completedOrders - a[1].completedOrders || b[1].totalSpent - a[1].totalSpent);
      const total = ranked.length;
      const selected = ranked.slice((page - 1) * pageSize, page * pageSize);
      const userRefs = selected.map(([id]) => usersCol.doc(id));
      const profileDocs = userRefs.length ? await firestoreDb.getAll(...userRefs) : [];
      const users = profileDocs.filter((doc) => doc.exists).map((doc) => {
        const d = doc.data()!; const stat = rankMap.get(doc.id)!;
        return { id: doc.id, name: d.name ?? "", email: d.email ?? "", phone: d.phone ?? "", countryIso: d.countryIso ?? "", countryName: d.countryName ?? "", countryFlag: d.countryFlag ?? "", balance: num(d.balance, 0) ?? 0, createdAt: getCreatedAtIso(d.createdAt), lastExportedAt: d.lastExportedAt ?? null, exportCount: Number(d.exportCount ?? 0), stats: stat, affiliate: null as any };
      });
      if (users.length) {
        const byCustomer = new Map<string, FirebaseFirestore.DocumentData>();
        for (let i = 0; i < users.length; i += 30) {
          const group = users.slice(i, i + 30).map((u) => u.id);
          const attribSnap = await firestoreDb.collection("affiliate_attributions").where("customerId", "in", group).get();
          for (const doc of attribSnap.docs) byCustomer.set(String(doc.data().customerId), doc.data());
        }
        const commercialIds = [...new Set([...byCustomer.values()].map((a) => String(a.commercialId ?? "")).filter(Boolean))];
        const commercialDocs = await Promise.all(commercialIds.map((id) => firestoreDb.collection("commercials").doc(id).get()));
        const commercialMap = new Map(commercialDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
        for (const user of users) {
          const a = byCustomer.get(user.id); if (!a) continue;
          const c: any = commercialMap.get(String(a.commercialId));
          user.affiliate = { commercialId: String(a.commercialId), commercialName: String(c?.name ?? "Commercial"), affiliateCode: String(a.affiliateCode ?? c?.affiliateCode ?? "") };
        }
      }
      res.json({ users, total, page, pageSize, rankingPeriod: topPeriod, truncated: rankingOrders.size >= queryLimit });
      return;
    }

    // Recherche ciblée : UID exact, début d'e-mail, de nom ou de téléphone.
    // Une recherche ne déclenche plus une lecture des 50 000 profils.
    let userDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    let total = 0;
    if (search) {
      const candidates = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      const exact = await usersCol.doc(rawSearch).get();
      if (exact.exists) candidates.set(exact.id, exact as FirebaseFirestore.QueryDocumentSnapshot);
      const prefixQueries: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
      const emailPrefix = usersCol.orderBy("email").startAt(search).endAt(search + "\uf8ff").limit(100).get();
      prefixQueries.push(emailPrefix);
      const nameVariants = [...new Set([rawSearch, rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1)])];
      for (const variant of nameVariants) {
        prefixQueries.push(usersCol.orderBy("name").startAt(variant).endAt(variant + "\uf8ff").limit(100).get());
      }
      if (/^[+\d\s()-]+$/.test(rawSearch)) {
        const phonePrefix = usersCol.orderBy("phone").startAt(rawSearch).endAt(rawSearch + "\uf8ff").limit(100).get();
        prefixQueries.push(phonePrefix);
      }
      const matches = await Promise.all(prefixQueries);
      for (const snap of matches) for (const doc of snap.docs) candidates.set(doc.id, doc);
      userDocs = [...candidates.values()].filter((doc) => {
        const d = doc.data();
        return String(d.email ?? "").toLowerCase().startsWith(search)
          || String(d.name ?? "").toLowerCase().startsWith(search)
          || String(d.phone ?? "").replace(/\D/g, "").startsWith(search.replace(/\D/g, ""))
          || doc.id.toLowerCase() === search;
      });
      total = userDocs.length;
    } else {
      const order = sort === "oldest" ? "asc" : "desc";
      const [pageSnap, countSnap] = await Promise.all([
        usersCol.orderBy("createdAt", order).offset((page - 1) * pageSize).limit(pageSize).get(),
        usersCol.count().get(),
      ]);
      userDocs = pageSnap.docs;
      total = countSnap.data().count;
    }

    // Une seule requête groupée récupère les commandes des seuls utilisateurs
    // de la page, au lieu de lire toutes les commandes de toute la plateforme.
    let enriched = userDocs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        email: d.email ?? "",
        name: d.name ?? "",
        phone: d.phone ?? "",
        countryIso: d.countryIso ?? "",
        countryName: d.countryName ?? "",
        countryFlag: d.countryFlag ?? "",
        balance: num(d.balance, 0) ?? 0,
        createdAt: getCreatedAtIso(d.createdAt),
        lastSignInAt: d.lastSignInAt ?? null,
        successfulOrdersCount: Number(d.successfulOrdersCount ?? 0),
        totalOrdersCount: Number(d.totalOrdersCount ?? 0),
        lastExportedAt: d.lastExportedAt ?? null,
        exportCount: Number(d.exportCount ?? 0),
        affiliate: null as null | { commercialId: string; commercialName: string; affiliateCode: string },
        stats: {
          totalOrders: Number(d.totalOrdersCount ?? 0),
          completedOrders: Number(d.successfulOrdersCount ?? 0),
          activeOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          expiredOrders: 0,
          totalSpent: Number(d.totalSuccessfulSpend ?? 0),
        } as UserStats,
      };
    });

    // Les compteurs enregistrés sur le profil évitent de relire toutes les
    // commandes à chaque affichage. Les anciens profils sont vérifiés avec
    // des agrégations count() (aucun document commande n'est téléchargé).
    if (userDocs.length) {
      const ids = userDocs.map((doc) => doc.id);
      const legacyUsers = userDocs.filter((doc) => {
        const d = doc.data();
        return d.totalOrdersCount === undefined || d.successfulOrdersCount === undefined;
      });
      if (legacyUsers.length) {
        const legacyStats = await Promise.all(legacyUsers.map(async (doc) => {
          const uid = doc.id;
          const [totalSnap, completedSnap] = await Promise.all([
            firestoreDb.collection("orders").where("userId", "==", uid).count().get(),
            firestoreDb.collection("orders").where("userId", "==", uid).where("status", "==", "completed").count().get(),
          ]);
          const counts = { totalOrders: totalSnap.data().count, successfulOrdersCount: completedSnap.data().count };
          await firestoreDb.collection("users").doc(uid).set(counts, { merge: true });
          return { uid, totalOrders: counts.totalOrders, completedOrders: counts.successfulOrdersCount };
        }));
        const legacyMap = new Map(legacyStats.map((item) => [item.uid, item]));
        enriched = enriched.map((u) => {
          const source = userDocs.find((doc) => doc.id === u.id)?.data() ?? {};
          const legacy = legacyMap.get(u.id);
          if (!legacy) return u;
          return {
            ...u,
            stats: {
              ...u.stats,
              totalOrders: source.totalOrdersCount === undefined ? legacy.totalOrders : u.stats.totalOrders,
              completedOrders: source.successfulOrdersCount === undefined ? legacy.completedOrders : u.stats.completedOrders,
            },
          };
        });
      }

      // Attribution affiliée : une lecture bornée aux clients visibles.
      for (let i = 0; i < ids.length; i += 30) {
        const group = ids.slice(i, i + 30);
        const attribSnap = await firestoreDb.collection("affiliate_attributions").where("customerId", "in", group).get();
        const commercialIds = [...new Set(attribSnap.docs.map((d) => String(d.data().commercialId ?? "")).filter(Boolean))];
        const commercialDocs = await Promise.all(commercialIds.map((id) => firestoreDb.collection("commercials").doc(id).get()));
        const commercialMap = new Map(commercialDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
        const byCustomer = new Map(attribSnap.docs.map((d) => [String(d.data().customerId), d.data()]));
        enriched = enriched.map((u) => {
          const a = byCustomer.get(u.id);
          if (!a) return u;
          const c: any = commercialMap.get(String(a.commercialId));
          return { ...u, affiliate: { commercialId: String(a.commercialId), commercialName: String(c?.name ?? "Commercial"), affiliateCode: String(a.affiliateCode ?? c?.affiliateCode ?? "") } };
        });
      }
    }

    if (filter === "hasOrders") enriched = enriched.filter((u) => u.stats.totalOrders > 0);
    else if (filter === "hasBalance") enriched = enriched.filter((u) => u.balance > 0);
    else if (filter === "neverOrdered") enriched = enriched.filter((u) => u.stats.totalOrders === 0);
    else if (filter === "top") enriched = enriched.filter((u) => u.stats.completedOrders > 0);

    if (sort === "balanceDesc") enriched.sort((a, b) => b.balance - a.balance);
    else if (sort === "completedOrdersDesc" || filter === "top") {
      enriched.sort((a, b) => b.stats.completedOrders - a.stats.completedOrders || b.stats.totalOrders - a.stats.totalOrders);
    } else if (sort === "oldest") enriched.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Recherche = résultat ciblé paginé ; sans recherche, Firestore a déjà paginé.
    const pageUsers = search ? enriched.slice((page - 1) * pageSize, page * pageSize) : enriched;
    res.json({ users: pageUsers, total: filter === "all" ? total : enriched.length, page, pageSize, searchMode: !!search });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs", details: String(err) });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/users/:id — fiche détaillée à la demande             */
/* ────────────────────────────────────────────────────────────────── */
router.get("/users/:id/profile", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "").trim();
  if (!id) { res.status(400).json({ error: "Identifiant utilisateur manquant." }); return; }

  try {
    // Le document principal est le seul élément indispensable à la fiche.
    const userRef = firestoreDb.collection("users").doc(id);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      res.status(404).json({ error: "Utilisateur introuvable dans la collection users.", userId: id });
      return;
    }

    const d = userSnap.data()!;
    const dataWarnings: string[] = [];
    const [orderDocs, attributionSnap, orderCounts] = await Promise.all([
      getProfileOrders(id, 25).catch((error) => {
        console.error("Admin profile: orders unavailable:", { userId: id, error });
        dataWarnings.push("L'historique des commandes est temporairement indisponible.");
        return [] as FirebaseFirestore.QueryDocumentSnapshot[];
      }),
      firestoreDb.collection("affiliate_attributions").where("customerId", "==", id).limit(1).get().catch((error) => {
        console.warn("Admin profile: attribution lookup unavailable:", error);
        dataWarnings.push("L'information d'affiliation est temporairement indisponible.");
        return null;
      }),
      getProfileOrderCounts(id).catch((error) => {
        console.error("Admin profile: order counts unavailable:", { userId: id, error });
        dataWarnings.push("Les compteurs de commandes n'ont pas pu être actualisés ; les compteurs enregistrés sont affichés.");
        return {
          total: Math.max(0, Number(d.totalOrdersCount ?? 0) || 0),
          completed: Math.max(0, Number(d.successfulOrdersCount ?? 0) || 0),
        };
      }),
    ]);

    // Les métadonnées Auth sont facultatives : leur indisponibilité ne bloque jamais la fiche.
    let authMeta: any = null;
    try {
      const authUser = await getAdminAuth().getUser(id);
      authMeta = {
        uid: authUser.uid,
        creationTime: authUser.metadata.creationTime ?? null,
        lastSignInTime: authUser.metadata.lastSignInTime ?? null,
        emailVerified: authUser.emailVerified,
        disabled: authUser.disabled,
        providerIds: authUser.providerData.map((provider) => provider.providerId),
      };
    } catch (error) {
      console.warn(`Admin profile: Auth metadata unavailable for ${id}:`, error);
      dataWarnings.push("Les métadonnées de connexion Firebase Auth ne sont pas disponibles pour ce compte.");
    }

    let affiliate: any = null;
    if (attributionSnap && !attributionSnap.empty) {
      const attribution = attributionSnap.docs[0].data();
      try {
        const commercialSnap = await firestoreDb.collection("commercials").doc(String(attribution.commercialId ?? "")).get();
        const commercial = commercialSnap.data();
        affiliate = {
          commercialId: String(attribution.commercialId ?? ""),
          affiliateCode: attribution.affiliateCode ?? commercial?.affiliateCode ?? "",
          name: commercial?.name ?? "Commercial",
          email: commercial?.email ?? "",
          country: commercial?.country ?? "",
        };
      } catch (error) {
        console.warn("Admin profile: commercial details unavailable:", error);
        dataWarnings.push("Le nom du commercial attribué n'a pas pu être chargé.");
        affiliate = { commercialId: String(attribution.commercialId ?? ""), affiliateCode: attribution.affiliateCode ?? "", name: "Commercial", email: "", country: "" };
      }
    }

    const serviceLabels: Record<string, string> = {
      wa: "WhatsApp", wb: "WhatsApp Business", ig: "Instagram", tg: "Telegram", fb: "Facebook", go: "Google", tk: "TikTok", tw: "Twitter / X",
      ap: "Apple", am: "Amazon", ms: "Microsoft", dc: "Discord", sc: "Snapchat", nf: "Netflix", ub: "Uber", ln: "LinkedIn",
      pp: "PayPal", bn: "Binance", vi: "Viber", yt: "YouTube", wc: "WeChat", sp: "Spotify", si: "Signal", td: "TikTok",
    };
    const orders = orderDocs.map((doc) => {
      const order = doc.data();
      const serviceCode = String(order.serviceCode ?? order.service ?? "").toLowerCase();
      return {
        id: doc.id,
        createdAt: getCreatedAtIso(order.createdAt),
        status: order.status ?? "unknown",
        serviceCode,
        serviceName: order.serviceName ?? serviceLabels[serviceCode] ?? serviceCode.toUpperCase(),
        countryCode: order.countryCode ?? "",
        countryName: order.countryName ?? "",
        phoneNumber: order.phoneNumber ?? "",
        smsCode: order.smsCode ?? null,
        price: num(order.priceNum) ?? num(order.price, 0) ?? 0,
        margin: computeOrderMargin(order),
      };
    });

    const contactHistory = await getProfileContactHistory(userRef, 20).catch((error) => {
      console.warn("Admin profile: contact history unavailable:", error);
      dataWarnings.push("L'historique des contacts n'a pas pu être chargé.");
      return [];
    });
    const lastSuccessfulOrder = orders.find((order) => order.status === "completed");

    res.json({
      user: {
        id,
        name: d.name ?? "",
        email: d.email ?? "",
        phone: d.phone ?? d.phoneNumber ?? "",
        countryIso: d.countryIso ?? "",
        countryName: d.countryName ?? "",
        countryFlag: d.countryFlag ?? "",
        balance: num(d.balance, 0) ?? 0,
        currency: d.currency ?? "EUR",
        createdAt: getCreatedAtIso(d.createdAt ?? authMeta?.creationTime),
        updatedAt: d.updatedAt ? getCreatedAtIso(d.updatedAt) : null,
        emailVerified: authMeta?.emailVerified ?? null,
        disabled: authMeta?.disabled ?? null,
        auth: authMeta,
        lastSignInAt: authMeta?.lastSignInTime ?? d.lastSignInAt ?? null,
        lastOrderAt: orders[0]?.createdAt ?? null,
        lastSuccessfulOrderAt: lastSuccessfulOrder?.createdAt ?? null,
        stats: {
          totalOrders: orderCounts.total,
          completedOrders: orderCounts.completed,
          totalSuccessfulSpend: num(d.totalSuccessfulSpend, 0) ?? 0,
        },
        affiliate,
      },
      orders,
      contactHistory,
      dataWarnings,
    });
  } catch (err) {
    console.error("Admin user detail error:", { userId: id, error: err });
    res.status(500).json({
      error: "Impossible de charger la fiche utilisateur.",
      details: err instanceof Error ? err.message : String(err),
      code: (err as any)?.code ?? null,
      userId: id,
    });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* POST /api/admin/contact/email — vrai envoi via Resend               */
/* ────────────────────────────────────────────────────────────────── */
router.post("/contact/email", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = String(req.body?.userId ?? "");
    const subject = String(req.body?.subject ?? "").trim().slice(0, 180);
    const message = String(req.body?.message ?? "").trim().slice(0, 12000);
    const templateId = String(req.body?.templateId ?? "custom").slice(0, 80);
    if (!userId || !subject || !message) { res.status(400).json({ error: "Destinataire, objet et message sont obligatoires." }); return; }
    const userSnap = await firestoreDb.collection("users").doc(userId).get();
    if (!userSnap.exists) { res.status(404).json({ error: "Utilisateur introuvable." }); return; }
    const user = userSnap.data()!;
    const email = String(user.email ?? "").trim();
    if (!email) { res.status(400).json({ error: "Cet utilisateur n'a pas d'adresse e-mail." }); return; }
    const sent = await sendAdminContactEmail({ to: email, name: String(user.name ?? "cher client"), subject, message });
    const log = { channel: "email", status: "sent", templateId, subject, message, recipient: email, recipientName: String(user.name ?? ""), resendId: sent.id ?? null, createdAt: new Date().toISOString() };
    const batch = firestoreDb.batch();
    const historyRef = firestoreDb.collection("users").doc(userId).collection("contactHistory").doc();
    batch.set(historyRef, log);
    const globalRef = firestoreDb.collection("admin_contact_logs").doc(historyRef.id);
    batch.set(globalRef, { ...log, userId });
    await batch.commit();
    res.json({ ok: true, id: sent.id ?? null, message: "E-mail envoyé avec succès." });
  } catch (err) {
    console.error("Admin email send error:", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Échec de l'envoi de l'e-mail." });
  }
});

/* Journalise une prise de contact WhatsApp (ou une tentative manuelle). */
router.post("/contact/log", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = String(req.body?.userId ?? "");
    const channel = String(req.body?.channel ?? "");
    const templateId = String(req.body?.templateId ?? "custom").slice(0, 80);
    const subject = String(req.body?.subject ?? "").slice(0, 180);
    if (!userId || !["whatsapp", "email", "call"].includes(channel)) { res.status(400).json({ error: "Paramètres de contact invalides." }); return; }
    const userRef = firestoreDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) { res.status(404).json({ error: "Utilisateur introuvable." }); return; }
    const log = { channel, status: channel === "whatsapp" ? "opened" : "initiated", templateId, subject, recipient: userSnap.data()?.email ?? "", createdAt: new Date().toISOString() };
    const historyRef = userRef.collection("contactHistory").doc();
    const batch = firestoreDb.batch();
    batch.set(historyRef, log);
    batch.set(firestoreDb.collection("admin_contact_logs").doc(historyRef.id), { ...log, userId });
    await batch.commit();
    res.json({ ok: true });
  } catch (err) {
    console.error("Admin contact log error:", err);
    res.status(500).json({ error: "Impossible d'enregistrer le contact." });
  }
});

/* Notification interne de l'application, envoyée par l'administration. */
router.post("/notifications", requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = String(req.body?.userId ?? "");
    const title = String(req.body?.title ?? "").trim().slice(0, 120);
    const message = String(req.body?.message ?? "").trim().slice(0, 1500);
    if (!userId || !title || !message) { res.status(400).json({ error: "Utilisateur, titre et message obligatoires." }); return; }
    const ref = firestoreDb.collection("users").doc(userId).collection("notifications").doc();
    await ref.set({ id: ref.id, type: "admin_message", title, message, read: false, createdAt: new Date().toISOString() });
    res.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("Admin notification error:", err);
    res.status(500).json({ error: "Impossible d'envoyer la notification." });
  }
});

/* Marque uniquement les profils réellement exportés. */
router.post("/users/export/mark", requireAdmin, async (req: Request, res: Response) => {
  try {
    const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map((id: unknown) => String(id)).filter(Boolean))].slice(0, 200);
    if (!ids.length) { res.status(400).json({ error: "Aucun utilisateur sélectionné." }); return; }
    const now = new Date().toISOString();
    const batch = firestoreDb.batch();
    for (const id of ids) {
      batch.set(firestoreDb.collection("users").doc(id), { lastExportedAt: now, exportCount: FieldValue.increment(1) }, { merge: true });
    }
    await batch.commit();
    res.json({ ok: true, marked: ids.length, lastExportedAt: now });
  } catch (err) {
    console.error("Mark user export error:", err);
    res.status(500).json({ error: "Impossible d'enregistrer les exports." });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/export/full — export explicite, jamais chargé au rendu */
/* ────────────────────────────────────────────────────────────────── */
router.get("/export/full", requireAdmin, async (req: Request, res: Response) => {
  try {
    const format = String(req.query.format ?? "xls").toLowerCase();
    const { startIso, endIso } = parseRange(req);
    const [usersSnap, ordersSnap, topupsSnap, commercialsSnap, commissionsSnap, attributionsSnap, withdrawalsSnap] = await Promise.all([
      firestoreDb.collection("users").orderBy("createdAt", "desc").limit(MAX_FETCH).get(),
      firestoreDb.collection("orders").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).orderBy("createdAt", "desc").limit(MAX_FETCH).get(),
      firestoreDb.collection("topups").where("createdAt", ">=", startIso).where("createdAt", "<=", endIso).orderBy("createdAt", "desc").limit(MAX_FETCH).get(),
      firestoreDb.collection("commercials").limit(MAX_FETCH).get(),
      firestoreDb.collection("affiliate_commissions").limit(MAX_FETCH).get(),
      firestoreDb.collection("affiliate_attributions").limit(MAX_FETCH).get(),
      firestoreDb.collection("withdrawal_requests").limit(MAX_FETCH).get(),
    ]);
    const encode = (snap: FirebaseFirestore.QuerySnapshot) => snap.docs.map((doc) => {
      const d = doc.data();
      return { id: doc.id, ...d, createdAt: d.createdAt ? getCreatedAtIso(d.createdAt) : null };
    });
    const counts = await Promise.all([
      firestoreDb.collection("users").count().get(), firestoreDb.collection("orders").count().get(),
      firestoreDb.collection("topups").count().get(), firestoreDb.collection("commercials").count().get(),
      firestoreDb.collection("affiliate_commissions").count().get(), firestoreDb.collection("affiliate_attributions").count().get(),
    ]);
    const users = encode(usersSnap);
    const orders = encode(ordersSnap);
    const topups = encode(topupsSnap);
    const completedOrders = orders.filter((order: any) => order.status === "completed");
    const exportedRevenue = completedOrders.reduce((sum: number, order: any) => sum + (num(order.priceNum) ?? num(order.price, 0) ?? 0), 0);
    const exportedMargin = completedOrders.reduce((sum: number, order: any) => {
      const price = num(order.priceNum) ?? num(order.price, 0) ?? 0;
      return sum + (computeOrderMargin(order) ?? price * MARGIN_RATE);
    }, 0);
    const exportedTopups = topups.filter((topup: any) => topup.status === "completed").reduce((sum: number, topup: any) => sum + (num(topup.amountEurNum) ?? num(topup.amountEur, 0) ?? 0), 0);
    const commercials = encode(commercialsSnap);
    const commissions = encode(commissionsSnap);
    const attributions = encode(attributionsSnap);
    const withdrawals = encode(withdrawalsSnap);
    const coverage = {
      limits: { users: MAX_FETCH, orders: MAX_FETCH, topups: MAX_FETCH, affiliateCollections: MAX_FETCH },
      totalAvailable: { users: counts[0].data().count, orders: counts[1].data().count, topups: counts[2].data().count, commercials: counts[3].data().count, commissions: counts[4].data().count, attributions: counts[5].data().count },
      exported: { users: usersSnap.size, orders: ordersSnap.size, topups: topupsSnap.size, commercials: commercialsSnap.size, commissions: commissionsSnap.size, attributions: attributionsSnap.size, withdrawals: withdrawalsSnap.size },
      truncated: usersSnap.size >= MAX_FETCH || ordersSnap.size >= MAX_FETCH || topupsSnap.size >= MAX_FETCH || commercialsSnap.size >= MAX_FETCH || commissionsSnap.size >= MAX_FETCH || attributionsSnap.size >= MAX_FETCH || withdrawalsSnap.size >= MAX_FETCH,
    };
    if (format === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="texerra-admin-${startIso.slice(0,10)}-${endIso.slice(0,10)}.json"`);
      res.json({ generatedAt: new Date().toISOString(), period: { start: startIso, end: endIso }, coverage, users, orders, topups, affiliation: { commercials, commissions, attributions, withdrawals } });
      return;
    }
    if (format !== "xls" && format !== "excel") {
      res.status(400).json({ error: "Format non pris en charge. Utilisez xls ou json." });
      return;
    }
    const fieldsSheet = (items: any[], fields: Array<[string, string]>) => ({
      headers: fields.map(([label]) => label),
      rows: items.map((item) => fields.map(([, key]) => item[key] ?? "")),
    });
    sendExcelWorkbook(res, `texerra-admin-${startIso.slice(0,10)}-${endIso.slice(0,10)}.xls`, [
      { name: "Résumé", headers: ["Indicateur", "Valeur"], rows: [
        ["Généré le", new Date().toLocaleString("fr-FR")], ["Début de période", startIso], ["Fin de période", endIso],
        ["Utilisateurs exportés", users.length], ["Commandes exportées", orders.length], ["Commandes réussies", completedOrders.length],
        ["Ventes nettes des commandes réussies (€)", exportedRevenue], ["Marge brute estimée/enregistrée (€)", exportedMargin],
        ["Coût fournisseur calculé (€)", Math.max(0, exportedRevenue - exportedMargin)], ["Taux de marge (%)", exportedRevenue > 0 ? (exportedMargin / exportedRevenue) * 100 : 0],
        ["Dépôts réussis (€)", exportedTopups], ["Dépôts exportés", topups.length],
        ["Commerciaux exportés", commercials.length], ["Commissions exportées", commissions.length], ["Attributions exportées", attributions.length], ["Retraits exportés", withdrawals.length],
        ["Export partiel (limite atteinte)", coverage.truncated ? "Oui" : "Non"],
      ] },
      { name: "Utilisateurs", ...fieldsSheet(users, [["UID", "id"], ["Nom", "name"], ["E-mail", "email"], ["Téléphone", "phone"], ["Pays", "countryName"], ["ISO pays", "countryIso"], ["Solde", "balance"], ["Devise", "currency"], ["Inscription", "createdAt"], ["Dernière connexion", "lastSignInAt"]]) },
      { name: "Commandes", ...fieldsSheet(orders, [["ID", "id"], ["Utilisateur", "userId"], ["Service", "serviceCode"], ["Pays", "countryCode"], ["Numéro", "phoneNumber"], ["Statut", "status"], ["Prix", "priceNum"], ["Marge", "marginNum"], ["Date", "createdAt"]]) },
      { name: "Dépôts", ...fieldsSheet(topups, [["ID", "id"], ["Utilisateur", "userId"], ["Montant EUR", "amountEurNum"], ["Montant local", "amountLocal"], ["Devise locale", "localCurrency"], ["Pays", "countryIso"], ["Statut", "status"], ["Référence", "externalId"], ["Date", "createdAt"]]) },
      { name: "Commerciaux", ...fieldsSheet(commercials, [["ID", "id"], ["Nom", "name"], ["E-mail", "email"], ["Pays", "country"], ["Code affilié", "affiliateCode"], ["UID Firebase", "firebaseUid"], ["Statut", "status"], ["Taux commission", "commissionRate"]]) },
      { name: "Commissions", ...fieldsSheet(commissions, [["ID", "id"], ["Commercial", "commercialId"], ["Client", "customerId"], ["Commande", "orderId"], ["Vente", "orderAmount"], ["Marge", "orderMargin"], ["Commission", "commissionAmount"], ["Statut", "status"], ["Date", "createdAt"]]) },
      { name: "Attributions", ...fieldsSheet(attributions, [["ID", "id"], ["Commercial", "commercialId"], ["Client", "customerId"], ["Code affilié", "affiliateCode"], ["Source", "source"], ["Date", "createdAt"]]) },
      { name: "Retraits", ...fieldsSheet(withdrawals, [["ID", "id"], ["Commercial", "commercialId"], ["Montant", "amount"], ["Statut", "status"], ["Méthode", "method"], ["Date demande", "requestedAt"], ["Date mise à jour", "updatedAt"]]) },
    ]);
    return;
  } catch (err) {
    console.error("Full admin export error:", err);
    res.status(500).json({ error: "Erreur pendant l'export complet", details: String(err) });
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/orders/export                                       */
/* ────────────────────────────────────────────────────────────────── */

router.get("/orders/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const status = req.query.status as string | undefined;
    const format = ((req.query.format as string) || "csv").toLowerCase();
    const all: any[] = [];

    const snap = await firestoreDb
      .collection("orders")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc")
      .limit(MAX_FETCH)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data();
      if (status && status !== "all" && d.status !== status) continue;
      const price = num(d.priceNum) ?? num(d.price, 0) ?? 0;
      const realMargin = computeOrderMargin(d);
      all.push({
        id: doc.id,
        createdAt: getCreatedAtIso(d.createdAt),
        userId: d.userId,
        countryCode: d.countryCode,
        serviceCode: d.serviceCode,
        phoneNumber: d.phoneNumber,
        status: d.status,
        price,
        margin:
          d.status === "completed"
            ? realMargin != null
              ? realMargin
              : price * MARGIN_RATE
            : null,
      });
    }

    // Jointure user pour l'export
    const usersMap = await fetchUsersByIds(all.map((o) => String(o.userId ?? "")));
    for (const o of all) {
      const u = usersMap.get(String(o.userId ?? ""));
      o.userName = u?.name ?? "";
      o.userEmail = u?.email ?? "";
    }

    if (format === "json") {
      res.json({ orders: all, total: all.length });
      return;
    }
    if (format === "xls" || format === "excel") {
      sendExcelWorkbook(res, `commandes-${startIso.slice(0,10)}_${endIso.slice(0,10)}.xls`, [{
        name: "Commandes",
        headers: ["Date", "Utilisateur", "E-mail", "UID", "Pays (code)", "Service", "Numéro", "Statut", "Prix (€)", "Marge (€)"],
        rows: all.map((o) => [new Date(o.createdAt).toLocaleString("fr-FR"), o.userName, o.userEmail, o.userId, o.countryCode, o.serviceCode, o.phoneNumber, o.status, o.price, o.margin]),
      }]);
      return;
    }

    const startDay = startIso.slice(0, 10);
    const endDay = endIso.slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="commandes-${startDay}_${endDay}.csv"`
    );
    res.write("\uFEFF");
    res.write(
      csvRow([
        "Date",
        "Utilisateur",
        "Email",
        "Utilisateur (ID)",
        "Pays",
        "Service",
        "Numéro",
        "Statut",
        "Prix (€)",
        "Marge (€)",
      ]) + "\n"
    );
    for (const o of all) {
      res.write(
        csvRow([
          new Date(o.createdAt).toLocaleString("fr-FR"),
          o.userName,
          o.userEmail,
          o.userId,
          o.countryCode,
          o.serviceCode,
          o.phoneNumber,
          o.status,
          o.price?.toFixed(2) ?? "",
          o.margin != null ? o.margin.toFixed(2) : "",
        ]) + "\n"
      );
    }
    res.end();
  } catch (err) {
    console.error("Export orders error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur lors de l'export", details: String(err) });
    } else res.end();
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/topups/export                                       */
/* ────────────────────────────────────────────────────────────────── */

router.get("/topups/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startIso, endIso } = parseRange(req);
    const status = req.query.status as string | undefined;
    const format = ((req.query.format as string) || "csv").toLowerCase();
    const all: any[] = [];

    const snap = await firestoreDb
      .collection("topups")
      .where("createdAt", ">=", startIso)
      .where("createdAt", "<=", endIso)
      .orderBy("createdAt", "desc")
      .limit(MAX_FETCH)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data();
      if (status && status !== "all" && d.status !== status) continue;
      all.push({
        id: doc.id,
        createdAt: getCreatedAtIso(d.createdAt),
        userId: d.userId,
        amountEur: num(d.amountEurNum) ?? num(d.amountEur, 0) ?? 0,
        status: d.status,
        externalId: d.externalId,
        countryIso: d.countryIso ?? null,
        localCurrency: d.localCurrency ?? null,
        amountLocal: num(d.amountLocal),
      });
    }

    const usersMap = await fetchUsersByIds(all.map((t) => String(t.userId ?? "")));
    for (const t of all) {
      const u = usersMap.get(String(t.userId ?? ""));
      t.userName = u?.name ?? "";
      t.userEmail = u?.email ?? "";
    }

    if (format === "json") {
      res.json({ topups: all, total: all.length });
      return;
    }
    if (format === "xls" || format === "excel") {
      sendExcelWorkbook(res, `depots-${startIso.slice(0,10)}_${endIso.slice(0,10)}.xls`, [{
        name: "Dépôts",
        headers: ["Date", "Utilisateur", "E-mail", "UID", "Montant (€)", "Pays", "Devise locale", "Montant local", "Statut", "Référence"],
        rows: all.map((t) => [new Date(t.createdAt).toLocaleString("fr-FR"), t.userName, t.userEmail, t.userId, t.amountEur, t.countryIso, t.localCurrency, t.amountLocal, t.status, t.externalId]),
      }]);
      return;
    }

    const startDay = startIso.slice(0, 10);
    const endDay = endIso.slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="depots-${startDay}_${endDay}.csv"`
    );
    res.write("\uFEFF");
    res.write(
      csvRow([
        "Date",
        "Utilisateur",
        "Email",
        "Utilisateur (ID)",
        "Montant (€)",
        "Pays",
        "Devise locale",
        "Montant local",
        "Statut",
        "Référence",
      ]) + "\n"
    );
    for (const t of all) {
      res.write(
        csvRow([
          new Date(t.createdAt).toLocaleString("fr-FR"),
          t.userName,
          t.userEmail,
          t.userId,
          t.amountEur?.toFixed(2) ?? "",
          t.countryIso ?? "",
          t.localCurrency ?? "",
          t.amountLocal ?? "",
          t.status,
          t.externalId ?? "",
        ]) + "\n"
      );
    }
    res.end();
  } catch (err) {
    console.error("Export topups error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur lors de l'export", details: String(err) });
    } else res.end();
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* GET /api/admin/users/export                                        */
/* ────────────────────────────────────────────────────────────────── */

router.get("/users/export", requireAdmin, async (req: Request, res: Response) => {
  try {
    const format = ((req.query.format as string) || "csv").toLowerCase();
    const requestedIds = String(req.query.ids ?? "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 200);
    const all: any[] = [];
    let docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (requestedIds.length) {
      for (let i = 0; i < requestedIds.length; i += 30) {
        const refs = requestedIds.slice(i, i + 30).map((id) => firestoreDb.collection("users").doc(id));
        const found = await firestoreDb.getAll(...refs);
        docs.push(...found.filter((doc) => doc.exists) as FirebaseFirestore.QueryDocumentSnapshot[]);
      }
    } else {
      const snap = await firestoreDb.collection("users").orderBy("createdAt", "desc").limit(MAX_FETCH).get();
      docs = snap.docs;
    }

    for (const doc of docs) {
      const d = doc.data();
      all.push({
        id: doc.id,
        createdAt: getCreatedAtIso(d.createdAt),
        name: d.name ?? "",
        email: d.email ?? "",
        phone: d.phone ?? "",
        countryIso: d.countryIso ?? "",
        countryName: d.countryName ?? "",
        countryFlag: d.countryFlag ?? "",
        balance: num(d.balance, 0) ?? 0,
      });
    }

    if (format === "json") {
      res.json({ users: all, total: all.length });
      return;
    }
    if (format === "xls" || format === "excel") {
      sendExcelWorkbook(res, `utilisateurs-texerra-${all.length}.xls`, [{
        name: "Utilisateurs",
        headers: ["UID", "Inscription", "Nom", "E-mail", "Téléphone", "Pays", "ISO pays", "Solde (€)"],
        rows: all.map((u) => [u.id, new Date(u.createdAt).toLocaleString("fr-FR"), u.name, u.email, u.phone, u.countryName, u.countryIso, u.balance]),
      }]);
      return;
    }

    if (format === "vcf") {
      res.setHeader("Content-Type", "text/vcard; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contacts-texerra.vcf"`
      );
      for (const u of all) {
        const baseName = u.name && String(u.name).trim() ? u.name : u.email;
        const fullName = `TEXERRA SMS - ${baseName}`;
        const [first, ...rest] = String(baseName).split(" ");
        res.write("BEGIN:VCARD\r\n");
        res.write("VERSION:3.0\r\n");
        res.write(`FN:${fullName}\r\n`);
        res.write(`N:${rest.join(" ")};${first};;;\r\n`);
        res.write(`ORG:TEXERRA SMS;\r\n`);
        if (u.phone) res.write(`TEL;TYPE=CELL:${u.phone}\r\n`);
        if (u.email) res.write(`EMAIL;TYPE=INTERNET:${u.email}\r\n`);
        res.write(`NOTE:Client Texerra SMS\r\n`);
        res.write("END:VCARD\r\n");
      }
      res.end();
      return;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="utilisateurs-texerra.csv"`
    );
    res.write("\uFEFF");
    res.write(
      csvRow(["Inscription", "Nom", "Email", "Téléphone", "Pays", "ISO pays", "Solde (€)", "ID"]) + "\n"
    );
    for (const u of all) {
      res.write(
        csvRow([
          new Date(u.createdAt).toLocaleString("fr-FR"),
          u.name,
          u.email,
          u.phone,
          u.countryName,
          u.countryIso,
          u.balance?.toFixed(2) ?? "0.00",
          u.id,
        ]) + "\n"
      );
    }
    res.end();
  } catch (err) {
    console.error("Export users error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur lors de l'export", details: String(err) });
    } else res.end();
  }
});

/* ────────────────────────────────────────────────────────────────── */
/* POST /api/admin/migrate                                            */
/* ────────────────────────────────────────────────────────────────── */

router.post("/migrate", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const FETCH_LIMIT = 20000;
    const BATCH_SIZE = 400;
    let ordersScanned = 0,
      ordersMigrated = 0,
      topupsScanned = 0,
      topupsMigrated = 0;

    const ordersSnap = await firestoreDb.collection("orders").limit(FETCH_LIMIT).get();
    ordersScanned = ordersSnap.docs.length;
    for (let i = 0; i < ordersSnap.docs.length; i += BATCH_SIZE) {
      const chunk = ordersSnap.docs.slice(i, i + BATCH_SIZE);
      const batch = firestoreDb.batch();
      let n = 0;
      for (const doc of chunk) {
        const d = doc.data();
        const upd: Record<string, unknown> = {};
        if (d.priceNum == null) {
          const p = num(d.price);
          if (p != null) upd.priceNum = p;
        }
        if (d.marginNum == null) {
          const m = num(d.margin);
          if (m != null) upd.marginNum = m;
        }
        if (d.costUsdNum == null) {
          const c = num(d.costUsd);
          if (c != null) upd.costUsdNum = c;
        }
        if (Object.keys(upd).length > 0) {
          batch.update(doc.ref, upd);
          n++;
        }
      }
      if (n > 0) await batch.commit();
      ordersMigrated += n;
    }

    const topupsSnap = await firestoreDb.collection("topups").limit(FETCH_LIMIT).get();
    topupsScanned = topupsSnap.docs.length;
    for (let i = 0; i < topupsSnap.docs.length; i += BATCH_SIZE) {
      const chunk = topupsSnap.docs.slice(i, i + BATCH_SIZE);
      const batch = firestoreDb.batch();
      let n = 0;
      for (const doc of chunk) {
        const d = doc.data();
        if (d.amountEurNum == null) {
          const a = num(d.amountEur);
          if (a != null) {
            batch.update(doc.ref, { amountEurNum: a });
            n++;
          }
        }
      }
      if (n > 0) await batch.commit();
      topupsMigrated += n;
    }

    res.json({
      ok: true,
      ordersScanned,
      ordersMigrated,
      topupsScanned,
      topupsMigrated,
      message: `Scan : ${ordersScanned} commandes, ${topupsScanned} dépôts. Migré : ${ordersMigrated} commandes, ${topupsMigrated} dépôts.`,
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({
      error: "Erreur lors de la migration",
      details: String(err),
    });
  }
});

export default router;