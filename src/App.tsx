import { useState } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <img
          src={`${window.location.origin}${basePath}/logo-full.png`}
          alt="Texerra"
          className="h-10 w-auto"
        />
        <div className="text-center">
          <h1 className="text-foreground font-bold text-xl">
            {mode === "sign-in" ? "Bienvenue sur Texerra" : "Créer un compte"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {mode === "sign-in"
              ? "Connectez-vous à votre compte"
              : "Commencez gratuitement"}
          </p>
        </div>
      </div>

      {/* Google button */}
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

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground text-xs font-medium">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Email + password form */}
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

      {/* Switch link */}
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

function SignInPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-16"
      style={{ backgroundImage: "radial-gradient(circle, hsl(24 25% 82% / 0.4) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
      <AuthCard
        mode="sign-in"
        switchUrl="/sign-up"
        switchText="Pas encore de compte ?"
        switchLinkText="S'inscrire"
      />
    </div>
  );
}

function SignUpPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-16"
      style={{ backgroundImage: "radial-gradient(circle, hsl(24 25% 82% / 0.4) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
      <AuthCard
        mode="sign-up"
        switchUrl="/sign-in"
        switchText="Déjà un compte ?"
        switchLinkText="Se connecter"
      />
    </div>
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
