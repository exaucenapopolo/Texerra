import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMeta } from "../lib/use-meta";
import { auth } from "../lib/firebase";
import {
  Wallet, Plus, ArrowRight, ArrowLeft, CheckCircle2, Clock, Loader2, ExternalLink,
  User, Mail, Phone, RefreshCw, XCircle, AlertCircle, Sparkles, Receipt,
  LayoutGrid, List, CreditCard, Smartphone, Shield, Lock, Check, Zap, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../lib/auth-context";
import { getCurrency, formatLocalAmount, TEXERRA_FX } from "../lib/currencies";

/* ────────────────────────────────────────────────────────────────── */
/* Constantes                                                         */
/* ────────────────────────────────────────────────────────────────── */

const MIN_AMOUNT = 1.65;
const PRESET_AMOUNTS = [2, 5, 10, 20];
const VIEW_STORAGE_KEY = "texerra:wallet:view";
const COUNTRY_STORAGE_PREFIX = "texerra:wallet:country:";
const PAYMENT_METHOD_STORAGE_PREFIX = "texerra:wallet:payment-method:";

type UiPaymentMethod = "mobile_money" | "visa" | "mastercard" | "paypal";
type CardBrand = "visa" | "mastercard" | "paypal";

const ALLOWED_COUNTRIES: { code: string; name: string; currency: string }[] = [
  { code: "CM", name: "Cameroun", currency: "XAF" },
  { code: "CG", name: "Congo-Brazzaville", currency: "XAF" },
  { code: "CD", name: "République démocratique du Congo", currency: "CDF" },
  { code: "SN", name: "Sénégal", currency: "XOF" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF" },
  { code: "GA", name: "Gabon", currency: "XAF" },
  { code: "NG", name: "Nigéria", currency: "NGN" },
  { code: "TG", name: "Togo", currency: "XOF" },
  { code: "BJ", name: "Bénin", currency: "XOF" },
  { code: "ML", name: "Mali", currency: "XOF" },
  { code: "NE", name: "Niger", currency: "XOF" },
  { code: "GH", name: "Ghana", currency: "GHS" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "UG", name: "Ouganda", currency: "UGX" },
  { code: "TZ", name: "Tanzanie", currency: "TZS" },
  { code: "ZM", name: "Zambie", currency: "ZMW" },
  { code: "RW", name: "Rwanda", currency: "RWF" },
  { code: "BF", name: "Burkina Faso", currency: "XOF" },
];

const UNIQUE_CURRENCY_TO_COUNTRY: Record<string, string> = {
  CDF: "CD",
  NGN: "NG",
  GHS: "GH",
  KES: "KE",
  UGX: "UG",
  TZS: "TZ",
  ZMW: "ZM",
  RWF: "RW",
};

/* ── Palette : chaque couleur reste dans SA famille, pas de mélange ── */
const BRAND = {
  /* Orange — Mobile Money */
  primary: "#C55A34",
  primaryDark: "#A84A28",
  primaryDeep: "#7C2D12",
  primaryLight: "#E8A47F",
  primarySoft: "#FBEEE7",

  /* Bleu — Cartes & PayPal */
  cool: "#2563EB",
  coolDark: "#1D4ED8",
  coolLight: "#93C5FD",
  coolSoft: "#EFF6FF",

  /* Teal — accents de confiance */
  teal: "#0D9488",
  tealSoft: "#CCFBF1",

  /* Neutres */
  ink: "#1F2937",
  inkMuted: "#6B7280",
  border: "#E7E2D9",
  bg: "#FAF7F2",
  bg2: "#F2EDE4",
};

/** Accent unique selon méthode : orange OU bleu, jamais mélangés */
function getAccent(method: UiPaymentMethod) {
  if (method === "mobile_money") {
    return {
      main: BRAND.primary,
      dark: BRAND.primaryDark,
      deep: BRAND.primaryDeep,
      light: BRAND.primaryLight,
      soft: BRAND.primarySoft,
    };
  }
  return {
    main: BRAND.cool,
    dark: BRAND.coolDark,
    deep: "#0F172A",
    light: BRAND.coolLight,
    soft: BRAND.coolSoft,
  };
}

function getMethodLabel(m: UiPaymentMethod): string {
  if (m === "mobile_money") return "Mobile Money";
  if (m === "visa") return "Visa";
  if (m === "mastercard") return "Mastercard";
  return "PayPal";
}

/* ────────────────────────────────────────────────────────────────── */
/* Types                                                              */
/* ────────────────────────────────────────────────────────────────── */

export interface Topup {
  id: string;
  amountEur: number | string;
  status: string;
  createdAt: string;
  provider?: string;
  method?: string;
  brand?: CardBrand;
}

interface UserProfile {
  name?: string;
  email?: string;
  phone?: string;
  balance: number;
  currency?: string;
}

/* ────────────────────────────────────────────────────────────────── */
/* Logos paiement — versions compactes (44×44) et carte (96×60)      */
/* ────────────────────────────────────────────────────────────────── */

function MobileMoneyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} fill="none" aria-hidden="true">
      <rect width="44" height="44" rx="10" fill={BRAND.primarySoft} />
      <rect x="14" y="10" width="16" height="24" rx="3.2" stroke={BRAND.primary} strokeWidth="1.8" fill="#fff" />
      <circle cx="22" cy="29" r="1.4" fill={BRAND.primary} />
      <rect x="17" y="14" width="10" height="10" rx="1.6" fill={BRAND.primary} opacity="0.14" />
      <path d="M26.5 8.5 q3.5 3.5 0 7" stroke={BRAND.primary} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M29.5 6.5 q5 5 0 11" stroke={BRAND.primary} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55" />
    </svg>
  );
}

/* VISA — carte complète */
function VisaLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 60" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="visaCardBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#F5F7FB" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="95" height="59" rx="8" fill="url(#visaCardBg)" stroke="#E3E8EF" />
      <text
        x="48" y="40" textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
        fontWeight="900" fontStyle="italic" fontSize="22" letterSpacing="1"
        fill="#1A1F71"
      >VISA</text>
    </svg>
  );
}

/* MASTERCARD */
function MastercardLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 60" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mcCardBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#F5F7FB" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="95" height="59" rx="8" fill="url(#mcCardBg)" stroke="#E3E8EF" />
      <circle cx="38" cy="30" r="13" fill="#EB001B" />
      <circle cx="58" cy="30" r="13" fill="#F79E1B" />
      <path d="M48 20 a13 13 0 0 1 0 20 a13 13 0 0 1 0 -20" fill="#FF5F00" />
    </svg>
  );
}

/* PAYPAL */
function PaypalLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 60" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ppCardBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#F5F7FB" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="95" height="59" rx="8" fill="url(#ppCardBg)" stroke="#E3E8EF" />
      <path d="M36 15 h13 c7 0 11 3.5 10 9.5 c-1 6.5 -6 10 -13 10 h-4.5 l-1.6 10 h-7.4 z" fill="#009CDE" opacity="0.9" />
      <path d="M42 12 h13 c7 0 11 3.5 10 9.5 c-1 6.5 -6 10 -13 10 h-4.5 l-1.6 10 h-7.4 z" fill="#003087" />
      <text x="66" y="40"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
        fontWeight="900" fontStyle="italic" fontSize="13" fill="#003087">Pal</text>
    </svg>
  );
}

/* VISA — compacte (historique) */
function VisaIconCompact({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} fill="none" aria-hidden="true">
      <rect width="44" height="44" rx="11" fill="#EEF2FF" />
      <text x="22" y="28" textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="900" fontStyle="italic" fontSize="11.5" letterSpacing="0.3"
        fill="#1A1F71">VISA</text>
    </svg>
  );
}

/* MASTERCARD — compacte */
function MastercardIconCompact({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} fill="none" aria-hidden="true">
      <rect width="44" height="44" rx="11" fill="#FFF7ED" />
      <circle cx="17" cy="22" r="7.5" fill="#EB001B" />
      <circle cx="27" cy="22" r="7.5" fill="#F79E1B" />
      <path d="M22 16.2 a7.5 7.5 0 0 1 0 11.6 a7.5 7.5 0 0 1 0 -11.6" fill="#FF5F00" />
    </svg>
  );
}

/* PAYPAL — compacte */
function PaypalIconCompact({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} fill="none" aria-hidden="true">
      <rect width="44" height="44" rx="11" fill="#F0F7FF" />
      <path d="M17 13 h6.5 c3.5 0 5.5 1.8 5 5 c-0.5 3.2 -3 5 -6.5 5 h-2.2 l-0.8 5 h-3.7 z" fill="#009CDE" opacity="0.9" />
      <path d="M20 11 h6.5 c3.5 0 5.5 1.8 5 5 c-0.5 3.2 -3 5 -6.5 5 h-2.2 l-0.8 5 h-3.7 z" fill="#003087" />
    </svg>
  );
}

/** Renvoie le bon logo compact pour un topup */
function PaymentMethodIcon({ topup, className = "" }: { topup: Topup; className?: string }) {
  if (topup.brand === "visa") return <VisaIconCompact className={className} />;
  if (topup.brand === "mastercard") return <MastercardIconCompact className={className} />;
  if (topup.brand === "paypal") return <PaypalIconCompact className={className} />;
  if (topup.method === "card") {
    /* Fallback : ancien topup carte sans brand → icône générique bleue */
    return (
      <div
        className={`${className} rounded-[11px] flex items-center justify-center`}
        style={{ background: BRAND.coolSoft }}
      >
        <CreditCard className="w-5 h-5" style={{ color: BRAND.cool }} />
      </div>
    );
  }
  return <MobileMoneyIcon className={className} />;
}

