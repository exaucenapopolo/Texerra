import express, { Router } from "express";
import cors from "cors";

// Importations de tes fichiers de routes
import * as healthMod from "./health.js";
import * as meMod from "./me.js";
import * as countriesMod from "./countries.js";
import * as servicesMod from "./services.js";
import * as ordersMod from "./orders.js";
import * as paymentsMod from "./payments.js";
import * as topupsMod from "./topups.js";
import * as statsMod from "./stats.js";
import * as contactMod from "./contact.js";

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Bouclier anti-crash : si un module de route est introuvable ou mal exporté (undefined),
 * cette fonction renvoie un routeur vide par défaut au lieu de faire planter Express.
 */
const getRouter = (mod: any): Router => {
  const router = mod?.default || mod?.router || mod;
  if (router && (typeof router === "function" || typeof router.handle === "function")) {
    return router;
  }
  // Fallback de sécurité pour éviter le crash .apply() de Vercel
  const dummyRouter = Router();
  dummyRouter.all("*", (req, res) => {
    res.status(503).json({ error: "Service temporairement indisponible (route mal initialisée)" });
  });
  return dummyRouter;
};

// Montage sécurisé de toutes tes routes
app.use("/health", getRouter(healthMod));
app.use("/api/me", getRouter(meMod));
app.use("/api/countries", getRouter(countriesMod));
app.use("/api/services", getRouter(servicesMod));
app.use("/api/orders", getRouter(ordersMod));
app.use("/api/payments", getRouter(paymentsMod));
app.use("/api/topups", getRouter(topupsMod));
app.use("/api/stats", getRouter(statsMod));
app.use("/api/contact", getRouter(contactMod));

// Fallback 404
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Route introuvable",
  });
});

// Gestion d'erreurs globale
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Erreur Express :", err);
  res.status(500).json({
    ok: false,
    message: "Erreur serveur interne",
  });
});

export default app;
    
