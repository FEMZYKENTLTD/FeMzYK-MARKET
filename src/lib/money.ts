/**
 * Currency handling. This module is isomorphic (client-safe, no DB imports).
 * Production only offers the base currency until an administrator configures
 * a verified rate for another supported currency. Development has sample rates.
 */

export const BASE_CURRENCY = "USD";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate: number; // 1 USD = rate units of this currency
  decimals: number;
}

const CURRENCY_METADATA: Record<string, Omit<CurrencyInfo, "rate">> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", decimals: 2 },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", decimals: 2 },
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira", decimals: 2 },
};

const DEFAULT_RATES: Record<string, number> = process.env.NODE_ENV === "production"
  ? { USD: 1 }
  : { USD: 1, CAD: 1.36, GBP: 0.79, NGN: 1550 };

// Retained as the known currency metadata list; callers should use getCurrencies()
// to determine which currencies currently have an enabled, configured rate.
export const CURRENCIES: Record<string, CurrencyInfo> = Object.fromEntries(
  Object.entries(CURRENCY_METADATA).map(([code, info]) => [code, { ...info, rate: DEFAULT_RATES[code] ?? 1 }])
);

export function getDefaultCurrencyRates(): Record<string, number> {
  return { ...DEFAULT_RATES };
}

const overrides: Record<string, number> = {};

/** Server-side: apply admin-configured rates. */
export function setRateOverrides(o: Record<string, number>): void {
  for (const k of Object.keys(overrides)) delete overrides[k];
  Object.assign(overrides, o);
}

export function getCurrencies(): Record<string, CurrencyInfo> {
  const out: Record<string, CurrencyInfo> = {};
  for (const [code, info] of Object.entries(CURRENCY_METADATA)) {
    const rate = overrides[code] ?? DEFAULT_RATES[code];
    if (rate == null || !Number.isFinite(rate) || rate <= 0) continue;
    out[code] = { ...info, rate };
  }
  return out;
}

export function getRate(code: string): number {
  return overrides[code] ?? DEFAULT_RATES[code] ?? 1;
}

/** Convert base (USD) cents to display currency, rounded sensibly. */
export function convertCents(usdCents: number, code: string): number {
  const rate = getRate(code);
  // Keep precision to the smallest currency unit so quoted components add up transparently.
  return Math.round(usdCents * rate);
}

export function formatMoney(cents: number, code: string): string {
  const info = getCurrencies()[code] ?? CURRENCIES.USD;
  const value = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: info.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currencyDisplay: "narrowSymbol",
  }).format(value);
}
