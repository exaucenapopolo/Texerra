import LegalLayout from "../components/legal-layout";

const colors = {
  text: "#111827",
  secondary: "#4B5563",
  muted: "#6B7280",
  border: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EFF6FF",
  green: "#15803D",
  greenSoft: "#F0FDF4",
  amber: "#B45309",
  amberSoft: "#FFFBEB",
  soft: "#F8FAFC",
};

function SvgIcon({
  type,
  size = 20,
}: {
  type:
    | "arrow"
    | "building"
    | "user"
    | "globe"
    | "mail"
    | "phone"
    | "shield"
    | "link"
    | "team"
    | "info"
    | "social";
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

  switch (type) {
    case "arrow":
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <path d="M4 21V5l8-3 8 3v16" />
          <path d="M8 9h2M14 9h2M8 13h2M14 13h2M10 21v-4h4v4" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 2.8 3 15.2 0 18M12 3c-3 2.8-3 15.2 0 18" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <path d="M10 6h4M11 18h2" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6l8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.1.1l1.3-1.3a5 5 0 0 0-7.1-7.1L10 6" />
          <path d="M14 11a5 5 0 0 0-7.1-.1l-1.3 1.3a5 5 0 0 0 7.1 7.1l1.3-1.3" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.5" />
          <circle cx="16" cy="9" r="2" />
          <path d="M4 19c.5-3 2.2-4.5 5-4.5s4.5 1.5 5 4.5" />
          <path d="M14 14.5c3.2-.5 5.2 1 6 4.5" />
        </svg>
      );
    case "social":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="m8.2 10.9 7.6-3.8M8.2 13.1l7.6 3.8" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6M12 7h.01" />
        </svg>
      );
  }
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
      aria-label="Retourner à la page précédente"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        border: `1px solid ${colors.border}`,
        background: "#FFFFFF",
        color: "#374151",
        padding: "9px 13px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        marginBottom: "22px",
      }}
    >
      <SvgIcon type="arrow" size={16} />
      Retour
    </button>
  );
}

function InfoCard({
  icon,
  title,
  description,
  tone = "default",
}: {
  icon: "building" | "user" | "globe" | "mail" | "phone" | "shield" | "link" | "team" | "social";
  title: string;
  description: string;
  tone?: "default" | "blue" | "green" | "amber";
}) {
  const toneStyles = {
    default: {
      background: "#FFFFFF",
      border: colors.border,
      iconBackground: colors.soft,
      iconColor: colors.text,
    },
    blue: {
      background: "#F8FBFF",
      border: "#DBEAFE",
      iconBackground: "#FFFFFF",
      iconColor: colors.blue,
    },
    green: {
      background: colors.greenSoft,
      border: "#DCFCE7",
      iconBackground: "#FFFFFF",
      iconColor: colors.green,
    },
    amber: {
      background: colors.amberSoft,
      border: "#FDE68A",
      iconBackground: "#FFFFFF",
      iconColor: colors.amber,
    },
  } as const;

  const current = toneStyles[tone];

  return (
    <div
      style={{
        border: `1px solid ${current.border}`,
        borderRadius: "16px",
        padding: "18px",
        background: current.background,
        boxSizing: "border-box",
        height: "100%",
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "12px",
          display: "grid",
          placeItems: "center",
          background: current.iconBackground,
          color: current.iconColor,
          border: `1px solid ${current.border}`,
        }}
      >
        <SvgIcon type={icon} size={19} />
      </div>

      <strong
        style={{
          display: "block",
          color: colors.text,
          marginTop: "12px",
          marginBottom: "6px",
          fontSize: "14px",
        }}
      >
        {title}
      </strong>

      <div
        style={{
          color: colors.secondary,
          fontSize: "13px",
          lineHeight: 1.7,
        }}
      >
        {description}
      </div>
    </div>
  );
}

