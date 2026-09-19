// Fichier : src/pages/admin/AffiliateAdmin.tsx

import { useEffect, useState, FormEvent, useMemo } from "react";
import {
  Users,
  Plus,
  Check,
  X,
  Clock,
  TrendingUp,
  Coins,
  Wallet,
  AlertCircle,
  RefreshCw,
  Loader2,
  FileDown,
  Bell,
  Trophy,
  DollarSign,
} from "lucide-react";
import {
  adminListCommercials,
  adminCreateCommercial,
  adminUpdateRate,
  adminListWithdrawals,
  adminProcessWithdrawal,
  adminGetStats,
  adminGetLeaderboard,
  type AdminCommercialRow,
  type WithdrawalRow,
  type AdminStats,
  type LeaderboardResponse,
} from "../../lib/affiliate-api";
import {
  formatEur,
  formatFcfa,
  downloadAdminReport,
  rankMedal,
  rankColor,
  type AdminReportPayload,
} from "../../lib/admin-report";

type Tab = "overview" | "leaderboard" | "commercials" | "withdrawals";
type Period = "today" | "week" | "month" | "year" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "year", label: "Cette année" },
  { value: "all", label: "Tout" },
];

export default function AffiliateAdmin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("all");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Administration — Affiliation
          </h1>
          <p className="text-gray-500 mt-1">
            Gestion des commerciaux, commissions et retraits
          </p>
        </div>

        {/* ─── FILTRE PÉRIODE GLOBAL ─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-6 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">
            Période :
          </span>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-orange-500 text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ─── TABS ─── */}
        <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
            icon={<TrendingUp className="w-4 h-4" />}
          >
            Vue d'ensemble
          </TabButton>
          <TabButton
            active={tab === "leaderboard"}
            onClick={() => setTab("leaderboard")}
            icon={<Trophy className="w-4 h-4" />}
          >
            Classement
          </TabButton>
          <TabButton
            active={tab === "commercials"}
            onClick={() => setTab("commercials")}
            icon={<Users className="w-4 h-4" />}
          >
            Commerciaux
          </TabButton>
          <TabButton
            active={tab === "withdrawals"}
            onClick={() => setTab("withdrawals")}
            icon={<Wallet className="w-4 h-4" />}
          >
            Retraits
          </TabButton>
        </div>

        {tab === "overview" && <OverviewTab period={period} />}
        {tab === "leaderboard" && (
          <LeaderboardTab period={period} />
        )}
        {tab === "commercials" && <CommercialsTab />}
        {tab === "withdrawals" && <WithdrawalsTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * TAB BUTTON
 * ═══════════════════════════════════════════════════════════ */

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
        active
          ? "border-orange-500 text-orange-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
 * OVERVIEW
 * ═══════════════════════════════════════════════════════════ */

function OverviewTab({ period }: { period: Period }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([
        adminGetStats(),
        adminGetLeaderboard(period),
      ]);
      setStats(s.kpis);
      setLeaderboard(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  // ─── Retraits payés récents (notifications) ───
  const [paidWithdrawals, setPaidWithdrawals] = useState<WithdrawalRow[]>([]);
  useEffect(() => {
    adminListWithdrawals("paid").then((r) => {
      // 5 derniers payés
      setPaidWithdrawals(r.withdrawals.slice(0, 5));
    }).catch(() => {});
  }, []);

  const handleExportPdf = () => {
    if (!stats || !leaderboard) return;
    const payload: AdminReportPayload = {
      period:
        period === "all"
          ? "Tout l'historique"
          : PERIODS.find((p) => p.value === period)?.label ?? period,
      generatedAt: new Date().toISOString(),
      global: {
        totalSales: leaderboard.leaderboard.reduce(
          (s, r) => s + r.totalSales,
          0
        ),
        totalCommissions: stats.totalCommissions,
        availableCommissions: stats.availableCommissions,
        reserved: stats.reserved,
        totalPaid: stats.totalPaid,
        activeCommercials: stats.activeCommercials,
        totalAttributions: stats.totalAttributions,
      },
      leaderboard: leaderboard.leaderboard,
    };
    downloadAdminReport(payload);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!stats || !leaderboard) return null;

  const totalSalesFiltered = leaderboard.leaderboard.reduce(
    (s, r) => s + r.totalSales,
    0
  );

  return (
    <div className="space-y-6">
      {/* Bouton export PDF */}
      <div className="flex justify-end">
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
        >
          <FileDown className="w-4 h-4" />
          Exporter le rapport PDF
        </button>
      </div>

      {/* ─── KPIs GLOBAUX ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Ventes affiliées"
          valueEur={totalSalesFiltered || stats.totalCommissions * 2}
          color="indigo"
        />
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          label="Commissions générées"
          valueEur={stats.totalCommissions}
          color="orange"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Réservé (retraits)"
          valueEur={stats.reserved}
          color="yellow"
        />
        <StatCard
          icon={<Check className="w-5 h-5" />}
          label="Total payé"
          valueEur={stats.totalPaid}
          color="green"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Commissions disponibles"
          valueEur={stats.availableCommissions}
          color="blue"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Commerciaux actifs"
          valueRaw={String(stats.activeCommercials)}
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Clients attribués"
          valueRaw={stats.totalAttributions.toLocaleString("fr-FR")}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Clients (période)"
          valueRaw={String(
            leaderboard.leaderboard.reduce((s, r) => s + r.clientsCount, 0)
          )}
        />
      </div>

      {/* ─── TOP 3 ─── */}
      {leaderboard.leaderboard.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-gray-900">
              Top 3 — {leaderboard.period === "all" ? "Tout l'historique" : PERIODS.find(p => p.value === leaderboard.period)?.label}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {leaderboard.leaderboard.slice(0, 3).map((r) => (
              <div
                key={r.commercialId}
                className={`rounded-xl border p-4 ${rankColor(r.rank)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{rankMedal(r.rank)}</span>
                  <span className="text-xs font-mono">{r.affiliateCode}</span>
                </div>
                <div className="font-bold text-gray-900 mt-2">{r.name}</div>
                <div className="text-xs text-gray-500">{r.email}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500">Clients</div>
                    <div className="font-bold text-gray-900">
                      {r.clientsCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Ventes</div>
                    <div className="font-bold text-gray-900">{r.salesCount}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-current/10">
                  <div className="text-xs text-gray-500">Commissions</div>
                  <div className="font-bold text-gray-900">
                    {formatEur(r.totalCommissions)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFcfa(r.totalCommissions)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── NOTIFICATIONS RETRAITS PAYÉS ─── */}
      {paidWithdrawals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-green-500" />
            <h2 className="font-bold text-gray-900">
              Derniers retraits payés
            </h2>
          </div>
          <div className="space-y-2">
            {paidWithdrawals.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {formatEur(w.amount)}
                    <span className="text-xs text-gray-500 ml-2">
                      ({formatFcfa(w.amount)})
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(w.processedAt ?? w.requestedAt).toLocaleString(
                      "fr-FR"
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <Check className="w-3 h-3" />
                  Payé
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  valueEur,
  valueRaw,
  color = "orange",
}: {
  icon: React.ReactNode;
  label: string;
  valueEur?: number;
  valueRaw?: string;
  color?: "orange" | "green" | "blue" | "indigo" | "yellow";
}) {
  const colors = {
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      <div className="text-xs text-gray-500 font-medium mt-3">{label}</div>
      {valueEur !== undefined ? (
        <>
          <div className="text-lg md:text-xl font-bold text-gray-900 mt-1">
            {formatEur(valueEur)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {formatFcfa(valueEur)}
          </div>
        </>
      ) : (
        <div className="text-lg md:text-xl font-bold text-gray-900 mt-1">
          {valueRaw}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * LEADERBOARD
 * ═══════════════════════════════════════════════════════════ */

function LeaderboardTab({ period }: { period: Period }) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "commissions" | "sales" | "clients" | "ventes"
  >("commissions");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminGetLeaderboard(period);
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  const sorted = useMemo(() => {
    if (!data) return [];
    const copy = [...data.leaderboard];
    switch (sortBy) {
      case "sales":
        return copy.sort((a, b) => b.totalSales - a.totalSales);
      case "clients":
        return copy.sort((a, b) => b.clientsCount - a.clientsCount);
      case "ventes":
        return copy.sort((a, b) => b.salesCount - a.salesCount);
      case "commissions":
      default:
        return copy.sort((a, b) => b.totalCommissions - a.totalCommissions);
    }
  }, [data, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filtres de tri */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">
          Trier par :
        </span>
        {[
          { v: "commissions", l: "Commissions" },
          { v: "sales", l: "Chiffre d'affaires" },
          { v: "clients", l: "Clients" },
          { v: "ventes", l: "Nb ventes" },
        ].map((s) => (
          <button
            key={s.v}
            onClick={() => setSortBy(s.v as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              sortBy === s.v
                ? "bg-orange-500 text-white"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {s.l}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="p-12 text-center">
            <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="text-gray-500 font-medium">
              Aucun commercial pour cette période
            </div>
          </div>
        )}
        {!loading && sorted.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Rang
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Commercial
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    Clients
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    Ventes
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    CA
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    Commissions
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    Disponible
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((r) => (
                  <tr key={r.commercialId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-xl">{rankMedal(r.rank)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {r.affiliateCode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {r.clientsCount}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {r.salesCount}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatEur(r.totalSales)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatEur(r.totalCommissions)}
                      <div className="text-xs text-gray-500 font-normal">
                        {formatFcfa(r.totalCommissions)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">
                      {formatEur(r.available)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 * COMMERCIALS
 * ═══════════════════════════════════════════════════════════ */

function CommercialsTab() {
  const [commercials, setCommercials] = useState<AdminCommercialRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, l] = await Promise.all([
        adminListCommercials(),
        adminGetLeaderboard("all"),
      ]);
      setCommercials(r.commercials);
      setLeaderboard(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statsMap = useMemo(() => {
    const m = new Map<string, LeaderboardResponse["leaderboard"][0]>();
    if (leaderboard) {
      for (const r of leaderboard.leaderboard) {
        m.set(r.commercialId, r);
      }
    }
    return m;
  }, [leaderboard]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-gray-500">
          {commercials.length} commercial{commercials.length > 1 ? "aux" : ""}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau commercial
        </button>
      </div>

      {showForm && (
        <CreateCommercialForm
          onSuccess={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        )}
        {!loading && commercials.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="text-gray-500 font-medium">Aucun commercial</div>
          </div>
        )}
        {!loading && commercials.length > 0 && (
          <div className="divide-y divide-gray-100">
            {commercials.map((c) => (
              <CommercialRow
                key={c.id}
                commercial={c}
                stats={statsMap.get(c.id)}
                onUpdate={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommercialRow({
  commercial,
  stats,
  onUpdate,
}: {
  commercial: AdminCommercialRow;
  stats?: LeaderboardResponse["leaderboard"][0];
  onUpdate: () => void;
}) {
  const [editingRate, setEditingRate] = useState(false);
  const [rate, setRate] = useState(commercial.commissionRate.toString());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const n = parseFloat(rate);
    if (!Number.isFinite(n) || n < 0 || n > 100) return;
    setSaving(true);
    try {
      await adminUpdateRate(commercial.id, n);
      setEditingRate(false);
      onUpdate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">
              {commercial.name}
            </span>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                commercial.status === "active"
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {commercial.status === "active" ? "Actif" : "Inactif"}
            </span>
            <span className="font-mono text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">
              {commercial.affiliateCode}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">{commercial.email}</div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
              <div>
                <div className="text-gray-500">Clients</div>
                <div className="font-bold text-gray-900">
                  {stats.clientsCount}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Ventes</div>
                <div className="font-bold text-gray-900">{stats.salesCount}</div>
              </div>
              <div>
                <div className="text-gray-500">CA total</div>
                <div className="font-bold text-gray-900">
                  {formatEur(stats.totalSales)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Commissions</div>
                <div className="font-bold text-orange-600">
                  {formatEur(stats.totalCommissions)}
                </div>
                <div className="text-[10px] text-gray-400">
                  {formatFcfa(stats.totalCommissions)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editingRate ? (
            <>
              <input
                type="number"
                min="0"
                max="100"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              />
              <span className="text-sm text-gray-500">%</span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setEditingRate(false);
                  setRate(commercial.commissionRate.toString());
                }}
                className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="text-sm">
                <span className="text-gray-500">Taux :</span>{" "}
                <span className="font-semibold text-gray-900">
                  {commercial.commissionRate}%
                </span>
              </div>
              <button
                onClick={() => setEditingRate(true)}
                className="text-xs text-orange-500 hover:text-orange-600 font-medium"
              >
                Modifier
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateCommercialForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rate, setRate] = useState("50");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminCreateCommercial({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        commissionRate: parseFloat(rate) || 50,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-orange-200 p-6 space-y-4"
    >
      <h3 className="font-bold text-gray-900">Créer un commercial</h3>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nom complet
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : David Kouam"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="david@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Taux (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-medium px-5 py-2.5 rounded-lg"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Créer
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
 * WITHDRAWALS
 * ═══════════════════════════════════════════════════════════ */

function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState<
    (WithdrawalRow & { commercialName: string; commercialCode: string })[]
  >([]);
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminListWithdrawals(filter || undefined);
      setWithdrawals(r.withdrawals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const paidCount = useMemo(
    () => withdrawals.filter((w) => w.status === "paid").length,
    [withdrawals]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap items-center">
        {[
          { v: "pending", label: "En attente", badge: true },
          { v: "approved", label: "Approuvées" },
          { v: "paid", label: "Payées", badge: true },
          { v: "rejected", label: "Refusées" },
          { v: "", label: "Toutes" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.v
                ? "bg-orange-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Rafraîchir"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        )}
        {!loading && withdrawals.length === 0 && (
          <div className="p-12 text-center">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="text-gray-500 font-medium">
              Aucune demande dans cette catégorie
            </div>
          </div>
        )}
        {!loading && withdrawals.length > 0 && (
          <div className="divide-y divide-gray-100">
            {withdrawals.map((w) => (
              <WithdrawalAdminRow key={w.id} withdrawal={w} onUpdate={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WithdrawalAdminRow({
  withdrawal,
  onUpdate,
}: {
  withdrawal: WithdrawalRow & {
    commercialName: string;
    commercialCode: string;
  };
  onUpdate: () => void;
}) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleAction = async (
    status: "approved" | "paid" | "rejected" | "cancelled"
  ) => {
    setProcessing(status);
    try {
      await adminProcessWithdrawal(withdrawal.id, status, note || undefined);
      setNote("");
      onUpdate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setProcessing(null);
    }
  };

  const canApprove = withdrawal.status === "pending";
  const canReject = withdrawal.status === "pending";
  const canMarkPaid = withdrawal.status === "approved";

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-gray-900">
              {formatEur(withdrawal.amount)}
            </span>
            <span className="text-xs text-gray-500">
              ({formatFcfa(withdrawal.amount)})
            </span>
            <StatusBadge status={withdrawal.status} />
          </div>
          <div className="text-sm text-gray-500 mt-1">
            <strong>{withdrawal.commercialName}</strong>{" "}
            <span className="font-mono text-xs text-orange-500">
              {withdrawal.commercialCode}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Demandé le {formatDate(withdrawal.requestedAt)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {withdrawal.method} ·{" "}
            <span className="font-mono">{withdrawal.destinationMasked}</span>
          </div>
        </div>
      </div>

      {(canApprove || canReject || canMarkPaid) && (
        <div className="space-y-2 mt-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optionnelle)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {canApprove && (
              <ActionBtn
                onClick={() => handleAction("approved")}
                loading={processing === "approved"}
                color="blue"
              >
                <Check className="w-4 h-4" />
                Approuver
              </ActionBtn>
            )}
            {canMarkPaid && (
              <ActionBtn
                onClick={() => handleAction("paid")}
                loading={processing === "paid"}
                color="green"
              >
                <Check className="w-4 h-4" />
                Marquer payé
              </ActionBtn>
            )}
            {canReject && (
              <ActionBtn
                onClick={() => handleAction("rejected")}
                loading={processing === "rejected"}
                color="red"
              >
                <X className="w-4 h-4" />
                Refuser
              </ActionBtn>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: WithdrawalRow["status"] }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    approved: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const labels: Record<string, string> = {
    pending: "En attente",
    approved: "Approuvée",
    paid: "Payée",
    rejected: "Refusée",
    cancelled: "Annulée",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}
    >
      <Clock className="w-3 h-3" />
      {labels[status]}
    </span>
  );
}

function ActionBtn({
  onClick,
  loading,
  color,
  children,
}: {
  onClick: () => void;
  loading: boolean;
  color: "blue" | "green" | "red";
  children: React.ReactNode;
}) {
  const colors = {
    blue: "bg-blue-500 hover:bg-blue-600",
    green: "bg-green-500 hover:bg-green-600",
    red: "bg-red-500 hover:bg-red-600",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 ${colors[color]} disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}