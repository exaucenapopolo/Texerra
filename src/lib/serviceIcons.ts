// src/lib/serviceIcons.ts
// Centralisation des icônes de services pour Texerra.

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
  microsoft: "737373",
  discord: "5865F2",
  snapchat: "FFCC00",
  netflix: "E50914",
  uber: "000000",
  linkedin: "0A66C2",
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
};

/**
 * Construit l'URL de l'icône Simple Icons.
 * Retourne null si aucun slug n'est fourni.
 */
export function svcIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null;
  const color = ICON_COLORS[icon] ?? "555555";
  return `https://cdn.simpleicons.org/${icon}/${color}`;
}
