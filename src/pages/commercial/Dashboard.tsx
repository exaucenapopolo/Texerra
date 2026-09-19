// Fichier : src/pages/commercial/Dashboard.tsx

import { useEffect, useState } from "react";
import {
  Users,
  TrendingUp,
  Coins,
  Wallet,
  Copy,
  Share2,
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getMe, type MeResponse } from "../../lib/affiliate-api";

export default function CommercialDashboard() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMe();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const affiliateLink = data
    ? `${window.location.origin}/?ref=${data.commercial.affiliateCode}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rejoignez Texerra SMS",
          text: "Découvrez Texerra SMS avec mon lien personnel",
          url: affiliateLink,
        });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopy();
    }
  };

  const formatEur = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-orange-500 animate-spin" />
        <span className="ml-3 text-gray-500">Chargement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-red-800">Erreur de chargement</div>
          <div className="text-sm text-red-700 mt-1">{error}</div>
          {error.includes("Commercial introuvable") && (
            <div className="text-sm text-red-700 mt-2">
              Ton compte n'est pas encore activé en tant que commercial.
              Contacte l'administrateur.
            </div>
          )}
          <button
            onClick={load}
            className="mt-3 text-sm font-medium text-red-700 hover:text-red-900 underline"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { commercial, kpis } = data;

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Bonjour {commercial.name.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Voici l'aperçu de ton activité commerciale
        </p>
      </div>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          label="Clients apportés"
          value={kpis.clientsCount.toLocaleString("fr-FR")}
          color="blue"
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Ventes générées"
          value={formatEur(kpis.totalSales)}
          color="indigo"
        />
        <KpiCard
          icon={<Coins className="w-5 h-5" />}
          label="Commissions gagnées"
          value={formatEur(kpis.totalCommissions)}
          color="orange"
        />
        <KpiCard
          icon={<Wallet className="w-5 h-5" />}
          label="Disponible"
          value={formatEur(kpis.available)}
          color="green"
          highlight
        />
      </div>

      {/* ─── SOLDE DISPONIBLE ─── */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-orange-100 text-sm font-medium">
              Solde disponible au retrait
            </div>
            <div className="text-3xl md:text-4xl font-bold mt-1">
              {formatEur(kpis.available)}
            </div>
            <div className="text-orange-100 text-sm mt-2">
              Déjà payé : {formatEur(kpis.totalPaid)}
            </div>
          </div>
          <a
            href="/commercial/withdrawals"
            className="bg-white text-orange-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-orange-50 transition-colors"
          >
            Demander un retrait
          </a>
        </div>
      </div>

      {/* ─── MON LIEN ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Mon lien personnel</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Partage-le : les clients qui s'inscrivent via ce lien te sont
              automatiquement attribués.
            </p>
          </div>
          <div className="bg-orange-50 text-orange-600 font-mono text-sm font-bold px-3 py-1.5 rounded-lg">
            {commercial.affiliateCode}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 font-mono overflow-x-auto whitespace-nowrap">
            {affiliateLink}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-3 rounded-lg transition-colors min-w-[110px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copier
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-200 px-4 py-3 rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Partager</span>
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          Taux de commission : <strong className="text-gray-600">{commercial.commissionRate}%</strong> du montant de chaque commande éligible.
        </div>
      </div>

      {/* ─── RACCOURCIS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLink
          href="/commercial/clients"
          icon={<Users className="w-5 h-5" />}
          label="Voir mes clients"
        />
        <QuickLink
          href="/commercial/commissions"
          icon={<Coins className="w-5 h-5" />}
          label="Voir mes commissions"
        />
        <QuickLink
          href="/commercial/withdrawals"
          icon={<Wallet className="w-5 h-5" />}
          label="Voir mes retraits"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * SOUS-COMPOSANTS
 * ───────────────────────────────────────────── */

function KpiCard({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "indigo" | "orange" | "green";
  highlight?: boolean;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div
      className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-sm ${
        highlight ? "border-green-200" : "border-gray-200"
      }`}
    >
      <div className={`inline-flex p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      <div className="text-xs text-gray-500 font-medium mt-3">{label}</div>
      <div
        className={`text-lg md:text-xl font-bold mt-1 ${
          highlight ? "text-green-600" : "text-gray-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition-all group"
    >
      <div className="p-2 rounded-lg bg-gray-50 text-gray-500 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
        {icon}
      </div>
      <span className="font-medium text-gray-700 group-hover:text-orange-600 transition-colors">
        {label}
      </span>
    </a>
  );
}
