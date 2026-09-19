// Fichier : src/pages/commercial/Clients.tsx

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  AlertCircle,
  FileDown,
  Mail,
  RefreshCw,
} from "lucide-react";
import {
  getClients,
  getCommissions,
  getMe,
  type ClientsResponse,
  type CommissionRow,
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

export default function CommercialClients() {
  const [data, setData] = useState<ClientsResponse | null>(null);
  const [allCommissions, setAllCommissions] = useState<CommissionRow[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ➕ Filtres de date
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
      const [c, comm, m] = await Promise.all([
        getClients(1, 100),
        getCommissions(1, 100),
        getMe(),
      ]);
      setData(c);
      setAllCommissions(comm.commissions);
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

  const filteredClients = useMemo(
    () =>
      (data?.clients ?? []).filter((c) => isInRange(c.attributedAt, range)),
    [data, range]
  );

  const filteredCommissions = useMemo(
    () => allCommissions.filter((c) => isInRange(c.createdAt, range)),
    [allCommissions, range]
  );

  // ─── Construction du payload rapport ───
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes clients</h1>
          <p className="text-gray-500 mt-1">
            Tous les clients qui te sont attribués
          </p>
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

        {/* ➕ Champs Pays / Ville pour le rapport */}
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

        {/* ➕ Boutons rapport */}
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
          Le rapport inclut les <strong>{filteredClients.length}</strong> clients et{" "}
          <strong>{filteredCommissions.length}</strong> commissions de la période
          sélectionnée.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* ─── TABLEAU CLIENTS ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Client
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Email
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Attribué le
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading && filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">
                      Aucun client pour cette période
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Change la période ou partage ton lien pour gagner des clients
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold text-xs">
                          {c.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {c.email}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(c.attributedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.source === "link"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.source === "link" ? "Lien" : "Admin"}
                      </span>
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
          {!loading && filteredClients.length === 0 && (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 font-medium">
                Aucun client pour cette période
              </div>
            </div>
          )}
          {!loading &&
            filteredClients.map((c) => (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold">
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {c.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate font-mono">
                    {c.email}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDate(c.attributedAt)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
