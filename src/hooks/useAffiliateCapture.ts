// Fichier : src/hooks/useAffiliateCapture.ts

/**
 * Hook de gestion de l'affiliation.
 *
 * Flux :
 *  1. Arrivée avec ?ref=CODE → pose le cookie via /api/affiliate/visit
 *     + redirection immédiate vers /sign-up
 *  2. Après authentification (email OU Google) → claim automatique
 *     avec retry en cas d'échec temporaire
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { captureReferral, claimReferral } from "../lib/affiliate-api";

export function useAffiliateCapture() {
  const [, setLocation] = useLocation();
  const capturedRef = useRef(false);
  const claimingRef = useRef(false);

  /* ═══════════════════════════════════════════════════════════
   * 1) CAPTURE DU ?ref= À L'ARRIVÉE
   * ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    console.log("[affiliate] 🎯 Réf détecté :", ref);

    // Nettoyer l'URL immédiatement (le cookie prend le relai)
    params.delete("ref");
    const newSearch = params.toString();
    const newUrl =
      window.location.pathname +
      (newSearch ? `?${newSearch}` : "") +
      window.location.hash;
    window.history.replaceState({}, "", newUrl);

    // Poser le cookie côté serveur (await pour garantir avant redirect)
    (async () => {
      try {
        await captureReferral(ref);
        console.log("[affiliate] ✅ Cookie posé pour :", ref);
      } catch (err) {
        console.error("[affiliate] ❌ Échec pose cookie :", err);
      }
    })();

    // Rediriger immédiatement vers /sign-up si non authentifié
    const currentPath = window.location.pathname;
    const onAuthPage =
      currentPath === "/sign-up" || currentPath === "/sign-in";

    if (!auth.currentUser && !onAuthPage) {
      console.log("[affiliate] ➡️ Redirection vers /sign-up");
      // Léger délai pour que le fetch /visit démarre avant le changement de route
      setTimeout(() => setLocation("/sign-up"), 100);
    }
  }, [setLocation]);

  /* ═══════════════════════════════════════════════════════════
   * 2) CLAIM APRÈS AUTHENTIFICATION
   * ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        claimingRef.current = false;
        return;
      }
      if (claimingRef.current) return;
      claimingRef.current = true;

      console.log("[affiliate] 👤 Utilisateur connecté :", user.email);

      // Laisser le temps au user doc d'exister côté serveur
      await new Promise((r) => setTimeout(r, 800));

      // Retry : jusqu'à 3 tentatives
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        try {
          const result = await claimReferral();
          console.log("[affiliate] ✅ Attribution réussie :", result);
          break;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);

          // Cas terminaux : on arrête les retries
          if (
            msg.includes("already_attributed") ||
            msg.includes("Aucune preuve") ||
            msg.includes("self_referral") ||
            msg.includes("commercial_not_found")
          ) {
            console.log("[affiliate] ⏭️ Claim ignoré :", msg);
            break;
          }

          attempt++;
          if (attempt < maxAttempts) {
            console.warn(
              `[affiliate] ⚠️ Tentative ${attempt}/${maxAttempts} échouée, retry dans ${attempt}s...`,
              msg
            );
            await new Promise((r) => setTimeout(r, 1000 * attempt));
          } else {
            console.error(
              "[affiliate] ❌ Claim définitif échoué après",
              maxAttempts,
              "tentatives :",
              msg
            );
          }
        }
      }

      claimingRef.current = false;
    });

    return () => unsubscribe();
  }, []);
}
