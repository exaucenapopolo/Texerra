// Fichier : src/pages/commercial/CommercialLayout.tsx

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Coins,
  Wallet,
  UserCircle,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { getMe, AffiliateApiError } from "../../lib/affiliate-api";

interface Props {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: "/commercial", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/commercial/clients", label: "Mes clients", icon: Users },
  { to: "/commercial/commissions", label: "Mes commissions", icon: Coins },
  { to: "/commercial/withdrawals", label: "Mes retraits", icon: Wallet },
  { to: "/commercial/profile", label: "Mon profil", icon: UserCircle },
];

// ➕ Logo officiel hébergé sur GitHub (remplace le bloc texte T)
const LOGO_URL =
  "https://raw.githubusercontent.com/exaucenapopolo/Texerra/refs/heads/main/public/logo-full.png";

export default function CommercialLayout({ children }: Props) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accessState, setAccessState] = useState<"checking" | "active" | "pending" | "inactive" | "not-commercial" | "error">("checking");

  const verifyCommercialAccess = async () => {
    setAccessState("checking");
    try {
      await getMe();
      setAccessState("active");
    } catch (error) {
      const code = error instanceof AffiliateApiError ? error.code : "";
      if (code === "COMMERCIAL_CONTRACT_PENDING") setAccessState("pending");
      else if (code === "COMMERCIAL_INACTIVE") setAccessState("inactive");
      else if (code === "COMMERCIAL_NOT_FOUND") setAccessState("not-commercial");
      else setAccessState("error");
    }
  };

  useEffect(() => {
    void verifyCommercialAccess();
  }, []);

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location === to;
    return location.startsWith(to);
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      setLocation("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (accessState !== "active") {
    const pending = accessState === "pending";
    const inactive = accessState === "inactive";
    const notCommercial = accessState === "not-commercial";
    const title = pending
      ? "Votre contrat doit encore être signé"
      : inactive
        ? "Vos droits commerciaux ont été désactivés"
        : notCommercial
          ? "Ce compte n’est pas encore commercial"
          : accessState === "checking"
            ? "Vérification de votre accès"
            : "Impossible de vérifier votre accès commercial";
    const message = pending
      ? "Votre candidature a été approuvée, mais votre espace commercial et votre lien de parrainage resteront bloqués jusqu’à la signature du contrat et sa validation par Texerra SMS."
      : inactive
        ? "Vous n’avez plus le statut de commercial sur Texerra SMS. Votre compte utilisateur normal reste disponible, mais l’espace commercial et les nouvelles attributions sont désactivés."
        : notCommercial
          ? "Pour devenir partenaire commercial, consultez les conditions du contrat, puis envoyez votre candidature depuis la page partenaire."
          : accessState === "checking"
            ? "Nous vérifions que votre compte dispose toujours des droits commerciaux."
            : "La vérification n’a pas abouti. Réessayez sans fermer votre session.";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-7 sm:p-9 shadow-sm">
          <img src={LOGO_URL} alt="Texerra SMS" className="h-9 w-auto object-contain mb-8" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-gray-600">{message}</p>
          {pending && (
            <a href="https://wa.me/12424542961?text=Bonjour%20Texerra%20SMS%2C%20ma%20candidature%20a%20%C3%A9t%C3%A9%20approuv%C3%A9e.%20Je%20souhaite%20recevoir%20et%20signer%20mon%20contrat." target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
              Contacter Texerra pour signer le contrat
            </a>
          )}
          {notCommercial && (
            <Link href="/partners" className="mt-5 inline-flex rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
              Lire les conditions et déposer ma candidature
            </Link>
          )}
          {accessState === "error" && (
            <button onClick={() => void verifyCommercialAccess()} className="mt-5 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
              Réessayer
            </button>
          )}
          {accessState === "checking" && <div className="mt-5 text-sm text-gray-400">Contrôle en cours…</div>}
          <div className="mt-7 border-t border-gray-100 pt-5 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-orange-700 hover:text-orange-800">Retour à mon compte Texerra</Link>
            <span className="text-gray-300">·</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800">Déconnexion</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ─── SIDEBAR DESKTOP ─── */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-30">
        <div className="p-6 border-b border-gray-100">
          <Link href="/commercial" className="flex items-center gap-2 cursor-pointer">
            {/* ➕ LOGO RÉEL */}
            <img
              src={LOGO_URL}
              alt="Texerra SMS"
              className="h-9 w-auto object-contain"
            />
          </Link>
          <div className="text-[10px] text-orange-500 font-semibold uppercase tracking-wide mt-2">
            Espace commercial
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                href={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ─── MOBILE HEADER ─── */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 h-14">
        <Link href="/commercial" className="flex items-center cursor-pointer">
          {/* ➕ LOGO RÉEL (mobile) */}
          <img
            src={LOGO_URL}
            alt="Texerra SMS"
            className="h-7 w-auto object-contain"
          />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ─── MOBILE DRAWER ─── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute right-0 top-14 bottom-0 w-64 bg-white border-l border-gray-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
                const active = isActive(to, exact);
                return (
                  <Link
                    key={to}
                    href={to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                      active
                        ? "bg-orange-50 text-orange-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
    }
