import { useState } from "react";
import { useMeta } from "../lib/use-meta";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Check, MessageCircle,
  FileText, ListChecks, Briefcase, Wallet, Target, Ban, TrendingUp, Megaphone,
  UserCheck, Users, Shield, Lock, Scale, BadgeCheck, Clock, XCircle, Building2,
  Handshake,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────── */
/* Palette                                                            */
/* ────────────────────────────────────────────────────────────────── */

const BRAND = {
  primary: "#C55A34",
  primaryDark: "#A84A28",
  primaryDeep: "#7C2D12",
  primarySoft: "#FBEEE7",
  cool: "#2563EB",
  coolSoft: "#EFF6FF",
  success: "#16A34A",
  successSoft: "#DCFCE7",
  successBorder: "#86EFAC",
  warn: "#D97706",
  warnSoft: "#FEF3C7",
  warnBorder: "#FCD34D",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  ink: "#111827",
  inkMuted: "#6B7280",
  border: "#E5E7EB",
  borderSoft: "#F3F4F6",
  surface: "#FFFFFF",
  canvas: "#F9FAFB",
};

/* ────────────────────────────────────────────────────────────────── */
/* WhatsApp                                                           */
/* ────────────────────────────────────────────────────────────────── */

const WHATSAPP_NUMBER = "12424542961"; // +1 (242) 454-2961

/* ────────────────────────────────────────────────────────────────── */
/* Résumé — 6 points clés sans icônes                                */
/* ────────────────────────────────────────────────────────────────── */

const SUMMARY_POINTS = [
  {
    title: "Statut indépendant",
    text: "Vous êtes agent commercial indépendant. Le contrat ne constitue en aucun cas un contrat de travail salarié.",
  },
  {
    title: "50 % de la marge commerciale",
    text: "Votre commission équivaut à la moitié de la marge nette générée, et non à 50 % du chiffre d'affaires.",
  },
  {
    title: "Aucun salaire fixe",
    text: "Vos revenus dépendent uniquement des ventes que vous générez et des marges effectivement encaissées.",
  },
  {
    title: "Liberté d'organisation",
    text: "Vous choisissez librement vos horaires, vos méthodes de prospection et vos réseaux.",
  },
  {
    title: "Tableau de bord et parrainage",
    text: "Un espace personnel pour suivre vos ventes, et un lien unique qui attribue automatiquement vos clients.",
  },
  {
    title: "Rapport quotidien",
    text: "Un compte-rendu concis de votre activité chaque jour, idéalement avant 20 h GMT.",
  },
];

/* ────────────────────────────────────────────────────────────────── */
/* 23 articles — inchangés                                            */
/* ────────────────────────────────────────────────────────────────── */

interface ArticleItem {
  number: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string[];
}

