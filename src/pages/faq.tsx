import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowRight, AlertTriangle, CheckCircle2, Lightbulb, HelpCircle, Smartphone, RefreshCw, Wallet, Shield } from "lucide-react";
import { useMeta } from "../lib/use-meta";

interface FaqItem {
  q: string;
  a: string | React.ReactNode;
}

interface FaqSection {
  icon: React.ReactNode;
  title: string;
  color: string;
  items: FaqItem[];
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-2xl overflow-hidden bg-white hover:border-primary/30 transition-colors">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <span className="font-semibold text-sm text-foreground leading-snug">{item.q}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/50">
                  {item.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

const SECTIONS: FaqSection[] = [
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: "Utilisation des numéros virtuels",
    color: "text-blue-600 bg-blue-50 border-blue-100",
    items: [
      {
        q: "Comment fonctionne un numéro virtuel sur Texerra ?",
        a: (
          <div className="space-y-2">
            <p>Un numéro virtuel est un numéro de téléphone temporaire que vous utilisez à la place de votre numéro personnel. Voici comment procéder :</p>
            <ol className="list-decimal list-inside space-y-1.5 mt-2 ml-1">
              <li>Choisissez le service (WhatsApp, Instagram, Telegram…) et le pays souhaité.</li>
              <li>Confirmez votre commande — le numéro vous est attribué instantanément.</li>
              <li>Entrez ce numéro dans l'application ou le service que vous souhaitez activer.</li>
              <li>Demandez l'envoi du code SMS de vérification depuis cette application.</li>
              <li>Le code SMS apparaît automatiquement sur votre tableau de bord Texerra, à côté du numéro.</li>
            </ol>
          </div>
        ),
      },
      {
        q: "Quel est le délai de réception du SMS ?",
        a: "Le délai moyen de livraison est de 2 à 7 minutes. Dans la plupart des cas, le code arrive en moins de 60 secondes. Si après 20 minutes aucun SMS n'a été reçu, l'opération a probablement échoué — votre argent est automatiquement remboursé sur votre solde Texerra.",
      },
      {
        q: "Puis-je utiliser le même numéro plusieurs fois ?",
        a: "Non. Chaque numéro est à usage unique. Une fois la commande terminée ou expirée, le numéro ne peut plus être utilisé. Cela garantit que chaque activation est propre et non associée à un compte précédent.",
      },
      {
        q: "Combien de temps le numéro reste-t-il actif ?",
        a: "Le numéro reste actif pendant 20 minutes à compter de l'achat. Si aucun SMS n'est reçu dans ce délai, la commande expire automatiquement et votre solde est intégralement remboursé. Vous pouvez aussi cliquer sur « Annuler » à tout moment pour recevoir le remboursement immédiatement.",
      },
      {
        q: "Peut-on passer des appels ou envoyer des SMS avec ces numéros ?",
        a: "Non. Les numéros Texerra sont uniquement conçus pour recevoir des SMS de vérification. Ils ne permettent pas de passer ou recevoir des appels vocaux, ni d'envoyer des messages sortants.",
      },
    ],
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Livraison du SMS & taux de succès",
    color: "text-amber-600 bg-amber-50 border-amber-100",
    items: [
      {
        q: "La livraison du SMS est-elle garantie à 100 % ?",
        a: (
          <div className="space-y-2">
            <p>Non, et nous préférons être transparents à ce sujet. Texerra ne garantit pas la livraison du SMS pour chaque numéro acheté.</p>
            <p>Les algorithmes des grandes plateformes (WhatsApp, Instagram, Google…) peuvent détecter et bloquer les SMS envoyés vers des numéros virtuels pour des raisons de sécurité. En pratique, il peut y avoir 1 livraison réussie pour 5 à 20 tentatives selon les services — c'est normal et inhérent au fonctionnement des numéros virtuels.</p>
            <p className="font-medium text-foreground">Bonne nouvelle : si le SMS n'arrive pas, vous êtes automatiquement remboursé.</p>
          </div>
        ),
      },
      {
        q: "Pourquoi le SMS peut-il ne pas arriver ?",
        a: (
          <ul className="space-y-1.5 list-disc list-inside ml-1">
            <li>Le service a détecté que le numéro est virtuel et a bloqué l'envoi.</li>
            <li>Votre adresse IP est associée à des activités suspectes ou à d'autres comptes.</li>
            <li>Le pays ou l'opérateur du numéro est temporairement rejeté par le service.</li>
            <li>Un autre compte est déjà connecté sur votre appareil avec le même service.</li>
            <li>Le numéro a déjà été utilisé récemment pour la même application.</li>
          </ul>
        ),
      },
      {
        q: "Que se passe-t-il si je ne reçois pas le SMS ?",
        a: "Si le SMS n'est pas reçu pendant la durée de validité du numéro (20 minutes), la commande expire automatiquement et le montant est remboursé sur votre solde Texerra. Vous pouvez aussi annuler manuellement via le bouton « Annuler » dans votre tableau de bord, le remboursement est immédiat.",
      },
      {
        q: "Certains services sont-ils plus difficiles que d'autres ?",
        a: "Oui. Les services très populaires comme WhatsApp, Google et Instagram ont des systèmes anti-fraude très avancés qui bloquent fréquemment les numéros virtuels. Des services moins connus ont généralement un meilleur taux de livraison. Nous affichons les prix en conséquence.",
      },
    ],
  },
  {
    icon: <Lightbulb className="w-5 h-5" />,
    title: "Conseils pour maximiser les chances",
    color: "text-green-600 bg-green-50 border-green-100",
    items: [
      {
        q: "Comment augmenter mes chances de recevoir le SMS ?",
        a: (
          <div className="space-y-3">
            <p>Si un premier numéro n'aboutit pas, voici ce que vous pouvez faire pour augmenter vos chances :</p>
            <ul className="space-y-2">
              {[
                { tip: "Essayez un nouveau numéro", desc: "Commandez simplement un autre numéro pour le même service. Le remboursement automatique vous libère un nouveau crédit." },
                { tip: "Changez de pays", desc: "Si la France ne répond pas, essayez le Royaume-Uni, l'Allemagne ou les États-Unis. Certains pays ont de meilleurs taux de livraison selon les services." },
                { tip: "Changez d'adresse IP", desc: "Utilisez un autre réseau Wi-Fi ou désactivez votre VPN si vous en avez un actif. Votre IP peut être marquée comme suspecte." },
                { tip: "Déconnectez-vous des autres comptes", desc: "Sur l'application concernée, déconnectez tout compte existant avant de tenter la vérification." },
                { tip: "Utilisez un appareil différent", desc: "Si possible, essayez depuis un autre téléphone ou ordinateur, idéalement sur un réseau différent." },
                { tip: "Attendez quelques minutes", desc: "Parfois les SMS arrivent avec un léger délai. Patientez 5 à 7 minutes avant de conclure à un échec." },
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">{item.tip} — </span>
                    <span>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ),
      },
      {
        q: "Quel pays choisir pour de meilleurs résultats ?",
        a: "En général, les numéros des pays d'Europe de l'Est (Russie, Ukraine, Biélorussie) ou d'Asie ont de bons taux de livraison pour de nombreux services. Les numéros américains et britanniques sont souvent bien acceptés par Google et Instagram. N'hésitez pas à tester plusieurs pays si un premier essai échoue.",
      },
      {
        q: "Dois-je désactiver mon VPN ?",
        a: "Oui, c'est fortement recommandé. Beaucoup de services rejettent les demandes provenant d'adresses IP de VPN ou proxy car elles sont souvent associées à des activités frauduleuses. Désactivez votre VPN et utilisez votre connexion normale pour maximiser les chances de recevoir le SMS.",
      },
    ],
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    title: "Solde & paiements",
    color: "text-primary bg-primary/8 border-primary/15",
    items: [
      {
        q: "Comment recharger mon solde Texerra ?",
        a: "Rendez-vous sur la page Portefeuille (accessible depuis votre tableau de bord ou le menu). Choisissez un montant, renseignez vos coordonnées, puis payez via Orange Money, MTN Mobile Money, Airtel Money, Wave ou carte bancaire. Le solde est crédité dès confirmation du paiement.",
      },
      {
        q: "Mon solde expire-t-il ?",
        a: "Non. Votre solde Texerra n'a pas de date d'expiration. Vous pouvez le conserver aussi longtemps que vous le souhaitez et l'utiliser quand vous en avez besoin.",
      },
      {
        q: "Comment fonctionne le remboursement automatique ?",
        a: "Dès qu'une commande expire sans SMS reçu, ou si vous cliquez sur « Annuler », le montant de la commande est immédiatement remboursé sur votre solde Texerra. Ce remboursement est automatique, instantané et ne nécessite aucune démarche de votre part.",
      },
      {
        q: "Puis-je obtenir un remboursement vers mon compte bancaire ou mobile money ?",
        a: "Non. Les remboursements se font uniquement sur votre solde Texerra interne. Ce solde peut ensuite être utilisé pour de nouvelles commandes. Les rechargements effectués ne sont pas remboursables vers votre moyen de paiement initial.",
      },
      {
        q: "Quels montants minimum et maximum pour une recharge ?",
        a: "Le montant minimum est de 0,50 € et le maximum est de 500 € par opération. Votre solde peut dépasser 500 € si vous effectuez plusieurs rechargements successifs.",
      },
    ],
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Sécurité & confidentialité",
    color: "text-purple-600 bg-purple-50 border-purple-100",
    items: [
      {
        q: "Mes données personnelles sont-elles protégées ?",
        a: "Oui. Texerra ne stocke aucun SMS au-delà de la durée de la commande. Vos informations de connexion (email, Google) sont gérées par Firebase Authentication, un service de sécurité de Google. Nous ne partageons jamais vos données avec des tiers.",
      },
      {
        q: "Est-il légal d'utiliser des numéros virtuels ?",
        a: "L'utilisation de numéros virtuels est légale dans la grande majorité des pays pour des usages personnels légitimes : créer des comptes sur des plateformes, protéger sa vie privée, tester des applications. Il est en revanche interdit de les utiliser pour des activités frauduleuses, du spam ou toute forme d'arnaque. Texerra se réserve le droit de bloquer tout compte utilisé à des fins malveillantes.",
      },
      {
        q: "Un autre utilisateur peut-il voir les SMS reçus sur mon numéro ?",
        a: "Non. Les numéros sont attribués exclusivement à votre compte pendant la durée de la commande. Seul vous (et notre système) pouvez voir les SMS reçus sur ce numéro. Après expiration de la commande, les données SMS sont supprimées de notre système.",
      },
      {
        q: "Que faire si j'ai un problème ou une question ?",
        a: (
          <div>
            <p>Notre équipe support est disponible pour vous aider. Contactez-nous via :</p>
            <ul className="mt-2 space-y-1.5">
              <li>📧 Email : <a href="mailto:support@texerra.site" className="text-primary hover:underline font-medium">support@texerra.site</a></li>
              <li>
                <span className="inline-flex items-center gap-1.5">
                  <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="" className="w-4 h-4 inline" />
                  WhatsApp : <a href="https://wa.me/12424542961" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">+1 (242) 454-2961</a>
                </span>
              </li>
            </ul>
            <p className="mt-2">Notre équipe répond généralement sous 24 heures.</p>
          </div>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  useMeta({
    title: "FAQ — Questions fréquentes sur les numéros virtuels SMS | Texerra",
    description: "Tout ce que vous devez savoir sur les numéros virtuels Texerra : délai de livraison, remboursements, taux de succès, conseils pour maximiser vos chances, paiements Orange Money et MTN.",
    ogTitle: "FAQ Texerra — Numéros virtuels SMS : toutes vos questions",
    ogDescription: "Comment ça marche, délai de livraison, remboursements automatiques, conseils pour réussir votre vérification SMS. Réponses complètes ici.",
    canonical: "https://texerra.site/faq",
  });

  return (
    <div className="min-h-[80vh] bg-background">

      {/* Hero */}
      <section className="bg-gradient-to-b from-orange-50/60 to-background pt-14 pb-12 border-b border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary mb-5 uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" /> Foire Aux Questions
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
            Tout ce que vous devez savoir
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Lisez attentivement ces informations avant d'utiliser nos services. Elles vous aideront à obtenir les meilleurs résultats.
          </p>
        </div>
      </section>

      {/* Alerte importante */}
      <section className="max-w-3xl mx-auto px-6 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="font-bold text-amber-800 mb-1 text-sm">À lire avant votre première commande</div>
            <p className="text-amber-700 text-sm leading-relaxed">
              La livraison des SMS n'est <strong>pas garantie à 100 %</strong>. Les plateformes peuvent bloquer les numéros virtuels pour des raisons de sécurité.
              Si vous ne recevez pas de SMS, <strong>votre argent est automatiquement remboursé</strong> sur votre solde.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Sections FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {SECTIONS.map((section, si) => (
          <motion.div
            key={si}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.08 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${section.color}`}>
                {section.icon}
              </div>
              <h2 className="text-lg font-extrabold text-foreground">{section.title}</h2>
            </div>
            <FaqAccordion items={section.items} />
          </motion.div>
        ))}
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-br from-primary/10 to-amber-50 border border-primary/20 rounded-3xl p-8 text-center">
          <div className="text-2xl font-extrabold mb-2 text-foreground">Prêt à commencer ?</div>
          <p className="text-muted-foreground text-sm mb-6">
            Créez votre compte gratuitement et recevez votre premier code SMS en quelques minutes.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/order" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-[0_4px_16px_hsl(24_90%_52%/0.25)] text-sm">
              Commander un numéro <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-border text-foreground font-semibold rounded-xl hover:bg-secondary transition-colors text-sm">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
