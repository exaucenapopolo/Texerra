import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "texerra-d2506.firebaseapp.com",
  projectId: "texerra-d2506",
  storageBucket: "texerra-d2506.firebasestorage.app",
  messagingSenderId: "711713247381",
  appId: "1:711713247381:web:3c74d9207fa152d9f70b9c",
  measurementId: "G-75M3XXR34Q",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
