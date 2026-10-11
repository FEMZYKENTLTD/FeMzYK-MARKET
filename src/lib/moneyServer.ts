import { cookies } from "next/headers";
import { getSettings } from "./settings";
import { BASE_CURRENCY, getCurrencies, setRateOverrides } from "./money";

/** Server-only: load admin-configured currency rates into the money module. */
export function syncRates(): void {
  try {
    setRateOverrides(getSettings<Record<string, number>>("currency_rates", {}));
  } catch {
    /* keep the safe environment defaults */
  }
}

/** Resolve a stored display preference only when its exchange rate is enabled. */
export async function getDisplayCurrency(): Promise<string> {
  const requested = (await cookies()).get("fm_currency")?.value;
  return requested && getCurrencies()[requested] ? requested : BASE_CURRENCY;
}
