import LegalLayout from "../components/legal-layout";

export default function Cookies() {
  return (
    <LegalLayout title="Politique des cookies">
      <p>
        Cette politique explique ce que sont les cookies et traceurs utilisés sur le site
        Texerra SMS, leur finalité et la manière dont vous pouvez gérer vos préférences. Elle
        est dynamique et reflète les outils réellement présents sur le site.
      </p>

      <h2>1. Catégories de cookies</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 font-semibold text-foreground">Catégorie</th>
            <th className="text-left py-2 pr-4 font-semibold text-foreground">Finalité</th>
            <th className="text-left py-2 font-semibold text-foreground">Traitement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="py-3 pr-4 text-muted-foreground font-medium">Nécessaires</td>
            <td className="py-3 pr-4 text-muted-foreground">Session, authentification, sécurité, fonctions indispensables</td>
            <td className="py-3 text-muted-foreground">Peuvent rester actifs lorsqu'ils sont strictement nécessaires au service.</td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-muted-foreground font-medium">Analytiques</td>
            <td className="py-3 pr-4 text-muted-foreground">Mesure de l'audience et compréhension générale de l'usage</td>
            <td className="py-3 text-muted-foreground">À activer selon le régime de consentement applicable et les choix de l'utilisateur.</td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-muted-foreground font-medium">Marketing / publicité</td>
            <td className="py-3 pr-4 text-muted-foreground">Mesure des campagnes, audiences, personnalisation publicitaire</td>
            <td className="py-3 text-muted-foreground">À n'activer qu'après le consentement lorsque requis.</td>
          </tr>
        </tbody>
      </table>

      <h2>2. Bandeau de consentement</h2>
      <p>
        Lorsque des traceurs non essentiels sont utilisés, un bandeau est affiché avec des choix
        clairement différenciés : <strong>Accepter tout</strong>, <strong>Refuser les cookies
        non essentiels</strong>, <strong>Personnaliser</strong>.
      </p>

      <h2>3. Centre de préférences</h2>
      <p>
        Vous pouvez retrouver un moyen de modifier votre choix à tout moment. Votre choix est
        conservé raisonnablement afin d'éviter une redemande permanente.
      </p>

      <h2>4. Audit technique avant mise en ligne</h2>
      <ul>
        <li>Inspecter <code>index.html</code> et les scripts externes.</li>
        <li>Vérifier les outils de chat/support, analytics, publicité et marketing.</li>
        <li>Vérifier cookies, <code>localStorage</code> et <code>sessionStorage</code> utilisés par les fonctionnalités du site.</li>
        <li>Identifier quels traceurs sont nécessaires au fonctionnement et lesquels sont facultatifs.</li>
        <li>Faire correspondre le bandeau et la politique aux traceurs effectivement utilisés.</li>
      </ul>

      <h2>5. Retargeting</h2>
      <p>
        Si Texerra souhaite utiliser ultérieurement un pixel publicitaire ou un dispositif de
        retargeting, son intégration sera traitée comme un cas marketing distinct et raccordée
        au mécanisme de consentement approprié.
      </p>
    </LegalLayout>
  );
}
