import { NextRequest, NextResponse } from "next/server";
import { track } from "@/lib/analytics";
import { rateLimit } from "@/lib/auth";

const ALLOWED = new Set([
  "product_view", "search", "category_view", "add_to_cart", "remove_from_cart",
  "checkout_started", "payment_initiated", "payment_completed", "purchase",
  "download", "service_inquiry", "service_purchase", "wishlist", "review_submission",
]);

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`events:${ip}`, 60, 10_000)) return NextResponse.json({ ok: false });
  try {
    const body = await req.json();
    const event = String(body.event || "");
    if (!ALLOWED.has(event)) return NextResponse.json({ ok: false });
    track(event, body.payload && typeof body.payload === "object" ? body.payload : {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