/* ────────────────────────────────────────────────────────────────── */
/* Chip SVG (puce EMV, pour la carte solde)                          */
/* ────────────────────────────────────────────────────────────────── */

function ChipSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 42 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="chipGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="0.5" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="42" height="32" rx="5" fill="url(#chipGold)" />
      <path
        d="M0 11 H42 M0 21 H42 M14 0 V32 M28 0 V32"
        stroke="#78350F"
        strokeWidth="0.7"
        opacity="0.55"
      />
      <rect x="15" y="11" width="12" height="10" rx="2" fill="#FCD34D" opacity="0.55" />
      <rect
        x="0.5" y="0.5" width="41" height="31" rx="4.5"
        stroke="#78350F" strokeOpacity="0.35" fill="none"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Slot temporel                                                      */
/* ────────────────────────────────────────────────────────────────── */

type TimeSlot = "night" | "morning" | "afternoon" | "evening";

function getTimeSlot(): TimeSlot {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return "night";
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

/* ────────────────────────────────────────────────────────────────── */
/* Arrière-plan                                                       */
/* ────────────────────────────────────────────────────────────────── */

function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -top-32 -left-24 w-[460px] h-[460px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${BRAND.primary}26, transparent 70%)` }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, 60, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/4 -right-32 w-[420px] h-[420px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${BRAND.cool}26, transparent 70%)` }}
        animate={{ x: [0, -30, 20, 0], y: [0, 40, -20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute bottom-0 left-1/4 w-[340px] h-[340px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${BRAND.teal}22, transparent 70%)` }}
        animate={{ x: [0, 25, -15, 0], y: [0, -20, 20, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Compteur animé                                                     */
/* ────────────────────────────────────────────────────────────────── */

function AnimatedNumber({ value, decimals = 2, duration = 900 }: { value: number; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf = 0;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(next);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{display.toFixed(decimals)}</>;
}

/* ────────────────────────────────────────────────────────────────── */
/* Confettis                                                          */
/* ────────────────────────────────────────────────────────────────── */

function Confetti() {
  const pieces = Array.from({ length: 30 });
  const colors = [BRAND.primary, BRAND.primaryLight, BRAND.cool, BRAND.coolLight, "#FCD34D", "#86EFAC", "#F472B6"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 8) * 0.12;
        const color = colors[i % colors.length];
        const rotate = (i * 47) % 360;
        return (
          <motion.span
            key={i}
            className="absolute top-0 block w-2 h-3 rounded-sm"
            style={{ left: `${left}%`, background: color }}
            initial={{ y: -20, opacity: 0, rotate: 0 }}
            animate={{ y: [-20, 260], opacity: [0, 1, 1, 0], rotate: rotate + 360 }}
            transition={{ duration: 2.4, delay, ease: "easeOut", repeat: Infinity, repeatDelay: 1.2 }}
          />
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Barre d'étapes                                                     */
/* ────────────────────────────────────────────────────────────────── */

function StepBar({
  step,
  accent,
}: {
  step: "select" | "details" | "pending" | "success" | "failed";
  accent: { main: string; light: string };
}) {
  const steps = [
    { key: "select", label: "Montant" },
    { key: "details", label: "Coordonnées" },
    { key: "pending", label: "Paiement" },
    { key: "success", label: "Terminé" },
  ] as const;

  const activeIndex =
    step === "select" ? 0 :
    step === "details" ? 1 :
    step === "pending" ? 2 :
    step === "success" ? 3 :
    1;

  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-6 px-1">
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: done || active ? accent.main : BRAND.border,
                  scale: active ? 1.1 : 1,
                  boxShadow: active ? `0 0 0 4px ${accent.main}22` : "0 0 0 0px transparent",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0"
                style={{ color: done || active ? "#fff" : "#9ca3af" }}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </motion.div>
              <span
                className={`text-[10px] sm:text-xs font-bold truncate ${
                  active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground/70"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="relative flex-1 mx-1 sm:mx-2 h-[2px] rounded-full overflow-hidden"
                style={{ background: BRAND.border }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${accent.main}, ${accent.light})` }}
                  initial={false}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Bouton de marque (Visa / MC / PayPal)                             */
/* ────────────────────────────────────────────────────────────────── */

function PaymentBrandButton({
  selected,
  onSelect,
  logo,
  label,
  index,
}: {
  selected: boolean;
  onSelect: () => void;
  logo: React.ReactNode;
  label: string;
  index: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.06, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.96 }}
      className="relative p-2 rounded-2xl transition-colors overflow-hidden group"
      style={{
        background: selected ? BRAND.coolSoft : "#ffffff",
        border: selected ? `2px solid ${BRAND.cool}` : `1px solid ${BRAND.border}`,
        boxShadow: selected ? `0 10px 28px ${BRAND.cool}33` : "0 1px 2px rgba(15,23,42,0.04)",
      }}
      aria-pressed={selected}
      aria-label={label}
    >
      {selected && (
        <motion.span
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ border: `2px solid ${BRAND.coolLight}` }}
          animate={{ opacity: [0.85, 0, 0.85], scale: [1, 1.03, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      )}

      <div className="relative flex items-center justify-center">
        {logo}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
            style={{ background: BRAND.cool }}
          >
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>

      <motion.span
        className="absolute inset-0 -translate-x-full pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
        }}
        initial={{ translateX: "-120%" }}
        whileHover={{ translateX: "120%" }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </motion.button>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Illustrations SVG (inchangées)                                    */
/* ────────────────────────────────────────────────────────────────── */

function PiggyBankSVG() {
  return (
    <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <radialGradient id="pgSky" cx="0.5" cy="0.4" r="0.75">
            <stop offset="0" stopColor="#fef3c7" />
            <stop offset="1" stopColor="#fcd34d" />
          </radialGradient>
          <linearGradient id="pgCat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
          <linearGradient id="pgPig" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbcfe8" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient id="pgCoin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fde047" />
            <stop offset="1" stopColor="#ca8a04" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes pgCoinDrop {
            0% { transform: translateY(-22px); opacity: 0; }
            15% { opacity: 1; }
            70% { transform: translateY(0); opacity: 1; }
            78% { transform: translateY(2px) scale(0.9); opacity: 0; }
            100% { opacity: 0; }
          }
          @keyframes pgTail { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-9deg); } }
          @keyframes pgBlink { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(0.15); } }
          @keyframes pgGlow { 0%,100% { opacity: 0.5; } 50% { opacity: 0.9; } }
          .pgCoin { animation: pgCoinDrop 2s ease-in infinite; }
          .pgTail { animation: pgTail 2.2s ease-in-out infinite; transform-origin: 32px 92px; }
          .pgBlink { animation: pgBlink 4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
          .pgGlow { animation: pgGlow 3s ease-in-out infinite; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#pgSky)" />
        <circle cx="98" cy="22" r="10" fill="#fef9c3" opacity="0.85" className="pgGlow" />
        <ellipse cx="60" cy="102" rx="46" ry="6" fill="#78350f" opacity="0.2" />
        <g>
          <ellipse cx="84" cy="88" rx="17" ry="13" fill="url(#pgPig)" />
          <circle cx="80" cy="84" r="1.3" fill="#1f2937" />
          <ellipse cx="98" cy="88" rx="3.5" ry="4" fill="#fbcfe8" />
          <circle cx="98" cy="87" r="0.9" fill="#831843" />
          <circle cx="98" cy="90" r="0.9" fill="#831843" />
          <path d="M76 80 L73 74 L81 78 Z" fill="#db2777" />
          <path d="M90 80 L93 74 L85 78 Z" fill="#db2777" />
          <rect x="78" y="76" width="10" height="2" rx="1" fill="#831843" opacity="0.65" />
          <rect x="74" y="98" width="4" height="5" rx="1" fill="#db2777" />
          <rect x="90" y="98" width="4" height="5" rx="1" fill="#db2777" />
        </g>
        <g className="pgCoin">
          <circle cx="83" cy="60" r="6" fill="url(#pgCoin)" stroke="#a16207" strokeWidth="0.6" />
          <text x="83" y="63" textAnchor="middle" fontSize="7" fontWeight="900" fill="#78350f" fontFamily="system-ui">€</text>
        </g>
        <g>
          <path className="pgTail" d="M32 92 Q22 88 22 80" stroke="url(#pgCat)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M28 94 Q26 78 40 72 Q54 70 56 86 Q58 94 56 98 L28 98 Z" fill="url(#pgCat)" />
          <ellipse cx="52" cy="96" rx="7" ry="3.2" fill="url(#pgCat)" />
          <rect x="30" y="90" width="4" height="8" rx="2" fill="url(#pgCat)" />
          <rect x="38" y="90" width="4" height="8" rx="2" fill="url(#pgCat)" />
          <ellipse cx="36" cy="58" rx="14" ry="13" fill="url(#pgCat)" />
          <path d="M24 48 L22 40 L32 46 Z" fill="url(#pgCat)" />
          <path d="M46 48 L52 40 L48 52 Z" fill="url(#pgCat)" />
          <ellipse className="pgBlink" cx="30" cy="58" rx="2" ry="2.5" fill="#1f2937" />
          <ellipse className="pgBlink" cx="42" cy="58" rx="2" ry="2.5" fill="#1f2937" />
          <circle cx="30.5" cy="57.5" r="0.6" fill="#ffffff" />
          <circle cx="42.5" cy="57.5" r="0.6" fill="#ffffff" />
          <path d="M36 64 L35 66 L37 66 Z" fill="#d98848" />
          <path d="M36 66 Q33 68 31 67" stroke="#3a2417" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M36 66 Q39 68 41 67" stroke="#3a2417" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <ellipse cx="26" cy="64" rx="2.5" ry="1.5" fill="#fb923c" opacity="0.5" />
          <ellipse cx="46" cy="64" rx="2.5" ry="1.5" fill="#fb923c" opacity="0.5" />
          <path d="M24 62 L16 60" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M24 64 L16 65" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M48 62 L56 60" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M48 64 L56 65" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M52 76 Q62 70 76 64" stroke="url(#pgCat)" strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="76" cy="64" rx="3" ry="2.5" fill="url(#pgCat)" />
        </g>
      </svg>
    </div>
  );
}

function WalletCoinsSVG() {
  return (
    <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <linearGradient id="wcSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#93c5fd" />
            <stop offset="1" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id="wcCat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
          <linearGradient id="wcWallet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c2410c" />
            <stop offset="1" stopColor="#7c2d12" />
          </linearGradient>
          <linearGradient id="wcCoin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fde047" />
            <stop offset="1" stopColor="#ca8a04" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes wcFloat1 { 0%,100% { transform: translate(0,0); opacity:.9; } 50% { transform: translate(-3px,-5px); opacity:1; } }
          @keyframes wcFloat2 { 0%,100% { transform: translate(0,0); opacity:.85; } 50% { transform: translate(2px,-6px); opacity:1; } }
          @keyframes wcFloat3 { 0%,100% { transform: translate(0,0); opacity:.8; } 50% { transform: translate(-2px,-4px); opacity:1; } }
          @keyframes wcTailIdle { 0%,100% { transform: rotate(0); } 40% { transform: rotate(-9deg); } 70% { transform: rotate(5deg); } }
          @keyframes wcBlink { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(0.15); } }
          @keyframes wcCloud { 0% { transform: translateX(0); } 100% { transform: translateX(14px); } }
          .wcC1 { animation: wcFloat1 2.2s ease-in-out infinite; }
          .wcC2 { animation: wcFloat2 2.6s ease-in-out infinite; }
          .wcC3 { animation: wcFloat3 2.4s ease-in-out infinite; }
          .wcTail { animation: wcTailIdle 2.5s ease-in-out infinite; transform-origin: 32px 92px; }
          .wcBlink { animation: wcBlink 4.5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
          .wcCloud { animation: wcCloud 7s ease-in-out infinite alternate; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#wcSky)" />
        <g className="wcCloud" opacity="0.9">
          <ellipse cx="26" cy="26" rx="12" ry="5" fill="#ffffff" />
          <ellipse cx="34" cy="24" rx="9" ry="6" fill="#ffffff" />
          <ellipse cx="20" cy="25" rx="7" ry="4.5" fill="#ffffff" />
        </g>
        <ellipse cx="60" cy="102" rx="46" ry="6" fill="#1e40af" opacity="0.18" />
        <g>
          <path d="M70 78 L104 78 Q108 78 108 82 L108 96 Q108 100 104 100 L70 100 Q66 100 66 96 L66 82 Q66 78 70 78 Z" fill="url(#wcWallet)" />
          <path d="M70 78 L104 78 Q108 78 108 82 L108 86 L66 86 L66 82 Q66 78 70 78 Z" fill="#9a3412" opacity="0.85" />
          <path d="M100 86 L108 86 L108 94 L100 94 Z" fill="#fed7aa" opacity="0.35" />
          <circle cx="103" cy="90" r="1.8" fill="#fbbf24" />
          <path d="M72 78 L78 70 L102 70 L104 78 Z" fill="#86efac" stroke="#16a34a" strokeWidth="0.4" />
          <path d="M74 78 L80 72 L98 72 L100 78 Z" fill="#4ade80" opacity="0.9" />
        </g>
        <g className="wcC1">
          <circle cx="58" cy="62" r="5.5" fill="url(#wcCoin)" stroke="#a16207" strokeWidth="0.5" />
          <text x="58" y="65" textAnchor="middle" fontSize="6" fontWeight="900" fill="#78350f">€</text>
        </g>
        <g className="wcC2">
          <circle cx="70" cy="54" r="4.5" fill="url(#wcCoin)" stroke="#a16207" strokeWidth="0.5" />
          <text x="70" y="57" textAnchor="middle" fontSize="5" fontWeight="900" fill="#78350f">€</text>
        </g>
        <g className="wcC3">
          <circle cx="80" cy="66" r="5" fill="url(#wcCoin)" stroke="#a16207" strokeWidth="0.5" />
          <text x="80" y="69" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#78350f">€</text>
        </g>
        <g>
          <path className="wcTail" d="M32 92 Q22 88 22 80" stroke="url(#wcCat)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M28 94 Q26 78 40 72 Q52 70 54 86 Q56 94 54 98 L28 98 Z" fill="url(#wcCat)" />
          <ellipse cx="50" cy="96" rx="6" ry="3" fill="url(#wcCat)" />
          <rect x="30" y="90" width="4" height="8" rx="2" fill="url(#wcCat)" />
          <rect x="38" y="90" width="4" height="8" rx="2" fill="url(#wcCat)" />
          <ellipse cx="34" cy="56" rx="14" ry="13" fill="url(#wcCat)" />
          <path d="M22 46 L20 38 L30 44 Z" fill="url(#wcCat)" />
          <path d="M44 46 L50 38 L46 50 Z" fill="url(#wcCat)" />
          <ellipse className="wcBlink" cx="28" cy="56" rx="2.2" ry="2.7" fill="#1f2937" />
          <ellipse className="wcBlink" cx="40" cy="56" rx="2.2" ry="2.7" fill="#1f2937" />
          <circle cx="28.6" cy="55.4" r="0.6" fill="#ffffff" />
          <circle cx="40.6" cy="55.4" r="0.6" fill="#ffffff" />
          <path d="M34 62 L33 64 L35 64 Z" fill="#d98848" />
          <path d="M34 64 Q31 66 29 65" stroke="#3a2417" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M34 64 Q37 66 39 65" stroke="#3a2417" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <ellipse cx="24" cy="62" rx="2.5" ry="1.5" fill="#fb923c" opacity="0.5" />
          <ellipse cx="44" cy="62" rx="2.5" ry="1.5" fill="#fb923c" opacity="0.5" />
          <path d="M22 60 L14 58" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M22 62 L14 63" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M46 60 L54 58" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M46 62 L54 63" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function CoinStackSVG() {
  return (
    <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <linearGradient id="csSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fb923c" />
            <stop offset="0.55" stopColor="#f472b6" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="csCat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
          <linearGradient id="csCoin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fde047" />
            <stop offset="1" stopColor="#ca8a04" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes csTailSway { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-6deg); } }
          @keyframes csHeadNod { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
          @keyframes csStar { 0%,100% { opacity: 0; } 40%,60% { opacity: .95; } }
          @keyframes csShine { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
          .csTail { animation: csTailSway 3s ease-in-out infinite; transform-origin: 32px 92px; }
          .csHead { animation: csHeadNod 3s ease-in-out infinite; }
          .csStar { animation: csStar 5s ease-in-out infinite; }
          .csShine { animation: csShine 2.5s ease-in-out infinite; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#csSky)" />
        <circle className="csStar" cx="22" cy="20" r="1.2" fill="#ffffff" />
        <circle className="csStar" cx="100" cy="28" r="1" fill="#ffffff" style={{ animationDelay: "1.5s" }} />
        <circle cx="60" cy="78" r="20" fill="#fcd34d" opacity="0.85" />
        <ellipse cx="60" cy="102" rx="46" ry="7" fill="#4c1d95" opacity="0.35" />
        <g>
          <ellipse cx="82" cy="98" rx="12" ry="2.5" fill="#a16207" opacity="0.6" />
          <ellipse cx="82" cy="96" rx="11" ry="4" fill="url(#csCoin)" stroke="#a16207" strokeWidth="0.5" />
          <ellipse cx="82" cy="92" rx="11" ry="4" fill="url(#csCoin)" stroke="#a16207" strokeWidth="0.5" />
          <ellipse cx="82" cy="88" rx="11" ry="4" fill="url(#csCoin)" stroke="#a16207" strokeWidth="0.5" />
          <ellipse cx="82" cy="84" rx="11" ry="4" fill="#fde047" stroke="#a16207" strokeWidth="0.5" />
          <text x="82" y="87" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#78350f">€</text>
          <path className="csShine" d="M82 76 L80 72 L82 68 L84 72 Z" fill="#fef9c3" />
        </g>
        <g>
          <path className="csTail" d="M32 92 Q22 88 22 80" stroke="url(#csCat)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M28 94 Q26 78 40 72 Q52 70 54 86 Q56 94 54 98 L28 98 Z" fill="url(#csCat)" />
          <ellipse cx="50" cy="96" rx="6" ry="3" fill="url(#csCat)" />
          <rect x="30" y="90" width="4" height="8" rx="2" fill="url(#csCat)" />
          <rect x="38" y="90" width="4" height="8" rx="2" fill="url(#csCat)" />
          <g className="csHead">
            <ellipse cx="34" cy="56" rx="14" ry="13" fill="url(#csCat)" />
            <path d="M22 46 L20 38 L30 44 Z" fill="url(#csCat)" />
            <path d="M44 46 L50 38 L46 50 Z" fill="url(#csCat)" />
            <path d="M25 56 Q28 58 31 56" stroke="#1f2937" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M37 56 Q40 58 43 56" stroke="#1f2937" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M34 62 L33 64 L35 64 Z" fill="#d98848" />
            <path d="M34 64 Q31 66 29 65" stroke="#3a2417" strokeWidth="0.9" fill="none" strokeLinecap="round" />
            <path d="M34 64 Q37 66 39 65" stroke="#3a2417" strokeWidth="0.9" fill="none" strokeLinecap="round" />
            <ellipse cx="24" cy="62" rx="2.5" ry="1.5" fill="#fb923c" opacity="0.55" />
            <ellipse cx="44" cy="62" rx="2.5" ry="1.5" fill="#fb923c" opacity="0.55" />
            <path d="M22 60 L14 58" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
            <path d="M22 62 L14 63" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
            <path d="M46 60 L54 58" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
            <path d="M46 62 L54 63" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function MoneyBagSleepSVG() {
  return (
    <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <radialGradient id="mbSky" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0" stopColor="#2d3f72" />
            <stop offset="1" stopColor="#1a2547" />
          </radialGradient>
          <linearGradient id="mbCat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
          <linearGradient id="mbBag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a16207" />
            <stop offset="1" stopColor="#78350f" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes mbBreathe { 0%,100% { transform: scale(1) translateY(0); } 50% { transform: scale(1.02,1.015) translateY(-1px); } }
          @keyframes mbZ1 { 0% { opacity:0; transform: translate(0,0) scale(.5); } 25% { opacity:1; transform: translate(4px,-14px) scale(.8); } 100% { opacity:0; transform: translate(10px,-34px) scale(1.1); } }
          @keyframes mbZ2 { 0% { opacity:0; transform: translate(0,0) scale(.5); } 25% { opacity:1; transform: translate(6px,-16px) scale(.9); } 100% { opacity:0; transform: translate(14px,-38px) scale(1.2); } }
          @keyframes mbZ3 { 0% { opacity:0; transform: translate(0,0) scale(.6); } 25% { opacity:1; transform: translate(8px,-18px) scale(1); } 100% { opacity:0; transform: translate(18px,-42px) scale(1.35); } }
          @keyframes mbTwinkle { 0%,100% { opacity:.25; } 50% { opacity:1; } }
          @keyframes mbMoon { 0%,100% { opacity:.7; } 50% { opacity:1; } }
          .mbBody { animation: mbBreathe 3.4s ease-in-out infinite; transform-origin: 60px 82px; }
          .mbZ1 { animation: mbZ1 3s ease-out infinite; }
          .mbZ2 { animation: mbZ2 3s ease-out infinite .9s; }
          .mbZ3 { animation: mbZ3 3s ease-out infinite 1.8s; }
          .mbStarA { animation: mbTwinkle 2.2s ease-in-out infinite; }
          .mbStarB { animation: mbTwinkle 2.2s ease-in-out infinite .8s; }
          .mbStarC { animation: mbTwinkle 2.2s ease-in-out infinite 1.5s; }
          .mbMoon { animation: mbMoon 4s ease-in-out infinite; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#mbSky)" />
        <circle className="mbStarA" cx="24" cy="26" r="1.2" fill="#fef3c7" />
        <circle className="mbStarB" cx="94" cy="22" r="1.5" fill="#fef3c7" />
        <circle className="mbStarC" cx="100" cy="54" r="1" fill="#fef3c7" />
        <circle className="mbStarA" cx="16" cy="52" r="0.9" fill="#fef3c7" />
        <circle className="mbStarB" cx="82" cy="14" r="1" fill="#fef3c7" />
        <g className="mbMoon">
          <circle cx="96" cy="32" r="8" fill="#fef3c7" />
          <circle cx="99" cy="29" r="7" fill="#1a2547" />
        </g>
        <ellipse cx="60" cy="100" rx="42" ry="7" fill="#0f1833" opacity="0.75" />
        <g>
          <path d="M30 88 Q26 78 34 74 L86 74 Q94 78 90 88 Q90 98 60 100 Q30 98 30 88 Z" fill="url(#mbBag)" />
          <path d="M42 74 Q52 70 60 70 Q68 70 78 74" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M46 72 Q54 68 60 68 Q66 68 74 72" stroke="#fbbf24" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="86" r="7" fill="#fbbf24" opacity="0.9" />
          <text x="60" y="90" textAnchor="middle" fontSize="11" fontWeight="900" fill="#78350f" fontFamily="system-ui">€</text>
        </g>
        <g className="mbBody">
          <ellipse cx="58" cy="72" rx="26" ry="12" fill="url(#mbCat)" />
          <path d="M42 68 Q46 72 42 76" stroke="#c9723a" strokeWidth="1.2" fill="none" opacity="0.55" strokeLinecap="round" />
          <path d="M50 66 Q54 72 50 78" stroke="#c9723a" strokeWidth="1.2" fill="none" opacity="0.55" strokeLinecap="round" />
          <path d="M82 74 Q92 70 94 78 Q92 82 88 80" stroke="url(#mbCat)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="38" cy="70" rx="13" ry="11" fill="url(#mbCat)" />
          <path d="M29 60 L27 53 L35 58 Z" fill="url(#mbCat)" />
          <path d="M46 60 L52 53 L48 62 Z" fill="url(#mbCat)" />
          <path d="M32 70 Q34 72 36 70" stroke="#3a2417" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M40 70 Q42 72 44 70" stroke="#3a2417" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M38 74 L37 76 L39 76 Z" fill="#d98848" />
          <ellipse cx="30" cy="75" rx="2.5" ry="1.5" fill="#f4a76b" opacity="0.6" />
          <ellipse cx="46" cy="75" rx="2.5" ry="1.5" fill="#f4a76b" opacity="0.6" />
          <path d="M26 73 L18 71" stroke="#3a2417" strokeWidth="0.7" opacity="0.55" strokeLinecap="round" />
          <path d="M26 75 L18 76" stroke="#3a2417" strokeWidth="0.7" opacity="0.55" strokeLinecap="round" />
        </g>
        <g fontFamily="ui-rounded, system-ui" fontWeight="900" fill="#fbbf24">
          <text className="mbZ1" x="72" y="54" fontSize="11">Z</text>
          <text className="mbZ2" x="78" y="52" fontSize="13">Z</text>
          <text className="mbZ3" x="86" y="50" fontSize="15">Z</text>
        </g>
      </svg>
    </div>
  );
}

function MoneyIllustration({ slot }: { slot: TimeSlot }) {
  if (slot === "night") return <MoneyBagSleepSVG />;
  if (slot === "morning") return <PiggyBankSVG />;
  if (slot === "afternoon") return <WalletCoinsSVG />;
  return <CoinStackSVG />;
}

/* ────────────────────────────────────────────────────────────────── */
/* Item d'historique                                                  */
/* ────────────────────────────────────────────────────────────────── */

function TopupHistoryItem({
  topup,
  onCredited,
  currency,
  view,
}: {
  topup: Topup;
  onCredited: () => void;
  currency?: string | null;
  view: "list" | "grid";
}) {
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ type: "info" | "error"; text: string } | null>(null);

  const handleVerify = async () => {
    if (checking) return;
    setChecking(true);
    setMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken(true).catch(() => null);
      if (!token) {
        setMsg({ type: "error", text: "Session expirée. Reconnectez-vous." });
        return;
      }
      const res = await fetch(`/api/topups/${topup.id}/status?force=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setMsg({ type: "error", text: err.error ?? `Erreur serveur (${res.status}).` });
        return;
      }
      const data = await res.json() as { status: string; _justCredited?: boolean };
      if (data.status === "completed" || data.status === "failed") {
        onCredited();
      } else {
        setMsg({ type: "info", text: "Paiement pas encore confirmé. Réessayez dans 1–2 min." });
      }
    } catch {
      setMsg({ type: "error", text: "Erreur réseau. Réessayez." });
    } finally {
      setChecking(false);
    }
  };

  const date = new Date(topup.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
  const time = new Date(topup.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });

  const statusCfg = {
    pending:   { label: "En attente", grad: "linear-gradient(135deg, #FEF3C7, #FDE68A)", border: "#FCD34D", text: "#92400E", dot: "#F59E0B" },
    completed: { label: "Crédité",    grad: "linear-gradient(135deg, #DCFCE7, #BBF7D0)", border: "#86EFAC", text: "#166534", dot: "#16A34A" },
    failed:    { label: "Échoué",     grad: "linear-gradient(135deg, #FEE2E2, #FECACA)", border: "#FCA5A5", text: "#991B1B", dot: "#DC2626" },
  };
  const cfg = statusCfg[topup.status as keyof typeof statusCfg] ?? statusCfg.pending;

  const amount = parseFloat(String(topup.amountEur));
  const localAmount = currency && currency !== "EUR" ? formatLocalAmount(amount, currency) : null;

  /* Couleur de l'accent selon le moyen de paiement (orange / bleu uniquement) */
  const isCard = topup.method === "card";
  const accentColor = isCard ? BRAND.cool : BRAND.primary;
  const accentDark = isCard ? BRAND.coolDark : BRAND.primaryDark;

  const methodLabel =
    topup.brand === "visa" ? "Visa"
    : topup.brand === "mastercard" ? "Mastercard"
    : topup.brand === "paypal" ? "PayPal"
    : isCard ? "Carte bancaire"
    : "Mobile Money";

  if (view === "grid") {
    return (
      <div className="flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between gap-3">
          <PaymentMethodIcon topup={topup} className="w-11 h-11 shrink-0" />
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
            style={{ background: cfg.grad, border: `1px solid ${cfg.border}`, color: cfg.text }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
            {cfg.label}
          </span>
        </div>

        <div>
          <div className="font-bold text-foreground text-lg leading-tight">
            +{amount.toFixed(2)} €
          </div>
          {localAmount && (
            <div className="text-xs font-semibold mt-0.5" style={{ color: accentDark }}>
              ≈ {localAmount}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: accentColor }}>
          {methodLabel}
        </div>

        <div className="text-[11px] text-muted-foreground mt-auto">
          {date} · {time}
        </div>

        {topup.status === "pending" && (
          <button
            onClick={handleVerify}
            disabled={checking}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl text-white disabled:opacity-60 transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentDark})` }}
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {checking ? "Vérification…" : "Vérifier"}
          </button>
        )}

        {msg && (
          <div className={`flex items-start gap-2 text-[11px] px-2.5 py-2 rounded-lg ${
            msg.type === "error"
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-blue-50 border border-blue-200 text-blue-700"
          }`}>
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{msg.text}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PaymentMethodIcon topup={topup} className="w-11 h-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-bold text-foreground text-base">
                +{amount.toFixed(2)} €
              </span>
              {localAmount && (
                <span className="text-xs font-semibold" style={{ color: accentDark }}>
                  ≈ {localAmount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold" style={{ color: accentColor }}>{methodLabel}</span>
              <span className="opacity-40">·</span>
              <span>{date} · {time}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end shrink-0">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: cfg.grad, border: `1px solid ${cfg.border}`, color: cfg.text }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
            {cfg.label}
          </span>
          {topup.status === "pending" && (
            <button
              onClick={handleVerify}
              disabled={checking}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-60 transition-all active:scale-95 whitespace-nowrap"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentDark})` }}
              title="Vérifier si ce paiement a été confirmé"
            >
              {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {checking ? "Vérif…" : "Vérifier"}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
              msg.type === "error"
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-blue-50 border border-blue-200 text-blue-700"
            }`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {msg.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Page principale                                                    */
/* ────────────────────────────────────────────────────────────────── */

export default function WalletPage() {
  useMeta({
    title: "Portefeuille — Rechargez votre solde Texerra",
    description: "Rechargez votre solde Texerra par Mobile Money, Visa, Mastercard ou PayPal. Paiement rapide et sécurisé depuis toute l'Afrique.",
    canonical: "https://texerra.site/wallet",
    noindex: true,
  });

  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: me, isLoading: loadingMe } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur chargement profil");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: topups, isLoading: loadingTopups } = useQuery<Topup[]>({
    queryKey: ["/api/topups"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/topups", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur chargement recharges");
      return res.json();
    },
    enabled: !!user,
  });

  const initiateTopupMutation = useMutation({
    mutationFn: async (data: {
      amountEur: number;
      name: string;
      email: string;
      mobile: string;
      countryIso: string;
      paymentMethod: "mobile_money" | "card";
      brand?: CardBrand;
    }) => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/topups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || "Erreur initialisation paiement");
      }
      return res.json() as Promise<{ checkoutUrl: string; topupId: string; provider: string }>;
    },
  });

  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [pendingTopupId, setPendingTopupId] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  const [step, setStep] = useState<"select" | "details" | "pending" | "success" | "failed">("select");
  const [forceChecking, setForceChecking] = useState(false);
  const [forceCheckMsg, setForceCheckMsg] = useState<{ type: "info" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", mobile: "" });

  /* ── Clé utilisateur (pour préférences persistantes) ── */
  const userKey = user?.uid || user?.email || me?.email || "guest";
  const methodStorageKey = `${PAYMENT_METHOD_STORAGE_PREFIX}${userKey}`;

  /* ── Méthode UI, persistée PAR utilisateur ── */
  const [paymentMethod, setPaymentMethod] = useState<UiPaymentMethod>(() => {
    // On lit une clé globale d'abord (migration), puis par utilisateur
    const globalSaved = localStorage.getItem("texerra:wallet:payment-method");
    const saved = globalSaved;
    if (saved === "mobile_money" || saved === "visa" || saved === "mastercard" || saved === "paypal") {
      return saved;
    }
    if (saved === "card") return "visa";
    return "mobile_money";
  });

  /* Quand userKey devient dispo, on charge la préférence par utilisateur */
  const loadedMethodForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userKey || userKey === "guest") return;
    if (loadedMethodForRef.current === userKey) return;
    try {
      const saved = localStorage.getItem(methodStorageKey);
      if (saved === "mobile_money" || saved === "visa" || saved === "mastercard" || saved === "paypal") {
        setPaymentMethod(saved);
      } else if (saved === "card") {
        setPaymentMethod("visa");
      }
    } catch { /* ignore */ }
    loadedMethodForRef.current = userKey;
  }, [userKey, methodStorageKey]);

  /* On persiste à chaque changement */
  useEffect(() => {
    if (!userKey || userKey === "guest") {
      // Fallback global pour visiteurs
      try { localStorage.setItem("texerra:wallet:payment-method", paymentMethod); } catch {}
      return;
    }
    try { localStorage.setItem(methodStorageKey, paymentMethod); } catch {}
  }, [paymentMethod, userKey, methodStorageKey]);

  const accent = getAccent(paymentMethod);
  const isCardMethod = paymentMethod !== "mobile_money";

  /* ── Dernier moyen utilisé (depuis l'historique) ── */
  const lastUsedMethod = useMemo<UiPaymentMethod | null>(() => {
    const latest = (topups ?? [])[0];
    if (!latest) return null;
    if (latest.brand === "visa" || latest.brand === "mastercard" || latest.brand === "paypal") {
      return latest.brand;
    }
    if (latest.method === "card") return "visa";
    if (latest.method === "mobile_money") return "mobile_money";
    return null;
  }, [topups]);

  /* Vue liste / grille */
  const [view, setView] = useState<"list" | "grid">(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === "grid" ? "grid" : "list";
  });

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  /* ── Pays de paiement ── */
  const countryStorageKey = `${COUNTRY_STORAGE_PREFIX}${userKey}`;
  const [countryIso, setCountryIso] = useState<string>("");
  const initializedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userKey || userKey === "guest") return;
    if (initializedForRef.current === userKey) return;

    try {
      const saved = localStorage.getItem(countryStorageKey);
      if (saved && ALLOWED_COUNTRIES.some(c => c.code === saved)) {
        setCountryIso(saved);
        initializedForRef.current = userKey;
        return;
      }
    } catch { /* localStorage indisponible */ }

    if (!me) return;

    const cur = (me.currency || "").toUpperCase();
    if (cur && UNIQUE_CURRENCY_TO_COUNTRY[cur]) {
      setCountryIso(UNIQUE_CURRENCY_TO_COUNTRY[cur]);
    }
    initializedForRef.current = userKey;
  }, [userKey, countryStorageKey, me]);

  const handleCountryChange = (iso: string) => {
    setCountryIso(iso);
    if (!iso) return;
    if (!userKey || userKey === "guest") return;
    try { localStorage.setItem(countryStorageKey, iso); } catch { /* ignore */ }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topupParam = params.get("topup");
    const result = params.get("result");
    if (!topupParam) return;

    setPendingTopupId(topupParam);

    if (result === "credited") {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
    } else if (result === "failed") {
      setStep("failed");
      queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
    } else {
      setStep("pending");
    }

    const clean = window.location.pathname;
    window.history.replaceState({}, "", clean);
  }, [queryClient]);

  useEffect(() => {
    setForm(f => ({
      name: f.name || me?.name || user?.displayName || "",
      email: f.email || me?.email || user?.email || "",
      mobile: f.mobile || me?.phone || "",
    }));
  }, [me, user]);

  const amount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : null);

  const selectedCountry = ALLOWED_COUNTRIES.find(c => c.code === countryIso) ?? null;
  const payCurrency = selectedCountry?.currency ?? null;

  const localCurrency = payCurrency ? getCurrency(payCurrency) : null;
  const showConversion = !!(localCurrency && localCurrency.code !== "EUR" && amount && amount > 0);

  const cardConversionXaf = amount && amount > 0 ? Math.round(amount * TEXERRA_FX.EUR_TO_XAF) : 0;

  const { data: topupStatus } = useQuery<{ status: string }>({
    queryKey: ["/api/topups", pendingTopupId, "status"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch(`/api/topups/${pendingTopupId}/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur statut");
      return res.json();
    },
    enabled: !!pendingTopupId && step === "pending",
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5000;
      if (data.status === "completed" || data.status === "failed") return false;
      return 5000;
    },
  });

  useEffect(() => {
    if (topupStatus?.status === "completed") {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
    } else if (topupStatus?.status === "failed") {
      setStep("failed");
      queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
    }
  }, [topupStatus?.status, queryClient]);

  const handleInitiate = () => {
    if (!amount || amount < MIN_AMOUNT || !form.name || !form.email || !form.mobile) return;
    if (!isCardMethod && !countryIso) return;

    const brand: CardBrand | undefined = isCardMethod
      ? (paymentMethod as CardBrand)
      : undefined;

    initiateTopupMutation.mutate(
      {
        amountEur: amount,
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        countryIso: !isCardMethod ? countryIso : "",
        paymentMethod: isCardMethod ? "card" : "mobile_money",
        brand,
      },
      {
        onSuccess: (data) => {
          if (data.checkoutUrl) {
            setCheckoutUrl(data.checkoutUrl);
            setPendingTopupId(data.topupId);
            setStep("pending");
            window.open(data.checkoutUrl, "_blank");
          }
        },
      }
    );
  };

  const handleForceCheck = useCallback(async () => {
    if (!pendingTopupId || forceChecking) return;
    setForceChecking(true);
    setForceCheckMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken(true).catch(() => null);
      if (!token) {
        setForceCheckMsg({ type: "error", text: "Session expirée. Reconnectez-vous et réessayez." });
        return;
      }
      const res = await fetch(`/api/topups/${pendingTopupId}/status?force=true`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setForceCheckMsg({ type: "error", text: err.error ?? `Erreur serveur (${res.status}). Réessayez.` });
        return;
      }
      const data = await res.json() as { status: string };
      if (data.status === "completed") {
        setStep("success");
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
      } else if (data.status === "failed") {
        setStep("failed");
        queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
      } else {
        setForceCheckMsg({
          type: "info",
          text: "Paiement pas encore confirmé par le partenaire. Attendez 1–2 minutes et réessayez.",
        });
      }
    } catch {
      setForceCheckMsg({ type: "error", text: "Erreur réseau. Vérifiez votre connexion et réessayez." });
    } finally {
      setForceChecking(false);
    }
  }, [pendingTopupId, forceChecking, queryClient]);

  const handleReset = () => {
    setStep("select");
    setPendingTopupId("");
    setCheckoutUrl("");
    setSelectedAmount(null);
    setCustomAmount("");
    setForceCheckMsg(null);
    queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/dashboard";
    }
  };

  const historyTopups = (topups ?? []).filter(t => t.id !== pendingTopupId || step === "select");
  const balanceLocal = me && me.balance !== undefined && me.currency && me.currency !== "EUR"
    ? formatLocalAmount(me.balance, me.currency)
    : null;

  const totalCredited = historyTopups
    .filter(t => t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(String(t.amountEur)), 0);

  const slot = getTimeSlot();
  const holderName = (me?.name || user?.displayName || "Utilisateur").toUpperCase();

  return (
    <div
      className="relative min-h-screen w-full"
      style={{ background: `linear-gradient(180deg, ${BRAND.bg} 0%, ${BRAND.bg2} 100%)` }}
    >
      <AnimatedBackground />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Bouton retour */}
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleBack}
          className="inline-flex items-center gap-2 mb-6 px-4 py-2.5 rounded-2xl bg-white/80 backdrop-blur-sm text-sm font-semibold text-foreground transition-all group"
          style={{ border: `1px solid ${BRAND.border}` }}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-5 mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Portefeuille
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Gérez votre solde et rechargez votre compte en toute sécurité.
            </p>
          </div>
          <MoneyIllustration slot={slot} />
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
         * CARTE SOLDE — Design "Visa/Mastercard" avec puce EMV
         * Solde au centre, titulaire en bas comme sur une vraie carte
         * ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ y: -3, rotateX: 0.5 }}
          className="relative overflow-hidden rounded-3xl mb-8 shadow-lg group"
          style={{
            background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDeep} 100%)`,
            aspectRatio: "1.75 / 1",
            maxHeight: 260,
          }}
        >
          {/* Cercles décoratifs (comme sur les cartes premium) */}
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
          <div
            className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />

          {/* Reflet animé au survol */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.14) 50%, transparent 60%)",
            }}
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />

          <div className="relative h-full flex flex-col p-6 sm:p-7">
            {/* Rangée du haut : wordmark + puce */}
            <div className="flex items-start justify-between">
              <div>
                <div
                  className="text-white font-black text-base tracking-[0.28em] leading-none"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
                >
                  TEXERRA
                </div>
                <div className="text-white/60 text-[10px] font-semibold tracking-widest uppercase mt-1">
                  Portefeuille
                </div>
              </div>
              <ChipSVG className="w-10 h-8 drop-shadow-md" />
            </div>

            {/* Solde au centre */}
            <div className="flex-1 flex flex-col justify-center py-3">
              <div className="text-white/60 text-[10px] font-semibold tracking-widest uppercase mb-1.5">
                Solde disponible
              </div>
              {loadingMe ? (
                <div className="h-12 w-40 bg-white/10 rounded-lg animate-pulse" />
              ) : (
                <motion.div
                  className="text-white text-4xl sm:text-5xl font-black tabular-nums leading-none"
                  style={{ textShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
                >
                  <AnimatedNumber value={me?.balance ?? 0} />
                  <span className="text-2xl sm:text-3xl ml-1.5 font-bold">€</span>
                </motion.div>
              )}
              {balanceLocal && (
                <div className="text-white/75 text-sm font-semibold mt-2">
                  ≈ {balanceLocal}
                </div>
              )}
            </div>

            {/* Rangée du bas : titulaire + devise */}
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="text-white/55 text-[9px] font-bold tracking-widest uppercase mb-1">
                  Titulaire
                </div>
                <div
                  className="text-white font-bold text-sm sm:text-base tracking-wider uppercase truncate max-w-[200px]"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
                >
                  {holderName}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-white/55 text-[9px] font-bold tracking-widest uppercase mb-1">
                  Devise
                </div>
                <div className="text-white font-bold text-sm sm:text-base tracking-wider">
                  EUR
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Barre d'étapes */}
        {step !== "success" && step !== "failed" && <StepBar step={step} accent={accent} />}

        <div className="relative">
          <AnimatePresence mode="wait">
            {/* ── ÉTAPE : sélection ── */}
            {step === "select" && (
              <motion.div
                key="step-select"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 mb-8 shadow-sm"
                style={{ border: `1px solid ${BRAND.border}` }}
              >
                <motion.div
                  key={`top-${paymentMethod}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-0 left-0 h-1 w-full"
                  style={{ background: `linear-gradient(90deg, ${accent.main}, ${accent.light})` }}
                />

                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: accent.soft, color: accent.main }}
                  >
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Recharger votre solde</h2>
                    <p className="text-xs text-muted-foreground">Choisissez votre moyen de paiement puis votre montant</p>
                  </div>
                </div>

                {/* Hint "dernier moyen utilisé" */}
                <AnimatePresence>
                  {lastUsedMethod && lastUsedMethod !== paymentMethod && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setPaymentMethod(lastUsedMethod)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs transition-all hover:shadow-sm"
                        style={{ background: BRAND.bg, border: `1px dashed ${BRAND.border}` }}
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Sparkles className="w-3.5 h-3.5" style={{ color: BRAND.primary }} />
                          Dernier moyen utilisé :{" "}
                          <strong className="text-foreground">{getMethodLabel(lastUsedMethod)}</strong>
                        </span>
                        <span className="flex items-center gap-1 font-bold" style={{ color: BRAND.primary }}>
                          Utiliser <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ═══════ CHOIX DU MOYEN DE PAIEMENT ═══════ */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-foreground">Moyen de paiement</label>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: BRAND.tealSoft, color: BRAND.teal }}
                    >
                      <Lock className="w-3 h-3" /> 100 % sécurisé
                    </span>
                  </div>

                  {/* Mobile Money — pleine largeur */}
                  <motion.button
                    type="button"
                    onClick={() => setPaymentMethod("mobile_money")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full p-4 rounded-2xl text-left overflow-hidden transition-colors mb-4"
                    style={
                      paymentMethod === "mobile_money"
                        ? {
                            background: `linear-gradient(135deg, ${BRAND.primarySoft}, #ffffff 70%)`,
                            border: `2px solid ${BRAND.primary}`,
                            boxShadow: `0 10px 28px ${BRAND.primary}26`,
                          }
                        : {
                            background: "#ffffff",
                            border: `1px solid ${BRAND.border}`,
                          }
                    }
                    aria-pressed={paymentMethod === "mobile_money"}
                  >
                    {paymentMethod === "mobile_money" && (
                      <motion.span
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ border: `2px solid ${BRAND.primaryLight}` }}
                        animate={{ opacity: [0.8, 0, 0.8], scale: [1, 1.015, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity }}
                      />
                    )}
                    <div className="relative flex items-center gap-4">
                      <MobileMoneyIcon className="w-11 h-11 rounded-xl shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground text-[15px]">Mobile Money</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Orange Money · MTN MoMo · Wave · Airtel · Moov
                        </div>
                      </div>
                      <AnimatePresence>
                        {paymentMethod === "mobile_money" && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="w-6 h-6 rounded-full flex items-center justify-center shadow-md shrink-0"
                            style={{ background: BRAND.primary }}
                          >
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>

                  {/* Séparateur "ou" */}
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed" style={{ borderColor: BRAND.border }} />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider bg-white">
                        ou payez par
                      </span>
                    </div>
                  </div>

                  {/* Visa / Mastercard / PayPal */}
                  <div className="grid grid-cols-3 gap-3">
                    <PaymentBrandButton
                      selected={paymentMethod === "visa"}
                      onSelect={() => setPaymentMethod("visa")}
                      logo={<VisaLogo className="w-full h-auto max-h-12" />}
                      label="Visa"
                      index={0}
                    />
                    <PaymentBrandButton
                      selected={paymentMethod === "mastercard"}
                      onSelect={() => setPaymentMethod("mastercard")}
                      logo={<MastercardLogo className="w-full h-auto max-h-12" />}
                      label="Mastercard"
                      index={1}
                    />
                    <PaymentBrandButton
                      selected={paymentMethod === "paypal"}
                      onSelect={() => setPaymentMethod("paypal")}
                      logo={<PaypalLogo className="w-full h-auto max-h-12" />}
                      label="PayPal"
                      index={2}
                    />
                  </div>

                  {/* Badge sécurité cartes */}
                  <AnimatePresence>
                    {isCardMethod && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"
                      >
                        <Shield className="w-3.5 h-3.5" style={{ color: BRAND.teal }} />
                        <span>Paiement protégé — Vos coordonnées bancaires ne passent jamais par Texerra.</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Avertissement */}
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={`tip-${paymentMethod}`}
                  className="mb-6 flex items-start gap-3 rounded-2xl px-4 py-3"
                  style={{
                    background: accent.soft,
                    border: `1px solid ${accent.main}33`
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: accent.main, color: "#ffffff" }}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: BRAND.ink }}>
                    <strong className="block mb-0.5 text-sm" style={{ color: accent.dark }}>
                      Après votre paiement
                    </strong>
                    Si votre solde n'est pas mis à jour automatiquement dans quelques minutes, ouvrez{" "}
                    <strong>l'historique des recharges ci-dessous</strong>, trouvez votre paiement et cliquez sur{" "}
                    <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded" style={{ background: `${accent.main}22` }}>
                      <RefreshCw className="w-3 h-3" /> Vérifier
                    </span>.
                  </div>
                </motion.div>

                {/* Sélecteur de pays — Mobile Money uniquement */}
                <AnimatePresence initial={false}>
                  {!isCardMethod && (
                    <motion.div
                      key="country-field"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <label className="text-sm font-medium text-muted-foreground block mb-2">
                        <Globe className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                        Pays de paiement
                      </label>
                      <select
                        value={countryIso}
                        onChange={e => handleCountryChange(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white rounded-2xl text-sm text-foreground focus:outline-none transition-all"
                        style={{
                          border: countryIso ? `2px solid ${accent.main}` : `1px solid ${BRAND.border}`,
                          boxShadow: countryIso ? `0 0 0 4px ${accent.main}14` : "none"
                        }}
                      >
                        <option value="">— Sélectionnez votre pays —</option>
                        {ALLOWED_COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.currency})
                          </option>
                        ))}
                      </select>
                      {!countryIso && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Sélectionnez votre pays pour continuer.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tiles montants */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {PRESET_AMOUNTS.map((a, idx) => {
                    const isSelected = selectedAmount === a;
                    const localA = isCardMethod
                      ? `${Math.round(a * TEXERRA_FX.EUR_TO_XAF).toLocaleString("fr-FR")} FCFA`
                      : payCurrency ? formatLocalAmount(a, payCurrency) : null;
                    return (
                      <motion.button
                        key={a}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + idx * 0.04 }}
                        whileHover={{ y: -3, scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { setSelectedAmount(a); setCustomAmount(""); }}
                        className="relative py-4 rounded-2xl font-bold text-sm transition-all overflow-hidden"
                        style={
                          isSelected
                            ? {
                                background: `linear-gradient(135deg, ${accent.main}, ${accent.deep})`,
                                color: "#ffffff",
                                boxShadow: `0 8px 24px ${accent.main}44`,
                                border: `1px solid ${accent.dark}`
                              }
                            : {
                                background: "#ffffff",
                                border: `1px solid ${BRAND.border}`,
                                color: BRAND.ink
                              }
                        }
                      >
                        {isSelected && (
                          <motion.span
                            className="absolute inset-0 rounded-2xl"
                            style={{ border: `2px solid ${accent.light}` }}
                            animate={{ opacity: [0.8, 0, 0.8], scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                        <div className="relative">
                          <div className="text-xl font-black">{a} €</div>
                          {localA && (
                            <div
                              className="text-[10px] font-semibold mt-0.5"
                              style={{ color: isSelected ? "#ffffffcc" : accent.dark }}
                            >
                              ≈ {localA}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Autre montant */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Autre montant <span className="text-xs opacity-70">(min {MIN_AMOUNT.toFixed(2)} €)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={MIN_AMOUNT}
                      step="0.5"
                      placeholder={`Ex: ${MIN_AMOUNT.toFixed(2)}`}
                      value={customAmount}
                      onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                      className="w-full px-4 py-3.5 bg-white rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none transition-all text-sm"
                      style={{
                        border: customAmount ? `2px solid ${accent.main}` : `1px solid ${BRAND.border}`,
                        boxShadow: customAmount ? `0 0 0 4px ${accent.main}14` : "none"
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
                  </div>

                  {customAmount && parseFloat(customAmount) > 0 && parseFloat(customAmount) < MIN_AMOUNT && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Minimum de recharge : {MIN_AMOUNT.toFixed(2)} €
                    </div>
                  )}

                  {isCardMethod && customAmount && parseFloat(customAmount) >= MIN_AMOUNT && !selectedAmount && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground mt-1.5">
                      ≈ {Math.round(parseFloat(customAmount) * TEXERRA_FX.EUR_TO_XAF).toLocaleString("fr-FR")} FCFA
                    </motion.p>
                  )}

                  {!isCardMethod && payCurrency && customAmount && parseFloat(customAmount) >= MIN_AMOUNT && !selectedAmount && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground mt-1.5">
                      ≈ {formatLocalAmount(parseFloat(customAmount), payCurrency)}
                    </motion.p>
                  )}
                </div>

                {/* Récap conversion */}
                {amount && amount >= MIN_AMOUNT && (
                  <motion.div
                    key={`conv-${paymentMethod}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 px-4 py-3 rounded-2xl"
                    style={{ background: `${accent.main}0f`, border: `1px solid ${accent.main}26` }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-muted-foreground">Montant converti</span>
                      <span className="font-bold" style={{ color: accent.dark }}>
                        {isCardMethod
                          ? `≈ ${cardConversionXaf.toLocaleString("fr-FR")} FCFA`
                          : payCurrency ? `≈ ${formatLocalAmount(amount, payCurrency)}` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                      <span>Taux appliqué</span>
                      <span>
                        {isCardMethod
                          ? `1 € = ${TEXERRA_FX.EUR_TO_XAF} FCFA`
                          : payCurrency ? `1 € ≈ ${payCurrency}` : "—"}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* CTA Continuer */}
                <motion.button
                  onClick={() => {
                    if (!amount || amount < MIN_AMOUNT) return;
                    if (!isCardMethod && !countryIso) return;
                    setStep("details");
                  }}
                  disabled={!amount || amount < MIN_AMOUNT || (!isCardMethod && !countryIso)}
                  whileHover={amount && amount >= MIN_AMOUNT ? { y: -2 } : undefined}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full flex items-center justify-center gap-2 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group"
                  style={{
                    background: `linear-gradient(135deg, ${accent.main}, ${accent.deep})`,
                    boxShadow: `0 8px 24px ${accent.main}44`
                  }}
                >
                  {amount && amount >= MIN_AMOUNT && (
                    <motion.span
                      className="absolute inset-0 -translate-x-full"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
                      animate={{ translateX: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    />
                  )}
                  <span className="relative">
                    Continuer {amount ? `— ${amount.toFixed(2)} €` : ""}
                  </span>
                  <ArrowRight className="w-5 h-5 relative group-hover:translate-x-0.5 transition-transform" />
                </motion.button>

                {/* Badges de confiance */}
                <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                  <div className="flex flex-col items-center gap-1 py-2">
                    <Shield className="w-4 h-4" style={{ color: BRAND.teal }} />
                    <span className="font-semibold">Sécurisé</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 py-2 border-x" style={{ borderColor: BRAND.border }}>
                    <Zap className="w-4 h-4" style={{ color: BRAND.primary }} />
                    <span className="font-semibold">Rapide</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 py-2">
                    <Lock className="w-4 h-4" style={{ color: BRAND.cool }} />
                    <span className="font-semibold">Chiffré</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ÉTAPE : coordonnées ── */}
            {step === "details" && (
              <motion.div
                key="step-details"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 mb-8 shadow-sm"
                style={{ border: `1px solid ${BRAND.border}` }}
              >
                <div
                  className="absolute top-0 left-0 h-1 w-full"
                  style={{ background: `linear-gradient(90deg, ${accent.main}, ${accent.light})` }}
                />

                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setStep("select")}
                    className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-foreground">Vos coordonnées</h2>
                    <p className="text-xs text-muted-foreground truncate">
                      {isCardMethod
                        ? `Paiement par ${getMethodLabel(paymentMethod)}`
                        : selectedCountry ? `Paiement depuis ${selectedCountry.name}` : "Pour votre paiement"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-black" style={{ color: accent.dark }}>
                      {amount?.toFixed(2)} €
                    </div>
                    {isCardMethod ? (
                      <div className="text-xs text-muted-foreground">
                        ≈ {cardConversionXaf.toLocaleString("fr-FR")} FCFA
                      </div>
                    ) : showConversion && localCurrency ? (
                      <div className="text-xs text-muted-foreground">
                        ≈ {formatLocalAmount(amount!, localCurrency.code)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">Nom complet</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text" required placeholder="Jean Dupont"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
                        style={{ border: `1px solid ${BRAND.border}` }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email" required placeholder="jean@exemple.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
                        style={{ border: `1px solid ${BRAND.border}` }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                      Numéro de téléphone
                      {me?.phone && <span className="ml-2 text-xs text-green-600 font-normal">• pré-rempli</span>}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel" required placeholder="+237 6 XX XX XX XX"
                        value={form.mobile}
                        onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all"
                        style={{ border: `1px solid ${BRAND.border}` }}
                      />
                    </div>
                  </div>
                </div>

                {isCardMethod && (
                  <div
                    className="mb-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-xs"
                    style={{ background: BRAND.tealSoft, color: BRAND.teal }}
                  >
                    <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-0.5">Redirection vers notre partenaire sécurisé.</strong>
                      Le paiement sera complété sur une page protégée. Texerra ne stocke jamais vos coordonnées bancaires.
                    </div>
                  </div>
                )}

                <motion.button
                  onClick={handleInitiate}
                  disabled={
                    !form.name || !form.email || !form.mobile ||
                    (!isCardMethod && !countryIso) ||
                    initiateTopupMutation.isPending
                  }
                  whileHover={!initiateTopupMutation.isPending ? { y: -2 } : undefined}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${accent.main}, ${accent.deep})`,
                    boxShadow: `0 8px 24px ${accent.main}33`
                  }}
                >
                  {initiateTopupMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Préparation…</>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      {isCardMethod ? `Payer par ${getMethodLabel(paymentMethod)}` : "Payer"} {amount?.toFixed(2)} €
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
                {initiateTopupMutation.isError && (
                  <p className="text-destructive text-sm mt-3 text-center">
                    {(initiateTopupMutation.error as Error)?.message || "Une erreur s'est produite. Réessayez."}
                  </p>
                )}
              </motion.div>
            )}

            {/* ── ÉTAPE : en attente ── */}
            {step === "pending" && (
              <motion.div
                key="step-pending"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-center mb-8 shadow-sm"
                style={{ border: `1px solid ${BRAND.border}` }}
              >
                <div
                  className="absolute top-0 left-0 h-1 w-full"
                  style={{ background: `linear-gradient(90deg, ${accent.main}, ${accent.light})` }}
                />

                <div className="relative w-20 h-20 mx-auto mb-6">
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: `${accent.main}22` }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-2 rounded-full"
                    style={{ background: `${accent.main}33` }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  />
                  <div
                    className="absolute inset-4 rounded-full flex items-center justify-center shadow-md"
                    style={{ background: `linear-gradient(135deg, ${accent.main}, ${accent.deep})` }}
                  >
                    <Clock className="w-7 h-7 text-white animate-pulse" />
                  </div>
                </div>

                <h2 className="text-xl font-bold mb-2 text-foreground">Paiement en attente</h2>
                <p className="text-muted-foreground mb-2 text-sm leading-relaxed max-w-md mx-auto">
                  Complétez le paiement dans la fenêtre ouverte, puis revenez ici.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  La vérification est automatique. Si vous avez déjà payé, cliquez sur le bouton ci-dessous.
                </p>

                {topupStatus && topupStatus.status !== "pending" && (
                  <div
                    className="rounded-2xl px-4 py-3 text-sm font-medium mb-6"
                    style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }}
                  >
                    Statut :{" "}
                    <span className={topupStatus.status === "completed" ? "text-green-600" : ""} style={topupStatus.status !== "completed" ? { color: accent.main } : undefined}>
                      {topupStatus.status}
                    </span>
                  </div>
                )}

                <AnimatePresence>
                  {forceCheckMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`mb-4 px-4 py-3 rounded-2xl text-sm font-medium flex items-start gap-2 text-left ${
                        forceCheckMsg.type === "error"
                          ? "bg-red-50 border border-red-200 text-red-700"
                          : "bg-blue-50 border border-blue-200 text-blue-700"
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {forceCheckMsg.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleForceCheck}
                  disabled={forceChecking}
                  className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-bold rounded-2xl transition-all disabled:opacity-60 text-sm mb-3 active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(135deg, ${accent.main}, ${accent.deep})`,
                    boxShadow: `0 6px 20px ${accent.main}33`
                  }}
                >
                  {forceChecking ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> J'ai payé — vérifier maintenant</>
                  )}
                </button>

                <div className="flex gap-3 flex-col sm:flex-row">
                  {checkoutUrl && (
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 flex-1 py-3 bg-white rounded-2xl text-sm font-semibold hover:shadow-sm transition-colors"
                      style={{ border: `1px solid ${BRAND.border}` }}
                    >
                      <ExternalLink className="w-4 h-4" /> Rouvrir le paiement
                    </a>
                  )}
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-2xl hover:bg-secondary/50 transition-colors"
                    style={{ border: `1px solid ${BRAND.border}` }}
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── ÉTAPE : succès ── */}
            {step === "success" && (
              <motion.div
                key="step-success"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative overflow-hidden rounded-3xl bg-white p-8 text-center mb-8 shadow-sm"
                style={{ border: "1px solid #86EFAC" }}
              >
                <Confetti />
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-green-400 to-emerald-500" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="relative w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 shadow-md"
                >
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ background: "#22c55e33" }}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <CheckCircle2 className="relative w-10 h-10 text-green-600" />
                </motion.div>
                <h2 className="text-xl font-bold mb-3 text-foreground">Solde rechargé !</h2>
                <p className="text-muted-foreground mb-6 text-sm">Votre solde a été crédité avec succès.</p>
                <div className="text-4xl font-black mb-1 tabular-nums" style={{ color: BRAND.primaryDark }}>
                  <AnimatedNumber value={me?.balance ?? 0} /> €
                </div>
                {balanceLocal && (
                  <div className="text-sm font-semibold text-muted-foreground mb-8">≈ {balanceLocal}</div>
                )}
                <div className="flex gap-3 flex-col sm:flex-row justify-center">
                  <a
                    href="/order"
                    className="flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-2xl transition-all active:scale-95 text-sm"
                    style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDeep})` }}
                  >
                    Commander un numéro <ArrowRight className="w-4 h-4" />
                  </a>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    style={{ border: `1px solid ${BRAND.border}` }}
                  >
                    Recharger encore
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── ÉTAPE : échec ── */}
            {step === "failed" && (
              <motion.div
                key="step-failed"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative overflow-hidden rounded-3xl bg-white p-8 text-center mb-8 shadow-sm"
                style={{ border: "1px solid #FCA5A5" }}
              >
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-400 to-rose-500" />
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-xl font-bold mb-3 text-foreground">Paiement non abouti</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Le paiement n'a pas pu être confirmé. Votre solde n'a pas été modifié.
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 text-white font-semibold rounded-2xl transition-all active:scale-95 text-sm"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDeep})` }}
                >
                  Réessayer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Historique ── */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl bg-white shadow-sm"
            style={{ border: `1px solid ${BRAND.border}` }}
          >
            {/* Liseré : uniquement orange (pas de mélange) */}
            <div
              className="absolute top-0 left-0 h-1 w-full"
              style={{ background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryLight})` }}
            />

            <div className="p-5 sm:p-6 border-b" style={{ borderColor: BRAND.border }}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Icône historique : orange uniquement */}
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`, color: "#ffffff" }}
                  >
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Historique des recharges</h2>
                    <p className="text-xs text-muted-foreground">
                      {historyTopups.length} opération{historyTopups.length > 1 ? "s" : ""} · Total {totalCredited.toFixed(2)} €
                    </p>
                  </div>
                </div>

                {/* Toggle : orange uniquement (pas de mélange) */}
                <div className="flex items-center gap-1 bg-white rounded-xl p-0.5" style={{ border: `1px solid ${BRAND.border}` }}>
                  <button
                    onClick={() => setView("list")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      view === "list" ? "text-white shadow-sm" : "text-muted-foreground hover:bg-secondary/60"
                    }`}
                    style={view === "list" ? { background: BRAND.primary } : undefined}
                    title="Vue liste"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Liste</span>
                  </button>
                  <button
                    onClick={() => setView("grid")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      view === "grid" ? "text-white shadow-sm" : "text-muted-foreground hover:bg-secondary/60"
                    }`}
                    style={view === "grid" ? { background: BRAND.primary } : undefined}
                    title="Vue grille"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Grille</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {loadingTopups ? (
                view === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
                    ))}
                  </div>
                )
              ) : historyTopups.length === 0 ? (
                <div className="text-center py-10">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner"
                    style={{ background: BRAND.primarySoft }}
                  >
                    <Wallet className="w-7 h-7" style={{ color: BRAND.primary }} />
                  </div>
                  <p className="text-sm text-muted-foreground">Aucune recharge pour l'instant.</p>
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {historyTopups.map((topup, i) => (
                    <motion.div
                      key={topup.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ y: -2 }}
                      className="rounded-2xl p-4 hover:shadow-md transition-all bg-white"
                      style={{ border: `1px solid ${BRAND.border}` }}
                    >
                      <TopupHistoryItem
                        topup={topup}
                        view="grid"
                        currency={me?.currency}
                        onCredited={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/me"] });
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {historyTopups.map((topup, i) => (
                    <motion.div
                      key={topup.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ x: 2 }}
                      className="rounded-2xl p-4 hover:shadow-md transition-all bg-white"
                      style={{ border: `1px solid ${BRAND.border}` }}
                    >
                      <TopupHistoryItem
                        topup={topup}
                        view="list"
                        currency={me?.currency}
                        onCredited={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/me"] });
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {historyTopups.some(t => t.status === "pending") && (
                <div
                  className="mt-6 flex items-start gap-2 text-xs text-muted-foreground rounded-2xl px-4 py-3"
                  style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Les recharges <span className="font-semibold text-amber-700">En attente</span> peuvent être vérifiées manuellement.
                    Le bouton disparaît dès que le paiement est confirmé et le solde crédité.
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}