import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { insert, q1 } from "@/lib/db";
import { rateLimit } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`newsletter:${ip}`, 5, 60_000)) return NextResponse.json({ error: "Please try again in a minute." }, { status: 429 });
  try {
    const body = await req.json();
    const { email } = z.object({ email: z.string().email() }).parse(body);
    // Store as a site setting list (simple, unsubscribe-friendly).
    const { getSettings, setSetting } = await import("@/lib/settings");
    const list = getSettings<string[]>("newsletter_subscribers", []);
    const normalized = email.trim().toLowerCase();
    if (!list.includes(normalized)) {
      list.push(normalized);
      setSetting("newsletter_subscribers", list);
      sendEmail(normalized, "welcome", { subject: "Welcome to the FEMZYK MARKET list", body: "Thanks for subscribing. We'll only email you when it's worth it — new products, digital releases and useful content. You can unsubscribe any time." });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    return NextResponse.json({ error: "Could not subscribe you right now." }, { status: 500 });
  }
}
