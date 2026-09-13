import { Link } from "wouter";
import { Shield, Zap, Globe2, HeadphonesIcon, ArrowRight, MessageSquare, ChevronDown, TrendingUp, Star, Users, CheckCircle2, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useMeta } from "../lib/use-meta";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// Types de données pour remplacer l'ancien client externe
interface Stats {
  totalOrders: number;
  totalCountries: number;
  averageDeliverySeconds: number;
}

interface Service {
  code: string;
  name: string;
  priceFrom?: number;
}

interface Country {
  code: string;
  name: string;
  dialCode?: string;
  flag?: string;
}

const SERVICE_ICON_URLS: Record<string, string> = {
  ig: "https://cdn.simpleicons.org/instagram/E1306C",
  wa: "https://cdn.simpleicons.org/whatsapp/25D366",
  tg: "https://cdn.simpleicons.org/telegram/26A5E4",
  fb: "https://cdn.simpleicons.org/facebook/1877F2",
  go: "https://cdn.simpleicons.org/google/4285F4",
  tk: "https://cdn.simpleicons.org/tiktok/000000",
  tw: "https://cdn.simpleicons.org/x/000000",
  ap: "https://cdn.simpleicons.org/apple/000000",
  am: "https://cdn.simpleicons.org/amazon/FF9900",
  ms: "https://cdn.simpleicons.org/microsoft/5E5E5E",
  bn: "https://cdn.simpleicons.org/binance/F0B90B",
  dc: "https://cdn.simpleicons.org/discord/5865F2",
  sc: "https://cdn.simpleicons.org/snapchat/FFCC00",
  nf: "https://cdn.simpleicons.org/netflix/E50914",
  pp: "https://cdn.simpleicons.org/paypal/003087",
  ub: "https://cdn.simpleicons.org/uber/000000",
  ln: "https://cdn.simpleicons.org/linkedin/0A66C2",
  yt: "https://cdn.simpleicons.org/youtube/FF0000",
  td: "https://cdn.simpleicons.org/tinder/FF4458",
};

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.65, delay, ease },
} as const);

const gridVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.055 } },
};
const gridItem = {
  hidden: { opacity: 0, scale: 0.94, y: 14 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.45, ease } },
};

/* --- COMPOSANTS D'ILLUSTRATIONS DU FICHIER DE BASE (Conservés) --- */

const IllusTrust = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 mb-4 text-primary" role="img" aria-label="Confiance et crédibilité">
    <motion.path d="M50 10 L90 30 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 30 Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 1.5 }}/>
    <motion.circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="4" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}/>
    <motion.path d="M10 30 L90 30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" initial={{ opacity: 0 }} whileInView={{ opacity: 0.5 }} transition={{ delay: 1 }}/>
  </svg>
);

const IllusLocal = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 mb-4 text-blue-500" role="img" aria-label="Image locale et internationale">
    <motion.circle cx="50" cy="50" r="40" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="4" strokeDasharray="10 5" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}/>
    <motion.path d="M50 10 L50 90 M10 50 L90 50" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5"/>
    <motion.circle cx="50" cy="50" r="8" fill="currentColor" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 0.3 }}/>
  </svg>
);

const IllusTarget = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 mb-4 text-emerald-500" role="img" aria-label="Cibler des clients à l'international">
    <motion.path d="M50 15 A 35 35 0 1 1 49.9 15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 15" animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}/>
    <motion.path d="M50 85 L50 65 M50 35 L50 15 M15 50 L35 50 M65 50 L85 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    <motion.circle cx="50" cy="50" r="10" fill="currentColor" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.5 }}/>
  </svg>
);

const IllusBlock = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 mb-4 text-red-400" role="img" aria-label="Accès bloqué à certaines plateformes">
    <motion.rect x="25" y="45" width="50" height="40" rx="8" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="4" initial={{ y: 10, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}/>
    <motion.path d="M35 45 V 35 A 15 15 0 0 1 65 35 V 45" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.8 }}/>
    <motion.line x1="20" y1="20" x2="80" y2="80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ delay: 1, duration: 0.5 }}/>
  </svg>
);

const MiniIllus = ({ type }: { type: 'building' | 'phone' | 'cart' | 'lock' | 'app' | 'user' | 'card' | 'world' | 'check' }) => {
  const baseClasses = "w-8 h-8 shrink-0 text-primary";
  
  switch(type) {
    case 'building': return <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h6M9 11h6M9 15h6"/></svg>;
    case 'phone': return <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>;
    case 'cart': return <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
    case 'lock': return <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
    case 'app': return <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="4" ry="4"/><path d="M9 12l2 2 4-4"/></svg>;
    case 'user': return <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'card': return <svg className="w-14 h-14 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>;
    case 'world': return <svg className="w-14 h-14 text-orange-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>;
    case 'check': return <svg className="w-14 h-14 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>;
    default: return null;
  }
};

/* --- NOUVEAUX COMPOSANTS SVG PREMIUM (Pour la section Pourquoi) --- */

const AbstractTrust = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 mb-6 text-primary">
    <motion.rect x="4" y="4" width="32" height="32" rx="16" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
    <motion.path d="M20 12 L20 28 M12 20 L28 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ duration: 0.8, ease }} />
    <circle cx="20" cy="20" r="4" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

const AbstractPremium = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 mb-6 text-primary">
    <motion.path d="M10 30 L20 10 L30 30 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 1.5, ease }} />
    <motion.path d="M10 20 L30 20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" animate={{ x: [-2, 2, -2] }} transition={{ duration: 4, repeat: Infinity }} />
  </svg>
);

const AbstractPartner = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 mb-6 text-primary">
    <motion.circle cx="15" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" initial={{ x: -10, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, ease }} />
    <motion.circle cx="25" cy="20" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" initial={{ x: 10, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ duration: 0.6, ease }} />
    <circle cx="20" cy="20" r="2" fill="currentColor" />
  </svg>
);

