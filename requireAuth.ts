import type { Request, Response, NextFunction } from "express";
import { getAdminAuth } from "./firebase-admin.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    (req as any).userId = decoded.uid;
    (req as any).firebaseUser = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
