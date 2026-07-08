import { useState, useEffect, useCallback } from "react";
import { useMeta } from "../lib/use-meta";
import {
  useGetMe, useInitiateTopup, useGetTopupStatus, useGetTopups,
  getGetMeQueryKey, getGetTopupStatusQueryKey, getGetTopupsQueryKey,
  type Topup,
} from "@workspace/api-client-react";
import { auth } from "../lib/firebase";
import { Wallet, Plus, ArrowRight, CheckCircle2, Clock, Loader2, ExternalLink, User, Mail, Phone, RefreshCw, XCircle, History, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth-context";
import { getCurrency, formatLocalAmount } from "../lib/currencies";

const PRESET_AMOUNTS = [5, 10, 20, 50];

/* ─── Per-item verify button component ─────────────────────────────────── */

function TopupHistoryItem({ topup, onCredited }: { topup: Topup; onCredited: () => void }) {
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ type: "info" | "error"; text: string } | null>(null);

  const handleVerify = async () => {
    if (checking) return;
    setChecking(true);
    setMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken(true).catch(() => null);
      if (!token) {
        setMsg({ type: "error", text: "Session expirée. Reconnectez-vous." });
        return;
      }

      const res = await fetch(`/api/topups/${topup.id}/status?force=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setMsg({ type: "error", text: err.error ?? `Erreur serveur (${res.status}).` });
        return;
      }

      const data = await res.json() as { status: string; _justCredited?: boolean };

      if (data.status === "completed") {
        onCredited();
      } else if (data.status === "failed") {
        onCredited();
      } else {
        setMsg({ type: "info", text: "Paiement pas encore confirmé. Réessayez dans 1–2 min." });
      }
    } catch {
      setMsg({ type: "error", text: "Erreur réseau. Réessayez." });
    } finally {
      setChecking(false);
    }
  };

  const date = new Date(topup.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });

  const statusConfig = {
    pending:   { label: "En attente",  bg: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-400" },
    completed: { label: "Crédité",     bg: "bg-green-50 text-green-700 border-green-200",   dot: "bg-green-500" },
    failed:    { label: "Échoué",      bg: "bg-red-50 text-red-600 border-red-200",         dot: "bg-red-400" },
  };
  const cfg = statusConfig[topup.status as keyof typeof statusConfig] ?? statusConfig.pending;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        {/* Amount */}
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground text-sm">
            +{parseFloat(String(topup.amountEur)).toFixed(2)} €
          </div>
          <div className="text-xs text-muted-foreground">{date}</div>
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>

        {/* Verify button — only for pending */}
        {topup.status === "pending" && (
          <button
            onClick={handleVerify}
            disabled={checking}
            className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all"
            title="Vérifier si ce paiement a été confirmé"
          >
            {checking
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />
            }
            {checking ? "Vérif…" : "Vérifier"}
          </button>
        )}
      </div>

      {/* Inline feedback */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pl-14"
          >
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
              msg.type === "error"
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-blue-50 border border-blue-200 text-blue-700"
            }`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {msg.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────── */

export default function WalletPage() {
  useMeta({
    title: "Portefeuille — Rechargez votre solde Texerra",
    description: "Rechargez votre solde Texerra avec Orange Money, MTN Mobile Money, Airtel Money, Wave ou carte bancaire. Paiement rapide et sécurisé depuis le Cameroun, Côte d'Ivoire, Sénégal et toute l'Afrique.",
    canonical: "https://texerra.site/wallet",
    noindex: true,
  });

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: me, isLoading: loadingMe } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: topups, isLoading: loadingTopups } = useGetTopups({
    query: { queryKey: getGetTopupsQueryKey(), enabled: !!user },
  });
  const initiateTopup = useInitiateTopup();

  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [pendingTopupId, setPendingTopupId] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  const [step, setStep] = useState<"select" | "details" | "pending" | "success" | "failed">("select");
  const [forceChecking, setForceChecking] = useState(false);
  const [forceCheckMsg, setForceCheckMsg] = useState<{ type: "info" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", mobile: "" });

  // Handle AccountPe redirect-back: /wallet?topup=<id>&result=credited|failed|pending
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topupParam = params.get("topup");
    const result = params.get("result");
    if (!topupParam) return;

    setPendingTopupId(topupParam);

    if (result === "credited") {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTopupsQueryKey() });
    } else if (result === "failed") {
      setStep("failed");
      queryClient.invalidateQueries({ queryKey: getGetTopupsQueryKey() });
    } else {
      // pending or no result — show pending screen so user can manually verify
      setStep("pending");
    }

    // Clean up URL params without reload
    const clean = window.location.pathname;
    window.history.replaceState({}, "", clean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setForm(f => ({
      name: f.name || me?.name || user?.displayName || "",
      email: f.email || me?.email || user?.email || "",
      mobile: f.mobile || me?.phone || "",
    }));
  }, [me, user]);

  const amount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : null);

  const localCurrency = getCurrency(me?.currency ?? "EUR");
  const showConversion = localCurrency && localCurrency.code !== "EUR" && amount && amount > 0;

  const { data: topupStatus } = useGetTopupStatus(pendingTopupId, {
    query: {
      queryKey: getGetTopupStatusQueryKey(pendingTopupId),
      enabled: !!pendingTopupId && step === "pending",
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return 5000;
        if (data.status === "completed" || data.status === "failed") return false;
        return 5000;
      },
    },
  });

  useEffect(() => {
    if (topupStatus?.status === "completed") {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTopupsQueryKey() });
    } else if (topupStatus?.status === "failed") {
      setStep("failed");
      queryClient.invalidateQueries({ queryKey: getGetTopupsQueryKey() });
    }
  }, [topupStatus?.status, queryClient]);

  const handleInitiate = () => {
    if (!amount || amount < 1 || !form.name || !form.email || !form.mobile) return;
    initiateTopup.mutate(
      { data: { amountEur: amount, name: form.name, email: form.email, mobile: form.mobile } },
      {
        onSuccess: (data) => {
          if (data.checkoutUrl) {
            setCheckoutUrl(data.checkoutUrl);
            setPendingTopupId(data.topupId);
            setStep("pending");
            window.open(data.checkoutUrl, "_blank");
          }
        },
      }
    );
  };

  /* Force-check for the currently active new recharge flow */
  const handleForceCheck = useCallback(async () => {
    if (!pendingTopupId || forceChecking) return;
    setForceChecking(true);
    setForceCheckMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken(true).catch(() => null);
      if (!token) {
        setForceCheckMsg({ type: "error", text: "Session expirée. Reconnectez-vous et réessayez." });
        return;
      }

      const res = await fetch(`/api/topups/${pendingTopupId}/status?force=true`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setForceCheckMsg({ type: "error", text: err.error ?? `Erreur serveur (${res.status}). Réessayez.` });
        return;
      }

      const data = await res.json() as { status: string };

      if (data.status === "completed") {
        setStep("success");
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTopupsQueryKey() });
      } else if (data.status === "failed") {
        setStep("failed");
        queryClient.invalidateQueries({ queryKey: getGetTopupsQueryKey() });
      } else {
        setForceCheckMsg({
          type: "info",
          text: "Paiement pas encore confirmé par le partenaire. Attendez 1–2 minutes et réessayez.",
        });
      }
    } catch {
      setForceCheckMsg({ type: "error", text: "Erreur réseau. Vérifiez votre connexion et réessayez." });
    } finally {
      setForceChecking(false);
    }
  }, [pendingTopupId, forceChecking, queryClient]);

  const handleReset = () => {
    setStep("select");
    setPendingTopupId("");
    setCheckoutUrl("");
    setSelectedAmount(null);
    setCustomAmount("");
    setForceCheckMsg(null);
    queryClient.invalidateQueries({ queryKey: getGetTopupsQueryKey() });
  };

  /* History: topups minus the one currently in the active flow */
  const historyTopups = (topups ?? []).filter(t => t.id !== pendingTopupId || step === "select");

  return (
    <div className="min-h-[80vh] max-w-2xl mx-auto px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        <div className="mb-10">
          <h1 className="text-3xl font-extrabold mb-2">Portefeuille</h1>
          <p className="text-muted-foreground">Gérez votre solde Texerra</p>
        </div>

        {/* Balance card */}
        <div className="bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 rounded-3xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Solde disponible</span>
          </div>
          {loadingMe ? (
            <div className="h-12 w-32 bg-muted animate-pulse rounded-xl mt-1" />
          ) : (
            <div className="text-5xl font-extrabold gradient-text mt-1">
              {me?.balance.toFixed(2)} <span className="text-3xl">€</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">Solde permanent — n'expire jamais</p>
        </div>

        {/* ── Step: select amount ── */}
        {step === "select" && (
          <div className="bg-card border border-border rounded-3xl p-8 mb-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Recharger votre solde
            </h2>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {PRESET_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => { setSelectedAmount(a); setCustomAmount(""); }}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${
                    selectedAmount === a
                      ? "bg-primary text-primary-foreground shadow-[0_4px_16px_hsl(24_90%_52%/0.28)]"
                      : "bg-secondary border border-border text-foreground hover:border-primary/40"
                  }`}
                >
                  {a} €
                </button>
              ))}
            </div>

            {showConversion && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 px-4 py-2.5 bg-primary/8 border border-primary/15 rounded-xl flex items-center justify-between"
              >
                <span className="text-xs text-muted-foreground">Équivalent approximatif</span>
                <span className="text-sm font-bold text-primary">
                  ≈ {formatLocalAmount(amount!, localCurrency!.code)}
                </span>
              </motion.div>
            )}

            <div className="mb-6">
              <label className="text-sm font-medium text-muted-foreground block mb-2">Autre montant</label>
              <div className="relative">
                <input
                  type="number" min="1" step="0.5" placeholder="Montant personnalisé..."
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
              </div>
              {localCurrency && localCurrency.code !== "EUR" && customAmount && parseFloat(customAmount) > 0 && !selectedAmount && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  ≈ {formatLocalAmount(parseFloat(customAmount), localCurrency.code)}
                </p>
              )}
            </div>

            {(!me?.currency || me.currency === "EUR") && (
              <p className="text-xs text-muted-foreground mb-5 text-center">
                Configurez votre devise dans{" "}
                <a href="/dashboard" className="text-primary hover:underline font-medium">votre profil</a>{" "}
                pour voir l'équivalent local.
              </p>
            )}

            <button
              onClick={() => amount && amount >= 1 && setStep("details")}
              disabled={!amount || amount < 1}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_hsl(24_90%_52%/0.25)] text-sm"
            >
              Continuer {amount ? `— ${amount} €` : ""} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── Step: details form ── */}
        {step === "details" && (
          <div className="bg-card border border-border rounded-3xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep("select")} className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors text-muted-foreground hover:text-foreground">
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
              <div>
                <h2 className="text-lg font-bold">Vos coordonnées</h2>
                <p className="text-xs text-muted-foreground">Pour la confirmation de votre paiement</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-extrabold gradient-text">{amount} €</div>
                {showConversion && (
                  <div className="text-xs text-muted-foreground">≈ {formatLocalAmount(amount!, localCurrency!.code)}</div>
                )}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text" required placeholder="Jean Dupont"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email" required placeholder="jean@exemple.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Numéro de téléphone
                  {me?.phone && <span className="ml-2 text-xs text-green-600 font-normal">• pré-rempli depuis votre profil</span>}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel" required placeholder="+237 6 XX XX XX XX"
                    value={form.mobile}
                    onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleInitiate}
              disabled={!form.name || !form.email || !form.mobile || initiateTopup.isPending}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_hsl(24_90%_52%/0.25)] text-sm"
            >
              {initiateTopup.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Préparation du paiement...</>
              ) : (
                <>Payer {amount} € <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            {initiateTopup.isError && (
              <p className="text-destructive text-sm mt-3 text-center">Une erreur s'est produite. Réessayez.</p>
            )}
          </div>
        )}

        {/* ── Step: pending ── */}
        {step === "pending" && (
          <div className="bg-card border border-border rounded-3xl p-8 text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-bold mb-2">Paiement en attente</h2>
            <p className="text-muted-foreground mb-2 text-sm leading-relaxed">
              Complétez le paiement dans la fenêtre ouverte, puis revenez ici.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              La vérification est automatique. Si vous avez déjà payé, cliquez sur le bouton ci-dessous.
            </p>

            {topupStatus && topupStatus.status !== "pending" && (
              <div className="bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-medium mb-6">
                Statut : <span className={topupStatus.status === "completed" ? "text-green-600" : "text-primary capitalize"}>{topupStatus.status}</span>
              </div>
            )}

            {/* Feedback message */}
            <AnimatePresence>
              {forceCheckMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2 text-left ${
                    forceCheckMsg.type === "error"
                      ? "bg-red-50 border border-red-200 text-red-700"
                      : "bg-blue-50 border border-blue-200 text-blue-700"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {forceCheckMsg.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Force-check button */}
            <button
              onClick={handleForceCheck}
              disabled={forceChecking}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 text-sm mb-3 shadow-[0_4px_20px_hsl(24_90%_52%/0.2)]"
            >
              {forceChecking ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Vérification en cours...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> J'ai payé — vérifier maintenant</>
              )}
            </button>

            <div className="flex gap-3 flex-col sm:flex-row">
              {checkoutUrl && (
                <a href={checkoutUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 flex-1 py-3 bg-secondary border border-border rounded-xl text-sm font-semibold hover:border-primary/40 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Rouvrir le paiement
                </a>
              )}
              <button onClick={handleReset} className="flex-1 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-secondary/50 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* ── Step: success ── */}
        {step === "success" && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-green-200 rounded-3xl p-8 text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-3">Solde rechargé !</h2>
            <p className="text-muted-foreground mb-6 text-sm">Votre solde a été crédité avec succès.</p>
            <div className="text-4xl font-extrabold gradient-text mb-8">{me?.balance.toFixed(2)} €</div>
            <div className="flex gap-3 flex-col sm:flex-row justify-center">
              <a href="/order" className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm">
                Commander un numéro <ArrowRight className="w-4 h-4" />
              </a>
              <button onClick={handleReset} className="px-6 py-3 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                Recharger encore
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step: failed ── */}
        {step === "failed" && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-red-200 rounded-3xl p-8 text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-3">Paiement non abouti</h2>
            <p className="text-muted-foreground mb-6 text-sm">Le paiement n'a pas pu être confirmé. Votre solde n'a pas été modifié.</p>
            <button onClick={handleReset} className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm">
              Réessayer
            </button>
          </motion.div>
        )}

        {/* ── Historique des recharges ── */}
        {user && (
          <div className="bg-card border border-border rounded-3xl p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Historique des recharges
            </h2>

            {loadingTopups ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                  </div>
                ))}
              </div>
            ) : historyTopups.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Aucune recharge pour l'instant.</p>
              </div>
            ) : (
              <div className="divide-y divide-border space-y-0">
                {historyTopups.map((topup, i) => (
                  <div key={topup.id} className={i > 0 ? "pt-4" : ""} style={{ paddingBottom: i < historyTopups.length - 1 ? "1rem" : 0 }}>
                    <TopupHistoryItem
                      topup={topup}
                      onCredited={() => {
                        queryClient.invalidateQueries({ queryKey: getGetTopupsQueryKey() });
                        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Note about pending items */}
            {historyTopups.some(t => t.status === "pending") && (
              <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground bg-secondary/60 rounded-xl px-4 py-3">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                Les recharges <span className="font-semibold text-amber-600 mx-1">En attente</span> peuvent être vérifiées manuellement. Le bouton disparaît dès que le paiement est confirmé et le solde crédité.
              </div>
            )}
          </div>
        )}

      </motion.div>
    </div>
  );
}
