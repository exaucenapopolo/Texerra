import LegalLayout from "../components/legal-layout";

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p>
        La présente politique décrit les données personnelles collectées par Texerra SMS, les
        finalités de leur traitement et les droits des personnes concernées. Elle est alignée
        sur la loi camerounaise n° 2024/017 du 23 décembre 2024 relative à la protection des
        données à caractère personnel.
      </p>

      <h2>1. Catégories de données collectées</h2>
      <ul>
        <li><strong>Informations de compte :</strong> prénom, nom lorsqu'il est demandé, email, téléphone lorsqu'il est demandé.</li>
        <li><strong>Authentification :</strong> informations nécessaires à la connexion, y compris celles liées à un fournisseur externe comme Google si cette option est active.</li>
        <li><strong>Informations techniques :</strong> adresse IP, navigateur, appareil, système d'exploitation, dates/heures d'interaction et données de sécurité.</li>
        <li><strong>Commandes :</strong> historique, pays, service, statut, montant et informations techniques liées à la commande.</li>
        <li><strong>Solde et transactions :</strong> crédits, débits, remboursements et références techniques des transactions.</li>
        <li><strong>Support :</strong> messages, coordonnées et pièces jointes communiquées volontairement lorsque nécessaires au traitement.</li>
      </ul>

      <h2>2. Finalités du traitement</h2>
      <ul>
        <li>Créer et gérer les comptes.</li>
        <li>Authentifier les utilisateurs.</li>
        <li>Exécuter les commandes et gérer le solde.</li>
        <li>Vérifier les paiements et gérer les remboursements.</li>
        <li>Assurer la sécurité et prévenir les fraudes.</li>
        <li>Traiter les demandes de support.</li>
        <li>Comprendre l'utilisation générale de la plateforme et améliorer Texerra.</li>
        <li>Maintenir les performances, la fiabilité et la disponibilité du service.</li>
        <li>Envoyer les communications nécessaires au fonctionnement du compte.</li>
      </ul>

      <h2>3. Paiements</h2>
      <p>
        Les données de paiement sont traitées par notre prestataire de paiement. Texerra n'accède
        qu'aux informations nécessaires à la confirmation de la transaction (statut, montant,
        référence). Nous ne stockons pas de données bancaires sensibles sur nos serveurs.
      </p>

      <h2>4. Fournisseurs et sous-traitants</h2>
      <p>
        Texerra fait appel à des prestataires pour l'hébergement, l'authentification, le paiement,
        les emails transactionnels, la sécurité et l'analyse. La liste exacte de ces prestataires
        et les pays dans lesquels les données peuvent être transférées sont en cours de
        finalisation et seront publiés dès que l'inventaire technique sera complété.
      </p>

      <h2>5. Conservation et sécurité</h2>
      <p>
        Les données sont conservées pendant la durée nécessaire à leurs finalités, à la sécurité
        du service, au suivi des demandes et aux obligations légales applicables. Des mesures
        raisonnables de sécurité technique et organisationnelle sont mises en œuvre pour protéger
        les données. Aucune promesse de sécurité absolue ne peut toutefois être garantie.
      </p>

      <h2>6. Droits des personnes concernées</h2>
      <p>
        Conformément au droit applicable, vous disposez de droits d'accès, de rectification, de
        suppression et d'opposition lorsque ces droits sont applicables. Pour exercer ces droits,
        contactez-nous à <a href="mailto:contact@texerra.site">contact@texerra.site</a>.
      </p>

      <h2>7. Transferts et prestataires internationaux</h2>
      <p>
        Certains prestataires peuvent être situés en dehors du Cameroun. Les transferts de
        données vers ces prestataires sont encadrés par des garanties appropriées. Cette section
        sera complétée à partir de l'architecture technique réelle avant publication finale.
      </p>
    </LegalLayout>
  );
}
