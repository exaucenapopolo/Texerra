import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth-context";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type Period = "today" | "yesterday" | "7d" | "30d" | "week" | "month" | "year" | "all" | "custom";

const MARGIN_RATE = 0.65;

function getDateRange(period: Period, customStart?: string, customEnd?: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case "today": start.setHours(0, 0, 0, 0); break;
    case "yesterday":
      start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1); end.setHours(23, 59, 59, 999);
      break;
    case "7d": start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0); break;
    case "30d": start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0); break;
    case "week": {
      const day = now.getDay() || 7;
      start.setDate(now.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "month": start.setDate(1); start.setHours(0, 0, 0, 0); break;
    case "year": start.setMonth(0, 1); start.setDate(1); start.setHours(0, 0, 0, 0); break;
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
  if (!w) { alert("Autorisez les pop-ups pour exporter en PDF."); return; }
  const esc = (s: unknown) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
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
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
<script>setTimeout(function(){window.print()},300);</script>
</body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

const STORAGE_KEY = "texerra:admin:period";

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
  const [topupStatus, setTopupStatus] = useState("all");
  const [topupPage, setTopupPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const { start, end } = getDateRange(period, customStart, customEnd);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, period); }, [period]);

  useEffect(() => {
    if (!user) { setFirebaseToken(null); return; }
    let cancelled = false;
    user.getIdToken().then((t: string) => { if (!cancelled) setFirebaseToken(t); })
      .catch(() => { if (!cancelled) setFirebaseToken(null); });
    return () => { cancelled = true; };
  }, [user]);

  const statsQuery = useQuery({
    queryKey: ["admin-stats", start, end],
    queryFn: () => apiFetch(`/stats?start=${start}&end=${end}`, firebaseToken!),
    enabled: !!firebaseToken, staleTime: 60_000,
  });
  const chartQuery = useQuery({
    queryKey: ["admin-chart", start, end],
    queryFn: () => apiFetch(`/chart?start=${start}&end=${end}`, firebaseToken!),
    enabled: !!firebaseToken, staleTime: 60_000,
  });
  const ordersQuery = useQuery({
    queryKey: ["admin-orders", start, end, orderStatus, orderPage],
    queryFn: () => apiFetch(`/orders?start=${start}&end=${end}&status=${orderStatus}&page=${orderPage}`, firebaseToken!),
    enabled: !!firebaseToken, staleTime: 30_000,
  });
  const topupsQuery = useQuery({
    queryKey: ["admin-topups", start, end, topupStatus, topupPage],
    queryFn: () => apiFetch(`/topups?start=${start}&end=${end}&status=${topupStatus}&page=${topupPage}`, firebaseToken!),
    enabled: !!firebaseToken, staleTime: 30_000,
  });
  const usersQuery = useQuery({
    queryKey: ["admin-users", start, end, userPage],
    queryFn: () => apiFetch(`/users?start=${start}&end=${end}&page=${userPage}`, firebaseToken!),
    enabled: !!firebaseToken, staleTime: 30_000,
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

  /* ─── Handlers d'export ──────────────────────────────────────── */

  async function handleOrdersCsv() {
    try {
      setExporting("orders-csv");
      await downloadBlob(`/orders/export?format=csv&start=${start}&end=${end}&status=${orderStatus}`, `commandes-${start}_${end}.csv`, firebaseToken!);
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleOrdersPdf() {
    try {
      setExporting("orders-pdf");
      const data = await apiFetch(`/orders/export?format=json&start=${start}&end=${end}&status=${orderStatus}`, firebaseToken!);
      const orders = data.orders as any[];
      const completed = orders.filter((o) => o.status === "completed");
      const totalRevenue = completed.reduce((s, o) => s + (o.price || 0), 0);
      const totalMargin = totalRevenue * MARGIN_RATE;
      openPdfPrint(
        `Commandes — ${start} → ${end}`,
        [
          `Total : <b>${orders.length}</b> commandes`,
          `Réussies : <b>${completed.length}</b>`,
          `Revenus : <b>${totalRevenue.toFixed(2)} €</b>`,
          `Marge (${(MARGIN_RATE * 100).toFixed(0)} %) : <b>${totalMargin.toFixed(2)} €</b>`,
        ],
        ["Date", "Pays", "Service", "Numéro", "Statut", "Prix (€)", "Marge (€)"],
        orders.map((o) => [
          new Date(o.createdAt).toLocaleString("fr-FR"),
          o.countryCode, o.serviceCode, o.phoneNumber, o.status,
          o.price?.toFixed(2) ?? "",
          o.margin != null ? o.margin.toFixed(2) : "—",
        ])
      );
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleTopupsCsv() {
    try {
      setExporting("topups-csv");
      await downloadBlob(`/topups/export?format=csv&start=${start}&end=${end}&status=${topupStatus}`, `depots-${start}_${end}.csv`, firebaseToken!);
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleTopupsPdf() {
    try {
      setExporting("topups-pdf");
      const data = await apiFetch(`/topups/export?format=json&start=${start}&end=${end}&status=${topupStatus}`, firebaseToken!);
      const topups = data.topups as any[];
      const completed = topups.filter((t) => t.status === "completed");
      const totalAmount = completed.reduce((s, t) => s + (t.amountEur || 0), 0);
      openPdfPrint(
        `Dépôts — ${start} → ${end}`,
        [
          `Total affiché : <b>${topups.length}</b>`,
          `Réussis : <b>${completed.length}</b>`,
          `Montant encaissé : <b>${totalAmount.toFixed(2)} €</b>`,
        ],
        ["Date", "Montant (€)", "Statut", "Référence"],
        topups.map((t) => [
          new Date(t.createdAt).toLocaleString("fr-FR"),
          t.amountEur?.toFixed(2) ?? "",
          t.status,
          t.externalId ?? "—",
        ])
      );
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleUsersCsv() {
    try {
      setExporting("users-csv");
      await downloadBlob(`/users/export?format=csv`, `utilisateurs-texerra.csv`, firebaseToken!);
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleUsersVcf() {
    try {
      setExporting("users-vcf");
      await downloadBlob(`/users/export?format=vcf`, `contacts-texerra.vcf`, firebaseToken!);
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleUsersPdf() {
    try {
      setExporting("users-pdf");
      const data = await apiFetch(`/users/export?format=json`, firebaseToken!);
      const users = data.users as any[];
      openPdfPrint(
        `Utilisateurs — annuaire complet`,
        [`Total : <b>${users.length}</b> utilisateurs`],
        ["Inscription", "Nom", "Email", "Téléphone", "Solde (€)"],
        users.map((u) => [
          new Date(u.createdAt).toLocaleString("fr-FR"),
          u.name || "—", u.email || "—", u.phone || "—",
          u.balance?.toFixed(2) ?? "0.00",
        ])
      );
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(null); }
  }

  async function handleMigrate() {
    if (!confirm("Migrer les anciennes données ?\n\nCette opération est idempotente et sûre. Elle ajoute des champs numériques sur les anciens documents pour permettre les agrégations. Aucune donnée existante n'est modifiée ou supprimée.")) return;
    try {
      setMigrating(true);
      setMigrationResult(null);
      const res = await fetch("/api/admin/migrate", {
        method: "POST",
        headers: { Authorization: `Bearer ${firebaseToken}` },
      });
      if (!res.ok) throw new Error(`Migration échouée (${res.status})`);
      const data = await res.json();
      setMigrationResult(data.message || `✓ ${data.ordersMigrated} commandes et ${data.topupsMigrated} dépôts mis à jour.`);
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
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord administrateur</h1>
            <p className="text-sm text-muted-foreground mt-1">Période : {start} → {end}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["today", "Aujourd'hui"], ["yesterday", "Hier"], ["7d", "7 jours"],
              ["30d", "30 jours"], ["week", "Cette semaine"], ["month", "Ce mois"],
              ["year", "Cette année"], ["all", "Tout"], ["custom", "Personnalisé"],
            ] as [Period, string][]).map(([p, label]) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                  period === p ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white border-border hover:border-primary/40"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button onClick={handleMigrate} disabled={migrating}
            className="text-xs px-3 py-1.5 rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50">
            {migrating ? "Migration en cours…" : "🔧 Migrer les anciennes données"}
          </button>
          {migrationResult && <span className="text-muted-foreground">{migrationResult}</span>}
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-3 bg-white border rounded-lg p-3">
            <label className="text-sm font-medium">Du</label>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            <label className="text-sm font-medium">au</label>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Utilisateurs" value={stats.totalUsers.toLocaleString("fr-FR")} sub={`+${stats.newUsers} nouveaux`} icon="👥" />
            <StatCard
              label="Dépôts réussis"
              value={`${stats.totalTopupAmount.toFixed(2)} €`}
              sub={`${stats.totalTopups} dépôt${stats.totalTopups > 1 ? "s" : ""} validé${stats.totalTopups > 1 ? "s" : ""}`}
              icon="💰"
            />
            <StatCard
              label="Commandes"
              value={stats.totalOrders.toLocaleString("fr-FR")}
              sub={`${stats.completedOrders} réussies · ${stats.activeOrders} en cours`}
              icon="📦"
            />
            <StatCard
              label="Revenus"
              value={`${stats.revenue.toFixed(2)} €`}
              sub={`Marge : ${stats.margin.toFixed(2)} € (${stats.marginPercent.toFixed(0)} %)`}
              icon="📈"
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
            <MiniStat label="Marge totale" value={`${stats.margin.toFixed(2)} €`} highlight />
          </div>
        )}

        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-lg font-semibold mb-4">Évolution sur la période</h2>
          {chartData.length === 0 && !chartQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Aucune donnée sur cette période.</p>
          )}
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} name="Revenus (€)" dot={false} />
                <Line type="monotone" dataKey="topups" stroke="#10b981" strokeWidth={2} name="Dépôts (€)" dot={false} />
                <Line type="monotone" dataKey="orders" stroke="#ea580c" strokeWidth={2} name="Commandes réussies" dot={false} />
                <Line type="monotone" dataKey="margin" stroke="#2563eb" strokeWidth={2} name="Marge (€)" dot={false} />
                <Line type="monotone" dataKey="users" stroke="#dc2626" strokeWidth={2} name="Inscriptions" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <Section
          title="Commandes"
          filters={[
            ["all", "Toutes"], ["completed", "Réussies"], ["active", "En cours"],
            ["pending_payment", "En attente"], ["cancelled", "Annulées"], ["expired", "Expirées"],
          ]}
          activeFilter={orderStatus}
          onFilterChange={(v) => { setOrderStatus(v); setOrderPage(1); }}
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Pays</th>
                      <th className="text-left p-2 font-medium">Service</th>
                      <th className="text-left p-2 font-medium">Numéro</th>
                      <th className="text-right p-2 font-medium">Prix</th>
                      <th className="text-left p-2 font-medium">Statut</th>
                      <th className="text-right p-2 font-medium">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersQuery.data?.orders?.map((o: any) => {
                      const isCompleted = o.status === "completed";
                      const displayMargin = isCompleted ? o.price * MARGIN_RATE : null;
                      return (
                        <tr key={o.id} className="border-t hover:bg-secondary/30">
                          <td className="p-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</td>
                          <td className="p-2">{o.countryCode}</td>
                          <td className="p-2">{o.serviceCode}</td>
                          <td className="p-2 font-mono text-xs">{o.phoneNumber}</td>
                          <td className="p-2 text-right">{o.price.toFixed(2)} €</td>
                          <td className="p-2"><StatusBadge status={o.status} /></td>
                          <td className="p-2 text-right text-muted-foreground">
                            {displayMargin != null ? `${displayMargin.toFixed(2)} €` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {ordersQuery.data?.orders?.length === 0 && (
                      <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Aucune commande sur cette période</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={orderPage} total={ordersQuery.data?.total ?? 0} pageSize={ordersQuery.data?.pageSize ?? 20} onChange={setOrderPage} />
            </>
          )}
        </Section>

        <Section
          title="Dépôts / Recharges"
          filters={[["all", "Tous"], ["completed", "Réussis"], ["pending", "En attente"], ["failed", "Échoués"]]}
          activeFilter={topupStatus}
          onFilterChange={(v) => { setTopupStatus(v); setTopupPage(1); }}
          actions={
            <>
              <ExportBtn onClick={handleTopupsCsv} disabled={busy("topups-csv")}>{busy("topups-csv") ? "…" : "CSV"}</ExportBtn>
              <ExportBtn onClick={handleTopupsPdf} disabled={busy("topups-pdf")}>{busy("topups-pdf") ? "…" : "PDF"}</ExportBtn>
            </>
          }
        >
          {topupsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground p-3">Chargement…</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-right p-2 font-medium">Montant</th>
                      <th className="text-left p-2 font-medium">Statut</th>
                      <th className="text-left p-2 font-medium">Référence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topupsQuery.data?.topups?.map((t: any) => (
                      <tr key={t.id} className="border-t hover:bg-secondary/30">
                        <td className="p-2 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="p-2 text-right">{t.amountEur.toFixed(2)} €</td>
                        <td className="p-2"><StatusBadge status={t.status} /></td>
                        <td className="p-2 font-mono text-xs text-muted-foreground">{t.externalId ?? "—"}</td>
                      </tr>
                    ))}
                    {topupsQuery.data?.topups?.length === 0 && (
                      <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Aucun dépôt sur cette période</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={topupPage} total={topupsQuery.data?.total ?? 0} pageSize={topupsQuery.data?.pageSize ?? 20} onChange={setTopupPage} />
            </>
          )}
        </Section>

        <Section
          title="Utilisateurs"
          actions={
            <>
              <ExportBtn onClick={handleUsersCsv} disabled={busy("users-csv")}>{busy("users-csv") ? "…" : "CSV"}</ExportBtn>
              <ExportBtn onClick={handleUsersPdf} disabled={busy("users-pdf")}>{busy("users-pdf") ? "…" : "PDF"}</ExportBtn>
              <ExportBtn onClick={handleUsersVcf} disabled={busy("users-vcf")} variant="primary">
                {busy("users-vcf") ? "…" : "Contacts .vcf"}
              </ExportBtn>
            </>
          }
        >
          {usersQuery.isLoading ? (
            <p className="text-sm text-muted-foreground p-3">Chargement…</p>
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
                      <th className="text-right p-2 font-medium">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersQuery.data?.users?.map((u: any) => (
                      <tr key={u.id} className="border-t hover:bg-secondary/30">
                        <td className="p-2 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="p-2">{u.name ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{u.email ?? "—"}</td>
                        <td className="p-2">{u.phone ?? "—"}</td>
                        <td className="p-2 text-right font-medium">{u.balance.toFixed(2)} €</td>
                      </tr>
                    ))}
                    {usersQuery.data?.users?.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Aucun utilisateur</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={userPage} total={usersQuery.data?.total ?? 0} pageSize={usersQuery.data?.pageSize ?? 20} onChange={setUserPage} />
            </>
          )}
        </Section>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Composants UI                                                     */
/* ────────────────────────────────────────────────────────────────── */

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${highlight ? "bg-blue-50 border-blue-200" : "bg-white"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

function Section({
  title, filters, activeFilter, onFilterChange, actions, children,
}: {
  title: string;
  filters?: [string, string][];
  activeFilter?: string;
  onFilterChange?: (v: string) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {filters && (
            <div className="flex flex-wrap gap-1">
              {filters.map(([v, label]) => (
                <button key={v} onClick={() => onFilterChange?.(v)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition ${
                    activeFilter === v ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white hover:border-primary/40"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {actions && <div className="flex gap-1 ml-auto">{actions}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ExportBtn({
  onClick, disabled, variant, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary";
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-2.5 py-1 text-xs rounded-md border transition disabled:opacity-50 ${
        variant === "primary"
          ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
          : "bg-white hover:border-primary/40"
      }`}>
      {children}
    </button>
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
    active: "En cours", completed: "Réussie", pending: "En attente",
    pending_payment: "En attente", cancelled: "Annulée", failed: "Échoué", expired: "Expirée",
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${map[status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return <div className="p-3 text-xs text-muted-foreground text-center border-t">{total} résultat{total > 1 ? "s" : ""}</div>;
  }
  return (
    <div className="flex items-center justify-between p-3 border-t text-sm">
      <span className="text-xs text-muted-foreground">{total} résultat{total > 1 ? "s" : ""} · page {page} / {totalPages}</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40 hover:border-primary/40">←</button>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40 hover:border-primary/40">→</button>
      </div>
    </div>
  );
}