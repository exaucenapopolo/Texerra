import { getAllPrices, GrizzlyPrices, ISO_TO_GRIZZLY } from "./grizzlysms.js";

const CACHE_TTL = 15 * 60 * 1000;

/**
 * GrizzlySMS API returns costs in USD.
 * Confirmed: wa Cameroun API cost=$0.44 matches their website $0.44.
 * Update if EUR/USD rate drifts significantly (current: 1 USD ≈ 0.92 EUR).
 */
export const USD_TO_EUR = 0.92;

/**
 * Selling price = provider_cost_usd × USD_TO_EUR × MARGIN.
 * 3.0 = markup over cost.
 */
export const MARGIN = 3.0;

/**
 * Absolute floor — covers payment overhead for ultra-cheap services.
 */
export const MIN_PRICE_EUR = 0.19;

/**
 * Services included in country-card "starting from" price.
 */
const COUNTRY_PRICE_SERVICES = new Set([
  "wa", "wb", "ig", "fb", "tg", "sc", "wc", "vi", "nf", "td", "si", "sp",
]);

interface PriceCache {
  data: GrizzlyPrices | null;
  ts: number;
  inFlight: Promise<GrizzlyPrices> | null;
}

const cache: PriceCache = { data: null, ts: 0, inFlight: null };

export async function getCachedPrices(): Promise<GrizzlyPrices> {
  if (cache.data && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  if (cache.inFlight) return cache.inFlight;

  cache.inFlight = getAllPrices()
    .then((data) => {
      cache.data = data;
      cache.ts = Date.now();
      cache.inFlight = null;
      return data;
    })
    .catch((err) => {
      cache.inFlight = null;
      throw err;
    });

  return cache.inFlight;
}

export function computeSellingPrice(costUsd: number): number {
  return Math.max(costUsd * USD_TO_EUR * MARGIN, MIN_PRICE_EUR);
}

export function minSellingPrice(prices: GrizzlyPrices, countryId: number): number | null {
  const countryData = prices[String(countryId)];
  if (!countryData) return null;

  let min: number | null = null;
  for (const [code, entry] of Object.entries(countryData)) {
    if (!entry || entry.count === 0) continue;
    if (!COUNTRY_PRICE_SERVICES.has(code)) continue;
    const price = computeSellingPrice(entry.cost);
    if (min === null || price < min) min = price;
  }
  return min;
}

export function sellingPrice(prices: GrizzlyPrices, countryId: number, serviceCode: string): number | null {
  const entry = prices[String(countryId)]?.[serviceCode];
  if (!entry || entry.count === 0) return null;
  return computeSellingPrice(entry.cost);
}

export function countryIdFromCode(countryCode: string): number {
  return parseInt(countryCode, 10);
}

export function grizzlyIdFromIso(iso: string): number | null {
  return ISO_TO_GRIZZLY[iso.toUpperCase()] ?? null;
        }
