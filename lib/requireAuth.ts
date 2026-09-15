import type { Request, Response, NextFunction } from "express";
import { getAdminAuth } from "./firebase-admin.js";

/**
 * Middleware d'authentification sécurisé pour vérifier le token Firebase.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);

    // Attache l'ID et les infos utilisateur à l'objet de la requête
    (req as any).userId = decoded.uid;
    (req as any).firebaseUser = decoded;

    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * Adresse e-mail de l'administrateur.
 * ⚠️ Cette adresse ne doit JAMAIS être exposée dans l'interface utilisateur publique.
 */
const ADMIN_EMAIL = "exaucenapopolo2@gmail.com";

/**
 * Middleware d'authentification administrateur.
 * Vérifie le token Firebase ET l'e-mail administrateur.
 * Toute requête sans ces deux conditions est rejetée.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);

    if (decoded.email !== ADMIN_EMAIL) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    (req as any).userId = decoded.uid;
    (req as any).firebaseUser = decoded;

    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
    }
