import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  HelpCircle,
  Smartphone,
  Wallet,
  Shield,
  BookOpen,
  GraduationCap,
  MessageCircle,
  Clock,
} from "lucide-react";
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

/* ────────────────────────────────────────────────────────────────── */
/* NOUVEAU SVG #1 — "Livre de la connaissance" (en-tête du FAQ)       */
/* Symbolise l'apprentissage, la découverte, la connaissance          */
/* ────────────────────────────────────────────────────────────────── */
const FaqKnowledgeIllust = () => {
  return (
    <div className="relative flex justify-center mb-10">
      <div className="absolute inset-0 -m-8 bg-gradient-to-tr from-primary/12 via-transparent to-amber-200/20 blur-3xl rounded-full pointer-events-none max-w-lg mx-auto" />
      <svg
        viewBox="0 0 480 280"
        className="w-full max-w-lg h-auto relative"
        fill="none"
        role="img"
        aria-label="Centre d'aide Texerra SMS — découvrez toutes les réponses à vos questions"
      >
        <defs>
          <linearGradient id="fk-book-l" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fdba74" />
            <stop offset="1" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="fk-book-r" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fdba74" />
            <stop offset="1" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="fk-spine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ea580c" />
            <stop offset="1" stopColor="#c2410c" />
          </linearGradient>
          <radialGradient id="fk-bulb-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fef3c7" stopOpacity="0.95" />
            <stop offset="0.6" stopColor="#fbbf24" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fk-bg-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fb923c" stopOpacity="0.22" />
            <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Halo de fond */}
        <ellipse cx="240" cy="160" rx="220" ry="130" fill="url(#fk-bg-glow)" />

        {/* Rayons du savoir (derrière le livre) */}
        {[...Array(8)].map((_, i) => {
          const angle = -90 + (i - 3.5) * 22;
          const rad = (angle * Math.PI) / 180;
          const x1 = 240 + Math.cos(rad) * 40;
          const y1 = 130 + Math.sin(rad) * 40;
          const x2 = 240 + Math.cos(rad) * 90;
          const y2 = 130 + Math.sin(rad) * 90;
          return (
            <motion.line
              key={`ray-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#fdba74" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"
              animate={{ opacity: [0.15, 0.6, 0.15] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          );
        })}

        {/* Ampoule / savoir */}
        <g transform="translate(240 110)">
          <motion.circle
            r="46" fill="url(#fk-bulb-glow)"
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.g
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Verre de l'ampoule */}
            <path
              d="M -16 -10 C -22 -22, -18 -34, 0 -40 C 18 -34, 22 -22, 16 -10 Z"
              fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.6"
            />
            {/* Filament */}
            <path
              d="M -6 -8 L -6 -20 L 0 -26 L 6 -20 L 6 -8"
              stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" fill="none"
            />
            {/* Culot */}
            <rect x="-8" y="-10" width="16" height="10" rx="2" fill="#94a3b8" />
            <line x1="-8" y1="-6" x2="8" y2="-6" stroke="#64748b" strokeWidth="1" />
            <line x1="-8" y1="-2" x2="8" y2="-2" stroke="#64748b" strokeWidth="1" />
            {/* Petit éclat */}
            <motion.circle
              cx="-22" cy="-32" r="2" fill="#fbbf24"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle
              cx="20" cy="-38" r="1.6" fill="#fbbf24"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            />
          </motion.g>
        </g>

        {/* Livre ouvert */}
        <g transform="translate(240 210)">
          {/* Ombre du livre */}
          <ellipse cx="0" cy="24" rx="120" ry="10" fill="#0f172a" opacity="0.08" />

          {/* Page gauche */}
          <motion.path
            d="M -110 -8 C -110 -20, -100 -30, -80 -30 L -6 -22 L -6 20 L -80 26 C -100 28, -110 22, -110 12 Z"
            fill="url(#fk-book-l)"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {/* Lignes de texte page gauche */}
          {[0, 1, 2, 3].map((i) => (
            <motion.line
              key={`ll-${i}`}
              x1={-92 + i * 2} y1={-16 + i * 9} x2={-24 + i * 2} y2={-12 + i * 9}
              stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
            />
          ))}

          {/* Page droite */}
          <motion.path
            d="M 110 -8 C 110 -20, 100 -30, 80 -30 L 6 -22 L 6 20 L 80 26 C 100 28, 110 22, 110 12 Z"
            fill="url(#fk-book-r)"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {/* Lignes de texte page droite */}
          {[0, 1, 2, 3].map((i) => (
            <motion.line
              key={`lr-${i}`}
              x1={92 - i * 2} y1={-16 + i * 9} x2={24 - i * 2} y2={-12 + i * 9}
              stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
            />
          ))}

          {/* Tranche centrale */}
          <rect x="-6" y="-22" width="12" height="42" fill="url(#fk-spine)" rx="1" />
        </g>

        {/* Points d'interrogation flottants (à gauche) */}
        <motion.g
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx="70" cy="110" r="22" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          <text x="70" y="118" textAnchor="middle" fontSize="22" fontWeight="800" fill="#f97316" fontFamily="serif">?</text>
        </motion.g>

        <motion.g
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        >
          <circle cx="55" cy="170" r="17" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          <text x="55" y="176" textAnchor="middle" fontSize="17" fontWeight="800" fill="#f97316" fontFamily="serif">?</text>
        </motion.g>

        <motion.g
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        >
          <circle cx="100" cy="200" r="14" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          <text x="100" y="205" textAnchor="middle" fontSize="14" fontWeight="800" fill="#f97316" fontFamily="serif">?</text>
        </motion.g>

        {/* Coche / Réponse (à droite) */}
        <motion.g
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <circle cx="410" cy="110" r="22" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
          <motion.path
            d="M 402 110 L 407 115 L 419 103"
            stroke="#10b981" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          />
        </motion.g>

        <motion.g
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
        >
          <circle cx="425" cy="170" r="17" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
          <motion.path
            d="M 419 170 L 423 174 L 431 165"
            stroke="#10b981" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          />
        </motion.g>

        <motion.g
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        >
          <circle cx="380" cy="200" r="14" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
          <motion.path
            d="M 375 200 L 378 203 L 386 195"
            stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
          />
        </motion.g>

        {/* Particules flottantes */}
        {[...Array(8)].map((_, i) => (
          <motion.circle
            key={`p-${i}`}
            r="2"
            fill="#fb923c"
            cx={60 + ((i * 53) % 360)}
            cy={40 + ((i * 37) % 80)}
            animate={{ opacity: [0.15, 0.85, 0.15], y: [0, -6, 0] }}
            transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </svg>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────── */
/* NOUVEAU SVG #2 — "Support 24/7" (en-tête du FAQ, avant le CTA)     */
/* Symbolise l'équipe disponible, la réponse, l'accompagnement        */
/* ────────────────────────────────────────────────────────────────── */
const FaqSupportIllust = () => {
  return (
    <div className="relative flex justify-center">
      <div className="absolute inset-0 -m-8 bg-gradient-to-tr from-primary/12 via-transparent to-emerald-200/20 blur-3xl rounded-full pointer-events-none max-w-md mx-auto" />
      <svg
        viewBox="0 0 420 240"
        className="w-full max-w-md h-auto relative"
        fill="none"
        role="img"
        aria-label="Support Texerra SMS — une équipe disponible 24/7 pour vous répondre"
      >
        <defs>
          <linearGradient id="fs-bubble1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fb923c" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
          <radialGradient id="fs-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fb923c" stopOpacity="0.22" />
            <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="210" cy="130" rx="200" ry="120" fill="url(#fs-glow)" />

        {/* Ligne de fond pointillée (flux de conversation) */}
        <path
          d="M 40 140 Q 120 60, 210 130 T 380 120"
          stroke="#fed7aa" strokeWidth="2" strokeDasharray="4 8" fill="none" opacity="0.55"
        />

        {/* Bulle de chat 1 — support */}
        <motion.g
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="30" y="70" width="170" height="60" rx="18" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          <path d="M 45 130 L 55 145 L 60 130 Z" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          {/* Avatar support */}
          <circle cx="58" cy="100" r="16" fill="url(#fs-bubble1)" />
          <text x="58" y="106" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="800">T</text>
          {/* Lignes de message */}
          <motion.rect x="82" y="88" width="100" height="6" rx="3" fill="#e2e8f0"
            initial={{ width: 0 }} whileInView={{ width: 100 }} transition={{ duration: 0.6, delay: 0.4 }} />
          <motion.rect x="82" y="102" width="82" height="6" rx="3" fill="#e2e8f0"
            initial={{ width: 0 }} whileInView={{ width: 82 }} transition={{ duration: 0.6, delay: 0.6 }} />
          <motion.rect x="82" y="116" width="60" height="6" rx="3" fill="#e2e8f0"
            initial={{ width: 0 }} whileInView={{ width: 60 }} transition={{ duration: 0.6, delay: 0.8 }} />
        </motion.g>

        {/* Bulle de chat 2 — client */}
        <motion.g
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        >
          <rect x="230" y="130" width="160" height="56" rx="18" fill="url(#fs-bubble1)" />
          <path d="M 375 186 L 385 200 L 390 186 Z" fill="#f97316" />
          <motion.rect x="248" y="148" width="120" height="6" rx="3" fill="#ffffff" opacity="0.9"
            initial={{ width: 0 }} whileInView={{ width: 120 }} transition={{ duration: 0.5, delay: 0.6 }} />
          <motion.rect x="248" y="162" width="80" height="6" rx="3" fill="#ffffff" opacity="0.9"
            initial={{ width: 0 }} whileInView={{ width: 80 }} transition={{ duration: 0.5, delay: 0.8 }} />
        </motion.g>

        {/* Indicateur "en train d'écrire" */}
        <motion.g
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        >
          <rect x="30" y="160" width="72" height="34" rx="17" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={`dot-${i}`}
              cx={52 + i * 14} cy="177" r="3.5" fill="#f97316"
              animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </motion.g>

        {/* Badge "24/7" avec horloge */}
        <motion.g
          transform="translate(210 55)"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 220 }}
        >
          <motion.circle
            r="30" fill="#ffffff" stroke="#fed7aa" strokeWidth="2"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle r="22" fill="#fb923c" />
          {/* Horloge */}
          <circle r="12" fill="none" stroke="#ffffff" strokeWidth="1.6" />
          <motion.line
            x1="0" y1="0" x2="0" y2="-7"
            stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "0px 0px" }}
          />
          <motion.line
            x1="0" y1="0" x2="5" y2="0"
            stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round"
            animate={{ rotate: 360 }}
            transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "0px 0px" }}
          />
          <circle r="1.4" fill="#ffffff" />
        </motion.g>

        {/* Particules de connexion */}
        {[...Array(10)].map((_, i) => (
          <motion.circle
            key={`p-${i}`}
            r="2"
            fill="#fb923c"
            cx={50 + ((i * 47) % 340)}
            cy={30 + ((i * 61) % 200)}
            animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5 + (i % 3), repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </svg>
    </div>
  );
};

const SECTIONS: FaqSection[] = [
  {
    icon: <GraduationCap className="w-5 h-5" />,
    title: "Les bases des numéros virtuels",
    color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    items: [
      {
        q: "Qu'est-ce qu'un numéro virtuel ?",
        a: "Un numéro virtuel est un numéro de téléphone qui n'est pas lié à une carte SIM physique. Il fonctionne via Internet et permet de recevoir des SMS et des appels, exactement comme un numéro classique. Chez Texerra SMS, vous achetez un numéro virtuel du pays de votre choix pour recevoir des codes de vérification ou communiquer via des services comme WhatsApp.",
      },
      {
        q: "À quoi sert un numéro virtuel ?",
        a: "Un numéro virtuel sert principalement à recevoir des SMS de vérification, à activer un compte WhatsApp Business, Instagram, Telegram, Google, TikTok ou d'autres plateformes, et à renforcer votre image professionnelle auprès de vos clients lorsqu'ils se trouvent dans un autre pays que le vôtre.",
      },
      {
        q: "Pourquoi utiliser un numéro virtuel ?",
        a: "Utiliser un numéro virtuel permet d'obtenir un numéro local dans un pays où vous n'êtes pas physiquement présent, d'accéder à des services qui exigent un numéro précis, de protéger votre numéro personnel et d'améliorer votre crédibilité auprès de vos prospects et partenaires.",
      },
      {
        q: "Puis-je utiliser un numéro virtuel pour WhatsApp ?",
        a: "Oui. C'est même l'un des usages les plus courants. Vous achetez un numéro virtuel Texerra SMS, vous recevez le code SMS de WhatsApp, et vous activez votre compte WhatsApp Business avec ce numéro. La procédure prend moins de 60 secondes.",
      },
      {
        q: "Puis-je recevoir des SMS de vérification ?",
        a: "Absolument. Recevoir des SMS de vérification (codes OTP) est la fonction principale de Texerra SMS. Que ce soit pour WhatsApp, Google, Instagram, TikTok, Telegram ou n'importe quelle autre plateforme, vous recevez le code directement sur votre tableau de bord en quelques secondes.",
      },
    ],
  },
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
  {
    icon: <HelpCircle className="w-5 h-5" />,
    title: "Autres questions fréquentes",
    color: "text-slate-600 bg-slate-50 border-slate-200",
    items: [
      {
        q: "Quels pays sont disponibles sur Texerra SMS ?",
        a: "Texerra SMS couvre plus de 205 pays : toute l'Afrique (RDC, Nigeria, Côte d'Ivoire, Sénégal, Ghana, Kenya…), l'Europe (France, Royaume-Uni, Allemagne…), les États-Unis, le Canada, l'Asie et bien d'autres. Vous choisissez simplement le pays du numéro dont vous avez besoin.",
      },
      {
        q: "Est-ce vraiment un vrai numéro actif ?",
        a: "Oui. Texerra SMS vous fournit de vrais numéros actifs dans les pays de votre choix — pas des numéros fictifs. Ils reçoivent des SMS réels et sont acceptés par toutes les grandes plateformes mondiales.",
      },
      {
        q: "Combien de temps faut-il pour obtenir un numéro ?",
        a: "Moins de 60 secondes. Dès que votre commande est validée, votre numéro est attribué et prêt à recevoir des SMS. En moyenne, nos clients reçoivent leur code de vérification en 45 secondes.",
      },
      {
        q: "Comment acheter un numéro virtuel ?",
        a: "C'est simple : créez votre compte gratuitement, rechargez votre solde (Orange Money, MTN, Moov, Airtel Money ou carte bancaire), choisissez le service et le pays, puis validez. Votre numéro est actif immédiatement et le code de vérification apparaît sur votre tableau de bord.",
      },
      {
        q: "Faut-il créer un compte pour utiliser Texerra SMS ?",
        a: "Oui, la création d'un compte gratuit est nécessaire pour commander un numéro et consulter vos codes SMS en toute sécurité depuis votre tableau de bord. L'inscription prend moins d'une minute, que ce soit via Google ou par e-mail.",
      },
      {
        q: "Combien de numéros puis-je commander en même temps ?",
        a: "Vous pouvez commander plusieurs numéros simultanément — il n'y a pas de limite stricte. Chaque commande reste indépendante avec son propre numéro, sa propre durée de validité et son propre code. C'est particulièrement utile pour vérifier plusieurs comptes ou plusieurs services en parallèle.",
      },
      {
        q: "Proposez-vous des réductions pour les gros volumes ?",
        a: "Le prix de chaque numéro dépend du service et du pays sélectionnés. Pour des volumes importants ou un usage régulier dans un cadre professionnel, contactez notre support à support@texerra.site — nous étudions les demandes au cas par cas.",
      },
      {
        q: "Que se passe-t-il si un SMS arrive après expiration du numéro ?",
        a: "Une fois le numéro expiré (après 20 minutes), il est réattribué et vous ne pouvez plus recevoir de SMS associés à votre commande. C'est pourquoi nous vous recommandons de lancer la demande de code immédiatement après l'achat. Si le SMS n'arrive pas dans le délai, votre solde est automatiquement remboursé.",
      },
      {
        q: "Puis-je utiliser Texerra SMS depuis mon téléphone ?",
        a: "Oui. Texerra SMS est une plateforme web entièrement responsive. Vous pouvez l'utiliser depuis un ordinateur, une tablette ou un smartphone, sans installer d'application. Votre tableau de bord et vos codes SMS restent accessibles depuis n'importe quel appareil connecté.",
      },
    ],
  },
];

export default function FaqPage() {
  useMeta({
    title: "FAQ — Questions fréquentes sur les numéros virtuels SMS | Texerra SMS",
    description:
      "Tout ce que vous devez savoir sur les numéros virtuels Texerra SMS : qu'est-ce qu'un numéro virtuel, à quoi ça sert, délai de livraison, remboursements, taux de succès, conseils pour maximiser vos chances, paiements Orange Money et MTN.",
    ogTitle: "FAQ Texerra SMS — Numéros virtuels : toutes vos questions",
    ogDescription:
      "Comment ça marche, délai de livraison, remboursements automatiques, conseils pour réussir votre vérification SMS, pays disponibles, paiements. Réponses complètes ici.",
    canonical: "https://texerra.site/faq",
  });

  return (
    <div className="min-h-[80vh] bg-background">

      {/* Hero */}
      <section className="bg-gradient-to-b from-orange-50/60 to-background pt-14 pb-10 border-b border-border">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-4">
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

          {/* NOUVEAU SVG — Livre de la connaissance */}
          <FaqKnowledgeIllust />
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

      {/* Bloc "toujours une question ?" avec NOUVEAU SVG Support 24/7 */}
      <section className="max-w-3xl mx-auto px-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-white to-orange-50/60 border border-border rounded-3xl p-8"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary mb-3 uppercase tracking-wider">
              <MessageCircle className="w-3.5 h-3.5" /> Toujours une question ?
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-foreground mb-2">
              Notre équipe vous répond
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Pas de robot, pas d'attente interminable. Une vraie équipe disponible 24/7 pour vous accompagner.
            </p>
          </div>

          <FaqSupportIllust />

          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <a
              href="https://wa.me/12424542961"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-border hover:border-primary/40 hover:bg-primary/[0.03] text-foreground font-semibold rounded-xl transition-all text-sm shadow-sm"
            >
              <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="" className="w-4 h-4" />
              Discuter sur WhatsApp
            </a>
            <a
              href="mailto:support@texerra.site"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-border hover:border-primary/40 hover:bg-primary/[0.03] text-foreground font-semibold rounded-xl transition-all text-sm shadow-sm"
            >
              <Clock className="w-4 h-4 text-primary" />
              support@texerra.site
            </a>
          </div>
        </motion.div>
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