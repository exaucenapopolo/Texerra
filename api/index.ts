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
// ➕ NOUVEAU : routeur administrateur
import adminRouter from "../handlers/admin.js";
// ➕ NOUVEAU : routeur affiliation (commerciaux / commissions / retraits)
//    ⚠️ Ce fichier est un ROUTEUR EXPRESS, pas une Function Vercel.
//    Il est importé par ce point d'entrée unique, donc aucune Function
//    supplémentaire n'est créée sur Vercel.
import affiliateRouter from "../handlers/affiliate.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true, message: "API is running" });
});

app.use("/health", healthRouter);
app.use("/api/me", meRouter);
app.use("/api/countries", countriesRouter);
app.use("/api/services", servicesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/topups", topupsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/contact", contactRouter);

// ➕ NOUVEAU : système d'affiliation / commerciaux / commissions / retraits
//    Toutes les routes sont exposées sous /api/affiliate/*
//    Ex : GET  /api/affiliate/visit?ref=TX-DAVID
//         POST /api/affiliate/claim
//         GET  /api/affiliate/me
//         GET  /api/affiliate/clients
//         GET  /api/affiliate/commissions
//         GET  /api/affiliate/withdrawals
//         POST /api/affiliate/withdrawals
//         GET  /api/affiliate/admin/commercials
//         POST /api/affiliate/admin/commercials
//         PATCH /api/affiliate/admin/commercials/:id/rate
//         GET  /api/affiliate/admin/withdrawals
//         PATCH /api/affiliate/admin/withdrawals/:id
//         GET  /api/affiliate/admin/stats
app.use("/api/affiliate", affiliateRouter);

// ➕ NOUVEAU : routes admin (protégées par requireAdmin dans le handler)
app.use("/api/admin", adminRouter);

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
  res.status(500).json({ ok: false, message: "Erreur serveur interne" });
});

export default app;
