import { useState, useEffect, useRef, useMemo } from "react";
import { useMeta } from "../lib/use-meta";
import {
  useGetServices, useGetCountries, useCreateOrder, useGetOrder,
  getGetOrderQueryKey, getGetMeQueryKey, getGetServicesQueryKey,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe2, Smartphone, CheckCircle2, Copy, RefreshCw, ArrowLeft,
  Loader2, Wallet, ArrowRight, Search, AlertCircle, X,
} from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { useAuth } from "../lib/auth-context";

const STORAGE_KEY = "texerra_active_order";

const ICON_COLORS: Record<string, string> = {
  instagram: "E1306C", whatsapp: "25D366", telegram: "26A5E4", facebook: "1877F2",
  google: "4285F4", tiktok: "000000", x: "000000", apple: "000000",
  amazon: "FF9900", microsoft: "737373", discord: "5865F2", snapchat: "FFCC00",
  netflix: "E50914", uber: "000000", linkedin: "0A66C2", paypal: "003087",
  binance: "F0B90B", tinder: "FF4458", viber: "665CAC", youtube: "FF0000",
  signal: "3A76F0", spotify: "1DB954", reddit: "FF4500", airbnb: "FF5A5F",
  slack: "4A154B", github: "000000", twitch: "9146FF", pinterest: "E60023",
  wechat: "07C160", vk: "0077FF", yandex: "FC3F1D", aliexpress: "FF4747",
  ebay: "E43137", etsy: "F16521", coinbase: "0052FF", yahoo: "6001D2",
  gmail: "EA4335", protonmail: "6D4AFF", dropbox: "0061FF", openai: "000000",
  zoom: "2D8CFF", kakaotalk: "FAE100", line: "00B900", naver: "03C75A",
  tencentqq: "12B7F5", mailru: "005FF9", deliveroo: "00CCBC", kucoin: "23AF91",
  cryptodotcom: "002D74", shein: "000000",
};

function svcIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null;
  const color = ICON_COLORS[icon] ?? "555555";
  return `https://cdn.simpleicons.org/${icon}/${color}`;
}

/** Normalise une chaîne : minuscules + suppression d'accents pour une recherche robuste */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return normalize(text).includes(normalize(query));
}

const steps = [
  { id: 1, label: "Service", icon: Smartphone },
  { id: 2, label: "Pays", icon: Globe2 },
  { id: 3, label: "Numéro", icon: CheckCircle2 },
];

