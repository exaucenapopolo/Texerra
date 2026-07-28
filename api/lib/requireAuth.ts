import type { Request, Response, NextFunction } from "express";
// Retrait de l'extension .js pour une meilleure compatibilité avec Vercel
import { getAdminAuth } from "./firebase-admin";

/**
 * Middleware d'authentification
 * Utilisation de "export const" (export nommé) pour correspondre 
 * aux imports dans me.ts et orders.ts
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // Vérification de la présence et du format du token
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Extraction du token (on enlève les 7 caractères de "Bearer ")
  const token = authHeader.slice(7);

  try {
    // Validation du token auprès de Firebase
    const decoded = await getAdminAuth().verifyIdToken(token);
    
    // Injection des données utilisateur dans la requête Express
    (req as any).userId = decoded.uid;
    (req as any).firebaseUser = decoded;
    
    // Tout est bon, on passe au middleware ou au contrôleur suivant
    next();
  } catch (error) {
    console.error("Erreur d'authentification Firebase :", error);
    res.status(401).json({ error: "Unauthorized" });
  }
};
