import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore"; // Ajout de Firestore

let _auth: Auth | null = null;

// Initialisation globale de l'application Firebase
if (!getApps().length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var is missing");
  const serviceAccount = JSON.parse(raw);
  initializeApp({ credential: cert(serviceAccount) });
}

export function getAdminAuth(): Auth {
  if (!_auth) {
    _auth = getAuth();
  }
  return _auth;
}

// Exportation de la base de données pour l'utiliser dans orders.ts et me.ts
export const firestoreDb = getFirestore();
