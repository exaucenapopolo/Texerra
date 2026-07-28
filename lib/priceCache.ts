import { getAllPrices, GrizzlyPrices, ISO_TO_GRIZZLY } from "./grizzlysms.js";

const CACHE_TTL = 15 * 60 * 1000;

export const USD_TO_EUR = 0.92;
export const MARGIN = 3.0;
export const MIN_PRICE_EUR = 0.19;

const COUNTRY_PRICE_SERVICES = new Set([
  "wa", "wb", "ig", "fb", "tg", "sc", "wc", "vi", "nf", "td", "si", "sp",
]);

interface PriceEntry {
  count: number;
  cost: number;
}

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
  for (const [code, entry] of Object.entries(countryData) as [string, PriceEntry][]) {
    if (!entry || entry.count === 0) continue;
    if (!COUNTRY_PRICE_SERVICES.has(code)) continue;
    const price = computeSellingPrice(entry.cost);
    if (min === null || price < min) min = price;
  }
  return min;
}

export function sellingPrice(prices: GrizzlyPrices, countryId: number, serviceCode: string): number | null {
  const entry = prices[String(countryId)]?.[serviceCode] as PriceEntry | undefined;
  if (!entry || entry.count === 0) return null;
  return computeSellingPrice(entry.cost);
}

export function countryIdFromCode(countryCode: string): number {
  return parseInt(countryCode, 10);
}

export function grizzlyIdFromIso(iso: string): number | null {
  return ISO_TO_GRIZZLY[iso.toUpperCase()] ?? null;
  }
                                
