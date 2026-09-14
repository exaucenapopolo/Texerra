import { Resend } from "resend";
import { logger } from "./logger.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function createResendContact(
  email: string,
  name: string,
  userId?: string
) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not set");
    return;
  }

  if (!email) {
    logger.warn("Cannot create Resend contact without email");
    return;
  }

  const cleanName = (name || "").trim();
  const nameParts = cleanName ? cleanName.split(/\s+/) : [];

  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  try {
    const { data, error } = await resend.contacts.create({
      email: email.trim().toLowerCase(),
      firstName,
      lastName,
      unsubscribed: false,
      properties: {
        source: "Texerra SMS",
        firebase_uid: userId || "",
      },
    });

    if (error) {
      logger.warn(
        { error, email },
        "Failed to create Resend contact"
      );
      return;
    }

    logger.info(
      {
        email,
        contactId: data?.id,
      },
      "Resend contact created"
    );
  } catch (err) {
    logger.warn(
      { err, email },
      "Failed to create Resend contact"
    );
  }
}
