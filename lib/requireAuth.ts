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
