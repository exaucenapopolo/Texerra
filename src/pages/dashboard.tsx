import { useState, useEffect, useMemo, useCallback } from "react";
import { useMeta } from "../lib/use-meta";
import { auth } from "../lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, XCircle, Loader2, Copy, RefreshCw, Plus, Wallet,
  ArrowRight, ShoppingBag, User, Pencil, X, Phone, Globe, CreditCard,
  Filter, Search, Sparkles, Receipt, Calendar, BadgeCheck, Activity,
  ChevronDown, ChevronUp, Info, ShoppingCart, TrendingUp, ArrowLeft,
  ArrowUpDown, LayoutList, GalleryHorizontal, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { CURRENCIES, getCurrency } from "../lib/currencies";

/* ────────────────────────────────────────────────────────────────── */
/* Palette stricte                                                    */
/* ────────────────────────────────────────────────────────────────── */

const BRAND = {
  primary: "#C55A34",
  primaryDark: "#A84A28",
  primaryDeep: "#7C2D12",
  primaryLight: "#E8A47F",
  primarySoft: "#FBEEE7",

  cool: "#2563EB",
  coolDark: "#1D4ED8",
  coolSoft: "#EFF6FF",
  coolBorder: "#BFDBFE",

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
/* Hook localStorage robuste                                          */
/* ────────────────────────────────────────────────────────────────── */

function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue];
}

/* ────────────────────────────────────────────────────────────────── */
/* Formatage / helpers                                                */
/* ────────────────────────────────────────────────────────────────── */

function formatLocalPrice(amountEur: number, currencyCode: string | null | undefined): string | null {
  if (!currencyCode || currencyCode === "EUR") return null;
  const curr = getCurrency(currencyCode);
  if (!curr || !curr.rateFromEur) return null;
  const converted = amountEur * curr.rateFromEur;
  const formatted = converted.toLocaleString("fr-FR", {
    maximumFractionDigits: converted < 1000 ? 2 : 0,
  });
  return `${formatted} ${curr.symbol}`;
}

const ICON_COLORS: Record<string, string> = {
  instagram: "E1306C", whatsapp: "25D366", telegram: "26A5E4", facebook: "1877F2",
  google: "4285F4", tiktok: "000000", x: "000000", apple: "000000",
  amazon: "FF9900", microsoft: "737373", discord: "5865F2", snapchat: "FFCC00",
  netflix: "E50914", uber: "000000", linkedin: "0A66C2", paypal: "003087",
  binance: "F0B90B", tinder: "FF4458", viber: "665CAC", youtube: "FF0000",
  signal: "3A76F0", spotify: "1DB954", reddit: "FF4500", airbnb: "FF5A5F",
  slack: "4A154B", github: "000000", twitch: "9146FF", pinterest: "E60023",
  wechat: "07C160", vk: "0077FF", yandex: "FC3F1D", aliexpress: "FF4747",
  ebay: "E43137", etsy: "F16521", coinbase: "0052FF",
};

const SERVICE_DISPLAY: Record<string, string> = {
  wa: "WhatsApp", wb: "WhatsApp Business", fb: "Facebook", ig: "Instagram",
  tg: "Telegram", tt: "TikTok", go: "Google", am: "Amazon",
  nf: "Netflix", pp: "PayPal", tw: "X (Twitter)", dc: "Discord",
  sp: "Spotify", ub: "Uber", ms: "Microsoft", ap: "Apple",
  sn: "Snapchat", li: "LinkedIn", yt: "YouTube", rd: "Reddit",
  ab: "Airbnb", bi: "Binance", tn: "Tinder", vb: "Viber",
  sg: "Signal", sl: "Slack", gh: "GitHub", tv: "Twitch",
  pt: "Pinterest", wc: "WeChat", vk: "VK", yd: "Yandex",
  ae: "AliExpress", eb: "eBay", et: "Etsy", cb: "Coinbase",
};

const normalizeService = (code: string) => {
  const codeLower = code.toLowerCase();
  const map: Record<string, string> = {
    wa: "whatsapp", wb: "whatsapp", fb: "facebook", ig: "instagram",
    tg: "telegram", tt: "tiktok", go: "google", am: "amazon",
    nf: "netflix", pp: "paypal", tw: "x", dc: "discord",
    sp: "spotify", ub: "uber", ms: "microsoft", ap: "apple",
    sn: "snapchat", li: "linkedin", yt: "youtube", rd: "reddit",
    ab: "airbnb", bi: "binance", tn: "tinder", vb: "viber",
    sg: "signal", sl: "slack", gh: "github", tv: "twitch",
    pt: "pinterest", wc: "wechat", vk: "vk", yd: "yandex",
    ae: "aliexpress", eb: "ebay", et: "etsy", cb: "coinbase",
  };
  return map[codeLower] || codeLower;
};

function serviceDisplayName(code: string | null | undefined): string {
  if (!code) return "";
  const lower = code.toLowerCase();
  if (SERVICE_DISPLAY[lower]) return SERVICE_DISPLAY[lower];
  return code.charAt(0).toUpperCase() + code.slice(1);
}

function svcIconUrl(code: string | null | undefined, overrideUrl?: string | null): string | null {
  if (overrideUrl) return overrideUrl;
  if (!code) return null;
  const normalized = normalizeService(code);
  const color = ICON_COLORS[normalized] ?? "555555";
  return `https://cdn.simpleicons.org/${normalized}/${color}`;
}

/* ────────────────────────────────────────────────────────────────── */
/* Pays                                                               */
/* ────────────────────────────────────────────────────────────────── */

type CountryInfo = { name: string; iso: string; callingCode: string };

