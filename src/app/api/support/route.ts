import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { insert } from "@/lib/db";
import { refNumber } from "@/lib/db";
import { rateLimit, getSessionUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`support:${ip}`, 8, 60_000)) return NextResponse.json({ error: "Please wait a minute before sending another message." }, { status: 429 });
  try {
    const body = await req.json();
    const data = z
      .object({
        name: z.string().min(2).max(120),
        email: z.string().email(),
        topic: z.enum(["general", "order", "shipping", "returns", "digital", "webdev"]).default("general"),
        orderNumber: z.string().max(30).optional(),
        subject: z.string().min(3).max(160),
        body: z.string().min(10).max(5000),
      })
      .parse(body);
    const user = getSessionUser();
    const reference = refNumber("SUP");
    insert(
      "INSERT INTO support_tickets (reference, user_id, name, email, topic, order_number, subject, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      reference,
      user?.id ?? null,
      data.name,
      data.email,
      data.topic,
      data.orderNumber ?? null,
      data.subject,
      data.body
    );
    sendEmail(data.email, "support_reply", { reference, subject: data.subject, name: data.name });
    track("support_request", { topic: data.topic });
    return NextResponse.json({ ok: true, reference });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Please complete all fields correctly." }, { status: 400 });
    return NextResponse.json({ error: "Could not send your message. Please email support directly." }, { status: 500 });
  }
}
