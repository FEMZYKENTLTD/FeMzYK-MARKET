import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ApiError } from "@/lib/auth";
import { q1, insert } from "@/lib/db";
import { rateLimit } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { reference: string } }) {
  try {
    const user = requireUser();
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!rateLimit(`msg:${user.id}`, 10, 60_000)) throw new ApiError(429, "Please wait a moment before sending another message.");
    const project = q1<any>("SELECT * FROM projects WHERE reference = ? AND user_id = ?", params.reference, user.id);
    if (!project) throw new ApiError(404, "Project not found.");
    const { body } = z.object({ body: z.string().min(1).max(2000) }).parse(await req.json());
    insert(
      "INSERT INTO project_messages (project_id, sender_type, sender_name, body) VALUES (?, 'customer', ?, ?)",
      project.id,
      user.firstName || user.email.split("@")[0],
      body.trim()
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
    return NextResponse.json({ error: "Could not send your message." }, { status: 500 });
  }
}
