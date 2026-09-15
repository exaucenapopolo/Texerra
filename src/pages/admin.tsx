import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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

type Period =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "week"
  | "month"
  | "year"
  | "custom";

/** Calcule les bornes {start, end} au format YYYY-MM-DD selon la période choisie. */
function getDateRange(
  period: Period,
  customStart?: string,
  customEnd?: string
): { start: string; end: string } {
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
      const day = now.getDay() || 7; // lundi = 1 … dimanche = 7
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

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();

  /* ─── TOUS LES HOOKS EN PREMIER (Règles des Hooks) ────────────── */
  const [period, setPeriod] = useState<Period>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderPage, setOrderPage] = useState(1);
  const [topupStatus, setTopupStatus] = useState("all");
  const [topupPage, setTopupPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);

  const { start, end } = getDateRange(period, customStart, customEnd);

  // Chargement du token Firebase — TOUJOURS appelé
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

  // Les 5 useQuery — TOUJOURS appelés (ordre stable)
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
    queryKey: ["admin-orders", start, end, orderStatus, orderPage],
    queryFn: () =>
      apiFetch(
        `/orders?start=${start}&end=${end}&status=${orderStatus}&page=${orderPage}`,
        firebaseToken!
      ),
    enabled: !!firebaseToken,
    staleTime: 30_000,
  });

  const topupsQuery = useQuery({
    queryKey: ["admin-topups", start, end, topupStatus, topupPage],
    queryFn: () =>
      apiFetch(
        `/topups?start=${start}&end=${end}&status=${topupStatus}&page=${topupPage}`,
        firebaseToken!
      ),
    enabled: !!firebaseToken,
    staleTime: 30_000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", start, end, userPage],
    queryFn: () =>
      apiFetch(`/users?start=${start}&end=${end}&page=${userPage}`, firebaseToken!),
    enabled: !!firebaseToken,
    staleTime: 30_000,
  });

  /* ─── À PARTIR D'ICI : RETOURS CONDITIONNELS OK ───────────────── */
  // AdminRoute (dans App.tsx) garantit déjà que user existe et est admin.
  // On affiche juste un état de chargement tant que le token n'est pas prêt.
  if (authLoading || !firebaseToken) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Chargement du tableau de bord…
      </div>
    );
  }

  const stats = statsQuery.data;
  const chartData = chartQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord administrateur</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Période : {start} → {end}
            </p>
          </div>

          {/* Sélecteur de période */}
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
                ["custom", "Personnalisé"],
              ] as [Period, string][]
            ).map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                  period === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white border-border hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-3 bg-white border rounded-lg p-3">
            <label className="text-sm font-medium">Du</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <label className="text-sm font-medium">au</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
        )}

        {/* Cartes statistiques */}
        {statsQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Chargement des statistiques…</p>
        )}
        {statsQuery.isError && (
          <p className="text-sm text-red-600">
            Erreur : {(statsQuery.error as Error).message}
          </p>
        )}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Utilisateurs"
              value={stats.totalUsers.toLocaleString("fr-FR")}
              sub={`+${stats.newUsers} nouveaux`}
              color="bg-blue-50 text-blue-700"
            />
            <StatCard
              label="Dépôts"
              value={`${stats.totalTopupAmount.toFixed(2)} €`}
              sub={`${stats.totalTopups} dépôt${stats.totalTopups > 1 ? "s" : ""}`}
              color="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              label="Commandes"
              value={stats.totalOrders.toLocaleString("fr-FR")}
              sub={`${stats.completedOrders} réussies · ${stats.pendingOrders} en attente`}
              color="bg-orange-50 text-orange-700"
            />
            <StatCard
              label="Chiffre d'affaires"
              value={`${stats.revenue.toFixed(2)} €`}
              sub={`Marge : ${stats.margin.toFixed(2)} € (${stats.marginPercent.toFixed(1)} %)`}
              color="bg-purple-50 text-purple-700"
            />
          </div>
        )}

        {/* Statuts détaillés */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <MiniStat label="Réussies" value={stats.completedOrders} />
            <MiniStat label="En attente" value={stats.pendingOrders} />
            <MiniStat label="Annulées" value={stats.cancelledOrders} />
            <MiniStat label="Expirées" value={stats.expiredOrders} />
            <MiniStat
              label="Marge totale"
              value={`${stats.margin.toFixed(2)} €`}
              highlight
            />
          </div>
        )}

        {/* Graphique */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-lg font-semibold mb-4">Évolution sur la période</h2>
          {chartQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Chargement du graphique…</p>
          )}
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
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  name="CA (€)"
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
                  name="Commandes"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Marge (€)"
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
            ["active", "Actives"],
            ["completed", "Terminées"],
            ["pending_payment", "En attente"],
            ["cancelled", "Annulées"],
            ["expired", "Expirées"],
          ]}
          activeFilter={orderStatus}
          onFilterChange={(v) => {
            setOrderStatus(v);
            setOrderPage(1);
          }}
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
                    {ordersQuery.data?.orders?.map((o: any) => (
                      <tr key={o.id} className="border-t hover:bg-secondary/30">
                        <td className="p-2 whitespace-nowrap">
                          {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="p-2">{o.countryCode}</td>
                        <td className="p-2">{o.serviceCode}</td>
                        <td className="p-2 font-mono text-xs">{o.phoneNumber}</td>
                        <td className="p-2 text-right">{o.price.toFixed(2)} €</td>
                        <td className="p-2">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {o.margin != null ? `${o.margin.toFixed(2)} €` : "—"}
                        </td>
                      </tr>
                    ))}
                    {ordersQuery.data?.orders?.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                          Aucune commande
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={orderPage}
                total={ordersQuery.data?.total ?? 0}
                pageSize={ordersQuery.data?.pageSize ?? 20}
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
            ["completed", "Terminés"],
            ["pending", "En attente"],
          ]}
          activeFilter={topupStatus}
          onFilterChange={(v) => {
            setTopupStatus(v);
            setTopupPage(1);
          }}
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
                        <td className="p-2 whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="p-2 text-right">{t.amountEur.toFixed(2)} €</td>
                        <td className="p-2">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="p-2 font-mono text-xs text-muted-foreground">
                          {t.externalId ?? "—"}
                        </td>
                      </tr>
                    ))}
                    {topupsQuery.data?.topups?.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted-foreground">
                          Aucun dépôt
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={topupPage}
                total={topupsQuery.data?.total ?? 0}
                pageSize={topupsQuery.data?.pageSize ?? 20}
                onChange={setTopupPage}
              />
            </>
          )}
        </Section>

        {/* Utilisateurs */}
        <Section title="Utilisateurs">
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
                        <td className="p-2 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="p-2">{u.name ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{u.email ?? "—"}</td>
                        <td className="p-2">{u.phone ?? "—"}</td>
                        <td className="p-2 text-right font-medium">
                          {u.balance.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                    {usersQuery.data?.users?.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                          Aucun utilisateur
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={userPage}
                total={usersQuery.data?.total ?? 0}
                pageSize={usersQuery.data?.pageSize ?? 20}
                onChange={setUserPage}
              />
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

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        {color && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
            {label === "Utilisateurs" && "👥"}
            {label === "Dépôts" && "💰"}
            {label === "Commandes" && "📦"}
            {label === "Chiffre d'affaires" && "📈"}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-center ${
        highlight ? "bg-blue-50 border-blue-200" : "bg-white"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

function Section({
  title,
  filters,
  activeFilter,
  onFilterChange,
  children,
}: {
  title: string;
  filters?: [string, string][];
  activeFilter?: string;
  onFilterChange?: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        {filters && (
          <div className="flex flex-wrap gap-1">
            {filters.map(([v, label]) => (
              <button
                key={v}
                onClick={() => onFilterChange?.(v)}
                className={`px-2.5 py-1 text-xs rounded-md border transition ${
                  activeFilter === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    expired: "bg-gray-50 text-gray-700 border-gray-200",
  };
  const labels: Record<string, string> = {
    active: "Active",
    completed: "Terminée",
    pending: "En attente",
    pending_payment: "En attente",
    cancelled: "Annulée",
    expired: "Expirée",
  };
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full border ${
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
  if (totalPages <= 1) {
    return (
      <div className="p-3 text-xs text-muted-foreground text-center border-t">
        {total} résultat{total > 1 ? "s" : ""}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between p-3 border-t text-sm">
      <span className="text-xs text-muted-foreground">
        {total} résultat{total > 1 ? "s" : ""} · page {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-40 hover:border-primary/40"
        >
          ←
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-40 hover:border-primary/40"
        >
          →
        </button>
      </div>
    </div>
  );
}