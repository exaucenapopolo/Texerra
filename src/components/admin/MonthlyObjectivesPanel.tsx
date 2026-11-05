import { useCallback, useEffect, useState } from "react";

type MetricKey =
  | "newUsers"
  | "completedTopups"
  | "topupAmount"
  | "completedOrders"
  | "revenue"
  | "margin";

type MonthlyMetrics = Record<MetricKey, number> & {
  truncated?: boolean;
  scannedOrders?: number;
  scannedTopups?: number;
};

type ObjectivesResponse = {
  month: string;
  hasObjective: boolean;
  targets: Record<MetricKey, number>;
  actual: MonthlyMetrics;
  previous: MonthlyMetrics;
  period: {
    daysInMonth: number;
    elapsedDays: number;
    remainingDays: number;
    previousMonth: string;
    previousElapsedDays: number;
  };
  truncated: boolean;
};

type Props = { token: string };

const METRICS: Array<{
  key: MetricKey;
  label: string;
  unit: "count" | "money";
}> = [
  { key: "newUsers", label: "Nouveaux utilisateurs", unit: "count" },
  { key: "completedTopups", label: "Dépôts réussis", unit: "count" },
  { key: "topupAmount", label: "Montant des dépôts réussis", unit: "money" },
  { key: "completedOrders", label: "Commandes réussies", unit: "count" },
  { key: "revenue", label: "Revenus des commandes réussies", unit: "money" },
  { key: "margin", label: "Marge générée", unit: "money" },
];

const EMPTY_TARGETS: Record<MetricKey, string> = {
  newUsers: "0",
  completedTopups: "0",
  topupAmount: "0",
  completedOrders: "0",
  revenue: "0",
  margin: "0",
};

function getCurrentDoualaMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

function formatCount(value: number): string {
  return Math.round(value || 0).toLocaleString("fr-FR");
}

