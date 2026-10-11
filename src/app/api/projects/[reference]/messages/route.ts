import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, rateLimit } from "@/lib/auth";
import { getAccessibleProject } from "@/lib/projectAccess";
import { insert } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const access = await getAccessibleProject((await params).reference);
    if (!access) throw new ApiError(404, "Project not found.");
    const { project, user } = access;
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!rateLimit(`msg:${project.id}:${user?.id ?? ip}`, 10, 60_000)) throw new ApiError(429, "Please wait a moment before sending another message.");
    const { body } = z.object({ body: z.string().min(1).max(2000) }).parse(await req.json());
    insert(
      "INSERT INTO project_messages (project_id, sender_type, sender_name, body) VALUES (?, 'customer', ?, ?)",
      project.id,
      user?.firstName || (user?.email ?? project.email).split("@")[0],
      body.trim()
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
    return NextResponse.json({ error: "Could not send your message." }, { status: 500 });
  }
}
