import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth-context";
import { Redirect } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ADMIN_EMAIL = "exaucenapopolo2@gmail.com";

type Period = "today" | "yesterday" | "7d" | "30d" | "week" | "month" | "year" | "custom";

function getDateRange(period: Period, customStart?: string, customEnd?: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "7d":
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case "week": {
      const day = now.getDay() || 7;
      start.setDate(now.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "custom":
      if (customStart) start.setTime(new Date(customStart).getTime());
      if (customEnd) end.setTime(new Date(customEnd).getTime());
      end.setHours(23, 59, 59, 999);
      break;
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function apiFetch(path: string, token: string) {
  const res = await fetch(`/api/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderPage, setOrderPage] = useState(1);
  const [topupStatus, setTopupStatus] = useState("all");
  const [topupPage, setTopupPage] = useState(1);
  const [userPage, setUserPage] = useState(1);

  const { start, end } = getDateRange(period, customStart, customEnd);

  const token = user?.getIdToken ? undefined : undefined; // placeholder

  // Récupérer le token Firebase
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  useState(() => {
    if (user) {
      user.getIdToken().then(setFirebaseToken);
    }
  });

  // Redirection si non admin
  if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
    return <Redirect to="/" />;
  }

  if (authLoading || !firebaseToken) {
    return <div className="flex items-center justify-center h-screen">Chargement…</div>;
  }

  const statsQuery = useQuery({
    queryKey: ["admin-stats", start, end],
    queryFn: () => apiFetch(`/stats?start=${start}&end=${end}`, firebaseToken),
    staleTime: 60_000,
  });

  const chartQuery = useQuery({
    queryKey: ["admin-chart", start, end],
    queryFn: () => apiFetch(`/chart?start=${start}&end=${end}`, firebaseToken),
    staleTime: 60_000,
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", start, end, orderStatus, orderPage],
    queryFn: () =>
      apiFetch(
        `/orders?start=${start}&end=${end}&status=${orderStatus}&page=${orderPage}`,
        firebaseToken
      ),
    staleTime: 30_000,
  });

  const topupsQuery = useQuery({
    queryKey: ["admin-topups", start, end, topupStatus, topupPage],
    queryFn: () =>
      apiFetch(
        `/topups?start=${start}&end=${end}&status=${topupStatus}&page=${topupPage}`,
        firebaseToken
      ),
    staleTime: 30_000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", start, end, userPage],
    queryFn: () =>
      apiFetch(`/users?start=${start}&end=${end}&page=${userPage}`, firebaseToken),
    staleTime: 30_000,
  });

  const stats = statsQuery.data;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>

      {/* Sélecteur de période */}
      <div className="flex flex-wrap gap-2 items-center">
        {(["today", "yesterday", "7d", "30d", "week", "month", "year"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded border ${
              period === p ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            {p === "today" && "Aujourd'hui"}
            {p === "yesterday" && "Hier"}
            {p === "7d" && "7 derniers jours"}
            {p === "30d" && "30 derniers jours"}
            {p === "week" && "Cette semaine"}
            {p === "month" && "Ce mois"}
            {p === "year" && "Cette année"}
          </button>
        ))}
        <button
          onClick={() => setPeriod("custom")}
          className={`px-3 py-1 rounded border ${
            period === "custom" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Personnalisé
        </button>
      </div>

      {period === "custom" && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <span>→</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
      )}

      {/* Cartes statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card title="Utilisateurs" value={stats.totalUsers} subtitle={`+${stats.newUsers} nouveaux`} />
          <Card title="Dépôts" value={`${stats.totalTopupAmount.toFixed(2)} €`} subtitle={`${stats.totalTopups} dépôts`} />
          <Card title="Commandes" value={stats.totalOrders} subtitle={`${stats.completedOrders} réussies`} />
          <Card title="Chiffre d'affaires" value={`${stats.revenue.toFixed(2)} €`} subtitle={`Marge : ${stats.margin.toFixed(2)} €`} />
        </div>
      )}

      {/* Graphique */}
      {chartQuery.data && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Évolution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartQuery.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" name="CA" />
              <Line type="monotone" dataKey="topups" stroke="#16a34a" name="Dépôts" />
              <Line type="monotone" dataKey="orders" stroke="#ea580c" name="Commandes" />
              <Line type="monotone" dataKey="margin" stroke="#9333ea" name="Marge" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Liste des commandes */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Commandes</h2>
        <div className="flex gap-2 mb-2">
          {["all", "active", "pending_payment", "cancelled", "expired"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setOrderStatus(s);
                setOrderPage(1);
              }}
              className={`px-2 py-1 text-sm rounded border ${
                orderStatus === s ? "bg-blue-600 text-white" : ""
              }`}
            >
              {s === "all" ? "Toutes" : s}
            </button>
          ))}
        </div>
        {ordersQuery.data && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-1">Date</th>
                  <th className="text-left p-1">Pays</th>
                  <th className="text-left p-1">Service</th>
                  <th className="text-left p-1">Prix</th>
                  <th className="text-left p-1">Statut</th>
                  <th className="text-left p-1">Marge</th>
                </tr>
              </thead>
              <tbody>
                {ordersQuery.data.orders.map((o: any) => (
                  <tr key={o.id} className="border-b">
                    <td className="p-1">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-1">{o.countryCode}</td>
                    <td className="p-1">{o.serviceCode}</td>
                    <td className="p-1">{o.price.toFixed(2)} €</td>
                    <td className="p-1">{o.status}</td>
                    <td className="p-1">{o.margin != null ? `${o.margin.toFixed(2)} €` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={orderPage}
              total={ordersQuery.data.total}
              pageSize={ordersQuery.data.pageSize}
              onChange={setOrderPage}
            />
          </>
        )}
      </section>

      {/* Liste des dépôts */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Dépôts</h2>
        <div className="flex gap-2 mb-2">
          {["all", "completed", "pending"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setTopupStatus(s);
                setTopupPage(1);
              }}
              className={`px-2 py-1 text-sm rounded border ${
                topupStatus === s ? "bg-blue-600 text-white" : ""
              }`}
            >
              {s === "all" ? "Tous" : s}
            </button>
          ))}
        </div>
        {topupsQuery.data && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-1">Date</th>
                  <th className="text-left p-1">Montant</th>
                  <th className="text-left p-1">Statut</th>
                  <th className="text-left p-1">Référence</th>
                </tr>
              </thead>
              <tbody>
                {topupsQuery.data.topups.map((t: any) => (
                  <tr key={t.id} className="border-b">
                    <td className="p-1">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-1">{t.amountEur.toFixed(2)} €</td>
                    <td className="p-1">{t.status}</td>
                    <td className="p-1">{t.externalId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={topupPage}
              total={topupsQuery.data.total}
              pageSize={topupsQuery.data.pageSize}
              onChange={setTopupPage}
            />
          </>
        )}
      </section>

      {/* Liste des utilisateurs */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Utilisateurs</h2>
        {usersQuery.data && (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-1">Date</th>
                  <th className="text-left p-1">Email</th>
                  <th className="text-left p-1">Nom</th>
                  <th className="text-left p-1">Solde</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.users.map((u: any) => (
                  <tr key={u.id} className="border-b">
                    <td className="p-1">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-1">{u.email}</td>
                    <td className="p-1">{u.name}</td>
                    <td className="p-1">{u.balance.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={userPage}
              total={usersQuery.data.total}
              pageSize={usersQuery.data.pageSize}
              onChange={setUserPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

function Card({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex gap-2 mt-2 justify-center">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-2 py-1 border rounded disabled:opacity-50"
      >
        Précédent
      </button>
      <span className="px-2 py-1 text-sm">
        Page {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-2 py-1 border rounded disabled:opacity-50"
      >
        Suivant
      </button>
    </div>
  );
}