const PHONE_PREFIX_MAP: Array<{ prefix: string; info: CountryInfo }> = [
  { prefix: "237", info: { name: "Cameroun", iso: "CM", callingCode: "+237" } },
  { prefix: "225", info: { name: "Côte d'Ivoire", iso: "CI", callingCode: "+225" } },
  { prefix: "221", info: { name: "Sénégal", iso: "SN", callingCode: "+221" } },
  { prefix: "234", info: { name: "Nigéria", iso: "NG", callingCode: "+234" } },
  { prefix: "233", info: { name: "Ghana", iso: "GH", callingCode: "+233" } },
  { prefix: "229", info: { name: "Bénin", iso: "BJ", callingCode: "+229" } },
  { prefix: "226", info: { name: "Burkina Faso", iso: "BF", callingCode: "+226" } },
  { prefix: "223", info: { name: "Mali", iso: "ML", callingCode: "+223" } },
  { prefix: "228", info: { name: "Togo", iso: "TG", callingCode: "+228" } },
  { prefix: "227", info: { name: "Niger", iso: "NE", callingCode: "+227" } },
  { prefix: "224", info: { name: "Guinée", iso: "GN", callingCode: "+224" } },
  { prefix: "241", info: { name: "Gabon", iso: "GA", callingCode: "+241" } },
  { prefix: "235", info: { name: "Tchad", iso: "TD", callingCode: "+235" } },
  { prefix: "242", info: { name: "Congo", iso: "CG", callingCode: "+242" } },
  { prefix: "243", info: { name: "RD Congo", iso: "CD", callingCode: "+243" } },
  { prefix: "254", info: { name: "Kenya", iso: "KE", callingCode: "+254" } },
  { prefix: "255", info: { name: "Tanzanie", iso: "TZ", callingCode: "+255" } },
  { prefix: "256", info: { name: "Ouganda", iso: "UG", callingCode: "+256" } },
  { prefix: "250", info: { name: "Rwanda", iso: "RW", callingCode: "+250" } },
  { prefix: "212", info: { name: "Maroc", iso: "MA", callingCode: "+212" } },
  { prefix: "213", info: { name: "Algérie", iso: "DZ", callingCode: "+213" } },
  { prefix: "216", info: { name: "Tunisie", iso: "TN", callingCode: "+216" } },
  { prefix: "20", info: { name: "Égypte", iso: "EG", callingCode: "+20" } },
  { prefix: "27", info: { name: "Afrique du Sud", iso: "ZA", callingCode: "+27" } },
  { prefix: "971", info: { name: "Émirats arabes unis", iso: "AE", callingCode: "+971" } },
  { prefix: "966", info: { name: "Arabie saoudite", iso: "SA", callingCode: "+966" } },
  { prefix: "90", info: { name: "Turquie", iso: "TR", callingCode: "+90" } },
  { prefix: "86", info: { name: "Chine", iso: "CN", callingCode: "+86" } },
  { prefix: "91", info: { name: "Inde", iso: "IN", callingCode: "+91" } },
  { prefix: "92", info: { name: "Pakistan", iso: "PK", callingCode: "+92" } },
  { prefix: "60", info: { name: "Malaisie", iso: "MY", callingCode: "+60" } },
  { prefix: "61", info: { name: "Australie", iso: "AU", callingCode: "+61" } },
  { prefix: "62", info: { name: "Indonésie", iso: "ID", callingCode: "+62" } },
  { prefix: "63", info: { name: "Philippines", iso: "PH", callingCode: "+63" } },
  { prefix: "65", info: { name: "Singapour", iso: "SG", callingCode: "+65" } },
  { prefix: "66", info: { name: "Thaïlande", iso: "TH", callingCode: "+66" } },
  { prefix: "81", info: { name: "Japon", iso: "JP", callingCode: "+81" } },
  { prefix: "82", info: { name: "Corée du Sud", iso: "KR", callingCode: "+82" } },
  { prefix: "84", info: { name: "Viêt Nam", iso: "VN", callingCode: "+84" } },
  { prefix: "51", info: { name: "Pérou", iso: "PE", callingCode: "+51" } },
  { prefix: "52", info: { name: "Mexique", iso: "MX", callingCode: "+52" } },
  { prefix: "54", info: { name: "Argentine", iso: "AR", callingCode: "+54" } },
  { prefix: "55", info: { name: "Brésil", iso: "BR", callingCode: "+55" } },
  { prefix: "56", info: { name: "Chili", iso: "CL", callingCode: "+56" } },
  { prefix: "57", info: { name: "Colombie", iso: "CO", callingCode: "+57" } },
  { prefix: "58", info: { name: "Venezuela", iso: "VE", callingCode: "+58" } },
  { prefix: "30", info: { name: "Grèce", iso: "GR", callingCode: "+30" } },
  { prefix: "31", info: { name: "Pays-Bas", iso: "NL", callingCode: "+31" } },
  { prefix: "32", info: { name: "Belgique", iso: "BE", callingCode: "+32" } },
  { prefix: "33", info: { name: "France", iso: "FR", callingCode: "+33" } },
  { prefix: "34", info: { name: "Espagne", iso: "ES", callingCode: "+34" } },
  { prefix: "39", info: { name: "Italie", iso: "IT", callingCode: "+39" } },
  { prefix: "41", info: { name: "Suisse", iso: "CH", callingCode: "+41" } },
  { prefix: "43", info: { name: "Autriche", iso: "AT", callingCode: "+43" } },
  { prefix: "44", info: { name: "Royaume-Uni", iso: "GB", callingCode: "+44" } },
  { prefix: "45", info: { name: "Danemark", iso: "DK", callingCode: "+45" } },
  { prefix: "46", info: { name: "Suède", iso: "SE", callingCode: "+46" } },
  { prefix: "47", info: { name: "Norvège", iso: "NO", callingCode: "+47" } },
  { prefix: "48", info: { name: "Pologne", iso: "PL", callingCode: "+48" } },
  { prefix: "49", info: { name: "Allemagne", iso: "DE", callingCode: "+49" } },
  { prefix: "351", info: { name: "Portugal", iso: "PT", callingCode: "+351" } },
  { prefix: "7", info: { name: "Russie / Kazakhstan", iso: "RU", callingCode: "+7" } },
  { prefix: "1", info: { name: "États-Unis / Canada", iso: "US", callingCode: "+1" } },
];

PHONE_PREFIX_MAP.sort((a, b) => b.prefix.length - a.prefix.length);

function resolveCountryFromPhone(phone: string | null | undefined, code: string | null | undefined): CountryInfo {
  if (phone) {
    const clean = String(phone).replace(/\D/g, "");
    for (const entry of PHONE_PREFIX_MAP) {
      if (clean.startsWith(entry.prefix)) return entry.info;
    }
  }
  if (typeof code === "string" && /^[A-Za-z]{2}$/.test(code)) {
    const upper = code.toUpperCase();
    for (const entry of PHONE_PREFIX_MAP) {
      if (entry.info.iso === upper) return entry.info;
    }
    return { name: upper, iso: upper, callingCode: "+" };
  }
  return { name: "International", iso: "", callingCode: "+" };
}

function isoToFlagEmoji(iso: string): string {
  if (!/^[A-Za-z]{2}$/.test(iso)) return "🌍";
  return String.fromCodePoint(...[...iso.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

/* ────────────────────────────────────────────────────────────────── */
/* Statuts                                                            */
/* ────────────────────────────────────────────────────────────────── */

type StatusKey = "pending_payment" | "active" | "completed" | "cancelled" | "expired";

interface StatusMeta {
  label: string;
  description: string;
  fg: string;
  bg: string;
  border: string;
  dot: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIG: Record<StatusKey, StatusMeta> = {
  pending_payment: {
    label: "Paiement en attente",
    description: "Votre commande a bien été enregistrée. Le paiement n'a pas encore été confirmé par notre prestataire. Dès validation, le numéro sera automatiquement attribué.",
    fg: "#92400E",
    bg: BRAND.warnSoft,
    border: BRAND.warnBorder,
    dot: BRAND.warn,
    Icon: Clock,
  },
  active: {
    label: "En attente du SMS",
    description: "Le numéro vous est réservé. Utilisez-le dès maintenant sur le service concerné. Le code de vérification apparaîtra automatiquement sur cette page dès sa réception (2 à 7 minutes en moyenne).",
    fg: "#1E40AF",
    bg: BRAND.coolSoft,
    border: BRAND.coolBorder,
    dot: BRAND.cool,
    Icon: RefreshCw,
  },
  completed: {
    label: "SMS reçu",
    description: "Le code de vérification est arrivé. Copiez-le et utilisez-le pour finaliser votre inscription. La commande est considérée comme terminée.",
    fg: "#166534",
    bg: BRAND.successSoft,
    border: BRAND.successBorder,
    dot: BRAND.success,
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Commande annulée",
    description: "Cette commande a été annulée avant l'attribution d'un numéro. Aucun montant n'a été débité de votre solde.",
    fg: "#374151",
    bg: BRAND.borderSoft,
    border: BRAND.border,
    dot: "#9CA3AF",
    Icon: XCircle,
  },
  expired: {
    label: "Numéro expiré",
    description: "Le délai de réception est écoulé et aucun SMS n'est arrivé. Le montant a automatiquement été recrédité sur votre solde.",
    fg: "#991B1B",
    bg: BRAND.dangerSoft,
    border: BRAND.dangerBorder,
    dot: BRAND.danger,
    Icon: XCircle,
  },
};

function getStatusMeta(status: string): StatusMeta {
  return STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.cancelled;
}

const listContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const listItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 26 } }
};

function timeRemaining(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expiré";
  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return `${min}m ${sec}s`;
}

export interface Order {
  id: string;
  serviceCode: string;
  serviceIcon?: string | null;
  countryCode: string;
  phoneNumber?: string | null;
  smsCode?: string | null;
  status: string;
  price?: number;
  expiresAt?: string | null;
  createdAt: string;
}

export interface Topup {
  id: string;
  amountEur: number;
  status: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  currency?: string | null;
  balance: number;
}

/* ────────────────────────────────────────────────────────────────── */
/* Greeting                                                           */
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

function getGreeting(name?: string | null): { greeting: string; subline: string; slot: TimeSlot } {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const slot = getTimeSlot();
  const firstName = (name ?? "").trim().split(" ")[0] || "";

  let greeting = "Bonjour";
  if (slot === "night") greeting = "Bonne nuit";
  else if (slot === "morning") greeting = "Bonjour";
  else if (slot === "afternoon") greeting = "Bon après-midi";
  else if (slot === "evening") greeting = "Bonsoir";

  const withName = firstName ? `${greeting}, ${firstName}` : greeting;

  let subline = "";
  if (day === 1 && hour < 12) subline = "Bonne semaine !";
  else if (day === 5) subline = "Bon vendredi !";
  else if (day === 6) subline = "Bon week-end !";
  else if (day === 0) subline = "Bon dimanche !";

  return { greeting: withName, subline, slot };
}

/* ────────────────────────────────────────────────────────────────── */
/* SVG cats                                                           */
/* ────────────────────────────────────────────────────────────────── */

function SleepingCatSVG() {
  return (
    <div className="relative w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <radialGradient id="nightSky" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0" stopColor="#2d3f72" />
            <stop offset="1" stopColor="#1a2547" />
          </radialGradient>
          <linearGradient id="catFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes catBreathe { 0%,100%{transform:scale(1) translateY(0)} 50%{transform:scale(1.025,1.015) translateY(-1px)} }
          @keyframes floatZ { 0%{opacity:0;transform:translate(0,0) scale(.5)} 25%{opacity:1;transform:translate(4px,-14px) scale(.8)} 100%{opacity:0;transform:translate(10px,-34px) scale(1.1)} }
          @keyframes twinkle { 0%,100%{opacity:.25} 50%{opacity:1} }
          @keyframes moonGlow { 0%,100%{opacity:.7} 50%{opacity:1} }
          .catBody { animation: catBreathe 3.4s ease-in-out infinite; transform-origin: 60px 76px; }
          .z1 { animation: floatZ 3s ease-out infinite; }
          .z2 { animation: floatZ 3s ease-out infinite .9s; }
          .star { animation: twinkle 2.2s ease-in-out infinite; }
          .moon { animation: moonGlow 4s ease-in-out infinite; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#nightSky)" />
        <circle className="star" cx="24" cy="28" r="1.2" fill="#fef3c7" />
        <circle className="star" cx="92" cy="22" r="1.5" fill="#fef3c7" />
        <g className="moon">
          <circle cx="94" cy="32" r="8" fill="#fef3c7" />
          <circle cx="97" cy="29" r="7" fill="#1a2547" />
        </g>
        <ellipse cx="60" cy="98" rx="42" ry="8" fill="#0f1833" opacity="0.7" />
        <g className="catBody">
          <ellipse cx="58" cy="82" rx="32" ry="18" fill="url(#catFur)" />
          <path d="M88 82 Q98 80 100 88 Q98 94 92 92" stroke="url(#catFur)" strokeWidth="6" fill="none" strokeLinecap="round" />
          <ellipse cx="38" cy="78" rx="16" ry="14" fill="url(#catFur)" />
          <path d="M28 68 L26 60 L34 66 Z" fill="url(#catFur)" />
          <path d="M46 68 L52 60 L48 70 Z" fill="url(#catFur)" />
          <path d="M31 78 Q34 81 37 78" stroke="#3a2417" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M41 78 Q44 81 47 78" stroke="#3a2417" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
        <g fontFamily="ui-rounded, system-ui" fontWeight="900" fill="#fbbf24">
          <text className="z1" x="72" y="60" fontSize="11">Z</text>
          <text className="z1" x="78" y="58" fontSize="13" style={{ animationDelay: "0.9s" }}>Z</text>
        </g>
      </svg>
    </div>
  );
}

function MorningCatSVG() {
  return (
    <div className="relative w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <radialGradient id="mornSky" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#fb923c" />
          </radialGradient>
          <linearGradient id="mornFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
          <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fef08a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes catStretch { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02,1.03)} }
          @keyframes tailWag { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-6deg)} }
          .catStretch { animation: catStretch 3s ease-in-out infinite; transform-origin: 60px 82px; }
          .tail { animation: tailWag 1.8s ease-in-out infinite; transform-origin: 88px 84px; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#mornSky)" />
        <circle cx="60" cy="78" r="24" fill="url(#sunGrad)" />
        <ellipse cx="60" cy="100" rx="46" ry="6" fill="#7c2d12" opacity="0.25" />
        <g className="catStretch">
          <path className="tail" d="M88 84 Q100 80 102 88" stroke="url(#mornFur)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M30 88 Q40 70 60 74 Q78 78 88 86 L88 94 Q60 96 30 94 Z" fill="url(#mornFur)" />
          <ellipse cx="42" cy="72" rx="14" ry="12" fill="url(#mornFur)" />
          <path d="M32 62 L30 54 L38 60 Z" fill="url(#mornFur)" />
          <path d="M50 62 L56 54 L52 64 Z" fill="url(#mornFur)" />
          <ellipse cx="36" cy="72" rx="1.8" ry="2.2" fill="#3a2417" />
          <ellipse cx="48" cy="72" rx="1.8" ry="2.2" fill="#3a2417" />
        </g>
      </svg>
    </div>
  );
}

