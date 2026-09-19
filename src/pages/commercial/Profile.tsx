// Fichier : src/pages/commercial/Profile.tsx

import { useEffect, useState } from "react";
import { User, Mail, Percent, Hash, AlertCircle, Shield } from "lucide-react";
import { getMe, type MeResponse } from "../../lib/affiliate-api";

export default function CommercialProfile() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erreur inconnue")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Chargement...</div>;
  }
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }
  if (!data) return null;

  const { commercial } = data;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil commercial</h1>
        <p className="text-gray-500 mt-1">
          Informations de ton compte commercial
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <InfoRow
          icon={<User className="w-4 h-4" />}
          label="Nom"
          value={commercial.name}
        />
        <InfoRow
          icon={<Mail className="w-4 h-4" />}
          label="Email"
          value={commercial.email}
        />
        <InfoRow
          icon={<Hash className="w-4 h-4" />}
          label="Code d'affiliation"
          value={commercial.affiliateCode}
          mono
        />
        <InfoRow
          icon={<Percent className="w-4 h-4" />}
          label="Taux de commission"
          value={`${commercial.commissionRate}%`}
        />
        <InfoRow
          icon={<Shield className="w-4 h-4" />}
          label="Statut"
          value={
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                commercial.status === "active"
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {commercial.status === "active" ? "Actif" : "Inactif"}
            </span>
          }
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-900">
        <div className="font-semibold mb-1">💡 Comment fonctionne le système ?</div>
        <ul className="space-y-1 list-disc pl-5">
          <li>Partage ton lien personnel pour attribuer automatiquement les nouveaux clients.</li>
          <li>Chaque commande éligible d'un client attribué génère {commercial.commissionRate}% de commission.</li>
          <li>Les commissions deviennent disponibles au retrait une fois la commande terminée.</li>
          <li>Fais une demande de retrait depuis l'onglet « Mes retraits ».</li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="font-semibold text-gray-800 mb-2 text-sm">
          Besoin de modifier tes informations de paiement ?
        </div>
        <div className="text-sm text-gray-500">
          Contacte l'administrateur à{" "}
          <a
            href="mailto:support@texerra.site"
            className="text-orange-500 hover:underline"
          >
            support@texerra.site
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="p-2 rounded-lg bg-gray-50 text-gray-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <div
          className={`text-gray-900 font-medium mt-0.5 ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
