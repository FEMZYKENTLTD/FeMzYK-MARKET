/**
 * Currency handling. This module is isomorphic (client-safe, no DB imports).
 * Admin-configured rates are synced from site_settings on the server via
 * syncRates() in moneyServer.ts; clients fall back to the default table.
 */

export const BASE_CURRENCY = "USD";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate: number; // 1 USD = rate units of this currency
  decimals: number;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", rate: 1, decimals: 2 },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", rate: 1.36, decimals: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", rate: 0.79, decimals: 2 },
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira", rate: 1550, decimals: 2 },
};

const overrides: Record<string, number> = {};

/** Server-side: apply admin-configured rates. */
export function setRateOverrides(o: Record<string, number>): void {
  for (const k of Object.keys(overrides)) delete overrides[k];
  Object.assign(overrides, o);
}

export function getCurrencies(): Record<string, CurrencyInfo> {
  const out: Record<string, CurrencyInfo> = {};
  for (const [code, info] of Object.entries(CURRENCIES)) {
    out[code] = { ...info, rate: overrides[code] ?? info.rate };
  }
  return out;
}

export function getRate(code: string): number {
  return overrides[code] ?? CURRENCIES[code]?.rate ?? 1;
}

/** Convert base (USD) cents to display currency, rounded sensibly. */
export function convertCents(usdCents: number, code: string): number {
  const rate = getRate(code);
  let cents = Math.round(usdCents * rate);
  if (code === "NGN") cents = Math.round(cents / 100) * 100; // whole naira
  return cents;
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
