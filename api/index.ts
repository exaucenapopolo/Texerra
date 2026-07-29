import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";

// Importation ESM avec extension .js obligatoire pour Vercel
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

// Montage des routes
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
