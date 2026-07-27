import { useState, useEffect } from "react";
import { useMeta } from "../lib/use-meta";
import {
  useGetOrders, useGetOrder, useCancelOrder, useUpdateMe, useGetTopups,
  getGetOrderQueryKey, getGetOrdersQueryKey, getGetMeQueryKey, useGetMe
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Clock, XCircle, Loader2, Copy, RefreshCw, Plus, Wallet,
  ArrowRight, ShoppingBag, User, Pencil, X, Phone, Globe, CreditCard, TrendingUp
} from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
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
  pending_payment: { label: "En attente", color: "text-amber-700 bg-amber-100 border-amber-200", icon: Clock },
  active: { label: "En attente SMS", color: "text-blue-700 bg-blue-100 border-blue-200", icon: RefreshCw },
  completed: { label: "SMS reçu", color: "text-green-700 bg-green-100 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "Annulée", color: "text-muted-foreground bg-muted border-border", icon: XCircle },
  expired: { label: "Expirée", color: "text-destructive bg-destructive/10 border-destructive/20", icon: XCircle },
};

function timeRemaining(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expiré";
  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return `${min}m ${sec}s`;
}

function ActiveOrderCard({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const cancelOrder = useCancelOrder();
  const [copied, setCopied] = useState<string>("");
  const [remaining, setRemaining] = useState<string | null>(null);

  const { data: order } = useGetOrder(orderId, {
    query: {
      queryKey: getGetOrderQueryKey(orderId),
      refetchInterval: (query) => {
        const d = query.state.data;
        if (!d) return 2500;
        if (d.status === "completed" || d.status === "cancelled" || d.status === "expired") return false;
        return 2500;
      },
    },
  });

  useEffect(() => {
    if (order?.status === "completed" || order?.status === "expired" || order?.status === "cancelled") {
      queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
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
  const StatusIcon = cfg.icon;
  const iconUrl = svcIconUrl((order as any).serviceIcon ?? null);

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
              {order.price && <span className="ml-2">· {order.price.toFixed(2)} €</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${cfg.color}`}>
            <StatusIcon className={`w-3 h-3 ${order.status === "active" ? "animate-spin" : ""}`} />
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
          <button onClick={() => copyText(order.phoneNumber!, "phone")} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied === "phone" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {order.smsCode && (
        <div className="flex items-center justify-between gap-3 mb-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div>
            <div className="text-xs text-green-600 font-semibold mb-0.5">Code de vérification</div>
            <span className="font-mono font-black text-lg tracking-[0.1em] text-green-700">{order.smsCode}</span>
          </div>
          <button onClick={() => copyText(order.smsCode!, "code")} className="text-green-600 hover:text-green-700 transition-colors">
            {copied === "code" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {order.status === "active" && (
        <button
          onClick={() => cancelOrder.mutate({ id: orderId }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            }
          })}
          disabled={cancelOrder.isPending}
          className="w-full mt-2 py-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-red-50 border border-border hover:border-red-200 rounded-xl transition-all"
        >
          {cancelOrder.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Annuler et rembourser"}
        </button>
      )}
    </motion.div>
  );
}

function RechargesTab() {
  const { data: topups, isLoading } = useGetTopups();

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
        <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-bold mb-2 text-foreground">Aucune recharge</h3>
        <p className="text-muted-foreground text-sm mb-6">Votre historique de recharges apparaîtra ici.</p>
        <Link href="/wallet" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm">
          Recharger mon solde <ArrowRight className="w-4 h-4" />
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
            <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">{t.amountEur.toFixed(2)} € rechargés</div>
              <div className="text-xs text-muted-foreground">{date} à {time}</div>
            </div>
            <div className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.color}`}>
              {cfg.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type EditableField = "name" | "phone" | null;

function ProfileTab({ me }: {
  me: {
    id: string; email: string; name?: string | null; avatarUrl?: string | null;
    phone?: string | null; currency?: string | null; balance: number;
  }
}) {
  const queryClient = useQueryClient();
  const updateMe = useUpdateMe();
  const [editing, setEditing] = useState<EditableField>(null);
  const [name, setName] = useState(me.name ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [error, setError] = useState("");
  const [savingCurrency, setSavingCurrency] = useState(false);

  const initials = (me.name ?? me.email ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const handleSaveName = () => {
    if (!name.trim()) { setError("Le nom ne peut pas être vide"); return; }
    setError("");
    updateMe.mutate({ data: { name: name.trim() } }, {
      onSuccess: () => { setEditing(null); queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }); },
      onError: () => setError("Erreur lors de la mise à jour"),
    });
  };

  const handleSavePhone = () => {
    setError("");
    updateMe.mutate({ data: { phone: phone.trim() } }, {
      onSuccess: () => { setEditing(null); queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }); },
      onError: () => setError("Erreur lors de la mise à jour"),
    });
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setSavingCurrency(true);
    updateMe.mutate({ data: { currency: newCurrency } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
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
                <button onClick={handleSaveName} disabled={updateMe.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {updateMe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Enregistrer
                </button>
                <button onClick={handleCancel}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                  <X className="w-4 h-4" /> Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-secondary rounded-xl">
              <span className="text-sm font-medium">{me.name ?? <span className="text-muted-foreground italic">Non défini</span>}</span>
              <button onClick={() => { setEditing("name"); setError(""); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Modifier
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
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Numéro de téléphone
          </label>
          <p className="text-xs text-muted-foreground mb-2">Utilisé automatiquement pour les recharges de solde.</p>
          {editing === "phone" ? (
            <div className="space-y-3">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoFocus
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                placeholder="+237 6 XX XX XX XX" />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleSavePhone} disabled={updateMe.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {updateMe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Enregistrer
                </button>
                <button onClick={handleCancel}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                  <X className="w-4 h-4" /> Annuler
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
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Pencil className="w-3.5 h-3.5" /> {me.phone ? "Modifier" : "Ajouter"}
              </button>
            </div>
          )}
        </div>

        {/* Devise */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" /> Devise locale
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
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
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
            <Link href="/wallet" className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
              Recharger <ArrowRight className="w-3 h-3" />
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

  const { data: me, isLoading: loadingMe } = useGetMe();
  const { data: orders, isLoading: loadingOrders } = useGetOrders();
  const [tab, setTab] = useState<DashTab>("orders");

  const activeOrders = orders?.filter(o => o.status === "active" || o.status === "pending_payment") ?? [];
  const pastOrders = orders?.filter(o => o.status !== "active" && o.status !== "pending_payment") ?? [];

  const tabs: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id: "orders", label: "Commandes", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "topups", label: "Recharges", icon: <CreditCard className="w-4 h-4" /> },
    { id: "profile", label: "Mon Profil", icon: <User className="w-4 h-4" /> },
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
          <Link href="/wallet" className="flex items-center gap-2 bg-white border border-border px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-primary/40 hover:shadow-sm transition-all">
            <Wallet className="w-4 h-4 text-primary" />
            {loadingMe ? "—" : `${me?.balance.toFixed(2)} €`}
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <Link href="/order" className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-[0_2px_10px_hsl(24_90%_52%/0.25)]">
            <ShoppingBag className="w-4 h-4" />
            Commander
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-8 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.icon} {t.label}
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
                <div className="text-3xl font-extrabold gradient-text">{me?.balance.toFixed(2)} €</div>
              )}
              <Link href="/wallet" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold">
                Recharger <ArrowRight className="w-3 h-3" />
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
                <RefreshCw className="w-4 h-4 text-primary animate-spin" />
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
                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold mb-2 text-foreground">Aucune commande</h3>
                <p className="text-muted-foreground text-sm mb-6">Votre historique de commandes apparaîtra ici.</p>
                <Link href="/order" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm shadow-[0_4px_12px_hsl(24_90%_52%/0.25)]">
                  Passer ma première commande <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pastOrders.map(o => {
                  const cfg = STATUS_CONFIG[o.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.cancelled;
                  const StatusIcon = cfg.icon;
                  const iconUrl = svcIconUrl(null);
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
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </div>
                        {o.price && (
                          <div className="text-xs text-muted-foreground mt-1">{o.price.toFixed(2)} €</div>
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
