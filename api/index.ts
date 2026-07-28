import express from "express";
import cors from "cors";

// 1. Importation avec l'extension .js obligatoire pour Vercel (ESM)
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
        
