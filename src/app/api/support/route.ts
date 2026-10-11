import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { insert, q1, refNumber, run } from "@/lib/db";
import { rateLimit, getSessionUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`support:${ip}`, 8, 60_000)) return NextResponse.json({ error: "Please wait a minute before sending another message." }, { status: 429 });
  try {
    const body = await req.json();

    // Existing-ticket reply from a customer (reference + matching email).
    if (body.reference) {
      const data = z.object({ reference: z.string().min(6).max(30), email: z.string().email(), body: z.string().min(5).max(5000) }).parse(body);
      const ticket = q1<any>("SELECT * FROM support_tickets WHERE reference = ? AND lower(email) = lower(?)", data.reference, data.email);
      if (!ticket) return NextResponse.json({ error: "We couldn't find that request for this email address." }, { status: 404 });
      if (ticket.status === "closed") return NextResponse.json({ error: "This request is closed. Please open a new one if you need more help." }, { status: 400 });
      insert("INSERT INTO support_replies (ticket_id, author_type, body) VALUES (?, 'customer', ?)", ticket.id, data.body);
      run_status(ticket.id, "open");
      return NextResponse.json({ ok: true });
    }

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
    const user = await getSessionUser();
    const reference = refNumber("SUP");
    const id = insert(
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
    insert("INSERT INTO support_replies (ticket_id, author_type, body) VALUES (?, 'customer', ?)", id, data.body);
    sendEmail(data.email, "support_received", { reference, subject: data.subject, name: data.name, helpUrl: "/help" });
    track("support_request", { topic: data.topic });
    return NextResponse.json({ ok: true, reference });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Please complete all fields correctly." }, { status: 400 });
    return NextResponse.json({ error: "Could not send your message. Please email support directly." }, { status: 500 });
  }
}

function run_status(id: number, status: string) {
  run("UPDATE support_tickets SET status = ? WHERE id = ? AND status IN ('pending','resolved')", status, id);
}
