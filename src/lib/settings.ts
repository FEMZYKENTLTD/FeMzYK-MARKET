import { q1, run } from "./db";

/** Key/value site settings stored as JSON — fully admin-editable. */
export function getSettings<T>(key: string, fallback: T): T {
  try {
    const row = q1<{ value_json: string }>("SELECT value_json FROM site_settings WHERE key = ?", key);
    if (!row) return fallback;
    return JSON.parse(row.value_json) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown): void {
  run(
    `INSERT INTO site_settings (key, value_json) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
    key,
    JSON.stringify(value)
  );
}

export interface SiteConfig {
  storeName: string;
  tagline: string;
  supportEmail: string;
  businessName: string;
  businessAddress: string;
  social: { name: string; url: string }[];
  announcement: string;
  freeShippingNote: string;
}

export function siteConfig(): SiteConfig {
  return getSettings<SiteConfig>("site", {
    storeName: "FEMZYK MARKET",
    tagline: "Smart products. Digital solutions. Better everyday living.",
    supportEmail: "support@femzymarket.com",
    businessName: "FEMZYK ENTERPRISES",
    businessAddress: "FEMZYK ENTERPRISES — Remote-first, serving customers worldwide",
    social: [
      { name: "X / Twitter", url: "https://x.com/femzyk" },
      { name: "Instagram", url: "https://instagram.com/femzyk" },
    ],
    announcement: "",
    freeShippingNote: "Free standard shipping on US orders over $75",
  });
}
