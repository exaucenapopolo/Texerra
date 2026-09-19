// Fichier : src/pages/admin/AffiliateAdmin.tsx

import { useEffect, useState, FormEvent } from "react";
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
} from "lucide-react";
import {
  adminListCommercials,
  adminCreateCommercial,
  adminUpdateRate,
  adminListWithdrawals,
  adminProcessWithdrawal,
  adminGetStats,
  type AdminCommercialRow,
  type WithdrawalRow,
  type AdminStats,
} from "../../lib/affiliate-api";

type Tab = "overview" | "commercials" | "withdrawals";

export default function AffiliateAdmin() {
  const [tab, setTab] = useState<Tab>("overview");

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

        <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
            icon={<TrendingUp className="w-4 h-4" />}
          >
            Vue d'ensemble
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

        {tab === "overview" && <OverviewTab />}
        {tab === "commercials" && <CommercialsTab />}
        {tab === "withdrawals" && <WithdrawalsTab />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * TABS
 * ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
 * OVERVIEW
 * ───────────────────────────────────────────── */

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGetStats()
      .then((r) => setStats(r.kpis))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const formatEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(n);

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
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatCard
        icon={<TrendingUp className="w-5 h-5" />}
        label="Ventes affiliées"
        value={formatEur(stats.totalSales)}
      />
      <StatCard
        icon={<Coins className="w-5 h-5" />}
        label="Commissions générées"
        value={formatEur(stats.totalCommissions)}
      />
      <StatCard
        icon={<Wallet className="w-5 h-5" />}
        label="Réservé (retraits)"
        value={formatEur(stats.reserved)}
      />
      <StatCard
        icon={<Check className="w-5 h-5" />}
        label="Total payé"
        value={formatEur(stats.totalPaid)}
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        label="Clients attribués"
        value={stats.totalAttributions.toLocaleString("fr-FR")}
      />
      <StatCard
        icon={<Users className="w-5 h-5" />}
        label="Commerciaux actifs"
        value={stats.activeCommercials.toString()}
      />
      <StatCard
        icon={<Coins className="w-5 h-5" />}
        label="Commissions disponibles"
        value={formatEur(stats.availableCommissions)}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="inline-flex p-2 rounded-lg bg-orange-50 text-orange-600">
        {icon}
      </div>
      <div className="text-xs text-gray-500 font-medium mt-3">{label}</div>
      <div className="text-lg md:text-xl font-bold text-gray-900 mt-1">
        {value}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * COMMERCIALS
 * ───────────────────────────────────────────── */

function CommercialsTab() {
  const [commercials, setCommercials] = useState<AdminCommercialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminListCommercials();
      setCommercials(r.commercials);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
            <div className="text-gray-500 font-medium">
              Aucun commercial
            </div>
          </div>
        )}
        {!loading && commercials.length > 0 && (
          <div className="divide-y divide-gray-100">
            {commercials.map((c) => (
              <CommercialRow key={c.id} commercial={c} onUpdate={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommercialRow({
  commercial,
  onUpdate,
}: {
  commercial: AdminCommercialRow;
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

/* ─────────────────────────────────────────────
 * WITHDRAWALS
 * ───────────────────────────────────────────── */

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

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {[
          { v: "pending", label: "En attente" },
          { v: "approved", label: "Approuvées" },
          { v: "paid", label: "Payées" },
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

  const formatEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(n);

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