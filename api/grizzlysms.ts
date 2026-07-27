const BASE = "https://grizzlysms.com/stubs/handler_api.php";

function key(): string {
  const k = process.env.GRIZZLYSMS_API_KEY;
  if (!k) throw new Error("GRIZZLYSMS_API_KEY is not set");
  return k;
}

async function call(params: Record<string, string | number>): Promise<string> {
  const qs = new URLSearchParams({ api_key: key(), ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error(`GrizzlySMS HTTP ${res.status}`);
  return res.text();
}

async function callJson<T>(params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams({ api_key: key(), ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error(`GrizzlySMS HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Country mapping ──────────────────────────────────────────────────────────

export interface GrizzlyCountry {
  id: number;
  eng: string;
  iso: string;
  visible: number;
}

// grizzlysms numeric ID → ISO code + French name
export const GRIZZLY_COUNTRIES: Record<number, { iso: string; fr: string }> = {
  // Africa
  8:   { iso: "KE", fr: "Kenya" },
  9:   { iso: "TZ", fr: "Tanzanie" },
  18:  { iso: "CD", fr: "RD Congo" },
  19:  { iso: "NG", fr: "Nigeria" },
  21:  { iso: "EG", fr: "Égypte" },
  27:  { iso: "CI", fr: "Côte d'Ivoire" },
  28:  { iso: "GM", fr: "Gambie" },
  31:  { iso: "ZA", fr: "Afrique du Sud" },
  37:  { iso: "MA", fr: "Maroc" },
  38:  { iso: "GH", fr: "Ghana" },
  41:  { iso: "CM", fr: "Cameroun" },
  58:  { iso: "DZ", fr: "Algérie" },
  61:  { iso: "SN", fr: "Sénégal" },
  68:  { iso: "GN", fr: "Guinée" },
  69:  { iso: "ML", fr: "Mali" },
  71:  { iso: "ET", fr: "Éthiopie" },
  75:  { iso: "UG", fr: "Ouganda" },
  76:  { iso: "AO", fr: "Angola" },
  80:  { iso: "MZ", fr: "Mozambique" },
  89:  { iso: "TN", fr: "Tunisie" },
  96:  { iso: "ZW", fr: "Zimbabwe" },
  99:  { iso: "TG", fr: "Togo" },
  114: { iso: "MR", fr: "Mauritanie" },
  115: { iso: "SL", fr: "Sierra Leone" },
  119: { iso: "BI", fr: "Burundi" },
  120: { iso: "BJ", fr: "Bénin" },
  125: { iso: "CF", fr: "Centrafrique" },
  130: { iso: "GW", fr: "Guinée-Bissau" },
  136: { iso: "LS", fr: "Lesotho" },
  137: { iso: "MW", fr: "Malawi" },
  138: { iso: "NA", fr: "Namibie" },
  139: { iso: "NE", fr: "Niger" },
  140: { iso: "RW", fr: "Rwanda" },
  142: { iso: "SR", fr: "Suriname" },
  147: { iso: "ZM", fr: "Zambie" },
  149: { iso: "SO", fr: "Somalie" },
  150: { iso: "CG", fr: "Congo" },
  152: { iso: "BF", fr: "Burkina Faso" },
  154: { iso: "GA", fr: "Gabon" },
  157: { iso: "MU", fr: "Maurice" },
  167: { iso: "GQ", fr: "Guinée Équatoriale" },
  168: { iso: "DJ", fr: "Djibouti" },
  176: { iso: "ER", fr: "Érythrée" },
  177: { iso: "SS", fr: "Soudan du Sud" },
  184: { iso: "SC", fr: "Seychelles" },
  186: { iso: "CV", fr: "Cap-Vert" },
  // Europe
  1:   { iso: "UA", fr: "Ukraine" },
  15:  { iso: "PL", fr: "Pologne" },
  23:  { iso: "IE", fr: "Irlande" },
  29:  { iso: "RS", fr: "Serbie" },
  32:  { iso: "RO", fr: "Roumanie" },
  34:  { iso: "EE", fr: "Estonie" },
  43:  { iso: "DE", fr: "Allemagne" },
  44:  { iso: "LT", fr: "Lituanie" },
  45:  { iso: "HR", fr: "Croatie" },
  46:  { iso: "SE", fr: "Suède" },
  48:  { iso: "NL", fr: "Pays-Bas" },
  49:  { iso: "LV", fr: "Lettonie" },
  50:  { iso: "AT", fr: "Autriche" },
  51:  { iso: "BY", fr: "Biélorussie" },
  56:  { iso: "ES", fr: "Espagne" },
  59:  { iso: "SI", fr: "Slovénie" },
  63:  { iso: "CZ", fr: "Tchéquie" },
  77:  { iso: "CY", fr: "Chypre" },
  78:  { iso: "FR", fr: "France" },
  82:  { iso: "BE", fr: "Belgique" },
  83:  { iso: "BG", fr: "Bulgarie" },
  84:  { iso: "HU", fr: "Hongrie" },
  85:  { iso: "MD", fr: "Moldavie" },
  86:  { iso: "IT", fr: "Italie" },
  117: { iso: "PT", fr: "Portugal" },
  128: { iso: "GE", fr: "Géorgie" },
  141: { iso: "SK", fr: "Slovaquie" },
  165: { iso: "LU", fr: "Luxembourg" },
  173: { iso: "CH", fr: "Suisse" },
  174: { iso: "NO", fr: "Norvège" },
  163: { iso: "FI", fr: "Finlande" },
  172: { iso: "DK", fr: "Danemark" },
  199: { iso: "MT", fr: "Malte" },
  // Americas
  12:  { iso: "US", fr: "États-Unis (2)" },
  33:  { iso: "CO", fr: "Colombie" },
  36:  { iso: "CA", fr: "Canada" },
  39:  { iso: "AR", fr: "Argentine" },
  54:  { iso: "MX", fr: "Mexique" },
  65:  { iso: "PE", fr: "Pérou" },
  70:  { iso: "VE", fr: "Venezuela" },
  73:  { iso: "BR", fr: "Brésil" },
  87:  { iso: "PY", fr: "Paraguay" },
  88:  { iso: "HN", fr: "Honduras" },
  90:  { iso: "NI", fr: "Nicaragua" },
  92:  { iso: "BO", fr: "Bolivie" },
  93:  { iso: "CR", fr: "Costa Rica" },
  94:  { iso: "GT", fr: "Guatemala" },
  97:  { iso: "PR", fr: "Porto Rico" },
  101: { iso: "SV", fr: "Salvador" },
  104: { iso: "TT", fr: "Trinité-et-Tobago" },
  105: { iso: "EC", fr: "Équateur" },
  109: { iso: "DO", fr: "Rép. Dominicaine" },
  112: { iso: "PA", fr: "Panama" },
  151: { iso: "CL", fr: "Chili" },
  156: { iso: "UY", fr: "Uruguay" },
  160: { iso: "GP", fr: "Guadeloupe" },
  162: { iso: "GF", fr: "Guyane française" },
  187: { iso: "US", fr: "États-Unis" },
  // Asia
  2:   { iso: "KZ", fr: "Kazakhstan" },
  3:   { iso: "CN", fr: "Chine" },
  4:   { iso: "PH", fr: "Philippines" },
  5:   { iso: "MM", fr: "Myanmar" },
  6:   { iso: "ID", fr: "Indonésie" },
  7:   { iso: "MY", fr: "Malaisie" },
  10:  { iso: "VN", fr: "Vietnam" },
  11:  { iso: "KG", fr: "Kirghizstan" },
  13:  { iso: "IL", fr: "Israël" },
  14:  { iso: "HK", fr: "Hong Kong" },
  20:  { iso: "MO", fr: "Macao" },
  22:  { iso: "IN", fr: "Inde" },
  24:  { iso: "KH", fr: "Cambodge" },
  25:  { iso: "LA", fr: "Laos" },
  35:  { iso: "AZ", fr: "Azerbaïdjan" },
  40:  { iso: "UZ", fr: "Ouzbékistan" },
  42:  { iso: "TD", fr: "Tchad" },
  47:  { iso: "IQ", fr: "Irak" },
  52:  { iso: "TH", fr: "Thaïlande" },
  53:  { iso: "SA", fr: "Arabie Saoudite" },
  55:  { iso: "TW", fr: "Taïwan" },
  60:  { iso: "BD", fr: "Bangladesh" },
  62:  { iso: "TR", fr: "Turquie" },
  64:  { iso: "LK", fr: "Sri Lanka" },
  66:  { iso: "PK", fr: "Pakistan" },
  67:  { iso: "NZ", fr: "Nouvelle-Zélande" },
  72:  { iso: "MN", fr: "Mongolie" },
  74:  { iso: "AF", fr: "Afghanistan" },
  79:  { iso: "PG", fr: "Papouasie-Nvl-Guinée" },
  81:  { iso: "NP", fr: "Népal" },
  91:  { iso: "TL", fr: "Timor oriental" },
  95:  { iso: "AE", fr: "Émirats arabes unis" },
  100: { iso: "KW", fr: "Koweït" },
  102: { iso: "LY", fr: "Libye" },
  103: { iso: "JM", fr: "Jamaïque" },
  107: { iso: "OM", fr: "Oman" },
  110: { iso: "SY", fr: "Syrie" },
  111: { iso: "QA", fr: "Qatar" },
  116: { iso: "JO", fr: "Jordanie" },
  121: { iso: "BN", fr: "Brunei" },
  143: { iso: "TJ", fr: "Tadjikistan" },
  145: { iso: "BH", fr: "Bahreïn" },
  148: { iso: "AM", fr: "Arménie" },
  153: { iso: "LB", fr: "Liban" },
  158: { iso: "BT", fr: "Bhoutan" },
  159: { iso: "MV", fr: "Maldives" },
  161: { iso: "TM", fr: "Turkménistan" },
  175: { iso: "AU", fr: "Australie" },
  182: { iso: "JP", fr: "Japon" },
  188: { iso: "PS", fr: "Palestine" },
  // UK + islands
  16:  { iso: "GB", fr: "Royaume-Uni" },
  // Middle East & North Africa (additional)
  26:  { iso: "HT", fr: "Haïti" },
  30:  { iso: "YE", fr: "Yémen" },
  // Europe (additional)
  108: { iso: "BA", fr: "Bosnie-Herzégovine" },
  113: { iso: "CU", fr: "Cuba" },
  129: { iso: "GR", fr: "Grèce" },
  132: { iso: "IS", fr: "Islande" },
  144: { iso: "MC", fr: "Monaco" },
  155: { iso: "AL", fr: "Albanie" },
  171: { iso: "ME", fr: "Monténégro" },
  183: { iso: "MK", fr: "Macédoine du Nord" },
  201: { iso: "GI", fr: "Gibraltar" },
  203: { iso: "XK", fr: "Kosovo" },
  1062: { iso: "AD", fr: "Andorre" },
  10348: { iso: "LI", fr: "Liechtenstein" },
  10349: { iso: "SX", fr: "Saint-Martin (NL)" },
  10350: { iso: "KR", fr: "Corée du Sud" },
  10351: { iso: "SG", fr: "Singapour" },
  // Africa (additional)
  17:  { iso: "MG", fr: "Madagascar" },
  106: { iso: "SZ", fr: "Eswatini" },
  118: { iso: "BB", fr: "Barbade" },
  122: { iso: "BS", fr: "Bahamas" },
  123: { iso: "BW", fr: "Botswana" },
  124: { iso: "BZ", fr: "Belize" },
  133: { iso: "KM", fr: "Comores" },
  135: { iso: "LR", fr: "Libéria" },
  146: { iso: "RE", fr: "Réunion" },
  178: { iso: "ST", fr: "São Tomé-et-Príncipe" },
  185: { iso: "NC", fr: "Nouvelle-Calédonie" },
  // Americas & Caribbean (additional)
  126: { iso: "DM", fr: "Dominique" },
  127: { iso: "GD", fr: "Grenade" },
  131: { iso: "GY", fr: "Guyana" },
  134: { iso: "KN", fr: "Saint-Kitts-et-Nevis" },
  164: { iso: "LC", fr: "Sainte-Lucie" },
  166: { iso: "VC", fr: "Saint-Vincent" },
  169: { iso: "AG", fr: "Antigua-et-Barbuda" },
  170: { iso: "KY", fr: "Îles Caïmans" },
  179: { iso: "AW", fr: "Aruba" },
  180: { iso: "MS", fr: "Montserrat" },
  181: { iso: "AI", fr: "Anguilla" },
  189: { iso: "FJ", fr: "Fidji" },
  204: { iso: "NU", fr: "Niue" },
  1003: { iso: "BM", fr: "Bermudes" },
  1011: { iso: "MQ", fr: "Martinique" },
  10161: { iso: "AS", fr: "Samoa américaines" },
  10231: { iso: "WS", fr: "Samoa" },
  // Oceania & Pacific
  1007: { iso: "VU", fr: "Vanuatu" },
  1012: { iso: "PF", fr: "Polynésie française" },
  10227: { iso: "TO", fr: "Tonga" },
  // Other
  1008: { iso: "GL", fr: "Groenland" },
  10016: { iso: "IR", fr: "Iran" },
};

// ISO → grizzlysms numeric ID (first match)
export const ISO_TO_GRIZZLY: Record<string, number> = {};
for (const [id, { iso }] of Object.entries(GRIZZLY_COUNTRIES)) {
  const num = Number(id);
  if (!ISO_TO_GRIZZLY[iso]) ISO_TO_GRIZZLY[iso] = num;
}

// ─── Service mapping ──────────────────────────────────────────────────────────

export interface GrizzlyService {
  code: string;     // sms-activate short code
  fr: string;       // French display name
  icon: string;
  popular: boolean;
}

export const GRIZZLY_SERVICES: Record<string, GrizzlyService> = {
  ig:  { code: "ig",  fr: "Instagram",        icon: "instagram",  popular: true  },
  tg:  { code: "tg",  fr: "Telegram",          icon: "telegram",   popular: true  },
  wa:  { code: "wa",  fr: "WhatsApp",          icon: "whatsapp",   popular: true  },
  fb:  { code: "fb",  fr: "Facebook",          icon: "facebook",   popular: true  },
  go:  { code: "go",  fr: "Google / YouTube",  icon: "google",     popular: true  },
  tk:  { code: "tk",  fr: "TikTok",            icon: "tiktok",     popular: true  },
  tw:  { code: "tw",  fr: "Twitter / X",       icon: "twitter",    popular: true  },
  ap:  { code: "ap",  fr: "Apple",             icon: "apple",      popular: true  },
  am:  { code: "am",  fr: "Amazon",            icon: "amazon",     popular: true  },
  ms:  { code: "ms",  fr: "Microsoft",         icon: "microsoft",  popular: true  },
  dc:  { code: "dc",  fr: "Discord",           icon: "discord",    popular: false },
  sc:  { code: "sc",  fr: "Snapchat",          icon: "snapchat",   popular: false },
  nf:  { code: "nf",  fr: "Netflix",           icon: "netflix",    popular: false },
  ub:  { code: "ub",  fr: "Uber",              icon: "uber",       popular: false },
  ln:  { code: "ln",  fr: "LinkedIn",          icon: "linkedin",   popular: false },
  pp:  { code: "pp",  fr: "PayPal",            icon: "paypal",     popular: false },
  bn:  { code: "bn",  fr: "Binance",           icon: "binance",    popular: false },
  td:  { code: "td",  fr: "Tinder",            icon: "tinder",     popular: false },
  vi:  { code: "vi",  fr: "Viber",             icon: "viber",      popular: false },
  yt:  { code: "yt",  fr: "YouTube",           icon: "youtube",    popular: false },
};

// ─── Comprehensive service catalog ────────────────────────────────────────────
// Maps GrizzlySMS service codes → display name, simpleicons slug, popularity.
// Unknown codes fall back to uppercased code as name, no icon.

export const SERVICE_CATALOG: Record<string, { fr: string; iconSlug?: string; popular: boolean }> = {
  ig:  { fr: "Instagram",          iconSlug: "instagram",         popular: true  },
  wa:  { fr: "WhatsApp",           iconSlug: "whatsapp",          popular: true  },
  wb:  { fr: "WhatsApp Business",  iconSlug: "whatsapp",          popular: true  },
  tg:  { fr: "Telegram",           iconSlug: "telegram",          popular: true  },
  fb:  { fr: "Facebook",           iconSlug: "facebook",          popular: true  },
  go:  { fr: "Google",             iconSlug: "google",            popular: true  },
  tk:  { fr: "TikTok",             iconSlug: "tiktok",            popular: true  },
  tw:  { fr: "Twitter / X",        iconSlug: "x",                 popular: true  },
  ap:  { fr: "Apple",              iconSlug: "apple",             popular: true  },
  am:  { fr: "Amazon",             iconSlug: "amazon",            popular: true  },
  ms:  { fr: "Microsoft",          iconSlug: "microsoft",         popular: false },
  dc:  { fr: "Discord",            iconSlug: "discord",           popular: false },
  sc:  { fr: "Snapchat",           iconSlug: "snapchat",          popular: false },
  nf:  { fr: "Netflix",            iconSlug: "netflix",           popular: false },
  ub:  { fr: "Uber",               iconSlug: "uber",              popular: false },
  ln:  { fr: "LinkedIn",           iconSlug: "linkedin",          popular: false },
  pp:  { fr: "PayPal",             iconSlug: "paypal",            popular: false },
  bn:  { fr: "Binance",            iconSlug: "binance",           popular: false },
  td:  { fr: "Tinder",             iconSlug: "tinder",            popular: false },
  vi:  { fr: "Viber",              iconSlug: "viber",             popular: false },
  yt:  { fr: "YouTube",            iconSlug: "youtube",           popular: false },
  si:  { fr: "Signal",             iconSlug: "signal",            popular: false },
  wc:  { fr: "WeChat",             iconSlug: "wechat",            popular: false },
  vk:  { fr: "VKontakte",          iconSlug: "vk",                popular: false },
  ok:  { fr: "Odnoklassniki",      popular: false },
  ma:  { fr: "Mail.ru",            iconSlug: "mailru",            popular: false },
  yx:  { fr: "Yandex",             iconSlug: "yandex",            popular: false },
  sp:  { fr: "Spotify",            iconSlug: "spotify",           popular: false },
  ri:  { fr: "Reddit",             iconSlug: "reddit",            popular: false },
  pi:  { fr: "Pinterest",          iconSlug: "pinterest",         popular: false },
  tt:  { fr: "Twitch",             iconSlug: "twitch",            popular: false },
  sl:  { fr: "Slack",              iconSlug: "slack",             popular: false },
  gh:  { fr: "GitHub",             iconSlug: "github",            popular: false },
  hs:  { fr: "Hinge",              popular: false },
  um:  { fr: "Bumble",             popular: false },
  gp:  { fr: "Grindr",             popular: false },
  oi:  { fr: "Airbnb",             iconSlug: "airbnb",            popular: false },
  dl:  { fr: "Deliveroo",          iconSlug: "deliveroo",         popular: false },
  ka:  { fr: "KakaoTalk",          iconSlug: "kakaotalk",         popular: false },
  li:  { fr: "LINE",               iconSlug: "line",              popular: false },
  ne:  { fr: "Naver",              iconSlug: "naver",             popular: false },
  al:  { fr: "AliExpress",         iconSlug: "aliexpress",        popular: false },
  eb:  { fr: "eBay",               iconSlug: "ebay",              popular: false },
  et:  { fr: "Etsy",               iconSlug: "etsy",              popular: false },
  sf:  { fr: "Shein",              iconSlug: "shein",             popular: false },
  cy:  { fr: "Crypto.com",         iconSlug: "cryptodotcom",      popular: false },
  yh:  { fr: "Yahoo",              iconSlug: "yahoo",             popular: false },
  pm:  { fr: "ProtonMail",         iconSlug: "protonmail",        popular: false },
  gl:  { fr: "Gmail",              iconSlug: "gmail",             popular: false },
  ou:  { fr: "Outlook",            iconSlug: "microsoftoutlook",  popular: false },
  dr:  { fr: "Dropbox",            iconSlug: "dropbox",           popular: false },
  ct:  { fr: "ChatGPT",            iconSlug: "openai",            popular: false },
  co:  { fr: "Coinbase",           iconSlug: "coinbase",          popular: false },
  zo:  { fr: "Zomato",             popular: false },
  sw:  { fr: "Swiggy",             popular: false },
  gr:  { fr: "Grab",               popular: false },
  be:  { fr: "Badoo",              popular: false },
  av:  { fr: "Avito",              popular: false },
  bz:  { fr: "OLX",                popular: false },
  wu:  { fr: "Wildberries",        popular: false },
  im:  { fr: "IMO",                popular: false },
  zl:  { fr: "Zalo",               popular: false },
  ku:  { fr: "Kuaishou",           popular: false },
  mo:  { fr: "MoMo",               popular: false },
  qa:  { fr: "QQ",                 iconSlug: "tencentqq",         popular: false },
  cr:  { fr: "Careem",             popular: false },
  ft:  { fr: "OkCupid",            popular: false },
  lv:  { fr: "Lovoo",              popular: false },
  ge:  { fr: "GetContact",         popular: false },
  me:  { fr: "Meesho",             popular: false },
  fl:  { fr: "Flipkart",           popular: false },
  oz:  { fr: "Ozon",               popular: false },
  he:  { fr: "HeadHunter",         popular: false },
  ke:  { fr: "KuCoin",             iconSlug: "kucoin",            popular: false },
  bl:  { fr: "Booking.com",        popular: false },
  em:  { fr: "imo",                popular: false },
  ld:  { fr: "Line",               iconSlug: "line",              popular: false },
};

// ─── Price types ──────────────────────────────────────────────────────────────

export interface GrizzlyPriceEntry {
  count: number;
  cost: number;   // price in RUB
  retry: number;
}

// countryId (string) → serviceCode → GrizzlyPriceEntry
export type GrizzlyPrices = Record<string, Record<string, GrizzlyPriceEntry>>;

// ─── Order types ─────────────────────────────────────────────────────────────

export interface GrizzlyOrder {
  id: number;
  phone: string;   // includes country prefix, e.g. "237XXXXXXXXX"
}

// ─── API calls ───────────────────────────────────────────────────────────────

/** Get current balance in RUB */
export async function getBalance(): Promise<number> {
  const text = await call({ action: "getBalance" });
  // Response: "ACCESS_BALANCE:X.XXXX"
  const match = text.match(/ACCESS_BALANCE:([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

/** Get all prices (public call, no key needed for this but we include it) */
export async function getAllPrices(): Promise<GrizzlyPrices> {
  return callJson<GrizzlyPrices>({ action: "getPrices" });
}

/** Buy a virtual number.
 *  countryId = grizzlysms numeric country ID
 *  serviceCode = grizzlysms service short code (e.g. "ig")
 */
export async function buyNumber(countryId: number, serviceCode: string): Promise<GrizzlyOrder> {
  const text = await call({ action: "getNumber", service: serviceCode, country: countryId });
  // Response: "ACCESS_NUMBER:ID:PHONE"
  if (text === "NO_NUMBERS") throw new Error("no_numbers");
  if (text === "NO_BALANCE") throw new Error("no_balance");
  if (text.startsWith("BAD_")) throw new Error(`grizzly_error:${text}`);

  const match = text.match(/ACCESS_NUMBER:(\d+):(\d+)/);
  if (!match) throw new Error(`Unexpected GrizzlySMS response: ${text}`);
  return { id: parseInt(match[1], 10), phone: match[2] };
}

/** Check order status and get SMS code if available.
 *  Returns null if still waiting, or the SMS code string if received.
 *  Throws if cancelled/expired.
 */
export async function checkOrder(orderId: number): Promise<{ status: "waiting" | "received" | "cancelled"; code?: string }> {
  const text = await call({ action: "getStatus", id: orderId });

  if (text === "STATUS_WAIT_CODE" || text === "STATUS_WAIT_RETRY") {
    return { status: "waiting" };
  }
  if (text.startsWith("STATUS_OK:")) {
    return { status: "received", code: text.replace("STATUS_OK:", "").trim() };
  }
  if (text === "STATUS_CANCEL" || text === "NO_ACTIVATION") {
    return { status: "cancelled" };
  }
  // Unknown status — treat as waiting
  return { status: "waiting" };
}

/** Cancel an order (refund) */
export async function cancelOrder(orderId: number): Promise<void> {
  await call({ action: "setStatus", id: orderId, status: 8 }); // 8 = cancel
}

/** Mark order as finished / number used */
export async function finishOrder(orderId: number): Promise<void> {
  await call({ action: "setStatus", id: orderId, status: 6 }); // 6 = finish
}
