import { useState, useEffect } from "react";
import { useMeta } from "../lib/use-meta";
import { auth } from "../lib/firebase";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { CURRENCIES, getCurrency } from "../lib/currencies";

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

function svcIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null;
  const color = ICON_COLORS[icon] ?? "555555";
  return `https://cdn.simpleicons.org/${icon}/${color}`;
}

const STATUS_CONFIG = {
  pending_payment: { label: "En attente", color: "text-amber-700 bg-amber-100 border-amber-200" },
  active: { label: "En attente SMS", color: "text-blue-700 bg-blue-100 border-blue-200" },
  completed: { label: "SMS reçu", color: "text-green-700 bg-green-100 border-green-200" },
  cancelled: { label: "Annulée", color: "text-muted-foreground bg-muted border-border" },
  expired: { label: "Expirée", color: "text-destructive bg-destructive/10 border-destructive/20" },
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

/* --- Nouvelles illustrations professionnelles animées --- */
const PhoneIllustration = () => (
  <div className="relative w-28 h-28 mx-auto mb-6">
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="absolute inset-0 flex items-center justify-center"
    >
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-lg">
        <rect x="25" y="10" width="50" height="80" rx="8" className="fill-white stroke-border" strokeWidth="2" />
        <rect x="35" y="15" width="30" height="4" rx="2" className="fill-secondary" />
        {/* Bulle SMS qui apparaît */}
        <motion.rect x="32" y="30" width="36" height="18" rx="4" className="fill-primary/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
        />
        <motion.rect x="38" y="35" width="20" height="3" rx="1.5" className="fill-primary/60"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        />
        <motion.rect x="38" y="41" width="12" height="2" rx="1" className="fill-primary/40"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
        />
      </svg>
    </motion.div>
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -inset-4 bg-primary/10 rounded-full -z-10 blur-2xl"
    />
  </div>
);

const WalletIllustration = () => (
  <div className="relative w-28 h-28 mx-auto mb-6">
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      className="absolute inset-0 flex items-center justify-center"
    >
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-lg">
        <rect x="15" y="25" width="70" height="50" rx="6" className="fill-white stroke-border" strokeWidth="2" />
        <rect x="15" y="40" width="70" height="12" className="fill-secondary" />
        <motion.rect x="60" y="55" width="35" height="20" rx="4" className="fill-primary"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", delay: 0.2, bounce: 0.4 }}
        />
        <circle cx="85" cy="65" r="3" className="fill-white" />
      </svg>
    </motion.div>
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.1, 0.2] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -inset-4 bg-primary/10 rounded-full -z-10 blur-2xl"
    />
  </div>
);
/* -------------------------------------------------------- */

