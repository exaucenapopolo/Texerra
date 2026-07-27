export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rateFromEur: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "XAF", name: "Franc CFA (CEMAC)", symbol: "FCFA", rateFromEur: 655.957 },
  { code: "XOF", name: "Franc CFA (UEMOA)", symbol: "CFA", rateFromEur: 655.957 },
  { code: "CDF", name: "Franc congolais", symbol: "FC", rateFromEur: 2900 },
  { code: "GNF", name: "Franc guinéen", symbol: "FG", rateFromEur: 9500 },
  { code: "NGN", name: "Naira nigérian", symbol: "₦", rateFromEur: 1700 },
  { code: "GHS", name: "Cédi ghanéen", symbol: "₵", rateFromEur: 15.5 },
  { code: "KES", name: "Shilling kényan", symbol: "KSh", rateFromEur: 140 },
  { code: "TZS", name: "Shilling tanzanien", symbol: "TSh", rateFromEur: 2800 },
  { code: "RWF", name: "Franc rwandais", symbol: "RWF", rateFromEur: 1340 },
  { code: "UGX", name: "Shilling ougandais", symbol: "USh", rateFromEur: 4000 },
  { code: "ZMW", name: "Kwacha zambien", symbol: "ZK", rateFromEur: 27 },
  { code: "MWK", name: "Kwacha malawite", symbol: "MK", rateFromEur: 1750 },
  { code: "MZN", name: "Metical mozambicain", symbol: "MT", rateFromEur: 64 },
  { code: "ETB", name: "Birr éthiopien", symbol: "Br", rateFromEur: 125 },
  { code: "MAD", name: "Dirham marocain", symbol: "DH", rateFromEur: 10.8 },
  { code: "DZD", name: "Dinar algérien", symbol: "DA", rateFromEur: 147 },
  { code: "USD", name: "Dollar américain", symbol: "$", rateFromEur: 1.08 },
  { code: "EUR", name: "Euro", symbol: "€", rateFromEur: 1 },
];

export function getCurrency(code: string | null | undefined): CurrencyInfo | undefined {
  return CURRENCIES.find(c => c.code === code);
}

export function convertFromEur(amountEur: number, targetCode: string): number {
  const c = getCurrency(targetCode);
  if (!c) return amountEur;
  return amountEur * c.rateFromEur;
}

export function formatLocalAmount(amountEur: number, targetCode: string): string {
  const c = getCurrency(targetCode);
  if (!c || c.code === "EUR") return `${amountEur.toFixed(2)} €`;
  if (c.code === "USD") return `$${(amountEur * c.rateFromEur).toFixed(2)}`;
  const local = amountEur * c.rateFromEur;
  return `${Math.round(local).toLocaleString("fr-FR")} ${c.symbol}`;
}
