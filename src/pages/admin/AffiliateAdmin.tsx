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
  Mail,
  ExternalLink,
} from "lucide-react";
import {
  adminListCommercials,
  adminCreateCommercial,
  adminUpdateRate,
  adminUpdateStatus,
  adminUpdateCommercialDetails,
  adminListWithdrawals,
  adminProcessWithdrawal,
  adminGetStats,
  adminGetLeaderboard,
  adminGetCommercialAccount,
  adminGetCommercialClients,
  adminSendAffiliateContact,
  adminListPartnerApplications,
  adminProcessPartnerApplication,
  adminResendPartnerApprovalEmail,
  type PartnerApplicationRow,
  type AdminCommercialAccount,
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

type Tab = "overview" | "leaderboard" | "applications" | "commercials" | "withdrawals";
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
            active={tab === "applications"}
            onClick={() => setTab("applications")}
            icon={<Mail className="w-4 h-4" />}
          >
            Candidatures
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
        {tab === "applications" && <ApplicationsTab />}
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
 * CANDIDATURES COMMERCIALES
 * ═══════════════════════════════════════════════════════════ */
function ApplicationsTab() {
  const [applications, setApplications] = useState<PartnerApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true); setError(null);
    try { const result = await adminListPartnerApplications(); setApplications(result.applications); }
    catch (err) { setError(err instanceof Error ? err.message : "Impossible de charger les candidatures."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const process = async (application: PartnerApplicationRow, action: "approve" | "reject") => {
    const prompt = action === "approve" ? "approuver cette candidature et créer le commercial avec 50 % de commission sur la marge" : "refuser cette candidature";
    if (!window.confirm("Confirmer : " + prompt + " ?")) return;
    setBusyId(application.id); setError(null);
    try {
      const result = await adminProcessPartnerApplication(application.id, action);
      if (action === "approve") alert(result.emailSent
        ? "Candidature approuvée. Le commercial a été créé et le courriel envoyé à " + application.email + "."
        : "Le commercial a été créé, mais le courriel n'a pas pu être envoyé. Vous pourrez le renvoyer depuis cette fiche.");
      else alert("La candidature a été refusée.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Une erreur est survenue."); }
    finally { setBusyId(null); }
  };
  const resend = async (application: PartnerApplicationRow) => {
    setBusyId(application.id); setError(null);
    try { await adminResendPartnerApprovalEmail(application.id); alert("Courriel envoyé à " + application.email + "."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Échec de l'envoi du courriel."); }
    finally { setBusyId(null); }
  };
  const pendingCount = applications.filter((a) => a.status === "pending").length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="font-semibold text-gray-900">Demandes de partenariat commercial</h2>
          <p className="text-sm text-gray-500">{pendingCount} candidature{pendingCount > 1 ? "s" : ""} en attente · {applications.length} au total</p></div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </button>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <div className="rounded-xl border bg-white p-10 text-center text-gray-400">Chargement des candidatures…</div>
      : applications.length === 0 ? <div className="rounded-xl border bg-white p-10 text-center text-gray-500">Aucune candidature enregistrée pour le moment.</div>
      : <div className="space-y-3">{applications.map((application) => (
        <div key={application.id} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><div className="font-semibold text-gray-900">{application.name || [application.firstName, application.lastName].filter(Boolean).join(" ")}</div>
              <div className="mt-1 text-sm text-gray-500 break-all">{application.email}</div>
              <div className="mt-1 text-sm text-gray-500">{application.city}{application.country && application.country !== application.city ? " · " + application.country : ""}</div></div>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${application.status === "pending" ? "border-amber-200 bg-amber-50 text-amber-700" : application.status === "approved" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              {application.status === "pending" ? "En attente" : application.status === "approved" ? "Approuvée" : "Refusée"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">WhatsApp</div><div className="mt-1 font-medium text-gray-800">{application.whatsappPhone || "—"}</div></div>
            <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Candidature reçue</div><div className="mt-1 font-medium text-gray-800">{application.submittedAt ? new Date(application.submittedAt).toLocaleString("fr-FR") : "—"}</div></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`mailto:${application.email}?subject=${encodeURIComponent("Votre candidature commerciale Texerra SMS")}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><Mail className="h-4 w-4" /> Contacter par e-mail</a>
            <a href={`https://wa.me/${String(application.whatsappPhone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50"><ExternalLink className="h-4 w-4" /> WhatsApp</a>
            {application.status === "pending" && <>
              <button onClick={() => process(application, "approve")} disabled={busyId === application.id} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">{busyId === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approuver et créer le commercial</button>
              <button onClick={() => process(application, "reject")} disabled={busyId === application.id} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"><X className="h-4 w-4" /> Refuser</button>
            </>}
            {application.status === "approved" && application.approvalEmailStatus !== "sent" && <button onClick={() => resend(application)} disabled={busyId === application.id} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">{busyId === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Renvoyer le courriel de confirmation</button>}
            {application.status === "approved" && application.approvalEmailStatus === "sent" && <span className="self-center text-xs font-medium text-green-700">Courriel de confirmation envoyé</span>}
          </div>
          {application.status === "approved" && application.commercialId && <p className="mt-3 text-xs text-gray-500">Fiche commerciale créée : {application.commercialId} · Commission configurée à 50 % de la marge éligible.</p>}
        </div>
      ))}</div>}
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending_contract" | "inactive">("all");

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

  const filteredCommercials = commercials.filter((commercial) => statusFilter === "all" || commercial.status === statusFilter);
  const activeCount = commercials.filter((commercial) => commercial.status === "active").length;
  const pendingCount = commercials.filter((commercial) => commercial.status === "pending_contract").length;
  const inactiveCount = commercials.filter((commercial) => commercial.status === "inactive").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm font-medium text-gray-700">{commercials.length} commercial{commercials.length > 1 ? "aux" : ""}</div>
          <div className="mt-1 text-xs text-gray-500">{activeCount} actif(s) · {pendingCount} contrat(s) à signer · {inactiveCount} désactivé(s)</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="all">Tous les commerciaux</option>
            <option value="active">Commerciaux actifs</option>
            <option value="pending_contract">Contrat à signer</option>
            <option value="inactive">Commerciaux désactivés</option>
          </select>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau commercial
          </button>
        </div>
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
        {!loading && filteredCommercials.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="text-gray-500 font-medium">{commercials.length === 0 ? "Aucun commercial" : "Aucun commercial pour ce filtre"}</div>
          </div>
        )}
        {!loading && filteredCommercials.length > 0 && (
          <div className="divide-y divide-gray-100">
            {filteredCommercials.map((c) => (
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
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoName, setInfoName] = useState(commercial.name);
  const [infoCountry, setInfoCountry] = useState(commercial.country ?? "");
  const [infoWhatsApp, setInfoWhatsApp] = useState(commercial.whatsappPhone ?? "");
  const [infoSaving, setInfoSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [account, setAccount] = useState<AdminCommercialAccount | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [clientsPage, setClientsPage] = useState(1);
  const [contactTarget, setContactTarget] = useState<{
    targetType: "commercial" | "client";
    targetId: string;
    name: string;
    email: string;
    meta?: { country?: string; successfulOrders?: number; attributedAt?: string | null };
  } | null>(null);
  const [contactTemplate, setContactTemplate] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);

  const openContact = (
    targetType: "commercial" | "client",
    targetId: string,
    name: string,
    email: string,
    meta?: { country?: string; successfulOrders?: number; attributedAt?: string | null }
  ) => {
    if (!email) return;
    setContactTarget({ targetType, targetId, name: name || "cher partenaire", email, meta });
    setContactTemplate("");
    setContactSubject("");
    setContactMessage("");
  };

  const applyContactTemplate = (templateId: string) => {
    setContactTemplate(templateId);
    const firstName = (contactTarget?.name || "").trim().split(/\s+/)[0] || "Bonjour";
    const commercialPerformance = stats
      ? `\n\nVotre activité actuelle dans notre programme :\n- Clients attribués : ${stats.clientsCount}\n- Ventes enregistrées : ${stats.salesCount}\n- Volume de ventes : ${formatEur(stats.totalSales)}\n- Commissions générées : ${formatEur(stats.totalCommissions)}.\n\nCes chiffres nous permettent de mieux comprendre votre progression et de voir où un accompagnement pourrait vous être utile.`
      : "\n\nNous souhaitons faire le point sur votre progression et comprendre les besoins qui pourraient vous aider à avancer.";
    const countryLine = commercial?.country ? `\nVotre marché déclaré : ${commercial.country}.` : "";
    const clientMetaFacts: string[] = [];
    const clientMeta = contactTarget?.meta;
    if (clientMeta) {
      const country = String(clientMeta.country ?? "").trim();
      if (country) clientMetaFacts.push(`- Pays : ${country}`);

      if (typeof clientMeta.successfulOrders === "number" && Number.isFinite(clientMeta.successfulOrders)) {
        clientMetaFacts.push(`- Commandes réussies : ${clientMeta.successfulOrders}`);
      }

      if (clientMeta.attributedAt) {
        const attributedDate = new Date(clientMeta.attributedAt);
        if (!Number.isNaN(attributedDate.getTime())) {
          clientMetaFacts.push(`- Attribution au programme : ${attributedDate.toLocaleString("fr-FR")}`);
        }
      }
    }
    const clientFacts = clientMetaFacts.length
      ? `\n\nInformations liées à votre relation avec Texerra :\n${clientMetaFacts.join("\n")}.`
      : "";
    const templates: Record<string, { subject: string; message: string }> = {
      commercial_encouragement: {
        subject: "Nous vous remercions pour votre engagement avec Texerra",
        message: `Bonjour ${firstName},\n\nNous tenions à vous écrire personnellement pour vous remercier du temps et de l’énergie que vous consacrez au développement de Texerra SMS. Nous savons que trouver des clients, présenter un service et entretenir une relation de confiance demande de la régularité. Votre engagement compte pour nous et nous ne le considérons pas comme acquis.${commercialPerformance}${countryLine}\n\nNous aimerions savoir comment vous vivez cette collaboration aujourd’hui. Qu’est-ce qui fonctionne bien pour vous ? Qu’est-ce qui vous semble plus difficile ? Nous souhaitons que vous puissiez vous sentir accompagné, et pas simplement recevoir un lien d’affiliation.\n\nRépondez directement à cet e-mail pour nous dire comment vous allez et ce dont vous auriez besoin pour développer votre activité.\n\nAvec toute notre considération,\nLa direction Texerra SMS`,
      },
      commercial_checkin: {
        subject: "Prenons de vos nouvelles et faisons le point sur votre activité",
        message: `Bonjour ${firstName},\n\nNous prenons un moment pour savoir comment vous allez et comment se déroule votre activité commerciale avec Texerra SMS.${commercialPerformance}${countryLine}\n\nRencontrez-vous actuellement des difficultés pour trouver de nouveaux clients, expliquer le fonctionnement des numéros, créer du contenu ou convertir les personnes intéressées ? Avez-vous eu un problème avec votre espace commercial, votre lien de recommandation ou le suivi des commissions ?\n\nNous préférons connaître les difficultés assez tôt afin de chercher une solution avec vous. Vous pouvez nous répondre librement en précisant ce qui vous bloque le plus aujourd’hui.\n\nNous sommes à votre écoute et prêts à vous accompagner.\n\nBien cordialement,\nLa direction Texerra SMS`,
      },
      commercial_support: {
        subject: "Comment pouvons-nous vous aider à trouver davantage de clients ?",
        message: `Bonjour ${firstName},\n\nNous aimerions vous proposer un accompagnement concret pour vous aider à développer vos ventes. Il peut s’agir de préparer un message de présentation, de vous conseiller sur les groupes et communautés à cibler, de vous aider à créer des publications, ou de vous montrer comment expliquer simplement les avantages de Texerra à un nouveau client.${commercialPerformance}${countryLine}\n\nDites-nous quelle difficulté vous rencontrez en ce moment et quel type d’aide vous serait le plus utile. Nous pourrons réfléchir avec vous à une méthode réaliste, adaptée à votre marché et à votre disponibilité.\n\nVotre progression nous importe : nous voulons construire cette collaboration avec vous, étape par étape.\n\nRépondez à cet e-mail pour que nous puissions organiser cet accompagnement.\n\nBien cordialement,\nLa direction Texerra SMS`,
      },
      commercial_progress: {
        subject: "Faisons progresser ensemble vos résultats Texerra",
        message: `Bonjour ${firstName},\n\nNous souhaitons faire le point sur vos résultats et identifier la prochaine étape qui pourrait vous permettre de progresser.${commercialPerformance}${countryLine}\n\nAvez-vous déjà une méthode de prospection qui fonctionne ? Si oui, nous aimerions comprendre ce qui vous apporte les meilleurs retours. Si vous n’avez pas encore trouvé une méthode régulière, nous pouvons vous aider à préparer un plan simple : choix de votre audience, présentation de l’offre, publications et suivi des personnes intéressées.\n\nRépondez-nous en nous indiquant votre objectif pour les prochains jours et le principal obstacle que vous rencontrez. Nous chercherons ensemble une action concrète à mettre en place.\n\nBien cordialement,\nLa direction Texerra SMS`,
      },
      client_followup: {
        subject: "Nous aimerions savoir comment se passe votre expérience Texerra",
        message: `Bonjour ${firstName},\n\nNous souhaitions prendre de vos nouvelles et savoir comment se déroule votre expérience avec Texerra SMS. Nous avons apprécié vous accueillir sur la plateforme et nous aimerions nous assurer que nos services répondent toujours à vos besoins.${clientFacts}\n\nAvez-vous rencontré une difficulté avec une commande, un numéro, un dépôt ou le choix d’un service ? Y a-t-il une amélioration qui vous permettrait d’utiliser Texerra plus facilement ?\n\nVotre retour sera lu avec attention par notre équipe. Répondez directement à cet e-mail pour nous expliquer votre situation ; nous serons heureux de vous aider.\n\nMerci pour votre confiance.\nL’équipe Texerra SMS`,
      },
      client_thanks: {
        subject: "Merci de faire confiance à Texerra SMS",
        message: `Bonjour ${firstName},\n\nNous tenions à vous remercier personnellement pour votre confiance et pour avoir utilisé Texerra SMS. Chaque utilisateur qui choisit notre plateforme nous donne une responsabilité : proposer un service compréhensible, fiable et une assistance accessible.${clientFacts}\n\nNous espérons que vos utilisations se sont bien déroulées. Si vous avez une remarque, une suggestion ou une difficulté qui mérite notre attention, vous pouvez simplement répondre à cet e-mail.\n\nNous serons heureux de vous accompagner lors de vos prochaines utilisations.\n\nBien cordialement,\nL’équipe Texerra SMS`,
      },
      client_support: {
        subject: "Besoin d’aide sur votre compte Texerra ?",
        message: `Bonjour ${firstName},\n\nNous vous écrivons pour vérifier que tout fonctionne correctement sur votre compte Texerra SMS.${clientFacts}\n\nSi un numéro n’a pas fonctionné, si un code SMS n’est pas arrivé, si un dépôt semble bloqué ou si vous avez une question sur une commande, expliquez-nous simplement ce que vous avez constaté. Nous vérifierons les informations utiles et vous guiderons vers la bonne solution.\n\nVous pouvez répondre directement à ce message. Nous vous remercions de nous permettre de vous accompagner.\n\nBien cordialement,\nL’équipe Texerra SMS`,
      },
    };
    const selected = templates[templateId];
    if (selected) { setContactSubject(selected.subject); setContactMessage(selected.message); }
  };
  const sendContact = async () => {
    if (!contactTarget || !contactSubject.trim() || !contactMessage.trim()) return;
    setContactSending(true);
    try {
      await adminSendAffiliateContact({
        targetType: contactTarget.targetType,
        targetId: contactTarget.targetId,
        templateId: contactTemplate || "custom",
        subject: contactSubject.trim(),
        message: contactMessage.trim(),
      });
      const sentTarget = contactTarget;
      setContactTarget(null);
      alert(`E-mail envoyé à ${sentTarget.email}.`);
      if (sentTarget.targetType === "commercial") {
        try {
          const refreshed = await adminGetCommercialAccount(commercial.id);
          setAccount(refreshed);
        } catch { /* L'envoi est déjà confirmé ; l'historique se rafraîchira à la prochaine ouverture. */ }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Échec de l'envoi de l'e-mail.");
    } finally { setContactSending(false); }
  };

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

  const toggleCommercialStatus = async () => {
    const nextStatus = commercial.status === "active" ? "inactive" : "active";
    if (nextStatus === "active") {
      const confirmation = window.prompt("Vérifiez le contrat signé, puis saisissez exactement CONTRAT SIGNE pour confirmer l’activation.");
      if (confirmation !== "CONTRAT SIGNE") return;
    } else if (!window.confirm("Confirmer la révocation immédiate des droits commerciaux ? Les commissions déjà enregistrées seront conservées.")) {
      return;
    }
    setStatusSaving(true);
    try {
      await adminUpdateStatus(commercial.id, nextStatus, nextStatus === "active");
      onUpdate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Impossible de modifier le statut.");
    } finally {
      setStatusSaving(false);
    }
  };

  const saveCommercialInfo = async () => {
    const cleanName = infoName.trim();
    const cleanCountry = infoCountry.trim();
    const cleanPhone = infoWhatsApp.trim().replace(/[\s().-]/g, "");
    if (!cleanName) { alert("Le nom du commercial est obligatoire."); return; }
    if (cleanPhone && !/^\+[1-9]\d{7,14}$/.test(cleanPhone)) {
      alert("Le numéro WhatsApp doit être au format international, avec + et indicatif du pays.");
      return;
    }
    setInfoSaving(true);
    try {
      await adminUpdateCommercialDetails({
        id: commercial.id,
        name: cleanName,
        country: cleanCountry,
        whatsappPhone: cleanPhone,
      });
      setInfoName(cleanName);
      setInfoCountry(cleanCountry);
      setInfoWhatsApp(cleanPhone);
      setEditingInfo(false);
      onUpdate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Impossible de mettre à jour les informations.");
    } finally {
      setInfoSaving(false);
    }
  };

  const toggleDetails = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (account) return;
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const [a, c] = await Promise.all([adminGetCommercialAccount(commercial.id), adminGetCommercialClients(commercial.id, 1)]);
      setAccount(a);
      setClients(c.clients);
      setClientsTotal(c.pagination.total);
      setClientsPage(c.pagination.page);
    } catch (e) {
      setDetailsError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally { setDetailsLoading(false); }
  };

  const loadMoreClients = async () => {
    if (detailsLoading || clients.length >= clientsTotal) return;
    setDetailsLoading(true);
    try {
      const next = await adminGetCommercialClients(commercial.id, clientsPage + 1);
      setClients((current) => [...current, ...next.clients]);
      setClientsPage(next.pagination.page);
    } catch (e) {
      setDetailsError(e instanceof Error ? e.message : "Impossible de charger les clients suivants.");
    } finally { setDetailsLoading(false); }
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
                commercial.status === "active" ? "bg-green-50 text-green-700" : commercial.status === "pending_contract" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              {commercial.status === "active" ? "Actif" : commercial.status === "pending_contract" ? "Contrat à signer" : "Désactivé"}
            </span>
            <span className="font-mono text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">
              {commercial.affiliateCode}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">{commercial.email}</div>
          <div className="text-xs text-gray-500 mt-1">Pays : {commercial.country || "Non renseigné"} · WhatsApp : {commercial.whatsappPhone || "Non renseigné"} · Compte utilisateur : {commercial.firebaseUid ? "lié" : "à relier au premier accès"}</div>

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

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setEditingInfo((value) => !value)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">{editingInfo ? "Fermer les informations" : "Modifier les informations"}</button>
          <button onClick={() => openContact("commercial", commercial.id, commercial.name, commercial.email)} className="text-xs px-3 py-1.5 border border-orange-200 rounded-lg text-orange-700 hover:bg-orange-50">Écrire au commercial</button>
          <button onClick={toggleDetails} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">{expanded ? "Masquer comptes" : "Compte utilisateur & clients"}</button>
          <button onClick={toggleCommercialStatus} disabled={statusSaving} className={`text-xs px-3 py-1.5 border rounded-lg disabled:opacity-50 ${commercial.status === "active" ? "border-red-200 text-red-700 hover:bg-red-50" : "border-green-200 text-green-700 hover:bg-green-50"}`}>
            {statusSaving ? "Mise à jour…" : commercial.status === "active" ? "Révoquer les droits" : commercial.status === "pending_contract" ? "Activer après contrat signé" : "Réactiver après vérification du contrat"}
          </button>
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
      {editingInfo && (
        <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/40 p-4 space-y-3">
          <div className="font-semibold text-sm text-gray-900">Informations modifiables</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-gray-600">Nom complet
              <input value={infoName} onChange={(e) => setInfoName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="text-xs text-gray-600">Pays
              <input value={infoCountry} onChange={(e) => setInfoCountry(e.target.value)} placeholder="Pays du commercial" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900" />
            </label>
            <label className="text-xs text-gray-600">WhatsApp
              <input value={infoWhatsApp} onChange={(e) => setInfoWhatsApp(e.target.value)} placeholder="+237..." className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900" />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">Adresse e-mail non modifiable : {commercial.email}</p>
            <div className="flex gap-2">
              <button onClick={() => { setInfoName(commercial.name); setInfoCountry(commercial.country ?? ""); setInfoWhatsApp(commercial.whatsappPhone ?? ""); setEditingInfo(false); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">Annuler</button>
              <button onClick={saveCommercialInfo} disabled={infoSaving} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{infoSaving ? "Enregistrement…" : "Enregistrer les informations"}</button>
            </div>
          </div>
        </div>
      )}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {detailsLoading && <p className="text-sm text-gray-400">Chargement du compte et des clients attribués…</p>}
          {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
          {account?.dataWarnings?.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {account.dataWarnings.join(" ")}
            </div>
          ) : null}
          {account && !detailsLoading && (
            <>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <div className="font-semibold text-sm text-blue-900">Compte utilisateur normal</div>
                {account.linked && account.user ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                    <div><div className="text-blue-700/70">Nom</div><strong>{account.user.name || "—"}</strong></div>
                    <div><div className="text-blue-700/70">Email</div><strong>{account.user.email || "—"}</strong></div>
                    <div><div className="text-blue-700/70">Inscription</div><strong>{new Date(account.user.createdAt).toLocaleDateString("fr-FR")}</strong></div>
                    <div><div className="text-blue-700/70">Dernière connexion</div><strong>{account.user.lastSignInAt ? new Date(account.user.lastSignInAt).toLocaleString("fr-FR") : "Non disponible"}</strong></div>
                    <div><div className="text-blue-700/70">Pays du compte</div><strong>{account.user.countryFlag || ""} {account.user.countryName || account.user.countryIso || "Non renseigné"}</strong></div>
                    <div><div className="text-blue-700/70">Solde personnel</div><strong>{formatEur(account.user.balance)}</strong></div>
                    <div><div className="text-blue-700/70">Commandes réussies</div><strong>{account.user.successfulOrders}</strong></div>
                    <div><div className="text-blue-700/70">Commandes totales</div><strong>{account.user.totalOrders}</strong></div>
                    <div><div className="text-blue-700/70">Dépenses réussies</div><strong>{formatEur(account.user.totalSuccessfulSpend)}</strong></div>
                  </div>
                ) : <p className="text-xs text-blue-800 mt-2">Aucun compte utilisateur Texerra trouvé pour cet e-mail. Le lien sera réessayé au premier accès commercial.</p>}
              </div>
              <div>
                <div className="font-semibold text-sm mb-2">Historique des contacts du commercial</div>
                {(account.contactHistory || []).length ? <div className="space-y-2">{account.contactHistory!.map((item) => <div key={item.id} className="border rounded-lg px-3 py-2 text-xs"><div className="flex flex-wrap justify-between gap-2"><strong>E-mail · {item.status === "sent" ? "Envoyé" : item.status || "Historique"}</strong><span className="text-gray-500">{new Date(item.createdAt).toLocaleString("fr-FR")}</span></div><div className="text-gray-500 mt-1">{item.subject || "Communication"}</div></div>)}</div> : <p className="text-xs text-gray-400">Aucun e-mail enregistré pour ce commercial.</p>}
              </div>
              <div>
                <div className="font-semibold text-sm mb-2">Clients attribués à ce commercial ({clientsTotal})</div>
                {clients.length ? <div className="overflow-x-auto border rounded-xl"><table className="w-full text-xs"><thead className="bg-gray-50"><tr><th className="p-2 text-left">Client</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Téléphone</th><th className="p-2 text-left">Pays</th><th className="p-2 text-right">Commandes réussies</th><th className="p-2 text-left">Attribution</th><th className="p-2 text-center">Contact</th></tr></thead><tbody>{clients.map((client) => <tr key={client.id} className="border-t"><td className="p-2">{client.name}</td><td className="p-2">{client.email || "—"}</td><td className="p-2">{client.phone || "—"}</td><td className="p-2">{client.countryFlag || ""} {client.countryName || client.countryIso || "—"}</td><td className="p-2 text-right">{client.successfulOrders}</td><td className="p-2">{client.attributedAt ? new Date(client.attributedAt).toLocaleDateString("fr-FR") : "—"}</td><td className="p-2 text-center">{client.email ? <button onClick={() => openContact("client", client.id, client.name, client.email, { country: client.countryName || client.countryIso || "", successfulOrders: client.successfulOrders, attributedAt: client.attributedAt })} className="px-2 py-1 rounded border border-orange-200 text-orange-700 hover:bg-orange-50">E-mail</button> : "—"}</td></tr>)}</tbody></table></div> : <p className="text-xs text-gray-400">Aucun client attribué.</p>}
                {clients.length < clientsTotal && <button onClick={loadMoreClients} disabled={detailsLoading} className="mt-2 px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50 disabled:opacity-50">{detailsLoading ? "Chargement…" : `Afficher les clients suivants (${clients.length}/${clientsTotal})`}</button>}
              </div>
            </>
          )}
        </div>
      )}
      {contactTarget && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setContactTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="font-semibold text-gray-900">Contacter {contactTarget.targetType === "commercial" ? "le commercial" : "le client"}</h3><p className="text-xs text-gray-500">{contactTarget.name} · {contactTarget.email}</p></div>
              <button onClick={() => setContactTarget(null)} className="text-gray-400 hover:text-gray-700 text-xl" aria-label="Fermer">×</button>
            </div>
            <label className="block text-xs font-semibold text-gray-600">Modèle de message</label>
            <select value={contactTemplate} onChange={(e) => applyContactTemplate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Message personnalisé</option>
              {contactTarget.targetType === "commercial" ? <><option value="commercial_encouragement">Encouragement et reconnaissance</option><option value="commercial_checkin">Prendre des nouvelles et détecter les difficultés</option><option value="commercial_support">Proposer un accompagnement concret</option><option value="commercial_progress">Faire progresser les résultats</option></> : <><option value="client_followup">Demander un retour d’expérience</option><option value="client_thanks">Remercier le client</option><option value="client_support">Proposer une assistance personnalisée</option></>}
            </select>
            <label className="block text-xs font-semibold text-gray-600">Objet</label>
            <input value={contactSubject} onChange={(e) => setContactSubject(e.target.value)} maxLength={180} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Objet de l'e-mail" />
            <label className="block text-xs font-semibold text-gray-600">Message (modifiable)</label>
            <textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} maxLength={12000} rows={9} className="w-full border rounded-lg px-3 py-2 text-sm leading-relaxed" placeholder="Votre message..." />
            <div className="flex justify-end gap-2"><button onClick={() => setContactTarget(null)} className="px-4 py-2 border rounded-lg text-sm">Annuler</button><button onClick={sendContact} disabled={contactSending || !contactSubject.trim() || !contactMessage.trim()} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold disabled:opacity-50">{contactSending ? "Envoi via Resend…" : "Envoyer l'e-mail"}</button></div>
          </div>
        </div>
      )}
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
  const [country, setCountry] = useState("Cameroun");
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
        country,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5" required>
            { ["Cameroun", "Côte d'Ivoire", "Sénégal", "RD Congo", "Congo", "Gabon", "Nigeria", "Ghana", "Bénin", "Togo", "Mali", "Burkina Faso", "Niger", "Kenya", "Ouganda", "Rwanda", "Tanzanie", "Zambie", "Afrique du Sud", "Autre"] .map((value) => <option key={value} value={value}>{value}</option>) }
          </select>
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