import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useMeta } from "../lib/use-meta";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe2, Smartphone, CheckCircle2, Copy, RefreshCw, ArrowLeft,
  Loader2, Wallet, ArrowRight, Search, AlertCircle, X, Sparkles,
  Grid3X3, MessageCircle, Film, Music, DollarSign, ShoppingBag,
  Mail, Heart, Settings, Users,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth-context";
import { svcIconUrl, svcPlaceholderColor } from "../lib/serviceIcons";

const STORAGE_KEY = "texerra_active_order";

// ─── Catégories de services ──────────────────────────────────────────────────
// Chaque service est classé côté frontend selon son code, pour permettre un
// filtrage ultra-rapide et cohérent.

type CategoryId =
  | "all" | "social" | "messaging" | "entertainment"
  | "music" | "finance" | "marketplace" | "email"
  | "dating" | "services";

interface CategoryDef {
  id: CategoryId;
  label: string;
  Icon: typeof Grid3X3;
  color: string;
}

const CATEGORIES: CategoryDef[] = [
  { id: "all",           label: "Tous",            Icon: Grid3X3,        color: "24 90% 52%" },
  { id: "social",        label: "Réseaux sociaux", Icon: Users,          color: "210 80% 52%" },
  { id: "messaging",     label: "Messagerie",      Icon: MessageCircle,  color: "160 70% 42%" },
  { id: "entertainment", label: "Divertissement",  Icon: Film,           color: "340 75% 52%" },
  { id: "music",         label: "Musique",         Icon: Music,          color: "280 70% 55%" },
  { id: "finance",       label: "Finance",         Icon: DollarSign,     color: "140 65% 42%" },
  { id: "marketplace",   label: "E-commerce",      Icon: ShoppingBag,    color: "35 85% 50%" },
  { id: "email",         label: "Email",           Icon: Mail,           color: "200 80% 50%" },
  { id: "dating",        label: "Rencontres",      Icon: Heart,          color: "350 75% 55%" },
  { id: "services",      label: "Services",        Icon: Settings,       color: "215 15% 45%" },
];

// Mapping précis : code Grizzly → catégorie Texerra
const SERVICE_CATEGORY: Record<string, CategoryId> = {
  // Réseaux sociaux
  ig: "social", fb: "social", tw: "social", lf: "social", sc: "social",
  vk: "social", ok: "social", pi: "social", ri: "social", ln: "social",
  ku: "social", yt: "social",
  // Messagerie
  wa: "messaging", tg: "messaging", wb: "messaging", si: "messaging",
  vi: "messaging", li: "messaging", ld: "messaging", ka: "messaging",
  qa: "messaging", im: "messaging", em: "messaging", zl: "messaging",
  // Divertissement
  nf: "entertainment", tt: "entertainment",
  // Musique
  sp: "music",
  // Finance
  pp: "finance", bn: "finance", co: "finance", ke: "finance",
  cy: "finance", mo: "finance",
  // E-commerce
  am: "marketplace", al: "marketplace", eb: "marketplace", et: "marketplace",
  sf: "marketplace", av: "marketplace", bz: "marketplace", wu: "marketplace",
  oz: "marketplace", me: "marketplace", fl: "marketplace", dl: "marketplace",
  // Email
  ma: "email", yh: "email", pm: "email", gl: "email", ou: "email",
  // Rencontres
  td: "dating", be: "dating", ft: "dating", lv: "dating",
  hs: "dating", um: "dating", gp: "dating",
  // Services
  go: "services", wx: "services", ms: "services", dc: "services",
  yx: "services", ub: "services", oi: "services", gh: "services",
  sl: "services", dr: "services", ct: "services", ge: "services",
  he: "services", bl: "services", zo: "services", sw: "services",
  gr: "services", cr: "services", ne: "services",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface Service {
  code: string;
  name: string;
  icon?: string | null;
  iconType?: string;
  verified?: boolean;
  available?: boolean;
  priceFrom?: number | null;
  stock?: number | null;
  servicePrice?: number | null;
  popularRank?: number | null;
  category?: string;
}

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode?: string | null;
  available?: boolean;
  stock?: number | null;
  servicePrice?: number | null;
}

