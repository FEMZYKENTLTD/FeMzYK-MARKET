import { getSettings } from "./settings";
import { setRateOverrides } from "./money";

/** Server-only: load admin-configured currency rates into the money module. */
export function syncRates(): void {
  try {
    setRateOverrides(getSettings<Record<string, number>>("currency_rates", {}));
  } catch {
    /* keep defaults */
  }
}
