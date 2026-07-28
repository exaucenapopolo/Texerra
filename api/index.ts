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

// Création de l'application Express principale
const app = express();

// Middlewares globaux indispensables
app.use(cors());
app.use(express.json());

/**
 * Fonction de sécurité ultra-robuste pour monter une route.
 * Elle vérifie si le module contient bien un routeur valide avant de l'ajouter.
 */
const mountRoute = (path: string, moduleObj: any, name: string) => {
  try {
    // Récupère le routeur qu'il soit exporté par défaut ou nommé
    const router = moduleObj?.default || moduleObj?.router || moduleObj;
    
    // Vérifie si c'est bien une fonction ou un routeur Express valide
    if (typeof router === "function" || (router && typeof router.handle === "function")) {
      app.use(path, router);
      console.log(`✅ Route [${name}] montée avec succès sur le chemin : ${path}`);
    } else {
      console.error(`❌ Erreur : Le module "${name}" (${path}) ne fournit pas de routeur Express valide.`);
    }
  } catch (err) {
    console.error(`❌ Exception critique lors du montage de la route "${name}" (${path}) :`, err);
  }
};

// Montage sécurisé de la route de santé (Health)
const healthRouter = healthModule?.default || healthModule?.router || healthModule;
if (typeof healthRouter === "function" || (healthRouter && typeof healthRouter.handle === "function")) {
  app.use(healthRouter);
  console.log("✅ Route [health] montée avec succès à la racine.");
} else {
  console.error("⚠️ Attention : healthRouter est invalide ou introuvable.");
}

// Montage sécurisé de toutes tes autres routes avec un journal clair
mountRoute("/me", meModule, "me");
mountRoute("/countries", countriesModule, "countries");
mountRoute("/services", servicesModule, "services");
mountRoute("/orders", ordersModule, "orders");
mountRoute("/payments", paymentsModule, "payments");
mountRoute("/topups", topupsModule, "topups");
mountRoute("/stats", statsModule, "stats");
mountRoute("/contact", contactModule, "contact");

// Exportation de l'application (compatible à 100% avec les fonctions Serverless de Vercel)
export default app;
