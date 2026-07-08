import { Router } from "express";
import { getCachedPrices, computeSellingPrice, MIN_PRICE_EUR, countryIdFromCode } from "../lib/priceCache.js";
import { SERVICE_CATALOG } from "../lib/grizzlysms.js";

/**
 * Priority order for popular/well-known services — lower index = shown first.
 * Services not listed fall into secondary buckets (has icon → no icon).
 */
const POPULAR_RANK: Record<string, number> = {};
[
  "wa", "wb", "ig", "fb", "tg", "sc", "tk", "tw", "go", "yt",
  "ap", "am", "pp", "dc", "ms", "sp", "ln", "bn", "vk", "wc",
  "vi", "td", "nf", "ub", "ri", "si", "ma", "yx", "ok",
].forEach((code, i) => { POPULAR_RANK[code] = i; });

const router = Router();

router.get("/", async (req, res) => {
  const countryCode = req.query.countryCode as string | undefined;

  try {
    const prices = await getCachedPrices();
    const countryId = countryCode ? countryIdFromCode(countryCode) : null;

    // Discover ALL service codes — limited to the specific country if requested
    const allCodes = new Set<string>();
    if (countryId !== null) {
      const countryData = prices[String(countryId)];
      if (countryData) Object.keys(countryData).forEach((c) => allCodes.add(c));
    } else {
      for (const countryData of Object.values(prices)) {
        Object.keys(countryData).forEach((c) => allCodes.add(c));
      }
    }

    const mapped = Array.from(allCodes).map((code) => {
      const catalog = SERVICE_CATALOG[code];
      const name = catalog?.fr ?? code.toUpperCase().replace(/_/g, " ");
      const icon = catalog?.iconSlug ?? null;
      const popular = catalog?.popular ?? false;

      let priceEur: number | null = null;
      let available = false;
      let stock: number | null = null;

      if (countryId !== null) {
        // Country-specific: use actual GrizzlySMS cost (USD) + stock for this country
        const entry = prices[String(countryId)]?.[code];
        if (entry && entry.count > 0) {
          priceEur = computeSellingPrice(entry.cost);
          available = true;
          stock = entry.count;
        }
      } else {
        // Global listing: find cheapest country cost, sum total stock
        let minCost: number | null = null;
        let totalStock = 0;
        for (const countryData of Object.values(prices)) {
          const entry = countryData[code];
          if (!entry || entry.count === 0) continue;
          available = true;
          totalStock += entry.count;
          if (minCost === null || entry.cost < minCost) minCost = entry.cost;
        }
        if (available && minCost !== null) {
          priceEur = computeSellingPrice(minCost);
          stock = totalStock;
        }
      }

      return { code, name, icon, priceFrom: priceEur, popular, available, stock };
    });

    // Sort order:
    // 1. Available + popular rank (known services in defined order)
    // 2. Available + has icon (other catalog services with logo)
    // 3. Available + no icon (unknown services)
    // 4. Unavailable
    const sorted = mapped.sort((a, b) => {
      const aAvail = a.available ? 0 : 1;
      const bAvail = b.available ? 0 : 1;
      if (aAvail !== bAvail) return aAvail - bAvail;

      const aRank = POPULAR_RANK[a.code] ?? Infinity;
      const bRank = POPULAR_RANK[b.code] ?? Infinity;
      if (aRank !== Infinity && bRank !== Infinity) return aRank - bRank;
      if (aRank !== Infinity) return -1;
      if (bRank !== Infinity) return 1;

      const aHasIcon = a.icon ? 0 : 1;
      const bHasIcon = b.icon ? 0 : 1;
      if (aHasIcon !== bHasIcon) return aHasIcon - bHasIcon;

      return a.name.localeCompare(b.name, "fr");
    });

    res.json(sorted);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch services from GrizzlySMS");
    res.status(502).json({ error: "Impossible de récupérer les services" });
  }
});

export default router;
