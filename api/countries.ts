import { Router } from "express";
import { getCachedPrices, minSellingPrice, computeSellingPrice } from "../lib/priceCache.js";
import { GRIZZLY_COUNTRIES } from "../lib/grizzlysms.js";

const router = Router();

const ISO_DIAL_CODES: Record<string, string> = {
  AD: "+376", AE: "+971", AF: "+93",  AG: "+1",   AI: "+1",   AL: "+355",
  AM: "+374", AO: "+244", AR: "+54",  AS: "+1",   AT: "+43",  AU: "+61",
  AW: "+297", AZ: "+994", BA: "+387", BB: "+1",   BD: "+880", BE: "+32",
  BF: "+226", BG: "+359", BH: "+973", BI: "+257", BJ: "+229", BM: "+1",
  BN: "+673", BO: "+591", BR: "+55",  BS: "+1",   BT: "+975", BW: "+267",
  BY: "+375", BZ: "+501", CA: "+1",   CD: "+243", CF: "+236", CG: "+242",
  CH: "+41",  CI: "+225", CL: "+56",  CM: "+237", CN: "+86",  CO: "+57",
  CR: "+506", CU: "+53",  CV: "+238", CY: "+357", CZ: "+420", DE: "+49",
  DJ: "+253", DK: "+45",  DM: "+1",   DO: "+1",   DZ: "+213", EC: "+593",
  EE: "+372", EG: "+20",  ER: "+291", ES: "+34",  ET: "+251", FI: "+358",
  FJ: "+679", FR: "+33",  GA: "+241", GB: "+44",  GD: "+1",   GE: "+995",
  GF: "+594", GH: "+233", GI: "+350", GL: "+299", GM: "+220", GN: "+224",
  GP: "+590", GQ: "+240", GR: "+30",  GT: "+502", GW: "+245", GY: "+592",
  HK: "+852", HN: "+504", HR: "+385", HT: "+509", HU: "+36",  ID: "+62",
  IE: "+353", IL: "+972", IN: "+91",  IQ: "+964", IR: "+98",  IS: "+354",
  IT: "+39",  JM: "+1",   JO: "+962", JP: "+81",  KE: "+254", KG: "+996",
  KH: "+855", KM: "+269", KN: "+1",   KR: "+82",  KW: "+965", KY: "+1",
  KZ: "+7",   LA: "+856", LB: "+961", LC: "+1",   LI: "+423", LK: "+94",
  LR: "+231", LS: "+266", LT: "+370", LU: "+352", LV: "+371", LY: "+218",
  MA: "+212", MC: "+377", MD: "+373", ME: "+382", MG: "+261", MK: "+389",
  ML: "+223", MM: "+95",  MN: "+976", MO: "+853", MQ: "+596", MR: "+222",
  MS: "+1",   MT: "+356", MU: "+230", MV: "+960", MW: "+265", MX: "+52",
  MY: "+60",  MZ: "+258", NA: "+264", NC: "+687", NE: "+227", NG: "+234",
  NI: "+505", NL: "+31",  NO: "+47",  NP: "+977", NZ: "+64",  OM: "+968",
  PA: "+507", PE: "+51",  PF: "+689", PG: "+675", PH: "+63",  PK: "+92",
  PL: "+48",  PR: "+1",   PS: "+970", PT: "+351", PY: "+595", QA: "+974",
  RE: "+262", RO: "+40",  RS: "+381", RU: "+7",   RW: "+250", SA: "+966",
  SB: "+677", SC: "+248", SD: "+249", SE: "+46",  SG: "+65",  SI: "+386",
  SK: "+421", SL: "+232", SN: "+221", SO: "+252", SR: "+597", SS: "+211",
  ST: "+239", SV: "+503", SX: "+1",   SY: "+963", SZ: "+268", TD: "+235",
  TG: "+228", TH: "+66",  TJ: "+992", TL: "+670", TM: "+993", TN: "+216",
  TO: "+676", TR: "+90",  TT: "+1",   TW: "+886", TZ: "+255", UA: "+380",
  UG: "+256", US: "+1",   UY: "+598", UZ: "+998", VC: "+1",   VE: "+58",
  VN: "+84",  VU: "+678", WS: "+685", XK: "+383", YE: "+967", ZA: "+27",
  ZM: "+260", ZW: "+263", NU: "+683",
};

function isoToFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    0x1f1e6 + code.toUpperCase().charCodeAt(0) - 65,
    0x1f1e6 + code.toUpperCase().charCodeAt(1) - 65
  );
}

const AFRICAN_ISO = new Set([
  "DZ","AO","BJ","BF","BI","CM","TD","CG","CD","DJ","EG","GQ","ER","ET",
  "GA","GM","GH","GN","GW","CI","KE","LS","LR","LY","MG","MW","ML","MR",
  "MU","MA","MZ","NA","NE","NG","RW","SN","SC","SL","SO","ZA","SS","TZ",
  "TG","TN","UG","ZM","ZW","CV","CF","SR",
]);

let cachedGeneric: { data: unknown[]; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

router.get("/", async (req, res) => {
  const serviceCode = req.query.serviceCode as string | undefined;

  try {
    const prices = await getCachedPrices();

    // ── Service-filtered mode ─────────────────────────────────────────────────
    // Returns only countries where this service has stock, with exact price & stock.
    if (serviceCode) {
      const mapped = Object.entries(GRIZZLY_COUNTRIES).map(([idStr, { iso, fr }]) => {
        const id = Number(idStr);
        const entry = prices[String(id)]?.[serviceCode];
        const hasStock = entry && entry.count > 0;
        const servicePrice = hasStock ? computeSellingPrice(entry.cost) : null;
        const dialCode = ISO_DIAL_CODES[iso.toUpperCase()] ?? null;
        return {
          code: String(id),
          name: fr,
          flag: isoToFlag(iso),
          isoCode: iso,
          dialCode,
          available: hasStock ?? false,
          priceFrom: servicePrice,
          stock: hasStock ? entry!.count : null,
          servicePrice,
          _african: AFRICAN_ISO.has(iso),
        };
      });

      const sorted = [
        ...mapped.filter((c) => c._african && c.available),
        ...mapped.filter((c) => !c._african && c.available),
        ...mapped.filter((c) => !c.available),
      ].map(({ _african: _, ...rest }) => rest);

      res.json(sorted);
      return;
    }

    // ── Generic mode (cached) ─────────────────────────────────────────────────
    if (cachedGeneric && Date.now() - cachedGeneric.ts < CACHE_TTL) {
      res.json(cachedGeneric.data);
      return;
    }

    const mapped = Object.entries(GRIZZLY_COUNTRIES).map(([idStr, { iso, fr }]) => {
      const id = Number(idStr);
      const minPrice = minSellingPrice(prices, id);
      const dialCode = ISO_DIAL_CODES[iso.toUpperCase()] ?? null;
      return {
        code: String(id),
        name: fr,
        flag: isoToFlag(iso),
        isoCode: iso,
        dialCode,
        available: minPrice !== null,
        priceFrom: minPrice,
        stock: null,
        servicePrice: null,
        _african: AFRICAN_ISO.has(iso),
      };
    });

    const sorted = [
      ...mapped.filter((c) => c._african && c.available),
      ...mapped.filter((c) => !c._african && c.available),
      ...mapped.filter((c) => !c.available),
    ].map(({ _african: _, ...rest }) => rest);

    cachedGeneric = { data: sorted, ts: Date.now() };
    res.json(sorted);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch countries from GrizzlySMS");
    res.status(502).json({ error: "Impossible de récupérer les pays" });
  }
});

export default router;
