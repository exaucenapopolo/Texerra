import { Link, useLocation } from "wouter";
import { ReactNode, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Wallet, LogOut, LayoutDashboard, Menu, X, Plus, ShoppingBag, HelpCircle } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: !!user, staleTime: 10_000 } });

  void location;

  const navLinks = [
    { href: "/#services", label: "Services" },
    { href: "/#pays", label: "Pays" },
    { href: "/#faq", label: "FAQ" },
  ];

  const handleSignOut = () => {
    logout();
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Compte";
  const avatarInitial = (user?.displayName?.[0] || user?.email?.[0] || "?").toUpperCase();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="fixed top-0 left-0 w-full z-50">
        <div className="mx-4 mt-3">
          <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-xl border border-border rounded-2xl px-5 h-[72px] flex items-center justify-between shadow-[0_2px_16px_hsl(32_14%_78%/0.5)]">
            <Link href="/" className="flex items-center shrink-0">
              <img src={`${import.meta.env.BASE_URL}logo-full.png`} alt="Texerra" className="h-[60px] w-auto" />
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {!user ? (
                navLinks.map(link => (
                  <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                ))
              ) : (
                <Link href="/faq" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="w-3.5 h-3.5" /> FAQ
                </Link>
              )}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {!user ? (
                <>
                  <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                    Se connecter
                  </Link>
                  <Link href="/sign-up" className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors shadow-[0_2px_12px_hsl(24_90%_52%/0.3)]">
                    Démarrer
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/wallet" className="flex items-center gap-1.5 bg-secondary border border-border px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span className="text-foreground">{me ? `${me.balance.toFixed(2)} €` : "—"}</span>
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </Link>
                  <Link href="/order" className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-[0_2px_12px_hsl(24_90%_52%/0.3)]">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Commander
                  </Link>
                  <Link href="/dashboard" className="flex items-center gap-1.5 bg-secondary border border-border px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    {displayName}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 bg-secondary border border-border px-2.5 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            <button
              className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {mobileOpen && (
            <div className="md:hidden max-w-7xl mx-auto mt-2 bg-white border border-border rounded-2xl p-4 shadow-xl space-y-1">
              {!user ? (
                <>
                  {navLinks.map(link => (
                    <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      {link.label}
                    </a>
                  ))}
                  <div className="h-px bg-border my-2" />
                  <Link href="/sign-in" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    Se connecter
                  </Link>
                  <Link href="/sign-up" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground text-center hover:bg-primary/90 transition-colors">
                    Créer un compte
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-xl mb-2">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                      {avatarInitial}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{displayName}</div>
                      <div className="text-xs text-muted-foreground">{me ? `${me.balance.toFixed(2)} € de solde` : "Chargement..."}</div>
                    </div>
                  </div>
                  <Link href="/order" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary bg-primary/8 hover:bg-primary/12 transition-colors">
                    <ShoppingBag className="w-4 h-4" /> Commander un numéro
                  </Link>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <Link href="/wallet" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Wallet className="w-4 h-4" /> Portefeuille
                  </Link>
                  <Link href="/faq" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <HelpCircle className="w-4 h-4" /> FAQ
                  </Link>
                  <div className="h-px bg-border my-1" />
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOut className="w-4 h-4" /> Déconnexion
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 pt-[88px]">
        {children}
      </main>

      <footer className="border-t border-border bg-white pt-10 pb-8">
        <div className="max-w-7xl mx-auto px-6 space-y-6">

          {/* Top row: logo + nav */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}logo-full.png`} alt="Texerra" className="h-12 w-auto" />
            </div>
            <div className="flex items-center gap-6">
              <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
              <a href="mailto:support@texerra.site" className="hover:text-foreground transition-colors">Email</a>
              <a
                href="https://wa.me/12424542961"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="" className="w-3.5 h-3.5" />
                Support
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Bottom row: social + copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Texerra — Numéros virtuels SMS</p>

            <div className="flex items-center gap-3">
              {/* Facebook */}
              <a href="https://www.facebook.com/share/1EeWWxhVyX/" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-secondary hover:bg-[#1877F2]/10 flex items-center justify-center transition-colors group"
                title="Facebook">
                <img src="https://cdn.simpleicons.org/facebook/1877F2" alt="Facebook" className="w-4 h-4" />
              </a>
              {/* Instagram */}
              <a href="https://www.instagram.com/texerra.sms?igsh=OWl0MGtod2lhcDkx" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-secondary hover:bg-[#E1306C]/10 flex items-center justify-center transition-colors"
                title="Instagram">
                <img src="https://cdn.simpleicons.org/instagram/E1306C" alt="Instagram" className="w-4 h-4" />
              </a>
              {/* WhatsApp Channel */}
              <a href="https://whatsapp.com/channel/0029VbDCWHB0gcfAf1ugqS1w" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-secondary hover:bg-[#25D366]/10 flex items-center justify-center transition-colors"
                title="Chaîne WhatsApp">
                <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="WhatsApp" className="w-4 h-4" />
              </a>
              {/* YouTube */}
              <a href="https://youtube.com/@texerra-sms?si=Juk4QmB-rUdSB7XB" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-secondary hover:bg-[#FF0000]/10 flex items-center justify-center transition-colors"
                title="YouTube">
                <img src="https://cdn.simpleicons.org/youtube/FF0000" alt="YouTube" className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
