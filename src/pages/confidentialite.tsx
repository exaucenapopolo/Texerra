import LegalLayout from "../components/legal-layout";

const sectionCard = {
  border: "1px solid #E5E7EB",
  borderRadius: "18px",
  padding: "20px",
  background: "#FFFFFF",
  margin: "18px 0",
};

const softCard = {
  border: "1px solid #DBEAFE",
  borderRadius: "18px",
  padding: "20px",
  background: "#F8FBFF",
  margin: "18px 0",
};

const greenCard = {
  border: "1px solid #BBF7D0",
  borderRadius: "18px",
  padding: "20px",
  background: "#F6FFF8",
  margin: "18px 0",
};

const warningCard = {
  border: "1px solid #FDE68A",
  borderRadius: "18px",
  padding: "20px",
  background: "#FFFCF2",
  margin: "18px 0",
};

const iconBox = {
  width: "38px",
  height: "38px",
  borderRadius: "12px",
  display: "grid",
  placeItems: "center",
  background: "#EFF6FF",
  color: "#2563EB",
  flexShrink: 0,
};

function SvgIcon({
  type,
  size = 20,
}: {
  type: "shield" | "info" | "lock" | "mail" | "user" | "database" | "globe" | "trash" | "arrow";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (type === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (type === "lock") {
    return (
      <svg {...common}>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        <path d="M12 14v2" />
      </svg>
    );
  }

  if (type === "mail") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  if (type === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" />
      </svg>
    );
  }

  if (type === "database") {
    return (
      <svg {...common}>
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
        <path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
      </svg>
    );
  }

  if (type === "globe") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c3 2.8 3 15.2 0 18" />
        <path d="M12 3c-3 2.8-3 15.2 0 18" />
      </svg>
    );
  }

  if (type === "trash") {
    return (
      <svg {...common}>
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3" />
        <path d="M7 7l1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </svg>
    );
  }

  if (type === "arrow") {
    return (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: "shield" | "info" | "lock" | "mail" | "user" | "database" | "globe" | "trash";
  title: string;
  children: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: "16px",
        padding: "18px",
        background: "#FFFFFF",
      }}
    >
      <div style={iconBox}>
        <SvgIcon type={icon} size={19} />
      </div>

      <strong
        style={{
          display: "block",
          color: "#111827",
          margin: "12px 0 6px",
          fontSize: "14px",
        }}
      >
        {title}
      </strong>

      <div
        style={{
          color: "#4B5563",
          fontSize: "13px",
          lineHeight: 1.7,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function BackButton() {
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        border: "1px solid #E5E7EB",
        background: "#FFFFFF",
        color: "#374151",
        padding: "9px 13px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        marginBottom: "22px",
      }}
      aria-label="Retourner à la page précédente"
    >
      <SvgIcon type="arrow" size={16} />
      Retour
    </button>
  );
}

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <BackButton />

      <div
        style={{
          border: "1px solid #DBEAFE",
          borderRadius: "20px",
          padding: "22px",
          background: "linear-gradient(135deg, #F8FBFF 0%, #FFFFFF 100%)",
          marginBottom: "26px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <div
            style={{
              ...iconBox,
              width: "44px",
              height: "44px",
              borderRadius: "14px",
            }}
          >
            <SvgIcon type="shield" size={22} />
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#2563EB",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "7px",
              }}
            >
              Protection de vos données
            </div>

            <p
              style={{
                margin: 0,
                color: "#374151",
                fontSize: "14px",
                lineHeight: 1.75,
              }}
            >
              Cette politique explique de manière transparente quelles catégories de données
              peuvent être traitées lorsque vous utilisez Texerra SMS, pourquoi ces données sont
              utilisées, avec quels types de prestataires elles peuvent être partagées et comment
              vous pouvez exercer les droits prévus par la réglementation applicable.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          margin: "20px 0 30px",
        }}
      >
        <InfoCard icon="user" title="Votre compte">
          Certaines données permettent de créer le compte, de vous authentifier et de sécuriser
          votre accès.
        </InfoCard>

        <InfoCard icon="database" title="Vos commandes">
          Les informations utiles aux commandes, au solde, aux transactions et au support peuvent
          être conservées pour assurer le service.
        </InfoCard>

        <InfoCard icon="lock" title="Sécurité">
          Certaines informations techniques peuvent être utilisées pour détecter les abus,
          prévenir la fraude et protéger Texerra.
        </InfoCard>

        <InfoCard icon="globe" title="Prestataires externes">
          Certains traitements peuvent être réalisés avec l'aide de prestataires techniques
          situés au Cameroun ou dans d'autres pays.
        </InfoCard>
      </div>

      <h2>1. Objet de la présente politique</h2>
      <p>
        La présente Politique de confidentialité s'applique aux données personnelles susceptibles
        d'être traitées dans le cadre de l'utilisation du site et des services de
        <strong> Texerra SMS</strong>. Elle concerne notamment les personnes qui visitent le site,
        créent un compte, se connectent, effectuent une commande, alimentent leur solde ou
        contactent le support.
      </p>
      <p>
        Cette politique doit être lue avec les informations affichées sur le site au moment où
        vous utilisez une fonctionnalité particulière, ainsi qu'avec la
        <a href="/cookies"> Politique des cookies</a> lorsque des cookies ou technologies
        similaires sont concernés.
      </p>

      <h2>2. Qui traite vos données ?</h2>
      <div style={sectionCard}>
        <p style={{ marginTop: 0 }}>
          Le service est exploité sous le nom <strong>Texerra SMS</strong>.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <div>
            <div style={{ color: "#6B7280", fontSize: "12px", marginBottom: "4px" }}>
              Contact principal
            </div>
            <a href="mailto:contact@texerra.site" style={{ fontWeight: 700 }}>
              contact@texerra.site
            </a>
          </div>

          <div>
            <div style={{ color: "#6B7280", fontSize: "12px", marginBottom: "4px" }}>
              Contact secondaire
            </div>
            <a href="mailto:texerra.sms@gmail.com" style={{ fontWeight: 700 }}>
              texerra.sms@gmail.com
            </a>
          </div>

          <div>
            <div style={{ color: "#6B7280", fontSize: "12px", marginBottom: "4px" }}>
              Téléphone
            </div>
            <a href="tel:+12424542961" style={{ fontWeight: 700 }}>
              +1 (242) 454-2961
            </a>
          </div>
        </div>
      </div>

      <h2>3. Quelles données peuvent être collectées ?</h2>
      <p>
        Les données traitées dépendent de votre utilisation réelle de la plateforme. Nous ne
        cherchons pas à collecter davantage d'informations que nécessaire aux finalités décrites
        dans la présente politique.
      </p>

      <h3>3.1 Informations du compte</h3>
      <ul>
        <li>Prénom et nom lorsqu'ils sont demandés.</li>
        <li>Adresse email.</li>
        <li>Numéro de téléphone lorsqu'il est demandé.</li>
        <li>Informations nécessaires à la création et à la gestion du compte.</li>
        <li>État du compte et informations techniques nécessaires à son fonctionnement.</li>
      </ul>

      <h3>3.2 Informations d'authentification</h3>
      <p>
        Lorsque vous vous connectez avec un fournisseur externe tel que Google, Texerra peut
        recevoir certaines informations nécessaires à l'authentification et à l'identification
        du compte, conformément au fonctionnement de ce fournisseur.
      </p>
      <p>
        Nous n'avons pas besoin de recevoir votre mot de passe Google pour vous permettre d'utiliser
        une authentification Google. Les informations effectivement reçues dépendent du mécanisme
        d'authentification utilisé par le site.
      </p>

      <h3>3.3 Données techniques et de connexion</h3>
      <ul>
        <li>Adresse IP, lorsqu'elle est techniquement accessible et nécessaire.</li>
        <li>Type de navigateur et informations générales sur l'appareil.</li>
        <li>Système d'exploitation ou environnement technique.</li>
        <li>Date et heure de certaines connexions et interactions.</li>
        <li>Informations nécessaires au fonctionnement, à la sécurité et au diagnostic des incidents.</li>
      </ul>

      <h3>3.4 Données relatives aux commandes</h3>
      <ul>
        <li>Historique des commandes.</li>
        <li>Pays et service sélectionnés.</li>
        <li>Statut d'une commande.</li>
        <li>Montant facturé ou recrédité.</li>
        <li>Références techniques utiles au suivi de la commande.</li>
        <li>Informations nécessaires pour constater une réussite ou un échec du service.</li>
      </ul>

      <h3>3.5 Données relatives au solde et aux transactions</h3>
      <p>
        Lorsque vous rechargez votre compte ou utilisez votre solde, Texerra peut traiter des
        informations telles que le montant crédité, le montant débité, le montant recrédité en
        cas de remboursement, le statut de la transaction et sa référence technique.
      </p>

      <h3>3.6 Données communiquées au support</h3>
      <p>
        Lorsque vous contactez Texerra, nous pouvons traiter les informations que vous choisissez
        de communiquer dans votre demande afin de comprendre le problème et d'y répondre.
        Cela peut inclure votre adresse email, une référence de commande, une capture d'écran,
        des informations techniques ou le contenu de votre message.
      </p>

      <div style={warningCard}>
        <strong style={{ display: "block", color: "#111827", marginBottom: "7px" }}>
          Ne communiquez pas d'informations inutiles
        </strong>
        <div style={{ color: "#4B5563", fontSize: "14px", lineHeight: 1.7 }}>
          Pour votre sécurité, ne transmettez pas au support des mots de passe, codes secrets,
          codes bancaires ou autres informations hautement sensibles qui ne sont pas nécessaires
          au traitement de votre demande.
        </div>
      </div>

      <h2>4. Comment vos données sont-elles obtenues ?</h2>
      <p>
        Les informations peuvent provenir directement de vous, par exemple lorsque vous créez
        votre compte, renseignez votre profil, passez une commande ou écrivez au support.
      </p>
      <p>
        Certaines informations techniques peuvent également être générées automatiquement par
        votre appareil et votre navigateur lors de l'utilisation du site. D'autres informations
        peuvent nous être transmises par un prestataire technique ou de paiement lorsqu'elles
        sont nécessaires pour confirmer une opération ou sécuriser un service.
      </p>

      <h2>5. Pourquoi utilisons-nous vos données ?</h2>
      <p>
        Chaque catégorie de données est utilisée pour une ou plusieurs finalités déterminées.
        Les principales finalités sont les suivantes.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "14px",
          margin: "20px 0 24px",
        }}
      >
        <InfoCard icon="user" title="Compte et authentification">
          Créer, maintenir et sécuriser votre compte, permettre votre connexion et gérer votre
          session.
        </InfoCard>

        <InfoCard icon="database" title="Commandes et solde">
          Traiter les commandes, afficher l'historique, gérer le solde et enregistrer les
          opérations nécessaires à l'utilisation du service.
        </InfoCard>

        <InfoCard icon="lock" title="Sécurité et prévention">
          Détecter les comportements anormaux, prévenir la fraude, protéger les comptes et
          maintenir l'intégrité de la plateforme.
        </InfoCard>

        <InfoCard icon="mail" title="Support et communication">
          Répondre aux demandes, résoudre les incidents et envoyer les communications nécessaires
          au fonctionnement du compte.
        </InfoCard>
      </div>

      <p>
        Nous pouvons également utiliser certaines informations techniques et statistiques pour
        comprendre les erreurs, identifier les fonctionnalités utilisées, améliorer l'ergonomie
        et rendre Texerra plus fiable.
      </p>

      <h2>6. Bases et motifs du traitement</h2>
      <p>
        Selon la situation, un traitement peut être nécessaire pour fournir le service demandé,
        exécuter une opération initiée par l'utilisateur, protéger la plateforme, respecter une
        obligation applicable, répondre à une demande ou poursuivre une finalité légitime dans
        les limites prévues par la réglementation.
      </p>
      <p>
        Lorsqu'un traitement nécessite votre consentement, notamment pour certains cookies ou
        traceurs non essentiels, celui-ci doit être recueilli selon le mécanisme prévu à cet effet.
      </p>

      <h2>7. Paiements et informations de transaction</h2>
      <p>
        Lorsque vous effectuez une recharge, la transaction peut être traitée ou confirmée par
        un prestataire de paiement. Texerra peut recevoir les informations nécessaires pour
        déterminer si le paiement a été confirmé, notamment son statut, son montant et sa
        référence technique.
      </p>
      <p>
        Texerra n'a pas vocation à stocker sur ses propres serveurs les données bancaires
        sensibles nécessaires à l'usage du moyen de paiement lorsqu'elles sont directement
        traitées par le prestataire de paiement. Les informations effectivement accessibles à
        Texerra dépendent du moyen de paiement et de l'intégration utilisée au moment de la
        transaction.
      </p>

      <div style={greenCard}>
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              ...iconBox,
              background: "#FFFFFF",
              color: "#15803D",
              border: "1px solid #DCFCE7",
            }}
          >
            <SvgIcon type="lock" size={18} />
          </div>
          <div>
            <strong style={{ display: "block", color: "#111827", marginBottom: "5px" }}>
              Vérification des paiements
            </strong>
            <div style={{ color: "#4B5563", fontSize: "14px", lineHeight: 1.7 }}>
              Si une recharge n'est pas visible immédiatement, Texerra peut utiliser la référence
              de transaction et les informations de statut fournies par le prestataire afin de
              vérifier le paiement et de mettre à jour le solde lorsque le paiement est confirmé.
            </div>
          </div>
        </div>
      </div>

      <h2>8. Fournisseurs, sous-traitants et services externes</h2>
      <p>
        Texerra peut s'appuyer sur des prestataires externes indispensables à l'exploitation de
        la plateforme. Selon l'architecture réellement utilisée, il peut s'agir notamment de
        services d'hébergement et d'infrastructure, d'authentification, de paiement, d'envoi
        d'emails, de sécurité, d'assistance ou d'analyse.
      </p>
      <p>
        Certains prestataires peuvent agir pour le compte de Texerra et recevoir uniquement les
        informations nécessaires à leur mission. D'autres services tiers peuvent traiter
        directement certaines informations selon leurs propres conditions et politiques.
      </p>

      <div style={softCard}>
        <strong style={{ display: "block", color: "#111827", marginBottom: "8px" }}>
          Transparence sur les prestataires
        </strong>
        <div style={{ color: "#4B5563", fontSize: "14px", lineHeight: 1.7 }}>
          L'inventaire détaillé des prestataires et des flux de données doit rester synchronisé
          avec l'architecture technique réellement utilisée par Texerra. Aucun fournisseur,
          outil d'analyse ou service marketing ne doit être présenté ici comme utilisé s'il n'est
          pas effectivement intégré ou activé.
        </div>
      </div>

      <h2>9. Services d'authentification externes</h2>
      <p>
        Lorsque vous choisissez une méthode de connexion proposée par un fournisseur externe,
        comme Google, le processus d'authentification implique également ce fournisseur. Les
        informations effectivement transmises ou reçues sont déterminées par l'intégration mise
        en place et par les paramètres associés à votre compte auprès du fournisseur.
      </p>
      <p>
        Pour comprendre la manière dont ce fournisseur traite les données, vous devez également
        consulter sa propre politique de confidentialité.
      </p>

      <h2>10. Données relatives aux commandes de numéros virtuels</h2>
      <p>
        Les informations liées à une commande peuvent être associées à votre compte afin de
        permettre l'affichage de l'état de la commande, du service sélectionné, du montant,
        de l'historique et des éventuels recrédits.
      </p>
      <p>
        Le fait qu'un utilisateur saisisse ensuite un numéro Texerra dans une plateforme tierce
        ne signifie pas que Texerra contrôle le compte créé auprès de cette plateforme. Les
        informations détenues par cette plateforme sont soumises à sa propre politique de
        confidentialité et à ses propres règles.
      </p>

      <h2>11. Sécurité et prévention de la fraude</h2>
      <p>
        Certaines données techniques et certaines informations liées aux connexions, commandes
        ou transactions peuvent être utilisées pour détecter des comportements inhabituels,
        prévenir les abus, protéger les utilisateurs et sécuriser l'infrastructure.
      </p>
      <p>
        Des mesures techniques et organisationnelles raisonnables peuvent être utilisées pour
        limiter les accès non autorisés, protéger les comptes, sécuriser les échanges et détecter
        certaines anomalies. Aucun système connecté à Internet ne peut toutefois garantir un
        niveau de sécurité absolu.
      </p>

      <h2>12. Cookies et technologies similaires</h2>
      <p>
        Texerra peut utiliser des cookies ou des technologies similaires pour assurer des
        fonctionnalités nécessaires au site, maintenir certaines sessions, renforcer la sécurité
        et, lorsqu'elles sont réellement utilisées, mesurer l'audience ou réaliser des opérations
        de marketing.
      </p>
      <p>
        Les catégories de cookies, leurs finalités et les choix proposés aux utilisateurs sont
        détaillés dans la <a href="/cookies">Politique des cookies</a>.
      </p>

      <h2>13. Données de navigation et amélioration du service</h2>
      <p>
        Lorsque les outils appropriés sont activés, certaines informations statistiques peuvent
        être analysées pour comprendre les parcours généraux sur Texerra, identifier les pages
        qui rencontrent des difficultés, mesurer les performances et améliorer l'expérience
        utilisateur.
      </p>
      <p>
        Ces analyses ne doivent pas être utilisées comme justification pour collecter des
        informations sans rapport avec la finalité annoncée. Les outils réellement utilisés
        doivent correspondre à ce qui est décrit dans la Politique des cookies.
      </p>

      <h2>14. Communications par email</h2>
      <p>
        Texerra peut utiliser votre adresse email pour les communications nécessaires à votre
        compte, par exemple une confirmation, une information liée à une commande, une alerte de
        sécurité ou une réponse à une demande de support.
      </p>
      <p>
        Les communications commerciales facultatives doivent être gérées conformément aux règles
        applicables. Lorsque votre consentement est nécessaire, celui-ci doit être recueilli ou
        retiré par un mécanisme approprié.
      </p>

      <h2>15. Partage de données</h2>
      <p>
        Texerra ne vend pas les données personnelles de ses utilisateurs comme produit
        commercial. Certaines informations peuvent néanmoins être transmises lorsqu'elles sont
        nécessaires à la fourniture du service, à l'exécution d'une transaction, à la sécurité,
        au support, ou lorsqu'une transmission est imposée par une obligation légale ou une
        demande juridiquement valable.
      </p>

      <div style={sectionCard}>
        <strong style={{ display: "block", color: "#111827", marginBottom: "12px" }}>
          Les principaux cas peuvent être :
        </strong>

        <div style={{ display: "grid", gap: "10px" }}>
          {[
            "prestataire de paiement pour confirmer une transaction ;",
            "prestataire technique pour assurer une fonction du site ;",
            "prestataire d'email pour envoyer une communication demandée ou nécessaire ;",
            "prestataire de sécurité pour protéger l'infrastructure ;",
            "autorité compétente lorsque la loi l'exige ou l'autorise.",
          ].map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                gap: "9px",
                alignItems: "flex-start",
                color: "#4B5563",
                fontSize: "14px",
                lineHeight: 1.65,
              }}
            >
              <span style={{ color: "#2563EB", fontWeight: 800 }}>•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <h2>16. Transferts internationaux</h2>
      <p>
        Certains prestataires nécessaires au fonctionnement de Texerra peuvent être établis en
        dehors du Cameroun. Dans ce cas, certaines données peuvent être traitées ou stockées dans
        un autre pays.
      </p>
      <p>
        Texerra doit prendre en compte les exigences applicables aux transferts de données vers
        d'autres juridictions et sélectionner les prestataires et mécanismes appropriés en
        fonction des traitements réellement mis en œuvre.
      </p>

      <div style={softCard}>
        <strong style={{ display: "block", color: "#111827", marginBottom: "7px" }}>
          Traitements réalisés avec des prestataires internationaux
        </strong>
        <div style={{ color: "#4B5563", fontSize: "14px", lineHeight: 1.7 }}>
          Lorsque Texerra fait appel à un prestataire situé dans une autre juridiction, les
          traitements concernés restent encadrés par les exigences applicables en matière de
          protection des données. Les informations publiées sur cette page sont mises à jour
          lorsque les traitements ou les prestataires évoluent.
        </div>
      </div>

      <h2>17. Durée de conservation</h2>
      <p>
        Les données sont conservées pendant une durée adaptée à leur finalité. La durée dépend
        notamment de la nature de la donnée, de la relation avec l'utilisateur, de la nécessité
        de sécuriser le service, du suivi des transactions et des obligations légales applicables.
      </p>
      <p>
        Certaines informations peuvent donc être supprimées plus rapidement, tandis que d'autres
        doivent être conservées plus longtemps lorsqu'elles sont nécessaires à la preuve d'une
        transaction, à la sécurité, à la prévention des abus ou au respect d'une obligation
        applicable.
      </p>
      <p>
        Lorsque les données ne sont plus nécessaires et qu'aucune obligation ne justifie leur
        conservation, elles doivent être supprimées, anonymisées ou rendues inutilisables selon
        le cas.
      </p>

      <h2>18. Vos droits</h2>
      <p>
        Selon la réglementation applicable et les circonstances du traitement, vous pouvez
        disposer de droits concernant vos données personnelles, notamment :
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "12px",
          margin: "18px 0 24px",
        }}
      >
        <InfoCard icon="info" title="Accès">
          Demander quelles données vous concernant sont traitées et obtenir les informations
          prévues par la réglementation applicable.
        </InfoCard>

        <InfoCard icon="user" title="Rectification">
          Demander la correction d'une donnée inexacte ou incomplète lorsque le droit applicable
          le permet.
        </InfoCard>

        <InfoCard icon="trash" title="Suppression">
          Demander l'effacement de certaines données lorsque les conditions légales sont réunies.
        </InfoCard>

        <InfoCard icon="shield" title="Opposition et limitation">
          Vous opposer à certains traitements ou demander leur limitation lorsque ces droits
          sont applicables.
        </InfoCard>
      </div>

      <h2>19. Comment exercer vos droits ?</h2>
      <p>
        Pour toute demande relative à vos données personnelles, écrivez à
        <a href="mailto:contact@texerra.site"> contact@texerra.site</a>.
      </p>
      <p>
        Afin de protéger votre compte, Texerra peut demander des informations raisonnables
        permettant de vérifier l'identité du demandeur lorsqu'une demande donne accès à des
        données personnelles ou entraîne une modification importante du compte.
      </p>
      <p>
        Votre demande doit idéalement indiquer l'adresse email associée au compte ainsi qu'une
        description claire de la demande. Les réponses sont apportées dans les délais prévus par
        la réglementation applicable, sous réserve des vérifications nécessaires et des exceptions
        prévues par la loi.
      </p>

      <div style={greenCard}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div
            style={{
              ...iconBox,
              background: "#FFFFFF",
              color: "#15803D",
              border: "1px solid #DCFCE7",
            }}
          >
            <SvgIcon type="mail" size={18} />
          </div>

          <div>
            <strong style={{ display: "block", color: "#111827", marginBottom: "5px" }}>
              Adresse dédiée aux demandes de confidentialité
            </strong>
            <a href="mailto:contact@texerra.site" style={{ fontWeight: 700 }}>
              contact@texerra.site
            </a>
          </div>
        </div>
      </div>

      <h2>20. Suppression du compte</h2>
      <p>
        Lorsque les fonctionnalités de Texerra permettent la suppression d'un compte, la demande
        peut être effectuée selon le parcours prévu par la plateforme ou auprès du support.
      </p>
      <p>
        La suppression du compte ne signifie pas nécessairement que toutes les informations
        disparaissent immédiatement de tous les systèmes. Certaines données peuvent devoir être
        conservées pendant une période déterminée lorsqu'elles sont nécessaires pour respecter
        une obligation légale, prévenir la fraude, sécuriser la plateforme, établir une preuve ou
        résoudre un litige.
      </p>

      <h2>21. Données concernant les mineurs</h2>
      <p>
        Les services Texerra doivent être utilisés conformément aux règles d'âge et de capacité
        applicables. Nous n'encourageons pas l'utilisation de la plateforme par une personne qui
        n'a pas l'âge requis pour conclure valablement un contrat ou utiliser le service concerné.
      </p>
      <p>
        Si vous pensez qu'un mineur nous a transmis des données personnelles dans des conditions
        inappropriées, contactez-nous afin que la situation puisse être examinée.
      </p>

      <h2>22. Liens vers des services tiers</h2>
      <p>
        Le site peut contenir ou faciliter l'accès à des services exploités par des tiers. Ces
        services disposent de leurs propres conditions et politiques de confidentialité.
      </p>
      <p>
        Texerra n'est pas responsable du traitement des données effectué directement par une
        plateforme tierce lorsque celui-ci intervient dans son propre environnement. L'utilisateur
        doit consulter les informations de confidentialité du service tiers avant de lui
        transmettre des données.
      </p>

      <h2>23. Sécurité des informations liées à votre compte</h2>
      <p>
        Vous devez également contribuer à la sécurité de vos données en protégeant vos moyens
        d'accès, en utilisant un appareil sécurisé et en évitant de communiquer vos identifiants
        à des tiers.
      </p>
      <p>
        Si vous constatez une activité inhabituelle, une connexion que vous ne reconnaissez pas
        ou une compromission possible, contactez Texerra dès que possible avec suffisamment
        d'informations pour permettre l'examen de la situation.
      </p>

      <h2>24. Incident de sécurité</h2>
      <p>
        En cas d'incident affectant la confidentialité, l'intégrité ou la disponibilité de
        données personnelles, Texerra peut appliquer les mesures techniques nécessaires pour
        contenir l'incident, enquêter sur sa cause, restaurer le service et effectuer les
        notifications requises par la réglementation applicable.
      </p>

      <h2>25. Exactitude des informations et responsabilité de l'utilisateur</h2>
      <p>
        Vous devez fournir des informations exactes lorsque Texerra vous demande certaines données
        nécessaires au compte ou au service. Vous devez également éviter de transmettre au
        support des informations qui ne sont pas nécessaires au traitement de votre demande.
      </p>
      <p>
        Une mauvaise utilisation volontaire des données, des informations d'un autre utilisateur
        ou des systèmes de Texerra peut entraîner des mesures de sécurité et, lorsque la situation
        le justifie, des conséquences prévues par les règles applicables.
      </p>

      <h2>26. Modifications de la présente politique</h2>
      <p>
        Texerra peut modifier cette politique lorsque ses services, ses traitements, ses
        prestataires ou le cadre réglementaire évoluent. La version en vigueur est publiée sur
        cette page.
      </p>
      <p>
        Lorsque la nature d'une modification le nécessite, Texerra peut utiliser les moyens de
        communication appropriés pour en informer les utilisateurs concernés.
      </p>

      <h2>27. Évolution des traitements</h2>
      <p>
        Les services de Texerra peuvent évoluer au fil du temps. L'ajout d'une nouvelle
        fonctionnalité, d'un nouveau moyen d'authentification, d'un nouveau prestataire ou d'une
        nouvelle finalité peut entraîner une évolution des traitements de données.
      </p>
      <p>
        Lorsque cette évolution rend nécessaire une modification de la présente politique,
        Texerra met à jour les informations publiées afin qu'elles restent cohérentes avec les
        traitements effectivement réalisés. Lorsque la réglementation l'exige, les utilisateurs
        concernés sont informés par les moyens appropriés et un consentement est recueilli lorsque
        celui-ci est nécessaire.
      </p>

      <h2>28. Contact et demandes générales</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          margin: "18px 0 26px",
        }}
      >
        <InfoCard icon="mail" title="Email principal">
          contact@texerra.site
        </InfoCard>

        <InfoCard icon="mail" title="Email secondaire">
          texerra.sms@gmail.com
        </InfoCard>

        <InfoCard icon="user" title="Téléphone">
          +1 (242) 454-2961
        </InfoCard>
      </div>

      <Callout />
    </LegalLayout>
  );
}

function Callout() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "18px",
        borderRadius: "16px",
        border: "1px solid #DBEAFE",
        background: "#EFF6FF",
        margin: "20px 0",
      }}
    >
      <div style={{ ...iconBox, background: "#FFFFFF" }}>
        <SvgIcon type="info" size={18} />
      </div>

      <div>
        <strong
          style={{
            display: "block",
            color: "#111827",
            marginBottom: "5px",
          }}
        >
          Une question sur vos données ?
        </strong>

        <div
          style={{
            color: "#4B5563",
            fontSize: "14px",
            lineHeight: 1.7,
          }}
        >
          Utilisez <a href="mailto:contact@texerra.site">contact@texerra.site</a> pour toute
          question concernant la confidentialité ou l'exercice de vos droits.
        </div>
      </div>
    </div>
  );
}
