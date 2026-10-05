import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { insert, q, q1, run } from "@/lib/db";
import { slugify } from "@/lib/util";

export async function GET() {
  try {
    adminUser();
    return NextResponse.json(q("SELECT * FROM categories ORDER BY (parent_id IS NOT NULL), position, name"));
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = adminUser();
    const data = z
      .object({
        name: z.string().min(1).max(80),
        slug: z.string().max(80).optional(),
        parent_id: z.number().int().nullable().optional(),
        description: z.string().max(400).optional(),
        image: z.string().optional(),
        position: z.number().int().default(0),
        is_active: z.boolean().default(true),
      })
      .parse(await req.json());
    let slug = data.slug?.trim() ? slugify(data.slug) : slugify(data.name);
    let i = 2;
    const base = slug;
    while (q1("SELECT id FROM categories WHERE slug = ?", slug)) slug = `${base}-${i++}`;
    const id = insert(
      "INSERT INTO categories (parent_id, slug, name, description, image, position, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      data.parent_id ?? null, slug, data.name, data.description ?? null, data.image ?? null, data.position, data.is_active ? 1 : 0
    );
    audit(admin.id, "category_created", "category", id, undefined, { name: data.name });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid category data." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = adminUser();
    const data = z
      .object({
        id: z.number().int(),
        name: z.string().min(1).max(80).optional(),
        description: z.string().max(400).nullable().optional(),
        image: z.string().nullable().optional(),
        position: z.number().int().optional(),
        is_active: z.boolean().optional(),
        parent_id: z.number().int().nullable().optional(),
      })
      .parse(await req.json());
    const { id, ...rest } = data;
    const sets: string[] = [];
    const vals: any[] = [];
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) {
        sets.push(`${k} = ?`);
        vals.push(typeof v === "boolean" ? (v ? 1 : 0) : v);
      }
    }
    if (sets.length) run(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, ...vals, id);
    audit(admin.id, "category_updated", "category", id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid data." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = adminUser();
    const id = Number(req.nextUrl.searchParams.get("id"));
    const used = q1<{ c: number }>("SELECT COUNT(*) AS c FROM product_categories WHERE category_id = ?", id)?.c ?? 0;
    if (used > 0) return NextResponse.json({ error: `Category has ${used} products. Move or remove them first.` }, { status: 400 });
    run("DELETE FROM categories WHERE id = ?", id);
    audit(admin.id, "category_deleted", "category", id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
