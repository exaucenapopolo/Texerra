import { Router } from "express";
import { db, contactsTable } from "@workspace/db";
import { SubmitContactBody } from "@workspace/api-zod";

const router = Router();

router.post("/", async (req, res) => {
  const parsed = SubmitContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides" });
    return;
  }

  const { name, email, message } = parsed.data;

  try {
    // Enregistrement dans la base de données
    await db.insert(contactsTable).values({ name, email, message });

    res.json({ 
      success: true, 
      message: "Message envoyé avec succès. Notre équipe vous répondra dans les 24 heures." 
    });
  } catch (err) {
    console.error("Erreur lors de l'enregistrement du message de contact :", err);
    res.status(500).json({ error: "Impossible d'envoyer le message pour le moment" });
  }
});

export default router;
