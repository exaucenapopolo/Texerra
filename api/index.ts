// Fichier : api/index.ts

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";

// Importation ESM : On pointe maintenant vers le dossier "../handlers"
import healthRouter from "../handlers/health.js";
import meRouter from "../handlers/me.js";
import countriesRouter from "../handlers/countries.js";
import servicesRouter from "../handlers/services.js";
import ordersRouter from "../handlers/orders.js";
import paymentsRouter from "../handlers/payments.js";
import topupsRouter from "../handlers/topups.js";
import statsRouter from "../handlers/stats.js";
import contactRouter from "../handlers/contact.js";

const app = express();

// Middlewares de base
app.use(cors());
app.use(express.json());

// Route de test
app.get("/", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    message: "API is running",
  });
});

// Montage des routes (Express s'occupe de rediriger le trafic vers les bons fichiers)
app.use("/health", healthRouter);
app.use("/api/me", meRouter);
app.use("/api/countries", countriesRouter);
app.use("/api/services", servicesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/topups", topupsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/contact", contactRouter);

// 404 fallback
app.use((req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    message: "Route introuvable",
    path: req.originalUrl,
  });
});

// Gestion globale des erreurs
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Erreur Express :", err);

  res.status(500).json({
    ok: false,
    message: "Erreur serveur interne",
  });
});

export default app;
