import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  getRedirectResult,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  getAdditionalUserInfo,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function createResendContact(firebaseUser: User): Promise<void> {
  try {
    if (!firebaseUser.email) {
      return;
    }

    const idToken = await firebaseUser.getIdToken();

    const fullName = firebaseUser.displayName?.trim() || "";
    const nameParts = fullName ? fullName.split(/\s+/) : [];

    const firstName = nameParts.length > 0 ? nameParts[0] : "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const response = await fetch("/api/create-resend-contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        email: firebaseUser.email,
        firstName,
        lastName,
        audienceId: import.meta.env.VITE_RESEND_AUDIENCE_ID || undefined,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Création du contact Resend échouée:", result);
      return;
    }

    console.log("Contact Resend créé:", result);
  } catch (error) {
    console.error("Erreur lors de la création du contact Resend:", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result) {
          const additionalUserInfo = getAdditionalUserInfo(result);

          if (additionalUserInfo?.isNewUser) {
            await createResendContact(result.user);
          }
        }
      } catch {
      }
    };

    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      const additionalUserInfo = getAdditionalUserInfo(result);

      if (additionalUserInfo?.isNewUser) {
        await createResendContact(result.user);
      }
    } catch {
      await signInWithRedirect(auth, googleProvider);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    const displayName = email.split("@")[0];

    await updateProfile(cred.user, { displayName });

    await cred.user.getIdToken(true);

    await createResendContact({
      ...cred.user,
      displayName,
    } as User);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