type SelectedService = { code: string; name: string; priceFrom?: number | null; icon?: string | null };
type SelectedCountry = { code: string; name: string; flag: string; dialCode?: string | null };

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

  const [step, setStep] = useState(1);
  const [serviceSearch, setServiceSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedService, setSelectedService] = useState<SelectedService | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
  const [orderId, setOrderId] = useState<string>("");
  const [orderError, setOrderError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const countryListRef = useRef<HTMLDivElement>(null);
  const serviceSearchRef = useRef<HTMLInputElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);

  // Restore active order on mount
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus search on step change
  useEffect(() => {
    if (step === 1) setTimeout(() => serviceSearchRef.current?.focus(), 120);
    if (step === 2) setTimeout(() => countrySearchRef.current?.focus(), 120);
  }, [step]);

  const resetOrder = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStep(1);
    setOrderId("");
    setOrderError("");
    setSelectedService(null);
    setSelectedCountry(null);
    setServiceSearch("");
    setCountrySearch("");
  };

  const { data: me } = useGetMe();
  const { data: allServices, isLoading: loadingServices } = useGetServices();
  const countriesParams = selectedService ? { serviceCode: selectedService.code } : undefined;
  const { data: countries, isLoading: loadingCountries } = useGetCountries(countriesParams, {
    query: {
      queryKey: ["/api/countries", countriesParams] as const,
      enabled: !!selectedService,
    },
  });

  // Fetch services for selected country to get accurate price & availability
  const servicesForCountryKey = selectedCountry
    ? getGetServicesQueryKey({ countryCode: selectedCountry.code })
    : null;
  const { data: servicesForCountry, isLoading: loadingServicesForCountry } = useGetServices(
    selectedCountry ? { countryCode: selectedCountry.code } : undefined,
    {
      query: {
        queryKey: servicesForCountryKey ?? ["disabled"],
        enabled: !!selectedCountry,
        staleTime: 30_000,
      },
    }
  );

  const createOrder = useCreateOrder();

  const { data: order } = useGetOrder(orderId, {
    query: {
      queryKey: getGetOrderQueryKey(orderId),
      enabled: !!orderId && step === 3,
      refetchInterval: (query) => {
        const d = query.state.data;
        if (d?.smsCode || d?.status === "cancelled" || d?.status === "expired") return false;
        return 2500;
      },
    },
  });

  useEffect(() => {
    if (order?.status === "completed" || order?.smsCode) {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    }
  }, [order?.status, order?.smsCode, queryClient]);

  useEffect(() => {
    if (!order) return;
    if (order.status === "cancelled" || order.status === "expired" || order.status === "completed" || order.smsCode) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [order?.status, order?.smsCode]);

  // ── Filtered & sorted services ──────────────────────────────────────────
  const filteredServices = useMemo(() => {
    const list = allServices ?? [];
    const q = serviceSearch.trim();
    return q ? list.filter(s => matchesSearch(s.name, q)) : list;
  }, [allServices, serviceSearch]);

  // ── Filtered, sorted & grouped countries ────────────────────────────────
  const { filteredCountries, countryGroups, alphabet } = useMemo(() => {
    const list = (countries ?? [])
      .filter(c => c.available)
      .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

    const q = countrySearch.trim();
    const filtered = q ? list.filter(c => matchesSearch(c.name, q)) : list;

    const groups: { letter: string; items: typeof filtered }[] = [];
    let cur = "";
    for (const c of filtered) {
      const letter = normalize(c.name[0]).toUpperCase();
      if (letter !== cur) { cur = letter; groups.push({ letter, items: [] }); }
      groups[groups.length - 1].items.push(c);
    }
    return { filteredCountries: filtered, countryGroups: groups, alphabet: groups.map(g => g.letter) };
  }, [countries, countrySearch]);

  // ── Combo availability & pricing (keyed by selectedCountry.code) ─────────
  const serviceInCountry = useMemo(() => {
    if (!servicesForCountry || !selectedService) return undefined;
    return servicesForCountry.find(s => s.code === selectedService.code);
  }, [servicesForCountry, selectedService]);

  const comboAvailable = selectedCountry
    ? loadingServicesForCountry
      ? null   // still loading
      : servicesForCountry != null
        ? (serviceInCountry != null && serviceInCountry.available)
        : null
    : null;

  const priceForOrder = serviceInCountry?.priceFrom ?? null;
  const hasBalance = me && priceForOrder != null ? me.balance >= priceForOrder : false;

  const scrollToLetter = (letter: string) => {
    const el = countryListRef.current?.querySelector<HTMLElement>(`[data-letter="${letter}"]`);
    if (el && countryListRef.current) countryListRef.current.scrollTop = el.offsetTop - 8;
  };

  const handlePlaceOrder = () => {
    if (!selectedService || !selectedCountry) return;
    setOrderError("");
    createOrder.mutate(
      { data: { serviceCode: selectedService.code, countryCode: selectedCountry.code } },
      {
        onSuccess: (data) => {
          setOrderId(data.id);
          setStep(3);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            orderId: data.id,
            service: selectedService,
            country: selectedCountry,
          }));
        },
        onError: (err: unknown) => {
          // ApiError (custom-fetch) stores response body in .data, not .response.data
          const apiErr = err as { data?: { error?: string }; status?: number };
          const code = apiErr?.data?.error;
          if (code === "insufficient_balance" || apiErr?.status === 402) setOrderError("insufficient_balance");
          else if (code === "no_numbers") setOrderError("no_numbers");
          else if (code === "no_balance") setOrderError("no_balance");
          else if (code === "provider_error") setOrderError("provider_error");
          else setOrderError("unknown");
        },
      }
    );
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-[80vh] max-w-3xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 text-foreground">Commander un numéro</h1>
        <p className="text-muted-foreground text-sm">Recevez votre code SMS en quelques secondes</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
              step === s.id
                ? "bg-primary text-primary-foreground shadow-[0_4px_14px_hsl(24_90%_52%/0.28)]"
                : step > s.id
                ? "bg-primary/12 text-primary"
                : "bg-secondary text-muted-foreground"
            }`}>
              {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-5 sm:w-10 transition-colors ${step > s.id ? "bg-primary/40" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── Step 1: Choose service ── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <div className="bg-white border border-border rounded-2xl p-5 sm:p-7 shadow-sm">
              <h2 className="text-lg font-bold mb-1">Quel service voulez-vous vérifier ?</h2>
              <p className="text-muted-foreground text-sm mb-5">Choisissez l'application pour laquelle vous avez besoin d'un numéro.</p>

              {/* Search */}
              <div className="relative mb-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={serviceSearchRef}
                  type="text"
                  placeholder="Rechercher WhatsApp, Instagram…"
                  value={serviceSearch}
                  onChange={e => setServiceSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                />
                {serviceSearch && (
                  <button
                    onClick={() => { setServiceSearch(""); serviceSearchRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {loadingServices ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="h-24 bg-secondary animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  Aucun service trouvé pour «&nbsp;{serviceSearch}&nbsp;»
                  <br />
                  <button onClick={() => setServiceSearch("")} className="mt-3 text-primary hover:underline text-xs font-medium">Effacer la recherche</button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredServices.map(service => {
                    const iconUrl = svcIconUrl(service.icon);
                    const unavail = !service.available;
                    return (
                      <button
                        key={service.code}
                        onClick={() => {
                          if (unavail) return;
                          setSelectedService(service);
                          setSelectedCountry(null);
                          setCountrySearch("");
                          setStep(2);
                        }}
                        disabled={unavail}
                        className={`group flex flex-col items-center justify-center gap-2.5 p-4 border rounded-xl transition-all text-center ${
                          unavail
                            ? "border-border bg-secondary/50 opacity-40 cursor-not-allowed"
                            : "border-border bg-white hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-sm cursor-pointer"
                        }`}
                      >
                        <div className="w-10 h-10 flex items-center justify-center">
                          {iconUrl ? (
                            <img src={iconUrl} alt={service.name} className="w-9 h-9 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-base font-extrabold text-primary">
                              {service.name[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2 leading-tight w-full">{service.name}</span>
                        {service.priceFrom != null && !unavail && (
                          <span className="text-xs font-bold text-primary">{service.priceFrom.toFixed(2)}€</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Choose country ── */}
        {step === 2 && selectedService && (
          <motion.div key="step2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">

              {/* Selected service bar */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/40">
                <button onClick={() => { setStep(1); setSelectedCountry(null); }} className="p-1.5 rounded-lg hover:bg-border transition-colors text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {svcIconUrl(selectedService.icon) ? (
                    <img src={svcIconUrl(selectedService.icon)!} alt={selectedService.name} className="w-7 h-7 object-contain" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-extrabold text-primary">
                      {selectedService.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold">{selectedService.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">— choisissez un pays</span>
                </div>
              </div>

              <div className="p-5 sm:p-6">

                {/* Search + alphabet index */}
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      ref={countrySearchRef}
                      type="text"
                      placeholder="Rechercher un pays…"
                      value={countrySearch}
                      onChange={e => { setCountrySearch(e.target.value); setSelectedCountry(null); }}
                      className="w-full pl-10 pr-9 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                    {countrySearch && (
                      <button
                        onClick={() => { setCountrySearch(""); countrySearchRef.current?.focus(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {loadingCountries ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-14 bg-secondary animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {/* Country list */}
                    <div ref={countryListRef} className="flex-1 max-h-[380px] overflow-y-auto space-y-3 pr-1">
                      {countryGroups.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                          <Globe2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                          Aucun pays trouvé pour «&nbsp;{countrySearch}&nbsp;»
                          <br />
                          <button onClick={() => setCountrySearch("")} className="mt-3 text-primary hover:underline text-xs font-medium">Effacer la recherche</button>
                        </div>
                      ) : (
                        countryGroups.map(group => (
                          <div key={group.letter} data-letter={group.letter}>
                            {/* Letter header (only when not searching) */}
                            {!countrySearch && (
                              <div className="sticky top-0 z-10 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider py-1.5 px-1 bg-white/95 backdrop-blur-sm">
                                {group.letter}
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {group.items.map(country => {
                                const isSelected = selectedCountry?.code === country.code;
                                return (
                                  <button
                                    key={country.code}
                                    onClick={() => {
                                      setSelectedCountry({
                                        code: country.code,
                                        name: country.name,
                                        flag: country.flag,
                                        dialCode: country.dialCode,
                                      });
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-left transition-all ${
                                      isSelected
                                        ? "border-primary bg-primary/6 shadow-[0_0_0_2px_hsl(24_90%_52%/0.15)]"
                                        : "border-border bg-white hover:border-primary/40 hover:bg-primary/[0.02]"
                                    }`}
                                  >
                                    <span className="text-xl shrink-0">{country.flag}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold truncate">{country.name}</div>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {country.dialCode && (
                                          <span className="text-xs text-primary font-mono font-bold">{country.dialCode}</span>
                                        )}
                                        {country.stock != null && (
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                            country.stock >= 100 ? "bg-green-100 text-green-700" :
                                            country.stock >= 10  ? "bg-amber-100 text-amber-700" :
                                                                   "bg-red-100 text-red-700"
                                          }`}>
                                            {country.stock >= 1000 ? `${Math.floor(country.stock / 1000)}k+` : country.stock} dispo
                                          </span>
                                        )}
                                        {country.servicePrice != null && (
                                          <span className="text-xs font-bold text-primary">{country.servicePrice.toFixed(2)}€</span>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Alphabet index (only without search, on desktop) */}
                    {!countrySearch && alphabet.length > 3 && (
                      <div className="hidden sm:flex flex-col gap-0.5 py-1 shrink-0">
                        {alphabet.map(l => (
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

              {/* ── Order summary panel (keyed by country code so it always re-renders fresh) ── */}
              {selectedCountry && (
                <div key={selectedCountry.code} className="border-t border-border px-5 sm:px-6 py-5 bg-secondary/30">
                  <div className="space-y-3">

                    {/* Service */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Service</span>
                      <div className="flex items-center gap-2 font-semibold">
                        {svcIconUrl(selectedService.icon) && (
                          <img src={svcIconUrl(selectedService.icon)!} alt="" className="w-4 h-4 object-contain" />
                        )}
                        {selectedService.name}
                      </div>
                    </div>

                    {/* Country — always shows the currently selected country */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pays</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {selectedCountry.flag} {selectedCountry.name}
                          {selectedCountry.dialCode && (
                            <span className="text-muted-foreground font-mono text-xs ml-1">({selectedCountry.dialCode})</span>
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

                    {/* Availability / price */}
                    {comboAvailable === null ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm py-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Vérification disponibilité…
                      </div>
                    ) : comboAvailable === false ? (
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div><span className="font-semibold">{selectedService.name}</span> n'est pas disponible pour <span className="font-semibold">{selectedCountry.name}</span>. Choisissez un autre pays.</div>
                      </div>
                    ) : (
                      <>
                        {priceForOrder != null && (
                          <div className="flex items-center justify-between border-t border-border pt-3">
                            <span className="text-sm text-muted-foreground">Prix</span>
                            <span className="text-xl font-extrabold gradient-text">{priceForOrder.toFixed(2)} €</span>
                          </div>
                        )}
                        {serviceInCountry?.stock != null && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Numéros disponibles</span>
                            <span className={`font-bold text-xs px-2.5 py-1 rounded-lg ${
                              serviceInCountry.stock >= 100 ? "bg-green-100 text-green-700" :
                              serviceInCountry.stock >= 10  ? "bg-amber-100 text-amber-700" :
                                                             "bg-red-100 text-red-700"
                            }`}>
                              {serviceInCountry.stock >= 100 ? `${serviceInCountry.stock}+` : serviceInCountry.stock} numéros
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Votre solde</span>
                          <span className={`font-bold ${hasBalance ? "text-green-600" : "text-destructive"}`}>
                            {me?.balance.toFixed(2) ?? "—"} €
                          </span>
                        </div>

                        {!isSignedIn ? (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 text-primary px-4 py-3 rounded-xl text-sm">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              Connectez-vous pour finaliser votre commande.
                            </div>
                            <Link href="/sign-in" className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all text-sm shadow-[0_4px_14px_hsl(24_90%_52%/0.28)]">
                              Se connecter <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        ) : !hasBalance ? (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              Solde insuffisant. Rechargez votre portefeuille.
                            </div>
                            <Link href="/wallet" className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all text-sm shadow-[0_4px_14px_hsl(24_90%_52%/0.28)]">
                              <Wallet className="w-4 h-4" /> Recharger mon solde <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        ) : (
                          <button
                            onClick={handlePlaceOrder}
                            disabled={createOrder.isPending}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_4px_14px_hsl(24_90%_52%/0.28)] text-sm mt-1"
                          >
                            {createOrder.isPending ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Activation en cours…</>
                            ) : (
                              <>Confirmer la commande <ArrowRight className="w-4 h-4" /></>
                            )}
                          </button>
                        )}
                      </>
                    )}

                    {orderError === "insufficient_balance" ? (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Solde insuffisant. <Link href="/wallet" className="underline font-semibold ml-1">Recharger</Link>
                      </div>
                    ) : orderError === "no_numbers" ? (
                      <div className="bg-amber-950/40 border border-amber-700/50 text-amber-200 px-4 py-4 rounded-xl text-sm space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                          <div>
                            <p className="font-semibold text-amber-100">
                              Stock épuisé — {selectedService?.name ?? "ce service"}{selectedCountry ? ` · ${selectedCountry.name}` : ""}
                            </p>
                            <p className="mt-1 text-amber-300/80 leading-relaxed">
                              Aucun numéro disponible pour le moment. Notre stock se renouvelle régulièrement — revenez dans quelques heures ou essayez un autre pays.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedCountry(null); setOrderError(""); }}
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
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Number + SMS ── */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.28 }}>
            <div className="bg-white border border-border rounded-2xl p-5 sm:p-8 shadow-sm">
              <div className="max-w-md mx-auto">
                {!order ? (
                  <div className="flex flex-col items-center gap-5 py-12">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <p className="text-muted-foreground font-medium">Activation du numéro en cours…</p>
                  </div>
                ) : order.status === "cancelled" || order.status === "expired" ? (
                  <div className="flex flex-col items-center gap-4 py-10">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold">Commande {order.status === "cancelled" ? "annulée" : "expirée"}</h3>
                    <p className="text-muted-foreground text-sm text-center">Le montant a été remboursé sur votre solde.</p>
                    <button onClick={resetOrder}
                      className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-[0_4px_14px_hsl(24_90%_52%/0.25)] text-sm mt-2">
                      Nouvelle commande
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Status badge */}
                    <div className="text-center">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                        order.smsCode
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        {order.smsCode
                          ? <><CheckCircle2 className="w-4 h-4" /> Code SMS reçu !</>
                          : <><RefreshCw className="w-4 h-4 animate-spin" /> En attente du SMS…</>
                        }
                      </div>
                    </div>

                    {/* Service + country info */}
                    {(selectedService || selectedCountry) && (
                      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        {selectedService && (
                          <span className="flex items-center gap-1.5">
                            {svcIconUrl(selectedService.icon) && (
                              <img src={svcIconUrl(selectedService.icon)!} alt="" className="w-4 h-4 object-contain" />
                            )}
                            {selectedService.name}
                          </span>
                        )}
                        {selectedService && selectedCountry && <span className="text-border">·</span>}
                        {selectedCountry && (
                          <span>{selectedCountry.flag} {selectedCountry.name}{selectedCountry.dialCode && <span className="ml-1 font-mono text-primary font-bold">{selectedCountry.dialCode}</span>}</span>
                        )}
                      </div>
                    )}

                    {/* Phone number */}
                    {order.phoneNumber && (
                      <div className="bg-secondary border border-border rounded-2xl p-5">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Votre numéro virtuel</div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-2xl font-bold font-mono tracking-wider">{order.phoneNumber}</span>
                          <button
                            onClick={() => copyText(order.phoneNumber!)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-sm font-semibold hover:border-primary/40 transition-colors"
                          >
                            {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copié !" : "Copier"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Instructions */}
                    {!order.smsCode && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                        <strong>Étape suivante :</strong> Saisissez ce numéro dans {selectedService?.name} pour recevoir le code de vérification.
                      </div>
                    )}

                    {/* SMS Code */}
                    {order.smsCode ? (
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                        <div className="text-xs text-green-700 uppercase tracking-wider mb-3 font-semibold">Code de vérification</div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-3xl font-black font-mono tracking-[0.15em] text-green-700">{order.smsCode}</span>
                          <button
                            onClick={() => copyText(order.smsCode!)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-green-200 rounded-xl text-sm font-semibold text-green-700 hover:bg-green-50 transition-colors"
                          >
                            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copié !" : "Copier"}
                          </button>
                        </div>
                        {order.smsText && (
                          <p className="mt-3 text-xs text-muted-foreground bg-white/70 rounded-xl p-3 font-mono border border-green-100">{order.smsText}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Envoyez le code de vérification sur ce numéro…
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={resetOrder}
                        className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                      >
                        Nouvelle commande
                      </button>
                      <Link href="/dashboard" className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold hover:bg-primary/15 transition-colors">
                        Dashboard <ArrowRight className="w-4 h-4" />
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
