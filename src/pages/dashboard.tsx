import { useState, useEffect } from "react";
import { useMeta } from "../lib/use-meta";
import { auth } from "../lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, XCircle, Loader2, Copy, RefreshCw, Plus, Wallet,
  ArrowRight, ShoppingBag, User, Pencil, X, Phone, Globe, CreditCard, TrendingUp
} from "lucide-react";
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
  pending_payment: { label: "En attente", color: "text-amber-700 bg-amber-50 ring-1 ring-amber-200", icon: Clock },
  active: { label: "En attente SMS", color: "text-blue-700 bg-blue-50 ring-1 ring-blue-200", icon: RefreshCw },
  completed: { label: "SMS reçu", color: "text-green-700 bg-green-50 ring-1 ring-green-200", icon: CheckCircle2 },
  cancelled: { label: "Annulée", color: "text-muted-foreground bg-muted/50 ring-1 ring-border", icon: XCircle },
  expired: { label: "Expirée", color: "text-destructive bg-destructive/10 ring-1 ring-destructive/20", icon: XCircle },
};

// Configuration des animations de liste
const listContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const listItem = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
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

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur annulation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    }
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

  if (!order) return <div className="h-40 bg-secondary/50 animate-pulse rounded-2xl" />;

  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
  const StatusIcon = cfg.icon;
  const iconUrl = svcIconUrl(order.serviceIcon ?? null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <motion.div variants={listItem} className="bg-white border border-border/80 rounded-2xl p-5 shadow-sm hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden group">
      {/* Ligne d'accentuation en haut */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 shadow-inner">
            {iconUrl ? (
              <img src={iconUrl} alt={order.serviceCode || ""} className="w-7 h-7 object-contain drop-shadow-sm" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{order.serviceCode?.toUpperCase().slice(0, 2)}</span>
            )}
          </div>
          <div>
            <div className="font-bold text-base capitalize text-foreground">{order.serviceCode}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>{order.countryCode}</span>
              {order.price !== undefined && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="font-medium">{Number(order.price).toFixed(2)} €</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.color} shadow-sm`}>
            <StatusIcon className={`w-3.5 h-3.5 ${order.status === "active" ? "animate-spin" : ""}`} />
            {cfg.label}
          </div>
          {remaining && order.status === "active" && (
            <div className="text-xs text-muted-foreground mt-1.5 font-mono bg-secondary/50 inline-block px-2 py-0.5 rounded-md">{remaining}</div>
          )}
        </div>
      </div>

      {order.phoneNumber && (
        <div className="flex items-center justify-between gap-3 mb-4 bg-secondary/50 rounded-xl px-4 py-3 border border-border/50 group-hover:bg-secondary transition-colors">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Numéro attribué</span>
            <span className="font-mono font-bold text-base tracking-wide text-foreground">{order.phoneNumber}</span>
          </div>
          <button onClick={() => copyText(order.phoneNumber!, "phone")} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-95">
            {copied === "phone" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {order.smsCode && (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center justify-between gap-3 mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full -mr-8 -mt-8 blur-xl" />
          <div className="relative z-10">
            <div className="text-[10px] uppercase font-bold text-green-700 tracking-wider mb-0.5">Code de vérification</div>
            <span className="font-mono font-black text-xl tracking-[0.15em] text-green-800 drop-shadow-sm">{order.smsCode}</span>
          </div>
          <button onClick={() => copyText(order.smsCode!, "code")} className="relative z-10 w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-green-200 text-green-600 hover:bg-green-600 hover:text-white transition-all active:scale-95">
            {copied === "code" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </motion.div>
      )}

      {order.status === "active" && (
        <button
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-red-50 border border-border hover:border-red-200 rounded-xl transition-all active:scale-[0.98]"
        >
          {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          Annuler et rembourser
        </button>
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
    pending: { label: "En attente", color: "text-amber-700 bg-amber-50 ring-1 ring-amber-200" },
    completed: { label: "Crédité", color: "text-green-700 bg-green-50 ring-1 ring-green-200" },
    failed: { label: "Échoué", color: "text-red-700 bg-red-50 ring-1 ring-red-200" },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-secondary/50 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!topups || topups.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-white border border-border/80 rounded-3xl shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 shadow-inner">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-bold mb-2 text-foreground">Aucune recharge effectuée</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Votre historique de recharges financières apparaîtra ici une fois que vous aurez approvisionné votre compte.</p>
        <Link href="/wallet" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 text-sm">
          Recharger mon solde <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
      {topups.map(t => {
        const cfg = topupStatusConfig[t.status as keyof typeof topupStatusConfig] ?? topupStatusConfig.pending;
        const date = new Date(t.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
        const time = new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return (
          <motion.div variants={listItem} key={t.id} className="bg-white border border-border/80 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-foreground">Recharge de {Number(t.amountEur).toFixed(2)} €</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> {date} à {time}
              </div>
            </div>
            <div className={`shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${cfg.color}`}>
              {cfg.label}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto sm:mx-0">
      <div className="bg-white border border-border/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
        {/* Décoration d'arrière-plan */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center gap-5 relative z-10">
          {me.avatarUrl ? (
            <img src={me.avatarUrl} alt={me.name ?? ""} className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-extrabold text-primary shadow-inner">
              {initials}
            </div>
          )}
          <div>
            <div className="font-extrabold text-xl text-foreground mb-1">{me.name ?? "Mon Profil"}</div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-sm text-muted-foreground font-medium">
              {me.email}
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div className="space-y-6 relative z-10">
          {/* Nom */}
          <div className="group">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Nom affiché</label>
            {editing === "name" ? (
              <div className="space-y-3">
                <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
                  className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                  placeholder="Votre nom" />
                {error && <p className="text-xs text-destructive font-medium">{error}</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={handleSaveName} disabled={updateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button onClick={handleCancel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl text-sm font-bold hover:bg-secondary transition-colors active:scale-95">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-secondary/30 border border-transparent group-hover:border-border/50 group-hover:bg-secondary/50 rounded-xl transition-all">
                <span className="text-sm font-medium">{me.name ?? <span className="text-muted-foreground italic">Non défini</span>}</span>
                <button onClick={() => { setEditing("name"); setError(""); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-border/50">
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
              </div>
            )}
          </div>

          {/* Téléphone */}
          <div className="group">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Numéro de téléphone
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">Utilisé automatiquement pour vos recharges.</p>
            {editing === "phone" ? (
              <div className="space-y-3">
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoFocus
                  className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                  placeholder="+237 6 XX XX XX XX" />
                {error && <p className="text-xs text-destructive font-medium">{error}</p>}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={handleSavePhone} disabled={updateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button onClick={handleCancel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl text-sm font-bold hover:bg-secondary transition-colors active:scale-95">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-secondary/30 border border-transparent group-hover:border-border/50 group-hover:bg-secondary/50 rounded-xl transition-all">
                {me.phone ? (
                  <span className="text-sm font-mono font-bold tracking-wide">{me.phone}</span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Non renseigné</span>
                )}
                <button onClick={() => { setEditing("phone"); setError(""); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-border/50">
                  <Pencil className="w-3.5 h-3.5" /> {me.phone ? "Modifier" : "Ajouter"}
                </button>
              </div>
            )}
          </div>

          {/* Devise */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Devise locale
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">Affiche l'équivalent dans votre monnaie lors des recharges.</p>
            <div className="relative">
              <select value={me.currency ?? "EUR"} onChange={e => handleCurrencyChange(e.target.value)}
                disabled={savingCurrency}
                className="w-full px-5 py-3.5 bg-secondary/50 border border-border/80 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer disabled:opacity-60 transition-all shadow-sm hover:border-border">
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
                ))}
              </select>
              {savingCurrency ? (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
              ) : (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground bg-secondary/50 pl-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </div>
            {localCurrency && localCurrency.code !== "EUR" && (
              <p className="text-xs font-medium text-muted-foreground mt-2 bg-secondary/40 inline-block px-2.5 py-1 rounded-md">
                Taux indicatif : 1 € ≈ {localCurrency.rateFromEur.toLocaleString("fr-FR")} {localCurrency.symbol}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
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

  const tabs: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id: "orders", label: "Commandes", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "topups", label: "Recharges", icon: <CreditCard className="w-4 h-4" /> },
    { id: "profile", label: "Mon Profil", icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 text-foreground tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Gérez vos commandes, votre solde et votre compte avec simplicité.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
          <Link href="/wallet" className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-border/80 px-5 py-3 rounded-2xl text-sm font-bold hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all active:scale-95">
            <Wallet className="w-4 h-4 text-primary" />
            {loadingMe ? "—" : `${me?.balance?.toFixed(2) ?? "0.00"} €`}
            <Plus className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link href="/order" className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 active:scale-95">
            <ShoppingBag className="w-4 h-4" />
            Commander
          </Link>
        </div>
      </div>

      {/* Tab bar (Pill style) */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              tab === t.id 
                ? "bg-primary text-white shadow-md shadow-primary/20" 
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent hover:border-border/50"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "profile" ? (
            loadingMe ? <div className="h-72 bg-secondary/50 animate-pulse rounded-3xl" /> : me ? <ProfileTab me={me} /> : null
          ) : tab === "topups" ? (
            <RechargesTab />
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-6 shadow-sm group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Wallet size={80} className="text-primary" />
                  </div>
                  <div className="relative z-10">
                    <div className="text-[11px] font-bold text-primary uppercase tracking-widest mb-2">Solde Actuel</div>
                    {loadingMe ? (
                      <div className="h-10 w-24 bg-primary/10 animate-pulse rounded-lg" />
                    ) : (
                      <div className="text-4xl font-black text-foreground drop-shadow-sm">{me?.balance?.toFixed(2) ?? "0.00"} €</div>
                    )}
                    <Link href="/wallet" className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary bg-white/60 hover:bg-white px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm backdrop-blur-sm border border-primary/10">
                      Recharger le compte <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
                
                <div className="bg-white border border-border/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">En cours</div>
                  <div className="text-4xl font-black text-foreground">{activeOrders.length}</div>
                </div>
                
                <div className="bg-white border border-border/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Historique Total</div>
                  <div className="text-4xl font-black text-foreground">{orders?.length ?? 0}</div>
                </div>
              </div>

              {/* Active orders */}
              {activeOrders.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-lg font-extrabold mb-5 flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-lg"><RefreshCw className="w-5 h-5 text-primary animate-spin" /></div>
                    Commandes en cours d'activation
                  </h2>
                  <motion.div variants={listContainer} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2">
                    {activeOrders.map(o => <ActiveOrderCard key={o.id} orderId={o.id} />)}
                  </motion.div>
                </div>
              )}

              {/* Order history */}
              <div>
                <h2 className="text-lg font-extrabold mb-5 text-foreground flex items-center gap-2">
                  <div className="p-2 bg-secondary rounded-lg"><ShoppingBag className="w-5 h-5 text-muted-foreground" /></div>
                  Toutes les commandes
                </h2>
                
                {loadingOrders ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-24 bg-secondary/50 animate-pulse rounded-2xl" />
                    ))}
                  </div>
                ) : pastOrders.length === 0 && activeOrders.length === 0 ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-24 bg-white border border-border/80 rounded-3xl shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 shadow-inner">
                      <ShoppingBag className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-foreground">Votre historique est vide</h3>
                    <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">Toutes vos commandes et réceptions de codes SMS seront conservées ici.</p>
                    <Link href="/order" className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 text-sm">
                      Démarrer une commande <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
                    {pastOrders.map(o => {
                      const cfg = STATUS_CONFIG[o.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.cancelled;
                      const StatusIcon = cfg.icon;
                      const date = new Date(o.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
                      return (
                        <motion.div variants={listItem} key={o.id} className="group bg-white border border-border/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 hover:shadow-md hover:border-primary/30 transition-all duration-300">
                          
                          {/* Info bloc gauche */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground shadow-inner group-hover:bg-primary/5 transition-colors">
                              {o.serviceCode?.toUpperCase().slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-base capitalize truncate text-foreground flex items-center gap-2">
                                {o.serviceCode}
                                {o.price !== undefined && (
                                  <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground font-semibold">{Number(o.price).toFixed(2)} €</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="flex items-center gap-1"><Globe className="w-3 h-3"/> {o.countryCode}</span>
                                {o.phoneNumber && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
                                    <span className="font-mono text-foreground font-medium">{o.phoneNumber}</span>
                                  </>
                                )}
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{date}</span>
                              </div>
                            </div>
                          </div>

                          {/* Bloc droit (SMS & Statut) */}
                          <div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-between gap-3 sm:gap-2 w-full sm:w-auto border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${cfg.color}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {cfg.label}
                            </div>
                            
                            {o.smsCode && (
                              <div className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                                <span className="text-[10px] uppercase font-bold opacity-80 hidden sm:inline">Code :</span>
                                <span className="font-mono font-black tracking-widest">{o.smsCode}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}