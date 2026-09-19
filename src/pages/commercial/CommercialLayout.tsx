// Fichier : src/pages/commercial/CommercialLayout.tsx

import { useState } from "react";
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
