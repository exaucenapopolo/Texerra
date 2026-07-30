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

/* --- COMPOSANTS D'ILLUSTRATIONS PROFESSIONNELLES (Remplacement des Emojis) --- */

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
      const randomTime = Math.floor(Math.random() * 20) + 5; // Entre 5 et 25 secondes

      setNotification({
        country: `${randomCountry.flag} ${randomCountry.name}`,
        service: randomService,
        time: randomTime
      });

      // La notification disparaît après 6 secondes
      setTimeout(() => setNotification(null), 6000);
    };

    // Première notification après 3 secondes
    const initialTimeout = setTimeout(generateNotification, 3000);

    // Ensuite, une notification toutes les 15 à 25 secondes
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
    title: "Texerra — L'image professionnelle que votre entreprise mérite",
    description: "Texerra aide les entreprises et particuliers à obtenir des numéros virtuels étrangers : image professionnelle, vérification de compte, code OTP. WhatsApp Business, Instagram, Telegram, Google. Paiement Orange Money, MTN, carte bancaire.",
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
                  Donnez à votre<br />
                  entreprise une image<br />
                  <span className="gradient-text">plus crédible.</span>
                </h1>

                <p className="text-xl text-foreground/70 mb-3 font-medium">
                  L'image professionnelle que votre entreprise mérite.
                </p>

                <p className="text-base text-muted-foreground mb-10 max-w-lg leading-relaxed">
                  Un numéro virtuel du pays de votre choix change tout : plus de confiance, meilleure première impression, accès aux grandes plateformes. Activé en moins de 60 secondes.
                </p>

                <div className="flex flex-wrap items-center gap-4 mb-14">
                  <Link
                    href="/order"
                    className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all duration-200 shadow-[0_8px_32px_hsl(24_90%_52%/0.32)] hover:shadow-[0_12px_40px_hsl(24_90%_52%/0.42)] hover:-translate-y-0.5 text-base"
                  >
                    Obtenir mon numéro <ArrowRight className="w-5 h-5" />
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
                  { value: stats ? `${stats.totalOrders.toLocaleString()}+` : "12 847+", label: "Numéros activés" },
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
              className="hidden lg:flex items-center justify-center"
            >
              <SmsDemo />
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

      {/* ── Pourquoi TEXERRA ── */}
      <section id="pourquoi" className="py-24 bg-secondary/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Pourquoi TEXERRA ?</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5">
              Ce que vous gagnez vraiment
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              TEXERRA ne vend pas un simple numéro. TEXERRA vous donne les moyens d'être perçu différemment — dès le premier contact.
            </p>
          </motion.div>

          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {[
              {
                icon: Star,
                color: "bg-amber-50 text-amber-600",
                title: "Inspirez confiance plus vite",
                desc: "Un numéro du bon pays positionne immédiatement votre entreprise comme sérieuse, locale et établie.",
              },
              {
                icon: TrendingUp,
                color: "bg-primary/8 text-primary",
                title: "Image plus premium",
                desc: "Présentez-vous avec l'assurance d'une entreprise implantée là où se trouvent vos clients.",
              },
              {
                icon: Users,
                color: "bg-blue-50 text-blue-600",
                title: "Convainquez prospects & partenaires",
                desc: "Vos interlocuteurs vous prendront davantage au sérieux. Plus d'opportunités, moins de barrières.",
              },
              {
                icon: Globe2,
                color: "bg-emerald-50 text-emerald-600",
                title: "Présence internationale",
                desc: "Obtenez un numéro de n'importe quel pays — États-Unis, France, UK, RDC, Nigeria et 205+ autres.",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={gridItem} className="bg-white border border-border rounded-2xl p-7 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm mb-2.5 text-foreground leading-snug">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── À qui s'adresse TEXERRA ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Pour qui ?</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
              TEXERRA s'adresse à tout le monde
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Que vous ayez besoin d'un numéro pour votre image, pour vérifier un compte ou simplement pour un usage personnel — TEXERRA a ce qu'il vous faut.
            </p>
          </motion.div>

          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-4"
          >
            {[
              {
                type: 'building' as const,
                title: "Entrepreneurs & dirigeants",
                desc: "Obtenez un numéro du pays où se trouvent vos clients ou partenaires pour inspirer plus de confiance.",
              },
              {
                type: 'phone' as const,
                title: "Agences & freelances",
                desc: "Gérez des comptes clients sur plusieurs plateformes avec une image professionnelle et internationale.",
              },
              {
                type: 'cart' as const,
                title: "E-commerçants",
                desc: "Donnez à votre boutique en ligne une présence locale dans les marchés que vous ciblez.",
              },
              {
                type: 'lock' as const,
                title: "Vérification de compte",
                desc: "Recevez un code OTP pour activer un compte sur n'importe quelle plateforme. Simple, rapide, discret.",
              },
              {
                type: 'app' as const,
                title: "Accès aux plateformes",
                desc: "WhatsApp Business, Instagram, Google, TikTok, Telegram — obtenez le numéro requis pour vous inscrire.",
              },
              {
                type: 'user' as const,
                title: "Usage personnel",
                desc: "Besoin d'un numéro d'un pays précis ? Que ce soit pour vous ou votre activité — choisissez simplement le pays et commandez.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={gridItem}
                className="flex flex-col gap-3 bg-white border border-border rounded-2xl px-6 py-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                    <MiniIllus type={item.type} />
                  </div>
                  <span className="text-sm font-bold text-foreground">{item.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
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

      {/* ── Couverture mondiale ── */}
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
              <p className="text-xs uppercase tracking-widest text-primary font-bold">L'équipe TEXERRA</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
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
                  q: "Est-ce vraiment un vrai numéro actif ?",
                  a: "Oui. TEXERRA vous fournit de vrais numéros actifs dans les pays de votre choix — pas des numéros fictifs. Ils reçoivent des SMS réels et sont acceptés par toutes les grandes plateformes mondiales.",
                },
                {
                  q: "Puis-je obtenir un numéro africain — pas seulement étranger ?",
                  a: "Absolument. Vous pouvez commander un numéro de n'importe quel pays africain : RDC, Nigeria, Côte d'Ivoire, Sénégal, Ghana, Kenya et bien d'autres. Si votre clientèle est dans un pays précis, prenez le numéro de ce pays pour inspirer plus de confiance.",
                },
                {
                  q: "Puis-je utiliser TEXERRA juste pour recevoir un code OTP ?",
                  a: "Oui, c'est même l'un des usages les plus courants. Commandez un numéro du pays requis, recevez votre code de vérification en quelques secondes, et c'est tout. Simple et rapide.",
                },
                {
                  q: "Combien de temps le numéro est-il valide ?",
                  a: "Nos numéros sont valides 20 minutes — largement suffisant pour recevoir votre code. Si vous n'obtenez pas de SMS, annulez en un clic et récupérez votre solde automatiquement.",
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
                  q: "Le solde a-t-il une date d'expiration ?",
                  a: "Non. Votre solde est permanent. Rechargez une fois, utilisez quand vous voulez — sans pression ni délai.",
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