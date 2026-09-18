import LegalLayout from "../components/legal-layout";

const C = {
  ink: "#111827",
  text: "#4B5563",
  muted: "#6B7280",
  border: "#E5E7EB",
  soft: "#F8FAFC",
  blue: "#2563EB",
  blueSoft: "#EFF6FF",
  green: "#15803D",
  greenSoft: "#F0FDF4",
  amber: "#B45309",
  amberSoft: "#FFFBEB",
  red: "#B91C1C",
  redSoft: "#FEF2F2",
};

const card = {
  border: `1px solid ${C.border}`,
  borderRadius: "18px",
  padding: "20px",
  background: "#FFFFFF",
};

function Icon({ type, size = 20 }: { type: string; size?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const body = {
    check: <><path d="M20 6 9 17l-5-5" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 10v6" /><path d="M12 7h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    phone: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M10 6h4" /><path d="M11 18h2" /></>,
    wallet: <><path d="M4 7h16v10H4z" /><path d="M4 7V5h14l2 2" /><path d="M15 12h3" /></>,
    warning: <><path d="m12 4 9 16H3L12 4Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></>,
    ban: <><circle cx="12" cy="12" r="9" /><path d="m5.5 5.5 13 13" /></>,
    refresh: <><path d="M20 11a8 8 0 1 0 2 5" /><path d="M20 4v7h-7" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.7-3.3 3-5 7-5s6.3 1.7 7 5" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l1.3-1.3a5 5 0 0 0-7.1-7.1L10 6" /><path d="M14 11a5 5 0 0 0-7.1-.1l-1.3 1.3a5 5 0 0 0 7.1 7.1l1.3-1.3" /></>,
  } as Record<string, any>;

  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...common}>{body[type]}</svg>;
}

