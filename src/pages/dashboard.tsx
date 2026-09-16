import { useState, useEffect } from "react";
import { useMeta } from "../lib/use-meta";
import { auth } from "../lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, XCircle, Loader2, Copy, RefreshCw, Plus, Wallet,
  ArrowRight, ShoppingBag, User, Pencil, X, Phone, Globe, CreditCard, TrendingUp,
  Filter, MessageCircle, Search, Sparkles
} from "lucide-react";
import { Link } from "wouter";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { CURRENCIES, getCurrency } from "../lib/currencies";

/* ────────────────────────────────────────────────────────────────── */
/* Couleur signature TEXERRA SMS (extraite du logo)                   */
/* ────────────────────────────────────────────────────────────────── */

const BRAND = {
  primary: "#C55A34",
  primaryDark: "#A84A28",
  primaryLight: "#E8A47F",
  primarySoft: "#FBEEE7",
};

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

/* ────────────────────────────────────────────────────────────────── */
/* Mapping service → nom complet affiché                              */
/* ────────────────────────────────────────────────────────────────── */

const SERVICE_DISPLAY: Record<string, string> = {
  wa: "WhatsApp",
  wb: "WhatsApp Business",
  fb: "Facebook",
  ig: "Instagram",
  tg: "Telegram",
  tt: "TikTok",
  go: "Google",
  am: "Amazon",
  nf: "Netflix",
  pp: "PayPal",
  tw: "X (Twitter)",
  dc: "Discord",
  sp: "Spotify",
  ub: "Uber",
  ms: "Microsoft",
  ap: "Apple",
  sn: "Snapchat",
  li: "LinkedIn",
  yt: "YouTube",
  rd: "Reddit",
  ab: "Airbnb",
  bi: "Binance",
  tn: "Tinder",
  vb: "Viber",
  sg: "Signal",
  sl: "Slack",
  gh: "GitHub",
  tv: "Twitch",
  pt: "Pinterest",
  wc: "WeChat",
  vk: "VK",
  yd: "Yandex",
  ae: "AliExpress",
  eb: "eBay",
  et: "Etsy",
  cb: "Coinbase",
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
/* Résolution pays : indicatif téléphonique → drapeau + nom           */
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
  { prefix: "218", info: { name: "Libye", iso: "LY", callingCode: "+218" } },
  { prefix: "591", info: { name: "Bolivie", iso: "BO", callingCode: "+591" } },
  { prefix: "593", info: { name: "Équateur", iso: "EC", callingCode: "+593" } },
  { prefix: "595", info: { name: "Paraguay", iso: "PY", callingCode: "+595" } },
  { prefix: "598", info: { name: "Uruguay", iso: "UY", callingCode: "+598" } },
  { prefix: "20", info: { name: "Égypte", iso: "EG", callingCode: "+20" } },
  { prefix: "27", info: { name: "Afrique du Sud", iso: "ZA", callingCode: "+27" } },
  { prefix: "971", info: { name: "Émirats arabes unis", iso: "AE", callingCode: "+971" } },
  { prefix: "966", info: { name: "Arabie saoudite", iso: "SA", callingCode: "+966" } },
  { prefix: "972", info: { name: "Israël", iso: "IL", callingCode: "+972" } },
  { prefix: "90", info: { name: "Turquie", iso: "TR", callingCode: "+90" } },
  { prefix: "86", info: { name: "Chine", iso: "CN", callingCode: "+86" } },
  { prefix: "91", info: { name: "Inde", iso: "IN", callingCode: "+91" } },
  { prefix: "92", info: { name: "Pakistan", iso: "PK", callingCode: "+92" } },
  { prefix: "93", info: { name: "Afghanistan", iso: "AF", callingCode: "+93" } },
  { prefix: "94", info: { name: "Sri Lanka", iso: "LK", callingCode: "+94" } },
  { prefix: "95", info: { name: "Myanmar", iso: "MM", callingCode: "+95" } },
  { prefix: "98", info: { name: "Iran", iso: "IR", callingCode: "+98" } },
  { prefix: "60", info: { name: "Malaisie", iso: "MY", callingCode: "+60" } },
  { prefix: "61", info: { name: "Australie", iso: "AU", callingCode: "+61" } },
  { prefix: "62", info: { name: "Indonésie", iso: "ID", callingCode: "+62" } },
  { prefix: "63", info: { name: "Philippines", iso: "PH", callingCode: "+63" } },
  { prefix: "64", info: { name: "Nouvelle-Zélande", iso: "NZ", callingCode: "+64" } },
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
  { prefix: "36", info: { name: "Hongrie", iso: "HU", callingCode: "+36" } },
  { prefix: "39", info: { name: "Italie", iso: "IT", callingCode: "+39" } },
  { prefix: "40", info: { name: "Roumanie", iso: "RO", callingCode: "+40" } },
  { prefix: "41", info: { name: "Suisse", iso: "CH", callingCode: "+41" } },
  { prefix: "43", info: { name: "Autriche", iso: "AT", callingCode: "+43" } },
  { prefix: "44", info: { name: "Royaume-Uni", iso: "GB", callingCode: "+44" } },
  { prefix: "45", info: { name: "Danemark", iso: "DK", callingCode: "+45" } },
  { prefix: "46", info: { name: "Suède", iso: "SE", callingCode: "+46" } },
  { prefix: "47", info: { name: "Norvège", iso: "NO", callingCode: "+47" } },
  { prefix: "48", info: { name: "Pologne", iso: "PL", callingCode: "+48" } },
  { prefix: "49", info: { name: "Allemagne", iso: "DE", callingCode: "+49" } },
  { prefix: "351", info: { name: "Portugal", iso: "PT", callingCode: "+351" } },
  { prefix: "353", info: { name: "Irlande", iso: "IE", callingCode: "+353" } },
  { prefix: "380", info: { name: "Ukraine", iso: "UA", callingCode: "+380" } },
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

const STATUS_CONFIG = {
  pending_payment: { label: "En attente", color: "text-amber-700 bg-amber-50 ring-1 ring-amber-200", icon: Clock },
  active: { label: "En attente SMS", color: "text-blue-700 bg-blue-50 ring-1 ring-blue-200", icon: RefreshCw },
  completed: { label: "SMS reçu", color: "text-green-700 bg-green-50 ring-1 ring-green-200", icon: CheckCircle2 },
  cancelled: { label: "Annulée", color: "text-muted-foreground bg-muted/50 ring-1 ring-border", icon: XCircle },
  expired: { label: "Expirée", color: "text-destructive bg-destructive/10 ring-1 ring-destructive/20", icon: XCircle },
};

const listContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const listItem = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
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
/* Salutations personnalisées                                         */
/* ────────────────────────────────────────────────────────────────── */

function getGreeting(name?: string | null): { greeting: string; subline: string } {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  const firstName = (name ?? "").trim().split(" ")[0] || "";

  let greeting = "Bonjour";
  if (hour < 5) greeting = "Bonne nuit";
  else if (hour < 12) greeting = "Bonjour";
  else if (hour < 18) greeting = "Bon après-midi";
  else greeting = "Bonsoir";

  const withName = firstName ? `${greeting}, ${firstName}` : greeting;

  let subline = "";
  if (day === 1 && hour < 12) subline = "Bonne semaine ! Prêt à démarrer ?";
  else if (day === 5) subline = "Bon vendredi — bon week-end en avance !";
  else if (day === 6) subline = "Bon week-end !";
  else if (day === 0) subline = "Bon dimanche !";
  else subline = "";

  return { greeting: withName, subline };
}

/* ────────────────────────────────────────────────────────────────── */
/* Composant ActiveOrderCard                                          */
/* ────────────────────────────────────────────────────────────────── */

function ActiveOrderCard({ orderId }: { orderId: string }) {
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

  if (!order) return <div className="h-40 bg-secondary/50 animate-pulse rounded-2xl" />;

  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
  const StatusIcon = cfg.icon;
  const iconUrl = svcIconUrl(order.serviceCode, order.serviceIcon);
  const country = resolveCountryFromPhone(order.phoneNumber, order.countryCode);
  const displayService = serviceDisplayName(order.serviceCode);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <motion.div variants={listItem} className="bg-white border border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      <div
        className="absolute top-0 left-0 h-1 w-full opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryLight})` }}
      />

      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
            {!imageError && iconUrl ? (
              <img src={iconUrl} alt={order.serviceCode} onError={() => setImageError(true)} className="w-7 h-7 object-contain drop-shadow-sm" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground uppercase">{order.serviceCode?.slice(0, 2)}</span>
            )}
          </div>
          <div>
            <div className="font-bold text-base text-foreground">{displayService}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span className="text-base leading-none">{isoToFlagEmoji(country.iso)}</span>
              <span>{country.name}</span>
              {order.price !== undefined && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="font-medium">{Number(order.price).toFixed(2)} €</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-sm ${cfg.color}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${order.status === "active" ? "animate-spin" : ""}`} />
            {cfg.label}
          </div>
          {remaining && order.status === "active" && (
            <div className="text-xs text-muted-foreground mt-2 font-mono bg-secondary/80 px-2 py-0.5 rounded-md border border-border/50">{remaining}</div>
          )}
        </div>
      </div>

      {order.phoneNumber && (
        <div className="flex items-center justify-between gap-3 mb-4 bg-secondary/40 rounded-xl px-4 py-3 border border-border/50 group-hover:bg-secondary/60 transition-colors">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Numéro attribué</span>
            <span className="font-mono font-bold text-base tracking-wide text-foreground">{order.phoneNumber}</span>
          </div>
          <button onClick={() => copyText(order.phoneNumber!, "phone")} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-border text-muted-foreground hover:border-primary/30 transition-all active:scale-95" style={{ color: copied === "phone" ? "#16a34a" : undefined }}>
            {copied === "phone" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {order.smsCode && (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center justify-between gap-3 mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full -mr-8 -mt-8 blur-xl" />
          <div className="relative z-10">
            <div className="text-[10px] uppercase font-bold text-green-700 tracking-wider mb-0.5">Code de vérification</div>
            <span className="font-mono font-black text-xl tracking-[0.15em] text-green-800 drop-shadow-sm">{order.smsCode}</span>
          </div>
          <button onClick={() => copyText(order.smsCode!, "code")} className="relative z-10 w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-green-200 text-green-600 hover:bg-green-600 hover:text-white transition-all active:scale-95">
            {copied === "code" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* PastOrderCard refondu — 3 colonnes                                 */
/* ────────────────────────────────────────────────────────────────── */

function PastOrderCard({ order }: { order: Order }) {
  const [copied, setCopied] = useState<string>("");
  const [imageError, setImageError] = useState(false);

  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.cancelled;
  const StatusIcon = cfg.icon;
  const date = new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const iconUrl = svcIconUrl(order.serviceCode, order.serviceIcon);
  const country = resolveCountryFromPhone(order.phoneNumber, order.countryCode);
  const displayService = serviceDisplayName(order.serviceCode);

  const phoneWithPrefix = order.phoneNumber ?? "";
  const phoneWithoutPrefix = phoneWithPrefix.replace(/^\+\d{1,4}/, "").replace(/\D/g, "");

  const copyText = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const hasSmsCode = !!order.smsCode;

  return (
    <motion.div
      variants={listItem}
      className="bg-white border border-border/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Barre de couleur supérieure selon le statut */}
      <div
        className="h-1 w-full"
        style={{
          background: order.status === "completed"
            ? "linear-gradient(90deg, #16a34a, #4ade80)"
            : order.status === "cancelled" || order.status === "expired"
            ? "linear-gradient(90deg, #94a3b8, #cbd5e1)"
            : `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryLight})`
        }}
      />

      <div className="p-5">
        {/* En-tête : Statut + Date */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-sm ${cfg.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {cfg.label}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>{date}</span>
          </div>
        </div>

        {/* Grille 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Colonne 1 : Service + Pays + Numéro */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0 overflow-hidden">
                {!imageError && iconUrl ? (
                  <img src={iconUrl} alt={order.serviceCode} onError={() => setImageError(true)} className="w-6 h-6 object-contain" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground uppercase">{order.serviceCode?.slice(0, 2)}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-foreground truncate">{displayService}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span className="text-base leading-none">{isoToFlagEmoji(country.iso)}</span>
                  <span className="truncate">{country.name}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border/50">{country.callingCode}</span>
                </div>
              </div>
            </div>

            {order.phoneNumber ? (
              <div className="bg-secondary/40 rounded-xl p-3 border border-border/50">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Numéro utilisé</div>
                <div className="font-mono font-bold text-sm text-foreground mb-2 break-all">{order.phoneNumber}</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => copyText(phoneWithPrefix, "phone-with")}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-border text-[10px] font-semibold text-foreground hover:border-primary/40 hover:shadow-sm transition-all"
                    title="Copier avec indicatif"
                  >
                    {copied === "phone-with" ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    Avec {country.callingCode}
                  </button>
                  <button
                    onClick={() => copyText(phoneWithoutPrefix, "phone-without")}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-border text-[10px] font-semibold text-muted-foreground hover:border-primary/40 hover:shadow-sm transition-all"
                    title="Copier sans indicatif"
                  >
                    {copied === "phone-without" ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    Sans indicatif
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-xl p-3 border border-dashed border-border/60 text-center">
                <span className="text-[11px] text-muted-foreground italic">Numéro indisponible</span>
              </div>
            )}
          </div>

          {/* Colonne 2 : Code SMS */}
          <div className="flex flex-col justify-center">
            {hasSmsCode ? (
              <div className="bg-green-50/80 rounded-xl p-4 border border-green-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full -mr-8 -mt-8 blur-xl" />
                <div className="relative z-10">
                  <div className="text-[10px] uppercase font-bold text-green-700 tracking-wider mb-1">Code SMS reçu</div>
                  <div className="font-mono font-black text-xl tracking-[0.1em] text-green-800 mb-3">{order.smsCode}</div>
                  <button
                    onClick={() => copyText(order.smsCode!, "code")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-green-200 text-xs font-bold text-green-700 hover:bg-green-600 hover:text-white transition-all active:scale-95"
                  >
                    {copied === "code" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copier le code
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-xl p-4 border border-dashed border-border/60 text-center">
                <MessageCircle className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                <div className="text-[11px] font-semibold text-muted-foreground">Aucun code reçu</div>
                <div className="text-[10px] text-muted-foreground/80 mt-1">
                  {order.status === "cancelled" ? "Commande annulée" : order.status === "expired" ? "Commande expirée" : "SMS non reçu"}
                </div>
              </div>
            )}
          </div>

          {/* Colonne 3 : Prix + Action */}
          <div className="flex flex-col justify-center gap-3">
            <div className="bg-white border border-border/60 rounded-xl p-4">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Prix payé</div>
              <div className="font-black text-2xl text-foreground">
                {order.price !== undefined ? `${Number(order.price).toFixed(2)} €` : "—"}
              </div>
            </div>

            <Link
              href={`/order?service=${order.serviceCode}&country=${order.countryCode}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:shadow-lg active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`,
                boxShadow: `0 4px 12px ${BRAND.primary}33`
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recommander ce numéro
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Barre de filtres                                                   */
/* ────────────────────────────────────────────────────────────────── */

type OrderFilter = "all" | "completed" | "active" | "cancelled" | "expired";

const FILTER_OPTIONS: { value: OrderFilter; label: string; dotColor: string }[] = [
  { value: "all", label: "Toutes", dotColor: "#64748b" },
  { value: "completed", label: "Réussies", dotColor: "#16a34a" },
  { value: "active", label: "En cours", dotColor: "#2563eb" },
  { value: "cancelled", label: "Annulées", dotColor: "#94a3b8" },
  { value: "expired", label: "Expirées", dotColor: "#dc2626" },
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
    <div className="bg-white/70 backdrop-blur-sm border border-border/60 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide shadow-sm">
      <div className="pl-2 pr-1 text-muted-foreground shrink-0">
        <Filter className="w-4 h-4" />
      </div>
      {FILTER_OPTIONS.map(f => {
        const active = value === f.value;
        const count = counts[f.value] ?? 0;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              active
                ? "text-white shadow-md"
                : "text-foreground/70 hover:bg-secondary/60"
            }`}
            style={active ? { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` } : undefined}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: active ? "#ffffff" : f.dotColor }}
            />
            {f.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${active ? "bg-white/25" : "bg-secondary/80"}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* RechargesTab (design amélioré, logique inchangée)                  */
/* ────────────────────────────────────────────────────────────────── */

function RechargesTab() {
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
    pending: { label: "En attente", color: "text-amber-700 bg-amber-50 ring-1 ring-amber-200" },
    completed: { label: "Crédité", color: "text-green-700 bg-green-50 ring-1 ring-green-200" },
    failed: { label: "Échoué", color: "text-red-700 bg-red-50 ring-1 ring-red-200" },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-secondary/50 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!topups || topups.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-white border border-border/80 rounded-3xl shadow-sm">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner"
          style={{ background: BRAND.primarySoft }}
        >
          <CreditCard className="w-8 h-8" style={{ color: BRAND.primary }} />
        </div>
        <h3 className="text-lg font-bold mb-2 text-foreground">Aucune recharge effectuée</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Votre historique de recharges financières apparaîtra ici une fois que vous aurez approvisionné votre compte.</p>
        <Link href="/wallet" className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition-all active:scale-95 text-sm"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` }}>
          Recharger mon solde <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
      {topups.map(t => {
        const cfg = topupStatusConfig[t.status as keyof typeof topupStatusConfig] ?? topupStatusConfig.pending;
        const date = new Date(t.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
        const time = new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return (
          <motion.div variants={listItem} key={t.id} className="bg-white border border-border/80 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all duration-300">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
              style={{ background: BRAND.primarySoft }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: BRAND.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-foreground">Recharge de {Number(t.amountEur).toFixed(2)} €</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> {date} à {time}
              </div>
            </div>
            <div className={`shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${cfg.color}`}>
              {cfg.label}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* ProfileTab (logique inchangée)                                     */
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto sm:mx-0">
      <div className="bg-white border border-border/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" style={{ background: `${BRAND.primary}0d` }} />

        <div className="flex flex-col sm:flex-row sm:items-center gap-5 relative z-10">
          {me.avatarUrl ? (
            <img src={me.avatarUrl} alt={me.name ?? ""} className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-inner"
              style={{ background: `linear-gradient(135deg, ${BRAND.primary}33, ${BRAND.primary}0a)`, color: BRAND.primary }}
            >
              {initials}
            </div>
          )}
          <div>
            <div className="font-extrabold text-xl text-foreground mb-1">{me.name ?? "Mon Profil"}</div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground font-medium">
              {me.email}
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div className="space-y-6 relative z-10">
          <div className="group">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Nom affiché</label>
            {editing === "name" ? (
              <div className="space-y-3">
                <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
                  className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-4 transition-all shadow-sm"
                  style={{ borderColor: `${BRAND.primary}55`, outlineColor: BRAND.primary }}
                  placeholder="Votre nom" />
                {error && <p className="text-xs text-destructive font-medium">{error}</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={handleSaveName} disabled={updateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` }}>
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button onClick={handleCancel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl text-sm font-bold hover:bg-secondary transition-colors active:scale-95">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-secondary/30 border border-transparent group-hover:border-border/50 group-hover:bg-secondary/50 rounded-xl transition-all">
                <span className="text-sm font-medium">{me.name ?? <span className="text-muted-foreground italic">Non défini</span>}</span>
                <button onClick={() => { setEditing("name"); setError(""); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-border/50">
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
              </div>
            )}
          </div>

          <div className="group">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Numéro de téléphone
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">Utilisé automatiquement pour vos recharges.</p>
            {editing === "phone" ? (
              <div className="space-y-3">
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoFocus
                  className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-4 transition-all shadow-sm"
                  style={{ borderColor: `${BRAND.primary}55` }}
                  placeholder="+237 6 XX XX XX XX" />
                {error && <p className="text-xs text-destructive font-medium">{error}</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={handleSavePhone} disabled={updateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` }}>
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button onClick={handleCancel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl text-sm font-bold hover:bg-secondary transition-colors active:scale-95">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-secondary/30 border border-transparent group-hover:border-border/50 group-hover:bg-secondary/50 rounded-xl transition-all">
                {me.phone ? (
                  <span className="text-sm font-mono font-bold tracking-wide">{me.phone}</span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Non renseigné</span>
                )}
                <button onClick={() => { setEditing("phone"); setError(""); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-border/50">
                  <Pencil className="w-3.5 h-3.5" /> {me.phone ? "Modifier" : "Ajouter"}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Devise locale
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">Affiche l'équivalent dans votre monnaie lors des recharges.</p>
            <div className="relative">
              <select value={me.currency ?? "EUR"} onChange={e => handleCurrencyChange(e.target.value)}
                disabled={savingCurrency}
                className="w-full px-5 py-3.5 bg-secondary/50 border border-border/80 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 appearance-none cursor-pointer disabled:opacity-60 transition-all shadow-sm hover:border-border">
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
                ))}
              </select>
              {savingCurrency ? (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: BRAND.primary }} />
              ) : (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground bg-secondary/50 pl-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </div>
            {localCurrency && localCurrency.code !== "EUR" && (
              <p className="text-xs font-medium text-muted-foreground mt-2 bg-secondary/40 inline-block px-2.5 py-1 rounded-md">
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
/* Encart d'information (bas de l'historique)                         */
/* ────────────────────────────────────────────────────────────────── */

function ImportantNotice() {
  const [open, setOpen] = useState(true);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 rounded-2xl border overflow-hidden"
      style={{ borderColor: `${BRAND.primary}33`, background: `linear-gradient(135deg, ${BRAND.primarySoft}, #ffffff)` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: BRAND.primary, color: "#ffffff" }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-sm" style={{ color: BRAND.primaryDark }}>Important !</div>
            <div className="text-[11px] text-muted-foreground">À lire pour maximiser vos chances de recevoir un SMS</div>
          </div>
        </div>
        <div className="text-xs font-bold" style={{ color: BRAND.primary }}>{open ? "Masquer" : "Afficher"}</div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 text-sm text-foreground/85 space-y-3">
              <p>
                Envoyez le numéro reçu via le formulaire dans l'application sélectionnée, messager, service, etc.
                Le code du SMS apparaîtra à côté du numéro de téléphone sur cette page.
                <strong className="font-semibold text-foreground"> Temps moyen de livraison : 2 à 7 minutes.</strong>
              </p>
              <p>
                Si le SMS n'est pas reçu, l'argent pour le numéro sera retourné sur le solde.
              </p>
              <p>
                Nous ne garantissons pas une livraison SMS à 100 % à chaque numéro acheté. Les algorithmes côté service peuvent bloquer la livraison de SMS vers des numéros virtuels pour diverses raisons.
                Parfois, il y a un seul accouchement réussi pour 15 à 20 tentatives, c'est normal.
              </p>
              <div className="pt-2 border-t border-dashed" style={{ borderColor: `${BRAND.primary}33` }}>
                <div className="font-bold text-xs mb-2" style={{ color: BRAND.primaryDark }}>Comment augmenter les chances d'accouchement ?</div>
                <ul className="space-y-1.5 text-[13px] pl-1">
                  {[
                    "Essaie de nouveaux chiffres ;",
                    "Essayer dans d'autres pays ;",
                    "Changer l'adresse IP ;",
                    "Se déconnecter des autres comptes sur l'appareil.",
                  ].map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: BRAND.primary }} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Dashboard principal                                                */
/* ────────────────────────────────────────────────────────────────── */

type DashTab = "orders" | "topups" | "profile";

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

  const [tab, setTab] = useState<DashTab>("orders");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");

  const activeOrders = orders?.filter(o => o.status === "active" || o.status === "pending_payment") ?? [];
  const pastOrders = orders?.filter(o => o.status !== "active" && o.status !== "pending_payment") ?? [];

  // Compteurs de filtres
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

  const tabs: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id: "orders", label: "Commandes", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "topups", label: "Recharges", icon: <CreditCard className="w-4 h-4" /> },
    { id: "profile", label: "Mon Profil", icon: <User className="w-4 h-4" /> },
  ];

  const { greeting, subline } = getGreeting(me?.name);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header avec salutation personnalisée */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`, color: "#fff" }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {greeting}
            </h1>
          </div>
          {subline ? (
            <p className="text-sm font-medium" style={{ color: BRAND.primaryDark }}>{subline}</p>
          ) : (
            <p className="text-muted-foreground text-sm sm:text-base">Gérez vos commandes, votre solde et votre compte avec simplicité.</p>
          )}
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
          {/* ⚠️ CARTE SOLDE — INCHANGÉE */}
          <Link href="/wallet" className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-border/80 px-5 py-3 rounded-2xl text-sm font-bold hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all active:scale-95">
            <Wallet className="w-4 h-4 text-primary" />
            {loadingMe ? "—" : `${me?.balance?.toFixed(2) ?? "0.00"} €`}
            <Plus className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map(t => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                isActive ? "text-white shadow-md" : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent hover:border-border/50"
              }`}
              style={isActive ? { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` } : undefined}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "profile" ? (
            loadingMe ? <div className="h-72 bg-secondary/50 animate-pulse rounded-3xl" /> : me ? <ProfileTab me={me} /> : null
          ) : tab === "topups" ? (
            <RechargesTab />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                {/* ⚠️ CARTE SOLDE (STAT) — INCHANGÉE */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-6 shadow-sm group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Wallet size={80} className="text-primary" />
                  </div>
                  <div className="relative z-10">
                    <div className="text-[11px] font-bold text-primary uppercase tracking-widest mb-2">Solde Actuel</div>
                    {loadingMe ? (
                      <div className="h-10 w-24 bg-primary/10 animate-pulse rounded-lg" />
                    ) : (
                      <div className="text-4xl font-black text-foreground drop-shadow-sm">{me?.balance?.toFixed(2) ?? "0.00"} €</div>
                    )}
                    <Link href="/wallet" className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary bg-white/60 hover:bg-white px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm backdrop-blur-sm border border-primary/10">
                      Recharger le compte <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* En cours */}
                <div className="relative overflow-hidden bg-white border border-border/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 blur-2xl" style={{ background: `${BRAND.primary}1a` }} />
                  <div className="relative">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">En cours</div>
                    <div className="text-4xl font-black text-foreground">{activeOrders.length}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Commande{activeOrders.length > 1 ? "s" : ""} active{activeOrders.length > 1 ? "s" : ""}</div>
                  </div>
                </div>

                {/* Historique */}
                <div className="relative overflow-hidden bg-white border border-border/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 blur-2xl" style={{ background: `${BRAND.primary}1a` }} />
                  <div className="relative">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Historique Total</div>
                    <div className="text-4xl font-black text-foreground">{orders?.length ?? 0}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Commandes passées</div>
                  </div>
                </div>
              </div>

              {activeOrders.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-lg font-extrabold mb-5 flex items-center gap-2 text-foreground">
                    <div className="p-2 rounded-lg" style={{ background: BRAND.primarySoft }}>
                      <RefreshCw className="w-5 h-5 animate-spin" style={{ color: BRAND.primary }} />
                    </div>
                    Commandes en cours d'activation
                  </h2>
                  <motion.div variants={listContainer} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2">
                    {activeOrders.map(o => <ActiveOrderCard key={o.id} orderId={o.id} />)}
                  </motion.div>
                </div>
              )}

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                    <div className="p-2 bg-secondary rounded-lg">
                      <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                    </div>
                    Toutes les commandes
                  </h2>
                </div>

                {/* Filtres */}
                {orders && orders.length > 0 && (
                  <div className="mb-5">
                    <OrderFilters value={orderFilter} onChange={setOrderFilter} counts={filterCounts} />
                  </div>
                )}

                {loadingOrders ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-28 bg-secondary/50 animate-pulse rounded-2xl" />
                    ))}
                  </div>
                ) : filteredPastOrders.length === 0 && activeOrders.length === 0 ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-24 bg-white border border-border/80 rounded-3xl shadow-sm">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner" style={{ background: BRAND.primarySoft }}>
                      <ShoppingBag className="w-8 h-8" style={{ color: BRAND.primary }} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-foreground">Votre historique est vide</h3>
                    <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">Toutes vos commandes et réceptions de codes SMS seront conservées ici.</p>
                    <Link href="/order" className="inline-flex items-center gap-2 px-8 py-3.5 text-white font-bold rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0 text-sm"
                      style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`, boxShadow: `0 8px 24px ${BRAND.primary}33` }}>
                      Démarrer une commande <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                ) : filteredPastOrders.length === 0 ? (
                  <div className="text-center py-12 bg-white border border-dashed border-border/60 rounded-2xl">
                    <Search className="w-6 h-6 text-muted-foreground/60 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune commande dans cette catégorie</p>
                  </div>
                ) : (
                  <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-4">
                    {filteredPastOrders.map(o => (
                      <PastOrderCard key={o.id} order={o} />
                    ))}
                  </motion.div>
                )}

                {/* Encart d'information */}
                <ImportantNotice />
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}