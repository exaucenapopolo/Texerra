// Fichier : src/pages/commercial/Commissions.tsx

import { useEffect, useState } from "react";
import {
  Coins,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  getCommissions,
  type CommissionsResponse,
  type CommissionRow,
} from "../../lib/affiliate-api";

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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCommissions(page, 20)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Erreur inconnue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes commissions</h1>
        <p className="text-gray-500 mt-1">
          Historique complet de tes gains
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* DESKTOP */}
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
              {!loading && data?.commissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Coins className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">
                      Aucune commission pour le moment
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Les commissions apparaîtront dès qu'un client attribué
                      effectuera une commande éligible
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                data?.commissions.map((c) => (
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
          {!loading && data?.commissions.length === 0 && (
            <div className="p-8 text-center">
              <Coins className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 font-medium">
                Aucune commission pour le moment
              </div>
            </div>
          )}
          {!loading &&
            data?.commissions.map((c) => (
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

        {/* PAGINATION */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              Page {data.pagination.page} / {data.pagination.totalPages}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
                className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
