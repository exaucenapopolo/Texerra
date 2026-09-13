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
  <svg viewBox="0 0 100 100" className="w-12 h-12 mb-4 text-primary">
    <motion.path d="M50 10 L90 30 L90 60 C90 80 50 95 50 95 C50 95 10 80 10 60 L10 30 Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 1.5 }}/>
    <motion.circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="4" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}/>
    <motion.path d="M10 30 L90 30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" initial={{ opacity: 0 }} whileInView={{ opacity: 0.5 }} transition={{ delay: 1 }}/>
  </svg>
);

const IllusLocal = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 mb-4 text-blue-500">
    <motion.circle cx="50" cy="50" r="40" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="4" strokeDasharray="10 5" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}/>
    <motion.path d="M50 10 L50 90 M10 50 L90 50" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5"/>
    <motion.circle cx="50" cy="50" r="8" fill="currentColor" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 0.3 }}/>
  </svg>
);

const IllusTarget = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 mb-4 text-emerald-500">
    <motion.path d="M50 15 A 35 35 0 1 1 49.9 15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 15" animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}/>
    <motion.path d="M50 85 L50 65 M50 35 L50 15 M15 50 L35 50 M65 50 L85 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    <motion.circle cx="50" cy="50" r="10" fill="currentColor" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.5 }}/>
  </svg>
);

const IllusBlock = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 mb-4 text-red-400">
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

/* --- COMPOSANTS SVG PREMIUM (Pour la section Pourquoi) --- */

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

/* --- NOUVEAUX COMPOSANTS SVG PREMIUM (Ajoutés pour les sections Pourquoi & Pour qui) --- */

const SatisfiedUserSvg = () => (
  <div className="w-full max-w-sm mx-auto relative drop-shadow-2xl">
    <svg viewBox="0 0 400 400" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="140" fill="#fff" stroke="#f1f5f9" strokeWidth="2" />
      <motion.circle cx="200" cy="200" r="170" stroke="#f97316" strokeWidth="1.5" strokeDasharray="12 12" strokeOpacity="0.3" animate={{ rotate: 360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }} />
      
      {/* Abstract Person */}
      <path d="M120 340 C120 250, 280 250, 280 340" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="4" />
      <circle cx="200" cy="160" r="50" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="4" />
      
      {/* Phone Silhouette */}
      <motion.rect x="230" y="180" width="45" height="85" rx="8" fill="#1e293b" initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} />
      
      {/* Checkmark Success */}
      <motion.g initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 0.8, type: "spring" }}>
        <circle cx="285" cy="170" r="28" fill="#10b981" />
        <path d="M272 170 L280 178 L298 160" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>

      {/* Connection lines */}
      <motion.path d="M250 180 Q 200 80 140 120" stroke="#3b82f6" strokeWidth="3" strokeDasharray="6 6" strokeOpacity="0.5" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 1.5, delay: 0.5 }} />
      <motion.circle cx="140" cy="120" r="16" fill="#3b82f6" initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 1 }} />
      <motion.path d="M132 120 h16 M140 112 v16" stroke="#fff" strokeWidth="2" strokeLinecap="round" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 1.2 }} />
    </svg>
  </div>
);

