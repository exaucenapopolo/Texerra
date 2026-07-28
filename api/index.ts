import express from "express";
import cors from "cors";

// Importation de tes routes
import healthRouter from "./health.js";
import countriesRouter from "./countries.js";
import servicesRouter from "./services.js";
import ordersRouter from "./orders.js";
import paymentsRouter from "./payments.js";
import topupsRouter from "./topups.js";
import meRouter from "./me.js";
import statsRouter from "./stats.js";
import contactRouter from "./contact.js";

// Création d'une vraie application Express (et non plus un simple router)
const app = express();

// Middlewares globaux indispensables
app.use(cors());
app.use(express.json());

// Fonction de sécurité pour monter les routes proprement
const safeMount = (path: string, subRouter: any) => {
  if (subRouter) {
    app.use(path, subRouter);
  } else {
    console.error(`⚠️ Attention : Le routeur pour "${path}" n'a pas pu être chargé (undefined).`);
  }
};

// Montage de la route de santé
if (healthRouter) {
  app.use(healthRouter);
} else {
  console.error("⚠️ Attention : healthRouter est introuvable (undefined).");
}

// Montage sécurisé de toutes tes autres routes
safeMount("/me", meRouter);
safeMount("/countries", countriesRouter);
safeMount("/services", servicesRouter);
safeMount("/orders", ordersRouter);
safeMount("/payments", paymentsRouter);
safeMount("/topups", topupsRouter);
safeMount("/stats", statsRouter);
safeMount("/contact", contactRouter);

// Exportation de l'application (compatible à 100% avec les fonctions Serverless de Vercel)
export default app;
