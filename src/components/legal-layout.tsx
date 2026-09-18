import { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

interface LegalLayoutProps {
  title: string;
  lastUpdate?: string;
  children: ReactNode;
}

export default function LegalLayout({ title, lastUpdate = "18 septembre 2026", children }: LegalLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Dernière mise à jour : {lastUpdate}
        </p>

        <div className="prose prose-sm sm:prose-base max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground">
          {children}
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground mb-4">Documents associés</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/mentions-legales" className="text-sm text-primary hover:underline">Mentions légales</Link>
            <Link href="/conditions-utilisation" className="text-sm text-primary hover:underline">Conditions d'utilisation</Link>
            <Link href="/conditions-vente" className="text-sm text-primary hover:underline">CGV</Link>
            <Link href="/confidentialite" className="text-sm text-primary hover:underline">Confidentialité</Link>
            <Link href="/cookies" className="text-sm text-primary hover:underline">Cookies</Link>
            <Link href="/utilisation-acceptable" className="text-sm text-primary hover:underline">Utilisation acceptable</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
