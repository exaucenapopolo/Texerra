// src/lib/serviceIcons.ts
// Centralisation des icônes de services pour Texerra.
// Gère les icônes Simple Icons ET les fallbacks locaux par initiales.

export const ICON_COLORS: Record<string, string> = {
  instagram: "E1306C",
  whatsapp: "25D366",
  telegram: "26A5E4",
  facebook: "1877F2",
  google: "4285F4",
  tiktok: "000000",
  x: "000000",
  apple: "000000",
  amazon: "FF9900",
  discord: "5865F2",
  snapchat: "FFCC00",
  netflix: "E50914",
  uber: "000000",
  paypal: "003087",
  binance: "F0B90B",
  tinder: "FF4458",
  viber: "665CAC",
  youtube: "FF0000",
  signal: "3A76F0",
  spotify: "1DB954",
  reddit: "FF4500",
  airbnb: "FF5A5F",
  slack: "4A154B",
  github: "000000",
  twitch: "9146FF",
  pinterest: "E60023",
  wechat: "07C160",
  vk: "0077FF",
  yandex: "FC3F1D",
  aliexpress: "FF4747",
  ebay: "E43137",
  etsy: "F16521",
  kakaotalk: "FAE100",
  line: "00B900",
  naver: "03C75A",
  mailru: "005FF9",
  deliveroo: "00CCBC",
  shein: "000000",
  cryptodotcom: "1199FA",
  yahoo: "6001D2",
  protonmail: "6D4AFF",
  gmail: "EA4335",
  dropbox: "0061FF",
  openai: "000000",
  coinbase: "0052FF",
  kucoin: "24AE8F",
  tencentqq: "EB192D",
  binance: "F0B90B",
  tiktok: "000000",
  // Local fallbacks
  microsoft: "5E5E5E",
  outlook: "0078D4",
  linkedin: "0A66C2",
};

/** Slugs Simple Icons qui n'existent pas → on utilise un fallback */
const INVALID_SIMPLEICONS = new Set([
  "microsoft",
  "linkedin",
  "bumble",
  "hinge",
  "grindr",
]);

/**
 * Construit l'URL de l'icône Simple Icons.
 * Retourne null si aucun slug n'est fourni ou si le slug est invalide.
 */
export function svcIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null;
  if (INVALID_SIMPLEICONS.has(icon)) return null;

  const color = ICON_COLORS[icon] ?? "555555";
  return `https://cdn.simpleicons.org/${icon}/${color}`;
}

/**
 * Couleur de fond pour le placeholder d'initiales (quand l'icône n'existe pas).
 */
export function svcPlaceholderColor(icon: string | null | undefined): string {
  if (!icon) return "hsl(24 90% 52%)";
  const hex = ICON_COLORS[icon] ?? "555555";
  return `#${hex}`;
}
