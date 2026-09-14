import { Resend } from "resend";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const idToken = authorization.substring(7);

    const decodedToken = await getAuth().verifyIdToken(idToken);

    const {
      email,
      firstName = "",
      lastName = "",
      audienceId,
    } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email requis",
      });
    }

    if (decodedToken.email !== email) {
      return res.status(403).json({
        success: false,
        error: "Email does not match authenticated user",
      });
    }

    const payload: Record<string, any> = {
      email,
      firstName,
      lastName,
      unsubscribed: false,
    };

    if (audienceId) {
      payload.audienceId = audienceId;
    }

    const { data, error } = await resend.contacts.create(payload);

    if (error) {
      console.error("Resend contact creation error:", error);

      return res.status(400).json({
        success: false,
        error,
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Create Resend contact error:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Erreur interne du serveur",
    });
  }
      }