interface OrderResponse {
  id: string;
  status: string;
  phoneNumber?: string | null;
  smsCode?: string | null;
  smsText?: string | null;
}

interface UserProfile {
  balance: number;
}

type SelectedService = { code: string; name: string; priceFrom?: number | null; icon?: string | null; iconType?: string };
type SelectedCountry = { code: string; name: string; flag: string; dialCode?: string | null };

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return normalize(text).includes(normalize(query));
}

function getCategory(service: Service): CategoryId {
  return SERVICE_CATEGORY[service.code] ?? "services";
}

async function fetchApi<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}

async function postApi<T, B>(url: string, body: B, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, data: errorData };
  }
  return res.json();
}

// ─── Icône de service avec fallback ──────────────────────────────────────────

function ServiceIcon({
  service,
  size = "md",
}: {
  service: { name: string; icon?: string | null; iconType?: string };
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const iconUrl = svcIconUrl(service.icon);
  const color = svcPlaceholderColor(service.icon);

  const sizeClasses = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-10 h-10" };
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" };

  if (iconUrl && !imgError) {
    return (
      <img
        src={iconUrl}
        alt={service.name}
        className={`${sizeClasses[size]} object-contain`}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-extrabold text-white`}
      style={{ backgroundColor: color }}
    >
      <span className={textSizes[size]}>{service.name[0]?.toUpperCase()}</span>
    </div>
  );
}

// ─── Étapes ──────────────────────────────────────────────────────────────────

const steps = [
  { id: 1, label: "Service", icon: Smartphone },
  { id: 2, label: "Pays", icon: Globe2 },
  { id: 3, label: "Numéro", icon: CheckCircle2 },
];

// ─── Composant principal ─────────────────────────────────────────────────────

export default function Order() {
  useMeta({
    title: "Commander un numéro virtuel SMS — Texerra",
    description: "Choisissez votre service (WhatsApp, Instagram, Telegram, TikTok…) et votre pays, obtenez un numéro virtuel en moins de 60 secondes. Paiement Orange Money, MTN, Airtel et Wave.",
    ogTitle: "Commander un numéro virtuel SMS | Texerra",
    ogDescription: "Numéro temporaire pour recevoir votre code SMS de vérification. +200 services disponibles. Livraison instantanée.",
    canonical: "https://texerra.site/order",
  });

  const queryClient = useQueryClient();
  const { user: firebaseUser } = useAuth();
  const isSignedIn = !!firebaseUser;

  const getToken = useCallback(
    async () => (firebaseUser ? await firebaseUser.getIdToken() : undefined),
    [firebaseUser]
  );

  // État
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [serviceSearch, setServiceSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedService, setSelectedService] = useState<SelectedService | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
  const [orderId, setOrderId] = useState<string>("");
  const [orderError, setOrderError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const countryListRef = useRef<HTMLDivElement>(null);
  const recapRef = useRef<HTMLDivElement>(null);
  const serviceSearchRef = useRef<HTMLInputElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);

  // Restauration de commande
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { orderId: string; service: SelectedService; country: SelectedCountry };
      if (saved?.orderId) {
        setOrderId(saved.orderId);
        if (saved.service) setSelectedService(saved.service);
        if (saved.country) setSelectedCountry(saved.country);
        setStep(3);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (step === 1) setTimeout(() => serviceSearchRef.current?.focus(), 250);
    if (step === 2) setTimeout(() => countrySearchRef.current?.focus(), 250);
  }, [step]);

  // Scroll auto vers le récap quand un pays est sélectionné
  useEffect(() => {
    if (selectedCountry && recapRef.current && step === 2) {
      const t = setTimeout(() => {
        recapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [selectedCountry, step]);

  // ─── Requêtes ──────────────────────────────────────────────────────────────

  const { data: me } = useQuery<UserProfile>({
    queryKey: ["/api/me", isSignedIn],
    queryFn: async () => fetchApi<UserProfile>("/api/me", await getToken()),
    enabled: isSignedIn,
  });

  const { data: allServices, isLoading: loadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => fetchApi<Service[]>("/api/services", await getToken()),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  // Prefetch des pays au survol d'un service
  const prefetchCountries = useCallback(
    (serviceCode: string) => {
      queryClient.prefetchQuery({
        queryKey: ["/api/countries", serviceCode],
        queryFn: async () =>
          fetchApi<Country[]>(`/api/countries?serviceCode=${serviceCode}`, await getToken()),
        staleTime: 5 * 60_000,
      });
    },
    [queryClient, getToken]
  );

  const { data: countries, isLoading: loadingCountries } = useQuery<Country[]>({
    queryKey: ["/api/countries", selectedService?.code],
    queryFn: async () =>
      fetchApi<Country[]>(`/api/countries?serviceCode=${selectedService!.code}`, await getToken()),
    enabled: !!selectedService,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const { data: servicesForCountry, isLoading: loadingServicesForCountry } = useQuery<Service[]>({
    queryKey: ["/api/services", selectedCountry?.code],
    queryFn: async () =>
      fetchApi<Service[]>(`/api/services?countryCode=${selectedCountry!.code}`, await getToken()),
    enabled: !!selectedCountry,
    staleTime: 30_000,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createOrder = useMutation({
    mutationFn: async (data: { serviceCode: string; countryCode: string }) =>
      postApi<OrderResponse, { serviceCode: string; countryCode: string }>(
        "/api/orders",
        data,
        await getToken()
      ),
    onSuccess: (data) => {
      setOrderId(data.id);
      setDirection("forward");
      setStep(3);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ orderId: data.id, service: selectedService, country: selectedCountry })
      );
    },
    onError: (err: any) => {
      const code = err?.data?.error;
      if (code === "insufficient_balance" || err?.status === 402) setOrderError("insufficient_balance");
      else if (code === "no_numbers") setOrderError("no_numbers");
      else if (code === "no_balance") setOrderError("no_balance");
      else if (code === "provider_error") setOrderError("provider_error");
      else setOrderError("unknown");
    },
  });

  const { data: order } = useQuery<OrderResponse>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => fetchApi<OrderResponse>(`/api/orders/${orderId}`, await getToken()),
    enabled: !!orderId && step === 3,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.smsCode || d?.status === "cancelled" || d?.status === "expired") return false;
      return 2500;
    },
  });

  useEffect(() => {
    if (order?.status === "completed" || order?.smsCode) {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    }
  }, [order?.status, order?.smsCode, queryClient]);

  useEffect(() => {
    if (!order) return;
    if (order.status === "cancelled" || order.status === "expired" || order.status === "completed" || order.smsCode) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [order?.status, order?.smsCode]);

  // ─── Filtrage & tri des services ──────────────────────────────────────────

  const filteredServices = useMemo(() => {
    const list = allServices ?? [];
    const q = serviceSearch.trim();

    // 1. Filtre par catégorie
    const byCategory =
      activeCategory === "all"
        ? list
        : list.filter((s) => getCategory(s) === activeCategory);

    // 2. Filtre par recherche
    const bySearch = q
      ? byCategory.filter((s) => matchesSearch(s.name, q))
      : byCategory;

    // 3. Tri : disponible > avec icône > populaire > alphabétique
    return [...bySearch].sort((a, b) => {
      const aAvail = a.available ? 0 : 1;
      const bAvail = b.available ? 0 : 1;
      if (aAvail !== bAvail) return aAvail - bAvail;

      const aHasIcon = a.icon ? 0 : 1;
      const bHasIcon = b.icon ? 0 : 1;
      if (aHasIcon !== bHasIcon) return aHasIcon - bHasIcon;

      const aRank = a.popularRank ?? 9999;
      const bRank = b.popularRank ?? 9999;
      if (aRank !== bRank) return aRank - bRank;

      return a.name.localeCompare(b.name, "fr");
    });
  }, [allServices, serviceSearch, activeCategory]);

  // Compteur par catégorie
  const categoryCounts = useMemo(() => {
    const list = allServices ?? [];
    const counts: Record<CategoryId, number> = {
      all: list.length, social: 0, messaging: 0, entertainment: 0,
      music: 0, finance: 0, marketplace: 0, email: 0, dating: 0, services: 0,
    };
    for (const s of list) {
      const c = getCategory(s);
      counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [allServices]);

  const { countryGroups, alphabet } = useMemo(() => {
    const list = (countries ?? [])
      .filter((c) => c.available)
      .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

    const q = countrySearch.trim();
    const filtered = q ? list.filter((c) => matchesSearch(c.name, q)) : list;

    const groups: { letter: string; items: typeof filtered }[] = [];
    let cur = "";
    for (const c of filtered) {
      const letter = normalize(c.name[0]).toUpperCase();
      if (letter !== cur) {
        cur = letter;
        groups.push({ letter, items: [] });
      }
      groups[groups.length - 1].items.push(c);
    }
    return { countryGroups: groups, alphabet: groups.map((g) => g.letter) };
  }, [countries, countrySearch]);

  const serviceInCountry = useMemo(() => {
    if (!servicesForCountry || !selectedService) return undefined;
    return servicesForCountry.find((s) => s.code === selectedService.code);
  }, [servicesForCountry, selectedService]);

  const comboAvailable = selectedCountry
    ? loadingServicesForCountry
      ? null
      : servicesForCountry != null
        ? serviceInCountry != null && serviceInCountry.available
        : null
    : null;

  const priceForOrder = serviceInCountry?.priceFrom ?? null;
  const hasBalance = me && priceForOrder != null ? me.balance >= priceForOrder : false;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const resetOrder = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDirection("back");
    setStep(1);
    setOrderId("");
    setOrderError("");
    setSelectedService(null);
    setSelectedCountry(null);
    setServiceSearch("");
    setCountrySearch("");
    setActiveCategory("all");
  };

  const goToCountries = (service: Service) => {
    if (!service.available) return;
    setSelectedService(service);
    setSelectedCountry(null);
    setCountrySearch("");
    setDirection("forward");
    setStep(2);
  };

  const goBackToServices = () => {
    setDirection("back");
    setStep(1);
    setSelectedCountry(null);
  };

  const scrollToLetter = (letter: string) => {
    const el = countryListRef.current?.querySelector<HTMLElement>(`[data-letter="${letter}"]`);
    if (el && countryListRef.current) countryListRef.current.scrollTop = el.offsetTop - 8;
  };

  const handlePlaceOrder = () => {
    if (!selectedService || !selectedCountry) return;
    setOrderError("");
    createOrder.mutate({
      serviceCode: selectedService.code,
      countryCode: selectedCountry.code,
    });
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ─── Variants d'animation ──────────────────────────────────────────────────

  const stepVariants = {
    enter: (dir: "forward" | "back") => ({
      x: dir === "forward" ? 40 : -40,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: "forward" | "back") => ({
      x: dir === "forward" ? -40 : 40,
      opacity: 0,
    }),
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[80vh] max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <motion.div
        className="mb-6 sm:mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 text-foreground">
          Commander un numéro
        </h1>
        <p className="text-muted-foreground text-sm">
          Recevez votre code SMS en quelques secondes
        </p>
      </motion.div>

      {/* Barre de progression */}
      <motion.div
        className="flex items-center gap-2 mb-6 sm:mb-8 overflow-x-auto pb-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 shrink-0">
            <motion.div
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                step === s.id
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_hsl(24_90%_52%/0.28)]"
                  : step > s.id
                    ? "bg-primary/12 text-primary"
                    : "bg-secondary text-muted-foreground"
              }`}
              animate={step === s.id ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              {step > s.id ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <s.icon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </motion.div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-5 sm:w-10 transition-colors duration-500 ${
                  step > s.id ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait" custom={direction}>
        {/* ─── ÉTAPE 1 : Choix du service ───────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="bg-white border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base sm:text-lg font-bold mb-0.5">
                  Quel service voulez-vous vérifier ?
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Choisissez l'application pour laquelle vous avez besoin d'un numéro.
                </p>
              </div>

              {/* Barre de recherche */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={serviceSearchRef}
                  type="text"
                  placeholder="Rechercher WhatsApp, Instagram…"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                />
                {serviceSearch && (
                  <button
                    onClick={() => {
                      setServiceSearch("");
                      serviceSearchRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtres de catégories */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1 scrollbar-thin">
                {CATEGORIES.map((cat) => {
                  const count = categoryCounts[cat.id] ?? 0;
                  if (cat.id !== "all" && count === 0) return null;
                  const isActive = activeCategory === cat.id;
                  return (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground border border-border"
                      }`}
                    >
                      <cat.Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                      <span
                        className={`text-[10px] font-bold px-1 rounded ${
                          isActive ? "bg-white/20" : "bg-border/50"
                        }`}
                      >
                        {count}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Grille de services */}
              {loadingServices ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2">
                  {Array.from({ length: 21 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="h-20 bg-secondary animate-pulse rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                    />
                  ))}
                </div>
              ) : filteredServices.length === 0 ? (
                <motion.div
                  className="text-center py-10 text-muted-foreground text-sm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  Aucun service trouvé
                  {serviceSearch && ` pour « ${serviceSearch} »`}
                  <br />
                  <button
                    onClick={() => {
                      setServiceSearch("");
                      setActiveCategory("all");
                    }}
                    className="mt-3 text-primary hover:underline text-xs font-medium"
                  >
                    Réinitialiser les filtres
                  </button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredServices.map((service, index) => {
                    const unavail = !service.available;
                    return (
                      <motion.button
                        key={service.code}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.18,
                          delay: Math.min(index * 0.008, 0.3),
                        }}
                        whileHover={!unavail ? { scale: 1.05, y: -2 } : {}}
                        whileTap={!unavail ? { scale: 0.96 } : {}}
                        onMouseEnter={() => !unavail && prefetchCountries(service.code)}
                        onFocus={() => !unavail && prefetchCountries(service.code)}
                        onClick={() => goToCountries(service)}
                        disabled={unavail}
                        className={`group relative flex flex-col items-center justify-center gap-1.5 p-2 border rounded-xl transition-all text-center ${
                          unavail
                            ? "border-border bg-secondary/50 opacity-40 cursor-not-allowed"
                            : "border-border bg-white hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-md cursor-pointer"
                        }`}
                      >
                        {!service.verified && (
                          <span className="absolute top-0.5 right-0.5 text-[8px] font-bold bg-amber-100 text-amber-700 w-3 h-3 rounded-full flex items-center justify-center">
                            ?
                          </span>
                        )}
                        <div className="w-8 h-8 flex items-center justify-center">
                          <ServiceIcon service={service} size="md" />
                        </div>
                        <span className="text-[10px] font-semibold text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2 leading-tight w-full">
                          {service.name}
                        </span>
                        {service.priceFrom != null && !unavail && (
                          <span className="text-[9px] font-bold text-primary">
                            {service.priceFrom.toFixed(2)}€
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Compteur */}
              {!loadingServices && filteredServices.length > 0 && (
                <div className="mt-3 text-center text-[11px] text-muted-foreground">
                  {filteredServices.length} service{filteredServices.length > 1 ? "s" : ""}{" "}
                  {activeCategory !== "all" && `dans ${CATEGORIES.find((c) => c.id === activeCategory)?.label}`}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── ÉTAPE 2 : Choix du pays ─────────────────────────────────── */}
        {step === 2 && selectedService && (
          <motion.div
            key="step2"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
              {/* En-tête service */}
              <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-border bg-secondary/40">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={goBackToServices}
                  className="p-1.5 rounded-lg hover:bg-border transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </motion.button>
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <ServiceIcon service={selectedService} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold">{selectedService.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    — choisissez un pays
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {/* Recherche pays */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={countrySearchRef}
                    type="text"
                    placeholder="Rechercher un pays…"
                    value={countrySearch}
                    onChange={(e) => {
                      setCountrySearch(e.target.value);
                      setSelectedCountry(null);
                    }}
                    className="w-full pl-10 pr-9 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  {countrySearch && (
                    <button
                      onClick={() => {
                        setCountrySearch("");
                        countrySearchRef.current?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {loadingCountries ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="h-12 bg-secondary animate-pulse rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div
                      ref={countryListRef}
                      className="flex-1 max-h-[360px] overflow-y-auto space-y-2.5 pr-1 scroll-smooth"
                    >
                      {countryGroups.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                          <Globe2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                          Aucun pays trouvé pour «&nbsp;{countrySearch}&nbsp;»
                        </div>
                      ) : (
                        countryGroups.map((group) => (
                          <div key={group.letter} data-letter={group.letter}>
                            {!countrySearch && (
                              <div className="sticky top-0 z-10 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider py-1 px-1 bg-white/95 backdrop-blur-sm">
                                {group.letter}
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {group.items.map((country) => {
                                const isSelected = selectedCountry?.code === country.code;
                                return (
                                  <motion.button
                                    key={country.code}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                      setSelectedCountry({
                                        code: country.code,
                                        name: country.name,
                                        flag: country.flag,
                                        dialCode: country.dialCode,
                                      })
                                    }
                                    className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-xl text-left transition-all ${
                                      isSelected
                                        ? "border-primary bg-primary/6 shadow-[0_0_0_2px_hsl(24_90%_52%/0.15)]"
                                        : "border-border bg-white hover:border-primary/40 hover:bg-primary/[0.02]"
                                    }`}
                                  >
                                    <span className="text-lg shrink-0">{country.flag}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-semibold truncate">
                                        {country.name}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        {country.dialCode && (
                                          <span className="text-[10px] text-primary font-mono font-bold">
                                            {country.dialCode}
                                          </span>
                                        )}
                                        {country.stock != null && (
                                          <span
                                            className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                                              country.stock >= 100
                                                ? "bg-green-100 text-green-700"
                                                : country.stock >= 10
                                                  ? "bg-amber-100 text-amber-700"
                                                  : "bg-red-100 text-red-700"
                                            }`}
                                          >
                                            {country.stock >= 1000
                                              ? `${Math.floor(country.stock / 1000)}k+`
                                              : country.stock}
                                          </span>
                                        )}
                                        {country.servicePrice != null && (
                                          <span className="text-[10px] font-bold text-primary">
                                            {country.servicePrice.toFixed(2)}€
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                      </motion.div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {!countrySearch && alphabet.length > 3 && (
                      <div className="hidden sm:flex flex-col gap-0.5 py-1 shrink-0">
                        {alphabet.map((l) => (
                          <button
                            key={l}
                            onClick={() => scrollToLetter(l)}
                            className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors w-5 text-center"
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Récapitulatif */}
              <AnimatePresence>
                {selectedCountry && (
                  <motion.div
                    ref={recapRef}
                    key={selectedCountry.code}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="border-t border-border px-4 sm:px-5 py-4 bg-gradient-to-b from-secondary/40 to-secondary/20"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Service</span>
                        <div className="flex items-center gap-2 font-semibold">
                          <ServiceIcon service={selectedService} size="sm" />
                          {selectedService.name}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Pays</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {selectedCountry.flag} {selectedCountry.name}
                            {selectedCountry.dialCode && (
                              <span className="text-muted-foreground font-mono text-xs ml-1">
                                ({selectedCountry.dialCode})
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => setSelectedCountry(null)}
                            className="text-[10px] text-muted-foreground hover:text-primary underline"
                          >
                            Changer
                          </button>
                        </div>
                      </div>

                      {comboAvailable === null ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Vérification disponibilité…
                        </div>
                      ) : comboAvailable === false ? (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">{selectedService.name}</span> n'est pas
                            disponible pour{" "}
                            <span className="font-semibold">{selectedCountry.name}</span>. Choisissez
                            un autre pays.
                          </div>
                        </motion.div>
                      ) : (
                        <>
                          {priceForOrder != null && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center justify-between border-t border-border pt-3"
                            >
                              <span className="text-sm text-muted-foreground">Prix</span>
                              <span className="text-xl font-extrabold gradient-text">
                                {priceForOrder.toFixed(2)} €
                              </span>
                            </motion.div>
                          )}
                          {serviceInCountry?.stock != null && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Numéros disponibles</span>
                              <span
                                className={`font-bold text-xs px-2.5 py-1 rounded-lg ${
                                  serviceInCountry.stock >= 100
                                    ? "bg-green-100 text-green-700"
                                    : serviceInCountry.stock >= 10
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {serviceInCountry.stock >= 100
                                  ? `${serviceInCountry.stock}+`
                                  : serviceInCountry.stock}{" "}
                                numéros
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Wallet className="w-3.5 h-3.5" /> Votre solde
                            </span>
                            <span
                              className={`font-bold ${
                                hasBalance ? "text-green-600" : "text-destructive"
                              }`}
                            >
                              {me?.balance.toFixed(2) ?? "—"} €
                            </span>
                          </div>

                          {!isSignedIn ? (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 text-primary px-4 py-3 rounded-xl text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                Connectez-vous pour finaliser votre commande.
                              </div>
                              <Link
                                href="/sign-in"
                                className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all text-sm shadow-[0_4px_14px_hsl(24_90%_52%/0.28)]"
                              >
                                Se connecter <ArrowRight className="w-4 h-4" />
                              </Link>
                            </div>
                          ) : !hasBalance ? (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                Solde insuffisant. Rechargez votre portefeuille.
                              </div>
                              <Link
                                href="/wallet"
                                className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all text-sm shadow-[0_4px_14px_hsl(24_90%_52%/0.28)]"
                              >
                                <Wallet className="w-4 h-4" /> Recharger mon solde{" "}
                                <ArrowRight className="w-4 h-4" />
                              </Link>
                            </div>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handlePlaceOrder}
                              disabled={createOrder.isPending}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_4px_14px_hsl(24_90%_52%/0.28)] text-sm mt-1"
                            >
                              {createOrder.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" /> Activation en
                                  cours…
                                </>
                              ) : (
                                <>
                                  Confirmer la commande <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </motion.button>
                          )}
                        </>
                      )}

                      {orderError === "insufficient_balance" ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          Solde insuffisant.{" "}
                          <Link href="/wallet" className="underline font-semibold ml-1">
                            Recharger
                          </Link>
                        </div>
                      ) : orderError === "no_numbers" ? (
                        <div className="bg-amber-950/40 border border-amber-700/50 text-amber-200 px-4 py-4 rounded-xl text-sm space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                            <div>
                              <p className="font-semibold text-amber-100">
                                Stock épuisé — {selectedService?.name ?? "ce service"}
                                {selectedCountry ? ` · ${selectedCountry.name}` : ""}
                              </p>
                              <p className="mt-1 text-amber-300/80 leading-relaxed">
                                Aucun numéro disponible pour le moment. Notre stock se renouvelle
                                régulièrement — revenez dans quelques heures ou essayez un autre
                                pays.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCountry(null);
                              setOrderError("");
                            }}
                            className="ml-6 text-xs text-amber-300 underline underline-offset-2 hover:text-amber-100 transition-colors"
                          >
                            Essayer un autre pays
                          </button>
                        </div>
                      ) : orderError === "provider_error" || orderError === "unknown" ? (
                        <div className="flex items-center gap-2 bg-red-950/40 border border-red-700/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                          Une erreur est survenue côté fournisseur. Veuillez réessayer.
                        </div>
                      ) : orderError ? (
                        <div className="flex items-center gap-2 bg-red-950/40 border border-red-700/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                          {orderError}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ─── ÉTAPE 3 : Suivi de commande ─────────────────────────────── */}
        {step === 3 && (
          <motion.div
            key="step3"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="bg-white border border-border rounded-2xl p-5 sm:p-8 shadow-sm">
              <div className="max-w-md mx-auto">
                {!order ? (
                  <motion.div
                    className="flex flex-col items-center gap-5 py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </motion.div>
                    <p className="text-muted-foreground font-medium">
                      Activation du numéro en cours…
                    </p>
                  </motion.div>
                ) : order.status === "cancelled" || order.status === "expired" ? (
                  <motion.div
                    className="flex flex-col items-center gap-4 py-10"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold">
                      Commande {order.status === "cancelled" ? "annulée" : "expirée"}
                    </h3>
                    <p className="text-muted-foreground text-sm text-center">
                      Le montant a été remboursé sur votre solde.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={resetOrder}
                      className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-[0_4px_14px_hsl(24_90%_52%/0.25)] text-sm mt-2"
                    >
                      Nouvelle commande
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="space-y-5">
                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <motion.div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                          order.smsCode
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-primary/10 text-primary border border-primary/20"
                        }`}
                        animate={order.smsCode ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        {order.smsCode ? (
                          <>
                            <Sparkles className="w-4 h-4" /> Code SMS reçu !
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> En attente du SMS…
                          </>
                        )}
                      </motion.div>
                    </motion.div>

                    {(selectedService || selectedCountry) && (
                      <motion.div
                        className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {selectedService && (
                          <span className="flex items-center gap-1.5">
                            <ServiceIcon service={selectedService} size="sm" />
                            {selectedService.name}
                          </span>
                        )}
                        {selectedService && selectedCountry && (
                          <span className="text-border">·</span>
                        )}
                        {selectedCountry && (
                          <span>
                            {selectedCountry.flag} {selectedCountry.name}
                            {selectedCountry.dialCode && (
                              <span className="ml-1 font-mono text-primary font-bold">
                                {selectedCountry.dialCode}
                              </span>
                            )}
                          </span>
                        )}
                      </motion.div>
                    )}

                    {order.phoneNumber && (
                      <motion.div
                        className="bg-secondary border border-border rounded-2xl p-5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">
                          Votre numéro virtuel
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-2xl font-bold font-mono tracking-wider">
                            {order.phoneNumber}
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => copyText(order.phoneNumber!)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-sm font-semibold hover:border-primary/40 transition-colors"
                          >
                            {copied ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            {copied ? "Copié !" : "Copier"}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}

                    {!order.smsCode && (
                      <motion.div
                        className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <strong>Étape suivante :</strong> Saisissez ce numéro dans{" "}
                        {selectedService?.name} pour recevoir le code de vérification.
                      </motion.div>
                    )}

                    {order.smsCode ? (
                      <motion.div
                        className="bg-green-50 border border-green-200 rounded-2xl p-5"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <div className="text-xs text-green-700 uppercase tracking-wider mb-3 font-semibold">
                          Code de vérification
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <motion.span
                            className="text-3xl font-black font-mono tracking-[0.15em] text-green-700"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          >
                            {order.smsCode}
                          </motion.span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => copyText(order.smsCode!)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-green-200 rounded-xl text-sm font-semibold text-green-700 hover:bg-green-50 transition-colors"
                          >
                            {copied ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                            {copied ? "Copié !" : "Copier"}
                          </motion.button>
                        </div>
                        {order.smsText && (
                          <p className="mt-3 text-xs text-muted-foreground bg-white/70 rounded-xl p-3 font-mono border border-green-100">
                            {order.smsText}
                          </p>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        className="text-sm text-muted-foreground text-center py-3 flex items-center justify-center gap-2"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Envoyez le code de vérification sur ce numéro…
                      </motion.div>
                    )}

                    <div className="flex gap-3 pt-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={resetOrder}
                        className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                      >
                        Nouvelle commande
                      </motion.button>
                      <Link href="/dashboard" className="flex-1">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold hover:bg-primary/15 transition-colors"
                        >
                          Dashboard <ArrowRight className="w-4 h-4" />
                        </motion.div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}