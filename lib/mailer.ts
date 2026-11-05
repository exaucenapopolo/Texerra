import { Resend } from "resend";
import { logger } from "./logger.js";
import { GRIZZLY_COUNTRIES } from "./grizzlysms.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Texerra <support@texerra.site>";

const SUPPORT_WA      = "https://wa.me/12424542961";
const SUPPORT_WA_DISP = "+1 (242) 454-2961";
const SUPPORT_EMAIL   = "support@texerra.site";
const SITE_URL        = "https://www.texerra.site";
const PARTNERS = [
  { name: "Social Boost Horizon", description: "Achète tes abonnés moins cher", url: "https://socialboosthorizon.com/" },
  { name: "PATA YAM", description: "Gestion des dépenses avec IA", url: "https://www.pata-yam.site/" },
  { name: "TRIXHUB", description: "Gagne de l’argent gratuitement", url: "https://www.trixhub.store/?ref=EXA0001HJB" },
] as const;
const YEAR            = new Date().getFullYear();

const SERVICE_NAMES: Record<string, string> = {
  wa:"WhatsApp", wb:"WhatsApp Business", ig:"Instagram", tg:"Telegram",
  fb:"Facebook", go:"Google", tk:"TikTok", tw:"Twitter / X",
  ap:"Apple", am:"Amazon", ms:"Microsoft", dc:"Discord",
  sc:"Snapchat", nf:"Netflix", ub:"Uber", ln:"LinkedIn",
  pp:"PayPal", bn:"Binance", vi:"Viber", yt:"YouTube",
  wc:"WeChat", sp:"Spotify", si:"Signal", td:"TikTok",
};

const COUNTRY_NAMES: Record<string, string> = {
  "41":"Cameroun","22":"Côte d'Ivoire","37":"Sénégal","155":"Albanie",
  "6":"France","7":"États-Unis","12":"Russie","27":"Angleterre",
  "29":"Allemagne","30":"Espagne","31":"Italie","38":"Pologne",
  "43":"Ukraine","48":"Inde","62":"Indonésie","70":"Nigéria",
  "72":"Congo RDC","78":"Maroc","84":"Égypte","86":"Kenya",
  "91":"Ghana","96":"Bénin","97":"Togo","98":"Burkina Faso",
  "100":"Mali","102":"Guinée","104":"Gabon","105":"Congo",
  "107":"Madagascar","108":"Mauritanie","109":"Niger",
};

const svcName  = (c: string) => SERVICE_NAMES[c] ?? c.toUpperCase();
const cntName  = (c: string) => COUNTRY_NAMES[c] ?? `Pays #${c}`;
const fmtEur   = (n: number) => n.toFixed(2).replace(".", ",") + "\u00a0€";
const fmtDate  = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString("fr-FR", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char] as string));
}

function countryDetails(countryCode: string): { name: string; flag: string } {
  const normalized = String(countryCode ?? "").trim();
  const country = GRIZZLY_COUNTRIES[Number(normalized)]
    ?? Object.values(GRIZZLY_COUNTRIES).find((item) => item.iso.toUpperCase() === normalized.toUpperCase());
  if (!country) return { name: normalized ? `Pays (${normalized})` : "Pays non renseigné", flag: "🌍" };
  const iso = country.iso.toUpperCase();
  const flag = iso.length === 2
    ? String.fromCodePoint(0x1f1e6 + iso.charCodeAt(0) - 65, 0x1f1e6 + iso.charCodeAt(1) - 65)
    : "🌍";
  return { name: country.fr, flag };
}

// ─── Shell ────────────────────────────────────────────────────────────────────
// Professional white-background design (renders well in all clients)

