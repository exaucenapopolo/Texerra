import LegalLayout from "../components/legal-layout";

export default function ConditionsVente() {
  return (
    <LegalLayout title="Conditions générales de vente">
      <p>
        Les présentes conditions générales de vente décrivent clairement ce que le client achète
        et ce qui se passe en cas de paiement confirmé, d'échec, de SMS non reçu ou de
        remboursement.
      </p>

      <h2>1. Produits et services</h2>
      <p>
        Numéros virtuels et services numériques permettant la réception de SMS de vérification,
        selon les pays, services et stocks disponibles.
      </p>

      <h2>2. Tarifs</h2>
      <p>
        Le prix applicable est celui affiché au moment de la commande, sous réserve du traitement
        des erreurs manifestes et des règles applicables. Les tarifs peuvent évoluer pour les
        commandes futures.
      </p>

      <h2>3. Recharge du compte</h2>
      <p>
        L'utilisateur ouvre la page de dépôt, choisit un montant, est redirigé vers le prestataire
        de paiement, effectue le paiement, revient sur Texerra et voit son solde crédité lorsque
        le paiement est confirmé. Si la mise à jour n'est pas immédiate, il peut utiliser le
        bouton <strong>« Vérifier le paiement »</strong> de la page de dépôt.
      </p>

      <h2>4. Paiement confirmé mais solde non crédité</h2>
      <p>
        L'utilisateur doit revenir sur la page de dépôt et utiliser le bouton de vérification.
        Le système recherche alors la confirmation et crédite le solde lorsque la transaction
        est effectivement confirmée. En cas de problème persistant, le support peut être contacté
        avec les informations de transaction.
      </p>

      <h2>5. Utilisation du solde</h2>
      <p>
        Le solde est destiné à l'achat des services Texerra. Il ne doit pas être présenté comme
        un compte bancaire ou comme un mécanisme de retrait d'espèces. Le principe de non-retrait
        d'espèces du solde s'applique, sous réserve des obligations légales applicables.
      </p>

      <h2>6. Remboursement sur le solde</h2>
      <p>
        Lorsqu'un remboursement est applicable, le fonctionnement normal de Texerra est le
        recrédit sur le solde du compte. Ce recrédit est utilisable pour d'autres services mais
        ne vaut pas, par lui-même, paiement en espèces.
      </p>

      <h2>7. Commande d'un numéro</h2>
      <p>
        L'utilisateur sélectionne le pays et le service, puis valide la commande selon son solde
        disponible. L'attribution dépend des stocks au moment de la commande.
      </p>

      <h2>8. Durée d'utilisation et accès au compte tiers</h2>
      <p>
        La durée d'utilisation du compte tiers après vérification ne constitue pas une durée de
        validité garantie du numéro par Texerra. Tant que l'utilisateur garde l'accès à son
        compte tiers selon les règles de cette plateforme, il peut continuer à l'utiliser. En
        revanche, une nouvelle vérification peut nécessiter un nouveau numéro et dépend des
        conditions du service tiers.
      </p>

      <h2>9. Délai indicatif</h2>
      <p>
        Le délai moyen est de <strong>2 à 7 minutes</strong>. Dans certains cas, la réception
        peut prendre jusqu'à environ <strong>17 minutes</strong>. Ce délai reste indicatif.
      </p>

      <h2>10. SMS non reçu</h2>
      <p>
        Si le SMS n'est pas reçu dans le délai applicable et que la commande est considérée comme
        échouée par le système, le montant de la commande peut être automatiquement recrédité
        sur le solde.
      </p>

      <h2>11. Aucune garantie de réussite de chaque numéro</h2>
      <p>
        Un numéro virtuel peut échouer avec un service tiers qui limite ou bloque les numéros
        virtuels. Texerra ne contrôle pas les algorithmes de vérification des plateformes tierces
        et ne garantit pas une réussite à 100 % de chaque tentative.
      </p>

      <h2>12. Cas de remboursement / traitement</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 font-semibold text-foreground">Situation</th>
            <th className="text-left py-2 font-semibold text-foreground">Traitement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="py-3 pr-4 text-muted-foreground">Paiement échoué</td>
            <td className="py-3 text-muted-foreground">Pas de recharge définitive tant que le paiement n'est pas confirmé.</td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-muted-foreground">Numéro indisponible</td>
            <td className="py-3 text-muted-foreground">Pas de débit définitif correspondant à un service non fourni.</td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-muted-foreground">SMS non reçu / commande échouée</td>
            <td className="py-3 text-muted-foreground">Recrédit automatique du montant de la commande sur le solde selon les règles du système.</td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-muted-foreground">Commande correctement exécutée</td>
            <td className="py-3 text-muted-foreground">Le service est considéré comme fourni selon les conditions de la commande.</td>
          </tr>
          <tr>
            <td className="py-3 pr-4 text-muted-foreground">Erreur utilisateur</td>
            <td className="py-3 text-muted-foreground">Le client contacte le support lorsque la situation nécessite une intervention ; traitement selon le cas et les règles applicables.</td>
          </tr>
        </tbody>
      </table>

      <h2>13. Plateformes tierces</h2>
      <p>
        WhatsApp, Telegram, Instagram, TikTok et autres plateformes ne sont pas opérées par
        Texerra. Leurs règles, algorithmes, politiques et mécanismes de vérification peuvent
        évoluer indépendamment.
      </p>
    </LegalLayout>
  );
}
