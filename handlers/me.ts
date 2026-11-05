import { Router } from "express";
import { firestoreDb, getAdminAuth } from "../lib/firebase-admin.js";
import { requireAuth } from "../lib/requireAuth.js";
import { sendWelcomeEmail, sendPartnerApplicationEmails } from "../lib/mailer.js";

const router = Router();

function detectCountryFromRequest(req: any): { countryIso: string; countryName: string; countryFlag: string; countrySource: string; countryDetectedAt: string } | null {
  const raw = String(req.headers?.["x-vercel-ip-country"] ?? req.headers?.["cf-ipcountry"] ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(raw) || raw === "XX" || raw === "T1") return null;
  let countryName = raw;
  try {
    const displayNames = new Intl.DisplayNames(["fr"], { type: "region" });
    countryName = displayNames.of(raw) || raw;
  } catch { /* Le code ISO reste une information exploitable. */ }
  const first = 0x1f1e6 + raw.charCodeAt(0) - 65;
  const second = 0x1f1e6 + raw.charCodeAt(1) - 65;
  return {
    countryIso: raw,
    countryName,
    countryFlag: String.fromCodePoint(first, second),
    countrySource: "edge-ip",
    countryDetectedAt: new Date().toISOString(),
  };
}

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
    countryIso: user.countryIso ?? null,
    countryName: user.countryName ?? null,
    countryFlag: user.countryFlag ?? null,
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

    let accountCreatedAt = new Date().toISOString();
    try {
      const authRecord = await getAdminAuth().getUser(userId);
      if (authRecord.metadata.creationTime) {
        accountCreatedAt = new Date(authRecord.metadata.creationTime).toISOString();
      }
    } catch {
      // Si Firebase Auth ne renvoie pas les métadonnées, on conserve la date de provisionnement.
    }

    userData = {
      id: userId,
      email,
      name,
      avatarUrl,
      phone: null,
      currency: "EUR",
      balance: "0.0000",
      ...(detectCountryFromRequest(req) ?? {}),
      createdAt: accountCreatedAt,
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
    // Renseigne les anciens profils sans pays uniquement lorsqu'ils reviennent
    // sur la plateforme. Aucune demande de permission GPS côté navigateur.
    const detectedCountry = detectCountryFromRequest(req);
    if (detectedCountry && !userData.countryIso) {
      await userRef.set(detectedCountry, { merge: true });
      userData = { ...userData, ...detectedCountry };
    }
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

// Candidature commerciale : l'identité et l'adresse e-mail viennent du compte Firebase authentifié.
router.post("/partner-application", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const firstName = String(req.body?.firstName ?? "").trim();
    const lastName = String(req.body?.lastName ?? "").trim();
    const city = String(req.body?.city ?? "").trim();
    const rawPhone = String(req.body?.whatsappPhone ?? "").trim();
    const whatsappPhone = rawPhone.replace(/[\s().-]/g, "");

    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 || !city || city.length > 120) {
      res.status(400).json({ error: "Veuillez renseigner un prénom, un nom et une ville valides." });
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(whatsappPhone)) {
      res.status(400).json({ error: "Le numéro WhatsApp doit être au format international, avec + et l'indicatif du pays." });
      return;
    }
    if (req.body?.acceptedContract !== true) {
      res.status(400).json({ error: "Vous devez confirmer avoir lu et accepté le contrat d'agent commercial." });
      return;
    }

    // L'adresse de confirmation est toujours celle du compte Firebase authentifié.
    // Aucun e-mail fourni par le navigateur n'est utilisé comme destinataire.
    const account = await getAdminAuth().getUser(userId);
    const accountEmail = String(account.email ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
      res.status(400).json({ error: "Aucune adresse e-mail valide n'est associée à votre compte Texerra. Mettez d'abord votre compte à jour." });
      return;
    }

    const submittedAt = new Date().toISOString();
    const emailResult = await sendPartnerApplicationEmails({
      firstName,
      lastName,
      city,
      whatsappPhone,
      email: accountEmail,
      submittedAt,
    });

    res.status(201).json({
      ok: true,
      confirmationEmailSent: emailResult.applicantEmailSent,
    });
  } catch (err) {
    console.error("[me/partner-application] error:", err);
    res.status(500).json({ error: "Votre demande n'a pas pu être transmise pour le moment. Veuillez réessayer." });
  }
});

// Notifications in-app : seules les notifications non lues sont renvoyées.
// Le tri en mémoire évite de créer un nouvel index Firestore.
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const rawLimit = Number(req.query.limit ?? 20);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 30);
    const notificationsRef = firestoreDb.collection("users").doc(userId).collection("notifications");
    const unreadSnap = await notificationsRef.where("read", "==", false).get();
    const unreadNotifications = unreadSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const getTime = (value: any) => {
          if (value && typeof value.toDate === "function") return value.toDate().getTime();
          const time = value ? new Date(value).getTime() : 0;
          return Number.isFinite(time) ? time : 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });

    res.json({
      notifications: unreadNotifications.slice(0, limit),
      unreadCount: unreadSnap.size,
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
