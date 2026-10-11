import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { q1, run, insert } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminUser();
    const ticket = q1<any>("SELECT * FROM support_tickets WHERE id = ?", (await params).id);
    if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    return NextResponse.json(ticket);
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminUser();
    const ticket = q1<any>("SELECT * FROM support_tickets WHERE id = ?", (await params).id);
    if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    const data = z.object({ status: z.enum(["open", "pending", "resolved", "closed"]).optional(), assigned_to: z.string().max(120).nullable().optional() }).parse(await req.json());
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.status) { sets.push("status = ?"); vals.push(data.status); }
    if (data.assigned_to !== undefined) { sets.push("assigned_to = ?"); vals.push(data.assigned_to); }
    if (sets.length) run(`UPDATE support_tickets SET ${sets.join(", ")} WHERE id = ?`, ...vals, ticket.id);
    audit(admin.id, data.status ? `support_status_${data.status}` : "support_assigned", "support_ticket", ticket.id, { status: ticket.status }, data);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** Save a team reply and record a notification event in the outbox. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminUser();
    const ticket = q1<any>("SELECT * FROM support_tickets WHERE id = ?", (await params).id);
    if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    const data = z.object({ reply: z.string().min(2).max(5000) }).parse(await req.json());
    insert("INSERT INTO support_replies (ticket_id, author_type, body) VALUES (?, 'team', ?)", ticket.id, data.reply);
    run("UPDATE support_tickets SET status = 'pending' WHERE id = ? AND status = 'open'", ticket.id);
    sendEmail(ticket.email, "support_reply", { reference: ticket.reference, subject: ticket.subject, name: ticket.name, reply: data.reply, helpUrl: "/help" });
    audit(admin.id, "support_replied", "support_ticket", ticket.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Reply is required." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
