import LegalLayout from "../components/legal-layout";

const styles = {
  card: {
    border: "1px solid #E5E7EB",
    borderRadius: "18px",
    padding: "20px",
    background: "#FFFFFF",
    margin: "18px 0",
  },
  soft: {
    border: "1px solid #DBEAFE",
    borderRadius: "18px",
    padding: "20px",
    background: "#F8FBFF",
    margin: "18px 0",
  },
  success: {
    border: "1px solid #BBF7D0",
    borderRadius: "18px",
    padding: "20px",
    background: "#F6FFF8",
    margin: "18px 0",
  },
  warning: {
    border: "1px solid #FDE68A",
    borderRadius: "18px",
    padding: "20px",
    background: "#FFFCF2",
    margin: "18px 0",
  },
  danger: {
    border: "1px solid #FECACA",
    borderRadius: "18px",
    padding: "20px",
    background: "#FFF8F8",
    margin: "18px 0",
  },
};

function SvgIcon({
  type,
  size = 20,
}: {
  type:
    | "arrow"
    | "wallet"
    | "phone"
    | "clock"
    | "check"
    | "warning"
    | "refresh"
    | "shield"
    | "support"
    | "ban"
    | "info"
    | "receipt"
    | "user";
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
      return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
    case "wallet":
      return <svg {...common}><path d="M4 7h16v10H4z" /><path d="M4 7V5h14l2 2" /><path d="M15 12h3" /></svg>;
    case "phone":
      return <svg {...common}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M10 6h4" /><path d="M11 18h2" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "warning":
      return <svg {...common}><path d="m12 4 9 16H3L12 4Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></svg>;
    case "refresh":
      return <svg {...common}><path d="M20 11a8 8 0 1 0 2 5" /><path d="M20 4v7h-7" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3 20 6v5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "support":
      return <svg {...common}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v5H5a1 1 0 0 1-1-1v-4Z" /><path d="M20 14h-3v5h2a1 1 0 0 0 1-1v-4Z" /><path d="M8 20h4" /></svg>;
    case "ban":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m5.5 5.5 13 13" /></svg>;
    case "receipt":
      return <svg {...common}><path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 10v6" /><path d="M12 7h.01" /></svg>;
  }
}

