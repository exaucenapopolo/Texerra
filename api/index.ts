import express from "express";
import cors from "cors";

// Importations directes par défaut de tes routeurs
import healthRouter from "./health.js";
import countriesRouter from "./countries.js";
import servicesRouter from "./services.js";
import ordersRouter from "./orders.js";
import paymentsRouter from "./payments.js";
import topupsRouter from "./topups.js";
import meRouter from "./me.js";
import statsRouter from "./stats.js";
import contactRouter from "./contact.js";

// Création de l'application Express principale
const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());

// Montage de la route de santé (Health) si elle est valide
if (typeof healthRouter === "function") {
  app.use(healthRouter);
  console.log("✅ Route [health] montée avec succès.");
} else {
  console.error("❌ Erreur : healthRouter n'est pas une fonction valide (Vérifie son export default).");
}

// Tableau de configuration pour monter proprement toutes les routes
const routes = [
  { path: "/me", router: meRouter, name: "me" },
  { path: "/countries", router: countriesRouter, name: "countries" },
  { path: "/services", router: servicesRouter, name: "services" },
  { path: "/orders", router: ordersRouter, name: "orders" },
  { path: "/payments", router: paymentsRouter, name: "payments" },
  { path: "/topups", router: topupsRouter, name: "topups" },
  { path: "/stats", router: statsRouter, name: "stats" },
  { path: "/contact", router: contactRouter, name: "contact" },
];

// Boucle de montage sécurisée
routes.forEach(({ path, router, name }) => {
  if (typeof router === "function") {
    app.use(path, router);
    console.log(`✅ Route [${name}] montée sur ${path}`);
  } else {
    console.error(`❌ Erreur : Le routeur "${name}" (${path}) n'est pas une fonction. Assure-toi d'utiliser "export default router" dans ${name}.ts`);
  }
});

// Exportation de l'application pour Vercel
export default app;
