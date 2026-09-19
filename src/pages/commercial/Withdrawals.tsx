// Fichier : src/pages/commercial/Withdrawals.tsx

import { useEffect, useState, FormEvent } from "react";
import {
  Wallet,
  Plus,
  AlertCircle,
  Check,
  X,
  Clock,
  Send,
} from "lucide-react";
import {
  getWithdrawals,
  requestWithdrawal,
  getMe,
  type WithdrawalRow,
} from "../../lib/affiliate-api";

const STATUS_LABELS: Record<
  WithdrawalRow["status"],
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: "En attente",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: <Clock className="w-3 h-3" />,
  },
  approved: {
    label: "Approuvée",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Check className="w-3 h-3" />,
  },
  paid: {
    label: "Payée",
    className: "bg-green-50 text-green-700 border-green-200",
    icon: <Check className="w-3 h-3" />,
  },
  rejected: {
    label: "Refusée",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: <X className="w-3 h-3" />,
  },
  cancelled: {
    label: "Annulée",
    className: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <X className="w-3 h-3" />,
  },
};

const METHODS = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "crypto", label: "Crypto" },
];

export default function CommercialWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [available, setAvailable] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, me] = await Promise.all([getWithdrawals(), getMe()]);
      setWithdrawals(w.withdrawals);
      setAvailable(me.kpis.available);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(n);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const numericAmount = parseFloat(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("Montant invalide");
      return;
    }
    if (numericAmount > available) {
      setFormError(
        `Montant supérieur à ton solde disponible (${formatEur(available)})`
      );
      return;
    }
    if (!destination.trim() || destination.trim().length < 3) {
      setFormError("Numéro / IBAN / adresse requis (min 3 caractères)");
      return;
    }

    setSubmitting(true);
    try {
      await requestWithdrawal({
        amount: numericAmount,
        method,
        destinationMasked: destination.trim(),
      });
      setFormSuccess(true);
      setAmount("");
      setDestination("");
      setShowForm(false);
      await load();
      setTimeout(() => setFormSuccess(false), 5000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes retraits</h1>
          <p className="text-gray-500 mt-1">
            Gérez vos demandes de retrait
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          disabled={available <= 0}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle demande
        </button>
      </div>

      {/* Solde disponible */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
        <div className="text-green-100 text-sm font-medium">
          Solde disponible
        </div>
        <div className="text-3xl font-bold mt-1">{formatEur(available)}</div>
        {available <= 0 && (
          <div className="text-green-100 text-sm mt-2">
            Aucun solde disponible au retrait actuellement
          </div>
        )}
      </div>

      {formSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <div className="text-sm text-green-800 font-medium">
            Demande envoyée ! Elle sera traitée par un administrateur.
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* FORMULAIRE */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-orange-200 p-6 space-y-4"
        >
          <div>
            <h2 className="font-bold text-gray-900">Nouvelle demande de retrait</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Montant disponible : {formatEur(available)}
            </p>
          </div>

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Montant (EUR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={available}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex : 50.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Méthode
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Destination (numéro / IBAN / adresse)
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex : +237 6XX XXX XXX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Cette information sera masquée dans l'historique et utilisée
              uniquement pour le paiement.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Envoi..." : "Envoyer la demande"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
              className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* HISTORIQUE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Historique des demandes</h2>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        )}

        {!loading && withdrawals.length === 0 && (
          <div className="p-12 text-center">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="text-gray-500 font-medium">
              Aucune demande de retrait
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Tes demandes apparaîtront ici
            </div>
          </div>
        )}

        {!loading && withdrawals.length > 0 && (
          <div className="divide-y divide-gray-100">
            {withdrawals.map((w) => {
              const s = STATUS_LABELS[w.status];
              return (
                <div
                  key={w.id}
                  className="p-4 sm:p-6 flex items-start justify-between gap-3 flex-wrap"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-gray-900">
                        {formatEur(w.amount)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.className}`}
                      >
                        {s.icon}
                        {s.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {METHODS.find((m) => m.value === w.method)?.label ??
                        w.method}{" "}
                      · <span className="font-mono">{w.destinationMasked}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Demandé le {formatDate(w.requestedAt)}
                      {w.processedAt && (
                        <> · Traité le {formatDate(w.processedAt)}</>
                      )}
                    </div>
                    {w.adminNote && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-100">
                        <strong>Note admin :</strong> {w.adminNote}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
