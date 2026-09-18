import LegalLayout from "../components/legal-layout";

export default function UtilisationAcceptable() {
  return (
    <LegalLayout title="Politique d'utilisation acceptable">
      <p>
        Cette politique fixe des limites claires à l'utilisation des services Texerra SMS.
        Elle est particulièrement pertinente pour les numéros virtuels et les SMS de vérification,
        qui peuvent faire l'objet d'abus. Elle ne constitue en aucun cas un tutoriel de
        contournement.
      </p>

      <h2>1. Usages interdits</h2>
      <ul>
        <li>Fraude, escroquerie ou usurpation d'identité.</li>
        <li>Phishing, spam abusif ou harcèlement.</li>
        <li>Accès non autorisé à un système ou à des données.</li>
        <li>Compromission ou perturbation d'infrastructures.</li>
        <li>Tentative de contourner malicieusement des mesures de sécurité ou limitations.</li>
        <li>Utilisation pour des activités illégales.</li>
        <li>Toute utilisation mettant en danger d'autres utilisateurs, Texerra ou ses fournisseurs.</li>
      </ul>

      <h2>2. Respect des plateformes tierces</h2>
      <p>
        L'utilisateur doit respecter les conditions et politiques des services sur lesquels il
        utilise un numéro Texerra. Le fait qu'un numéro soit disponible dans Texerra ne constitue
        pas une garantie que la plateforme tierce l'acceptera.
      </p>

      <h2>3. Mesures de sécurité</h2>
      <p>
        En cas d'abus, Texerra peut prendre des mesures proportionnées et conformes aux règles
        applicables : limitation, suspension, fermeture du compte, blocage technique et, lorsque
        la loi l'impose, coopération avec les autorités compétentes.
      </p>
    </LegalLayout>
  );
}
