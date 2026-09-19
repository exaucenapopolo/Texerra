// Fichier : src/hooks/useAffiliateCapture.ts

/**
 * Hook à placer dans le composant racine (App.tsx).
 * - Capture le paramètre ?ref= à l'arrivée
 * - Pose le cookie via /api/affiliate/visit
 * - Déclenche le claim après authentification
 */

import { useEffect, useRef } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { captureReferral, claimReferral } from "../lib/affiliate-api";

export function useAffiliateCapture() {
  const capturedRef = useRef(false);
  const claimedRef = useRef(false);

  // 1) Capture du ?ref= au premier chargement
  useEffect(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    // Nettoyer l'URL immédiatement pour ne pas garder le ref visible
    params.delete("ref");
    const newSearch = params.toString();
    const newUrl =
      window.location.pathname +
      (newSearch ? `?${newSearch}` : "") +
      window.location.hash;
    window.history.replaceState({}, "", newUrl);

    // Poser le cookie côté serveur
    captureReferral(ref).catch((err) => {
      console.warn("[affiliate] capture failed:", err);
    });
  }, []);

  // 2) Claim après authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        claimedRef.current = false;
        return;
      }
      if (claimedRef.current) return;
      claimedRef.current = true;

      try {
        await claimReferral();
      } catch (err) {
        // Silencieux : si pas de cookie, rien ne se passe
        console.debug("[affiliate] claim skipped:", err);
      }
    });

    return () => unsubscribe();
  }, []);
}
