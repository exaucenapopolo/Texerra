import { Resend } from "resend";
import { logger } from "./logger.js";
import { GRIZZLY_COUNTRIES } from "./grizzlysms.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Texerra <support@texerra.site>";

const SUPPORT_WA      = "https://wa.me/12424542961";
const SUPPORT_WA_DISP = "+1 (242) 454-2961";
const SUPPORT_EMAIL   = "support@texerra.site";
const SITE_URL        = "https://texerra.site";
const PARTNER_URL     = "https://socialboosthorizon.com/";
const PARTNER_NAME    = "Social Boost Horizon";
const PARTNER_SLOGAN  = "Votre visibilité, notre horizon";
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

function shell(preheader: string, accentLine: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Texerra</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f4f5;">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f5;padding:32px 16px 48px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

  <!-- Brand header -->
  <tr>
    <td align="center" style="padding-bottom:24px;">
      <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#111827;">
        <span style="color:#f97316;">●</span> Texerra
      </div>
    </td>
  </tr>

  <!-- Accent bar -->
  <tr>
    <td style="height:4px;background:linear-gradient(90deg,#f97316,#fb923c);border-radius:4px 4px 0 0;"></td>
  </tr>

  <!-- Card -->
  <tr>
    <td style="background:#ffffff;border-radius:0 0 12px 12px;padding:40px 48px;border:1px solid #e5e7eb;border-top:none;">
      ${body}

      <!-- Divider -->
      <div style="height:1px;background:#f3f4f6;margin:32px 0;"></div>

      <!-- Support block -->
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
        <tr>
          <td style="background:#fafafa;border:1px solid #f3f4f6;border-radius:10px;padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;">Support client</p>
            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
              <a href="${SUPPORT_WA}" style="color:#f97316;text-decoration:none;font-weight:600;">WhatsApp ${SUPPORT_WA_DISP}</a>
              &nbsp;·&nbsp;
              <a href="mailto:${SUPPORT_EMAIL}" style="color:#6b7280;text-decoration:none;">${SUPPORT_EMAIL}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Partner footer -->
  <tr>
    <td style="padding:24px 0 4px;">
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background:#fffbf5;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;">
        <tr>
          <td>
            <p style="margin:0 0 4px;font-size:14px;color:#111827;line-height:1.6;">
              🌐 <strong>Vous souhaitez devenir viral sur les réseaux sociaux ?</strong>
            </p>
            <p style="margin:0 0 8px;font-size:13px;color:#78350f;line-height:1.5;">
              Notre partenaire a ce qu'il vous faut — rapide et fiable.
            </p>
            <p style="margin:0;font-size:13px;">
              👉 <a href="${PARTNER_URL}" style="color:#c2410c;font-weight:700;text-decoration:none;">Consulter ${PARTNER_URL}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Legal footer -->
  <tr>
    <td style="padding-top:16px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
        © ${YEAR} Texerra &nbsp;·&nbsp;
        <a href="${SITE_URL}" style="color:#9ca3af;text-decoration:none;">texerra.site</a>
        &nbsp;·&nbsp;
        <a href="${SITE_URL}/faq" style="color:#9ca3af;text-decoration:none;">FAQ</a>
      </p>
    </td>
  </tr>

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

function badge(icon: string, label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
      <span style="font-size:13px;color:#6b7280;">${icon} ${label}</span>
    </td>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;">
      <span style="font-size:13px;font-weight:700;color:#111827;">${value}</span>
    </td>
  </tr>`;
}

// ─── 1. Bienvenue ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  if (!process.env.RESEND_API_KEY) { logger.warn("RESEND_API_KEY not set"); return; }
  const first = name.split(" ")[0] || name;

  const body = `
    ${h1(`Bienvenue sur Texerra, ${first} ! 🎉`)}
    ${p("Ton compte est prêt. Reçois tes codes SMS de vérification pour <strong>WhatsApp, Instagram, Telegram, TikTok</strong> et +200 services — en moins de 60&nbsp;secondes, payé en <strong>Orange Money, MTN</strong> ou carte bancaire.")}

    <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin:20px 0 28px;">
      <tr>
        <td style="width:36px;height:36px;background:#fff7ed;border-radius:50%;text-align:center;vertical-align:middle;border:2px solid #f97316;">
          <span style="font-size:13px;font-weight:800;color:#f97316;">1</span>
        </td>
        <td style="padding-left:14px;font-size:14px;color:#374151;vertical-align:middle;">
          <strong style="color:#111827;">Rechargez votre solde</strong> — Orange Money, MTN Mobile Money, carte bancaire
        </td>
      </tr>
      <tr><td colspan="2" style="height:10px;"></td></tr>
      <tr>
        <td style="width:36px;height:36px;background:#fff7ed;border-radius:50%;text-align:center;vertical-align:middle;border:2px solid #f97316;">
          <span style="font-size:13px;font-weight:800;color:#f97316;">2</span>
        </td>
        <td style="padding-left:14px;font-size:14px;color:#374151;vertical-align:middle;">
          <strong style="color:#111827;">Choisissez service &amp; pays</strong> — WhatsApp, Instagram, Telegram, TikTok…
        </td>
      </tr>
      <tr><td colspan="2" style="height:10px;"></td></tr>
      <tr>
        <td style="width:36px;height:36px;background:#fff7ed;border-radius:50%;text-align:center;vertical-align:middle;border:2px solid #f97316;">
          <span style="font-size:13px;font-weight:800;color:#f97316;">3</span>
        </td>
        <td style="padding-left:14px;font-size:14px;color:#374151;vertical-align:middle;">
          <strong style="color:#111827;">Recevez le code SMS</strong> — livré en temps réel sur votre tableau de bord
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="background:#f9fafb;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <tr><td style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:12px;">Pourquoi choisir Texerra ?</td></tr>
      <tr><td style="font-size:14px;color:#374151;padding:4px 0;">✅&nbsp; Paiement <strong>Orange Money, MTN, Airtel, Wave</strong></td></tr>
      <tr><td style="font-size:14px;color:#374151;padding:4px 0;">✅&nbsp; +200 services · +100 pays disponibles</td></tr>
      <tr><td style="font-size:14px;color:#374151;padding:4px 0;">✅&nbsp; SMS livré en moins de <strong>60 secondes</strong></td></tr>
      <tr><td style="font-size:14px;color:#374151;padding:4px 0;">✅&nbsp; Votre solde <strong>n'expire jamais</strong></td></tr>
      <tr><td style="font-size:14px;color:#374151;padding:4px 0;">✅&nbsp; Support en français disponible 7j/7</td></tr>
    </table>

    ${p(`Des questions ? Consultez notre <a href="${SITE_URL}/faq" style="color:#f97316;font-weight:600;text-decoration:none;">FAQ</a> ou contactez notre équipe sur WhatsApp.`)}
    <div style="margin-top:4px;">${btn("Commander mon premier numéro →", `${SITE_URL}/order`)}</div>
  `;

  const text = `Bienvenue sur Texerra, ${first} !\n\n1. Rechargez votre solde (Orange Money, MTN, carte)\n2. Choisissez service & pays\n3. Recevez le SMS en 60 secondes\n\nCommander : ${SITE_URL}/order | FAQ : ${SITE_URL}/faq\nSupport : ${SUPPORT_WA_DISP} | ${SUPPORT_EMAIL}\n\nPartenaire : ${PARTNER_NAME} — ${PARTNER_SLOGAN}\n${PARTNER_URL}`;
  await _send(to, "Bienvenue sur Texerra 🎉", shell("Ton compte est prêt — reçois tes premiers codes SMS en 60 secondes", "bienvenue", body), text);
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
    <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:0.5px;">Commande confirmée</p>
    </div>

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

  const text = `Commande confirmée !\n\nNuméro : ${phoneNumber}\nService : ${svc} | Pays : ${cnt}\nPrix : ${fmtEur(priceEur)} | Expire : ${fmtDate(expiresAt)}\n\nTableau de bord : ${SITE_URL}/dashboard\nSupport : ${SUPPORT_WA_DISP} | ${SUPPORT_EMAIL}\n\nPartenaire : ${PARTNER_NAME} — ${PARTNER_SLOGAN}\n${PARTNER_URL}`;
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
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:26px;">
      <p style="margin:0;font-size:12px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:.7px;">Votre code SMS est arrivé</p>
    </div>
    ${h1(`Bonne nouvelle${first ? `, ${first}` : ""} !`)}
    ${p(`Le SMS destiné à votre commande <strong>${service}</strong> vient d'être reçu. Vous pouvez maintenant utiliser le code ci-dessous dans l'application ou le service que vous avez choisi.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin:22px 0;">
      <tr><td style="padding:12px 18px;text-align:center;color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Code de vérification</td></tr>
      <tr><td style="padding:8px 18px 20px;text-align:center;"><div style="font-family:Courier New,monospace;font-size:34px;font-weight:900;letter-spacing:5px;color:#14532d;">${code}</div></td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
      ${badge("📱", "Service choisi", service)}
      ${badge(country.flag, "Pays", countryName)}
      ${badge("☎", "Numéro utilisé", phone)}
      ${badge("#", "Référence", escapeHtml(opts.orderId.slice(0, 12)))}
    </table>
    ${p(`<strong>Que faire maintenant ?</strong><br>1. Ouvrez ${service}.<br>2. Reprenez l'inscription ou la connexion que vous étiez en train d'effectuer.<br>3. Saisissez le code ci-dessus dans le champ de vérification.`)}
    ${p("Pour votre sécurité, ne communiquez jamais ce code à une autre personne. Texerra ne vous le demandera pas par téléphone ou par message.")}
    <div style="margin-top:6px;">${btn("Retrouver ma commande →", `${SITE_URL}/dashboard`)}</div>
  `;
  const text = `Votre code SMS Texerra est arrivé.

Service : ${svcName(opts.serviceCode)}
Pays : ${country.flag} ${country.name}
Numéro : ${opts.phoneNumber}
Code : ${opts.smsCode}

Ouvrez ${svcName(opts.serviceCode)} et saisissez ce code dans le champ de vérification. Ne le communiquez à personne.

Ma commande : ${SITE_URL}/dashboard
Support : ${SUPPORT_EMAIL}`;
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Votre code ${svcName(opts.serviceCode)} est arrivé — Texerra`,
    html: shell("Votre code de vérification vient d'être reçu", "code SMS reçu", body),
    text,
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
}): Promise<{ success: boolean; id?: string }> {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY n'est pas configurée sur le serveur.");
  const name = escapeHtml(opts.name || "cher client");
  const safeSubject = escapeHtml(opts.subject);
  const paragraphs = String(opts.message || "").trim().split(/\n{2,}/).map((part) =>
    `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.75;">${escapeHtml(part).replace(/\n/g, "<br>")}</p>`
  ).join("");
  const context = opts.contextLabel
    ? `<p style="margin:0 0 18px;font-size:12px;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 13px;">${escapeHtml(opts.contextLabel)}</p>`
    : "";
  const body = `${h1(`Bonjour ${name},`)}${context}${paragraphs}<p style="margin:20px 0 0;font-size:14px;color:#374151;line-height:1.7;">Bien cordialement,<br><strong>L'équipe Texerra SMS</strong></p>`;
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: shell(safeSubject, "communication client", body),
    text: `Bonjour ${opts.name || "cher client"},\n\n${opts.message}\n\nBien cordialement,\nL'équipe Texerra SMS\n${SITE_URL}`,
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
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Bravo ${opts.name.split(" ")[0]} ! Une nouvelle commission vient d'être générée`,
    html: shell("Une nouvelle vente vient de générer une commission", "commission commerciale", body),
    text,
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

  const text = `Commande annulée\n\nNuméro : ${phoneNumber} | Service : ${svc} | Pays : ${cnt}\n${refundEur ? `Remboursé : ${fmtEur(refundEur)}\n` : ""}Commander à nouveau : ${SITE_URL}/order\nSupport : ${SUPPORT_WA_DISP} | ${SUPPORT_EMAIL}\n\nPartenaire : ${PARTNER_NAME} — ${PARTNER_SLOGAN}\n${PARTNER_URL}`;
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
    const text = `Recharge confirmée — ${fmtEur(amountEur)} crédités.\nCommander : ${SITE_URL}/order\nSupport : ${SUPPORT_WA_DISP} | ${SUPPORT_EMAIL}\n\nPartenaire : ${PARTNER_NAME} — ${PARTNER_SLOGAN}\n${PARTNER_URL}`;
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
    const text = `Paiement non abouti — ${fmtEur(amountEur)}\nVotre solde n'a pas été modifié.\nRéessayer : ${SITE_URL}/wallet\nSupport : ${SUPPORT_WA_DISP} | ${SUPPORT_EMAIL}\n\nPartenaire : ${PARTNER_NAME} — ${PARTNER_SLOGAN}\n${PARTNER_URL}`;
    await _send(to, `❌ Paiement non abouti — ${fmtEur(amountEur)}`, shell(`Votre paiement de ${fmtEur(amountEur)} n'a pas abouti`, "echec", body), text);
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function _send(to: string, subject: string, html: string, text: string) {
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
    if (error) logger.warn({ error, to, subject }, "Resend error");
    else logger.info({ to, subject }, "Email sent");
  } catch (err) {
    logger.warn({ err, to, subject }, "Failed to send email");
  }
}
