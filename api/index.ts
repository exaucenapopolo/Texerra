import express, { Router } from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

function isExpressRouter(value: unknown): value is Router {
  return (
    typeof value === "function" &&
    typeof (value as any).use === "function" &&
    typeof (value as any).handle === "function"
  );
}

function resolveRouteModule(mod: any) {
  return mod?.default ?? mod?.router ?? mod;
}

async function safeLoadRoute(path: string, file: string, name: string) {
  try {
    const mod = await import(file);
    const router = resolveRouteModule(mod);

    if (isExpressRouter(router)) {
      app.use(path, router);
      console.log(`✅ [OK] Route "${name}" chargée sur ${path}`);
    } else {
      console.error(
        `❌ [ERREUR] "${name}" n'exporte pas un Router Express valide.`
      );
    }
  } catch (err) {
    console.error(`🚨 [CRITIQUE] Erreur au chargement de "${name}" :`, err);
  }
}

async function bootstrap() {
  // Route santé
  await safeLoadRoute("/health", "./health.js", "health");

  // Routes métier
  await safeLoadRoute("/me", "./me.js", "me");
  await safeLoadRoute("/countries", "./countries.js", "countries");
  await safeLoadRoute("/services", "./services.js", "services");
  await safeLoadRoute("/orders", "./orders.js", "orders");
  await safeLoadRoute("/payments", "./payments.js", "payments");
  await safeLoadRoute("/topups", "./topups.js", "topups");
  await safeLoadRoute("/stats", "./stats.js", "stats");
  await safeLoadRoute("/contact", "./contact.js", "contact");
}

bootstrap().catch((err) => {
  console.error("🚨 Bootstrap fatal :", err);
});

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
