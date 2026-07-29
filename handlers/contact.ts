import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { cert, applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";

const router = Router();

const SubmitContactBody = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(200),
  email: z.string().trim().email("Email invalide").max(320),
  message: z.string().trim().min(1, "Le message est requis").max(5000),
});

let firestoreDb: Firestore | null = null;

function getAdminDb(): Firestore {
  if (firestoreDb) return firestoreDb;

  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson) as any;
        initializeApp({
          credential: cert(serviceAccount),
        });
      } catch (error) {
        console.error("Impossible de parser FIREBASE_SERVICE_ACCOUNT_JSON :", error);
        initializeApp({
          credential: applicationDefault(),
        });
      }
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        } as any),
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
      });
    }
  }

  firestoreDb = getFirestore();
  return firestoreDb;
}

router.post("/", async (req: Request, res: Response) => {
  const parsed = SubmitContactBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Données invalides",
      details: parsed.error.issues,
    });
    return;
  }

  const { name, email, message } = parsed.data;

  try {
    const db = getAdminDb();

    await db.collection("contacts").add({
      name,
      email,
      message,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "Message envoyé avec succès. Notre équipe vous répondra dans les 24 heures.",
    });
  } catch (err) {
    console.error("Erreur lors de l'enregistrement du message de contact :", err);
    res.status(500).json({ error: "Impossible d'envoyer le message pour le moment" });
  }
});

export default router;
