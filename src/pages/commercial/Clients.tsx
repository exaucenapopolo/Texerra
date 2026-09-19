// Fichier : src/pages/commercial/Clients.tsx

import { useEffect, useState } from "react";
import { Users, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import {
  getClients,
  type ClientsResponse,
} from "../../lib/affiliate-api";

export default function CommercialClients() {
  const [data, setData] = useState<ClientsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getClients(page, 20)
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes clients</h1>
        <p className="text-gray-500 mt-1">
          Tous les clients qui te sont attribués
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* DESKTOP TABLE */}
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
              {!loading && data?.clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">
                      Aucun client pour le moment
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Partage ton lien pour commencer à gagner des commissions
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                data?.clients.map((c) => (
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

        {/* MOBILE CARDS */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading && (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          )}
          {!loading && data?.clients.length === 0 && (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-500 font-medium">
                Aucun client pour le moment
              </div>
            </div>
          )}
          {!loading &&
            data?.clients.map((c) => (
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

        {/* PAGINATION */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              Page {data.pagination.page} sur {data.pagination.totalPages} —{" "}
              {data.pagination.total} client
              {data.pagination.total > 1 ? "s" : ""}
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
