// handlers/services.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCachedPrices, computeSellingPrice, countryIdFromCode } from "../lib/priceCache.js";
import { getServiceMeta } from "../lib/serviceRegistry.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const countryCode = req.query.countryCode as string | undefined;

  try {
    const prices = await getCachedPrices();
    const countryId = countryCode ? countryIdFromCode(countryCode) : null;

    // Découverte de tous les codes services — limitée au pays si demandé
    const allCodes = new Set<string>();
    if (countryId !== null) {
      const countryData = prices[String(countryId)];
      if (countryData) Object.keys(countryData).forEach((c) => allCodes.add(c));
    } else {
      for (const countryData of Object.values(prices)) {
        Object.keys(countryData).forEach((c) => allCodes.add(c));
      }
    }

    const mapped = Array.from(allCodes)
      .map((code) => {
        const meta = getServiceMeta(code);

        // Règle : si le code n'est pas dans le registre, on ne l'affiche PAS.
        if (!meta || !meta.enabled) {
          // Optionnel : logger le code non mappé côté serveur
          console.warn(`[services] Code non mappé ignoré : ${code}`);
          return null;
        }

        const name = meta.displayName;
        const icon = meta.iconKey;

        let priceEur: number | null = null;
        let available = false;
        let stock: number | null = null;

        if (countryId !== null) {
          const entry = prices[String(countryId)]?.[code];
          if (entry && entry.count > 0) {
            priceEur = computeSellingPrice(entry.cost);
            available = true;
            stock = entry.count;
          }
        } else {
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

        return {
          code,                    // compatibilité : code = providerCode
          serviceId: meta.serviceId,
          providerCode: meta.providerCode,
          name,
          officialName: meta.officialName,
          icon,
          iconType: meta.iconType,
          category: meta.category,
          popularRank: meta.popularRank,
          popular: meta.popularRank !== null,
          priceFrom: priceEur,
          available,
          stock,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    // Tri : disponibles d'abord, puis popularRank, puis alphabétique
    const sorted = mapped.sort((a, b) => {
      const aAvail = a.available ? 0 : 1;
      const bAvail = b.available ? 0 : 1;
      if (aAvail !== bAvail) return aAvail - bAvail;

      const aRank = a.popularRank ?? 9999;
      const bRank = b.popularRank ?? 9999;
      if (aRank !== bRank) return aRank - bRank;

      return a.name.localeCompare(b.name, "fr");
    });

    return res.status(200).json({ services: sorted });
  } catch (err: any) {
    console.error("[services] error", err);
    return res.status(500).json({ error: "Internal error" });
  }
            }