const ARTICLES: ArticleItem[] = [
  {
    number: 1,
    title: "Objet du contrat",
    icon: FileText,
    content: [
      "Le présent contrat définit les conditions dans lesquelles l'agent commercial intervient de manière indépendante pour développer les activités commerciales de Texerra SMS.",
      "Sa mission : rechercher des prospects, acquérir de nouveaux clients, développer des relations commerciales et générer des ventes.",
      "L'agent agit de manière autonome dans l'organisation de son activité, tout en respectant les orientations commerciales, les tarifs, les règles et l'image de marque de Texerra SMS.",
      "Le contrat ne constitue pas un contrat de travail salarié.",
    ],
  },
  {
    number: 2,
    title: "Missions de l'agent commercial",
    icon: ListChecks,
    content: [
      "Rechercher activement de nouveaux prospects et clients.",
      "Utiliser ses propres méthodes, réseaux et connaissances pour développer la clientèle.",
      "Présenter les services de Texerra SMS de manière claire et conforme aux informations officielles.",
      "Convertir les prospects en clients et générer des ventes.",
      "Assurer le suivi commercial des prospects acquis.",
      "Développer son portefeuille de clients.",
      "Communiquer régulièrement sur ses démarches et résultats commerciaux.",
      "Respecter les tarifs, conditions commerciales et procédures de Texerra SMS.",
    ],
  },
  {
    number: 3,
    title: "Indépendance de l'agent",
    icon: Briefcase,
    content: [
      "L'agent commercial exerce son activité de manière indépendante.",
      "Il organise librement ses méthodes de prospection, ses horaires et son organisation personnelle, sous réserve de respecter les obligations du contrat.",
      "Il ne bénéficie d'aucun salaire fixe, traitement mensuel garanti ou rémunération minimale.",
      "Sa rémunération dépend exclusivement des résultats commerciaux effectivement générés.",
    ],
  },
  {
    number: 4,
    title: "Rémunération",
    icon: Wallet,
    content: [
      "L'agent commercial perçoit 50 % de la marge commerciale générée par ses propres ventes.",
      "Cette rémunération ne correspond pas à 50 % du chiffre d'affaires.",
      "La marge commerciale servant de base correspond au montant effectivement encaissé auprès du client, diminué des coûts directement liés à la vente (coût du service, frais de paiement, remboursements, annulations, remises accordées, autres coûts directs).",
      "Commission de l'agent = 50 % de la marge commerciale éligible. La part restante revient à Texerra SMS.",
      "Un exemple illustratif est fourni dans le contrat pour expliquer le mécanisme — il ne constitue en aucun cas une garantie de chiffre d'affaires ou de rémunération.",
    ],
  },
  {
    number: 5,
    title: "Conditions d'acquisition de la commission",
    icon: Target,
    content: [
      "Une commission est due uniquement lorsque la vente peut être attribuée à l'activité commerciale de l'agent et que le paiement a effectivement été encaissé par Texerra SMS.",
      "Une simple prise de contact, un prospect ou une commande non payée ne constitue pas une vente donnant droit à commission.",
      "En cas d'annulation, remboursement, fraude, chargeback ou non-paiement, la marge correspondante n'est pas considérée comme éligible.",
      "Les ventes provenant directement de campagnes, clients, partenaires ou commerciaux déjà attribués à Texerra SMS ne sont pas automatiquement considérées comme des ventes de l'agent.",
    ],
  },
  {
    number: 6,
    title: "Absence de salaire fixe",
    icon: Ban,
    content: [
      "L'agent reconnaît expressément qu'il n'existe aucun salaire fixe mensuel dans le cadre du contrat.",
      "Le montant de ses revenus dépend directement de sa capacité à générer des ventes et de la marge correspondante.",
      "Texerra SMS ne garantit aucun montant minimum mensuel.",
    ],
  },
  {
    number: 7,
    title: "Objectifs et performance",
    icon: TrendingUp,
    content: [
      "L'objectif principal est le développement commercial de Texerra SMS.",
      "L'agent doit mettre en œuvre des actions concrètes et régulières pour rechercher de nouveaux clients et générer des ventes.",
      "Les parties pourront définir ultérieurement des objectifs commerciaux précis selon l'évolution du projet.",
      "L'agent reste libre de dépasser les objectifs fixés ; sa rémunération évolue en conséquence, dépendant directement de la marge générée.",
    ],
  },
  {
    number: 8,
    title: "Prospection et méthodes commerciales",
    icon: Megaphone,
    content: [
      "L'agent est responsable de la mise en œuvre de ses propres actions de prospection.",
      "Il peut utiliser ses réseaux personnels et professionnels, communautés, contacts, plateformes sociales, recommandations et autres moyens autorisés.",
      "Toute pratique utilisée doit rester conforme aux lois applicables, aux règles des plateformes et aux instructions de Texerra SMS.",
      "Il est interdit d'utiliser des méthodes frauduleuses, trompeuses ou susceptibles de porter atteinte à la réputation de Texerra SMS.",
    ],
  },
  {
    number: 9,
    title: "Représentation de Texerra SMS",
    icon: UserCheck,
    content: [
      "L'agent est autorisé à présenter les services de Texerra SMS dans le cadre de sa mission commerciale.",
      "Il ne peut pas : modifier librement les tarifs officiels, promettre une fonctionnalité non approuvée, garantir un résultat sans autorisation, engager financièrement Texerra SMS au-delà des conditions autorisées, conclure des engagements dépassant les pouvoirs accordés.",
      "Toute information communiquée aux clients doit être exacte et conforme aux informations officielles.",
    ],
  },
  {
    number: 10,
    title: "Encaissement des clients",
    icon: Wallet,
    content: [
      "Sauf autorisation écrite contraire, l'agent ne doit pas recevoir sur son compte personnel les paiements destinés à Texerra SMS.",
      "Les clients doivent être orientés vers les moyens de paiement officiels mis à disposition par Texerra SMS.",
    ],
  },
  {
    number: 11,
    title: "Tableau de bord, lien de parrainage et suivi",
    icon: Users,
    content: [
      "L'agent dispose d'un accès à un tableau de bord commercial personnel mis à disposition par Texerra SMS.",
      "Ce tableau de bord permet de consulter et suivre les clients ou inscriptions attribués, les ventes générées, les commissions ou marges correspondantes, ainsi que les autres indicateurs.",
      "L'agent dispose d'un lien de parrainage à communiquer aux prospects pour permettre leur inscription et leur attribution correcte à son activité.",
      "Les données affichées constituent un outil de suivi et de traçabilité, et peuvent être vérifiées ou ajustées en cas d'erreur, d'annulation, de fraude, de remboursement ou de toute autre situation affectant l'attribution d'une vente.",
      "L'agent s'engage à utiliser son lien de manière loyale et transparente. Sont interdits : création de faux comptes, identités fictives, manipulation des inscriptions, tromperie volontaire du client, fausses promesses.",
      "Toute information présentée au prospect concernant Texerra SMS, les prix, services, conditions ou avantages doit être exacte et conforme aux informations officielles.",
      "Les actions commerciales enregistrées dans le tableau de bord peuvent être utilisées par Texerra SMS pour le suivi des performances, l'attribution des ventes et le calcul de la rémunération.",
    ],
  },
  {
    number: 12,
    title: "Rapports commerciaux quotidiens",
    icon: FileText,
    content: [
      "Afin d'assurer un suivi régulier, l'agent transmet à Texerra SMS un rapport de son activité chaque jour, à la fin de sa journée et de préférence avant 20 h 00 GMT.",
      "Le rapport présente de manière concise les actions effectuées : prospects contactés, réponses obtenues, relances, ventes réalisées, difficultés rencontrées, opportunités identifiées, éléments du tableau de bord.",
      "Le rapport est transmis par le moyen indiqué par Texerra SMS ou par tout autre canal convenu.",
    ],
  },
  {
    number: 13,
    title: "Moyens, équipements et frais",
    icon: Briefcase,
    content: [
      "L'agent exerce son activité de manière indépendante et dispose, à ses frais, des moyens matériels nécessaires.",
      "Sauf accord écrit préalable, il prend à sa charge son téléphone, sa connexion internet, ses équipements, ses déplacements, ses outils de prospection et autres dépenses liées à son organisation.",
      "Texerra SMS ne garantit aucun budget de prospection, aucune fourniture d'équipement, aucune avance de frais, aucun remboursement automatique.",
      "Toute dépense exceptionnelle à prendre en charge par Texerra SMS doit faire l'objet d'un accord écrit préalable.",
    ],
  },
  {
    number: 14,
    title: "Utilisation de la marque et préservation de l'image",
    icon: Shield,
    content: [
      "L'agent représente la marque Texerra SMS dans ses actions commerciales.",
      "Son indépendance ne l'autorise pas à prendre librement des décisions susceptibles d'engager ou d'affecter l'image, la réputation ou les intérêts de l'entreprise.",
      "Doivent faire l'objet d'un accord préalable : lancement d'une offre, remise ou promotion non prévue, annonce d'un partenariat, publication présentée comme position officielle, utilisation du logo hors contexte validé, communication avec média/influenceur, promesse exceptionnelle à un client, toute action risquant de provoquer une plainte ou controverse.",
      "Pour les actions courantes conformes aux tarifs et procédures validés, l'agent peut agir de manière autonome. En cas de doute, il consulte Texerra SMS avant d'agir.",
    ],
  },
  {
    number: 15,
    title: "Confidentialité",
    icon: Lock,
    content: [
      "L'agent s'engage à conserver strictement confidentielles toutes les informations non publiques auxquelles il pourrait avoir accès.",
      "Cela inclut notamment : informations commerciales, données clients, stratégies de vente, tarifs et conditions internes non publics, informations financières, données relatives aux autres membres de l'équipe, informations techniques et opérationnelles, informations relatives aux partenaires.",
      "Ces informations ne doivent pas être communiquées à des tiers sans autorisation préalable.",
    ],
  },
  {
    number: 16,
    title: "Données et clients",
    icon: Users,
    content: [
      "Les informations relatives aux clients obtenues dans le cadre de l'activité doivent être utilisées uniquement dans le cadre de la mission.",
      "L'agent ne peut utiliser le portefeuille, les données ou les contacts de Texerra SMS pour une activité personnelle ou au profit d'un concurrent.",
      "À la fin de la collaboration, les informations appartenant à Texerra SMS doivent être restituées ou supprimées conformément aux instructions et aux obligations légales.",
    ],
  },
  {
    number: 17,
    title: "Conflit d'intérêts",
    icon: Scale,
    content: [
      "L'agent doit informer Texerra SMS de toute situation susceptible de créer un conflit d'intérêts avec sa mission.",
      "Il s'engage notamment à ne pas utiliser les informations confidentielles obtenues auprès de Texerra SMS au profit d'une entreprise concurrente.",
    ],
  },
  {
    number: 18,
    title: "Image et intérêts de l'entreprise",
    icon: BadgeCheck,
    content: [
      "L'agent s'engage à préserver l'image, la réputation et les intérêts commerciaux de Texerra SMS dans toutes ses actions.",
    ],
  },
  {
    number: 19,
    title: "Durée du contrat",
    icon: Clock,
    content: [
      "Le contrat prend effet à compter de sa date de signature.",
      "Il est conclu pour une durée indéterminée.",
      "Les modalités de renouvellement ou de cessation sont soumises au contrat et aux dispositions légales applicables.",
    ],
  },
  {
    number: 20,
    title: "Résiliation pour manquement",
    icon: XCircle,
    content: [
      "En cas de manquement grave aux obligations du contrat — notamment fraude, détournement de fonds, fausse déclaration importante, atteinte volontaire aux intérêts de Texerra SMS ou divulgation d'informations confidentielles — Texerra SMS pourra prendre les mesures prévues par la législation applicable et mettre fin à la relation dans les conditions autorisées par celle-ci.",
    ],
  },
  {
    number: 21,
    title: "Évolution de la structure juridique",
    icon: Building2,
    content: [
      "Les parties reconnaissent que Texerra SMS est actuellement en phase de formalisation.",
      "Lorsque la structure juridique définitive sera officiellement constituée, les parties pourront procéder, si nécessaire, à la mise à jour ou au remplacement du contrat afin d'identifier officiellement l'entité juridique qui exploitera Texerra SMS.",
    ],
  },
  {
    number: 22,
    title: "Droit applicable",
    icon: Scale,
    content: [
      "Le contrat est destiné à être exécuté dans le respect des règles applicables dans l'espace OHADA et des dispositions impératives applicables dans les juridictions concernées.",
      "Les parties rechercheront prioritairement une solution amiable à tout différend relatif à l'exécution du contrat.",
      "À défaut d'accord amiable, le différend sera soumis à la juridiction compétente conformément aux règles de droit applicables.",
    ],
  },
  {
    number: 23,
    title: "Accord des parties",
    icon: Handshake,
    content: [
      "Les parties déclarent avoir pris connaissance de l'ensemble des dispositions du contrat, les comprendre et les accepter.",
      "Le contrat constitue l'accord entre les parties concernant la mission d'agent commercial et sa rémunération.",
      "Toute modification importante devra être constatée par écrit et acceptée par les parties.",
    ],
  },
];