function AfternoonCatSVG() {
  return (
    <div className="relative w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <linearGradient id="aftSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#93c5fd" />
            <stop offset="1" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id="aftFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes ballBounce { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-3px,-5px)} }
          @keyframes tailIdle { 0%,100%{transform:rotate(0)} 40%{transform:rotate(-8deg)} 70%{transform:rotate(5deg)} }
          .ball { animation: ballBounce 1.6s ease-in-out infinite; }
          .tailIdle { animation: tailIdle 2.4s ease-in-out infinite; transform-origin: 88px 88px; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#aftSky)" />
        <ellipse cx="60" cy="100" rx="46" ry="6" fill="#78716c" opacity="0.2" />
        <g className="ball">
          <circle cx="26" cy="90" r="7" fill="#ef4444" />
        </g>
        <g>
          <path className="tailIdle" d="M86 88 Q98 82 100 92" stroke="url(#aftFur)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M52 92 Q48 74 62 68 Q80 66 84 84 Q86 92 84 96 L52 96 Z" fill="url(#aftFur)" />
          <ellipse cx="58" cy="58" rx="16" ry="15" fill="url(#aftFur)" />
          <path d="M46 48 L44 38 L54 46 Z" fill="url(#aftFur)" />
          <path d="M68 48 L74 38 L70 50 Z" fill="url(#aftFur)" />
          <ellipse cx="52" cy="58" rx="2.6" ry="3.2" fill="#ffffff" />
          <ellipse cx="64" cy="58" rx="2.6" ry="3.2" fill="#ffffff" />
          <circle cx="52.5" cy="58.5" r="1.6" fill="#1f2937" />
          <circle cx="64.5" cy="58.5" r="1.6" fill="#1f2937" />
        </g>
      </svg>
    </div>
  );
}

function EveningCatSVG() {
  return (
    <div className="relative w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <linearGradient id="eveSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fb923c" />
            <stop offset="0.5" stopColor="#f472b6" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="eveFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
          <radialGradient id="eveSun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fef08a" />
            <stop offset="1" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
        <style>{`
          @keyframes tailSway { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-5deg)} }
          @keyframes starFade { 0%,100%{opacity:0} 40%,60%{opacity:.9} }
          .tailSway { animation: tailSway 3s ease-in-out infinite; transform-origin: 84px 90px; }
          .star { animation: starFade 5s ease-in-out infinite; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#eveSky)" />
        <circle className="star" cx="22" cy="22" r="1.2" fill="#ffffff" />
        <circle cx="60" cy="78" r="22" fill="url(#eveSun)" />
        <ellipse cx="60" cy="100" rx="46" ry="8" fill="#7c2d12" opacity="0.35" />
        <g>
          <path className="tailSway" d="M84 92 Q96 88 98 96" stroke="url(#eveFur)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M56 94 Q54 76 66 70 Q82 68 84 88 Q84 94 82 98 L56 98 Z" fill="url(#eveFur)" />
          <ellipse cx="62" cy="60" rx="15" ry="14" fill="url(#eveFur)" />
          <path d="M50 50 L48 40 L58 48 Z" fill="url(#eveFur)" />
          <path d="M72 50 L78 40 L74 52 Z" fill="url(#eveFur)" />
          <ellipse cx="56" cy="60" rx="2.4" ry="3" fill="#ffffff" />
          <circle cx="56.3" cy="60.5" r="1.5" fill="#1f2937" />
        </g>
      </svg>
    </div>
  );
}

function TimeIllustration({ slot }: { slot: TimeSlot }) {
  if (slot === "night") return <SleepingCatSVG />;
  if (slot === "morning") return <MorningCatSVG />;
  if (slot === "afternoon") return <AfternoonCatSVG />;
  return <EveningCatSVG />;
}

/* ────────────────────────────────────────────────────────────────── */
/* Chip EMV                                                           */
/* ────────────────────────────────────────────────────────────────── */

function ChipSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 42 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="dbChipGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="0.5" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="42" height="32" rx="5" fill="url(#dbChipGold)" />
      <path d="M0 11 H42 M0 21 H42 M14 0 V32 M28 0 V32" stroke="#78350F" strokeWidth="0.7" opacity="0.55" />
      <rect x="15" y="11" width="12" height="10" rx="2" fill="#FCD34D" opacity="0.55" />
      <rect x="0.5" y="0.5" width="41" height="31" rx="4.5" stroke="#78350F" strokeOpacity="0.35" fill="none" />
    </svg>
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/* ────────────────────────────────────────────────────────────────── */
/* BalanceFlipCard                                                    */
/* ────────────────────────────────────────────────────────────────── */

function BalanceFlipCard({
  balance,
  name,
  loading,
  balanceLocal,
}: {
  balance: number;
  name: string;
  loading: boolean;
  balanceLocal: string | null;
}) {
  const [flipped, setFlipped] = useState(false);

  const holder = (name || "UTILISATEUR").toUpperCase();
  const customerId = useMemo(
    () => `TX-${Math.abs(hashString(holder)).toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`,
    [holder]
  );

  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: 1400, aspectRatio: "1.75 / 1", maxHeight: 240 }}
      onClick={() => setFlipped(f => !f)}
      role="button"
      aria-label={flipped ? "Voir le solde" : "Voir les informations du compte"}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(f => !f); } }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDeep} 100%)`,
          }}
        >
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.06)" }} />

          <div className="relative h-full flex flex-col p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white font-black text-sm tracking-[0.28em] leading-none">TEXERRA</div>
                <div className="text-white/60 text-[9px] font-semibold tracking-widest uppercase mt-1">Portefeuille</div>
              </div>
              <ChipSVG className="w-9 h-7 drop-shadow-md" />
            </div>

            <div className="flex-1 flex flex-col justify-center py-2">
              <div className="text-white/60 text-[9px] font-semibold tracking-widest uppercase mb-1">Solde disponible</div>
              {loading ? (
                <div className="h-10 w-36 bg-white/15 rounded-lg animate-pulse" />
              ) : (
                <div className="text-white text-3xl sm:text-4xl font-black tabular-nums leading-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
                  {balance.toFixed(2)}
                  <span className="text-xl sm:text-2xl ml-1.5 font-bold">€</span>
                </div>
              )}
              {balanceLocal && (
                <div className="text-white/75 text-xs font-semibold mt-1.5">≈ {balanceLocal}</div>
              )}
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white/55 text-[8px] font-bold tracking-widest uppercase mb-0.5">Titulaire</div>
                <div className="text-white font-bold text-xs sm:text-sm tracking-wider uppercase truncate max-w-[180px]">{holder}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-white/55 text-[8px] font-bold tracking-widest uppercase mb-0.5">Devise</div>
                <div className="text-white font-bold text-xs sm:text-sm tracking-wider">EUR</div>
              </div>
            </div>
          </div>

          <div className="absolute top-3 right-14 text-white/50 text-[9px] font-bold tracking-widest uppercase pointer-events-none">
            Cliquer ↻
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: `linear-gradient(135deg, ${BRAND.primaryDeep} 0%, #4A1E0F 100%)`,
          }}
        >
          <div className="absolute top-6 left-0 right-0 h-8 bg-black/85" />

          <div className="relative h-full flex flex-col p-5 sm:p-6 pt-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-8 rounded bg-white/85 flex items-center justify-end px-3">
                <span className="font-mono text-[10px] text-gray-500 tracking-widest">•••</span>
              </div>
              <div className="text-white/70 text-[10px] font-mono tracking-widest">ID: {customerId}</div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-3 text-white/90">
                <div>
                  <div className="text-white/50 text-[8px] font-bold tracking-widest uppercase mb-0.5">Type</div>
                  <div className="text-xs font-bold">Standard</div>
                </div>
                <div>
                  <div className="text-white/50 text-[8px] font-bold tracking-widest uppercase mb-0.5">Statut</div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Actif
                  </div>
                </div>
                <div>
                  <div className="text-white/50 text-[8px] font-bold tracking-widest uppercase mb-0.5">Expiration</div>
                  <div className="text-xs font-bold">Permanent</div>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="text-white/55 text-[9px] font-medium leading-tight max-w-[70%]">
                Cette carte représente votre solde virtuel Texerra. Elle n'est pas un instrument bancaire.
              </div>
              <div className="text-white/40 text-[9px] font-bold tracking-widest">TEXERRA</div>
            </div>
          </div>

          <div className="absolute top-3 right-4 text-white/50 text-[9px] font-bold tracking-widest uppercase pointer-events-none">
            Cliquer ↻
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* StatusBadge — la description s'affiche inline (wrap correct)      */
/* ────────────────────────────────────────────────────────────────── */