function Callout({ type, title, children }: { type: string; title: string; children: any }) {
  const tone = type === "success"
    ? { bg: C.greenSoft, border: "#BBF7D0", icon: C.green }
    : type === "warning"
      ? { bg: C.amberSoft, border: "#FDE68A", icon: C.amber }
      : type === "danger"
        ? { bg: C.redSoft, border: "#FECACA", icon: C.red }
        : { bg: C.blueSoft, border: "#BFDBFE", icon: C.blue };

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 18, margin: "22px 0", borderRadius: 16, border: `1px solid ${tone.border}`, background: tone.bg }}>
      <div style={{ color: tone.icon, marginTop: 2 }}><Icon type={type === "success" ? "check" : type === "warning" || type === "danger" ? "warning" : "info"} /></div>
      <div>
        <strong style={{ display: "block", color: C.ink, marginBottom: 6, fontSize: 15 }}>{title}</strong>
        <div style={{ color: C.text, fontSize: 14, lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

function MiniCard({ icon, title, children, tone = "neutral" }: { icon: string; title: string; children: any; tone?: string }) {
  const t = tone === "blue"
    ? { bg: C.blueSoft, border: "#DBEAFE", icon: C.blue }
    : tone === "green"
      ? { bg: C.greenSoft, border: "#DCFCE7", icon: C.green }
      : tone === "amber"
        ? { bg: C.amberSoft, border: "#FEF3C7", icon: C.amber }
        : { bg: "#FFFFFF", border: C.border, icon: C.ink };

  return (
    <div style={{ ...card, background: t.bg, borderColor: t.border, minHeight: "100%" }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", color: t.icon, background: "#FFFFFF", border: `1px solid ${t.border}`, marginBottom: 12 }}>
        <Icon type={icon} size={19} />
      </div>
      <strong style={{ display: "block", color: C.ink, marginBottom: 6 }}>{title}</strong>
      <div style={{ color: C.text, fontSize: 14, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: any }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", background: C.ink, color: "#FFFFFF", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{number}</div>
      <div>
        <strong style={{ display: "block", color: C.ink, marginBottom: 4 }}>{title}</strong>
        <div style={{ color: C.text, fontSize: 14, lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

export default function ConditionsUtilisation() {
  return (
    <LegalLayout title="Conditions d'utilisation">
      <div style={{ padding: 22, borderRadius: 20, background: `linear-gradient(135deg, ${C.soft}, #FFFFFF)`, border: `1px solid ${C.border}`, marginBottom: 28 }}>
        <div style={{ display: "flex", gap: 18, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ maxWidth: 780 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.blue, fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
              <Icon type="shield" size={15} /> Document contractuel
            </div>
            <p style={{ margin: 0, color: C.text, fontSize: 15, lineHeight: 1.75 }}>
              Les présentes conditions encadrent l'accès au site Texerra SMS, la création d'un compte et l'utilisation des services proposés. Elles expliquent notamment le fonctionnement des numéros virtuels, les délais de réception des SMS, les dépendances aux fournisseurs et les règles que l'utilisateur doit respecter.
            </p>
          </div>
          <div style={{ padding: "12px 14px", borderRadius: 14, background: "#FFFFFF", border: `1px solid ${C.border}`, minWidth: 190 }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 3 }}>Dernière mise à jour</div>
            <strong style={{ color: C.ink, fontSize: 14 }}>18 septembre 2026</strong>
          </div>
        </div>
      </div>

      <Callout type="success" title="En utilisant Texerra, vous acceptez ces conditions.">
        En accédant au site, en créant un compte, en vous connectant ou en utilisant un service Texerra, vous reconnaissez avoir pris connaissance des présentes Conditions d'utilisation et vous acceptez de les respecter. Lorsque le parcours du site prévoit une case d'acceptation, cette case complète cette acceptation. Cette règle s'applique sous réserve des droits et obligations qui ne peuvent légalement être écartés.
      </Callout>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, margin: "24px 0 34px" }}>
        <MiniCard icon="clock" title="2 à 7 minutes" tone="blue">C'est le délai moyen indiqué pour la réception d'un SMS dans la plupart des cas.</MiniCard>
        <MiniCard icon="warning" title="Jusqu'à environ 17 minutes" tone="amber">Certaines commandes peuvent prendre plus de temps avant d'être considérées comme échouées.</MiniCard>
        <MiniCard icon="refresh" title="Recrédit en cas d'échec" tone="green">Lorsqu'une commande échoue selon les règles du système, le montant concerné peut être recrédité sur le solde.</MiniCard>
      </div>

      <h2>1. Objet et champ d'application</h2>
      <p>Texerra SMS est une plateforme de services numériques proposant notamment des numéros virtuels destinés à permettre, selon les disponibilités et les services compatibles, la réception de SMS de vérification ou de validation. Les présentes Conditions d'utilisation s'appliquent au site <strong>https://www.texerra.site/</strong>, à l'espace utilisateur et aux fonctionnalités associées.</p>
      <p>Elles complètent, pour les opérations commerciales, les <a href="/conditions-vente">Conditions générales de vente</a>, ainsi que la <a href="/confidentialite">Politique de confidentialité</a>, la <a href="/cookies">Politique des cookies</a> et la <a href="/utilisation-acceptable">Politique d'utilisation acceptable</a>.</p>

      <h2>2. Définitions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, margin: "18px 0 24px" }}>
        <MiniCard icon="phone" title="Numéro virtuel">Numéro attribué dans le cadre d'une commande et destiné à recevoir, lorsque le service tiers l'accepte, le ou les SMS prévus.</MiniCard>
        <MiniCard icon="user" title="Utilisateur">Toute personne qui visite le site, crée un compte, se connecte ou utilise un service Texerra.</MiniCard>
        <MiniCard icon="link" title="Service tiers">Plateforme externe avec laquelle l'utilisateur souhaite utiliser un numéro, par exemple WhatsApp, Instagram, Telegram, TikTok ou un autre service compatible.</MiniCard>
      </div>

      <h2>3. Acceptation et obligation de lecture</h2>
      <p>L'utilisateur doit lire les présentes conditions avant d'utiliser les services. Les informations essentielles affichées sur une page de commande, notamment le pays, le service, le prix, le délai indicatif, les éventuelles limitations et le fonctionnement de l'échec, font partie de l'information mise à disposition de l'utilisateur au moment de l'utilisation.</p>
      <p>En poursuivant l'utilisation après la publication d'une nouvelle version des conditions, l'utilisateur reconnaît la version alors en vigueur, dans les limites prévues par le droit applicable. Lorsque la modification est substantielle, Texerra peut utiliser des moyens raisonnables pour en informer les utilisateurs concernés.</p>

      <h2>4. Création, sécurité et gestion du compte</h2>
      <p>Lorsque la création d'un compte est nécessaire, l'utilisateur s'engage à fournir des informations exactes et à jour et à ne pas utiliser volontairement des informations destinées à tromper Texerra ou à contourner ses mécanismes de sécurité.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, margin: "18px 0 24px" }}>
        <MiniCard icon="shield" title="Protéger ses identifiants">Les identifiants doivent rester confidentiels. Une activité inhabituelle ou un compte compromis doit être signalé dès que possible.</MiniCard>
        <MiniCard icon="user" title="Un compte à son utilisateur">L'utilisateur ne doit pas utiliser le compte d'une autre personne sans autorisation ni permettre une utilisation abusive de son propre compte.</MiniCard>
        <MiniCard icon="warning" title="Sécurité">Texerra peut prendre des mesures de protection lorsqu'une activité présente un risque pour un compte, une transaction ou la plateforme.</MiniCard>
      </div>

      <h2>5. Services proposés et évolution de l'offre</h2>
      <p>Les services disponibles peuvent évoluer selon les pays, les stocks, les fournisseurs, les services tiers compatibles et les contraintes techniques. Texerra peut ajouter, modifier, suspendre ou retirer certaines options lorsque cela est nécessaire au fonctionnement de la plateforme ou à la disponibilité du service.</p>
      <p>Une fonctionnalité affichée aujourd'hui ne constitue donc pas une promesse qu'elle restera disponible indéfiniment dans les mêmes conditions. Les informations affichées au moment de l'utilisation ou de la commande font foi pour cette opération, sous réserve des règles applicables.</p>

      <h2>6. Fournisseurs, opérateurs et dépendances externes</h2>
      <p>Texerra dépend de plusieurs fournisseurs et infrastructures pour fournir ses services. Cela peut notamment concerner les fournisseurs de numéros, les opérateurs télécoms, l'authentification, les paiements, l'infrastructure technique ou des services tiers utilisés pour la vérification.</p>
      <p>Une panne, une surcharge, une modification de politique, une limitation technique ou une décision prise par l'un de ces acteurs peut affecter la disponibilité d'un numéro ou la réception du SMS. Texerra met en œuvre les moyens raisonnables dont elle dispose pour maintenir son service, mais ne contrôle pas l'ensemble de ces systèmes externes.</p>

      <h2>7. Stocks et disponibilité des numéros</h2>
      <p>Les numéros disponibles dépendent des stocks réellement fournis à Texerra. Un stock peut être disponible, puis être épuisé en raison des commandes ou du renouvellement des stocks chez un partenaire.</p>
      <Callout type="info" title="Un stock peut revenir après réapprovisionnement.">Lorsqu'un stock est épuisé, il peut être réapprovisionné rapidement, mais aucun délai fixe de réapprovisionnement ne doit être considéré comme garanti. La disponibilité affichée correspond à l'état du stock au moment où elle est consultée.</Callout>

      <h2>8. Comment fonctionne une commande ?</h2>
      <div style={{ ...card, margin: "18px 0 24px" }}>
        <div style={{ display: "grid", gap: 20 }}>
          <Step number="1" title="Choisir">L'utilisateur sélectionne le pays et le service disponibles sur Texerra.</Step>
          <Step number="2" title="Commander">La commande est validée lorsque les conditions affichées sont remplies et que le solde permet l'opération.</Step>
          <Step number="3" title="Recevoir le numéro">Un numéro disponible est attribué selon le stock et le système de commande.</Step>
          <Step number="4" title="Utiliser le numéro">L'utilisateur saisit le numéro auprès du service tiers sélectionné.</Step>
          <Step number="5" title="Attendre le SMS">Si le service tiers accepte le numéro et envoie le SMS, le code peut apparaître dans l'interface prévue par Texerra.</Step>
        </div>
      </div>

      <h2>9. Délai de réception des SMS</h2>
      <p>Le délai moyen de réception est généralement compris entre <strong>2 et 7 minutes</strong>. Dans certains cas, la réception peut prendre davantage de temps et atteindre environ <strong>17 minutes</strong>.</p>
      <p>Ces délais sont indicatifs et ne constituent pas une garantie de livraison à une seconde ou à une minute précise. Le délai réel peut dépendre du fournisseur du numéro, du pays, de l'opérateur, du service tiers, de ses contrôles de sécurité, de la charge du réseau et d'autres facteurs techniques.</p>

      <h2>10. Aucune garantie de livraison à 100 %</h2>
      <Callout type="warning" title="Un numéro acheté n'implique pas une réussite garantie de la vérification.">Texerra ne garantit pas que chaque numéro recevra systématiquement le SMS attendu. Certains services tiers peuvent bloquer, filtrer, limiter ou refuser les numéros virtuels pour des raisons techniques, de sécurité, de détection automatisée ou de politique interne.</Callout>
      <p>Une tentative peut donc échouer alors qu'une autre tentative utilisant un autre numéro ou un autre stock peut réussir. Ce fonctionnement est lié au fait que la réception d'un SMS dépend de plusieurs systèmes que Texerra ne contrôle pas entièrement.</p>

      <h2>11. Conseils affichés lors de l'utilisation</h2>
      <p>Texerra peut afficher dans l'application des conseils pratiques destinés à améliorer les chances de réception d'un SMS. Ils sont fournis à titre informatif et ne constituent jamais une garantie de réussite.</p>
      <div style={{ ...card, margin: "18px 0 24px", background: C.soft }}>
        <strong style={{ display: "block", color: C.ink, marginBottom: 10 }}>Exemples de bonnes pratiques</strong>
        <ul style={{ margin: 0, paddingLeft: 20, color: C.text, lineHeight: 1.8 }}>
          <li>Vérifier que le numéro saisi est exactement celui fourni par Texerra.</li>
          <li>Éviter de multiplier inutilement les demandes de code si le service tiers impose des limites.</li>
          <li>Essayer un autre numéro lorsque la commande précédente a échoué et qu'une nouvelle disponibilité existe.</li>
          <li>Choisir, lorsque cela est pertinent, un autre pays ou une autre disponibilité proposée.</li>
        </ul>
        <p style={{ margin: "12px 0 0", paddingTop: 12, borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
          Ces recommandations ne permettent pas de contourner légitimement les règles d'un service tiers et ne constituent pas une méthode garantie pour obtenir un SMS.
        </p>
      </div>

      <h2>12. Échec d'une commande et recrédit</h2>
      <p>Lorsqu'une commande est considérée comme échouée par le système et que le SMS n'a pas été reçu dans le délai applicable, le montant correspondant peut être automatiquement recrédité sur le solde du compte.</p>
      <Callout type="success" title="Le recrédit est normalement automatique.">L'utilisateur n'a normalement pas besoin de contacter le support uniquement pour demander le recrédit d'une commande déjà identifiée comme échouée. En cas d'anomalie, il peut contacter le support avec la référence de la commande et les informations utiles.</Callout>

      <h2>13. Comptes créés auprès de services tiers</h2>
      <p>Texerra fournit le service lié au numéro et à la réception du SMS. Texerra ne crée pas, ne possède pas et ne contrôle pas les comptes que l'utilisateur ouvre ensuite sur WhatsApp, Instagram, Telegram, TikTok ou une autre plateforme.</p>
      <div style={{ ...card, margin: "18px 0 24px", background: C.soft }}>
        <strong style={{ display: "block", color: C.ink, marginBottom: 8 }}>Exemple : vérification d'un compte WhatsApp</strong>
        <p style={{ margin: 0, color: C.text, lineHeight: 1.75, fontSize: 14 }}>
          Vous commandez un numéro Texerra, recevez un code et utilisez ce code pour vérifier votre compte WhatsApp. À partir de cette étape, l'accès à votre compte WhatsApp dépend de WhatsApp et de la manière dont vous gérez votre compte. Si une nouvelle vérification est demandée, si vous perdez l'accès au compte, si vous vous déconnectez ou si WhatsApp applique une restriction, Texerra ne garantit pas que le même numéro sera de nouveau disponible ou accepté pour récupérer ou vérifier ce compte.
        </p>
      </div>
      <p>La durée pendant laquelle vous conservez l'accès à un compte tiers dépend donc principalement de vous et de la plateforme concernée, notamment de la sécurité du compte, du respect des règles du service tiers et des éventuelles nouvelles vérifications demandées.</p>

      <h2>14. Utilisation conforme et responsabilité de l'utilisateur</h2>
      <p>L'utilisateur doit utiliser Texerra de manière légale, responsable et conforme aux présentes conditions ainsi qu'aux règles des services tiers qu'il utilise. Il est responsable des conséquences de sa propre utilisation lorsqu'elles résultent de son comportement, de ses choix ou d'une violation des règles qui lui sont applicables.</p>
      <p>Dans la mesure permise par le droit applicable, Texerra n'est pas responsable d'un préjudice qui résulte exclusivement d'un mauvais usage du service par l'utilisateur. Cette règle ne limite pas une responsabilité qui ne pourrait légalement être exclue ou limitée.</p>

      <h2>15. Utilisations interdites</h2>
      <div style={{ ...card, margin: "18px 0 24px", borderColor: "#FECACA", background: C.redSoft }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}><span style={{ color: C.red }}><Icon type="ban" /></span><strong style={{ color: C.ink }}>Exemples d'utilisations interdites</strong></div>
        <ul style={{ margin: 0, paddingLeft: 20, color: C.text, lineHeight: 1.8 }}>
          <li>Fraude, escroquerie ou tromperie.</li>
          <li>Usurpation d'identité ou création d'un dispositif destiné à tromper un tiers.</li>
          <li>Phishing, spam abusif ou campagnes malveillantes.</li>
          <li>Accès non autorisé à un système ou tentative de compromission technique.</li>
          <li>Utilisation visant volontairement à causer un dommage à un utilisateur, à un fournisseur ou à Texerra.</li>
          <li>Activité contraire aux lois et réglementations applicables.</li>
          <li>Contournement malveillant des mécanismes de sécurité ou restrictions d'une plateforme tierce.</li>
        </ul>
      </div>
      <p>Cette liste n'est pas exhaustive : une utilisation peut être interdite même si elle n'est pas citée mot pour mot ici lorsqu'elle est contraire à la loi, aux présentes conditions ou aux règles applicables du service concerné.</p>

      <h2>16. Paiements, solde et remboursements</h2>
      <p>Les règles détaillées des dépôts, paiements, commandes et remboursements figurent dans les <a href="/conditions-vente">Conditions générales de vente</a>.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, margin: "18px 0 24px" }}>
        <MiniCard icon="wallet" title="Solde Texerra">Le solde est destiné à acheter les services disponibles sur la plateforme. Il n'est pas présenté comme un compte bancaire ou comme un service de retrait d'espèces.</MiniCard>
        <MiniCard icon="refresh" title="Remboursement sur solde">Lorsqu'un remboursement est applicable, le fonctionnement normal de Texerra est le recrédit du montant sur le solde selon les règles prévues.</MiniCard>
        <MiniCard icon="info" title="Paiement non crédité">Si une recharge confirmée n'apparaît pas immédiatement, l'utilisateur peut utiliser le bouton « Vérifier le paiement » prévu sur la page de dépôt.</MiniCard>
      </div>

      <h2>17. Disponibilité, maintenance et incidents</h2>
      <p>Texerra s'efforce de maintenir le site et ses fonctionnalités accessibles. Des opérations de maintenance, des mises à jour, des incidents techniques, des perturbations de réseau ou des difficultés chez des fournisseurs externes peuvent toutefois affecter tout ou partie du service.</p>
      <p>Texerra peut suspendre temporairement une fonctionnalité lorsqu'une telle mesure est nécessaire pour la sécurité, la maintenance, la mise à jour ou la protection de ses utilisateurs et fournisseurs.</p>

      <h2>18. Limitation de responsabilité</h2>
      <p>Texerra met en œuvre des moyens raisonnables pour faire fonctionner la plateforme conformément à sa conception. Toutefois, certaines conséquences dépendent de systèmes externes : décisions d'une plateforme tierce, évolution de ses algorithmes ou politiques, refus de numéros virtuels, panne d'un fournisseur, rupture de stock ou perturbation d'un réseau.</p>
      <p>Dans la mesure permise par la réglementation applicable, Texerra ne saurait être tenue responsable d'un événement ou d'un service qu'elle ne contrôle pas directement. Cette limitation ne s'applique pas lorsqu'une responsabilité ne peut légalement être exclue ou limitée.</p>

      <h2>19. Propriété intellectuelle</h2>
      <p>Sauf mention contraire ou droits appartenant à des tiers, les éléments originaux de Texerra SMS, notamment certains textes, éléments graphiques, présentation, logo, interface et composants créés pour la plateforme, sont destinés à rester utilisés dans le cadre de Texerra.</p>
      <p>Les marques, noms, logos et contenus appartenant aux plateformes tierces restent la propriété de leurs titulaires respectifs. Leur présence sur Texerra n'implique aucune affiliation ou autorisation de la part de ces services.</p>

      <h2>20. Sécurité et mesures de protection</h2>
      <p>Texerra peut mettre en œuvre des mesures techniques et organisationnelles destinées à protéger les comptes, les transactions, les données et l'infrastructure. Lorsqu'une activité paraît anormale ou présente un risque de sécurité, des vérifications ou restrictions temporaires peuvent être appliquées.</p>

      <h2>21. Suspension, restriction ou fermeture du compte</h2>
      <p>Un compte peut être suspendu, limité ou fermé lorsque cela est nécessaire pour la sécurité, la conformité ou le bon fonctionnement du service, dans les conditions permises par le droit applicable.</p>
      <div style={{ ...card, margin: "18px 0 24px" }}>
        <strong style={{ display: "block", color: C.ink, marginBottom: 12 }}>Des mesures peuvent notamment être envisagées en cas de :</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          {["fraude ou tentative de fraude", "paiement frauduleux", "utilisation abusive", "atteinte à la sécurité", "activité illégale", "violation des conditions"].map((item) => (
            <div key={item} style={{ display: "flex", gap: 8, color: C.text, fontSize: 14, lineHeight: 1.55 }}><span style={{ color: C.blue }}><Icon type="check" size={16} /></span><span>{item}</span></div>
          ))}
        </div>
      </div>

      <h2>22. Support et réclamations</h2>
      <p>En cas de problème concernant une commande ou un compte, l'utilisateur peut contacter Texerra via les coordonnées publiées sur le site. Pour faciliter le traitement, il est recommandé d'indiquer la référence de commande, la date, le service concerné, le numéro concerné lorsqu'il est nécessaire de l'identifier et une description claire du problème.</p>
      <div style={{ ...card, margin: "18px 0 24px", background: C.soft }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          <div><div style={{ color: C.muted, fontSize: 12 }}>Email principal</div><a href="mailto:contact@texerra.site" style={{ fontWeight: 700 }}>contact@texerra.site</a></div>
          <div><div style={{ color: C.muted, fontSize: 12 }}>Email secondaire</div><a href="mailto:texerra.sms@gmail.com" style={{ fontWeight: 700 }}>texerra.sms@gmail.com</a></div>
          <div><div style={{ color: C.muted, fontSize: 12 }}>Téléphone</div><a href="tel:+12424542961" style={{ fontWeight: 700 }}>+1 (242) 454-2961</a></div>
          <div><div style={{ color: C.muted, fontSize: 12 }}>Telegram</div><a href="https://t.me/texerra.sms" target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>@texerra.sms</a></div>
        </div>
      </div>

      <h2>23. Données personnelles et cookies</h2>
      <p>L'utilisation de Texerra peut impliquer le traitement de données nécessaires au compte, à la sécurité, aux commandes, au paiement, au support et au fonctionnement technique. Les détails sont présentés dans la <a href="/confidentialite">Politique de confidentialité</a>.</p>
      <p>Les informations relatives aux cookies et technologies similaires sont présentées dans la <a href="/cookies">Politique des cookies</a>.</p>

      <h2>24. Modifications du service</h2>
      <p>Texerra peut faire évoluer son interface, ses fonctionnalités, ses fournisseurs, les pays disponibles, les produits proposés ou les méthodes techniques nécessaires au fonctionnement de la plateforme. Une modification d'un fournisseur ou d'une fonctionnalité peut entraîner une indisponibilité temporaire ou définitive d'une option.</p>

      <h2>25. Modification des présentes conditions</h2>
      <p>Texerra peut mettre à jour les présentes conditions pour refléter l'évolution de ses services, de ses pratiques ou du cadre réglementaire applicable. La nouvelle version est publiée sur cette page avec sa date de mise à jour.</p>
      <Callout type="info" title="Consultez toujours la version en vigueur.">La date affichée en tête de page permet d'identifier la version publiée. Lorsque cela est approprié, Texerra peut également informer les utilisateurs par email, dans l'application ou par tout autre moyen raisonnable.</Callout>

      <h2>26. Fin d'utilisation et suppression du compte</h2>
      <p>L'utilisateur peut cesser d'utiliser Texerra à tout moment. Lorsqu'une fonctionnalité de suppression du compte est disponible, elle doit être utilisée conformément aux instructions affichées par la plateforme. La suppression d'un compte n'entraîne pas nécessairement la destruction immédiate de toutes les données lorsque certaines informations doivent être conservées pendant la durée nécessaire pour respecter des obligations légales, assurer la sécurité ou traiter un litige.</p>

      <h2>27. Règlement amiable des difficultés</h2>
      <p>Texerra encourage l'utilisateur à contacter d'abord le support afin de rechercher une solution amiable. À défaut de résolution, les difficultés et litiges sont traités conformément au droit applicable et par les autorités ou juridictions compétentes, sans préjudice des règles impératives susceptibles de protéger l'utilisateur.</p>

      <h2>28. Documents associés</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, margin: "18px 0 28px" }}>
        <a href="/conditions-vente" style={{ ...card, display: "block", textDecoration: "none" }}><strong style={{ display: "block", color: C.ink, marginBottom: 5 }}>Conditions générales de vente</strong><span style={{ color: C.text, fontSize: 14 }}>Dépôts, solde, commandes, paiements et remboursements.</span></a>
        <a href="/confidentialite" style={{ ...card, display: "block", textDecoration: "none" }}><strong style={{ display: "block", color: C.ink, marginBottom: 5 }}>Politique de confidentialité</strong><span style={{ color: C.text, fontSize: 14 }}>Données collectées, finalités, sécurité et droits.</span></a>
        <a href="/cookies" style={{ ...card, display: "block", textDecoration: "none" }}><strong style={{ display: "block", color: C.ink, marginBottom: 5 }}>Politique des cookies</strong><span style={{ color: C.text, fontSize: 14 }}>Cookies nécessaires, analytiques et marketing.</span></a>
        <a href="/utilisation-acceptable" style={{ ...card, display: "block", textDecoration: "none" }}><strong style={{ display: "block", color: C.ink, marginBottom: 5 }}>Utilisation acceptable</strong><span style={{ color: C.text, fontSize: 14 }}>Usages interdits, sécurité et mesures en cas d'abus.</span></a>
      </div>

      <div style={{ marginTop: 30, padding: 20, borderRadius: 18, background: C.ink, color: "#FFFFFF" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", background: "rgba(255,255,255,.10)", flexShrink: 0 }}><Icon type="info" /></div>
          <div>
            <strong style={{ display: "block", marginBottom: 7 }}>À retenir avant d'utiliser un numéro Texerra</strong>
            <p style={{ margin: 0, color: "rgba(255,255,255,.82)", fontSize: 14, lineHeight: 1.7 }}>
              Texerra fournit un service numérique dont une partie dépend de fournisseurs et de plateformes externes. La disponibilité d'un numéro et la réussite d'une vérification peuvent donc varier. Les présentes conditions ont précisément pour objectif de présenter ces limites de manière transparente, et l'utilisation d'un numéro ne constitue pas une garantie que le service tiers acceptera ce numéro ou maintiendra durablement le compte créé.
            </p>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 24, color: C.muted, fontSize: 12, lineHeight: 1.6, textAlign: "center" }}>
        Texerra SMS — Conditions d'utilisation — Dernière mise à jour : 18 septembre 2026
      </p>
    </LegalLayout>
  );
}
