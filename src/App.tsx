import { useState } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth-context";
import Layout from "./components/layout";
import Home from "./pages/home";
import Order from "./pages/order";
import Dashboard from "./pages/dashboard";
import Wallet from "./pages/wallet";
import FaqPage from "./pages/faq";
import NotFound from "./pages/not-found";
// ➕ NOUVEAU : page admin
import AdminPage from "./pages/admin";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * ➕ NOUVEAU : adresse administrateur.
 * Sert uniquement à la redirection côté frontend.
 * ⚠️ La vraie protection est côté serveur (`requireAdmin` dans handlers/admin.ts).
 */
const ADMIN_EMAIL = "exaucenapopolo2@gmail.com";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/** Map Firebase auth error codes to user-friendly French messages */
function firebaseErrorMsg(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Adresse e-mail ou mot de passe incorrect.";
    case "auth/email-already-in-use":
      return "Cette adresse e-mail est déjà utilisée.";
    case "auth/weak-password":
      return "Mot de passe trop faible (8 caractères minimum).";
    case "auth/invalid-email":
      return "Adresse e-mail invalide.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    case "auth/network-request-failed":
      return "Erreur réseau. Vérifiez votre connexion.";
    case "auth/popup-blocked":
    case "auth/popup-closed-by-user":
      return "La fenêtre Google a été bloquée ou fermée. Réessayez.";
    default:
      return "Une erreur s'est produite. Veuillez réessayer.";
  }
}