function StatusBadge({
  status,
  expandable = true,
  size = "md",
}: {
  status: string;
  expandable?: boolean;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const meta = getStatusMeta(status);
  const Icon = meta.Icon;

  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <div className="inline-flex flex-col items-end max-w-full">
      <button
        type="button"
        onClick={(e) => {
          if (!expandable) return;
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap transition-all ${padding}`}
        style={{
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          color: meta.fg,
          cursor: expandable ? "help" : "default",
        }}
        aria-expanded={open}
      >
        <Icon className={`${iconSize} ${status === "active" ? "animate-spin" : ""}`} />
        {meta.label}
        {expandable && (open ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />)}
      </button>

      <AnimatePresence initial={false}>
        {open && expandable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden w-full"
          >
            <div
              className="mt-2 rounded-xl px-3 py-2 text-[11px] leading-relaxed flex items-start gap-2 text-left max-w-xs sm:max-w-sm"
              style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.fg }}
            >
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="break-words">{meta.description}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* ActiveOrderCard                                                    */
/* ────────────────────────────────────────────────────────────────── */

function ActiveOrderCard({ orderId, currency }: { orderId: string; currency?: string | null }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string>("");
  const [remaining, setRemaining] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const { data: order } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur chargement commande");
      return res.json();
    },
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return 2500;
      if (d.status === "completed" || d.status === "cancelled" || d.status === "expired") return false;
      return 2500;
    },
  });

  useEffect(() => {
    if (order?.status === "completed" || order?.status === "expired" || order?.status === "cancelled") {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    }
  }, [order?.status, queryClient]);

  useEffect(() => {
    if (!order?.expiresAt || order.status !== "active") return;
    setRemaining(timeRemaining(order.expiresAt));
    const timer = setInterval(() => setRemaining(timeRemaining(order.expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [order?.expiresAt, order?.status]);

  if (!order) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: `1px solid ${BRAND.border}` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse shrink-0" />
            <div className="space-y-2 min-w-0">
              <div className="h-3 w-24 bg-gray-100 animate-pulse rounded" />
              <div className="h-2 w-32 bg-gray-100 animate-pulse rounded" />
            </div>
          </div>
          <div className="h-6 w-24 bg-gray-100 animate-pulse rounded-full" />
        </div>
        <div className="h-14 bg-gray-50 animate-pulse rounded-xl" />
      </div>
    );
  }

  const meta = getStatusMeta(order.status);
  const iconUrl = svcIconUrl(order.serviceCode, order.serviceIcon);
  const country = resolveCountryFromPhone(order.phoneNumber, order.countryCode);
  const displayService = serviceDisplayName(order.serviceCode);
  const localPrice = order.price !== undefined ? formatLocalPrice(order.price, currency) : null;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <motion.div
      variants={listItem}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      style={{ border: `1px solid ${BRAND.border}` }}
    >
      <div className="h-1 w-full" style={{ background: meta.dot }} />

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: BRAND.borderSoft, border: `1px solid ${BRAND.border}` }}
            >
              {!imageError && iconUrl ? (
                <img src={iconUrl} alt={order.serviceCode} onError={() => setImageError(true)} className="w-7 h-7 object-contain" />
              ) : (
                <span className="text-sm font-bold text-gray-400 uppercase">{order.serviceCode?.slice(0, 2)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base text-gray-900 truncate">{displayService}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-base leading-none">{isoToFlagEmoji(country.iso)}</span>
                <span className="truncate">{country.name}</span>
                {order.price !== undefined && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="font-medium">{Number(order.price).toFixed(2)} €</span>
                    {localPrice && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="font-medium" style={{ color: BRAND.primaryDark }}>≈ {localPrice}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={order.status} size="sm" />
        </div>

        {order.phoneNumber && (
          <div
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-3"
            style={{ background: BRAND.borderSoft, border: `1px solid ${BRAND.border}` }}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Numéro attribué</span>
              <span className="font-mono font-bold text-base tracking-wide text-gray-900 break-all">{order.phoneNumber}</span>
            </div>
            <button
              onClick={() => copyText(order.phoneNumber!, "phone")}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border transition-all active:scale-95 shrink-0"
              style={{ borderColor: BRAND.border }}
              aria-label="Copier le numéro"
            >
              {copied === "phone" ? <CheckCircle2 className="w-4 h-4" style={{ color: BRAND.success }} /> : <Copy className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        )}

        {order.smsCode && (
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mb-3"
            style={{ background: BRAND.successSoft, border: `1px solid ${BRAND.successBorder}` }}
          >
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider mb-0.5" style={{ color: "#166534" }}>Code de vérification</div>
              <span className="font-mono font-black text-xl tracking-[0.15em] break-all" style={{ color: "#166534" }}>{order.smsCode}</span>
            </div>
            <button
              onClick={() => copyText(order.smsCode!, "code")}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm transition-all active:scale-95 shrink-0"
              style={{ border: `1px solid ${BRAND.successBorder}`, color: BRAND.success }}
              aria-label="Copier le code"
            >
              {copied === "code" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </motion.div>
        )}

        {remaining && order.status === "active" && (
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Expire dans</span>
            <span className="font-mono font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded">{remaining}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* PastOrderCard — version dépliable                                  */
/* ────────────────────────────────────────────────────────────────── */

function PastOrderCard({
  order,
  currency,
  expanded,
  onToggleExpand,
}: {
  order: Order;
  currency?: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [copied, setCopied] = useState<string>("");
  const [imageError, setImageError] = useState(false);

  const meta = getStatusMeta(order.status);
  const date = new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const iconUrl = svcIconUrl(order.serviceCode, order.serviceIcon);
  const country = resolveCountryFromPhone(order.phoneNumber, order.countryCode);
  const displayService = serviceDisplayName(order.serviceCode);
  const localPrice = order.price !== undefined ? formatLocalPrice(order.price, currency) : null;

  const phoneWithPrefix = order.phoneNumber ?? "";
  const phoneWithoutPrefix = phoneWithPrefix.replace(/^\+\d{1,4}/, "").replace(/\D/g, "");

  const copyText = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <motion.div
      variants={listItem}
      layout
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${BRAND.border}` }}
    >
      {/* Liseré statut */}
      <div className="h-1 w-full" style={{ background: meta.dot }} />

      {/* Header cliquable pour déplier/replier */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50"
        aria-expanded={expanded}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: BRAND.borderSoft, border: `1px solid ${BRAND.border}` }}
        >
          {!imageError && iconUrl ? (
            <img src={iconUrl} alt={order.serviceCode} onError={() => setImageError(true)} className="w-6 h-6 object-contain" />
          ) : (
            <span className="text-xs font-bold text-gray-400 uppercase">{order.serviceCode?.slice(0, 2)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-gray-900 truncate">{displayService}</span>
            <span className="text-[11px] text-gray-500 flex items-center gap-1">
              <span className="leading-none">{isoToFlagEmoji(country.iso)}</span>
              <span className="truncate">{country.name}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
            <span>{date}</span>
            <span className="opacity-40">·</span>
            <span className="font-bold text-gray-800">
              {order.price !== undefined ? `${Number(order.price).toFixed(2)} €` : "—"}
            </span>
            {localPrice && (
              <>
                <span className="opacity-40">·</span>
                <span className="font-semibold" style={{ color: BRAND.primaryDark }}>≈ {localPrice}</span>
              </>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
            style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.fg }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
            {meta.label}
          </span>
        </div>

        <div
          className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-transform"
          style={{
            background: BRAND.borderSoft,
            color: BRAND.inkMuted,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
          aria-hidden
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {/* Statut mobile (pleine largeur, sous le header) */}
      <div className="sm:hidden px-4 pb-3 -mt-1 flex justify-end">
        <StatusBadge status={order.status} size="sm" />
      </div>

      {/* Détails dépliés */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-1 space-y-3"
              style={{ borderTop: `1px dashed ${BRAND.border}` }}
            >
              {/* Statut desktop */}
              <div className="hidden sm:flex justify-end pt-3">
                <StatusBadge status={order.status} size="sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Numéro */}
                <div
                  className="rounded-xl p-3 min-w-0"
                  style={{ background: BRAND.borderSoft, border: `1px solid ${BRAND.border}` }}
                >
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Numéro utilisé</div>
                  {order.phoneNumber ? (
                    <>
                      <div className="font-mono font-bold text-xs text-gray-900 mb-2 break-all">{order.phoneNumber}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => copyText(phoneWithPrefix, "phone-with")}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border text-[10px] font-semibold text-gray-700 hover:shadow-sm transition-all"
                          style={{ borderColor: BRAND.border }}
                        >
                          {copied === "phone-with" ? <CheckCircle2 className="w-3 h-3" style={{ color: BRAND.success }} /> : <Copy className="w-3 h-3" />}
                          Avec {country.callingCode}
                        </button>
                        <button
                          onClick={() => copyText(phoneWithoutPrefix, "phone-without")}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border text-[10px] font-semibold text-gray-500 hover:shadow-sm transition-all"
                          style={{ borderColor: BRAND.border }}
                        >
                          {copied === "phone-without" ? <CheckCircle2 className="w-3 h-3" style={{ color: BRAND.success }} /> : <Copy className="w-3 h-3" />}
                          Sans indicatif
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-gray-400 italic">Indisponible</div>
                  )}
                </div>

                {/* Code SMS */}
                <div
                  className="rounded-xl p-3 min-w-0"
                  style={{
                    background: order.smsCode ? BRAND.successSoft : BRAND.borderSoft,
                    border: `1px solid ${order.smsCode ? BRAND.successBorder : BRAND.border}`,
                  }}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: order.smsCode ? "#166534" : "#6B7280" }}>
                    {order.smsCode ? "Code reçu" : "Code SMS"}
                  </div>
                  {order.smsCode ? (
                    <>
                      <div className="font-mono font-black text-base tracking-wider mb-2 break-all" style={{ color: "#166534" }}>{order.smsCode}</div>
                      <button
                        onClick={() => copyText(order.smsCode!, "code")}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border text-[10px] font-bold transition-all"
                        style={{ borderColor: BRAND.successBorder, color: BRAND.success }}
                      >
                        {copied === "code" ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Copier
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="w-4 h-4 opacity-60" />
                      <span className="text-[11px] font-semibold">Aucun code</span>
                    </div>
                  )}
                </div>

                {/* Prix + action */}
                <div
                  className="rounded-xl p-3 flex flex-col justify-between gap-2"
                  style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
                >
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Montant payé</div>
                    <div className="font-black text-lg text-gray-900 leading-tight">
                      {order.price !== undefined ? `${Number(order.price).toFixed(2)} €` : "—"}
                    </div>
                    {localPrice && (
                      <div className="text-[11px] font-bold mt-0.5" style={{ color: BRAND.primaryDark }}>≈ {localPrice}</div>
                    )}
                  </div>
                  <Link
                    href={`/order?service=${order.serviceCode}&country=${order.countryCode}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: BRAND.primary }}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Recommander
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Filtres — sobres, sans points colorés                             */
/* ────────────────────────────────────────────────────────────────── */

type OrderFilter = "all" | "completed" | "active" | "cancelled" | "expired";

const FILTER_OPTIONS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "completed", label: "Réussies" },
  { value: "active", label: "En cours" },
  { value: "cancelled", label: "Annulées" },
  { value: "expired", label: "Expirées" },
];

function OrderFilters({
  value,
  onChange,
  counts,
}: {
  value: OrderFilter;
  onChange: (v: OrderFilter) => void;
  counts: Record<OrderFilter, number>;
}) {
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto scrollbar-hide p-1 rounded-xl"
      style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
    >
      {FILTER_OPTIONS.map(f => {
        const active = value === f.value;
        const count = counts[f.value] ?? 0;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            style={
              active
                ? { background: BRAND.ink, color: "#ffffff" }
                : { color: BRAND.inkMuted, background: "transparent" }
            }
          >
            {f.label}
            <span
              className="text-[10px] font-mono tabular-nums"
              style={{ opacity: active ? 0.7 : 0.5 }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Vue Toggle liste / carrousel                                       */
/* ────────────────────────────────────────────────────────────────── */

type ViewMode = "list" | "carousel";

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      className="inline-flex items-center rounded-lg p-0.5"
      style={{ background: BRAND.borderSoft, border: `1px solid ${BRAND.border}` }}
    >
      <button
        onClick={() => onChange("list")}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
        style={value === "list" ? { background: BRAND.surface, color: BRAND.ink, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } : { color: BRAND.inkMuted }}
        title="Vue liste"
        aria-label="Vue liste"
      >
        <LayoutList className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Liste</span>
      </button>
      <button
        onClick={() => onChange("carousel")}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
        style={value === "carousel" ? { background: BRAND.surface, color: BRAND.ink, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } : { color: BRAND.inkMuted }}
        title="Vue carrousel"
        aria-label="Vue carrousel"
      >
        <GalleryHorizontal className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Carrousel</span>
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* RechargesTab                                                       */
/* ────────────────────────────────────────────────────────────────── */

function RechargesTab({ currency }: { currency?: string | null }) {
  const { data: topups, isLoading } = useQuery<Topup[]>({
    queryKey: ["/api/topups"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/topups", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur chargement recharges");
      return res.json();
    },
  });

  const topupStatusConfig = {
    pending: { label: "En attente", fg: "#92400E", bg: BRAND.warnSoft, border: BRAND.warnBorder, dot: BRAND.warn },
    completed: { label: "Crédité", fg: "#166534", bg: BRAND.successSoft, border: BRAND.successBorder, dot: BRAND.success },
    failed: { label: "Échoué", fg: "#991B1B", bg: BRAND.dangerSoft, border: BRAND.dangerBorder, dot: BRAND.danger },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: BRAND.borderSoft }} />
        ))}
      </div>
    );
  }

  if (!topups || topups.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16 rounded-3xl"
        style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: BRAND.primarySoft }}
        >
          <Receipt className="w-8 h-8" style={{ color: BRAND.primary }} />
        </div>
        <h3 className="text-lg font-bold mb-2 text-gray-900">Aucune recharge effectuée</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
          Rechargez votre solde pour pouvoir commander des numéros virtuels. Toutes vos recharges apparaîtront ici.
        </p>
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl text-sm transition-all hover:opacity-90 active:scale-95"
          style={{ background: BRAND.primary }}
        >
          Recharger mon solde <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    );
  }

  const totalCredited = topups
    .filter(t => t.status === "completed")
    .reduce((sum, t) => sum + (Number(t.amountEur) || 0), 0);

  const totalLocal = formatLocalPrice(totalCredited, currency);

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-5">
      <motion.div
        variants={listItem}
        className="rounded-2xl p-5"
        style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: BRAND.primarySoft, color: BRAND.primary }}
            >
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider font-bold text-gray-500">Total crédité</div>
              <div className="text-2xl font-black text-gray-900">{totalCredited.toFixed(2)} €</div>
              {totalLocal && (
                <div className="text-xs font-bold mt-0.5" style={{ color: BRAND.primaryDark }}>≈ {totalLocal}</div>
              )}
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: BRAND.borderSoft, border: `1px solid ${BRAND.border}` }}
          >
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-bold text-gray-700">{topups.length} opération{topups.length > 1 ? "s" : ""}</span>
          </div>
        </div>
      </motion.div>

      <div className="space-y-3">
        {topups.map(t => {
          const cfg = topupStatusConfig[t.status as keyof typeof topupStatusConfig] ?? topupStatusConfig.pending;
          const date = new Date(t.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
          const time = new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
          const localAmount = formatLocalPrice(Number(t.amountEur), currency);

          return (
            <motion.div
              key={t.id}
              variants={listItem}
              className="rounded-2xl p-4 transition-shadow hover:shadow-md"
              style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    {t.status === "completed" ? (
                      <BadgeCheck className="w-5 h-5" style={{ color: cfg.fg }} />
                    ) : t.status === "failed" ? (
                      <XCircle className="w-5 h-5" style={{ color: cfg.fg }} />
                    ) : (
                      <Clock className="w-5 h-5" style={{ color: cfg.fg }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Recharge</div>
                    <div className="text-xl font-black text-gray-900 leading-tight">
                      +{Number(t.amountEur).toFixed(2)} €
                    </div>
                    {localAmount && (
                      <div className="text-xs font-bold mt-0.5" style={{ color: BRAND.primaryDark }}>≈ {localAmount}</div>
                    )}
                  </div>
                </div>

                <span
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.fg }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                  {cfg.label}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3 text-[11px] text-gray-500 flex-wrap" style={{ borderTop: `1px dashed ${BRAND.border}` }}>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {date}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {time}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* ProfileTab                                                         */
/* ────────────────────────────────────────────────────────────────── */

type EditableField = "name" | "phone" | null;

function ProfileTab({ me }: { me: UserProfile }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditableField>(null);
  const [name, setName] = useState(me.name ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [error, setError] = useState("");
  const [savingCurrency, setSavingCurrency] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data: { name?: string; phone?: string; currency?: string }) => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Erreur mise à jour profil");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    }
  });

  const initials = (me.name ?? me.email ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const handleSaveName = () => {
    if (!name.trim()) { setError("Le nom ne peut pas être vide"); return; }
    setError("");
    updateMutation.mutate({ name: name.trim() }, {
      onSuccess: () => { setEditing(null); },
      onError: () => setError("Erreur lors de la mise à jour"),
    });
  };

  const handleSavePhone = () => {
    setError("");
    updateMutation.mutate({ phone: phone.trim() }, {
      onSuccess: () => { setEditing(null); },
      onError: () => setError("Erreur lors de la mise à jour"),
    });
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setSavingCurrency(true);
    updateMutation.mutate({ currency: newCurrency }, {
      onSettled: () => setSavingCurrency(false),
    });
  };

  const handleCancel = () => {
    setName(me.name ?? "");
    setPhone(me.phone ?? "");
    setEditing(null);
    setError("");
  };

  const localCurrency = getCurrency(me.currency ?? "EUR");

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
      <div
        className="rounded-3xl p-6 sm:p-8 space-y-6"
        style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {me.avatarUrl ? (
            <img src={me.avatarUrl} alt={me.name ?? ""} className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold shrink-0"
              style={{ background: BRAND.primarySoft, color: BRAND.primary }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-extrabold text-xl text-gray-900 mb-1 truncate">{me.name ?? "Mon Profil"}</div>
            <div
              className="inline-flex items-center px-3 py-1 rounded-full text-sm text-gray-600 font-medium max-w-full"
              style={{ background: BRAND.borderSoft }}
            >
              <span className="truncate">{me.email}</span>
            </div>
          </div>
        </div>

        <hr style={{ borderColor: BRAND.border }} />

        <div className="space-y-6">
          {/* Nom */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Nom affiché</label>
            {editing === "name" ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ background: BRAND.borderSoft, border: `1px solid ${BRAND.primary}` }}
                  placeholder="Votre nom"
                />
                {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={updateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: BRAND.primary }}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors active:scale-95"
                    style={{ border: `1px solid ${BRAND.border}`, color: BRAND.inkMuted }}
                  >
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl transition-colors flex-wrap"
                style={{ background: BRAND.borderSoft }}
              >
                <span className="text-sm font-medium text-gray-900 min-w-0 truncate">{me.name ?? <span className="text-gray-400 italic">Non défini</span>}</span>
                <button
                  onClick={() => { setEditing("name"); setError(""); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm shrink-0"
                  style={{ border: `1px solid ${BRAND.border}` }}
                >
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
              </div>
            )}
          </div>

          {/* Téléphone */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Numéro de téléphone
            </label>
            <p className="text-[11px] text-gray-500 mb-2">Utilisé automatiquement pour vos recharges Mobile Money.</p>
            {editing === "phone" ? (
              <div className="space-y-3">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ background: BRAND.borderSoft, border: `1px solid ${BRAND.primary}` }}
                  placeholder="+237 6 XX XX XX XX"
                />
                {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleSavePhone}
                    disabled={updateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: BRAND.primary }}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors active:scale-95"
                    style={{ border: `1px solid ${BRAND.border}`, color: BRAND.inkMuted }}
                  >
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl transition-colors flex-wrap"
                style={{ background: BRAND.borderSoft }}
              >
                {me.phone ? (
                  <span className="text-sm font-mono font-bold tracking-wide text-gray-900 break-all">{me.phone}</span>
                ) : (
                  <span className="text-sm text-gray-400 italic">Non renseigné</span>
                )}
                <button
                  onClick={() => { setEditing("phone"); setError(""); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm shrink-0"
                  style={{ border: `1px solid ${BRAND.border}` }}
                >
                  <Pencil className="w-3.5 h-3.5" /> {me.phone ? "Modifier" : "Ajouter"}
                </button>
              </div>
            )}
          </div>

          {/* Devise */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Devise locale
            </label>
            <p className="text-[11px] text-gray-500 mb-2">Affiche l'équivalent dans votre monnaie lors des recharges.</p>
            <div className="relative">
              <select
                value={me.currency ?? "EUR"}
                onChange={e => handleCurrencyChange(e.target.value)}
                disabled={savingCurrency}
                className="w-full px-5 py-3.5 rounded-xl text-sm font-medium focus:outline-none appearance-none cursor-pointer disabled:opacity-60 transition-all pr-10"
                style={{ background: BRAND.borderSoft, border: `1px solid ${BRAND.border}` }}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
                ))}
              </select>
              {savingCurrency ? (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: BRAND.primary }} />
              ) : (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ChevronDown className="w-5 h-5" />
                </div>
              )}
            </div>
            {localCurrency && localCurrency.code !== "EUR" && (
              <p
                className="text-xs font-medium text-gray-600 mt-2 inline-block px-2.5 py-1 rounded-md"
                style={{ background: BRAND.borderSoft }}
              >
                Taux indicatif : 1 € ≈ {localCurrency.rateFromEur.toLocaleString("fr-FR")} {localCurrency.symbol}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* ImportantNotice                                                    */
/* ────────────────────────────────────────────────────────────────── */

function ImportantNotice() {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${BRAND.primary}33`, background: BRAND.primarySoft }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: BRAND.primary, color: "#ffffff" }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm" style={{ color: BRAND.primaryDark }}>
              Comment recevoir un SMS&nbsp;?
            </div>
            <div className="text-[11px] text-gray-600 truncate">
              Conseils pratiques pour maximiser vos chances de réception.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold shrink-0" style={{ color: BRAND.primary }}>
          {open ? "Masquer" : "Lire"}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 text-sm text-gray-700 space-y-4">
              <div>
                <div className="font-bold text-xs mb-1.5" style={{ color: BRAND.primaryDark }}>Procédure</div>
                <ol className="space-y-1.5 text-[13px] list-decimal pl-5">
                  <li>Copiez le numéro virtuel attribué dans votre commande.</li>
                  <li>Collez-le dans le formulaire d'inscription du service concerné (WhatsApp, Telegram, Google, etc.).</li>
                  <li>Le code de vérification s'affichera automatiquement ici dès sa réception.</li>
                </ol>
                <p className="text-xs text-gray-500 mt-2">
                  Délai moyen de réception&nbsp;: <strong className="text-gray-700">2 à 7 minutes</strong>.
                </p>
              </div>

              <div>
                <div className="font-bold text-xs mb-1.5" style={{ color: BRAND.primaryDark }}>Si aucun SMS n'arrive</div>
                <p className="text-[13px]">
                  Le montant de la commande sera automatiquement recrédité sur votre solde à l'expiration du numéro. Vous ne perdez donc rien.
                </p>
              </div>

              <div className="pt-3" style={{ borderTop: `1px dashed ${BRAND.primary}33` }}>
                <div className="font-bold text-xs mb-2" style={{ color: BRAND.primaryDark }}>Conseils pour améliorer la réception</div>
                <ul className="space-y-1.5 text-[13px]">
                  {[
                    "Essayez un autre numéro ou un autre pays.",
                    "Changez de réseau (Wi-Fi / données mobiles) ou utilisez un VPN.",
                    "Déconnectez-vous des autres comptes sur le même appareil avant l'inscription.",
                    "Attendez la fin du compte à rebours avant de relancer une nouvelle commande.",
                  ].map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: BRAND.primary }} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
                style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
              >
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: BRAND.primary }} />
                <span className="text-gray-600">
                  Aucun système ne garantit une réception à 100 %. Certains services bloquent les numéros virtuels. Si cela arrive, essayez un autre fournisseur ou un autre pays.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Skeletons                                                          */
/* ────────────────────────────────────────────────────────────────── */

function OrderCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
    >
      <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-28 bg-gray-100 animate-pulse rounded" />
        <div className="h-2 w-40 bg-gray-100 animate-pulse rounded" />
      </div>
      <div className="h-6 w-16 bg-gray-100 animate-pulse rounded-full shrink-0" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Navigation mobile du bas                                           */
/* ────────────────────────────────────────────────────────────────── */

function MobileNav({
  currentTab,
  onSelectTab,
}: {
  currentTab: DashTab;
  onSelectTab: (t: DashTab) => void;
}) {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden px-3 pb-[max(env(safe-area-inset-bottom),10px)] pt-2"
      style={{
        background: "linear-gradient(180deg, rgba(249,250,251,0) 0%, rgba(249,250,251,0.96) 25%, rgba(249,250,251,1) 100%)",
      }}
    >
      <div
        className="flex items-center gap-2 rounded-3xl p-1.5"
        style={{
          background: BRAND.surface,
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
        }}
      >
        {/* Recharges */}
        <button
          onClick={() => onSelectTab("topups")}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl transition-all active:scale-95"
          style={
            currentTab === "topups"
              ? { background: BRAND.primarySoft, color: BRAND.primaryDark }
              : { color: BRAND.inkMuted }
          }
          aria-label="Historique des recharges"
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-bold">Recharges</span>
        </button>

        {/* Nouveau numéro — action principale */}
        <Link
          href="/order"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl text-white transition-all active:scale-95"
          style={{
            background: BRAND.primary,
            boxShadow: "0 6px 16px rgba(197,90,52,0.3)",
          }}
          aria-label="Commander un nouveau numéro"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] font-bold">Nouveau</span>
        </Link>

        {/* Profil */}
        <button
          onClick={() => onSelectTab("profile")}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl transition-all active:scale-95"
          style={
            currentTab === "profile"
              ? { background: BRAND.primarySoft, color: BRAND.primaryDark }
              : { color: BRAND.inkMuted }
          }
          aria-label="Mon profil"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">Profil</span>
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Dashboard                                                          */
/* ────────────────────────────────────────────────────────────────── */

type DashTab = "orders" | "topups" | "profile";
type ViewMode = "list" | "carousel";

const TAB_KEY = "texerra:dashboard:tab";
const FILTER_KEY = "texerra:dashboard:filter";
const VISIBLE_KEY = "texerra:dashboard:visible";
const VIEW_KEY = "texerra:dashboard:view";
const EXPANDED_KEY = "texerra:dashboard:expanded";

export default function Dashboard() {
  useMeta({
    title: "Tableau de bord — Mes commandes et mon solde | Texerra",
    description: "Gérez vos commandes de numéros virtuels, suivez vos codes SMS reçus et consultez votre historique de recharges sur Texerra.",
    canonical: "https://texerra.site/dashboard",
    noindex: true,
    image: "https://raw.githubusercontent.com/exaucenapopolo/Texerra/refs/heads/main/public/logo-full.png",
    type: "website"
  });

  const { data: me, isLoading: loadingMe } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur profil");
      return res.json();
    },
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/orders", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur commandes");
      return res.json();
    },
  });

  /* Persistance */
  const [tab, setTab] = useLocalStorage<DashTab>(TAB_KEY, "orders");
  const [orderFilter, setOrderFilter] = useLocalStorage<OrderFilter>(FILTER_KEY, "all");
  const [visibleCount, setVisibleCount] = useLocalStorage<number>(VISIBLE_KEY, 3);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>(VIEW_KEY, "list");
  const [expandedIds, setExpandedIds] = useLocalStorage<string[]>(EXPANDED_KEY, []);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, [setExpandedIds]);

  const activeOrders = orders?.filter(o => o.status === "active" || o.status === "pending_payment") ?? [];
  const pastOrders = orders?.filter(o => o.status !== "active" && o.status !== "pending_payment") ?? [];
  const allOrders = orders ?? [];

  const filterCounts: Record<OrderFilter, number> = {
    all: allOrders.length,
    completed: allOrders.filter(o => o.status === "completed").length,
    active: allOrders.filter(o => o.status === "active" || o.status === "pending_payment").length,
    cancelled: allOrders.filter(o => o.status === "cancelled").length,
    expired: allOrders.filter(o => o.status === "expired").length,
  };

  const filteredPastOrders = pastOrders.filter(o => {
    if (orderFilter === "all") return true;
    if (orderFilter === "active") return o.status === "active" || o.status === "pending_payment";
    return o.status === orderFilter;
  });

  /* Limite d'affichage */
  const totalFiltered = filteredPastOrders.length;
  const visibleSlice = filteredPastOrders.slice(0, Math.max(visibleCount, 1));
  const hasMore = totalFiltered > visibleSlice.length;
  const canReduce = visibleCount > 3;

  /* Reset carousel index when list changes */
  useEffect(() => {
    if (carouselIndex >= visibleSlice.length) setCarouselIndex(0);
  }, [visibleSlice.length, carouselIndex]);

  const { greeting, subline, slot } = getGreeting(me?.name);
  const balanceLocal = me && me.balance !== undefined ? formatLocalPrice(me.balance, me.currency) : null;

  const tabs: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id: "orders", label: "Commandes", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "topups", label: "Recharges", icon: <CreditCard className="w-4 h-4" /> },
    { id: "profile", label: "Profil", icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: BRAND.canvas }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-32 sm:pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <TimeIllustration slot={slot} />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight truncate">
                {greeting}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {subline || "Gérez vos numéros, votre solde et vos commandes."}
              </p>
            </div>
          </div>

          {/* Retour aux commandes (mobile uniquement, quand on est sur un autre onglet) */}
          {tab !== "orders" && (
            <button
              onClick={() => setTab("orders")}
              className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 self-start"
              style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Mes commandes
            </button>
          )}
        </div>

        {/* Carte solde + panneau action */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 mb-6">
          <BalanceFlipCard
            balance={me?.balance ?? 0}
            name={me?.name || "Utilisateur"}
            loading={loadingMe}
            balanceLocal={balanceLocal}
          />

          <div
            className="rounded-3xl p-5 sm:p-6 flex flex-col justify-between"
            style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Prochaine étape
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1.5">
                Commander un nouveau numéro
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Choisissez un service, un pays, et recevez votre code de vérification en quelques minutes.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/order"
                className="group w-full flex items-center justify-center gap-2 py-3.5 text-white font-bold rounded-2xl text-sm transition-all hover:opacity-95 active:scale-[0.98]"
                style={{ background: BRAND.primary, boxShadow: "0 8px 20px rgba(197,90,52,0.28)" }}
              >
                <ShoppingCart className="w-4 h-4" />
                Acheter un numéro
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/wallet"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{ background: BRAND.surface, color: BRAND.ink, border: `1px solid ${BRAND.border}` }}
              >
                <Plus className="w-4 h-4" style={{ color: BRAND.primary }} />
                Recharger mon solde
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs desktop */}
        <div className="hidden sm:flex items-center gap-2 mb-6">
          {tabs.map(t => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                style={
                  isActive
                    ? { background: BRAND.ink, color: "#ffffff", boxShadow: "0 4px 12px rgba(17,24,39,0.15)" }
                    : { background: BRAND.surface, color: BRAND.inkMuted, border: `1px solid ${BRAND.border}` }
                }
              >
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "profile" ? (
              loadingMe ? (
                <div className="space-y-4">
                  <div className="h-24 rounded-3xl animate-pulse" style={{ background: BRAND.borderSoft }} />
                  <div className="h-64 rounded-3xl animate-pulse" style={{ background: BRAND.borderSoft }} />
                </div>
              ) : me ? <ProfileTab me={me} /> : null
            ) : tab === "topups" ? (
              <RechargesTab currency={me?.currency} />
            ) : (
              <>
                {/* Commandes actives */}
                {activeOrders.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                        <span className="relative flex w-2 h-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: BRAND.cool }} />
                          <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: BRAND.cool }} />
                        </span>
                        En cours d'activation
                      </h2>
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: BRAND.coolSoft, color: BRAND.cool }}
                      >
                        {activeOrders.length} active{activeOrders.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <motion.div
                      variants={listContainer}
                      initial="hidden"
                      animate="show"
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      {activeOrders.map(o => (
                        <ActiveOrderCard key={o.id} orderId={o.id} currency={me?.currency} />
                      ))}
                    </motion.div>
                  </div>
                )}

                {/* Historique */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-gray-500" />
                      Historique des commandes
                    </h2>
                    {allOrders.length > 0 && (
                      <ViewToggle value={viewMode} onChange={setViewMode} />
                    )}
                  </div>

                  {orders && orders.length > 0 && (
                    <div className="mb-4">
                      <OrderFilters value={orderFilter} onChange={setOrderFilter} counts={filterCounts} />
                    </div>
                  )}

                  {loadingOrders ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)}
                    </div>
                  ) : allOrders.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-16 rounded-3xl"
                      style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
                    >
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{ background: BRAND.primarySoft }}
                      >
                        <ShoppingBag className="w-8 h-8" style={{ color: BRAND.primary }} />
                      </div>
                      <h3 className="text-lg font-bold mb-2 text-gray-900">Votre historique est vide</h3>
                      <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                        Aucune commande pour l'instant. Commandez votre premier numéro pour recevoir un code de vérification.
                      </p>
                      <Link
                        href="/order"
                        className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl text-sm transition-all hover:opacity-90 active:scale-95"
                        style={{ background: BRAND.primary }}
                      >
                        Commander un numéro <ArrowRight className="w-4 h-4" />
                      </Link>
                    </motion.div>
                  ) : filteredPastOrders.length === 0 ? (
                    <div
                      className="text-center py-12 rounded-2xl"
                      style={{ background: BRAND.surface, border: `1px dashed ${BRAND.border}` }}
                    >
                      <Search className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-3">Aucune commande dans cette catégorie</p>
                      <button
                        onClick={() => setOrderFilter("all")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        style={{ background: BRAND.borderSoft, color: BRAND.ink }}
                      >
                        Voir toutes les commandes
                      </button>
                    </div>
                  ) : viewMode === "carousel" ? (
                    /* ═══════════ VUE CARROUSEL ═══════════ */
                    <div className="relative">
                      <div
                        className="rounded-2xl overflow-hidden"
                        style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}` }}
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={visibleSlice[carouselIndex]?.id ?? "empty"}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.18 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.18}
                            onDragEnd={(_, info) => {
                              if (info.offset.x < -60 && carouselIndex < visibleSlice.length - 1) {
                                setCarouselIndex(i => i + 1);
                              } else if (info.offset.x > 60 && carouselIndex > 0) {
                                setCarouselIndex(i => i - 1);
                              }
                            }}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            {visibleSlice[carouselIndex] && (
                              <PastOrderCard
                                order={visibleSlice[carouselIndex]}
                                currency={me?.currency}
                                expanded={true}
                                onToggleExpand={() => { /* en carrousel, toujours déplié */ }}
                              />
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Navigation carrousel */}
                      <div className="flex items-center justify-between gap-3 mt-3">
                        <button
                          onClick={() => setCarouselIndex(i => Math.max(0, i - 1))}
                          disabled={carouselIndex === 0}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                          style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
                          aria-label="Commande précédente"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {visibleSlice.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCarouselIndex(i)}
                              className="rounded-full transition-all"
                              style={{
                                width: i === carouselIndex ? 20 : 6,
                                height: 6,
                                background: i === carouselIndex ? BRAND.primary : BRAND.border,
                              }}
                              aria-label={`Aller à la commande ${i + 1}`}
                            />
                          ))}
                        </div>

                        <button
                          onClick={() => setCarouselIndex(i => Math.min(visibleSlice.length - 1, i + 1))}
                          disabled={carouselIndex >= visibleSlice.length - 1}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                          style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
                          aria-label="Commande suivante"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Contrôle du nombre affiché */}
                      {(hasMore || canReduce) && (
                        <div className="flex items-center justify-center gap-2 mt-3">
                          {hasMore && (
                            <button
                              onClick={() => setVisibleCount(c => c + 5)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
                            >
                              Afficher plus ({totalFiltered - visibleSlice.length} restantes)
                            </button>
                          )}
                          {canReduce && (
                            <button
                              onClick={() => setVisibleCount(3)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              style={{ background: BRAND.borderSoft, color: BRAND.inkMuted }}
                            >
                              Réduire
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ═══════════ VUE LISTE ═══════════ */
                    <>
                      <motion.div
                        variants={listContainer}
                        initial="hidden"
                        animate="show"
                        className="space-y-3"
                      >
                        {visibleSlice.map(o => (
                          <PastOrderCard
                            key={o.id}
                            order={o}
                            currency={me?.currency}
                            expanded={expandedIds.includes(o.id)}
                            onToggleExpand={() => toggleExpand(o.id)}
                          />
                        ))}
                      </motion.div>

                      {/* Contrôle du nombre affiché */}
                      {(hasMore || canReduce) && (
                        <div className="flex items-center justify-center gap-2 mt-5">
                          {hasMore && (
                            <button
                              onClick={() => setVisibleCount(c => c + 5)}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:shadow-sm active:scale-95"
                              style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                              Afficher 5 de plus ({totalFiltered - visibleSlice.length} restantes)
                            </button>
                          )}
                          {canReduce && (
                            <button
                              onClick={() => setVisibleCount(3)}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                              style={{ background: BRAND.borderSoft, color: BRAND.inkMuted }}
                            >
                              Réduire
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-8">
                    <ImportantNotice />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation mobile */}
      <MobileNav currentTab={tab} onSelectTab={setTab} />
    </div>
  );
}