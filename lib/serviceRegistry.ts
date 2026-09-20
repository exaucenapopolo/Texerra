// lib/serviceRegistry.ts
// Registre central des services Texerra — source de vérité unique.
// NE PAS confondre serviceId (interne) et providerCode (code officiel Grizzly).

export interface ServiceMeta {
  serviceId: string;          // identifiant interne stable
  provider: "grizzlysms";
  providerCode: string;       // code exact utilisé par l'API Grizzly
  officialName: string;       // libellé vérifié côté fournisseur
  displayName: string;        // nom affiché sur Texerra
  iconType: "simpleicons" | "local" | "official" | "none";
  iconKey: string | null;     // slug Simple Icons ou clé locale
  category: string;           // "social", "messaging", "email", etc.
  popularRank: number | null; // plus petit = plus haut
  enabled: boolean;
  lastVerifiedAt: string;     // ISO date
}

export const SERVICE_REGISTRY: Record<string, ServiceMeta> = {
  // ─── Très populaires (popularRank 1-10) ───
  wa: { serviceId: "whatsapp", provider: "grizzlysms", providerCode: "wa", officialName: "WhatsApp", displayName: "WhatsApp", iconType: "simpleicons", iconKey: "whatsapp", category: "messaging", popularRank: 1, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  wb: { serviceId: "whatsapp-business", provider: "grizzlysms", providerCode: "wb", officialName: "WhatsApp Business", displayName: "WhatsApp Business", iconType: "simpleicons", iconKey: "whatsapp", category: "messaging", popularRank: 2, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  ig: { serviceId: "instagram", provider: "grizzlysms", providerCode: "ig", officialName: "Instagram", displayName: "Instagram", iconType: "simpleicons", iconKey: "instagram", category: "social", popularRank: 3, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  fb: { serviceId: "facebook", provider: "grizzlysms", providerCode: "fb", officialName: "Facebook", displayName: "Facebook", iconType: "simpleicons", iconKey: "facebook", category: "social", popularRank: 4, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  tg: { serviceId: "telegram", provider: "grizzlysms", providerCode: "tg", officialName: "Telegram", displayName: "Telegram", iconType: "simpleicons", iconKey: "telegram", category: "messaging", popularRank: 5, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  sc: { serviceId: "snapchat", provider: "grizzlysms", providerCode: "sc", officialName: "Snapchat", displayName: "Snapchat", iconType: "simpleicons", iconKey: "snapchat", category: "social", popularRank: 6, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  tk: { serviceId: "tiktok", provider: "grizzlysms", providerCode: "tk", officialName: "TikTok", displayName: "TikTok", iconType: "simpleicons", iconKey: "tiktok", category: "social", popularRank: 7, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  tw: { serviceId: "twitter-x", provider: "grizzlysms", providerCode: "tw", officialName: "Twitter / X", displayName: "X (Twitter)", iconType: "simpleicons", iconKey: "x", category: "social", popularRank: 8, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  go: { serviceId: "google", provider: "grizzlysms", providerCode: "go", officialName: "Google", displayName: "Google", iconType: "simpleicons", iconKey: "google", category: "services", popularRank: 9, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  yt: { serviceId: "youtube", provider: "grizzlysms", providerCode: "yt", officialName: "YouTube", displayName: "YouTube", iconType: "simpleicons", iconKey: "youtube", category: "social", popularRank: 10, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },

  // ─── Populaires (popularRank 11-30) ───
  ap: { serviceId: "apple", provider: "grizzlysms", providerCode: "ap", officialName: "Apple", displayName: "Apple", iconType: "simpleicons", iconKey: "apple", category: "services", popularRank: 11, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  am: { serviceId: "amazon", provider: "grizzlysms", providerCode: "am", officialName: "Amazon", displayName: "Amazon", iconType: "simpleicons", iconKey: "amazon", category: "marketplace", popularRank: 12, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  pp: { serviceId: "paypal", provider: "grizzlysms", providerCode: "pp", officialName: "PayPal", displayName: "PayPal", iconType: "simpleicons", iconKey: "paypal", category: "finance", popularRank: 13, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  dc: { serviceId: "discord", provider: "grizzlysms", providerCode: "dc", officialName: "Discord", displayName: "Discord", iconType: "simpleicons", iconKey: "discord", category: "messaging", popularRank: 14, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  ms: { serviceId: "microsoft", provider: "grizzlysms", providerCode: "ms", officialName: "Microsoft", displayName: "Microsoft", iconType: "simpleicons", iconKey: "microsoft", category: "services", popularRank: 15, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  sp: { serviceId: "spotify", provider: "grizzlysms", providerCode: "sp", officialName: "Spotify", displayName: "Spotify", iconType: "simpleicons", iconKey: "spotify", category: "services", popularRank: 16, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  ln: { serviceId: "linkedin", provider: "grizzlysms", providerCode: "ln", officialName: "LinkedIn", displayName: "LinkedIn", iconType: "simpleicons", iconKey: "linkedin", category: "social", popularRank: 17, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  bn: { serviceId: "binance", provider: "grizzlysms", providerCode: "bn", officialName: "Binance", displayName: "Binance", iconType: "simpleicons", iconKey: "binance", category: "finance", popularRank: 18, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  vk: { serviceId: "vkontakte", provider: "grizzlysms", providerCode: "vk", officialName: "VKontakte", displayName: "VKontakte", iconType: "simpleicons", iconKey: "vk", category: "social", popularRank: 19, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  wc: { serviceId: "wechat", provider: "grizzlysms", providerCode: "wc", officialName: "WeChat", displayName: "WeChat", iconType: "simpleicons", iconKey: "wechat", category: "messaging", popularRank: 20, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  vi: { serviceId: "viber", provider: "grizzlysms", providerCode: "vi", officialName: "Viber", displayName: "Viber", iconType: "simpleicons", iconKey: "viber", category: "messaging", popularRank: 21, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  td: { serviceId: "tinder", provider: "grizzlysms", providerCode: "td", officialName: "Tinder", displayName: "Tinder", iconType: "simpleicons", iconKey: "tinder", category: "social", popularRank: 22, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  nf: { serviceId: "netflix", provider: "grizzlysms", providerCode: "nf", officialName: "Netflix", displayName: "Netflix", iconType: "simpleicons", iconKey: "netflix", category: "services", popularRank: 23, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  ub: { serviceId: "uber", provider: "grizzlysms", providerCode: "ub", officialName: "Uber", displayName: "Uber", iconType: "simpleicons", iconKey: "uber", category: "services", popularRank: 24, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  ri: { serviceId: "reddit", provider: "grizzlysms", providerCode: "ri", officialName: "Reddit", displayName: "Reddit", iconType: "simpleicons", iconKey: "reddit", category: "social", popularRank: 25, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  si: { serviceId: "signal", provider: "grizzlysms", providerCode: "si", officialName: "Signal", displayName: "Signal", iconType: "simpleicons", iconKey: "signal", category: "messaging", popularRank: 26, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  ma: { serviceId: "mailru", provider: "grizzlysms", providerCode: "ma", officialName: "Mail.ru", displayName: "Mail.ru", iconType: "simpleicons", iconKey: "mailru", category: "email", popularRank: 27, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  yx: { serviceId: "yandex", provider: "grizzlysms", providerCode: "yx", officialName: "Yandex", displayName: "Yandex", iconType: "simpleicons", iconKey: "yandex", category: "services", popularRank: 28, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  ok: { serviceId: "odnoklassniki", provider: "grizzlysms", providerCode: "ok", officialName: "Odnoklassniki", displayName: "Odnoklassniki", iconType: "simpleicons", iconKey: "odnoklassniki", category: "social", popularRank: 29, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },

  // ─── Autres services (popularRank null = tri alphabétique) ───
  tt: { serviceId: "twitch", provider: "grizzlysms", providerCode: "tt", officialName: "Twitch", displayName: "Twitch", iconType: "simpleicons", iconKey: "twitch", category: "services", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  sl: { serviceId: "slack", provider: "grizzlysms", providerCode: "sl", officialName: "Slack", displayName: "Slack", iconType: "simpleicons", iconKey: "slack", category: "services", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  gh: { serviceId: "github", provider: "grizzlysms", providerCode: "gh", officialName: "GitHub", displayName: "GitHub", iconType: "simpleicons", iconKey: "github", category: "services", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  pi: { serviceId: "pinterest", provider: "grizzlysms", providerCode: "pi", officialName: "Pinterest", displayName: "Pinterest", iconType: "simpleicons", iconKey: "pinterest", category: "social", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  hs: { serviceId: "hinge", provider: "grizzlysms", providerCode: "hs", officialName: "Hinge", displayName: "Hinge", iconType: "none", iconKey: null, category: "social", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  um: { serviceId: "bumble", provider: "grizzlysms", providerCode: "um", officialName: "Bumble", displayName: "Bumble", iconType: "none", iconKey: null, category: "social", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  gp: { serviceId: "grindr", provider: "grizzlysms", providerCode: "gp", officialName: "Grindr", displayName: "Grindr", iconType: "none", iconKey: null, category: "social", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  oi: { serviceId: "airbnb", provider: "grizzlysms", providerCode: "oi", officialName: "Airbnb", displayName: "Airbnb", iconType: "simpleicons", iconKey: "airbnb", category: "services", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  dl: { serviceId: "deliveroo", provider: "grizzlysms", providerCode: "dl", officialName: "Deliveroo", displayName: "Deliveroo", iconType: "simpleicons", iconKey: "deliveroo", category: "services", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  ka: { serviceId: "kakaotalk", provider: "grizzlysms", providerCode: "ka", officialName: "KakaoTalk", displayName: "KakaoTalk", iconType: "simpleicons", iconKey: "kakaotalk", category: "messaging", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  li: { serviceId: "line", provider: "grizzlysms", providerCode: "li", officialName: "LINE", displayName: "LINE", iconType: "simpleicons", iconKey: "line", category: "messaging", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  ne: { serviceId: "naver", provider: "grizzlysms", providerCode: "ne", officialName: "Naver", displayName: "Naver", iconType: "simpleicons", iconKey: "naver", category: "services", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  al: { serviceId: "aliexpress", provider: "grizzlysms", providerCode: "al", officialName: "AliExpress", displayName: "AliExpress", iconType: "simpleicons", iconKey: "aliexpress", category: "marketplace", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  eb: { serviceId: "ebay", provider: "grizzlysms", providerCode: "eb", officialName: "eBay", displayName: "eBay", iconType: "simpleicons", iconKey: "ebay", category: "marketplace", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  et: { serviceId: "etsy", provider: "grizzlysms", providerCode: "et", officialName: "Etsy", displayName: "Etsy", iconType: "simpleicons", iconKey: "etsy", category: "marketplace", popularRank: null, enabled: true, lastVerifiedAt: "2026-09-20T00:00:00Z" },
  // ... ajoutez ici les autres codes validés via getServicesList
};

/** Récupère les métadonnées d'un code fournisseur, ou null si non mappé. */
export function getServiceMeta(providerCode: string): ServiceMeta | null {
  return SERVICE_REGISTRY[providerCode] ?? null;
}

/** Retourne tous les services actifs. */
export function getEnabledServices(): ServiceMeta[] {
  return Object.values(SERVICE_REGISTRY).filter((s) => s.enabled);
  }
