// Fichier : src/pages/commercial/Commissions.tsx

import { useEffect, useMemo, useState } from "react";
import {
  Coins,
  AlertCircle,
  FileDown,
  Mail,
  RefreshCw,
} from "lucide-react";
import {
  getCommissions,
  getClients,
  getMe,
  type CommissionsResponse,
  type CommissionRow,
  type ClientRow,
  type MeResponse,
} from "../../lib/affiliate-api";
import {
  DATE_PRESETS,
  getDateRange,
  isInRange,
  downloadReportPdf,
  openReportEmail,
  type DatePreset,
  type ReportPayload,
} from "../../lib/affiliate-report";

const STATUS_LABELS: Record<
  CommissionRow["status"],
  { label: string; className: string }
> = {
  available: {
    label: "Disponible",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  paid: {
    label: "Payée",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  reversed: {
    label: "Annulée",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export default function CommercialCommissions() {
  const [data, setData] = useState<CommissionsResponse | null>(null);
  const [allClients, setAllClients] = useState<ClientRow[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, cl, m] = await Promise.all([
        getCommissions(1, 100),
        getClients(1, 100),
        getMe(),
      ]);
      setData(c);
      setAllClients(cl.clients);
      setMe(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const range = useMemo(
    () => getDateRange(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  const filteredCommissions = useMemo(
    () =>
      (data?.commissions ?? []).filter((c) =>
        isInRange(c.createdAt, range)
      ),
    [data, range]
  );

  const filteredClients = useMemo(
    () =>
      allClients.filter((c) => isInRange(c.attributedAt, range)),
    [allClients, range]
  );

  const buildPayload = (): ReportPayload | null => {
    if (!me || !data) return null;

    const totalSales = filteredCommissions.reduce(
      (s, c) => s + (c.status === "reversed" ? 0 : c.orderAmount),
      0
    );
    const totalCommissions = filteredCommissions.reduce(
      (s, c) => s + (c.status === "reversed" ? 0 : c.commissionAmount),
      0
    );

    return {
      commercial: {
        name: me.commercial.name,
        email: me.commercial.email,
        affiliateCode: me.commercial.affiliateCode,
        commissionRate: me.commercial.commissionRate,
      },
      period: range.label,
      country,
      city,
      kpis: {
        clientsCount: filteredClients.length,
        totalSales,
        totalCommissions,
        available: me.kpis.available,
        totalPaid: me.kpis.totalPaid,
      },
      clients: filteredClients,
      commissions: filteredCommissions,
    };
  };

  const handleDownload = () => {
    const payload = buildPayload();
    if (!payload) return;
    setExporting(true);
    try {
      downloadReportPdf(payload);
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmail = () => {
    const payload = buildPayload();
    if (!payload) return;
    openReportEmail(payload);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes commissions</h1>
          <p className="text-gray-500 mt-1">Historique complet de tes gains</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* ─── FILTRE DE DATE ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Période du rapport
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                preset === p.value
                  ? "bg-orange-500 text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Du</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Au</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Pays (pour le rapport)
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Ex : Cameroun"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Ville (pour le rapport)
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex : Douala"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap pt-1">
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Télécharger le rapport PDF
          </button>
          <button
            onClick={handleSendEmail}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Mail className="w-4 h-4" />
            Envoyer à la direction
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Le rapport inclut les <strong>{filteredCommissions.length}</strong>{" "}
          commissions et <strong>{filteredClients.length}</strong> clients de la
          période sélectionnée.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* ─── TABLEAU COMMISSIONS ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Commande
                </th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">
                  Montant vente
                </th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">
                  Taux
                </th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">
                  Commission
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Statut
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading && filteredCommissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Coins className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">
                      Aucune commission pour cette période
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Change la période ou attends une nouvelle commande
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                filteredCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      #{c.orderId.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">
                      {formatEur(c.orderAmount)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">
                      {c.commissionRate}%
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {formatEur(c.commissionAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_LABELS[c.status].className
                        }`}
                      >
                        {STATUS_LABELS[c.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {formatDate(c.createdAt)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading && (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          )}
          {!loading && filteredCommissions.length === 0 && (
            <div className="p-8 text-center">
              <Coins className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 font-medium">
                Aucune commission pour cette période
              </div>
            </div>
          )}
          {!loading &&
            filteredCommissions.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-gray-500">
                    #{c.orderId.slice(0, 8)}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      STATUS_LABELS[c.status].className
                    }`}
                  >
                    {STATUS_LABELS[c.status].label}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Vente</div>
                    <div className="text-gray-700 font-medium">
                      {formatEur(c.orderAmount)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      Commission ({c.commissionRate}%)
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      +{formatEur(c.commissionAmount)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {formatDate(c.createdAt)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
                      }