const AbstractGlobal = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 mb-6 text-primary">
    <motion.ellipse cx="20" cy="20" rx="14" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5" animate={{ rotate: 180 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
    <motion.ellipse cx="20" cy="20" rx="6" ry="14" fill="none" stroke="currentColor" strokeWidth="1.5" animate={{ rotate: 180 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
    <circle cx="20" cy="20" r="2" fill="currentColor" />
  </svg>
);

/* --- SVG "Personne ayant obtenu le numéro qu'il fallait" (positionnement corrigé) --- */
const PersonObtainedNumber = () => (
  <svg viewBox="0 0 460 230" className="w-full max-w-xl h-auto mx-auto" fill="none" role="img" aria-label="Une personne satisfaite vient d'obtenir le numéro virtuel correspondant à son besoin">
    <defs>
      <linearGradient id="pgn-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff7ed" />
        <stop offset="1" stopColor="#ffedd5" stopOpacity="0.4" />
      </linearGradient>
      <linearGradient id="pgn-shirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f97316" />
        <stop offset="1" stopColor="#ea580c" />
      </linearGradient>
      <radialGradient id="pgn-halo" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fb923c" stopOpacity="0.25" />
        <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="230" cy="210" rx="180" ry="14" fill="#0f172a" opacity="0.06" />
    <ellipse cx="230" cy="130" rx="180" ry="110" fill="url(#pgn-halo)" />

    {/* Particules flottantes */}
    <motion.circle cx="80" cy="70" r="3" fill="#f97316" animate={{ y: [-4, 4, -4], opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
    <motion.circle cx="380" cy="90" r="3.5" fill="#3b82f6" animate={{ y: [4, -4, 4], opacity: [0.4, 1, 0.4] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
    <motion.circle cx="340" cy="40" r="2.5" fill="#10b981" animate={{ y: [-3, 3, -3] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />

    {/* Personnage central — tête regardant son téléphone, tenu à hauteur de poitrine */}
    <g transform="translate(230 145)">
      {/* Torse / veste */}
      <motion.path
        d="M -50 60 C -50 22, -20 2, 0 2 C 20 2, 50 22, 50 60 Z"
        fill="url(#pgn-shirt)"
        initial={{ y: 10, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease }}
      />
      {/* Col en V */}
      <path d="M -12 6 L 0 18 L 12 6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85" />

      {/* Cou */}
      <rect x="-7" y="-14" width="14" height="20" fill="#fde2c9" />

      {/* Tête */}
      <motion.circle
        cx="0" cy="-30" r="27"
        fill="#fde2c9"
        initial={{ scale: 0.85, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease }}
      />
      {/* Cheveux */}
      <path d="M -27 -30 C -27 -52, -14 -62, 0 -62 C 14 -62, 27 -52, 27 -30 C 25 -42, 15 -48, 0 -48 C -15 -48, -25 -42, -27 -30 Z" fill="#1f2937" />

      {/* Yeux regardant vers le bas (le téléphone) */}
      <ellipse cx="-8" cy="-26" rx="1.5" ry="2" fill="#1f2937" />
      <ellipse cx="8" cy="-26" rx="1.5" ry="2" fill="#1f2937" />

      {/* Sourire satisfait */}
      <motion.path
        d="M -6 -17 Q 0 -12 6 -17"
        stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" fill="none"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.5 }}
      />

      {/* Bras gauche (vue spectateur) partant de l'épaule et venant tenir le téléphone */}
      <path d="M -40 15 Q -46 40, -18 52" stroke="#fde2c9" strokeWidth="11" strokeLinecap="round" fill="none" />
      {/* Bras droit */}
      <path d="M 40 15 Q 46 40, 18 52" stroke="#fde2c9" strokeWidth="11" strokeLinecap="round" fill="none" />

      {/* Mains tenant le téléphone */}
      <circle cx="-14" cy="52" r="7" fill="#fde2c9" />
      <circle cx="14" cy="52" r="7" fill="#fde2c9" />

      {/* Téléphone tenu à hauteur de poitrine, centré */}
      <motion.g
        transform="translate(0 52)"
        initial={{ y: 6, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease }}
      >
        <motion.g animate={{ y: [0, -2, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <rect x="-15" y="-25" width="30" height="50" rx="7" fill="#111827" />
          <rect x="-12.5" y="-22.5" width="25" height="45" rx="5" fill="#f9fafb" />
          <rect x="-5" y="-19" width="10" height="2.5" rx="1.2" fill="#111827" opacity="0.6" />
          {/* Code OTP sur l'écran */}
          <rect x="-9" y="0" width="18" height="7" rx="2" fill="#fff7ed" stroke="#fdba74" strokeWidth="0.7" />
          <text x="0" y="5" textAnchor="middle" fontSize="3.6" fontWeight="700" fill="#ea580c" fontFamily="monospace">847 291</text>
          {/* Petit point de vibration */}
          <motion.circle cx="0" cy="14" r="1.5" fill="#10b981" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} />
        </motion.g>
      </motion.g>
    </g>

    {/* Badge "numéro obtenu" */}
    <motion.g
      transform="translate(345 60)"
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.7, type: "spring", stiffness: 220, damping: 18 }}
    >
      <circle r="22" fill="#10b981" />
      <path d="M -9 0 L -2 7 L 10 -7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </motion.g>

    {/* Drapeaux flottants */}
    <motion.g animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
      <circle cx="80" cy="130" r="15" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5" />
      <text x="80" y="135" textAnchor="middle" fontSize="16">🇺🇸</text>
    </motion.g>
    <motion.g animate={{ y: [4, -4, 4] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
      <circle cx="385" cy="140" r="15" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5" />
      <text x="385" y="145" textAnchor="middle" fontSize="16">🇫🇷</text>
    </motion.g>
    <motion.g animate={{ y: [-3, 3, -3] }} transition={{ duration: 3.7, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
      <circle cx="365" cy="180" r="13" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5" />
      <text x="365" y="185" textAnchor="middle" fontSize="14">🇬🇧</text>
    </motion.g>

    {/* Logos services flottants */}
    <motion.g animate={{ y: [-3, 3, -3] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
      <circle cx="115" cy="45" r="13" fill="#fff" stroke="#e5e7eb" strokeWidth="1.2" />
      <image href="https://cdn.simpleicons.org/whatsapp/25D366" x="106" y="36" width="18" height="18" />
    </motion.g>
    <motion.g animate={{ y: [3, -3, 3] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
      <circle cx="345" cy="30" r="13" fill="#fff" stroke="#e5e7eb" strokeWidth="1.2" />
      <image href="https://cdn.simpleicons.org/google/4285F4" x="336" y="21" width="18" height="18" />
    </motion.g>
  </svg>
);

/* --- SVG "Texerra SMS s'adresse à tout le monde" (profils & usages multiples) --- */
const MultiUsageIllust = () => (
  <svg viewBox="0 0 640 260" className="w-full max-w-3xl h-auto mx-auto" fill="none" role="img" aria-label="Texerra SMS s'adresse à différents profils et usages : personnel, professionnel, vérification, international, confidentialité">
    <defs>
      <linearGradient id="mu-hub" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fb923c" />
        <stop offset="1" stopColor="#f97316" />
      </linearGradient>
    </defs>

    {/* Hub central */}
    <g transform="translate(320 130)">
      <motion.circle r="58" fill="#fff" stroke="#e5e7eb" strokeWidth="3" />
      <motion.circle r="70" stroke="#f97316" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="6 8" fill="none"
        animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} />
      <circle r="42" fill="url(#mu-hub)" />
      <text x="0" y="6" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="system-ui">Texerra</text>
      <text x="0" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" opacity="0.9" fontFamily="system-ui">SMS</text>
    </g>

    {/* Lignes de connexion */}
    {[
      { x: 100, y: 55 },
      { x: 540, y: 55 },
      { x: 90,  y: 205 },
      { x: 550, y: 205 },
      { x: 320, y: 32 },
      { x: 320, y: 228 },
    ].map((p, i) => (
      <motion.path
        key={i}
        d={`M ${p.x} ${p.y} Q ${(p.x + 320) / 2} ${(p.y + 130) / 2}, 320 130`}
        stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4 6" fill="none"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 1.2, delay: i * 0.1 }}
      />
    ))}

    {/* Nœuds périphériques */}
    <motion.g animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
      <circle cx="100" cy="55" r="34" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <circle cx="100" cy="48" r="8" fill="#3b82f6" />
      <path d="M 86 72 C 86 62, 114 62, 114 72 Z" fill="#93c5fd" />
      <text x="100" y="102" textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">Personnel</text>
    </motion.g>

    <motion.g animate={{ y: [4, -4, 4] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}>
      <circle cx="540" cy="55" r="34" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <image href="https://cdn.simpleicons.org/whatsapp/25D366" x="525" y="40" width="30" height="30" />
      <text x="540" y="102" textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">WhatsApp</text>
    </motion.g>

    <motion.g animate={{ y: [-3, 3, -3] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}>
      <circle cx="90" cy="205" r="34" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <rect x="78" y="192" width="24" height="18" rx="3" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1.5" />
      <text x="90" y="205" textAnchor="middle" fontSize="8" fontWeight="700" fill="#059669" fontFamily="monospace">847</text>
      <text x="90" y="252" textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">Vérification</text>
    </motion.g>

    <motion.g animate={{ y: [3, -3, 3] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}>
      <circle cx="550" cy="205" r="34" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <rect x="538" y="190" width="24" height="28" rx="2" fill="#f97316" opacity="0.15" stroke="#f97316" strokeWidth="1.5" />
      <path d="M 543 198 H 557 M 543 203 H 557 M 543 208 H 553" stroke="#ea580c" strokeWidth="1.4" strokeLinecap="round" />
      <text x="550" y="252" textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">Business</text>
    </motion.g>

    <motion.g animate={{ y: [-3, 3, -3] }} transition={{ duration: 4.1, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}>
      <circle cx="320" cy="32" r="26" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <circle cx="320" cy="32" r="15" fill="none" stroke="#f97316" strokeWidth="1.5" />
      <path d="M 305 32 H 335 M 320 17 A 12 12 0 0 1 320 47 A 12 12 0 0 1 320 17" stroke="#f97316" strokeWidth="1.5" fill="none" />
      <text x="320" y="12" textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">International</text>
    </motion.g>

    <motion.g animate={{ y: [3, -3, 3] }} transition={{ duration: 3.9, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}>
      <circle cx="320" cy="228" r="26" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      <rect x="311" y="222" width="18" height="14" rx="2" fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
      <path d="M 315 222 V 218 A 5 5 0 0 1 325 218 V 222" stroke="#8b5cf6" strokeWidth="1.5" fill="none" />
      <text x="320" y="262" textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">Confidentialité</text>
    </motion.g>

    {/* Particules de données circulant */}
    {[...Array(6)].map((_, i) => (
      <motion.circle
        key={i}
        r="2.5"
        fill="#f97316"
        cx={320}
        cy={130}
        animate={{
          x: [0, [100 - 320, 540 - 320, 90 - 320, 550 - 320, 0, 0][i]],
          y: [0, [55 - 130, 55 - 130, 205 - 130, 205 - 130, 32 - 130, 228 - 130][i]],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
      />
    ))}
  </svg>
);

/* --- NOUVEAU SVG : "Constellation de confiance" (placé après la FAQ) --- */
/* Concept différent et créatif : un écosystème de services qui orbitent autour d'un noyau de confiance */
const TrustConstellation = () => {
  const satellites = [
    { angle: 0,   slug: "whatsapp",  color: "25D366", r: 120 },
    { angle: 45,  slug: "google",    color: "4285F4", r: 140 },
    { angle: 90,  slug: "telegram",  color: "26A5E4", r: 120 },
    { angle: 135, slug: "instagram", color: "E1306C", r: 140 },
    { angle: 180, slug: "tiktok",    color: "000000", r: 120 },
    { angle: 225, slug: "facebook",  color: "1877F2", r: 140 },
    { angle: 270, slug: "linkedin",  color: "0A66C2", r: 120 },
    { angle: 315, slug: "x",         color: "000000", r: 140 },
  ];

  return (
    <svg viewBox="0 0 520 340" className="w-full max-w-2xl h-auto mx-auto" fill="none" role="img" aria-label="Écosystème de confiance : les services du quotidien connectés à Texerra SMS">
      <defs>
        <radialGradient id="tc-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </radialGradient>
        <radialGradient id="tc-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fb923c" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Halo lumineux de fond */}
      <ellipse cx="260" cy="170" rx="230" ry="150" fill="url(#tc-glow)" />

      {/* Étoiles / particules de fond */}
      {[...Array(18)].map((_, i) => {
        const x = (i * 97) % 500 + 10;
        const y = (i * 53) % 320 + 10;
        return (
          <motion.circle
            key={`star-${i}`}
            cx={x}
            cy={y}
            r={0.8 + (i % 3) * 0.4}
            fill="#fb923c"
            animate={{ opacity: [0.15, 0.7, 0.15] }}
            transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.15 }}
          />
        );
      })}

      {/* Orbite externe */}
      <motion.circle
        cx="260" cy="170" r="140"
        stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 8" fill="none"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "260px 170px" }}
      />
      {/* Orbite interne */}
      <motion.circle
        cx="260" cy="170" r="100"
        stroke="#f1f5f9" strokeWidth="1" fill="none"
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "260px 170px" }}
      />

      {/* Lignes radiales pulsantes */}
      {satellites.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const x = 260 + Math.cos(rad) * s.r;
        const y = 170 + Math.sin(rad) * s.r;
        return (
          <motion.line
            key={`line-${i}`}
            x1="260" y1="170" x2={x} y2={y}
            stroke="#f97316" strokeWidth="1" strokeOpacity="0.25"
            strokeDasharray="3 5"
            animate={{ strokeOpacity: [0.1, 0.55, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
          />
        );
      })}

      {/* Satellites : logos services */}
      {satellites.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const x = 260 + Math.cos(rad) * s.r;
        const y = 170 + Math.sin(rad) * s.r;
        return (
          <motion.g
            key={`sat-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 * i, type: "spring", stiffness: 180, damping: 18 }}
          >
            <motion.g
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3 + i * 0.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
            >
              <circle cx={x} cy={y} r="17" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5" />
              <image
                href={`https://cdn.simpleicons.org/${s.slug}/${s.color}`}
                x={x - 10} y={y - 10} width="20" height="20"
              />
            </motion.g>
          </motion.g>
        );
      })}

      {/* Noyau central : bouclier de confiance */}
      <g transform="translate(260 170)">
        <motion.circle
          r="60"
          fill="#fff" stroke="#fed7aa" strokeWidth="2"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          r="44" fill="url(#tc-core)"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Bouclier blanc */}
        <motion.path
          d="M -14 -18 L 14 -18 L 14 2 C 14 12 0 20 0 20 C 0 20 -14 12 -14 2 Z"
          fill="#fff" fillOpacity="0.95"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
        />
        {/* Coche dans le bouclier */}
        <motion.path
          d="M -7 -4 L -2 2 L 8 -9"
          stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        />
        {/* Anneau rotatif autour du noyau */}
        <motion.circle
          r="70" stroke="#f97316" strokeWidth="2" strokeDasharray="6 10"
          strokeOpacity="0.5" fill="none"
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </g>

      {/* Petites particules circulant du centre vers les satellites */}
      {satellites.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const x = 260 + Math.cos(rad) * s.r;
        const y = 170 + Math.sin(rad) * s.r;
        return (
          <motion.circle
            key={`pulse-${i}`}
            cx="260" cy="170" r="2.5"
            fill="#fb923c"
            animate={{ cx: [260, x], cy: [170, y], opacity: [0, 1, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.35, ease: "easeOut" }}
          />
        );
      })}
    </svg>
  );
};

/* --- NOUVEAU SVG : flux des 3 étapes "Comment ça marche" --- */
const StepsFlowIllust = () => (
  <svg viewBox="0 0 820 200" className="w-full max-w-3xl h-auto mx-auto" fill="none" role="img" aria-label="Les trois étapes Texerra SMS : recharger, choisir, recevoir le code">
    <defs>
      <linearGradient id="sf-wallet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#60a5fa" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="sf-globe" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fb923c" />
        <stop offset="1" stopColor="#f97316" />
      </linearGradient>
      <linearGradient id="sf-check" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#34d399" />
        <stop offset="1" stopColor="#10b981" />
      </linearGradient>
    </defs>

    {/* Ligne de flux en arrière-plan */}
    <line x1="140" y1="100" x2="680" y2="100" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="6 6" />

    {/* Flèches animées entre les étapes */}
    <motion.g
      animate={{ x: [0, 180, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="270" cy="100" r="4" fill="#3b82f6" />
    </motion.g>
    <motion.g
      animate={{ x: [0, 180, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
    >
      <circle cx="460" cy="100" r="4" fill="#f97316" />
    </motion.g>

    {/* Étape 1 : Portefeuille / Recharger */}
    <g transform="translate(100 100)">
      <motion.circle r="46" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2"
        initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} />
      <circle r="32" fill="url(#sf-wallet)" />
      {/* Icône portefeuille */}
      <rect x="-14" y="-10" width="28" height="20" rx="3" fill="#fff" />
      <rect x="-14" y="-10" width="28" height="6" rx="3" fill="#fff" opacity="0.7" />
      <circle cx="8" cy="2" r="2.5" fill="#1e40af" />
      {/* Pièces animées au-dessus */}
      <motion.circle cx="-18" cy="-30" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5"
        animate={{ y: [-30, -22, -30], opacity: [0, 1, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: 0 }} />
      <motion.circle cx="0" cy="-32" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5"
        animate={{ y: [-32, -24, -32], opacity: [0, 1, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: 0.5 }} />
      <motion.circle cx="18" cy="-30" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5"
        animate={{ y: [-30, -22, -30], opacity: [0, 1, 0] }} transition={{ duration: 2.2, repeat: Infinity, delay: 1 }} />

      <text x="0" y="78" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">Recharger</text>
      <text x="0" y="94" textAnchor="middle" fontSize="10" fill="#94a3b8">Orange · MTN · Carte</text>
    </g>

    {/* Étape 2 : Globe / Choisir service & pays */}
    <g transform="translate(410 100)">
      <motion.circle r="46" fill="#fff7ed" stroke="#fed7aa" strokeWidth="2"
        initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }} />
      <circle r="32" fill="url(#sf-globe)" />
      {/* Globe wireframe */}
      <circle r="15" fill="none" stroke="#fff" strokeWidth="1.6" />
      <ellipse rx="15" ry="6" fill="none" stroke="#fff" strokeWidth="1.2" />
      <ellipse rx="6" ry="15" fill="none" stroke="#fff" strokeWidth="1.2" />
      <line x1="-15" y1="0" x2="15" y2="0" stroke="#fff" strokeWidth="1.2" />
      {/* Petits points de localisation pulsants */}
      <motion.circle cx="-6" cy="-6" r="2" fill="#fff"
        animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }} />
      <motion.circle cx="7" cy="4" r="2" fill="#fff"
        animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity, delay: 0.6 }} />
      {/* Logos orbitant autour */}
      <motion.g animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
        <circle cx="44" cy="0" r="9" fill="#fff" stroke="#fed7aa" strokeWidth="1" />
        <image href="https://cdn.simpleicons.org/whatsapp/25D366" x="38" y="-6" width="12" height="12" />
        <circle cx="-44" cy="0" r="9" fill="#fff" stroke="#fed7aa" strokeWidth="1" />
        <image href="https://cdn.simpleicons.org/google/4285F4" x="-50" y="-6" width="12" height="12" />
      </motion.g>
      <text x="0" y="78" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">Choisir</text>
      <text x="0" y="94" textAnchor="middle" fontSize="10" fill="#94a3b8">Service · Pays</text>
    </g>

    {/* Étape 3 : Code reçu / Vérifié */}
    <g transform="translate(720 100)">
      <motion.circle r="46" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="2"
        initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ type: "spring", delay: 0.5 }} />
      <circle r="32" fill="url(#sf-check)" />
      {/* Téléphone miniature */}
      <rect x="-10" y="-16" width="20" height="32" rx="4" fill="#fff" />
      <rect x="-8" y="-13" width="16" height="26" rx="3" fill="#ecfdf5" />
      {/* Code OTP sur l'écran */}
      <text x="0" y="-3" textAnchor="middle" fontSize="5" fontWeight="700" fill="#059669" fontFamily="monospace">847</text>
      <text x="0" y="4" textAnchor="middle" fontSize="5" fontWeight="700" fill="#059669" fontFamily="monospace">291</text>
      {/* Petite coche sur le côté */}
      <motion.g
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <circle cx="20" cy="-16" r="9" fill="#fff" stroke="#10b981" strokeWidth="1.5" />
        <path d="M 16 -16 L 19 -13 L 24 -19" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </motion.g>
      {/* Ondes de vibration */}
      <motion.circle r="18" fill="none" stroke="#10b981" strokeOpacity="0.5" strokeWidth="1"
        animate={{ r: [16, 30], opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }} />
      <motion.circle r="18" fill="none" stroke="#10b981" strokeOpacity="0.5" strokeWidth="1"
        animate={{ r: [16, 30], opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.7 }} />
      <text x="0" y="78" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">Recevoir</text>
      <text x="0" y="94" textAnchor="middle" fontSize="10" fill="#94a3b8">Code SMS instantané</text>
    </g>
  </svg>
);

/* --- NOUVEAU SVG : couverture mondiale avec points pulsants --- */
const GlobalCoverageIllust = () => {
  const points = [
    { x: 100, y: 90,  flag: "🇺🇸" },
    { x: 175, y: 60,  flag: "🇫🇷" },
    { x: 235, y: 55,  flag: "🇬🇧" },
    { x: 155, y: 145, flag: "🇧🇷" },
    { x: 250, y: 150, flag: "🇿🇦" },
    { x: 300, y: 90,  flag: "🇦🇪" },
    { x: 360, y: 70,  flag: "🇮🇳" },
    { x: 400, y: 120, flag: "🇯🇵" },
    { x: 210, y: 105, flag: "🇨🇲" },
    { x: 195, y: 130, flag: "🇨🇮" },
  ];

  return (
    <svg viewBox="0 0 500 260" className="w-full max-w-2xl h-auto mx-auto" fill="none" role="img" aria-label="Couverture mondiale de Texerra SMS — plus de 205 pays disponibles">
      <defs>
        <radialGradient id="gc-globe" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fff7ed" />
          <stop offset="1" stopColor="#fed7aa" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="gc-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fb923c" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Halo de fond */}
      <ellipse cx="250" cy="130" rx="220" ry="120" fill="url(#gc-glow)" />

      {/* Globe */}
      <g transform="translate(250 130)">
        <motion.circle r="90" fill="url(#gc-globe)" stroke="#fdba74" strokeWidth="2"
          initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }} />
        {/* Méridiens et parallèles (wireframe) */}
        <motion.ellipse rx="90" ry="30" fill="none" stroke="#fdba74" strokeWidth="1" strokeOpacity="0.6"
          animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} />
        <motion.ellipse rx="60" ry="90" fill="none" stroke="#fdba74" strokeWidth="1" strokeOpacity="0.6"
          animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} />
        <ellipse rx="90" ry="60" fill="none" stroke="#fdba74" strokeWidth="1" strokeOpacity="0.4" />
        <ellipse rx="90" ry="10" fill="none" stroke="#fdba74" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="-90" y1="0" x2="90" y2="0" stroke="#fdba74" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="0" y1="-90" x2="0" y2="90" stroke="#fdba74" strokeWidth="1" strokeOpacity="0.4" />

        {/* Points chauds pulsants sur le globe */}
        {points.map((p, i) => {
          // Conversion des coordonnées relatives autour du centre
          const dx = p.x - 250;
          const dy = p.y - 130;
          return (
            <g key={i}>
              <motion.circle
                cx={dx} cy={dy} r="4"
                fill="#f97316" stroke="#fff" strokeWidth="1.2"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 220 }}
              />
              <motion.circle
                cx={dx} cy={dy} r="6"
                fill="none" stroke="#fb923c" strokeWidth="1.4" strokeOpacity="0.6"
                animate={{ r: [6, 18], opacity: [0.7, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.25 }}
              />
            </g>
          );
        })}
      </g>

      {/* Drapeaux flottants autour */}
      {points.slice(0, 6).map((p, i) => (
        <motion.g
          key={`flag-${i}`}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        >
          <circle cx={p.x} cy={p.y} r="13" fill="#fff" stroke="#fed7aa" strokeWidth="1.4" />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="14">{p.flag}</text>
        </motion.g>
      ))}

      {/* Badge "205+ pays" */}
      <motion.g
        transform="translate(430 220)"
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
      >
        <circle r="30" fill="#f97316" />
        <text x="0" y="-2" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="system-ui">205+</text>
        <text x="0" y="12" textAnchor="middle" fontSize="9" fontWeight="600" fill="#fff" opacity="0.9">pays</text>
      </motion.g>
    </svg>
  );
};

/* --- HERO PHONE PREMIUM (iPhone avec SMS / codes OTP animés) --- */
const HeroPhonePremium = () => {
  const messages = [
    { name: "WhatsApp", slug: "whatsapp", color: "25D366", code: "847 291" },
    { name: "Google", slug: "google", color: "4285F4", code: "G-883921" },
    { name: "Telegram", slug: "telegram", color: "26A5E4", code: "T-471 028" },
    { name: "Instagram", slug: "instagram", color: "E1306C", code: "392 847" },
  ];
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setVisibleCount(c => (c >= messages.length ? 1 : c + 1));
    }, 2100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      {/* Halo lumineux */}
      <div className="absolute inset-0 -m-10 bg-gradient-to-tr from-primary/25 via-transparent to-orange-300/20 blur-3xl rounded-full pointer-events-none" />

      {/* Étiquette flottante haut */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="absolute -top-2 left-0 sm:-left-6 z-20 bg-white border border-border rounded-2xl px-3.5 py-2 shadow-lg text-xs font-semibold whitespace-nowrap"
      >
        <span className="text-emerald-600 mr-1.5">✓</span>Numéro virtuel actif
      </motion.div>

      {/* Étiquette flottante bas */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="absolute -bottom-2 right-0 sm:-right-4 z-20 bg-white border border-border rounded-2xl px-3.5 py-2 shadow-lg text-xs font-semibold whitespace-nowrap"
      >
        🌍 205+ pays
      </motion.div>

      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
        style={{ perspective: "1400px" }}
      >
        {/* Châssis téléphone */}
        <div className="relative w-[270px] sm:w-[290px] h-[560px] sm:h-[600px] mx-auto rounded-[46px] bg-gradient-to-b from-[#2a2a2a] via-[#0a0a0a] to-[#2a2a2a] p-[3px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 rounded-[46px] bg-gradient-to-tr from-white/20 via-transparent to-white/5 pointer-events-none" />

          <div className="w-full h-full rounded-[43px] bg-[#FAFAFA] overflow-hidden relative flex flex-col">
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-30" />

            <div className="flex items-center justify-between px-6 pt-3.5 pb-2 text-[11px] font-semibold text-black relative z-20">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-3" viewBox="0 0 24 16" fill="currentColor">
                  <rect x="0" y="10" width="3" height="6" rx="0.5"/>
                  <rect x="6" y="7" width="3" height="9" rx="0.5"/>
                  <rect x="12" y="4" width="3" height="12" rx="0.5"/>
                  <rect x="18" y="0" width="3" height="16" rx="0.5"/>
                </svg>
                <div className="w-6 h-3 border border-black rounded-[3px] relative">
                  <div className="absolute inset-[1.5px] right-[5px] bg-black rounded-[1px]" />
                  <div className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-[2px] h-[4px] bg-black rounded-r" />
                </div>
              </div>
            </div>

            <div className="px-5 pt-3 pb-2">
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Boîte de réception</div>
              <div className="text-base font-bold text-black mt-0.5">Messages récents</div>
            </div>

            <div className="flex-1 px-4 pt-2 space-y-2.5 overflow-hidden">
              <AnimatePresence>
                {messages.slice(0, visibleCount).map((msg) => (
                  <motion.div
                    key={msg.name}
                    layout
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    transition={{ duration: 0.4, ease }}
                    className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                        <img
                          src={`https://cdn.simpleicons.org/${msg.slug}/${msg.color}`}
                          alt={`Logo ${msg.name}`}
                          className="w-4 h-4"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-black leading-tight">{msg.name}</div>
                        <div className="text-[9px] text-emerald-600 font-medium flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          À l'instant
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mb-1">Code de vérification</div>
                    <div className="font-mono font-black text-lg tracking-[0.15em] text-black">{msg.code}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-white/85 backdrop-blur">
              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Livraison instantanée
                </span>
                <span className="font-semibold text-black">205+ pays</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* --- SECTION PUBLICITÉ TÉLÉPHONE PREMIUM (Améliorée : sophistication & rotation premium) --- */
const PremiumPhoneAd = () => {
  const notifications = [
    { name: "WhatsApp", slug: "whatsapp", color: "25D366", code: "492 103" },
    { name: "Google", slug: "google", color: "4285F4", code: "883 921" },
    { name: "Telegram", slug: "telegram", color: "26A5E4", code: "471 028" },
    { name: "Instagram", slug: "instagram", color: "E1306C", code: "392 847" },
    { name: "TikTok", slug: "tiktok", color: "000000", code: "508 172" },
  ];
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setVisibleCount(c => (c >= notifications.length ? 1 : c + 1));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="py-24 bg-[#FCFCFD] overflow-hidden relative border-t border-border">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="max-w-7xl mx-auto px-6 relative flex flex-col md:flex-row items-center justify-between gap-12">
        
        <div className="flex-1 md:pr-12 z-10">
          <motion.div {...fadeUp(0)}>
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Expérience sans couture</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6 leading-tight">
              Une technologie invisible,<br />un impact immédiat.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Nous avons conçu une interface qui s'efface pour laisser place à l'essentiel : votre réputation. Recevez vos vérifications instantanément, sur une plateforme pensée pour l'excellence.
            </p>
          </motion.div>
        </div>

        <div className="flex-1 flex justify-center z-10 w-full">
          <div className="relative">
            {/* Ombre douce sous le téléphone */}
            <motion.div 
               animate={{ scale: [1, 0.92, 1], opacity: [0.35, 0.18, 0.35] }}
               transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-8 bg-black/25 blur-2xl rounded-full"
            />

            {/* Rotation 3D naturelle continue — mouvement premium */}
            <motion.div
              animate={{ 
                rotateY: [-18, 18, -18],
                rotateX: [6, 10, 6],
                y: [0, -10, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              style={{ perspective: "1400px", transformStyle: "preserve-3d" }}
              className="relative"
            >
              {/* Châssis du téléphone premium (même design que le Hero) */}
              <div className="relative w-[280px] h-[580px] mx-auto rounded-[46px] bg-gradient-to-b from-[#2a2a2a] via-[#0a0a0a] to-[#2a2a2a] p-[3px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
                {/* Reflet sur le cadre */}
                <div className="absolute inset-0 rounded-[46px] bg-gradient-to-tr from-white/20 via-transparent to-white/5 pointer-events-none" />

                {/* Écran */}
                <div className="w-full h-full rounded-[43px] bg-[#FAFAFA] overflow-hidden relative flex flex-col">
                  {/* Dynamic Island */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-30" />

                  {/* Barre de statut */}
                  <div className="flex items-center justify-between px-6 pt-3.5 pb-2 text-[11px] font-semibold text-black relative z-20">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-3" viewBox="0 0 24 16" fill="currentColor">
                        <rect x="0" y="10" width="3" height="6" rx="0.5"/>
                        <rect x="6" y="7" width="3" height="9" rx="0.5"/>
                        <rect x="12" y="4" width="3" height="12" rx="0.5"/>
                        <rect x="18" y="0" width="3" height="16" rx="0.5"/>
                      </svg>
                      <div className="w-6 h-3 border border-black rounded-[3px] relative">
                        <div className="absolute inset-[1.5px] right-[5px] bg-black rounded-[1px]" />
                        <div className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-[2px] h-[4px] bg-black rounded-r" />
                      </div>
                    </div>
                  </div>

                  {/* Contenu de l'écran */}
                  <div className="flex-1 bg-[#F5F5F7] p-5 pt-8 flex flex-col gap-3">
                    {/* Header App */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="w-20 h-4 bg-gray-200 rounded-full"></div>
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                    </div>

                    {/* Notifications cycliques */}
                    <AnimatePresence>
                      {notifications.slice(0, visibleCount).map((n) => (
                        <motion.div
                          key={n.name}
                          layout
                          initial={{ opacity: 0, x: -20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 20, scale: 0.95 }}
                          transition={{ duration: 0.45, ease }}
                          className="bg-white p-3.5 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <img src={`https://cdn.simpleicons.org/${n.slug}/${n.color}`} alt={n.name} className="w-4 h-4" />
                            <span className="text-[10px] font-bold text-gray-400">{n.name}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-800">
                            Code : <span className="font-bold text-black tracking-widest">{n.code}</span>
                          </p>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Barre de statut inférieure */}
                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Livraison instantanée
                      </span>
                      <span className="font-semibold text-black">205+ pays</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};


/* --- ILLUSTRATION EXPÉRIENCE SANS COUTURE --- */

const SeamlessExperienceIllust = () => (
  <div className="w-full max-w-4xl mx-auto my-8 relative">
    <svg viewBox="0 0 800 300" className="w-full h-auto drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Connexion globale entre entreprises et clients via Texerra SMS">
      <path d="M 150 150 C 300 50, 500 250, 650 150" stroke="#e2e8f0" strokeWidth="4" strokeDasharray="8 8" />
      
      <motion.circle cx="300" cy="100" r="6" fill="#fb923c" animate={{ y: [-10, 10, -10] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
      <motion.circle cx="500" cy="200" r="8" fill="#60a5fa" animate={{ y: [10, -10, 10] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
      
      <g transform="translate(150, 150)">
        <motion.circle cx="0" cy="0" r="55" fill="#ffffff" stroke="#f1f5f9" strokeWidth="6" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} />
        <circle cx="0" cy="-12" r="16" fill="#f97316" />
        <path d="M -26 28 C -26 5, 26 5, 26 28 Z" fill="#fdba74" />
        <motion.g initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ type: "spring", delay: 0.4 }}>
          <circle cx="35" cy="-35" r="16" fill="#10b981" />
          <path d="M 28 -35 L 33 -30 L 42 -40" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </motion.g>
      </g>

      <g transform="translate(650, 150)">
        <motion.circle cx="0" cy="0" r="55" fill="#ffffff" stroke="#f1f5f9" strokeWidth="6" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} />
        <circle cx="0" cy="-12" r="16" fill="#3b82f6" />
        <path d="M -26 28 C -26 5, 26 5, 26 28 Z" fill="#93c5fd" />
        <motion.g initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ type: "spring", delay: 0.5 }}>
          <circle cx="-35" cy="-35" r="16" fill="#ef4444" />
          <path d="M -39 -35 C -42 -38, -37 -42, -35 -39 C -33 -42, -28 -38, -31 -35 L -35 -30 Z" fill="#ffffff" />
        </motion.g>
      </g>

      <g transform="translate(400, 150)">
        <motion.circle cx="0" cy="0" r="65" fill="#ffffff" stroke="#e2e8f0" strokeWidth="6" 
          initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.3 }} />
        <path d="M -20 -15 h 40 M -20 0 h 40 M -20 15 h 25" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
        <motion.circle cx="0" cy="0" r="80" stroke="#f97316" strokeWidth="3" strokeDasharray="15 15" fill="none" strokeOpacity="0.5"
          animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} />
      </g>

      <motion.g animate={{ x: [150, 400], y: [150, 150], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
        <circle cx="0" cy="0" r="8" fill="#f97316" />
      </motion.g>
      <motion.g animate={{ x: [400, 650], y: [150, 150], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.75, ease: "linear" }}>
        <circle cx="0" cy="0" r="8" fill="#3b82f6" />
      </motion.g>
    </svg>
  </div>
);

/* --- COMPOSANT DE PREUVE SOCIALE (Trafic en direct) --- */

function LiveTraffic() {
  const [notification, setNotification] = useState<{ country: string, service: string, time: number } | null>(null);

  useEffect(() => {
    const countries = [
      { flag: '🇺🇸', name: 'États-Unis' }, { flag: '🇫🇷', name: 'France' },
      { flag: '🇬🇧', name: 'Royaume-Uni' }, { flag: '🇨🇩', name: 'RDC' },
      { flag: '🇳🇬', name: 'Nigeria' }, { flag: '🇨🇮', name: 'Côte d\'Ivoire' }
    ];
    const services = ['WhatsApp', 'Instagram', 'Telegram', 'Google', 'TikTok'];

    const generateNotification = () => {
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      const randomService = services[Math.floor(Math.random() * services.length)];
      const randomTime = Math.floor(Math.random() * 20) + 5;

      setNotification({
        country: `${randomCountry.flag} ${randomCountry.name}`,
        service: randomService,
        time: randomTime
      });

      setTimeout(() => setNotification(null), 6000);
    };

    const initialTimeout = setTimeout(generateNotification, 3000);

    const interval = setInterval(() => {
      generateNotification();
    }, Math.floor(Math.random() * 10000) + 15000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-6 left-6 z-50 bg-white border border-border shadow-2xl rounded-2xl p-4 flex items-center gap-4 max-w-sm pointer-events-none"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">
              Achat vérifié
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Un numéro <span className="font-medium text-foreground">{notification.service}</span> de {notification.country} vient d'être activé.
            </p>
            <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Code livré en {notification.time} secondes
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SmsDemo() {
  return (
    <div className="relative flex items-center justify-center py-8">
      <div className="absolute w-72 h-72 rounded-full bg-orange-400/12 blur-[70px]" />

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 bg-white border border-border rounded-3xl p-6 w-[288px] shadow-[0_24px_60px_hsl(24_90%_52%/0.12),_0_8px_20px_hsl(32_14%_78%/0.4)]"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-green-50">
            <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="WhatsApp" className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-foreground">WhatsApp Business</div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span className="text-emerald-600 font-medium">Code reçu</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground shrink-0">14:23</div>
        </div>

        <div className="rounded-2xl p-5 text-center mb-4 bg-secondary border border-border">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2.5 font-semibold">
            Code de vérification
          </div>
          <div className="text-[40px] font-black tracking-[0.22em] font-mono text-foreground leading-none">
            847 291
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            Livré en 23 secondes
          </div>
          <div className="text-xs text-muted-foreground">🇺🇸 +1</div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        className="absolute top-2 -left-8 z-20 bg-white border border-border rounded-2xl px-3.5 py-2.5 shadow-lg text-xs font-semibold whitespace-nowrap"
      >
        <span className="text-primary mr-1.5">✓</span>Image internationale
      </motion.div>

      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        className="absolute bottom-4 -right-4 z-20 bg-white border border-border rounded-2xl px-3.5 py-2.5 shadow-lg text-xs font-semibold whitespace-nowrap"
      >
        🌍 205+ pays disponibles
      </motion.div>
    </div>
  );
}

export default function Home() {
  useMeta({
    title: "Numéro virtuel WhatsApp, SMS & vérification | Texerra SMS",
    description: "Achetez un numéro virtuel pour WhatsApp, recevoir des SMS et vérifier vos comptes en ligne. Choisissez votre pays et obtenez votre numéro rapidement avec Texerra SMS.",
    canonical: "https://texerra.site/",
  });

  const [stats, setStats] = useState<Stats | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [showAllCountries, setShowAllCountries] = useState(false);

  useEffect(() => {
    fetch("/api/stats").then(res => res.json()).then(setStats).catch(() => {});
    fetch("/api/services").then(res => res.json()).then(setServices).catch(() => {});
    fetch("/api/countries").then(res => res.json()).then(setCountries).catch(() => {});
  }, []);

  const visibleCountries = showAllCountries ? (countries ?? []) : (countries ?? []).slice(0, 24);

  return (
    <div className="flex flex-col">
      <LiveTraffic />

      {/* ── Hero ── */}
      <section className="relative min-h-[94vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-orange-400/8 blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full bg-yellow-400/6 blur-[100px] pointer-events-none" />

        <div className="relative w-full max-w-7xl mx-auto px-6 py-24 md:py-28">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-16 items-center">

            <div>
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, ease }}
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-[68px] font-extrabold leading-[1.05] tracking-tight mb-6 text-foreground">
                  Le bon numéro,<br />
                  <span className="gradient-text">pour chaque usage.</span>
                </h1>

                <p className="text-lg md:text-xl text-foreground/80 mb-6 max-w-xl leading-relaxed font-medium">
                  Numéros virtuels pour WhatsApp, vérification SMS et services en ligne. Choisissez votre pays et obtenez votre numéro rapidement.
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm mb-10 max-w-xl">
                  <span className="font-semibold text-foreground/75">WhatsApp</span>
                  <span className="text-primary/50">•</span>
                  <span className="font-semibold text-foreground/75">Telegram</span>
                  <span className="text-primary/50">•</span>
                  <span className="font-semibold text-foreground/75">Google</span>
                  <span className="text-primary/50">•</span>
                  <span className="font-semibold text-foreground/75">Instagram</span>
                  <span className="text-primary/50">•</span>
                  <span className="font-semibold text-foreground/75">TikTok</span>
                  <span className="text-primary/50">•</span>
                  <span className="text-muted-foreground font-medium">et bien plus</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-14">
                  <Link
                    href="/order"
                    className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all duration-200 shadow-[0_8px_32px_hsl(24_90%_52%/0.32)] hover:shadow-[0_12px_40px_hsl(24_90%_52%/0.42)] hover:-translate-y-0.5 text-base"
                  >
                    Obtenir un numéro <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a
                    href="#pourquoi"
                    className="inline-flex items-center gap-2.5 px-8 py-4 bg-white hover:bg-secondary border border-border text-foreground font-semibold rounded-2xl transition-all duration-200 text-base shadow-sm"
                  >
                    Pourquoi Texerra SMS ?
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.3, ease }}
                className="flex flex-wrap gap-8 sm:gap-10"
              >
                {[
                  { value: stats ? `${stats.totalOrders.toLocaleString()}+` : "712+", label: "Numéros activés" },
                  { value: stats ? `${stats.totalCountries}+` : "205+", label: "Pays disponibles" },
                  { value: `${stats?.averageDeliverySeconds ?? 45}s`, label: "Temps d'activation" },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="text-2xl font-extrabold gradient-text leading-none mb-1">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94, x: 24 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.2, ease }}
              className="flex items-center justify-center pt-6 lg:pt-0"
            >
              <HeroPhonePremium />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Problème ── */}
      <section className="py-20 bg-secondary/40 border-y border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-5">Le problème</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6 leading-tight">
              Trop d'entreprises perdent en crédibilité dès le premier contact.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Un numéro inadapté peut suffire pour vos proches. Mais pour convaincre un client, un partenaire ou accéder à une plateforme internationale — il vous faut le bon numéro, dans le bon pays.
            </p>
          </motion.div>

          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12"
          >
            {[
              {
                Graphic: IllusTrust,
                title: "Moins de confiance",
                desc: "Un numéro inconnu ou mal perçu donne une impression peu professionnelle et freine la relation avant même le premier échange.",
              },
              {
                Graphic: IllusLocal,
                title: "Image trop locale",
                desc: "Paraître trop régional peut limiter vos opportunités avec des acteurs nationaux et internationaux qui doutent de votre sérieux.",
              },
              {
                Graphic: IllusTarget,
                title: "Clients dans un autre pays",
                desc: "Votre activité est dans un pays, mais votre clientèle principale est dans un autre ? Avoir un numéro local dans ce pays peut être très rassurant et renforcer votre crédibilité.",
              },
              {
                Graphic: IllusBlock,
                title: "Accès bloqué",
                desc: "Certaines plateformes exigent un numéro d'un pays précis pour s'inscrire ou activer un compte professionnel.",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={gridItem} className="bg-white border border-border rounded-2xl p-6 flex flex-col hover:border-primary/20 transition-colors">
                <item.Graphic />
                <h3 className="font-bold text-sm mb-2 text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Services disponibles ── */}
      <section id="services" className="py-24 relative bg-white">
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">200+ plateformes</div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">Services disponibles</h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              WhatsApp Business, Instagram, Google, LinkedIn, TikTok et des centaines d'autres plateformes mondiales.
            </p>
          </motion.div>

          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 mb-10"
          >
            {(services ?? []).slice(0, 14).map(service => {
              const iconUrl = SERVICE_ICON_URLS[service.code];
              return (
                <motion.div key={service.code} variants={gridItem}>
                  <Link
                    href="/order"
                    className="group flex flex-col items-center justify-center gap-2.5 p-4 bg-white border border-border rounded-2xl hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-sm transition-all duration-200 text-center h-full min-h-[100px]"
                  >
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={`Numéro virtuel pour ${service.name}`}
                        className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-200"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <MessageSquare className="w-7 h-7 text-primary/50" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{service.name}</span>
                    {service.priceFrom != null && (
                      <span className="text-xs font-bold text-primary">{service.priceFrom.toFixed(2)}€</span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          <div className="text-center">
            <Link
              href="/order"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-border hover:border-primary/40 hover:bg-primary/[0.03] text-sm font-semibold rounded-2xl transition-all duration-200 shadow-sm"
            >
              Voir tous les services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section publicité téléphone premium ── */}
      <PremiumPhoneAd />

      {/* ── Pourquoi Texerra SMS ── */}
      <section id="pourquoi" className="py-24 bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Pourquoi Texerra SMS ?</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5">
              Ce que vous gagnez vraiment
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Texerra SMS ne vend pas un simple numéro. Texerra SMS vous donne les moyens d'être perçu différemment — dès le premier contact.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="mb-16">
            <PersonObtainedNumber />
          </motion.div>

          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {[
              {
                Graphic: AbstractTrust,
                title: "Inspirez confiance plus vite",
                desc: "Un numéro du bon pays positionne immédiatement votre entreprise comme sérieuse, locale et établie.",
              },
              {
                Graphic: AbstractPremium,
                title: "Image plus premium",
                desc: "Présentez-vous avec l'assurance d'une entreprise implantée là où se trouvent vos clients.",
              },
              {
                Graphic: AbstractPartner,
                title: "Convainquez prospects & partenaires",
                desc: "Vos interlocuteurs vous prendront davantage au sérieux. Plus d'opportunités, moins de barrières.",
              },
              {
                Graphic: AbstractGlobal,
                title: "Présence internationale",
                desc: "Obtenez un numéro de n'importe quel pays — États-Unis, France, UK, RDC, Nigeria et 205+ autres.",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={gridItem} className="group relative flex flex-col p-8 rounded-3xl bg-secondary/20 hover:bg-white border border-transparent hover:border-border transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                <item.Graphic />
                <h3 className="text-lg font-bold mb-3 text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── À qui s'adresse Texerra SMS ── */}
      <section className="py-24 bg-white border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="mb-16 md:flex md:items-end md:justify-between gap-10">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Pour qui ?</p>
              <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight">
                Texerra SMS s'adresse à tout le monde
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-md pb-2">
              Que vous ayez besoin d'un numéro pour votre image, pour vérifier un compte ou simplement pour un usage personnel — Texerra SMS a ce qu'il vous faut.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="mb-16">
            <MultiUsageIllust />
          </motion.div>

          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-x-12 gap-y-8"
          >
            {[
              { title: "Entrepreneurs & dirigeants", desc: "Obtenez un numéro du pays où se trouvent vos clients ou partenaires pour inspirer plus de confiance." },
              { title: "Agences & freelances", desc: "Gérez des comptes clients sur plusieurs plateformes avec une image professionnelle et internationale." },
              { title: "E-commerçants", desc: "Donnez à votre boutique en ligne une présence locale dans les marchés que vous ciblez." },
              { title: "Vérification de compte", desc: "Recevez un code OTP pour activer un compte sur n'importe quelle plateforme. Simple, rapide, discret." },
              { title: "Accès aux plateformes", desc: "WhatsApp Business, Instagram, Google, TikTok, Telegram — obtenez le numéro requis pour vous inscrire." },
              { title: "Usage personnel", desc: "Besoin d'un numéro d'un pays précis ? Que ce soit pour vous ou votre activité — choisissez simplement le pays et commandez." },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={gridItem}
                className="flex flex-col gap-3 py-4 border-b border-border/40 last:border-0"
              >
                <span className="text-base font-bold text-foreground">{item.title}</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Comment ça marche (avec nouveau SVG de flux) ── */}
      <section className="py-24 relative bg-secondary/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Simple & rapide</div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">Comment ça marche</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">Trois étapes. Moins de 60 secondes.</p>
          </motion.div>

          {/* Nouveau SVG : flux visuel des 3 étapes */}
          <motion.div {...fadeUp(0.1)} className="mb-14">
            <StepsFlowIllust />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 relative">
            <div className="hidden md:block absolute top-11 left-[calc(50%/3+3rem)] right-[calc(50%/3+3rem)] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            {[
              {
                step: "01",
                type: "card" as const,
                title: "Rechargez votre solde",
                desc: "Orange Money, MTN Mobile Money, carte bancaire. Votre solde ne expire jamais.",
                accent: "border-blue-200 hover:border-blue-300 hover:shadow-md",
                stepColor: "text-blue-200",
              },
              {
                step: "02",
                type: "world" as const,
                title: "Choisissez le service et le pays",
                desc: "Sélectionnez WhatsApp, Instagram, Google ou autre — et le pays du numéro voulu.",
                accent: "border-orange-200 hover:border-orange-300 hover:shadow-md",
                stepColor: "text-orange-200",
              },
              {
                step: "03",
                type: "check" as const,
                title: "Recevez le code instantanément",
                desc: "Le code SMS apparaît en temps réel sur votre tableau de bord. Votre numéro est activé.",
                accent: "border-emerald-200 hover:border-emerald-300 hover:shadow-md",
                stepColor: "text-emerald-200",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                {...fadeUp(i * 0.1)}
                className={`relative bg-white border ${item.accent} rounded-3xl p-8 transition-all duration-300 flex flex-col h-full`}
              >
                <div className="flex items-start gap-4 mb-6">
                  <span className={`text-5xl font-black ${item.stepColor} font-mono leading-none select-none shrink-0`}>
                    {item.step}
                  </span>
                  <div className="mt-1">
                    <MiniIllus type={item.type} />
                  </div>
                </div>
                <h3 className="text-base font-bold mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Couverture mondiale (avec nouveau SVG globe animé) ── */}
      <section id="pays" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Couverture mondiale</div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
              {stats ? `${stats.totalCountries}+` : "205+"} pays disponibles
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Toute l'Afrique, l'Europe, les États-Unis, l'Asie — choisissez le pays qui correspond à vos besoins.
            </p>
          </motion.div>

          {/* Nouveau SVG : globe avec points pulsants */}
          <motion.div {...fadeUp(0.1)} className="mb-14">
            <GlobalCoverageIllust />
          </motion.div>

          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10"
          >
            {visibleCountries.map(country => (
              <motion.div key={country.code} variants={gridItem}>
                <Link
                  href="/order"
                  className="group flex items-center gap-3 p-3.5 bg-white border border-border rounded-2xl hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-sm transition-all duration-200 h-full"
                >
                  <span className="text-2xl shrink-0">{country.flag ?? "🌍"}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">{country.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {country.dialCode ?? ""}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {(countries ?? []).length > 24 && (
            <div className="text-center">
              <button
                onClick={() => setShowAllCountries(v => !v)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-border hover:border-primary/40 hover:bg-primary/[0.03] text-sm font-semibold rounded-2xl transition-all duration-200 shadow-sm"
              >
                {showAllCountries ? "Réduire la liste" : `Voir tous les ${countries?.length ?? ""} pays`}
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAllCountries ? "rotate-180" : ""}`} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Expérience sans couture ── */}
      <section className="py-24 bg-secondary/20 border-t border-border overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.div {...fadeUp(0)}>
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Connexion globale</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
              Une expérience sans couture
            </h2>
          </motion.div>
          
          <motion.div {...fadeUp(0.2)}>
            <SeamlessExperienceIllust />
          </motion.div>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section className="py-20 border-y border-border bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { icon: Zap, title: "Activation < 60s", desc: "Numéro actif en quelques secondes", cls: "text-amber-600 bg-amber-100" },
              { icon: Shield, title: "100% confidentiel", desc: "Aucune donnée personnelle requise", cls: "text-emerald-600 bg-emerald-100" },
              { icon: CheckCircle2, title: "Solde permanent", desc: "Votre crédit ne expire jamais", cls: "text-blue-600 bg-blue-100" },
              { icon: HeadphonesIcon, title: "Support 24/7", desc: "Réponse en moins d'une heure", cls: "text-primary bg-primary/10" },
            ].map(f => (
              <motion.div key={f.title} variants={gridItem} className="flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.cls} shrink-0`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm mb-1 text-foreground">{f.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Vision de marque ── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div {...fadeUp(0)}>
            <div className="flex justify-center mb-8">
              <svg className="w-16 h-16 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" role="img" aria-label="Couverture internationale de Texerra SMS">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
            </div>
            <blockquote className="text-2xl md:text-3xl font-bold text-foreground leading-snug mb-6">
              "Nous pensons que chaque entreprise mérite d'être perçue avec le même niveau de professionnalisme que les grandes entreprises internationales."
            </blockquote>
            <p className="text-muted-foreground text-base">
              C'est pourquoi Texerra SMS existe — pour effacer les frontières perçues et donner à chaque entrepreneur la posture qu'il mérite, où qu'il soit.
            </p>
            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-xs uppercase tracking-widest text-primary font-bold">L'équipe Texerra SMS</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 bg-secondary/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Aide</div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">Questions fréquentes</h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              Tout ce qu'il faut savoir sur les numéros virtuels, la réception de SMS et la vérification de comptes en ligne.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <Accordion type="single" collapsible className="space-y-3">
              {[
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
                {
                  q: "Quels pays sont disponibles sur Texerra SMS ?",
                  a: "Texerra SMS couvre plus de 205 pays : toute l'Afrique (RDC, Nigeria, Côte d'Ivoire, Sénégal, Ghana, Kenya…), l'Europe (France, Royaume-Uni, Allemagne…), les États-Unis, le Canada, l'Asie et bien d'autres. Vous choisissez simplement le pays du numéro dont vous avez besoin.",
                },
                {
                  q: "Comment acheter un numéro virtuel ?",
                  a: "C'est simple : créez votre compte gratuitement, rechargez votre solde (Orange Money, MTN, Moov, Airtel Money ou carte bancaire), choisissez le service et le pays, puis validez. Votre numéro est actif immédiatement et le code de vérification apparaît sur votre tableau de bord.",
                },
                {
                  q: "Combien de temps faut-il pour obtenir un numéro ?",
                  a: "Moins de 60 secondes. Dès que votre commande est validée, votre numéro est attribué et prêt à recevoir des SMS. En moyenne, nos clients reçoivent leur code de vérification en 45 secondes.",
                },
                {
                  q: "Est-ce vraiment un vrai numéro actif ?",
                  a: "Oui. Texerra SMS vous fournit de vrais numéros actifs dans les pays de votre choix — pas des numéros fictifs. Ils reçoivent des SMS réels et sont acceptés par toutes les grandes plateformes mondiales.",
                },
                {
                  q: "Quels moyens de paiement acceptez-vous ?",
                  a: "Orange Money, MTN Mobile Money, Moov, Airtel Money, carte Visa/Mastercard. Paiement instantané, sans frais cachés.",
                },
                {
                  q: "Que faire si je ne reçois pas de SMS ?",
                  a: "Annulez depuis votre tableau de bord. Le montant est remboursé automatiquement sur votre solde en quelques secondes. Aucune perte.",
                },
                {
                  q: "Est-ce légal d'utiliser des numéros virtuels ?",
                  a: "Oui. L'utilisation de numéros virtuels pour la vérification de comptes est légale dans la plupart des pays. Nous respectons les conditions des plateformes concernées.",
                },
              ].map((item, i) => (
                <AccordionItem key={i} value={`q${i}`} className="bg-white border border-border rounded-2xl px-1 data-[state=open]:border-primary/30 transition-colors">
                  <AccordionTrigger className="text-left font-semibold py-4 px-4 hover:no-underline text-sm md:text-base text-foreground">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground px-4 pb-4 text-sm leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="text-center mt-10">
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-border hover:border-primary/40 hover:bg-primary/[0.03] text-sm font-semibold rounded-2xl transition-all duration-200 shadow-sm"
              >
                Voir toutes les questions <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── NOUVELLE SECTION : Constellation de confiance (après la FAQ) ── */}
      <section className="py-24 bg-white border-t border-border overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Un écosystème complet</p>
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">
              Tous vos services, connectés à un seul numéro.
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Un numéro Texerra SMS devient la clé d'accès à l'ensemble des plateformes que vous utilisez au quotidien.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.15)}>
            <TrustConstellation />
          </motion.div>

          <motion.div {...fadeUp(0.3)} className="text-center mt-12">
            <Link
              href="/order"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all duration-200 shadow-[0_8px_32px_hsl(24_90%_52%/0.32)] hover:-translate-y-0.5 text-base"
            >
              Activer mon numéro <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            {...fadeUp(0)}
            className="relative overflow-hidden border border-primary/20 rounded-3xl p-12 md:p-16 text-center bg-gradient-to-br from-orange-50 via-amber-50/60 to-yellow-50"
          >
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-orange-400/12 blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-yellow-400/12 blur-[60px] pointer-events-none" />
            <div className="relative">
              <p className="text-xs uppercase tracking-widest text-primary font-bold mb-4">Prêt à changer d'image ?</p>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">
                L'image professionnelle<br />que vous méritez.
              </h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto">
                Créez votre compte gratuitement. Votre premier numéro actif en moins de 60 secondes.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all duration-200 shadow-[0_8px_32px_hsl(24_90%_52%/0.35)] hover:-translate-y-0.5 text-base"
                >
                  Créer un compte gratuit <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/order"
                  className="inline-flex items-center gap-2.5 px-8 py-4 bg-white hover:bg-secondary border border-border text-foreground font-semibold rounded-2xl transition-all duration-200 text-base shadow-sm"
                >
                  Commander maintenant
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}