import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getAdminAuth } from "./firebase-admin.js";

export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized: missing authorization header" });
    return;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Unauthorized: invalid authorization format" });
    return;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token.trim());

    (req as any).userId = decoded.uid;
    (req as any).firebaseUser = decoded;

    next();
  } catch (error) {
    console.error("requireAuth error:", error);
    res.status(401).json({ error: "Unauthorized: invalid or expired token" });
  }
};

export default requireAuth;
