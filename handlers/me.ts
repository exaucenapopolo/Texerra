import { Router } from "express";
import { firestoreDb } from "../lib/firebase-admin.js";
import { requireAuth } from "../lib/requireAuth.js";
import { sendWelcomeEmail } from "../lib/mailer.js";

const router = Router();

const SUPPORTED_CURRENCIES = [
  "EUR", "USD",
  "XAF", "XOF", "CDF", "GNF", "NGN", "GHS", "KES", "TZS", "RWF", "UGX",
  "ZMW", "MWK", "MZN", "ETB", "MAD", "DZD",
];

/**
 * Formate les données utilisateur pour l'API
 */
function formatUser(user: any) {
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
  const userId = (req as any).userId as string;
  const firebaseUser = (req as any).firebaseUser as {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  const userRef = firestoreDb.collection("users").doc(userId);
  const userDoc = await userRef.get();

  let userData: any;

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
      // Création du profil dans Firestore
      await userRef.set(userData);

      // Nouvel utilisateur — envoyer l'e-mail de bienvenue (non-bloquant)
      if (email) {
        sendWelcomeEmail(email, name).catch(() => {});
      }
    } catch (err) {
      const logger = (req as any).log || console;
      logger.error({ err }, "Failed to provision user from Firebase");
      res.status(500).json({ error: "Failed to load user profile" });
      return;
    }
  } else {
    userData = userDoc.data();
  }

  res.json(formatUser(userData));
});

// PATCH /api/me — Mettre à jour le profil utilisateur
router.patch("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { name, phone, currency } = (req.body ?? {}) as {
    name?: string;
    phone?: string;
    currency?: string;
  };

  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400).json({ error: "Le nom ne peut pas être vide" });
      return;
    }
    updates.name = name.trim();
  }

  if (phone !== undefined) {
    updates.phone = phone.trim() || null;
  }

  if (currency !== undefined) {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      res.status(400).json({ error: "Devise non supportée" });
      return;
    }
    updates.currency = currency;
  }

  // S'il n'y a que 'updatedAt', c'est qu'aucune modification valide n'a été passée
  if (Object.keys(updates).length <= 1) {
    res.status(400).json({ error: "Aucune modification fournie" });
    return;
  }

  try {
    const userRef = firestoreDb.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ error: "Utilisateur non trouvé" });
      return;
    }

    // Mise à jour dans Firestore
    await userRef.update(updates);

    const updatedDoc = await userRef.get();
    res.json(formatUser(updatedDoc.data()));
  } catch (err) {
    const logger = (req as any).log || console;
    logger.error({ err }, "Failed to update user profile");
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil" });
  }
});

// Notifications in-app : lecture limitée pour ne pas multiplier les lectures Firestore.
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const rawLimit = Number(req.query.limit ?? 20);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 30);
    const notificationsRef = firestoreDb.collection("users").doc(userId).collection("notifications");
    const [snap, unreadSnap] = await Promise.all([
      notificationsRef.orderBy("createdAt", "desc").limit(limit).get(),
      notificationsRef.where("read", "==", false).count().get(),
    ]);
    res.json({
      notifications: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      unreadCount: unreadSnap.data().count,
    });
  } catch (err) {
    console.error("[me/notifications] error:", err);
    res.status(500).json({ error: "Impossible de récupérer les notifications" });
  }
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const id = String(req.params.id || "").slice(0, 160);
    if (!id) {
      res.status(400).json({ error: "Notification invalide" });
      return;
    }
    const ref = firestoreDb.collection("users").doc(userId).collection("notifications").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: "Notification introuvable" });
      return;
    }
    if (snap.data()?.read !== true) {
      await ref.update({ read: true, readAt: new Date().toISOString() });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[me/notifications/read] error:", err);
    res.status(500).json({ error: "Impossible de mettre à jour la notification" });
  }
});

export default router;
