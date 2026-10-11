import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { q1, run, insert } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await adminUser();
    const page = q1<any>("SELECT * FROM content_pages WHERE slug = ?", (await params).slug);
    if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });
    return NextResponse.json(page);
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** Update an admin-managed content page (policies, about…). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const admin = await adminUser();
    const data = z.object({ title: z.string().min(2).max(160), body_md: z.string().min(10) }).parse(await req.json());
    const existing = q1("SELECT id FROM content_pages WHERE slug = ?", (await params).slug);
    if (existing) run("UPDATE content_pages SET title = ?, body_md = ?, updated_at = datetime('now') WHERE slug = ?", data.title, data.body_md, (await params).slug);
    else insert("INSERT INTO content_pages (slug, title, body_md) VALUES (?, ?, ?)", (await params).slug, data.title, data.body_md);
    audit(admin.id, "content_page_updated", "content_page", undefined, undefined, { slug: (await params).slug });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
