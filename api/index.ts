import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import countriesRouter from "./countries.js";
import servicesRouter from "./services.js";
import ordersRouter from "./orders.js";
import paymentsRouter from "./payments.js";
import topupsRouter from "./topups.js";
import meRouter from "./me.js";
import statsRouter from "./stats.js";
import contactRouter from "./contact.js";

const router: IRouter = Router();

// Fonction de sécurité pour éviter le crash .apply() si un routeur est undefined
const safeMount = (path: string, subRouter: any) => {
  if (subRouter) {
    router.use(path, subRouter);
  } else {
    console.error(`⚠️ Attention : Le routeur pour "${path}" n'a pas pu être chargé (undefined).`);
  }
};

if (healthRouter) {
  router.use(healthRouter);
}

safeMount("/me", meRouter);
safeMount("/countries", countriesRouter);
safeMount("/services", servicesRouter);
safeMount("/orders", ordersRouter);
safeMount("/payments", paymentsRouter);
safeMount("/topups", topupsRouter);
safeMount("/stats", statsRouter);
safeMount("/contact", contactRouter);

export default router;
