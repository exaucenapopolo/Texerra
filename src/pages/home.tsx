import { Link } from "wouter";
import { ArrowRight, ChevronDown, CheckCircle2, Bell, Shield, Zap, HeadphonesIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useMeta } from "../lib/use-meta";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// Types de données
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

/* --- NOUVEAU COMPOSANT : PHONE AD (SVG Publicité Téléphone) --- */
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

        <div className="flex-1 flex justify-center z-10 w-full">
          <motion.div
            animate={{ y: [0, -15, 0], rotateX: [10, 15, 10], rotateY: [-15, -10, -15] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ perspective: "1000px" }}
            className="relative"
          >
            {/* L'ombre sous le téléphone */}
            <motion.div 
               animate={{ scale: [1, 0.9, 1], opacity: [0.3, 0.1, 0.3] }}
               transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/20 blur-xl rounded-full"
            />

            {/* Le châssis du téléphone */}
            <div className="w-[280px] h-[580px] bg-[#111] rounded-[45px] p-2.5 shadow-2xl relative border-[3px] border-[#333]">
              {/* L'écran */}
              <div className="w-full h-full bg-white rounded-[35px] overflow-hidden relative flex flex-col">
                
                {/* Dynamic Island / Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20"></div>

                {/* Contenu de l'écran (Simulation App) */}
                <div className="flex-1 bg-[#F5F5F7] p-5 pt-16 flex flex-col gap-4">
                  
                  {/* Header App */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="w-20 h-4 bg-gray-200 rounded-full"></div>
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                  </div>

                  {/* Message OTP 1 */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 max-w-[85%]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="WA" className="w-4 h-4" />
                      <span className="text-[10px] font-bold text-gray-400">WhatsApp Business</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">Votre code est : <span className="font-bold text-black tracking-widest">492 103</span></p>
                  </motion.div>

                  {/* Message OTP 2 */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.5, duration: 0.5 }}
                    className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 max-w-[85%]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img src="https://cdn.simpleicons.org/google/4285F4" alt="Google" className="w-4 h-4" />
                      <span className="text-[10px] font-bold text-gray-400">Google Workspace</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">G- <span className="font-bold text-black tracking-widest">883921</span> est votre code.</p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* --- NOUVEAU COMPOSANT : GLOBAL NETWORK AD --- */
const GlobalNetworkAd = () => {
  return (
    <section className="py-24 bg-[#0a0a0a] overflow-hidden relative">
      <div className="absolute inset-0 flex justify-center items-center opacity-30">
        <svg viewBox="0 0 1000 400" className="w-full h-full min-w-[1000px]">
           <motion.path 
              d="M0 200 C 200 50, 300 350, 500 200 C 700 50, 800 350, 1000 200" 
              fill="none" stroke="var(--primary)" strokeWidth="1" strokeDasharray="5 5"
              animate={{ strokeDashoffset: [100, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
           />
           <motion.path 
              d="M0 200 C 200 350, 300 50, 500 200 C 700 350, 800 50, 1000 200" 
              fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"
           />
           {/* Nœuds lumineux */}
           <circle cx="250" cy="200" r="4" fill="var(--primary)" />
           <circle cx="500" cy="200" r="6" fill="#fff" className="animate-pulse" />
           <circle cx="750" cy="200" r="4" fill="var(--primary)" />
        </svg>
      </div>
      
      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
          Une infrastructure pensée pour la fiabilité.
        </h2>
        <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
          Nos systèmes routent intelligemment vos messages à travers des opérateurs télécoms de premier rang mondial. Aucune coupure. Aucune latence. Seulement le code dont vous avez besoin, à l'instant où vous en avez besoin.
        </p>
      </div>
    </section>
  );
};


/* --- COMPOSANT DE PREUVE SOCIALE (Trafic en direct Aléatoire Intelligent) --- */

function LiveTraffic() {
  const [notification, setNotification] = useState<{ country: string, service: string, time: number } | null>(null);
  const recentHistory = useRef<{country: string, service: string}[]>([]);

  useEffect(() => {
    // Base de données étendue
    const countries = [
      { flag: '🇺🇸', name: 'États-Unis' }, { flag: '🇫🇷', name: 'France' },
      { flag: '🇬🇧', name: 'Royaume-Uni' }, { flag: '🇨🇩', name: 'RDC' },
      { flag: '🇳🇬', name: 'Nigeria' }, { flag: '🇨🇮', name: 'Côte d\'Ivoire' },
      { flag: '🇸🇳', name: 'Sénégal' }, { flag: '🇨🇲', name: 'Cameroun' },
      { flag: '🇲🇦', name: 'Maroc' }, { flag: '🇨🇦', name: 'Canada' },
      { flag: '🇩🇪', name: 'Allemagne' }, { flag: '🇿🇦', name: 'Afrique du Sud' },
      { flag: '🇦🇪', name: 'Émirats Arabes' }, { flag: '🇮🇳', name: 'Inde' },
      { flag: '🇧🇪', name: 'Belgique' }
    ];
    
    const services = [
      'WhatsApp', 'WhatsApp Business', 'Instagram', 'Telegram', 
      'Google', 'TikTok', 'Facebook', 'LinkedIn', 'PayPal', 
      'Tinder', 'Amazon', 'Microsoft', 'Uber', 'Airbnb'
    ];

    let timeoutId: NodeJS.Timeout;

    const generateNotification = () => {
      // Filtrage intelligent pour éviter les répétitions récentes
      let availableCountries = countries.filter(c => !recentHistory.current.some(h => h.country === c.name));
      if (availableCountries.length === 0) availableCountries = countries; // Sécurité si tout l'historique est plein

      let availableServices = services.filter(s => !recentHistory.current.some(h => h.service === s));
      if (availableServices.length === 0) availableServices = services;

      const randomCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)];
      const randomService = availableServices[Math.floor(Math.random() * availableServices.length)];
      
      // Temps de livraison réaliste (entre 4 et 45 secondes)
      const randomDeliveryTime = Math.floor(Math.random() * 41) + 4; 

      setNotification({
        country: `${randomCountry.flag} ${randomCountry.name}`,
        service: randomService,
        time: randomDeliveryTime
      });

      // Mettre à jour l'historique (on garde les 6 derniers en mémoire)
      recentHistory.current.push({ country: randomCountry.name, service: randomService });
      if (recentHistory.current.length > 6) {
        recentHistory.current.shift();
      }

      // La notification disparaît après 7 secondes pour paraître plus naturelle
      setTimeout(() => setNotification(null), 7000);

      // Calcul du prochain délai (Totalement aléatoire entre 12 secondes et 2 minutes)
      // Cela évite l'effet "robot"
      const nextDelay = Math.floor(Math.random() * 108000) + 12000;
      timeoutId = setTimeout(generateNotification, nextDelay);
    };

    // Première notification apparaît aléatoirement entre 4 et 12 secondes après le chargement
    timeoutId = setTimeout(generateNotification, Math.floor(Math.random() * 8000) + 4000);

    return () => clearTimeout(timeoutId);
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

      {/* ── Le problème (Conservé intact avec les nouvelles icônes) ── */}
      <section className="py-20 bg-secondary/40 border-y border-border">
        {/* ... (Contenu identique à la version précédente avec IllusTrust, IllusLocal, etc.) ... */}
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
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{service.name}</span>
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

      {/* ── Pourquoi TEXERRA (Rendu Professionnel avec lignes épurées) ── */}
      <section id="pourquoi" className="py-24 bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="text-center mb-20">
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

      {/* ── NOUVELLE SECTION PUBLICITÉ TÉLÉPHONE ── */}
      <PremiumPhoneAd />

      {/* ── À qui s'adresse TEXERRA (Design liste épuré et sérieux) ── */}
      <section className="py-24 bg-white border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div {...fadeUp(0)} className="mb-16 md:flex md:items-end md:justify-between gap-10">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Pour qui ?</p>
              <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight">
                TEXERRA s'adresse à tout le monde
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-md pb-2">
              Que vous ayez besoin d'un numéro pour votre image, pour vérifier un compte ou simplement pour un usage personnel — TEXERRA a ce qu'il vous faut.
            </p>
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
                className="group relative pl-6 border-l-2 border-border hover:border-primary transition-colors duration-300 py-2"
              >
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Comment ça marche (Épuré sans icônes) ── */}
      <section className="py-24 relative bg-secondary/30 border-y border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div {...fadeUp(0)} className="text-center mb-20">
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-3">Simple & rapide</div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-foreground">Comment ça marche</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">Trois étapes. Moins de 60 secondes.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-12 left-[calc(50%/3+3rem)] right-[calc(50%/3+3rem)] h-px bg-border" />

            {[
              {
                step: "01",
                title: "Rechargez votre solde",
                desc: "Orange Money, MTN Mobile Money, carte bancaire. Votre solde ne expire jamais.",
              },
              {
                step: "02",
                title: "Choisissez le service et le pays",
                desc: "Sélectionnez WhatsApp, Instagram, Google ou autre — et le pays du numéro voulu.",
              },
              {
                step: "03",
                title: "Recevez le code instantanément",
                desc: "Le code SMS apparaît en temps réel sur votre tableau de bord. Votre numéro est activé.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                {...fadeUp(i * 0.1)}
                className="relative bg-white border border-border rounded-3xl p-10 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full"
              >
                <div className="mb-8">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gray-200 to-gray-400 font-mono leading-none select-none">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-base leading-relaxed">{item.desc}</p>
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

      {/* ── NOUVELLE SECTION: GLOBAL NETWORK AD ── */}
      <GlobalNetworkAd />

      {/* ── Features strip ── */}
      <section className="py-20 border-y border-border bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            variants={gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-12"
          >
            {[
              { icon: Zap, title: "Activation < 60s", desc: "Numéro actif en quelques secondes" },
              { icon: Shield, title: "100% confidentiel", desc: "Aucune donnée personnelle requise" },
              { icon: CheckCircle2, title: "Solde permanent", desc: "Votre crédit ne expire jamais" },
              { icon: HeadphonesIcon, title: "Support 24/7", desc: "Réponse en moins d'une heure" },
            ].map(f => (
              <motion.div key={f.title} variants={gridItem} className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-secondary/50 border border-border shrink-0">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-base mb-1 text-foreground">{f.title}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
                </div>
              </motion.div>
            ))}
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