/* ────────────────────────────────────────────────────────────────── */
/* Illustration Sign-In                                               */
/* ────────────────────────────────────────────────────────────────── */
function SignInIllustration() {
  return (
    <div className="relative w-full flex items-center justify-center">
      <div className="absolute inset-0 -m-16 bg-gradient-to-tr from-primary/15 via-transparent to-orange-300/15 blur-3xl rounded-full pointer-events-none" />
      <svg
        viewBox="0 0 480 540"
        className="w-full max-w-[440px] h-auto relative z-10"
        fill="none"
        role="img"
        aria-label="Connexion sécurisée à Texerra SMS — code de vérification reçu"
      >
        <defs>
          <linearGradient id="si-frame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2a2a" />
            <stop offset="0.5" stopColor="#0a0a0a" />
            <stop offset="1" stopColor="#2a2a2a" />
          </linearGradient>
          <linearGradient id="si-screen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#FAFAFA" />
          </linearGradient>
          <radialGradient id="si-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fb923c" stopOpacity="0.28" />
            <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="si-badge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#34d399" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>

        <ellipse cx="240" cy="270" rx="220" ry="250" fill="url(#si-glow)" />

        <motion.circle
          cx="240" cy="270" r="205"
          stroke="#fed7aa" strokeWidth="1" strokeDasharray="4 8" fill="none" strokeOpacity="0.55"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "240px 270px" }}
        />
        <motion.circle
          cx="240" cy="270" r="165"
          stroke="#fdba74" strokeWidth="1" fill="none" strokeOpacity="0.28"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "240px 270px" }}
        />

        <g transform="translate(240 270)">
          <motion.g
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <rect x="-105" y="-215" width="210" height="430" rx="36" fill="url(#si-frame)" />
            <path d="M -95 -205 Q -95 -200 -95 0 L -60 -205 Z" fill="white" fillOpacity="0.05" />
            <rect x="-98" y="-208" width="196" height="416" rx="30" fill="url(#si-screen)" />
            <rect x="-40" y="-200" width="80" height="20" rx="10" fill="#111" />

            <text x="-78" y="-182" fontSize="9" fontWeight="600" fill="#000">9:41</text>
            <rect x="60" y="-186" width="18" height="9" rx="2" fill="#000" opacity="0.85" />
            <rect x="82" y="-186" width="10" height="9" rx="1.5" fill="#000" opacity="0.4" />

            <text x="-78" y="-152" fontSize="7" fill="#94a3b8" fontWeight="700" letterSpacing="1.6">TEXERRA SMS</text>
            <text x="-78" y="-133" fontSize="14" fontWeight="800" fill="#000">Bienvenue</text>

            <rect x="-82" y="-110" width="164" height="118" rx="16" fill="#ffffff" stroke="#f1f5f9" strokeWidth="1" />

            <image href="https://cdn.simpleicons.org/whatsapp/25D366" x="-72" y="-100" width="22" height="22" />
            <text x="-44" y="-84" fontSize="10" fontWeight="700" fill="#000">WhatsApp</text>
            <text x="-44" y="-72" fontSize="7" fill="#10b981" fontWeight="600">✓ Vérifié</text>

            <text x="-72" y="-46" fontSize="7" fill="#94a3b8" fontWeight="600">Code de vérification</text>
            <text
              x="0" y="-8"
              textAnchor="middle"
              fontSize="26"
              fontWeight="900"
              fill="#000"
              fontFamily="ui-monospace, monospace"
              letterSpacing="3"
            >
              847 291
            </text>

            <motion.g
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <circle cx="62" cy="-92" r="12" fill="url(#si-badge)" />
              <path d="M 57 -92 L 60 -89 L 67 -96" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </motion.g>

            <rect x="-82" y="22" width="164" height="44" rx="12" fill="#ecfdf5" />
            <circle cx="-64" cy="44" r="9" fill="#10b981" />
            <path d="M -68 44 L -65 47 L -59 40" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <text x="-46" y="42" fontSize="9" fontWeight="700" fill="#065f46">Connexion réussie</text>
            <text x="-46" y="55" fontSize="7" fill="#059669">Redirection vers votre espace…</text>

            <rect x="-30" y="196" width="60" height="4" rx="2" fill="#000" opacity="0.18" />
          </motion.g>
        </g>

        <motion.g animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="62" cy="118" r="26" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          <image href="https://cdn.simpleicons.org/google/4285F4" x="50" y="106" width="24" height="24" />
        </motion.g>

        <motion.g animate={{ y: [0, 8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="418" cy="180" r="24" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          <image href="https://cdn.simpleicons.org/telegram/26A5E4" x="408" y="170" width="20" height="20" />
        </motion.g>

        <motion.g animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="80" cy="410" r="22" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          <image href="https://cdn.simpleicons.org/instagram/E1306C" x="71" y="401" width="18" height="18" />
        </motion.g>

        <motion.g animate={{ y: [0, 6, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}>
          <circle cx="410" cy="410" r="28" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
          <text x="410" y="418" textAnchor="middle" fontSize="26">🇺🇸</text>
        </motion.g>

        <motion.g
          animate={{ y: [0, -12, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="18" y="248" width="128" height="54" rx="12" fill="#ffffff" stroke="#fed7aa" strokeWidth="1" />
          <circle cx="38" cy="268" r="9" fill="#ecfdf5" />
          <path d="M 34 268 L 37 271 L 42 264" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x="54" y="272" fontSize="9" fontWeight="700" fill="#000">Code reçu</text>
          <text x="54" y="286" fontSize="8" fill="#64748b" fontFamily="ui-monospace, monospace">847 291</text>
        </motion.g>

        {[...Array(10)].map((_, i) => (
          <motion.circle
            key={i}
            r="2"
            fill="#fb923c"
            cx={40 + (i * 47) % 400}
            cy={40 + (i * 71) % 460}
            animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.4, 1] }}
            transition={{ duration: 2.5 + (i % 3), repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Illustration Sign-Up                                               */
/* ────────────────────────────────────────────────────────────────── */
function SignUpIllustration() {
  const satellites = [
    { angle: -90, slug: "whatsapp",  color: "25D366", r: 155, delay: 0 },
    { angle: -30, slug: "google",    color: "4285F4", r: 175, delay: 0.4 },
    { angle:  30, slug: "telegram",  color: "26A5E4", r: 155, delay: 0.8 },
    { angle:  90, slug: "instagram", color: "E1306C", r: 175, delay: 1.2 },
    { angle: 150, slug: "tiktok",    color: "000000", r: 155, delay: 1.6 },
    { angle: 210, slug: "facebook",  color: "1877F2", r: 175, delay: 2.0 },
  ];

  const flags = [
    { x: 70,  y: 90,  flag: "🇺🇸", delay: 0 },
    { x: 400, y: 100, flag: "🇫🇷", delay: 0.5 },
    { x: 55,  y: 380, flag: "🇨🇮", delay: 1.0 },
    { x: 420, y: 400, flag: "🇬🇧", delay: 1.5 },
    { x: 240, y: 55,  flag: "🇨🇲", delay: 2.0 },
    { x: 240, y: 465, flag: "🇳🇬", delay: 2.5 },
  ];

  return (
    <div className="relative w-full flex items-center justify-center">
      <div className="absolute inset-0 -m-16 bg-gradient-to-tr from-primary/15 via-transparent to-orange-300/15 blur-3xl rounded-full pointer-events-none" />
      <svg
        viewBox="0 0 480 520"
        className="w-full max-w-[440px] h-auto relative z-10"
        fill="none"
        role="img"
        aria-label="Rejoignez Texerra SMS — un écosystème de services et de pays"
      >
        <defs>
          <radialGradient id="su-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fb923c" stopOpacity="0.3" />
            <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="su-core" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fb923c" />
            <stop offset="1" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        <ellipse cx="240" cy="260" rx="220" ry="240" fill="url(#su-glow)" />

        <motion.circle
          cx="240" cy="260" r="190"
          stroke="#fed7aa" strokeWidth="1" strokeDasharray="4 8" fill="none" strokeOpacity="0.55"
          animate={{ rotate: 360 }}
          transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "240px 260px" }}
        />
        <motion.circle
          cx="240" cy="260" r="150"
          stroke="#fdba74" strokeWidth="1" fill="none" strokeOpacity="0.3"
          animate={{ rotate: -360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "240px 260px" }}
        />

        {satellites.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const x = 240 + Math.cos(rad) * s.r;
          const y = 260 + Math.sin(rad) * s.r;
          return (
            <motion.line
              key={`line-${i}`}
              x1="240" y1="260" x2={x} y2={y}
              stroke="#f97316" strokeWidth="1" strokeOpacity="0.25"
              strokeDasharray="3 5"
              animate={{ strokeOpacity: [0.1, 0.55, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, delay: s.delay }}
            />
          );
        })}

        <g transform="translate(240 260)">
          <motion.circle
            r="72" fill="#ffffff" stroke="#fed7aa" strokeWidth="2"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            r="56" fill="url(#su-core)"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M -17 -22 L 17 -22 L 17 3 C 17 15 0 26 0 26 C 0 26 -17 15 -17 3 Z"
            fill="#ffffff" fillOpacity="0.95"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          />
          <motion.path
            d="M -8 -5 L -3 1 L 9 -11"
            stroke="#ea580c" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          />
          <motion.circle
            r="88" stroke="#f97316" strokeWidth="2" strokeDasharray="6 10"
            strokeOpacity="0.5" fill="none"
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
        </g>

        {satellites.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const x = 240 + Math.cos(rad) * s.r;
          const y = 260 + Math.sin(rad) * s.r;
          return (
            <motion.g
              key={`sat-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + s.delay * 0.3, type: "spring", stiffness: 200 }}
            >
              <motion.g
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3 + i * 0.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
              >
                <circle cx={x} cy={y} r="22" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.5" />
                <image
                  href={`https://cdn.simpleicons.org/${s.slug}/${s.color}`}
                  x={x - 12} y={y - 12} width="24" height="24"
                />
              </motion.g>
            </motion.g>
          );
        })}

        {flags.map((f, i) => (
          <motion.g
            key={`flag-${i}`}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: f.delay }}
          >
            <circle cx={f.x} cy={f.y} r="18" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.5" />
            <text x={f.x} y={f.y + 6} textAnchor="middle" fontSize="18">{f.flag}</text>
          </motion.g>
        ))}

        {satellites.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const x = 240 + Math.cos(rad) * s.r;
          const y = 260 + Math.sin(rad) * s.r;
          return (
            <motion.circle
              key={`pulse-${i}`}
              cx="240" cy="260" r="3"
              fill="#fb923c"
              animate={{ cx: [240, x], cy: [260, y], opacity: [0, 1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.35, ease: "easeOut" }}
            />
          );
        })}

        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
        >
          <rect x="20" y="230" width="130" height="56" rx="14" fill="#ffffff" stroke="#fed7aa" strokeWidth="1" />
          <circle cx="42" cy="250" r="9" fill="#ecfdf5" />
          <path d="M 38 250 L 41 253 L 46 246" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x="58" y="254" fontSize="9" fontWeight="700" fill="#000">712+ numéros</text>
          <text x="58" y="268" fontSize="7" fill="#64748b">activés cette saison</text>
        </motion.g>

        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.6, type: "spring", stiffness: 200 }}
        >
          <rect x="330" y="230" width="130" height="56" rx="14" fill="#ffffff" stroke="#fed7aa" strokeWidth="1" />
          <circle cx="352" cy="250" r="9" fill="#fff7ed" />
          <text x="352" y="256" textAnchor="middle" fontSize="12">🌍</text>
          <text x="368" y="254" fontSize="9" fontWeight="700" fill="#000">205+ pays</text>
          <text x="368" y="268" fontSize="7" fill="#64748b">disponibles</text>
        </motion.g>
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Bouton Retour                                                      */
/* ────────────────────────────────────────────────────────────────── */
function BackButton() {
  return (
    <Link
      href="/"
      className="absolute top-5 left-5 z-50 inline-flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-md border border-border rounded-full text-sm font-medium text-foreground hover:bg-white hover:border-primary/40 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.06)] group"
      aria-label="Retour à l'accueil"
    >
      <svg
        className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span className="hidden sm:inline">Retour à l'accueil</span>
      <span className="sm:hidden">Retour</span>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Layout d'authentification                                          */
/* ────────────────────────────────────────────────────────────────── */
function AuthLayout({
  illustration,
  children,
}: {
  illustration: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] bg-background overflow-hidden">
      <BackButton />

      <div className="flex min-h-[100dvh]">
        <div
          className="w-full lg:w-1/2 flex items-center justify-center px-4 py-20 lg:px-12"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(24 25% 82% / 0.4) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {children}
        </div>

        <div className="hidden lg:flex lg:w-1/2 items-center justify-center px-12 relative overflow-hidden bg-gradient-to-br from-orange-50/70 via-amber-50/50 to-yellow-50/40 border-l border-border/60">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-orange-400/12 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-amber-400/10 blur-[120px] pointer-events-none" />
          <div className="relative z-10 w-full max-w-[560px]">
            {illustration}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* AuthCard                                                           */
/* ────────────────────────────────────────────────────────────────── */
function AuthCard({
  mode,
  switchUrl,
  switchText,
  switchLinkText,
}: {
  mode: "sign-in" | "sign-up";
  switchUrl: string;
  switchText: string;
  switchLinkText: string;
}) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = loadingGoogle || loadingEmail;

  const handleGoogle = async () => {
    if (isLoading) return;
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setLoadingGoogle(false);
      const code = (err as { code?: string }).code ?? "";
      setError(firebaseErrorMsg(code));
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setError(null);
    setLoadingEmail(true);
    try {
      if (mode === "sign-in") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
    } catch (err: unknown) {
      setLoadingEmail(false);
      const code = (err as { code?: string }).code ?? "";
      setError(firebaseErrorMsg(code));
    }
  };

  return (
    <div className="bg-white rounded-2xl w-full max-w-[420px] border border-border shadow-[0_4px_32px_hsl(32_14%_78%/0.5)] p-8 flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        <img
          src={`${window.location.origin}${basePath}/logo-full.png`}
          alt="Texerra SMS"
          className="h-10 w-auto"
        />
        <div className="text-center">
          <h1 className="text-foreground font-bold text-xl">
            {mode === "sign-in" ? "Bienvenue sur Texerra SMS" : "Créer un compte"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {mode === "sign-in"
              ? "Connectez-vous à votre compte"
              : "Commencez gratuitement"}
          </p>
        </div>
      </div>

      <button
        onClick={handleGoogle}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2.5 border border-border bg-secondary hover:bg-muted text-foreground font-medium rounded-xl py-3 px-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
      >
        {loadingGoogle ? <Spinner /> : <GoogleIcon />}
        {loadingGoogle
          ? "Connexion en cours…"
          : mode === "sign-in"
          ? "Continuer avec Google"
          : "S'inscrire avec Google"}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground text-xs font-medium">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-col gap-1.5">
          <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Adresse e-mail
          </label>
          <input
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/12 transition-all disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Mot de passe
          </label>
          <input
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            placeholder={mode === "sign-in" ? "Votre mot de passe" : "Minimum 8 caractères"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/12 transition-all disabled:opacity-60"
          />
          {mode === "sign-up" && (
            <p className="text-muted-foreground text-xs mt-0.5">
              Votre nom d'utilisateur sera déduit de votre adresse e-mail.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl py-3 px-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-1 shadow-[0_4px_14px_hsl(24_90%_52%/0.28)]"
        >
          {loadingEmail && <Spinner />}
          {loadingEmail
            ? mode === "sign-in" ? "Connexion…" : "Création du compte…"
            : mode === "sign-in" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      <div className="border-t border-border pt-4 text-center">
        <span className="text-muted-foreground text-sm">
          {switchText}{" "}
          <a
            href={`${basePath}${switchUrl}`}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {switchLinkText}
          </a>
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Pages sign-in / sign-up                                            */
/* ────────────────────────────────────────────────────────────────── */
function SignInPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return (
    <AuthLayout illustration={<SignInIllustration />}>
      <AuthCard
        mode="sign-in"
        switchUrl="/sign-up"
        switchText="Pas encore de compte ?"
        switchLinkText="S'inscrire"
      />
    </AuthLayout>
  );
}

function SignUpPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return (
    <AuthLayout illustration={<SignUpIllustration />}>
      <AuthCard
        mode="sign-up"
        switchUrl="/sign-in"
        switchText="Déjà un compte ?"
        switchLinkText="Se connecter"
      />
    </AuthLayout>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return (
    <Layout>
      <Home />
    </Layout>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/sign-in" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* ➕ NOUVEAU : AdminRoute                                            */
/* Protection défensive côté frontend (redirection).                  */
/* ⚠️ La vraie protection est côté serveur (requireAdmin).            */
/* ────────────────────────────────────────────────────────────────── */
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/sign-in" />;
  if (user.email !== ADMIN_EMAIL) return <Redirect to="/dashboard" />;
  return <Component />;
}

function AppRoutes() {
  const [, setLocation] = useLocation();
  void setLocation;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in" component={SignInPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/order">
            <Layout>
              <Order />
            </Layout>
          </Route>
          <Route path="/dashboard">
            <ProtectedRoute component={Dashboard} />
          </Route>
          <Route path="/wallet">
            <ProtectedRoute component={Wallet} />
          </Route>
          <Route path="/faq">
            <Layout><FaqPage /></Layout>
          </Route>
          {/* ➕ NOUVEAU : route admin (hors Layout public) */}
          <Route path="/admin">
            <AdminRoute component={AdminPage} />
          </Route>
          <Route>
            <Layout><NotFound /></Layout>
          </Route>
        </Switch>
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;