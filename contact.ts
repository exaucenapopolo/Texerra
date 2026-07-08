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

  await db.insert(contactsTable).values({ name, email, message });

  res.json({ success: true, message: "Message envoyé avec succès. Notre équipe vous répondra dans les 24 heures." });
});

export default router;