function FeatureCard({
  icon,
  title,
  text,
  tone = "neutral",
}: {
  icon: "wallet" | "phone" | "clock" | "check" | "warning" | "refresh" | "shield" | "support" | "ban" | "receipt" | "user";
  title: string;
  text: string;
  tone?: "neutral" | "blue" | "green" | "amber";
}) {
  const tones = {
    neutral: { background: "#FFFFFF", border: "#E5E7EB", iconBackground: "#F8FAFC", iconColor: "#374151" },
    blue: { background: "#F8FBFF", border: "#DBEAFE", iconBackground: "#FFFFFF", iconColor: "#2563EB" },
    green: { background: "#F6FFF8", border: "#DCFCE7", iconBackground: "#FFFFFF", iconColor: "#15803D" },
    amber: { background: "#FFFCF2", border: "#FEF3C7", iconBackground: "#FFFFFF", iconColor: "#B45309" },
  } as const;
  const current = tones[tone];

  return (
    <div style={{ border: `1px solid ${current.border}`, borderRadius: "16px", padding: "18px", background: current.background, height: "100%", boxSizing: "border-box" }}>
      <div style={{ width: "38px", height: "38px", borderRadius: "12px", display: "grid", placeItems: "center", background: current.iconBackground, color: current.iconColor, border: `1px solid ${current.border}` }}>
        <SvgIcon type={icon} size={19} />
      </div>
      <strong style={{ display: "block", color: "#111827", marginTop: "12px", marginBottom: "6px", fontSize: "14px" }}>{title}</strong>
      <div style={{ color: "#4B5563", fontSize: "13px", lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: any }) {
  return (
    <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
      <div style={{ width: "34px", height: "34px", borderRadius: "50%", display: "grid", placeItems: "center", background: "#111827", color: "#FFFFFF", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>{number}</div>
      <div style={{ paddingTop: "2px" }}>
        <strong style={{ display: "block", color: "#111827", marginBottom: "4px" }}>{title}</strong>
        <div style={{ color: "#4B5563", fontSize: "14px", lineHeight: 1.7 }}>{children}</div>
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
    if (typeof window !== "undefined") window.location.href = "/";
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Retourner à la page précédente"
      style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#374151", padding: "9px 13px", borderRadius: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginBottom: "22px" }}
    >
      <SvgIcon type="arrow" size={16} />
      Retour
    </button>
  );
}

export default function ConditionsVente() {
  return (
    <LegalLayout title="Conditions générales de vente">
      <BackButton />

      <div style={{ padding: "22px", borderRadius: "20px", border: "1px solid #DBEAFE", background: "linear-gradient(135deg, #F8FBFF 0%, #FFFFFF 100%)", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "14px", display: "grid", placeItems: "center", background: "#EFF6FF", color: "#2563EB", border: "1px solid #DBEAFE", flexShrink: 0 }}>
            <SvgIcon type="receipt" size={22} />
          </div>
          <div>
            <div style={{ color: "#2563EB", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "7px" }}>
              Achats, paiements et commandes
            </div>
            <p style={{ margin: 0, color: "#374151", fontSize: "14px", lineHeight: 1.75 }}>
              Les présentes Conditions générales de vente expliquent les règles applicables aux recharges, aux commandes de numéros virtuels et aux autres services numériques proposés sur Texerra SMS. Elles précisent également le traitement d'un paiement confirmé ou non confirmé, d'une commande échouée, d'un SMS non reçu et d'un éventuel remboursement.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", margin: "20px 0 30px" }}>
        <FeatureCard icon="wallet" title="Solde Texerra" text="Le solde sert à commander les services disponibles sur la plateforme. Il n'est pas présenté comme un compte bancaire." tone="blue" />
        <FeatureCard icon="clock" title="2 à 7 minutes" text="Le SMS est généralement reçu dans ce délai, mais certaines commandes peuvent aller jusqu'à environ 17 minutes." tone="blue" />
        <FeatureCard icon="refresh" title="Recrédit en cas d'échec" text="Une commande considérée comme échouée peut être automatiquement recréditée sur le solde selon les règles du système." tone="green" />
        <FeatureCard icon="warning" title="Pas de garantie à 100 %" text="L'acceptation d'un numéro et la livraison d'un SMS dépendent aussi de services et fournisseurs externes." tone="amber" />
      </div>

      <h2>1. Objet et champ d'application</h2>
      <p>
        Les présentes Conditions générales de vente (« CGV ») encadrent les achats réalisés sur Texerra SMS, accessible à l'adresse <strong>https://www.texerra.site/</strong>. Elles s'appliquent notamment aux recharges de solde, aux commandes de numéros virtuels et aux services numériques proposés sur la plateforme.
      </p>
      <p>
        Avant de confirmer une opération, l'utilisateur doit vérifier les informations affichées sur l'interface, notamment le pays, le service, le prix et les conditions particulières de la commande. En validant une opération, il reconnaît avoir pris connaissance des informations communiquées pour cette opération et accepter les présentes CGV, sous réserve des droits auxquels il ne peut légalement renoncer.
      </p>

      <h2>2. Définitions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", margin: "18px 0 24px" }}>
        <FeatureCard icon="wallet" title="Solde" text="Montant disponible dans le compte Texerra et utilisable pour acheter les services proposés sur la plateforme." />
        <FeatureCard icon="phone" title="Numéro virtuel" text="Numéro attribué dans le cadre d'une commande afin de permettre, lorsque le service tiers l'accepte, la réception d'un SMS." />
        <FeatureCard icon="receipt" title="Commande" text="Opération par laquelle l'utilisateur utilise son solde pour demander un service disponible." />
        <FeatureCard icon="support" title="Support" text="Moyens de contact permettant de signaler une anomalie, demander une assistance ou transmettre une réclamation." />
      </div>

      <h2>3. Nature des services vendus</h2>
      <p>
        Texerra propose des services numériques liés notamment aux numéros virtuels et à la réception de SMS de vérification. Les références disponibles peuvent varier selon le pays, le service sélectionné, les stocks disponibles et les fournisseurs utilisés.
      </p>
      <p>
        Un numéro virtuel n'est pas une garantie qu'un service tiers acceptera le numéro, autorisera la vérification ou délivrera le SMS demandé. La réussite d'une commande dépend donc de plusieurs facteurs techniques qui ne sont pas tous contrôlés par Texerra.
      </p>

      <div style={styles.soft}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "13px", display: "grid", placeItems: "center", background: "#FFFFFF", color: "#2563EB", border: "1px solid #DBEAFE", flexShrink: 0 }}>
            <SvgIcon type="info" size={19} />
          </div>
          <div>
            <strong style={{ display: "block", color: "#111827", marginBottom: "5px" }}>Ce que vous achetez</strong>
            <div style={{ color: "#4B5563", fontSize: "14px", lineHeight: 1.7 }}>
              Vous achetez un service numérique effectivement disponible au moment de la commande, et non une garantie permanente qu'un service tiers acceptera le numéro ou permettra une future vérification.
            </div>
          </div>
        </div>
      </div>

      <h2>4. Prix et tarifs</h2>
      <p>
        Le prix applicable à une commande est celui affiché sur Texerra au moment où l'utilisateur la valide, sous réserve des règles applicables en cas d'erreur manifeste. Les tarifs peuvent évoluer en fonction des fournisseurs, des pays, des services, des stocks et de la politique commerciale de Texerra.
      </p>
      <p>
        Une modification future des tarifs concerne les commandes futures et ne modifie pas rétroactivement une commande déjà correctement validée.
      </p>

      <h2>5. Conditions nécessaires à une commande</h2>
      <p>
        L'utilisateur doit disposer d'un compte lorsque celui-ci est nécessaire au parcours concerné et d'un solde suffisant pour réaliser la commande. Il lui appartient de vérifier les informations affichées avant de confirmer l'opération.
      </p>
      <p>
        Le lancement d'un parcours de commande ne signifie pas automatiquement que le service a été fourni. La commande doit être confirmée par le système avant que le débit puisse être considéré comme correspondant à un service attribué.
      </p>

      <h2>6. Recharge du compte</h2>
      <div style={styles.card}>
        <div style={{ display: "grid", gap: "18px" }}>
          <Step number="1" title="Ouvrir la page de dépôt">L'utilisateur se rend sur la page prévue pour effectuer une recharge.</Step>
          <Step number="2" title="Choisir le montant">Il sélectionne le montant qu'il souhaite ajouter à son solde parmi les options proposées.</Step>
          <Step number="3" title="Effectuer le paiement">Il est redirigé vers le prestataire de paiement disponible et effectue le paiement demandé.</Step>
          <Step number="4" title="Revenir sur Texerra">Après le paiement, il revient sur la plateforme afin que le statut de la transaction puisse être vérifié.</Step>
          <Step number="5" title="Vérifier le paiement si nécessaire">Si le solde n'est pas actualisé automatiquement, il peut utiliser le bouton <strong>« Vérifier le paiement »</strong> présent sur la page de dépôt.</Step>
        </div>
      </div>

      <h2>7. Paiement confirmé mais solde non crédité</h2>
      <p>
        Un délai technique peut exceptionnellement exister entre la confirmation du paiement par le prestataire et la mise à jour visible du solde. Dans ce cas, l'utilisateur doit d'abord revenir sur la page de dépôt et utiliser la fonction de vérification du paiement.
      </p>
      <p>
        Lorsque la transaction est effectivement confirmée, le système peut créditer le montant correspondant au solde. Si le problème persiste, l'utilisateur peut contacter le support en communiquant la référence de transaction, le montant, la date et les informations utiles disponibles.
      </p>

      <div style={styles.success}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "13px", display: "grid", placeItems: "center", background: "#FFFFFF", color: "#15803D", border: "1px solid #DCFCE7", flexShrink: 0 }}>
            <SvgIcon type="check" size={20} />
          </div>
          <div>
            <strong style={{ display: "block", color: "#111827", marginBottom: "5px" }}>Réflexe après un dépôt</strong>
            <div style={{ color: "#4B5563", fontSize: "14px", lineHeight: 1.7 }}>
              Avant d'ouvrir une réclamation, vérifiez le paiement depuis la page de dépôt à l'aide du bouton prévu. Cette vérification peut permettre au système de retrouver la confirmation et de mettre à jour le solde automatiquement.
            </div>
          </div>
        </div>
      </div>

      <h2>8. Paiements échoués, annulés ou non confirmés</h2>
      <p>
        Lorsqu'un paiement n'est pas confirmé par le prestataire, Texerra ne considère pas automatiquement la recharge comme définitivement validée. Le simple fait d'avoir commencé un paiement ne signifie pas que le montant a été crédité.
      </p>
      <p>
        L'utilisateur doit vérifier le statut de la transaction depuis Texerra et, lorsque cela est nécessaire, contacter le support avec les informations de la transaction.
      </p>

      <h2>9. Utilisation du solde</h2>
      <p>
        Le solde disponible sur Texerra est destiné à l'achat des services proposés sur la plateforme. Il n'est pas présenté comme un compte bancaire, un compte de paiement ou un mécanisme permettant de retirer librement des espèces.
      </p>
      <p>
        Lorsqu'une commande est remboursée selon les règles applicables, le montant concerné est normalement recrédité sur le solde afin de pouvoir être réutilisé pour d'autres services Texerra.
      </p>

      <h2>10. Commande d'un numéro virtuel</h2>
      <div style={styles.card}>
        <div style={{ display: "grid", gap: "18px" }}>
          <Step number="1" title="Choisir">Sélectionner le pays et le service réellement disponibles dans l'interface.</Step>
          <Step number="2" title="Vérifier">S'assurer que le solde disponible couvre le prix affiché.</Step>
          <Step number="3" title="Valider">Confirmer la commande selon le parcours prévu par la plateforme.</Step>
          <Step number="4" title="Recevoir">Lorsque le stock est disponible, le numéro peut être attribué et l'utilisateur peut l'utiliser pour le service sélectionné.</Step>
        </div>
      </div>

      <h2>11. Stocks et disponibilité des numéros</h2>
      <p>
        Les stocks de numéros dépendent des partenaires et fournisseurs de Texerra. Un numéro, un pays ou une combinaison pays/service peut être disponible à un instant donné puis devenir indisponible lorsque le stock est épuisé.
      </p>
      <p>
        Certains stocks peuvent être réapprovisionnés rapidement, mais aucun délai fixe de réapprovisionnement n'est garanti. Si un stock devient indisponible, l'utilisateur devra attendre sa remise à disposition ou choisir une autre disponibilité proposée.
      </p>

      <h2>12. Délai de réception des SMS</h2>
      <p>
        Le délai moyen de réception d'un SMS est généralement compris entre <strong>2 et 7 minutes</strong>. Dans certaines situations, la réception peut prendre plus de temps et atteindre environ <strong>17 minutes</strong>.
      </p>
      <p>
        Ces délais sont indicatifs et ne constituent pas une garantie de livraison à une minute précise. Le délai réel peut dépendre du fournisseur du numéro, du pays, de l'opérateur, du service tiers, de ses mécanismes de sécurité et de la charge technique du moment.
      </p>

      <h2>13. Aucune garantie de réussite à 100 %</h2>
      <p>
        Texerra ne garantit pas que chaque numéro acheté recevra systématiquement le SMS attendu ni qu'il sera accepté par le service tiers sélectionné.
      </p>
      <p>
        Certains services tiers peuvent limiter, filtrer ou bloquer les numéros virtuels. Leurs algorithmes, règles internes et méthodes de vérification peuvent évoluer indépendamment de Texerra.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", margin: "18px 0 26px" }}>
        <FeatureCard icon="phone" title="Le numéro peut fonctionner" text="La commande peut aboutir lorsque le numéro est disponible et que le service tiers accepte la destination." tone="green" />
        <FeatureCard icon="warning" title="Le service peut refuser" text="Une plateforme tierce peut refuser un numéro virtuel pour des raisons qui lui sont propres." tone="amber" />
        <FeatureCard icon="refresh" title="Une nouvelle tentative peut fonctionner" text="Lorsqu'une commande échoue, une autre disponibilité peut être proposée selon les stocks et les services." />
      </div>

      <h2>14. SMS non reçu et commande échouée</h2>
      <p>
        Lorsque le SMS n'est pas reçu dans le délai applicable et que la commande est considérée comme échouée par le système, le montant de la commande peut être automatiquement recrédité sur le solde du compte.
      </p>
      <p>
        L'utilisateur n'a normalement pas besoin de contacter le support uniquement pour demander un recrédit lorsque le système l'effectue automatiquement. Il doit contacter le support lorsqu'une anomalie persiste ou qu'une commande reste dans un état inhabituel.
      </p>

      <h2>15. Traitement des principaux cas</h2>
      <div style={{ overflowX: "auto", border: "1px solid #E5E7EB", borderRadius: "16px", margin: "18px 0 26px" }}>
        <table style={{ width: "100%", minWidth: "720px", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid #E5E7EB", color: "#111827" }}>Situation</th>
              <th style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid #E5E7EB", color: "#111827" }}>Traitement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "14px 16px", color: "#374151", borderBottom: "1px solid #E5E7EB" }}>Paiement échoué ou non confirmé</td>
              <td style={{ padding: "14px 16px", color: "#4B5563", borderBottom: "1px solid #E5E7EB" }}>Pas de recharge définitive tant que le paiement n'est pas confirmé.</td>
            </tr>
            <tr>
              <td style={{ padding: "14px 16px", color: "#374151", borderBottom: "1px solid #E5E7EB" }}>Numéro indisponible</td>
              <td style={{ padding: "14px 16px", color: "#4B5563", borderBottom: "1px solid #E5E7EB" }}>Aucun débit définitif ne doit correspondre à un service qui n'a pas été attribué.</td>
            </tr>
            <tr>
              <td style={{ padding: "14px 16px", color: "#374151", borderBottom: "1px solid #E5E7EB" }}>SMS non reçu / commande échouée</td>
              <td style={{ padding: "14px 16px", color: "#4B5563", borderBottom: "1px solid #E5E7EB" }}>Recrédit automatique du montant de la commande sur le solde lorsque les règles du système sont remplies.</td>
            </tr>
            <tr>
              <td style={{ padding: "14px 16px", color: "#374151", borderBottom: "1px solid #E5E7EB" }}>Commande correctement exécutée</td>
              <td style={{ padding: "14px 16px", color: "#4B5563", borderBottom: "1px solid #E5E7EB" }}>Le service est considéré comme fourni conformément aux informations affichées au moment de la commande.</td>
            </tr>
            <tr>
              <td style={{ padding: "14px 16px", color: "#374151" }}>Erreur ou mauvaise utilisation du client</td>
              <td style={{ padding: "14px 16px", color: "#4B5563" }}>Le client contacte le support lorsque la situation nécessite une intervention ; traitement selon le cas, les preuves disponibles et les règles applicables.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>16. Remboursement sur le solde</h2>
      <p>
        Lorsque le système prévoit un remboursement, le fonctionnement normal de Texerra est le recrédit du montant concerné sur le solde du compte. Ce montant peut ensuite être utilisé pour une nouvelle commande.
      </p>
      <p>
        Le recrédit sur le solde ne constitue pas, en lui-même, un paiement en espèces. Cette règle s'applique sous réserve des droits ou obligations qui ne peuvent légalement être écartés.
      </p>

      <div style={styles.warning}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "13px", display: "grid", placeItems: "center", background: "#FFFFFF", color: "#B45309", border: "1px solid #FDE68A", flexShrink: 0 }}>
            <SvgIcon type="warning" size={20} />
          </div>
          <div>
            <strong style={{ display: "block", color: "#111827", marginBottom: "6px" }}>Le solde Texerra n'est pas un portefeuille bancaire</strong>
            <div style={{ color: "#4B5563", fontSize: "14px", lineHeight: 1.7 }}>
              Le solde est conçu pour être utilisé sur la plateforme. Lorsqu'un montant est recrédité après l'échec d'une commande, il reste normalement disponible pour d'autres services Texerra.
            </div>
          </div>
        </div>
      </div>

      <h2>17. Commande correctement exécutée</h2>
      <p>
        Une commande est considérée comme exécutée lorsque le service acheté a été fourni conformément à son fonctionnement prévu et aux informations affichées au moment de la commande.
      </p>
      <p>
        Le simple fait qu'un utilisateur décide ensuite de ne plus utiliser le service ne constitue pas automatiquement une preuve que la commande a échoué. Toute demande particulière est examinée selon les circonstances, les informations de la commande et les règles applicables.
      </p>

      <h2>18. Durée d'utilisation et accès au compte tiers</h2>
      <p>
        L'achat d'un numéro pour vérifier un compte sur WhatsApp, Telegram, Instagram, TikTok ou une autre plateforme ne crée pas une durée de validité permanente du compte tiers ni une garantie que le même numéro restera disponible pour une future vérification.
      </p>
      <p>
        Après la réception et l'utilisation réussie du code, le compte créé auprès de la plateforme tierce dépend principalement des règles de cette plateforme et de la manière dont l'utilisateur conserve son accès.
      </p>

      <div style={styles.soft}>
        <strong style={{ display: "block", color: "#111827", marginBottom: "9px" }}>Exemple concret : vérification WhatsApp</strong>
        <p style={{ margin: 0, color: "#4B5563", fontSize: "14px", lineHeight: 1.75 }}>
          Vous achetez un numéro Texerra pour WhatsApp, recevez le code et terminez la vérification. Vous pouvez continuer à utiliser votre compte tant que vous conservez son accès et que WhatsApp continue de l'autoriser. Si vous perdez l'accès, vous vous déconnectez, la plateforme demande une nouvelle vérification ou impose une restriction, Texerra ne garantit pas que le même numéro sera disponible ou accepté pour récupérer ou vérifier à nouveau ce compte.
        </p>
      </div>

      <h2>19. Plateformes tierces</h2>
      <p>
        WhatsApp, Telegram, Instagram, TikTok et les autres services tiers ne sont pas opérés par Texerra. Leurs marques, systèmes, règles, politiques, algorithmes et mécanismes de vérification appartiennent à leurs opérateurs respectifs.
      </p>
      <p>
        Une modification de ces systèmes peut rendre un numéro auparavant accepté moins efficace ou temporairement inutilisable. Texerra ne contrôle pas les décisions d'une plateforme tierce et ne peut pas garantir une compatibilité permanente.
      </p>

      <h2>20. Utilisation correcte par le client</h2>
      <p>
        Le client doit utiliser les services Texerra de manière légale, responsable et conformément aux présentes CGV et aux Conditions d'utilisation. Il doit également respecter les règles du service tiers avec lequel il utilise le numéro.
      </p>
      <p>
        Lorsque le résultat attendu échoue exclusivement en raison d'une mauvaise utilisation imputable au client, notamment une mauvaise sélection, une mauvaise saisie ou un usage incompatible avec les instructions affichées, Texerra ne peut pas être considérée automatiquement responsable de cet échec, dans la mesure permise par le droit applicable.
      </p>

      <h2>21. Utilisations interdites</h2>
      <div style={styles.danger}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "13px", display: "grid", placeItems: "center", background: "#FFFFFF", color: "#B91C1C", border: "1px solid #FECACA", flexShrink: 0 }}>
            <SvgIcon type="ban" size={20} />
          </div>
          <div>
            <strong style={{ display: "block", color: "#111827", marginBottom: "8px" }}>Il est interdit d'utiliser Texerra notamment pour :</strong>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#4B5563", lineHeight: 1.8, fontSize: "14px" }}>
              <li>la fraude ou l'escroquerie ;</li>
              <li>l'usurpation d'identité ou la tromperie volontaire ;</li>
              <li>le phishing, le spam abusif ou des activités malveillantes ;</li>
              <li>un accès non autorisé à un système ou à des données ;</li>
              <li>la compromission ou la perturbation volontaire d'un service ;</li>
              <li>le contournement malveillant des mécanismes de sécurité d'une plateforme ;</li>
              <li>toute activité contraire aux lois applicables.</li>
            </ul>
          </div>
        </div>
      </div>

      <h2>22. Annulation, interruption ou impossibilité d'exécution</h2>
      <p>
        Une commande peut être interrompue, annulée ou échouer notamment en raison d'un stock devenu indisponible, d'un incident technique, d'un problème chez un fournisseur ou d'une incompatibilité avec le service tiers.
      </p>
      <p>
        Lorsqu'un échec donne lieu à un recrédit automatique, le système retourne le montant concerné sur le solde selon les règles prévues. Lorsqu'une intervention est nécessaire, l'utilisateur peut contacter le support.
      </p>

      <h2>23. Erreur du client</h2>
      <p>
        L'utilisateur doit vérifier les informations de sa commande avant validation, notamment le pays et le service sélectionnés. Une mauvaise sélection, une mauvaise manipulation ou une utilisation contraire aux instructions peut affecter le résultat.
      </p>
      <p>
        Lorsqu'une erreur de l'utilisateur nécessite une intervention du support, celui-ci doit fournir les informations utiles. Texerra examine alors la situation selon les circonstances et les règles applicables, sans garantir automatiquement un remboursement pour toute erreur de manipulation.
      </p>

      <h2>24. Disponibilité des services et dépendance aux fournisseurs</h2>
      <p>
        Certains composants des services Texerra dépendent de fournisseurs externes, notamment pour les numéros, les communications, le paiement et certaines infrastructures techniques. Une panne, une surcharge, une maintenance ou une modification d'un fournisseur peut affecter le service.
      </p>
      <p>
        Texerra met en œuvre les moyens raisonnables dont elle dispose pour maintenir la qualité du service et restaurer les fonctionnalités lorsque cela est possible, mais ne contrôle pas les infrastructures externes.
      </p>

      <h2>25. Moyens de paiement</h2>
      <p>
        Les moyens de paiement proposés dépendent des intégrations disponibles au moment de l'opération. Le paiement peut être traité directement par un prestataire externe selon ses propres conditions.
      </p>
      <p>
        Les informations de paiement auxquelles Texerra a accès dépendent du moyen de paiement utilisé et de l'intégration. En cas d'échec, l'utilisateur doit vérifier le statut de la transaction avant de considérer la recharge comme effectuée.
      </p>

      <h2>26. Preuve et historique des opérations</h2>
      <p>
        Les informations enregistrées dans les systèmes Texerra concernant les commandes, les opérations de solde et les transactions peuvent être utilisées pour suivre le service, sécuriser la plateforme et traiter les réclamations, sous réserve du droit applicable.
      </p>
      <p>
        L'utilisateur doit conserver, lorsqu'il en dispose, les références importantes d'une transaction lorsqu'il souhaite obtenir une assistance.
      </p>

      <h2>27. Réclamations et assistance</h2>
      <p>
        En cas de problème, l'utilisateur est invité à contacter Texerra dès qu'il constate une anomalie. Une demande précise permet généralement une vérification plus rapide.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", margin: "18px 0 26px" }}>
        <FeatureCard icon="support" title="Décrire le problème" text="Expliquez ce qui s'est produit, le service concerné et l'étape à laquelle le problème est apparu." />
        <FeatureCard icon="receipt" title="Fournir la référence" text="Lorsque possible, communiquez la référence de la commande ou de la transaction concernée." />
        <FeatureCard icon="clock" title="Indiquer la date" text="La date et l'heure approximatives de l'opération peuvent aider à retrouver les informations utiles." />
      </div>

      <div style={styles.card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ color: "#6B7280", fontSize: "12px", marginBottom: "4px" }}>Email principal</div>
            <a href="mailto:contact@texerra.site" style={{ fontWeight: 700 }}>contact@texerra.site</a>
          </div>
          <div>
            <div style={{ color: "#6B7280", fontSize: "12px", marginBottom: "4px" }}>Email secondaire</div>
            <a href="mailto:texerra.sms@gmail.com" style={{ fontWeight: 700 }}>texerra.sms@gmail.com</a>
          </div>
          <div>
            <div style={{ color: "#6B7280", fontSize: "12px", marginBottom: "4px" }}>Téléphone</div>
            <a href="tel:+12424542961" style={{ fontWeight: 700 }}>+1 (242) 454-2961</a>
          </div>
        </div>
      </div>

      <h2>28. Limitation de responsabilité liée aux services externes</h2>
      <p>
        Dans la mesure permise par le droit applicable, Texerra ne peut pas garantir ni être tenue responsable d'un résultat qui dépend exclusivement d'une décision d'un service tiers, d'une indisponibilité d'un fournisseur, d'un changement de règles, d'une limitation technique externe ou d'un stock qui n'est plus disponible.
      </p>
      <p>
        Cette limitation ne vise pas à exclure une responsabilité qui ne pourrait légalement être exclue ou limitée. Texerra conserve les obligations qu'elle doit effectivement respecter au titre du service acheté.
      </p>

      <h2>29. Sécurité et prévention des abus</h2>
      <p>
        Texerra peut mettre en place des contrôles destinés à protéger les comptes, les paiements, les commandes, les stocks et l'infrastructure. Une activité présentant un risque pour la plateforme peut entraîner une vérification ou une restriction.
      </p>
      <p>
        Lorsqu'une restriction est nécessaire, Texerra peut demander des informations complémentaires ou prendre les mesures appropriées selon les circonstances et le droit applicable.
      </p>

      <h2>30. Suspension ou fermeture d'un compte</h2>
      <p>
        Un compte peut être temporairement suspendu, limité ou fermé dans les cas prévus par les règles de Texerra, notamment en cas de fraude, tentative de fraude, paiement frauduleux, utilisation abusive, activité illégale, atteinte à la sécurité ou violation des conditions.
      </p>
      <p>
        Lorsqu'une régularisation est possible, Texerra peut demander au client de fournir les informations nécessaires. Certaines mesures peuvent toutefois être immédiates lorsqu'elles sont nécessaires à la sécurité de la plateforme.
      </p>

      <h2>31. Propriété intellectuelle</h2>
      <p>
        Les éléments originaux de Texerra SMS utilisés pour présenter ou faire fonctionner la plateforme, notamment certains textes, éléments graphiques, interfaces et contenus, peuvent être protégés par les droits applicables.
      </p>
      <p>
        Les marques, logos et contenus appartenant aux services tiers restent la propriété de leurs titulaires respectifs. La mention d'un service tiers sur Texerra ne signifie pas qu'il est exploité ou approuvé par son titulaire.
      </p>

      <h2>32. Modification des produits et services</h2>
      <p>
        Texerra peut faire évoluer ses services, ses fournisseurs, les pays disponibles, les références proposées, certaines méthodes de paiement ou certaines fonctionnalités de la plateforme.
      </p>
      <p>
        Une évolution peut être nécessaire à la suite d'un changement technique, d'une contrainte de sécurité, d'une décision d'un fournisseur ou d'une évolution réglementaire. Les informations affichées au moment d'une future commande s'appliqueront à cette nouvelle opération.
      </p>

      <h2>33. Modification des présentes CGV</h2>
      <p>
        Les présentes Conditions générales de vente peuvent être mises à jour afin de refléter l'évolution du service, des pratiques de Texerra ou du cadre applicable. La version publiée sur la plateforme constitue la version de référence pour les opérations couvertes par cette version, dans les limites prévues par le droit applicable.
      </p>
      <p>
        Lorsqu'une modification substantielle nécessite une information ou une acceptation spécifique, Texerra pourra utiliser le mécanisme approprié.
      </p>

      <h2>34. Règlement amiable et litiges</h2>
      <p>
        En cas de difficulté concernant une commande, l'utilisateur est invité à contacter d'abord le support afin de rechercher une solution amiable. Il est recommandé de fournir la référence de la commande ou de la transaction ainsi que les éléments utiles.
      </p>
      <p>
        À défaut de résolution amiable, le litige pourra être soumis aux autorités ou juridictions compétentes conformément au droit applicable, sans préjudice des dispositions impératives susceptibles de protéger l'utilisateur.
      </p>

      <h2>35. Accord du client</h2>
      <div style={{ borderRadius: "20px", background: "#111827", color: "#FFFFFF", padding: "22px", margin: "26px 0 10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "13px", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.10)", flexShrink: 0 }}>
            <SvgIcon type="shield" size={21} />
          </div>
          <div>
            <strong style={{ display: "block", fontSize: "15px", marginBottom: "7px" }}>Avant de confirmer une commande</strong>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", fontSize: "14px", lineHeight: 1.75 }}>
              En utilisant un service payant de Texerra et en validant une commande, vous reconnaissez avoir eu accès aux informations affichées sur la plateforme ainsi qu'aux présentes Conditions générales de vente et vous acceptez de les respecter. Vous comprenez notamment que la réception d'un SMS et l'acceptation d'un numéro par un service tiers ne sont pas garanties à 100 %, que les stocks peuvent varier et que les remboursements applicables sont normalement recrédités sur le solde Texerra.
            </p>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