const DiverseUsesSvg = () => (
  <div className="w-full max-w-md mx-auto relative drop-shadow-xl">
    <svg viewBox="0 0 500 500" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hub Central Texerra */}
      <motion.circle cx="250" cy="250" r="70" fill="#ffffff" stroke="#f97316" strokeWidth="4" initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} />
      <path d="M230 250 h40 M230 235 h40 M230 265 h25" stroke="#f97316" strokeWidth="6" strokeLinecap="round" />
      
      {/* Lignes de connexion */}
      <motion.path d="M250 180 L250 100" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="8 8" />
      <motion.path d="M320 250 L400 250" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="8 8" />
      <motion.path d="M250 320 L250 400" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="8 8" />
      <motion.path d="M180 250 L100 250" stroke="#e2e8f0" strokeWidth="3" strokeDasharray="8 8" />

      {/* Nœud 1: Personnel / WhatsApp */}
      <motion.g initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <circle cx="250" cy="100" r="45" fill="#fff" stroke="#10b981" strokeWidth="3" />
        <path d="M240 110 C240 100, 260 100, 260 110 Z" fill="#10b981" />
        <circle cx="250" cy="90" r="12" fill="#10b981" />
      </motion.g>

      {/* Nœud 2: Business */}
      <motion.g initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
        <circle cx="400" cy="250" r="45" fill="#fff" stroke="#3b82f6" strokeWidth="3" />
        <rect x="385" y="240" width="30" height="20" rx="3" stroke="#3b82f6" strokeWidth="3" />
        <path d="M390 240 V235 C390 230, 410 230, 410 235 V240" stroke="#3b82f6" strokeWidth="3" />
      </motion.g>

      {/* Nœud 3: Global / International */}
      <motion.g initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
        <circle cx="250" cy="400" r="45" fill="#fff" stroke="#f59e0b" strokeWidth="3" />
        <ellipse cx="250" cy="400" rx="20" ry="45" stroke="#f59e0b" strokeWidth="2" fill="none" />
        <path d="M205 400 h90" stroke="#f59e0b" strokeWidth="2" />
      </motion.g>

      {/* Nœud 4: Sécurité / Confidentialité */}
      <motion.g initial={{ x: -20, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
        <circle cx="100" cy="250" r="45" fill="#fff" stroke="#64748b" strokeWidth="3" />
        <rect x="85" y="245" width="30" height="20" rx="4" fill="#64748b" />
        <path d="M92 245 V235 C92 225, 108 225, 108 235 V245" stroke="#64748b" strokeWidth="3" fill="none" />
      </motion.g>
      
      {/* Particules animées */}
      <motion.circle cx="250" cy="250" r="6" fill="#f97316" animate={{ y: [0, -150, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
      <motion.circle cx="250" cy="250" r="6" fill="#10b981" animate={{ x: [0, 150, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
      <motion.circle cx="250" cy="250" r="6" fill="#3b82f6" animate={{ y: [0, 150, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
      <motion.circle cx="250" cy="250" r="6" fill="#64748b" animate={{ x: [0, -150, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} />
    </svg>
  </div>
);

/* --- NOUVEAU COMPOSANT : PHONE AD (SVG Publicité Téléphone Amélioré 3D) --- */
const PremiumPhoneAd = () => {
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

        <div className="flex-1 flex justify-center z-10 w-full" style={{ perspective: "1500px" }}>
          <motion.div
            animate={{ rotateY: [-25, 25, -25], rotateX: [5, 12, 5], y: [0, -15, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative"
          >
            {/* L'ombre sous le téléphone */}
            <motion.div 
               animate={{ scale: [1, 0.9, 1], opacity: [0.3, 0.1, 0.3] }}
               transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-10 bg-black/30 blur-2xl rounded-full"
            />

            {/* Fausse épaisseur 3D (Côté du téléphone) */}
            <div 
              className="absolute inset-0 bg-gray-400 rounded-[45px] shadow-2xl" 
              style={{ transform: "translateZ(-12px)" }}
            ></div>

            {/* Le châssis du téléphone */}
            <div 
              className="w-[280px] h-[580px] bg-[#111] rounded-[45px] p-2.5 relative border-[2px] border-gray-700 bg-gradient-to-br from-gray-800 to-black"
              style={{ transform: "translateZ(0px)" }}
            >
              {/* L'écran */}
              <div className="w-full h-full bg-[#f4f4f5] rounded-[35px] overflow-hidden relative flex flex-col">
                
                {/* Dynamic Island / Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20"></div>

                {/* Contenu de l'écran (Simulation App) */}
                <div className="flex-1 p-4 pt-16 flex flex-col gap-3 relative overflow-hidden">
                  
                  {/* Header App */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="w-20 h-4 bg-gray-200 rounded-full"></div>
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                  </div>

                  {/* Messages OTP dynamiques */}
                  {[
                    { s: "WhatsApp", c: "25D366", m: "Votre code: 492 103", delay: 0.5 },
                    { s: "Google", c: "4285F4", m: "G-883921 est votre code", delay: 2.5 },
                    { s: "Telegram", c: "26A5E4", m: "Code de connexion: 7104", delay: 4.5 },
                    { s: "Instagram", c: "E1306C", m: "Code IG: 092 114", delay: 6.5 },
                    { s: "TikTok", c: "000000", m: "Code de vérif: 5542", delay: 8.5 }
                  ].map((notif, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -30, scale: 0.9 }}
                      whileInView={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: notif.delay, duration: 0.5, type: "spring" }}
                      className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 max-w-[90%] relative z-10"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <img src={`https://cdn.simpleicons.org/${notif.s.toLowerCase()}/${notif.c}`} alt={notif.s} className="w-3.5 h-3.5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <span className="text-[10px] font-bold text-gray-400">{notif.s}</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-800">{notif.m}</p>
                    </motion.div>
                  ))}
                  
                  {/* Lueur de fond dans l'écran */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};


/* --- ILLUSTRATION EXPÉRIENCE SANS COUTURE --- */

const SeamlessExperienceIllust = () => (
  <div className="w-full max-w-4xl mx-auto my-8 relative">
    <svg viewBox="0 0 800 300" className="w-full h-auto drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        <motion.circle cx="0" cy="0" r="65" fill="#ffffff" stroke="#e2e8f0" strokeWidth="6" initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.3 }} />
        <path d="M -20 -15 h 40 M -20 0 h 40 M -20 15 h 25" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
        <motion.circle cx="0" cy="0" r="80" stroke="#f97316" strokeWidth="3" strokeDasharray="15 15" fill="none" strokeOpacity="0.5" animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} />
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

/* --- NOUVEAU COMPOSANT : HERO PREMIUM PHONE SVG ANIMÉ --- */
function HeroPremiumPhone() {
  return (
    <div className="relative flex items-center justify-center py-8 w-full max-w-md mx-auto">
      {/* Glow de fond */}
      <div className="absolute w-72 h-72 rounded-full bg-primary/15 blur-[80px]" />
      
      {/* Téléphone flottant */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-[260px] md:w-[280px] h-[540px] md:h-[580px] bg-[#111] rounded-[45px] p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.4)] border-[3px] border-[#222]"
      >
        {/* Écran du téléphone */}
        <div className="w-full h-full bg-[#f8f9fa] rounded-[35px] overflow-hidden relative flex flex-col items-center pt-14">
          
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-20"></div>

          {/* Contenu de l'écran */}
          <div className="w-full px-4 space-y-4">
            
            {/* Notification WhatsApp */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              transition={{ delay: 0.5, type: "spring" }} 
              className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#25D366]"></div>
              <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="WA" className="w-6 h-6 shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-gray-400">WhatsApp</div>
                <div className="text-xs font-semibold text-gray-800">Code: <span className="font-bold text-black tracking-wider">492-103</span></div>
              </div>
            </motion.div>
            
            {/* Notification Telegram */}
            <motion.div 
              initial={{ x: -50, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              transition={{ delay: 1.5, type: "spring" }} 
              className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 relative overflow-hidden"
            >
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#26A5E4]"></div>
               <img src="https://cdn.simpleicons.org/telegram/26A5E4" alt="TG" className="w-6 h-6 shrink-0" />
               <div>
                 <div className="text-[10px] font-bold text-gray-400">Telegram</div>
                 <div className="text-xs font-semibold text-gray-800">Connexion: <span className="font-bold text-black tracking-wider">88392</span></div>
               </div>
            </motion.div>

            {/* Notification Google */}
            <motion.div 
              initial={{ y: 50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 2.5, type: "spring" }} 
              className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 relative overflow-hidden"
            >
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4285F4]"></div>
               <img src="https://cdn.simpleicons.org/google/4285F4" alt="GO" className="w-6 h-6 shrink-0" />
               <div>
                 <div className="text-[10px] font-bold text-gray-400">Google</div>
                 <div className="text-xs font-semibold text-gray-800">G- <span className="font-bold text-black tracking-wider">99102</span></div>
               </div>
            </motion.div>

            {/* État de succès */}
            <motion.div 
              initial={{ scale: 0, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ delay: 3.5, type: "spring" }} 
              className="mt-8 mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center shadow-inner"
            >
               <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Éléments extérieurs flottants */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-24 -left-6 md:-left-16 z-20 bg-white border border-border rounded-2xl px-4 py-3 shadow-xl text-xs font-bold"
      >
        🇺🇸 +1 (844) 302...
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
        className="absolute bottom-40 -right-6 md:-right-12 z-20 bg-white border border-border rounded-2xl px-4 py-3 shadow-xl text-xs font-bold flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Numéro Actif
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

        <div className="relative w-full max-w-7xl mx-auto px-6 py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <div>
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, ease }}
              >
                <h1 className="text-5xl md:text-6xl xl:text-[66px] font-extrabold leading-[1.06] tracking-tight mb-5 text-foreground">
                  Le bon numéro,<br />
                  pour <span className="gradient-text">chaque usage.</span>
                </h1>

                {/* Éléments secondaires SEO / Usages */}
                <div className="flex flex-wrap items-center gap-2.5 text-sm md:text-base font-bold text-muted-foreground mb-6">
                   <span>WhatsApp</span> <span className="text-primary/40">•</span>
                   <span>Telegram</span> <span className="text-primary/40">•</span>
                   <span>Google</span> <span className="text-primary/40">•</span>
                   <span>Instagram</span> <span className="text-primary/40">•</span>
                   <span>TikTok</span> <span className="text-primary/40">•</span>
                   <span>et bien plus</span>
                </div>

                <p className="text-base text-foreground/80 mb-10 max-w-lg leading-relaxed font-medium">
                  Numéros virtuels pour WhatsApp, vérification SMS et services en ligne. Choisissez votre pays et obtenez votre numéro rapidement.
                </p>

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
                    Pourquoi TEXERRA ?
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.3, ease }}
                className="flex gap-10"
              >
                {[
                  { value: "712", label: "Numéros activés" },
                  { value: stats ? `${stats.totalCountries}+` : "205+", label: "Pays disponibles" },
                  { value: `${stats?.averageDeliverySeconds ?? 45}s`, label: "Temps d'activation" },
                ].map((stat, i) => (
                  <div key={i}>
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
              className="flex items-center justify-center lg:justify-end"
            >
              {/* Le nouveau HeroPremiumPhone responsive */}
              <HeroPremiumPhone />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Le problème (Totalement restauré et gardé intact !) ── */}
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
                        alt={service.name}
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

      {/* ── NOUVELLE SECTION PUBLICITÉ TÉLÉPHONE ── */}
      <PremiumPhoneAd />

      {/* ── Pourquoi TEXERRA (Design Professionnel importé) ── */}
      <section id="pourquoi" className="py-24 bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16 mb-20">
            <motion.div {...fadeUp(0)} className="lg:w-1/2 text-left">
              <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Pourquoi TEXERRA ?</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5">
                Ce que vous gagnez vraiment
              </h2>
              <p className="text-muted-foreground text-lg">
                TEXERRA ne vend pas un simple numéro. TEXERRA vous donne les moyens d'être perçu différemment — dès le premier contact.
              </p>
            </motion.div>
            <motion.div {...fadeUp(0.2)} className="lg:w-1/2 flex justify-center lg:justify-end">
              <SatisfiedUserSvg />
            </motion.div>
          </div>

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

      {/* ── À qui s'adresse TEXERRA ── */}
      <section className="py-24 bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="mb-16 lg:flex lg:items-center lg:justify-between gap-16">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Pour qui ?</p>
              <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight">
                TEXERRA s'adresse à tout le monde
              </h2>
              <p className="text-muted-foreground text-lg max-w-md pb-2">
                Que vous ayez besoin d'un numéro pour votre image, pour vérifier un compte ou simplement pour un usage personnel — TEXERRA a ce qu'il vous faut.
              </p>
            </div>
            <div className="hidden lg:block lg:w-1/2">
              <DiverseUsesSvg />
            </div>
          </motion.div>

          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-6xl mx-auto"
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

      {/* ── Comment ça marche (Gardé intact) ── */}
      <section className="py-24 relative bg-secondary/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Simple & rapide</div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">Comment ça marche</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">Trois étapes. Moins de 60 secondes.</p>
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

      {/* ── Couverture mondiale (Gardé intact) ── */}
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

      {/* ── Expérience sans couture (Gardé intact) ── */}
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

      {/* ── Features strip (Gardé intact) ── */}
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

      {/* ── Vision de marque (Gardé intact) ── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div {...fadeUp(0)}>
            <div className="flex justify-center mb-8">
              <svg className="w-16 h-16 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
            </div>
            <blockquote className="text-2xl md:text-3xl font-bold text-foreground leading-snug mb-6">
              "Nous pensons que chaque entreprise mérite d'être perçue avec le même niveau de professionnalisme que les grandes entreprises internationales."
            </blockquote>
            <p className="text-muted-foreground text-base">
              C'est pourquoi TEXERRA existe — pour effacer les frontières perçues et donner à chaque entrepreneur la posture qu'il mérite, où qu'il soit.
            </p>
            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-xs uppercase tracking-widest text-primary font-bold">L'équipe TEXERRA SMS</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ (Totalement réécrite pour le SEO et l'usage) ── */}
      <section id="faq" className="py-24 bg-secondary/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Aide</div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground">Questions fréquentes</h2>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                {
                  q: "Qu’est-ce qu’un numéro virtuel ?",
                  a: "Un numéro virtuel est un numéro de téléphone qui n'est pas lié à une carte SIM physique. Il fonctionne entièrement via internet, vous permettant de recevoir des SMS de n'importe où dans le monde, directement sur notre plateforme Texerra SMS.",
                },
                {
                  q: "À quoi sert un numéro virtuel ?",
                  a: "Il sert principalement à protéger votre vie privée, à vérifier des comptes en ligne sans utiliser votre numéro personnel, et à donner une image internationale ou locale à votre entreprise selon le pays choisi.",
                },
                {
                  q: "Pourquoi utiliser un numéro virtuel ?",
                  a: "Utiliser un numéro virtuel avec Texerra SMS vous permet d'éviter les spams, de contourner les restrictions géographiques de certains services, et de gérer plusieurs comptes (comme WhatsApp Business) de manière simple et sécurisée.",
                },
                {
                  q: "Puis-je utiliser un numéro virtuel pour WhatsApp ?",
                  a: "Oui, absolument. Nos numéros virtuels sont parfaitement compatibles pour créer et vérifier des comptes WhatsApp ou WhatsApp Business. Vous recevrez le code de vérification SMS instantanément sur votre tableau de bord.",
                },
                {
                  q: "Puis-je recevoir des SMS de vérification ?",
                  a: "Oui, la réception de SMS de vérification (OTP) est la fonction principale de Texerra SMS. Nous supportons la majorité des services : réseaux sociaux, plateformes en ligne, applications de messagerie, etc.",
                },
                {
                  q: "Quels pays sont disponibles sur Texerra SMS ?",
                  a: "Nous proposons des numéros de plus de 205 pays. Que vous ayez besoin d'un numéro en Europe (France, UK), en Amérique (USA, Canada), ou en Afrique (RDC, Nigeria, Côte d'Ivoire), vous trouverez le pays adapté.",
                },
                {
                  q: "Comment acheter un numéro virtuel ?",
                  a: "C'est très simple : créez un compte gratuit, rechargez votre solde via le moyen de paiement de votre choix (Mobile Money, carte bancaire, etc.), sélectionnez le service désiré, et obtenez votre numéro.",
                },
                {
                  q: "Combien de temps faut-il pour obtenir un numéro ?",
                  a: "L'obtention du numéro est instantanée. Dès que vous confirmez votre choix, le numéro s'affiche sur votre écran. La réception du SMS de vérification prend ensuite généralement moins de 45 secondes.",
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
          </motion.div>

          {/* Bouton pour rediriger vers la page FAQ complète */}
          <motion.div {...fadeUp(0.2)} className="mt-12 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-border hover:border-primary/40 hover:bg-primary/[0.03] text-sm font-semibold rounded-2xl transition-all duration-200 shadow-sm"
            >
              Voir toutes les questions <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner (Gardé intact) ── */}
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
                Créez votre compte gratuitement. Votre premier numéro actif en moins de 60 secondes avec Texerra SMS.
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