function formatMoney(value: number): string {
  return `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function formatMetric(value: number, unit: "count" | "money"): string {
  return unit === "money" ? formatMoney(value) : formatCount(value);
}

function formatPace(value: number, unit: "count" | "money"): string {
  return unit === "count" ? formatCount(Math.ceil(value)) : formatMoney(value);
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).format(new Date(`${month}-01T12:00:00+01:00`));
}

function comparisonLabel(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "Stable" : "En hausse";
  const percent = ((current - previous) / previous) * 100;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function comparisonClass(current: number, previous: number): string {
  if (current > previous) return "text-emerald-700";
  if (current < previous) return "text-rose-700";
  return "text-slate-500";
}

export default function AdminMonthlyObjectivesPanel({ token }: Props) {
  const [month, setMonth] = useState(getCurrentDoualaMonth);
  const [data, setData] = useState<ObjectivesResponse | null>(null);
  const [targets, setTargets] = useState<Record<MetricKey, string>>(EMPTY_TARGETS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (syncTargets = false) => {
    if (syncTargets) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/objectives?month=${encodeURIComponent(month)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || `Erreur API ${response.status}`);
      const payload = result as ObjectivesResponse;
      setData(payload);
      if (syncTargets) {
        const next = { ...EMPTY_TARGETS };
        for (const metric of METRICS) {
          next[metric.key] = String(payload.targets?.[metric.key] ?? 0);
        }
        setTargets(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les objectifs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, token]);

  useEffect(() => {
    void load(true);
    const interval = window.setInterval(() => void load(false), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function saveObjectives() {
    const parsed = {} as Record<MetricKey, number>;
    for (const metric of METRICS) {
      const value = Number(targets[metric.key]);
      if (!Number.isFinite(value) || value < 0) {
        setError(`Vérifie la valeur de l'objectif « ${metric.label} ».`);
        return;
      }
      parsed[metric.key] = value;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/objectives", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month, targets: parsed }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || `Erreur API ${response.status}`);
      await load(true);
      setNotice(`Les objectifs de ${monthLabel(month)} ont été enregistrés.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  }

  const previousMonthLabel = data?.period?.previousMonth
    ? monthLabel(data.period.previousMonth)
    : "mois précédent";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Objectifs mensuels</h2>
          <p className="mt-1 text-sm text-slate-500">
            Définis tes cibles et suis leur progression à mesure que les utilisateurs,
            dépôts et commandes sont enregistrés.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              setNotice(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            aria-label="Mois des objectifs"
          />
          <button
            type="button"
            onClick={() => void load(false)}
            disabled={refreshing || loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? "Actualisation…" : "Actualiser"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}

      <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-900">Définir les objectifs de {monthLabel(month)}</h3>
            <p className="text-xs text-slate-500 mt-1">Les valeurs sont conservées séparément pour chaque mois et peuvent être modifiées.</p>
          </div>
          <span className="text-xs text-slate-500">{data?.hasObjective ? "Objectifs enregistrés" : "Pas encore d'objectif enregistré"}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {METRICS.map((metric) => (
            <label key={metric.key} className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">{metric.label}</span>
              <input
                type="number"
                min="0"
                step={metric.unit === "count" ? "1" : "0.01"}
                value={targets[metric.key]}
                onChange={(event) => setTargets((current) => ({ ...current, [metric.key]: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Montants exprimés en euros. Les dépôts et commandes sont comptés uniquement lorsqu'ils sont réussis.</p>
          <button
            type="button"
            onClick={() => void saveObjectives()}
            disabled={saving || loading}
            className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer les objectifs"}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <p className="py-5 text-center text-sm text-slate-500">Calcul des résultats du mois…</p>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">Progression de {monthLabel(month)}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {data.period.elapsedDays > 0
                  ? `Du 1er au ${data.period.elapsedDays} du mois · comparaison avec ${previousMonthLabel} sur ${data.period.previousElapsedDays} jour(s)`
                  : "Ce mois n'a pas encore commencé."}
              </p>
            </div>
            <span className="text-xs text-slate-500">Actualisation automatique toutes les 60 secondes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {METRICS.map((metric) => {
              const actual = Number(data.actual?.[metric.key] ?? 0);
              const target = Number(data.targets?.[metric.key] ?? 0);
              const previous = Number(data.previous?.[metric.key] ?? 0);
              const remaining = Math.max(0, target - actual);
              const progress = target > 0 ? (actual / target) * 100 : 0;
              const daysLeft = data.period.remainingDays;
              const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : 0;
              const weeklyNeeded = daysLeft > 0 ? dailyNeeded * Math.min(7, daysLeft) : 0;
              const goalReached = target > 0 && actual >= target;
              const noTarget = target <= 0;

              return (
                <article key={metric.key} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">{metric.label}</h4>
                    {noTarget ? (
                      <span className="text-[11px] text-slate-400">À définir</span>
                    ) : (
                      <span className={`text-xs font-semibold ${goalReached ? "text-emerald-700" : "text-orange-700"}`}>
                        {progress.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xl font-bold text-slate-900">{formatMetric(actual, metric.unit)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Objectif : {noTarget ? "non défini" : formatMetric(target, metric.unit)}</div>
                  </div>

                  {!noTarget && (
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${goalReached ? "bg-emerald-500" : "bg-orange-500"}`}
                        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-slate-500">Reste à faire</div>
                      <div className="mt-1 font-semibold text-slate-800">{noTarget ? "—" : formatMetric(remaining, metric.unit)}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-slate-500">Vs {previousMonthLabel}</div>
                      <div className={`mt-1 font-semibold ${comparisonClass(actual, previous)}`}>{comparisonLabel(actual, previous)}</div>
                      <div className="text-[11px] text-slate-500">{formatMetric(previous, metric.unit)}</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">À réaliser / jour restant</div>
                      <div className="mt-1 font-semibold text-slate-800">
                        {noTarget ? "Définir la cible" : goalReached ? "Objectif atteint" : daysLeft > 0 ? formatPace(dailyNeeded, metric.unit) : "Mois terminé"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Sur les 7 prochains jours</div>
                      <div className="mt-1 font-semibold text-slate-800">
                        {noTarget ? "Définir la cible" : goalReached ? "Objectif atteint" : daysLeft > 0 ? formatPace(weeklyNeeded, metric.unit) : "Mois terminé"}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {data.truncated && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Une période dépasse la limite de lecture de {formatCount(50_000)} opérations. Les nombres de dépôts et de commandes restent exacts, mais les montants et la marge peuvent être partiels. Consulte une période plus courte pour une ventilation financière exhaustive.
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            Les utilisateurs sont comptés à leur date d'inscription. Les dépôts et commandes sont comptés uniquement au statut « réussi ». La marge utilise d'abord marginNum/margin enregistré ; pour les anciennes commandes sans marge enregistrée, le taux de secours historique de 65 % du prix est conservé.
          </p>
        </>
      ) : null}
    </section>
  );
}
