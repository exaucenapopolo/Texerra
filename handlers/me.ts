import { Router } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import { requireAuth } from "../lib/requireAuth.js";
import { sendWelcomeEmail } from "../lib/mailer.js";
import { createResendContact } from "../lib/resend-contact.js";

const router = Router();

const SUPPORTED_CURRENCIES = [
  "EUR", "USD",
  "XAF", "XOF", "CDF", "GNF", "NGN", "GHS", "KES", "TZS", "RWF", "UGX",
  "ZMW", "MWK", "MZN", "ETB", "MAD", "DZD",
];

/**
 * Formate les données utilisateur pour l'API
 */
function formatUser(user) {
  return {
    id: user.id,
    email: user.email || "",
    name: user.name || "Utilisateur",
    avatarUrl: user.avatarUrl || null,
    phone: user.phone ?? null,
    currency: user.currency ?? "EUR",
    balance: parseFloat(user.balance ?? "0"),
  };
}

// GET /api/me — Récupérer ou initialiser le profil de l'utilisateur authentifié
router.get("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const firebaseUser = req.firebaseUser;

  const userRef = firestoreDb.collection("users").doc(userId);
  const userDoc = await userRef.get();

  let userData;

  if (!userDoc.exists) {
    const email = firebaseUser?.email ?? "";
    const name = firebaseUser?.name || email.split("@")[0] || "Utilisateur";
    const avatarUrl = firebaseUser?.picture ?? null;

    userData = {
      id: userId,
      email,
      name,
      avatarUrl,
      phone: null,
      currency: "EUR",
      balance: "0.0000",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await userRef.set(userData);

      if (email) {
        sendWelcomeEmail(email, name).catch((err) => {
          console.error("Welcome email error:", err);
        });

        createResendContact(email, name, userId).catch((err) => {
          console.error("Resend contact error:", err);
        });
      }
    } catch (err) {
      const logger = req.log || console;
      logger.error({ err }, "Failed to provision user from Firebase");

      res.status(500).json({
        error: "Failed to load user profile",
      });
      return;
    }
  } else {
    userData = userDoc.data();
  }

  res.json(formatUser(userData));
});

// PATCH /api/me — Mettre à jour le profil utilisateur
router.patch("/", requireAuth, async (req, res) => {
  const userId = req.userId;
  const { name, phone, currency } = req.body ?? {};

  const updates = {
    updatedAt: new Date().toISOString(),
  };

  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400).json({
        error: "Le nom ne peut pas être vide",
      });
      return;
    }

    updates.name = name.trim();
  }

  if (phone !== undefined) {
    updates.phone = phone.trim() || null;
  }

  if (currency !== undefined) {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      res.status(400).json({
        error: "Devise non supportée",
      });
      return;
    }

    updates.currency = currency;
  }

  if (Object.keys(updates).length <= 1) {
    res.status(400).json({
      error: "Aucune modification fournie",
    });
    return;
  }

  try {
    const userRef = firestoreDb.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({
        error: "Utilisateur non trouvé",
      });
      return;
    }

    await userRef.update(updates);

    const updatedDoc = await userRef.get();

    res.json(formatUser(updatedDoc.data()));
  } catch (err) {
    const logger = req.log || console;

    logger.error(
      { err },
      "Failed to update user profile"
    );

    res.status(500).json({
      error: "Erreur lors de la mise à jour du profil",
    });
  }
});

export default router;
