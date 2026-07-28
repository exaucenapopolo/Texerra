import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let _auth: Auth | null = null;

export function getAdminAuth(): Auth {
  if (_auth) return _auth;

  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var is missing");
    const serviceAccount = JSON.parse(raw);
    initializeApp({ credential: cert(serviceAccount) });
  }

  _auth = getAuth();
  return _auth;
}