function ActiveOrderCard({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string>("");
  const [remaining, setRemaining] = useState<string | null>(null);

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

  if (!order) return <div className="h-32 bg-secondary animate-pulse rounded-2xl" />;

  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
  const iconUrl = svcIconUrl(order.serviceIcon ?? null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-border rounded-2xl p-5 hover:border-primary/25 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            {iconUrl ? (
              <img src={iconUrl} alt={order.serviceCode || ""} className="w-6 h-6 object-contain" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{order.serviceCode?.toUpperCase().slice(0, 2)}</span>
            )}
          </div>
          <div>
            <div className="font-semibold text-sm capitalize">{order.serviceCode}</div>
            <div className="text-xs text-muted-foreground">
              {order.countryCode}
              {order.price !== undefined && <span className="ml-2">· {Number(order.price).toFixed(2)} €</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${cfg.color}`}>
            <div className={`w-2 h-2 rounded-full bg-current ${order.status === "active" ? "animate-pulse" : ""}`} />
            {cfg.label}
          </div>
          {remaining && order.status === "active" && (
            <div className="text-xs text-muted-foreground mt-1 font-mono">{remaining}</div>
          )}
        </div>
      </div>

      {order.phoneNumber && (
        <div className="flex items-center justify-between gap-3 mb-3 bg-secondary rounded-xl px-4 py-3">
          <span className="font-mono font-bold text-sm tracking-wide">{order.phoneNumber}</span>
          <button onClick={() => copyText(order.phoneNumber!, "phone")} className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 bg-black/5 hover:bg-black/10 rounded-lg transition-colors">
            {copied === "phone" ? "Copié !" : "Copier"}
          </button>
        </div>
      )}

      {order.smsCode && (
        <div className="flex items-center justify-between gap-3 mb-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div>
            <div className="text-xs text-green-600 font-semibold mb-0.5">Code de vérification</div>
            <span className="font-mono font-black text-lg tracking-[0.1em] text-green-700">{order.smsCode}</span>
          </div>
          <button onClick={() => copyText(order.smsCode!, "code")} className="text-xs font-semibold text-green-700 hover:text-green-800 px-3 py-1.5 bg-green-200/50 hover:bg-green-200 rounded-lg transition-colors">
            {copied === "code" ? "Copié !" : "Copier"}
          </button>
        </div>
      )}
    </motion.div>
  );
}

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
    pending: { label: "En attente", color: "text-amber-700 bg-amber-100 border-amber-200" },
    completed: { label: "Crédité", color: "text-green-700 bg-green-100 border-green-200" },
    failed: { label: "Échoué", color: "text-red-700 bg-red-50 border-red-200" },
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-secondary animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!topups || topups.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-border rounded-3xl shadow-sm">
        <WalletIllustration />
        <h3 className="font-bold mb-2 text-foreground">Aucune recharge</h3>
        <p className="text-muted-foreground text-sm mb-6">Votre historique de recharges apparaîtra ici.</p>
        <Link href="/wallet" className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm">
          Recharger mon solde
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {topups.map(t => {
        const cfg = topupStatusConfig[t.status as keyof typeof topupStatusConfig] ?? topupStatusConfig.pending;
        const date = new Date(t.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
        const time = new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return (
          <div key={t.id} className="bg-white border border-border rounded-2xl px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-all">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">{Number(t.amountEur).toFixed(2)} € rechargés</div>
              <div className="text-xs text-muted-foreground">{date} à {time}</div>
            </div>
            <div className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${cfg.color}`}>
              {cfg.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
    <div className="max-w-lg">
      <div className="bg-white border border-border rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-5">
          {me.avatarUrl ? (
            <img src={me.avatarUrl} alt={me.name ?? ""} className="w-16 h-16 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/15 flex items-center justify-center text-xl font-extrabold text-primary border-2 border-primary/15">
              {initials}
            </div>
          )}
          <div>
            <div className="font-bold text-lg text-foreground">{me.name ?? me.email}</div>
            <div className="text-sm text-muted-foreground">{me.email}</div>
          </div>
        </div>

        <hr className="border-border" />

        {/* Nom */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Nom affiché</label>
          {editing === "name" ? (
            <div className="space-y-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="Votre nom" />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleSaveName} disabled={updateMutation.isPending}
                  className="flex-1 flex items-center justify-center py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {updateMutation.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span> : "Enregistrer"}
                </button>
                <button onClick={handleCancel}
                  className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-secondary rounded-xl">
              <span className="text-sm font-medium">{me.name ?? <span className="text-muted-foreground italic">Non défini</span>}</span>
              <button onClick={() => { setEditing("name"); setError(""); }}
                className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
                Modifier
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Adresse e-mail</label>
          <div className="flex items-center gap-3 px-4 py-3 bg-secondary/60 rounded-xl border border-dashed border-border">
            <span className="text-sm text-muted-foreground">{me.email}</span>
          </div>
        </div>

        {/* Téléphone */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
            Numéro de téléphone
          </label>
          <p className="text-xs text-muted-foreground mb-2">Utilisé automatiquement pour les recharges de solde.</p>
          {editing === "phone" ? (
            <div className="space-y-3">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoFocus
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="+237 6 XX XX XX XX" />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleSavePhone} disabled={updateMutation.isPending}
                  className="flex-1 flex items-center justify-center py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {updateMutation.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span> : "Enregistrer"}
                </button>
                <button onClick={handleCancel}
                  className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-secondary rounded-xl">
              {me.phone ? (
                <span className="text-sm font-mono font-medium">{me.phone}</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">Non renseigné</span>
              )}
              <button onClick={() => { setEditing("phone"); setError(""); }}
                className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
                {me.phone ? "Modifier" : "Ajouter"}
              </button>
            </div>
          )}
        </div>

         {/* Devise */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
            Devise locale
          </label>
          <p className="text-xs text-muted-foreground mb-2">Affiche l'équivalent dans votre monnaie lors des recharges.</p>
          <div className="relative">
            <select value={me.currency ?? "EUR"} onChange={e => handleCurrencyChange(e.target.value)}
              disabled={savingCurrency}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 appearance-none cursor-pointer disabled:opacity-60 transition-all">
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
              ))}
            </select>
            {savingCurrency ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block"></span>
              </div>
            ) : (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>
          {localCurrency && localCurrency.code !== "EUR" && (
            <p className="text-xs text-muted-foreground mt-1.5">
              1 € ≈ {localCurrency.rateFromEur.toLocaleString("fr-FR")} {localCurrency.symbol}
            </p>
          )}
        </div>

        {/* Solde */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Solde du portefeuille</label>
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/8 to-accent/5 border border-primary/15 rounded-xl">
            <span className="text-lg font-extrabold gradient-text">{me.balance.toFixed(2)} €</span>
            <Link href="/wallet" className="text-xs text-primary font-semibold hover:underline">
              Recharger →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

type DashTab = "orders" | "topups" | "profile";

export default function Dashboard() {
  useMeta({
    title: "Tableau de bord — Mes commandes et mon solde | Texerra",
    description: "Gérez vos commandes de numéros virtuels, suivez vos codes SMS reçus et consultez votre historique de recharges sur Texerra.",
    canonical: "https://texerra.site/dashboard",
    noindex: true,
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

  const activeOrders = orders?.filter(o => o.status === "active" || o.status === "pending_payment") ?? [];
  const pastOrders = orders?.filter(o => o.status !== "active" && o.status !== "pending_payment") ?? [];

  const tabs: { id: DashTab; label: string }[] = [
    { id: "orders", label: "Commandes" },
    { id: "topups", label: "Recharges" },
    { id: "profile", label: "Mon Profil" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Gérez vos commandes et votre solde</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/wallet" className="flex items-center px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-semibold hover:border-primary/40 hover:shadow-sm transition-all">
            {loadingMe ? "—" : `${me?.balance?.toFixed(2) ?? "0.00"} €`}
          </Link>
          <Link href="/order" className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-[0_2px_10px_hsl(24_90%_52%/0.25)]">
            Commander
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-4 mb-8 border-b border-border px-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {loadingMe ? <div className="h-64 bg-secondary animate-pulse rounded-2xl" /> : me ? <ProfileTab me={me} /> : null}
        </motion.div>
      ) : tab === "topups" ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <RechargesTab />
        </motion.div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-primary/15 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Solde</div>
              {loadingMe ? (
                <div className="h-8 w-24 bg-secondary animate-pulse rounded-lg" />
              ) : (
                <div className="text-3xl font-extrabold gradient-text">{me?.balance?.toFixed(2) ?? "0.00"} €</div>
              )}
              <Link href="/wallet" className="mt-2 inline-flex text-xs text-primary hover:underline font-semibold">
                Recharger →
              </Link>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Commandes actives</div>
              <div className="text-3xl font-extrabold text-foreground">{activeOrders.length}</div>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Total commandes</div>
              <div className="text-3xl font-extrabold text-foreground">{orders?.length ?? 0}</div>
            </div>
          </div>

          {/* Active orders */}
          {activeOrders.length > 0 && (
            <div className="mb-10">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                Commandes en cours
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeOrders.map(o => <ActiveOrderCard key={o.id} orderId={o.id} />)}
              </div>
            </div>
          )}

          {/* Order history */}
          <div>
            <h2 className="text-base font-bold mb-4 text-foreground">Historique des commandes</h2>
            {loadingOrders ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-secondary animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : pastOrders.length === 0 && activeOrders.length === 0 ? (
              <div className="text-center py-20 bg-white border border-border rounded-3xl shadow-sm">
                <PhoneIllustration />
                <h3 className="font-bold mb-2 text-foreground">Aucune commande</h3>
                <p className="text-muted-foreground text-sm mb-6">Votre historique de commandes apparaîtra ici.</p>
                <Link href="/order" className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm shadow-[0_4px_12px_hsl(24_90%_52%/0.25)]">
                  Passer ma première commande
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pastOrders.map(o => {
                  const cfg = STATUS_CONFIG[o.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.cancelled;
                  const date = new Date(o.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
                  return (
                    <div key={o.id} className="bg-white border border-border rounded-2xl px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-all">
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                        {o.serviceCode?.toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm capitalize truncate text-foreground">{o.serviceCode}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.countryCode}
                          {o.phoneNumber && <span className="ml-2 font-mono">{o.phoneNumber}</span>}
                          <span className="ml-2">· {date}</span>
                        </div>
                        {o.smsCode && (
                          <div className="text-xs font-mono font-bold text-green-600 mt-0.5">Code : {o.smsCode}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${cfg.color}`}>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          {cfg.label}
                        </div>
                        {o.price !== undefined && (
                          <div className="text-xs text-muted-foreground mt-1">{Number(o.price).toFixed(2)} €</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}