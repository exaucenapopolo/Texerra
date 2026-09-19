// Fichier : src/pages/commercial/Profile.tsx

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Percent,
  Hash,
  AlertCircle,
  Shield,
  TrendingUp,
  Users,
  Briefcase,
  Ban,
  Info,
  UserPlus,
} from "lucide-react";
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Mon profil commercial
        </h1>
        <p className="text-gray-500 mt-1">
          Informations et fonctionnement de ton espace
        </p>
      </div>

      {/* ─── INFOS COMPTE ─── */}
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
          value={`${commercial.commissionRate}% de la marge nette`}
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

      {/* ─── COMMENT ÇA MARCHE ─── */}
      <Section
        icon={<Info className="w-5 h-5" />}
        title="Comment ça fonctionne ?"
        color="blue"
      >
        <p>
          Tu es un <strong>partenaire indépendant</strong> de Texerra SMS. Tu
          n'as pas de salaire fixe : tu gagnes un pourcentage sur chaque vente
          que tu génères. Plus tu apportes de clients actifs, plus tu gagnes.
        </p>
        <ol className="list-decimal pl-5 space-y-2 mt-3">
          <li>
            Tu partages ton <strong>lien personnel</strong> (
            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              ?ref={commercial.affiliateCode}
            </span>
            ) sur les réseaux, WhatsApp, Telegram, etc.
          </li>
          <li>
            Quand quelqu'un clique sur ton lien et <strong>crée un compte</strong>,
            il t'est automatiquement attribué.
          </li>
          <li>
            À chaque <strong>commande éligible</strong> de ce client, tu gagnes{" "}
            {commercial.commissionRate}% de la marge nette Texerra.
          </li>
          <li>
            Ta commission devient <strong>disponible</strong> dès que la commande
            est terminée, puis tu peux demander un <strong>retrait</strong>.
          </li>
        </ol>
      </Section>

      {/* ─── COMPRENDRE LE TAUX ─── */}
      <Section
        icon={<TrendingUp className="w-5 h-5" />}
        title="Comment est calculé ton pourcentage ?"
        color="orange"
      >
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 my-2">
          <div className="text-sm text-orange-900">
            <strong>⚠️ À bien comprendre :</strong> ton taux de{" "}
            {commercial.commissionRate}% s'applique sur la{" "}
            <strong>marge nette</strong> de Texerra sur chaque vente, ce qui
            équivaut à environ <strong>33% du chiffre d'affaires</strong> de
            cette vente.
          </div>
        </div>

        <p className="mt-3 font-medium text-gray-900">
          📊 Exemple concret :
        </p>
        <div className="mt-2 bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Prix payé par le client</span>
            <span className="font-semibold text-gray-900">1,00 €</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>− Coûts fournisseur et frais</span>
            <span>−0,33 €</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="text-gray-700">= Marge nette Texerra</span>
            <span className="font-semibold text-gray-900">0,67 €</span>
          </div>
          <div className="flex justify-between text-orange-600">
            <span>× {commercial.commissionRate}%</span>
            <span className="font-bold">
              {(
                (0.67 * commercial.commissionRate) /
                100
              ).toFixed(2)}{" "}
              €
            </span>
          </div>
          <div className="flex justify-between border-t-2 border-orange-200 pt-2 mt-2">
            <span className="font-semibold text-gray-900">
              Ta commission
            </span>
            <span className="font-bold text-orange-600 text-lg">
              {(
                (0.67 * commercial.commissionRate) /
                100
              ).toFixed(2)}{" "}
              €
            </span>
          </div>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          💡 <strong>En résumé :</strong> que l'on parle de{" "}
          <strong>{commercial.commissionRate}% de la marge</strong> OU de{" "}
          <strong>~33% du chiffre d'affaires</strong>, c'est EXACTEMENT la même
          chose. Ce sont juste deux façons de décrire le même montant.
        </div>

        <p className="mt-4 text-sm text-gray-600">
          ✅ <strong>Tu n'as rien à calculer toi-même.</strong> Ton dashboard
          affiche toujours le montant exact de ta commission, calculé
          automatiquement par le système.
        </p>
      </Section>

      {/* ─── COMMISSIONNAGE INDÉPENDANT ─── */}
      <Section
        icon={<Briefcase className="w-5 h-5" />}
        title="Ton statut : indépendant"
        color="green"
      >
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>
              Tu travailles de manière <strong>indépendante</strong> — pas de
              horaires imposés, pas de quota minimum.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>
              Tes gains dépendent <strong>uniquement</strong> de ton activité.
              Si tu ne vends rien, tu ne gagnes rien. Si tu vends beaucoup, tu
              gagnes beaucoup.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>
              Tu peux demander un <strong>retrait à tout moment</strong>, dès que
              ton solde disponible atteint le minimum requis.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <span>
              Tu représentes une <strong>entreprise sérieuse</strong>. Ton image
              doit refléter cette qualité.
            </span>
          </li>
        </ul>
      </Section>

      {/* ─── RÈGLES DE CONDUITE ─── */}
      <Section
        icon={<Ban className="w-5 h-5" />}
        title="Règles à respecter absolument"
        color="red"
      >
        <p className="text-sm text-gray-600 mb-3">
          En tant que commercial Texerra, tu utilises l'image de marque d'une
          entreprise sérieuse. Toute violation grave peut entraîner la
          <strong> fermeture immédiate de ton compte</strong> et l'annulation de
          tes commissions en cours.
        </p>

        <div className="space-y-3">
          <Rule>
            <strong>🚫 Ne mens jamais à un client</strong> — sur les prix, les
            services, les délais de livraison ou les fonctionnalités.
          </Rule>
          <Rule>
            <strong>🚫 Ne modifie jamais les prix officiels</strong> — ni à la
            hausse ni à la baisse. Les tarifs Texerra sont fixes et publics.
          </Rule>
          <Rule>
            <strong>🚫 Ne promets pas de services inexistants</strong> pour
            convaincre un prospect.
          </Rule>
          <Rule>
            <strong>🚫 N'utilise pas de méthodes frauduleuses</strong> :
            faux témoignages, usurpation d'identité, spam massif, etc.
          </Rule>
          <Rule>
            <strong>🚫 Ne t'inscris pas toi-même via ton propre lien</strong>{" "}
            (auto-parrainage interdit, détecté automatiquement).
          </Rule>
          <Rule>
            <strong>✅ Sois honnête et transparent</strong> — tu construis une
            réputation de long terme.
          </Rule>
        </div>
      </Section>

      {/* ─── PARRAINAGE DE COMMERCIAUX ─── */}
      <Section
        icon={<UserPlus className="w-5 h-5" />}
        title="Recruter d'autres commerciaux"
        color="purple"
      >
        <p>
          Tu peux <strong>amener d'autres commerciaux</strong> dans le programme.
          Si un commercial que tu as recruté réalise des ventes, tu touches un{" "}
          <strong>pourcentage additionnel</strong> sur ses commissions — en plus
          de tes propres gains.
        </p>
        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-900">
          📧 Pour mettre en place ce parrainage de commerciaux, contacte
          directement l'équipe à{" "}
          <a
            href="mailto:texerra.sms@gmail.com"
            className="font-semibold underline"
          >
            texerra.sms@gmail.com
          </a>{" "}
          avec l'objet <strong>"Parrainage commercial"</strong>.
        </div>
      </Section>

      {/* ─── BESOIN D'AIDE ─── */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm">
        <div className="font-semibold text-gray-800 mb-1">
          Besoin d'aide ou d'informations ?
        </div>
        <div className="text-gray-600">
          Contacte l'équipe à{" "}
          <a
            href="mailto:texerra.sms@gmail.com"
            className="text-orange-500 hover:underline font-medium"
          >
            texerra.sms@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * SOUS-COMPOSANTS
 * ───────────────────────────────────────────── */

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

function Section({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: "blue" | "orange" | "green" | "red" | "purple";
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
      </div>
      <div className="text-gray-700 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm">
      {children}
    </div>
  );
      }
