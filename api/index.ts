import express from "express";
import cors from "cors";

// 1. Importation propre et directe de chaque routeur.
// Note : on omet l'extension (.js ou .ts) pour laisser TypeScript gérer la résolution.
import healthRouter from "./health";
import meRouter from "./me";
import countriesRouter from "./countries";
import servicesRouter from "./services";
import ordersRouter from "./orders";
import paymentsRouter from "./payments";
import topupsRouter from "./topups";
import statsRouter from "./stats";
import contactRouter from "./contact";

const app = express();

// 2. Configuration des middlewares de base
app.use(cors());
app.use(express.json());

// 3. Montage standard et direct de tes routes
app.use("/health", healthRouter);
app.use("/api/me", meRouter);
app.use("/api/countries", countriesRouter);
app.use("/api/services", servicesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/topups", topupsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/contact", contactRouter);

// 4. Gestion des routes introuvables (Fallback 404)
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route introuvable",
  });
});

// 5. Gestion d'erreurs globale
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Erreur Express :", err);
  res.status(500).json({
    ok: false,
    message: "Erreur serveur interne",
  });
});

// 6. L'export crucial pour Vercel
export default app;
