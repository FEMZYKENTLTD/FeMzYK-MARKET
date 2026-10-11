import { NextRequest, NextResponse } from "next/server";
import { q, q1 } from "@/lib/db";
import { rateLimit } from "@/lib/auth";

/** Customer-facing ticket lookup: reference + matching email only. */
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`ticket:${ip}`, 12, 60_000)) return NextResponse.json({ error: "Too many lookups — try again shortly." }, { status: 429 });
  const reference = req.nextUrl.searchParams.get("reference") || "";
  const email = req.nextUrl.searchParams.get("email") || "";
  if (!reference || !email) return NextResponse.json({ error: "Reference and email are required." }, { status: 400 });
  const ticket = q1<any>("SELECT reference, subject, topic, status, created_at, id FROM support_tickets WHERE reference = ? AND lower(email) = lower(?)", reference, email);
  if (!ticket) return NextResponse.json({ error: "We couldn't find that request for this email address." }, { status: 404 });
  const replies = q<any>("SELECT author_type, body, created_at FROM support_replies WHERE ticket_id = ? ORDER BY created_at, id", ticket.id);
  return NextResponse.json({ ticket: { reference: ticket.reference, subject: ticket.subject, topic: ticket.topic, status: ticket.status, created_at: ticket.created_at }, replies });
}