function shell(preheader: string, _accentLine: string, body: string, dashboardUrl = `${SITE_URL}/dashboard`): string {
  const isCommercialDashboard = dashboardUrl.replace(/\/$/, "").endsWith("/commercial");
  const dashboardTitle = isCommercialDashboard ? "Retrouvez votre espace commercial" : "Retrouvez votre espace Texerra";
  const dashboardDescription = isCommercialDashboard
    ? "Vos clients attribués, vos ventes et le suivi de vos commissions sont accessibles depuis votre espace commercial."
    : "Vos commandes, vos numéros, vos dépôts et votre solde sont accessibles depuis votre tableau de bord.";
  const dashboardButton = isCommercialDashboard ? "Ouvrir mon espace commercial" : "Ouvrir mon tableau de bord";
  const partnerRows = PARTNERS.map((partner) => `
    <tr>
      <td style="padding:13px 0;border-bottom:1px solid #eceff1;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td valign="middle" style="padding-right:12px;">
              <p style="margin:0 0 3px;font-size:14px;line-height:1.4;font-weight:700;color:#20252b;">${escapeHtml(partner.name)}</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#68717b;">${escapeHtml(partner.description)}</p>
            </td>
            <td valign="middle" align="right" width="112">
              <a href="${partner.url}" target="_blank" style="display:inline-block;padding:8px 11px;border:1px solid #d7dce1;border-radius:5px;color:#303943;font-size:11px;line-height:1.2;font-weight:700;text-decoration:none;white-space:nowrap;">Découvrir</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Texerra SMS</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f3f4f6;">${escapeHtml(preheader)}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;padding:28px 12px 36px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;">
  <tr>
    <td align="center" style="padding:4px 0 20px;">
      <a href="${SITE_URL}" style="text-decoration:none;">
        <img src="${SITE_URL}/logo-full.png" width="84" height="84" alt="Logo Texerra" style="display:block;width:84px;max-width:28%;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;"/>
        <span style="display:block;margin-top:8px;font-size:16px;line-height:1.3;font-weight:700;letter-spacing:.2px;color:#25282d;">Texerra SMS</span>
      </a>
    </td>
  </tr>
  <tr><td style="height:3px;background:#f36f16;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr>
    <td style="background:#ffffff;padding:34px 38px 28px;border:1px solid #e3e6e9;border-top:0;">
      ${body}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
        <tr><td style="padding:18px 0 8px;border-top:1px solid #eceff1;">
          <p style="margin:0 0 7px;font-size:14px;font-weight:700;color:#20252b;">${dashboardTitle}</p>
          <p style="margin:0 0 15px;font-size:13px;line-height:1.6;color:#68717b;">${dashboardDescription}</p>
          <a href="${dashboardUrl}" style="display:inline-block;padding:12px 19px;background:#f36f16;border-radius:5px;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;">${dashboardButton}</a>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px;background:#fafafa;border:1px solid #e8ebee;">
        <tr><td style="padding:15px 17px;">
          <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#20252b;">Besoin d’une assistance humaine ?</p>
          <p style="margin:0;font-size:12px;line-height:1.8;color:#68717b;">
            Écrivez-nous sur <a href="${SUPPORT_WA}" target="_blank" style="color:#b94e0c;font-weight:700;text-decoration:underline;">WhatsApp ${SUPPORT_WA_DISP}</a> pour une réponse rapide.<br/>
            Vous pouvez également répondre à cet e-mail ou écrire à <a href="mailto:${SUPPORT_EMAIL}" style="color:#b94e0c;text-decoration:underline;">${SUPPORT_EMAIL}</a>.
          </p>
        </td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:22px 18px 5px;background:#ffffff;border:1px solid #e3e6e9;border-top:0;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#20252b;">Nos partenaires</p>
      <p style="margin:0 0 4px;font-size:11px;line-height:1.5;color:#68717b;">Découvrez également les services de nos partenaires.</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${partnerRows}</table>
    </td>
  </tr>
  <tr><td align="center" style="padding:16px 8px 0;">
    <p style="margin:0;font-size:11px;line-height:1.7;color:#89919a;">
      © ${YEAR} Texerra SMS · <a href="${SITE_URL}" style="color:#89919a;text-decoration:underline;">texerra.site</a> · <a href="${SITE_URL}/faq" style="color:#89919a;text-decoration:underline;">Centre d’aide</a>
    </p>
    <p style="margin:3px 0 0;font-size:10px;line-height:1.6;color:#a1a8af;">Vous recevez cet e-mail à la suite d’une activité liée à votre compte Texerra.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
function btn(label: string, href: string, color = "#f97316") {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:8px;letter-spacing:0.1px;">${label}</a>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#111827;line-height:1.25;">${text}</h1>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${text}</p>`;
}

function badge(_icon: string, label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #e8ebee;">
      <span style="font-size:13px;color:#68717b;">${label}</span>
    </td>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;">
      <span style="font-size:13px;font-weight:700;color:#111827;">${value}</span>
    </td>
  </tr>`;
}

// ─── 1. Bienvenue ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  if (!process.env.RESEND_API_KEY) { logger.warn("RESEND_API_KEY not set"); return; }
  const first = escapeHtml(name.split(" ")[0] || name);

  const body = `
    ${h1(`Bienvenue sur Texerra, ${first}.`)}
    ${p("Votre compte est maintenant prêt. Texerra vous permet de recevoir des codes SMS de vérification pour WhatsApp, Instagram, Telegram, TikTok et plus de 200 services, dans plus de 100 pays.")}
    ${p("Pour commencer, il vous suffit de suivre ces trois étapes :")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;border-collapse:collapse;">
      <tr><td width="28" valign="top" style="padding:9px 8px 9px 0;border-bottom:1px solid #eceff1;font-size:13px;font-weight:700;color:#b94e0c;">01</td><td style="padding:9px 0;border-bottom:1px solid #eceff1;font-size:14px;line-height:1.6;color:#3f4852;"><strong>Approvisionnez votre solde</strong><br/>Orange Money, MTN Mobile Money ou carte bancaire.</td></tr>
      <tr><td width="28" valign="top" style="padding:9px 8px 9px 0;border-bottom:1px solid #eceff1;font-size:13px;font-weight:700;color:#b94e0c;">02</td><td style="padding:9px 0;border-bottom:1px solid #eceff1;font-size:14px;line-height:1.6;color:#3f4852;"><strong>Sélectionnez votre service et votre pays</strong><br/>Choisissez le service que vous souhaitez vérifier et le pays du numéro.</td></tr>
      <tr><td width="28" valign="top" style="padding:9px 8px 9px 0;font-size:13px;font-weight:700;color:#b94e0c;">03</td><td style="padding:9px 0;font-size:14px;line-height:1.6;color:#3f4852;"><strong>Utilisez le numéro et recevez votre code</strong><br/>Le code reçu est affiché dans votre espace Texerra.</td></tr>
    </table>
    ${p("Votre solde n’expire pas. Vous pouvez consulter vos commandes et vos recharges à tout moment depuis votre tableau de bord. Si vous avez besoin d’un conseil avant votre première commande, notre équipe est disponible pour vous accompagner.")}
    <div style="margin-top:4px;">${btn("Accéder aux services Texerra", `${SITE_URL}/order`)}</div>
  `;

  const text = `Bienvenue sur Texerra, ${name.split(" ")[0] || name}.\n\nVotre compte est prêt. Pour commencer :\n1. Approvisionnez votre solde.\n2. Sélectionnez le service et le pays correspondant à votre besoin.\n3. Utilisez le numéro obtenu et saisissez le code SMS lorsqu'il arrive.\n\nAccéder aux services : ${SITE_URL}/order\nCentre d'aide : ${SITE_URL}/faq`;
  await _send(to, "Bienvenue sur Texerra SMS", shell("Votre compte Texerra est prêt", "bienvenue", body), text);
}

// ─── 2. Confirmation de commande ──────────────────────────────────────────────

export async function sendOrderEmail(opts: {
  to: string; name: string; phoneNumber: string; serviceCode: string;
  countryCode: string; priceEur: number; expiresAt: Date|string|null; orderId: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const { to, name, phoneNumber, serviceCode, countryCode, priceEur, expiresAt } = opts;
  const first = name.split(" ")[0] || name;
  const svc = svcName(serviceCode);
  const cnt = cntName(countryCode);

  const body = `
    ${h1(`Votre numéro est prêt, ${first} !`)}
    ${p(`Votre numéro <strong>${svc}</strong> pour ${cnt} est actif. Entrez-le dans l'application pour recevoir votre code de vérification.`)}

    <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background:#f9fafb;border:2px solid #f97316;border-radius:12px;padding:0;margin:20px 0 28px;overflow:hidden;">
      <tr>
        <td style="padding:12px 20px;background:#fff7ed;border-bottom:1px solid #fed7aa;">
          <span style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">Votre numéro de téléphone</span>
        </td>
      </tr>
      <tr>
        <td style="padding:20px;text-align:center;">
          <div style="font-size:30px;font-weight:900;color:#111827;letter-spacing:3px;font-family:'Courier New',monospace;">${phoneNumber}</div>
          <div style="margin-top:8px;font-size:13px;color:#6b7280;">${svc} &nbsp;·&nbsp; ${cnt}</div>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:28px;">
      ${badge("📱", "Service", svc)}
      ${badge("🌍", "Pays", cnt)}
      ${badge("💳", "Montant débité", fmtEur(priceEur))}
      ${badge("⏱️", "Expire le", fmtDate(expiresAt))}
    </table>

    ${p("Le code de vérification apparaîtra automatiquement sur votre <strong>tableau de bord</strong> dès réception — généralement en moins de 60 secondes.")}
    ${btn("Voir ma commande sur le tableau de bord →", `${SITE_URL}/dashboard`)}
  `;

  const text = `Commande confirmée !\n\nNuméro : ${phoneNumber}\nService : ${svc} | Pays : ${cnt}\nPrix : ${fmtEur(priceEur)} | Expire : ${fmtDate(expiresAt)}\n\nTableau de bord : ${SITE_URL}/dashboard\nSupport : ${SUPPORT_WA_DISP} | ${SUPPORT_EMAIL}`;
  await _send(to, `✅ Votre numéro ${svc} est prêt — ${phoneNumber}`, shell(`Numéro ${phoneNumber} activé pour ${svc}`, "commande", body), text);
}

// ─── Réception du code SMS ─────────────────────────────────────────────────────

export async function sendSmsCodeEmail(opts: {
  to: string;
  name: string;
  phoneNumber: string;
  serviceCode: string;
  countryCode: string;
  smsCode: string;
  orderId: string;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not set; SMS code email skipped");
    return false;
  }
  const first = escapeHtml((opts.name || "Bonjour").trim().split(/\s+/)[0]);
  const service = escapeHtml(svcName(opts.serviceCode));
  const country = countryDetails(opts.countryCode);
  const countryName = escapeHtml(country.name);
  const phone = escapeHtml(opts.phoneNumber);
  const code = escapeHtml(opts.smsCode);
  const body = `
    ${h1(`Votre code est arrivé${first ? `, ${first}` : ""}.`)}
    ${p(`Nous venons de recevoir le SMS associé à votre commande <strong>${service}</strong>. Vous pouvez maintenant saisir le code ci-dessous dans l'application ou le service que vous avez choisi.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border:1px solid #e5e7eb;background:#f8f8f8;border-collapse:collapse;">
      <tr><td style="padding:10px 16px;text-align:center;color:#555d66;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">Code de vérification</td></tr>
      <tr><td style="padding:8px 16px 20px;text-align:center;"><div style="font-family:Courier New,monospace;font-size:32px;font-weight:700;letter-spacing:5px;color:#f36f16;">${code}</div></td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eceff1;font-size:13px;color:#68717b;">Service</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eceff1;font-size:13px;font-weight:700;color:#303943;">${service}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eceff1;font-size:13px;color:#68717b;">Pays</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eceff1;font-size:13px;font-weight:700;color:#303943;">${escapeHtml(country.flag)} ${countryName}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eceff1;font-size:13px;color:#68717b;">Numéro</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eceff1;font-size:13px;font-weight:700;color:#303943;">${phone}</td></tr>
      <tr><td style="padding:8px 0;font-size:13px;color:#68717b;">Référence</td><td align="right" style="padding:8px 0;font-size:13px;font-weight:700;color:#303943;">${escapeHtml(opts.orderId.slice(0, 12))}</td></tr>
    </table>
    ${p(`<strong>Pour terminer votre vérification :</strong><br/>Ouvrez ${service}, reprenez l'inscription ou la connexion en cours, puis saisissez le code ci-dessus dans le champ prévu à cet effet.`)}
    ${p("Pour votre sécurité, ne partagez jamais ce code. Texerra SMS ne vous le demandera jamais par téléphone ou par message.")}
  `;
  const text = `Bonjour ${opts.name || ""},

Votre code de vérification est arrivé.

Code : ${opts.smsCode}
Service : ${svcName(opts.serviceCode)}
Pays : ${country.flag} ${country.name}
Numéro : ${opts.phoneNumber}
Référence : ${opts.orderId.slice(0, 12)}

Ouvrez ${svcName(opts.serviceCode)} et saisissez ce code dans le champ de vérification. Ne le communiquez à personne.`;
  const { error } = await resend.emails.send({
    from: FROM,
    replyTo: SUPPORT_EMAIL,
    to: opts.to,
    subject: `Votre code ${svcName(opts.serviceCode)} est arrivé — Texerra`,
    html: shell("Votre code de vérification vient d'être reçu", "code SMS reçu", body),
    text: `${text}${plainTextFooter()}`,
  });
  if (error) {
    logger.warn({ error, to: opts.to, orderId: opts.orderId }, "SMS code email failed");
    return false;
  }
  logger.info({ to: opts.to, orderId: opts.orderId }, "SMS code email sent");
  return true;
}

// ─── E-mail de contact envoyé depuis l'administration ─────────────────────────

export async function sendAdminContactEmail(opts: {
  to: string;
  name: string;
  subject: string;
  message: string;
  contextLabel?: string;
  dashboardUrl?: string;
}): Promise<{ success: boolean; id?: string }> {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY n'est pas configurée sur le serveur.");
  const safeName = escapeHtml(opts.name || "cher client");
  const safeSubject = escapeHtml(opts.subject);
  const lines = String(opts.message || "").trim().split(/\n/);
  const paragraphs = lines.reduce<string[]>((acc, line) => {
    if (!line.trim()) { if (acc.length && acc[acc.length - 1] !== "") acc.push(""); return acc; }
    if (!acc.length || acc[acc.length - 1] === "") acc.push(escapeHtml(line));
    else acc[acc.length - 1] += `<br/>${escapeHtml(line)}`;
    return acc;
  }, []).filter(Boolean).map((line) => `<p style="margin:0 0 15px;font-size:14px;line-height:1.8;color:#3f4852;">${line}</p>`).join("");
  const body = `${h1(`Bonjour ${safeName},`)}${paragraphs}<p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#3f4852;">Bien cordialement,<br/><strong>L’équipe Texerra SMS</strong></p>`;
  const dashboardUrl = opts.dashboardUrl || `${SITE_URL}/dashboard`;
  const plainText = `Bonjour ${opts.name || "cher client"},\n\n${opts.message}\n\nBien cordialement,\nL'équipe Texerra SMS${plainTextFooter(dashboardUrl)}`;
  const { data, error } = await resend.emails.send({
    from: FROM,
    replyTo: SUPPORT_EMAIL,
    to: opts.to,
    subject: opts.subject,
    html: shell(safeSubject, "contact", body, dashboardUrl),
    text: plainText,
  });
  if (error) {
    logger.warn({ error, to: opts.to, subject: opts.subject }, "Admin contact email failed");
    throw new Error("Resend n'a pas pu envoyer cet e-mail.");
  }
  logger.info({ to: opts.to, subject: opts.subject }, "Admin contact email sent");
  return { success: true, id: data?.id };
}

// ─── Félicitations au commercial après une vente attribuée ─────────────────────

export async function sendCommissionEarnedEmail(opts: {
  to: string;
  name: string;
  orderId: string;
  orderAmount: number;
  orderMargin: number;
  commissionRate: number;
  commissionAmount: number;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const first = escapeHtml((opts.name || "Bonjour").trim().split(/\s+/)[0]);
  const body = `
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:26px;">
      <p style="margin:0;font-size:12px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:.7px;">Nouvelle vente attribuée</p>
    </div>
    ${h1(`Bravo ${first} !`)}
    ${p("Une nouvelle commande vient d'être finalisée grâce à votre lien ou à votre recommandation. Merci pour votre travail et votre engagement auprès de Texerra.")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
      ${badge("✓", "Commande", escapeHtml(opts.orderId.slice(0, 12)))}
      ${badge("€", "Vente réalisée", fmtEur(opts.orderAmount))}
      ${badge("↗", "Marge générée pour Texerra", fmtEur(opts.orderMargin))}
      ${badge("%", `Votre part (${opts.commissionRate}% de la marge)`, fmtEur(opts.commissionAmount))}
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px;margin-bottom:22px;">
      <p style="margin:0 0 4px;font-size:12px;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:.6px;">Commission générée</p>
      <p style="margin:0;font-size:28px;color:#14532d;font-weight:900;">${fmtEur(opts.commissionAmount)}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#166534;">Cette commission est enregistrée dans votre espace commercial.</p>
    </div>
    ${p("Continuez à partager votre lien et à accompagner vos clients. Chaque commande réussie peut contribuer à faire progresser vos commissions.")}
    ${btn("Consulter mon espace commercial →", `${SITE_URL}/commercial`)}
  `;
  const text = `Bravo ${opts.name} !\n\nNouvelle vente attribuée.\nCommande : ${opts.orderId}\nVente : ${fmtEur(opts.orderAmount)}\nMarge Texerra : ${fmtEur(opts.orderMargin)}\nVotre commission (${opts.commissionRate} %) : ${fmtEur(opts.commissionAmount)}\n\nConsultez votre espace : ${SITE_URL}/commercial`;
  const commercialDashboard = `${SITE_URL}/commercial`;
  const { error } = await resend.emails.send({
    from: FROM,
    replyTo: SUPPORT_EMAIL,
    to: opts.to,
    subject: `Bravo ${opts.name.split(" ")[0]} ! Une nouvelle commission vient d'être générée`,
    html: shell("Une nouvelle vente vient de générer une commission", "commission commerciale", body, commercialDashboard),
    text: `${text}${plainTextFooter(commercialDashboard)}`,
  });
  if (error) {
    logger.warn({ error, to: opts.to, orderId: opts.orderId }, "Commission email failed");
    return false;
  }
  logger.info({ to: opts.to, orderId: opts.orderId }, "Commission email sent");
  return true;
}

// ─── 3. Annulation de commande ────────────────────────────────────────────────

export async function sendCancellationEmail(opts: {
  to: string; name: string; phoneNumber: string; serviceCode: string;
  countryCode: string; refundEur: number | null; orderId: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const { to, name, phoneNumber, serviceCode, countryCode, refundEur } = opts;
  const first = name.split(" ")[0] || name;
  const svc = svcName(serviceCode);
  const cnt = cntName(countryCode);

  const body = `
    <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">Commande annulée</p>
    </div>

    ${h1(`Commande annulée, ${first}`)}
    ${p(`Votre commande pour le numéro <strong style="font-family:'Courier New',monospace;">${phoneNumber}</strong> (${svc} — ${cnt}) a été annulée.`)}

    <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:28px;">
      ${badge("📱", "Service", svc)}
      ${badge("🌍", "Pays", cnt)}
      ${badge("📞", "Numéro", phoneNumber)}
      ${refundEur ? badge("↩️", "Remboursé sur votre solde", fmtEur(refundEur)) : ""}
    </table>

    ${refundEur
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#166534;"><strong>${fmtEur(refundEur)}</strong> ont été remboursés sur votre solde Texerra. Votre solde ne expire jamais.</p>
        </div>`
      : ""}

    ${p("Vous pouvez commander un nouveau numéro à tout moment.")}
    ${btn("Commander un nouveau numéro →", `${SITE_URL}/order`)}
  `;

  const text = `Commande annulée\n\nNuméro : ${phoneNumber} | Service : ${svc} | Pays : ${cnt}\n${refundEur ? `Remboursé : ${fmtEur(refundEur)}\n` : ""}Commander à nouveau : ${SITE_URL}/order\nSupport : ${SUPPORT_WA_DISP} | ${SUPPORT_EMAIL}`;
  await _send(to, `❌ Commande ${svc} annulée — ${phoneNumber}`, shell(`Votre commande ${phoneNumber} a été annulée`, "annulation", body), text);
}

// ─── 4. Statut recharge ───────────────────────────────────────────────────────

export async function sendTopupEmail(opts: {
  to: string; name: string; amountEur: number; status: "credited"|"failed"|"pending";
}) {
  if (!process.env.RESEND_API_KEY) return;
  const { to, name, amountEur, status } = opts;
  const first = name.split(" ")[0] || name;

  if (status === "credited") {
    const body = `
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;">Recharge confirmée</p>
      </div>

      ${h1(`Recharge réussie, ${first} ! 💳`)}

      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;margin:20px 0 28px;">
        <tr>
          <td style="padding:12px 20px;background:#dcfce7;border-bottom:1px solid #bbf7d0;">
            <span style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:1px;">Montant crédité</span>
          </td>
        </tr>
        <tr>
          <td style="padding:20px;text-align:center;">
            <div style="font-size:36px;font-weight:900;color:#15803d;">${fmtEur(amountEur)}</div>
            <div style="margin-top:6px;font-size:13px;color:#6b7280;">Solde rechargé avec succès · Ne expire jamais</div>
          </td>
        </tr>
      </table>

      ${p("Votre solde est disponible immédiatement. Commandez un numéro virtuel dès maintenant.")}
      ${btn("Commander un numéro →", `${SITE_URL}/order`)}
    `;
    const text = `Recharge confirmée — ${fmtEur(amountEur)} crédités.\nCommander : ${SITE_URL}/order\nSupport : ${SUPPORT_WA_DISP} | ${SUPPORT_EMAIL}`;
    await _send(to, `✅ Recharge confirmée — ${fmtEur(amountEur)} crédités`, shell(`${fmtEur(amountEur)} ont été ajoutés à votre solde Texerra`, "recharge", body), text);
    return;
  }

  if (status === "failed") {
    const body = `
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.5px;">Paiement non abouti</p>
      </div>

      ${h1(`Paiement non abouti`)}
      ${p(`Votre paiement de <strong>${fmtEur(amountEur)}</strong> n'a pas pu être confirmé. Votre solde n'a <strong>pas été modifié</strong>.`)}

      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background:#fef2f2;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <tr><td style="font-size:14px;color:#7f1d1d;line-height:1.7;">
          Causes possibles : paiement annulé, délai expiré, solde Mobile Money insuffisant ou problème réseau. <strong>Si votre argent a été débité</strong>, contactez-nous immédiatement sur WhatsApp.
        </td></tr>
      </table>

      ${btn("Réessayer la recharge →", `${SITE_URL}/wallet`)}
    `;
    const text = `Paiement non abouti — ${fmtEur(amountEur)}\nVotre solde n'a pas été modifié.\nRéessayer : ${SITE_URL}/wallet\nSupport : ${SUPPORT_WA_DISP} | ${SUPPORT_EMAIL}`;
    await _send(to, `❌ Paiement non abouti — ${fmtEur(amountEur)}`, shell(`Votre paiement de ${fmtEur(amountEur)} n'a pas abouti`, "echec", body), text);
  }
}

// ─── Pied de page commun en texte brut ────────────────────────────────────────

function plainTextFooter(dashboardUrl = `${SITE_URL}/dashboard`): string {
  return `\n\nVotre tableau de bord : ${dashboardUrl}\nSupport WhatsApp : ${SUPPORT_WA} (${SUPPORT_WA_DISP})\nSupport e-mail : ${SUPPORT_EMAIL}\n\nNos partenaires :\n${PARTNERS.map((partner) => `${partner.name} — ${partner.description} : ${partner.url}`).join("\n")}`;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function _send(to: string, subject: string, html: string, text: string) {
  try {
    const { error } = await resend.emails.send({ from: FROM, replyTo: SUPPORT_EMAIL, to, subject, html, text: `${text}${plainTextFooter()}` });
    if (error) logger.warn({ error, to, subject }, "Resend error");
    else logger.info({ to, subject }, "Email sent");
  } catch (err) {
    logger.warn({ err, to, subject }, "Failed to send email");
  }
}