/* ────────────────────────────────────────────────────────────────── */
/* Page Partners                                                      */
/* ────────────────────────────────────────────────────────────────── */

export default function Partners() {
  useMeta({
    title: "Devenir partenaire commercial — Texerra SMS",
    description:
      "Rejoignez l'équipe Texerra SMS en tant qu'agent commercial indépendant. Découvrez les conditions du contrat, la rémunération, les missions et les obligations. Signez et commencez à travailler.",
    canonical: "https://texerra.site/partners",
    noindex: true,
    image:
      "https://raw.githubusercontent.com/exaucenapopolo/Texerra/refs/heads/main/public/logo-full.png",
    type: "website",
  });

  const [openArticles, setOpenArticles] = useState<number[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", city: "", phone: "" });
  const [accepted, setAccepted] = useState(false);

  const toggleArticle = (n: number) => {
    setOpenArticles((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };

  const allOpen = openArticles.length === ARTICLES.length;
  const toggleAll = () => {
    setOpenArticles(allOpen ? [] : ARTICLES.map((a) => a.number));
  };

  const isFormFilled =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    form.city.trim() !== "" &&
    form.phone.trim() !== "";

  const isValid = isFormFilled && accepted;

  const buildWhatsAppUrl = () => {
    const message = `Bonjour Texerra SMS,

Je me permets de vous contacter concernant le poste d'Agent Commercial.

Nom : ${form.lastName.trim().toUpperCase()}
Prénom : ${form.firstName.trim()}
Ville : ${form.city.trim()}
Téléphone : ${form.phone.trim()}

J'ai lu et j'accepte l'intégralité du contrat d'agent commercial Texerra SMS. Je souhaite signer et commencer à travailler.

Cordialement,
${form.firstName.trim()} ${form.lastName.trim().toUpperCase()}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ background: BRAND.canvas }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Retour */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 mb-8"
          style={{
            background: BRAND.surface,
            border: `1px solid ${BRAND.border}`,
            color: BRAND.ink,
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour au tableau de bord
        </Link>

        {/* ─── Hero éditorial ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] mb-5" style={{ color: BRAND.primary }}>
            <span className="w-10 h-px" style={{ background: BRAND.primary }} />
            Programme Agent Commercial
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-gray-900 leading-[1.1] tracking-tight mb-5 max-w-2xl">
            Devenez partenaire commercial de Texerra SMS
          </h1>

          <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mb-8">
            Rejoignez notre équipe en tant qu'agent commercial indépendant.
            Développez votre portefeuille, générez des ventes et percevez{" "}
            <strong className="text-gray-900 font-bold">50 % de la marge commerciale</strong> sur chaque transaction.
          </p>

          <div
            className="grid grid-cols-3 gap-4 sm:gap-8 py-6 border-y max-w-lg"
            style={{ borderColor: BRAND.border }}
          >
            <div>
              <div className="text-3xl sm:text-4xl font-black text-gray-900 leading-none">
                50<span className="text-xl sm:text-2xl">%</span>
              </div>
              <div className="text-[11px] text-gray-500 font-semibold mt-1.5 uppercase tracking-wide">
                de la marge
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-gray-900 leading-none">
                0<span className="text-xl sm:text-2xl">€</span>
              </div>
              <div className="text-[11px] text-gray-500 font-semibold mt-1.5 uppercase tracking-wide">
                salaire fixe
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-gray-900 leading-none">
                100<span className="text-xl sm:text-2xl">%</span>
              </div>
              <div className="text-[11px] text-gray-500 font-semibold mt-1.5 uppercase tracking-wide">
                indépendant
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Résumé ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-12"
        >
          <h2 className="text-xl font-extrabold text-gray-900 mb-1">
            En résumé
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Les six points essentiels du contrat, avant d'entrer dans le détail.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {SUMMARY_POINTS.map((point, i) => (
              <div key={i} className="flex gap-3">
                <span
                  className="text-sm font-black shrink-0 tabular-nums"
                  style={{ color: BRAND.primary }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-gray-900 mb-1">
                    {point.title}
                  </div>
                  <div className="text-[13px] text-gray-600 leading-relaxed">
                    {point.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── 23 articles ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-end justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-1">
                Détail des 23 articles
              </h2>
              <p className="text-sm text-gray-500">
                Le contrat officiel, article par article.
              </p>
            </div>
            <button
              onClick={toggleAll}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
              style={{ background: BRAND.borderSoft, color: BRAND.inkMuted }}
            >
              {allOpen ? "Tout replier" : "Tout déplier"}
            </button>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
          >
            {ARTICLES.map((article, idx) => {
              const isOpen = openArticles.includes(article.number);
              const Icon = article.icon;
              return (
                <div
                  key={article.number}
                  style={{
                    borderTop: idx === 0 ? "none" : `1px solid ${BRAND.border}`,
                  }}
                >
                  <button
                    onClick={() => toggleArticle(article.number)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: isOpen ? BRAND.primarySoft : BRAND.borderSoft,
                        color: isOpen ? BRAND.primary : BRAND.inkMuted,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          className="text-[10px] font-black uppercase tracking-widest"
                          style={{ color: BRAND.primary }}
                        >
                          Article {article.number}
                        </span>
                        <span className="font-bold text-sm text-gray-900">
                          {article.title}
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                      style={{ color: BRAND.inkMuted }}
                    >
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-5 pt-1 pl-[60px]">
                          <ul className="space-y-2">
                            {article.content.map((line, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-[13px] text-gray-700 leading-relaxed"
                              >
                                <span
                                  className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                                  style={{ background: BRAND.primary }}
                                />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ─── Formulaire de candidature ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">
              Prêt(e) à rejoindre l'équipe ?
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Renseignez vos informations et envoyez votre candidature via WhatsApp.
              Notre équipe vous recontactera pour finaliser la signature du contrat.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Prénom
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                  placeholder="Jean"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                  style={{
                    background: BRAND.borderSoft,
                    border: `1px solid ${BRAND.border}`,
                  }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nom
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                  placeholder="Dupont"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                  style={{
                    background: BRAND.borderSoft,
                    border: `1px solid ${BRAND.border}`,
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Ville
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                placeholder="Douala"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                style={{
                  background: BRAND.borderSoft,
                  border: `1px solid ${BRAND.border}`,
                }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Téléphone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+237 6 XX XX XX XX"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                style={{
                  background: BRAND.borderSoft,
                  border: `1px solid ${BRAND.border}`,
                }}
              />
            </div>

            {/* Case à cocher */}
            <label
              className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors"
              style={{
                background: accepted ? BRAND.primarySoft : BRAND.borderSoft,
                border: `1px solid ${accepted ? BRAND.primary : BRAND.border}`,
              }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-all"
                style={{
                  background: accepted ? BRAND.primary : "#FFFFFF",
                  border: `2px solid ${accepted ? BRAND.primary : "#D1D5DB"}`,
                }}
              >
                {accepted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <span className="text-sm text-gray-700 leading-relaxed">
                Je certifie avoir lu et accepté l'intégralité du contrat d'agent
                commercial Texerra SMS, et je souhaite signer pour commencer à
                travailler.
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
            </label>

            {/* Bouton */}
            {isValid ? (
              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "#25D366",
                  boxShadow: "0 6px 16px rgba(37,211,102,0.28)",
                }}
              >
                <MessageCircle className="w-4 h-4" />
                Envoyer ma candidature sur WhatsApp
                <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold cursor-not-allowed"
                style={{
                  background: BRAND.borderSoft,
                  color: BRAND.inkMuted,
                }}
              >
                <MessageCircle className="w-4 h-4" />
                Envoyer ma candidature sur WhatsApp
              </button>
            )}

            {!isValid && (
              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                Remplissez tous les champs et cochez la case pour activer l'envoi.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}