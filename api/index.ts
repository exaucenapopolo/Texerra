import express from "express";
import cors from "cors";

// Importation statique de TOUTES tes routes d'origine, sans en oublier une seule
import healthRouter from "./health.js";
import meRouter from "./me.js";
import countriesRouter from "./countries.js";
import servicesRouter from "./services.js";
import ordersRouter from "./orders.js";
import paymentsRouter from "./payments.js";
import topupsRouter from "./topups.js";
import statsRouter from "./stats.js";
import contactRouter from "./contact.js";

const app = express();

// Configuration des middlewares globaux
app.use(cors());
app.use(express.json());

// Montage de toutes tes routes (identique à ton fichier d'origine, mais sécurisé pour Vercel)
app.use("/health", healthRouter);
app.use("/api/me", meRouter);
app.use("/api/countries", countriesRouter);
app.use("/api/services", servicesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/topups", topupsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/contact", contactRouter);

// Fallback 404 pour les routes introuvables
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route introuvable",
  });
});

// Gestion d'erreurs globale du serveur
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Erreur Express :", err);
  res.status(500).json({
    ok: false,
    message: "Erreur serveur interne",
  });
});

export default app;
