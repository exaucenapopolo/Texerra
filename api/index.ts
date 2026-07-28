import express from "express";
import cors from "cors";

// Importation de tous tes modules de routes
import * as healthModule from "./health.js";
import * as countriesModule from "./countries.js";
import * as servicesModule from "./services.js";
import * as ordersModule from "./orders.js";
import * as paymentsModule from "./payments.js";
import * as topupsModule from "./topups.js";
import * as meModule from "./me.js";
import * as statsModule from "./stats.js";
import * as contactModule from "./contact.js";

// Création de l'application Express
const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());

/**
 * Fonction intelligente pour extraire le routeur d'un module,
 * qu'il soit exporté par défaut (default) ou nommé (router).
 */
const getRouter = (mod: any) => {
  if (!mod) return null;
  // Si le module lui-même est une fonction/routeur Express
  if (typeof mod === "function" || (mod && typeof mod.handle === "function")) return mod;
  // S'il est exporté via "export default"
  if (mod.default && (typeof mod.default === "function" || typeof mod.default.handle === "function")) return mod.default;
  // S'il est exporté via "export const router"
  if (mod.router && (typeof mod.router === "function" || typeof mod.router.handle === "function")) return mod.router;
  return null;
};

// Fonction de montage sécurisé
const safeMount = (path: string, mod: any) => {
  const router = getRouter(mod);
  if (router) {
    app.use(path, router);
  } else {
    console.error(`⚠️ Attention : Le routeur pour "${path}" n'a pas pu être chargé (invalide ou undefined).`);
  }
};

// Montage de la route de santé
const healthRouter = getRouter(healthModule);
if (healthRouter) {
  app.use(healthRouter);
} else {
  console.error("⚠️ Attention : healthRouter est introuvable.");
}

// Montage sécurisé de toutes tes autres routes
safeMount("/me", meModule);
safeMount("/countries", countriesModule);
safeMount("/services", servicesModule);
safeMount("/orders", ordersModule);
safeMount("/payments", paymentsModule);
safeMount("/topups", topupsModule);
safeMount("/stats", statsModule);
safeMount("/contact", contactModule);

// Exportation de l'application pour Vercel
export default app;
