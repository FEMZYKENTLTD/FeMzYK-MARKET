import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { setSetting, getSettings, siteConfig } from "@/lib/settings";
import { getDefaultCurrencyRates } from "@/lib/money";

const siteSchema = z.object({
  storeName: z.string().min(1).max(80).optional(),
  tagline: z.string().max(180).optional(),
  supportEmail: z.union([z.string().email(), z.literal("")]).optional(),
  businessName: z.string().min(1).max(120).optional(),
  businessAddress: z.string().max(300).optional(),
  social: z.array(z.object({ name: z.string().min(1).max(40), url: z.string().url() }).strict()).max(8).optional(),
  announcement: z.string().max(240).optional(),
  freeShippingNote: z.string().max(200).optional(),
}).strict();

const ratesSchema = z.object({
  USD: z.number().positive().max(1_000_000),
  CAD: z.number().positive().max(1_000_000).optional(),
  GBP: z.number().positive().max(1_000_000).optional(),
  NGN: z.number().positive().max(1_000_000).optional(),
}).strict().refine((r) => r.USD === 1, "USD is the base currency and must remain 1.");

const taxRatesSchema = z.object({
  US: z.number().min(0).max(100),
  CA: z.number().min(0).max(100),
  GB: z.number().min(0).max(100),
  NG: z.number().min(0).max(100),
}).strict();

const promotionSchema = z.object({
  active: z.boolean(),
  message: z.string().max(240),
  ends_at: z.string().max(60).nullable().optional(),
}).strict().refine((p) => !p.active || p.message.trim().length > 0, "An active promotion needs a message.");

const bodySchema = z.object({
  site: siteSchema.optional(),
  currency_rates: ratesSchema.optional(),
  tax_rates: taxRatesSchema.optional(),
  promotion: promotionSchema.optional(),
  home_hero: z.object({ title: z.string().max(120), subtitle: z.string().max(300) }).strict().optional(),
}).strict();

export async function GET() {
  try {
    await adminUser();
    return NextResponse.json({
      site: getSettings("site", siteConfig()),
      home_hero: getSettings("home_hero", process.env.NODE_ENV === "production"
        ? { title: "FEMZYK MARKET", subtitle: "Store and business information is being prepared. Please check back soon." }
        : {
            title: "Smart products. Digital solutions. Better everyday living.",
            subtitle: "Discover thoughtfully selected products, useful digital resources and practical web solutions designed to make work and everyday life better.",
          }),
      currency_rates: getSettings("currency_rates", getDefaultCurrencyRates()),
      tax_rates: getSettings("tax_rates", { US: 0, CA: 0, GB: 0, NG: 0 }),
      promotion: getSettings("promotion", { active: false, message: "", ends_at: null }),
    });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await adminUser();
    const body = bodySchema.parse(await req.json());
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      const previous = getSettings(key, key === "site" ? siteConfig() : {});
      const next = key === "site" ? { ...siteConfig(), ...(previous as object), ...(value as object) } : value;
      setSetting(key, next);
      audit(admin.id, `settings_changed:${key}`, "settings", undefined, previous, next);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message || "Invalid settings." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
