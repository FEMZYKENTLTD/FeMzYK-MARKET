import { NextRequest, NextResponse } from "next/server";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { setSetting, getSettings } from "@/lib/settings";

export async function GET() {
  try {
    adminUser();
    return NextResponse.json({
      site: getSettings("site", {}),
      home_hero: getSettings("home_hero", {}),
      currency_rates: getSettings("currency_rates", {}),
      promotion: getSettings("promotion", { active: false, message: "", ends_at: null }),
    });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = adminUser();
    const body = await req.json();
    const allowed = ["site", "home_hero", "currency_rates", "promotion", "newsletter_subscribers"];
    for (const key of Object.keys(body)) {
      if (!allowed.includes(key)) continue;
      setSetting(key, body[key]);
      audit(admin.id, `settings_changed:${key}`, "settings", undefined, undefined, key === "currency_rates" ? { rates: Object.keys(body[key]) } : undefined);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
