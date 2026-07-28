import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let _auth: Auth | null = null;

/**
 * Initialise Firebase Admin si ce n'est pas déjà fait en utilisant le JSON du compte de service.
 */
function ensureInitialized() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var is missing");
    const serviceAccount = JSON.parse(raw);
    initializeApp({ credential: cert(serviceAccount) });
  }
}

export function getAdminAuth(): Auth {
  if (_auth) return _auth;
  ensureInitialized();
  _auth = getAuth();
  return _auth;
}

// S'assure que Firebase est initialisé avant d'exporter firestoreDb
ensureInitialized();

// Export de l'instance Firestore attendue par tes routes API (orders.ts, me.ts)
export const firestoreDb = getFirestore();
  
