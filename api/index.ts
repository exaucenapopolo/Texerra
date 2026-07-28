import express from "express";
import cors from "cors";

// Importation de tes routeurs
import healthRouter from "./health.js";
import countriesRouter from "./countries.js";
import servicesRouter from "./services.js";
import ordersRouter from "./orders.js";
import paymentsRouter from "./payments.js";
import topupsRouter from "./topups.js";
import meRouter from "./me.js";
import statsRouter from "./stats.js";
import contactRouter from "./contact.js";

// Création de l'application Express
const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());

/**
 * Fonction de montage ultra-sécurisée :
 * Si le routeur est valide, on l'ajoute. S'il est undefined, on crée une mini-route 
 * de secours pour empêcher le serveur de planter et identifier le coupable.
 */
const safeMount = (path: string, router: any, name: string) => {
  if (typeof router === "function") {
    app.use(path, router);
    console.log(`✅ Route [${name}] chargée avec succès sur ${path}`);
  } else {
    console.error(`🚨 ERREUR : Le routeur "${name}" (${path}) est UNDEFINED ! Vérifie que le fichier ${name}.ts se termine bien par "export default router;".`);
    
    // Empêche le plantage de Vercel en injectant une réponse d'erreur propre
    app.use(path, (req, res) => {
      res.status(500).json({ error: `La route ${name} est temporairement indisponible (problème d'exportation).` });
    });
  }
};

// Montage sécurisé de la route de santé
if (typeof healthRouter === "function") {
  app.use(healthRouter);
} else {
  console.error("🚨 ERREUR : healthRouter est invalide ou undefined.");
}

// Montage sécurisé de toutes tes routes métiers
safeMount("/me", meRouter, "me");
safeMount("/countries", countriesRouter, "countries");
safeMount("/services", servicesRouter, "services");
safeMount("/orders", ordersRouter, "orders");
safeMount("/payments", paymentsRouter, "payments");
safeMount("/topups", topupsRouter, "topups");
safeMount("/stats", statsRouter, "stats");
safeMount("/contact", contactRouter, "contact");

// Exportation de l'application pour Vercel
export default app;
