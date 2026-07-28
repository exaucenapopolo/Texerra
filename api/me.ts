import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth.js";
import { sendWelcomeEmail } from "../lib/mailer.js";

const router = Router();

const SUPPORTED_CURRENCIES = [
  "EUR", "USD",
  "XAF", "XOF", "CDF", "GNF", "NGN", "GHS", "KES", "TZS", "RWF", "UGX",
  "ZMW", "MWK", "MZN", "ETB", "MAD", "DZD",
];

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    phone: user.phone ?? null,
    currency: user.currency ?? "EUR",
    balance: parseFloat(user.balance ?? "0"),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const firebaseUser = (req as any).firebaseUser as {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) {
    const email = firebaseUser.email ?? "";
    const name = firebaseUser.name || email.split("@")[0] || "Utilisateur";
    const avatarUrl = firebaseUser.picture ?? null;

    try {
      [user] = await db
        .insert(usersTable)
        .values({ id: userId, email, name, avatarUrl, balance: "0" })
        .onConflictDoNothing()
        .returning();

      if (!user) {
        [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      } else {
        // Nouvel utilisateur — envoyer l'email de bienvenue (sans bloquer la réponse)
        if (email) sendWelcomeEmail(email, name).catch(() => {});
      }
    } catch (err) {
      req.log.error({ err }, "Failed to provision user from Firebase");
      res.status(500).json({ error: "Failed to load user profile" });
      return;
    }
  }

  res.json(formatUser(user));
});

router.patch("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { name, phone, currency } = (req.body ?? {}) as {
    name?: string;
    phone?: string;
    currency?: string;
  };

  const updates: Partial<typeof usersTable.$inferInsert> = {};

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

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Aucune modification fournie" });
    return;
  }

  try {
    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Utilisateur non trouvé" });
      return;
    }

    res.json(formatUser(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update user profile");
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil" });
  }
});

export default router;