function SocialLink({
  label,
  href,
  note,
}: {
  label: string;
  href: string;
  note?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "14px 16px",
        border: `1px solid ${colors.border}`,
        borderRadius: "14px",
        background: "#FFFFFF",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <span style={{ minWidth: 0 }}>
        <strong style={{ display: "block", color: colors.text, fontSize: "14px" }}>
          {label}
        </strong>
        {note ? (
          <span
            style={{
              display: "block",
              color: colors.muted,
              fontSize: "12px",
              marginTop: "3px",
            }}
          >
            {note}
          </span>
        ) : null}
      </span>
      <SvgIcon type="link" size={17} />
    </a>
  );
}

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales">
      <BackButton />

      <div
        style={{
          padding: "22px",
          borderRadius: "20px",
          border: "1px solid #DBEAFE",
          background: "linear-gradient(135deg, #F8FBFF 0%, #FFFFFF 100%)",
          marginBottom: "28px",
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
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              display: "grid",
              placeItems: "center",
              background: colors.blueSoft,
              color: colors.blue,
              border: "1px solid #DBEAFE",
              flexShrink: 0,
            }}
          >
            <SvgIcon type="building" size={22} />
          </div>

          <div>
            <div
              style={{
                color: colors.blue,
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "7px",
              }}
            >
              Informations officielles du site
            </div>

            <p
              style={{
                margin: 0,
                color: "#374151",
                fontSize: "14px",
                lineHeight: 1.75,
              }}
            >
              Les présentes mentions légales permettent d'identifier l'éditeur du site Texerra
              SMS, de distinguer les informations relatives à l'entreprise de celles relatives à
              son fondateur et de fournir les coordonnées utiles pour contacter la plateforme.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          margin: "20px 0 30px",
        }}
      >
        <InfoCard
          icon="building"
          title="Éditeur"
          description="Texerra SMS est le nom sous lequel la plateforme et ses services numériques sont exploités."
          tone="blue"
        />
        <InfoCard
          icon="user"
          title="Fondateur & CEO"
          description="Napopolo Exaucé est le fondateur et dirigeant de Texerra SMS."
        />
        <InfoCard
          icon="globe"
          title="Site officiel"
          description="Le site public de Texerra SMS est accessible à l'adresse https://www.texerra.site/."
        />
        <InfoCard
          icon="shield"
          title="Transparence"
          description="Aucune information administrative ou d'identification non disponible n'est inventée dans ces mentions."
          tone="green"
        />
      </div>

      <h2>1. Éditeur du site</h2>
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: "18px",
          padding: "20px",
          background: "#FFFFFF",
          margin: "18px 0 24px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "18px",
          }}
        >
          <div>
            <div style={{ color: colors.muted, fontSize: "12px", marginBottom: "5px" }}>
              Nom de l'éditeur / activité
            </div>
            <strong style={{ color: colors.text, fontSize: "17px" }}>Texerra SMS</strong>
          </div>

          <div>
            <div style={{ color: colors.muted, fontSize: "12px", marginBottom: "5px" }}>
              Site internet
            </div>
            <a
              href="https://www.texerra.site/"
              style={{ fontWeight: 700, wordBreak: "break-word" }}
            >
              https://www.texerra.site/
            </a>
          </div>

          <div>
            <div style={{ color: colors.muted, fontSize: "12px", marginBottom: "5px" }}>
              Email de l'éditeur
            </div>
            <a href="mailto:exaucenapopolo2@gmail.com" style={{ fontWeight: 700, wordBreak: "break-word" }}>
              exaucenapopolo2@gmail.com
            </a>
          </div>
        </div>
      </div>

      <p>
        Les coordonnées ci-dessus identifient le responsable indiqué pour l'édition du site. Les
        adresses de contact commerciales propres à l'entreprise sont présentées séparément afin
        de ne pas mélanger les coordonnées personnelles ou directes du dirigeant avec celles de
        la plateforme.
      </p>

      <h2>2. Fondateur et dirigeant</h2>
      <div style={{ ...stylesCard(colors.blueSoft, "#DBEAFE"), margin: "18px 0 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "13px",
              display: "grid",
              placeItems: "center",
              background: "#FFFFFF",
              color: colors.blue,
              border: "1px solid #DBEAFE",
              flexShrink: 0,
            }}
          >
            <SvgIcon type="user" size={21} />
          </div>

          <div>
            <div style={{ color: colors.muted, fontSize: "12px", marginBottom: "4px" }}>
              Fondateur et dirigeant
            </div>
            <strong style={{ display: "block", color: colors.text, fontSize: "18px" }}>
              Napopolo Exaucé
            </strong>
            <div style={{ color: colors.secondary, fontSize: "14px", marginTop: "4px" }}>
              Fondateur & CEO
            </div>
            <div style={{ color: colors.secondary, fontSize: "14px", marginTop: "7px" }}>
              Originaire du Cameroun
            </div>
            <a
              href="tel:+12424542961"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                marginTop: "10px",
                fontWeight: 700,
              }}
            >
              <SvgIcon type="phone" size={16} />
              +1 (242) 454-2961
            </a>
          </div>
        </div>
      </div>

      <p>
        La désignation « Fondateur & CEO » est utilisée ici pour identifier la fonction exercée
        au sein du projet Texerra SMS. Elle ne constitue pas, à elle seule, une déclaration sur la
        forme juridique de l'activité, sa structure de capital ou une immatriculation particulière.
      </p>

      <h2>3. Équipe de direction</h2>
      <p>
        Les mentions légales n'ont pas vocation à présenter l'ensemble de l'équipe Texerra. La
        personne ci-dessous est mentionnée uniquement en raison de ses responsabilités de direction
        et d'opérations.
      </p>

      <div style={{ ...stylesCard("#FFFFFF", colors.border), margin: "18px 0 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "13px",
              display: "grid",
              placeItems: "center",
              background: colors.soft,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              flexShrink: 0,
            }}
          >
            <SvgIcon type="team" size={21} />
          </div>

          <div>
            <div style={{ color: colors.muted, fontSize: "12px", marginBottom: "4px" }}>
              Direction et opérations
            </div>
            <strong style={{ display: "block", color: colors.text, fontSize: "17px" }}>
              Assembe Adrien Peggy
            </strong>
            <div style={{ color: colors.secondary, fontSize: "14px", marginTop: "5px" }}>
              Directeur Général (DG) | Opérations | Développement commercial
            </div>
            <div style={{ color: colors.muted, fontSize: "13px", marginTop: "7px" }}>
              Bafoussam, Cameroun
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...stylesCard(colors.amberSoft, "#FDE68A"), margin: "18px 0 24px" }}>
        <strong style={{ display: "block", color: colors.text, marginBottom: "6px" }}>
          Précision sur la localisation
        </strong>
        <div style={{ color: colors.secondary, fontSize: "14px", lineHeight: 1.7 }}>
          « Bafoussam, Cameroun » indique la localisation communiquée pour ce membre de la
          direction. Cette information ne constitue pas une adresse officielle du siège social de
          Texerra SMS et ne doit pas être interprétée comme telle.
        </div>
      </div>

      <h2>4. Informations sur le site</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          margin: "18px 0 24px",
        }}
      >
        <InfoCard
          icon="globe"
          title="Nom du site"
          description="Texerra SMS"
          tone="blue"
        />
        <InfoCard
          icon="link"
          title="Domaine"
          description="https://www.texerra.site/"
        />
        <InfoCard
          icon="building"
          title="Objet du site"
          description="Plateforme proposant des services numériques liés notamment aux numéros virtuels et à la réception de SMS de vérification."
        />
      </div>

      <h2>5. Contacts officiels de l'entreprise</h2>
      <p>
        Les coordonnées suivantes sont destinées aux échanges avec Texerra SMS en tant que
        plateforme. Elles sont distinctes de l'adresse personnelle ou directe communiquée pour
        le fondateur.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          margin: "18px 0 24px",
        }}
      >
        <InfoCard
          icon="mail"
          title="Email principal"
          description="contact@texerra.site"
          tone="blue"
        />
        <InfoCard
          icon="mail"
          title="Email secondaire"
          description="texerra.sms@gmail.com"
        />
        <InfoCard
          icon="phone"
          title="Téléphone"
          description="+1 (242) 454-2961"
        />
      </div>

      <h2>6. Canaux officiels et présence en ligne</h2>
      <p>
        Texerra SMS peut communiquer avec ses utilisateurs par l'intermédiaire de ses comptes et
        canaux officiels. Les liens ci-dessous sont fournis pour faciliter l'accès aux différentes
        plateformes de la marque.
      </p>

      <div style={{ display: "grid", gap: "10px", margin: "18px 0 26px" }}>
        <SocialLink
          label="Telegram"
          href="https://t.me/+VmvSLjDldkk1Y2Q0"
          note="Canal Telegram officiel"
        />
        <SocialLink
          label="YouTube"
          href="https://youtube.com/@texerra-sms?si=Juk4QmB-rUdSB7XB"
          note="Chaîne YouTube Texerra SMS"
        />
        <SocialLink
          label="WhatsApp Channel"
          href="https://whatsapp.com/channel/0029VbDCWHB0gcfAf1ugqS1w"
          note="Canal WhatsApp officiel"
        />
        <SocialLink
          label="Instagram"
          href="https://www.instagram.com/texerra.sms?igsh=OWl0MGtod2lhcDkx"
          note="Compte Instagram Texerra SMS"
        />
        <SocialLink
          label="Facebook"
          href="https://www.facebook.com/share/1EeWWxhVyX/"
          note="Page / profil Facebook de Texerra"
        />
        <SocialLink
          label="TikTok"
          href="https://www.facebook.com/share/1EeWWxhVyX/"
          note="Lien provisoire — à remplacer dès que le compte TikTok officiel est disponible"
        />
      </div>

      <div style={{ ...stylesCard(colors.blueSoft, "#DBEAFE"), margin: "18px 0 24px" }}>
        <div style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
          <div style={{ color: colors.blue }}>
            <SvgIcon type="social" size={20} />
          </div>
          <div style={{ color: colors.secondary, fontSize: "13px", lineHeight: 1.7 }}>
            Les plateformes tierces disposent de leurs propres conditions et politiques. Texerra
            SMS n'est responsable que des informations et services relevant de ses propres canaux.
          </div>
        </div>
      </div>

      <h2>7. Hébergement</h2>
      <p>
        Les informations détaillées relatives à l'hébergeur ne sont pas publiées sur cette page à
        ce stade. Aucune identité, adresse ou caractéristique d'hébergement n'est inventée pour
        compléter artificiellement les présentes mentions légales.
      </p>

      <h2>8. Informations administratives</h2>
      <p>
        Les numéros et références administratives qui ne sont pas actuellement disponibles ne sont
        pas fabriqués ou remplacés par des valeurs fictives. Cela concerne notamment les
        informations telles qu'un numéro d'immatriculation ou un identifiant fiscal lorsqu'ils ne
        sont pas encore publiés par Texerra.
      </p>
      <p>
        Lorsque des informations administratives officielles devront être publiées ou mises à jour,
        cette page pourra être modifiée en conséquence.
      </p>

      <h2>9. Propriété intellectuelle</h2>
      <p>
        Les éléments originaux associés à Texerra SMS, notamment certains textes, éléments
        graphiques, interfaces, logos, contenus et éléments de présentation, peuvent être protégés
        par les droits applicables. Leur reproduction ou exploitation non autorisée peut être
        interdite lorsque ces éléments sont protégés et qu'aucune autorisation ne l'autorise.
      </p>
      <p>
        Les marques, noms, logos et contenus appartenant à des services tiers restent la propriété
        de leurs titulaires respectifs. La mention d'un service tiers sur Texerra ne signifie pas
        que ce service est exploité par Texerra ou qu'il existe une relation officielle avec son
        titulaire, sauf indication contraire expresse.
      </p>

      <h2>10. Services et fournisseurs externes</h2>
      <p>
        Le fonctionnement de Texerra peut dépendre de fournisseurs et de services externes,
        notamment pour certaines infrastructures techniques, les numéros virtuels, les réseaux de
        communication, les paiements, l'authentification ou l'envoi de communications.
      </p>
      <p>
        Des changements, interruptions ou restrictions appliqués par ces prestataires peuvent
        affecter certaines fonctionnalités. Les conditions applicables à ces services peuvent
        également évoluer indépendamment de Texerra.
      </p>

      <h2>11. Disponibilité du site</h2>
      <p>
        Texerra s'efforce de maintenir son site accessible et ses fonctionnalités opérationnelles.
        Toutefois, la disponibilité peut être affectée ponctuellement par des opérations de
        maintenance, des incidents techniques, des problèmes de réseau ou des perturbations chez
        un prestataire externe.
      </p>
      <p>
        Le fait que le site soit normalement accessible ne constitue pas une garantie d'absence
        totale d'interruption ou d'incident. Texerra peut intervenir sur ses infrastructures afin
        de maintenir ou améliorer le service.
      </p>

      <h2>12. Responsabilité relative aux contenus externes</h2>
      <p>
        Les liens vers des sites, plateformes ou services tiers sont fournis pour faciliter la
        navigation et l'accès aux canaux concernés. Texerra n'exerce pas de contrôle sur les
        contenus, politiques, disponibilités ou pratiques de ces plateformes après redirection.
      </p>
      <p>
        L'utilisation d'un service tiers reste soumise aux conditions et politiques propres à ce
        service. Les utilisateurs doivent les consulter lorsqu'elles sont pertinentes pour leur
        utilisation.
      </p>

      <h2>13. Protection des données personnelles</h2>
      <p>
        Texerra SMS peut traiter certaines données personnelles nécessaires à la création et à la
        gestion des comptes, aux commandes, au solde, au paiement, au support, à la sécurité et à
        l'amélioration du service.
      </p>
      <p>
        Les modalités détaillées de collecte, d'utilisation, de conservation, de partage et
        d'exercice des droits sont présentées dans la
        <a href="/confidentialite"> Politique de confidentialité</a>.
      </p>

      <h2>14. Cookies et technologies similaires</h2>
      <p>
        Le site peut utiliser des cookies ou technologies similaires pour des fonctions nécessaires
        à son fonctionnement et, lorsque cela est applicable, pour l'analyse d'audience ou certaines
        finalités de communication et de marketing.
      </p>
      <p>
        Les catégories de cookies, les finalités et les mécanismes de choix sont détaillés dans la
        <a href="/cookies"> Politique des cookies</a>. Cette politique doit rester cohérente avec
        les outils réellement installés et activés sur le site.
      </p>

      <h2>15. Règles d'utilisation des services</h2>
      <p>
        Les utilisateurs doivent respecter les Conditions d'utilisation de Texerra SMS ainsi que
        les règles des services tiers qu'ils utilisent avec les services Texerra.
      </p>
      <p>
        Les utilisations frauduleuses, illégales, malveillantes ou destinées à compromettre un
        service sont interdites. Les règles détaillées figurent dans les
        <a href="/conditions-utilisation"> Conditions d'utilisation</a> et la
        <a href="/utilisation-acceptable"> Politique d'utilisation acceptable</a>.
      </p>

      <h2>16. Exactitude et évolution des informations</h2>
      <p>
        Texerra s'efforce de maintenir les informations publiées sur cette page à jour. Certaines
        informations peuvent toutefois évoluer au cours de la vie de l'activité, notamment les
        coordonnées, les canaux sociaux, les prestataires ou certaines informations administratives.
      </p>
      <p>
        Lorsque des informations officielles nouvelles deviennent disponibles, elles peuvent être
        ajoutées à cette page afin de maintenir une présentation exacte de l'éditeur et de son
        activité.
      </p>

      <h2>17. Droit applicable et juridictions compétentes</h2>
      <p>
        Les questions relatives à l'exploitation du site et aux relations avec les utilisateurs
        sont traitées conformément au droit applicable à la situation concernée, sans préjudice
        des dispositions impératives qui pourraient s'appliquer.
      </p>
      <p>
        En cas de difficulté, Texerra encourage d'abord une prise de contact afin de rechercher
        une solution amiable. À défaut de résolution, les autorités ou juridictions compétentes
        sont déterminées selon les règles applicables.
      </p>

      <h2>18. Contact et demandes relatives au site</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          margin: "18px 0 26px",
        }}
      >
        <InfoCard
          icon="mail"
          title="Contact de l'entreprise"
          description="contact@texerra.site"
          tone="blue"
        />
        <InfoCard
          icon="mail"
          title="Email secondaire"
          description="texerra.sms@gmail.com"
        />
        <InfoCard
          icon="phone"
          title="Téléphone"
          description="+1 (242) 454-2961"
        />
        <InfoCard
          icon="globe"
          title="Site officiel"
          description="https://www.texerra.site/"
        />
      </div>

      <div style={{ ...stylesCard(colors.greenSoft, "#BBF7D0"), margin: "22px 0 0" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "13px",
              display: "grid",
              placeItems: "center",
              background: "#FFFFFF",
              color: colors.green,
              border: "1px solid #DCFCE7",
              flexShrink: 0,
            }}
          >
            <SvgIcon type="shield" size={19} />
          </div>
          <div>
            <strong style={{ display: "block", color: colors.text, marginBottom: "5px" }}>
              Une page volontairement factuelle
            </strong>
            <div style={{ color: colors.secondary, fontSize: "13px", lineHeight: 1.7 }}>
              Ces mentions distinguent volontairement l'éditeur, son fondateur, l'équipe de
              direction, les coordonnées de l'entreprise et les informations relatives au site.
              Les éléments administratifs non disponibles ne sont pas remplacés par des données
              inventées.
            </div>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}

function stylesCard(background: string, border: string) {
  return {
    border: `1px solid ${border}`,
    borderRadius: "18px",
    padding: "20px",
    background,
  };
}
