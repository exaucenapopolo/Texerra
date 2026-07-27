import { useMeta } from "../lib/use-meta";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  useMeta({
    title: "Page introuvable — Texerra",
    description: "Cette page n'existe pas. Retournez sur Texerra pour acheter vos numéros virtuels SMS.",
    canonical: "https://texerra.site/",
    noindex: true,
  });

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-8xl font-extrabold gradient-text mb-4">404</div>
      <h1 className="text-2xl font-bold mb-3 text-foreground">Page introuvable</h1>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
      </Link>
    </div>
  );
}
