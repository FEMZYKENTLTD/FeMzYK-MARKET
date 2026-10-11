import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { insert, q, q1, run } from "@/lib/db";
import { slugify } from "@/lib/util";

const imageValue = z.string().max(500).refine(
  (v) => v.startsWith("/images/") || v.startsWith("/uploads/") || /^https:\/\//i.test(v),
  "Use a local image path or HTTPS image URL."
);

export async function GET() {
  try {
    await adminUser();
    return NextResponse.json(q("SELECT * FROM categories ORDER BY (parent_id IS NOT NULL), position, name"));
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await adminUser();
    const data = z.object({
      name: z.string().trim().min(1).max(80),
      slug: z.string().trim().max(80).optional(),
      parent_id: z.number().int().positive().nullable().optional(),
      description: z.string().max(1000).optional(),
      image: imageValue.optional(),
      position: z.number().int().min(0).max(10000).default(0),
      is_active: z.boolean().default(true),
      seo_title: z.string().max(160).optional(),
      seo_description: z.string().max(300).optional(),
    }).strict().parse(await req.json());
    if (data.parent_id && !q1("SELECT id FROM categories WHERE id = ?", data.parent_id)) {
      return NextResponse.json({ error: "The selected parent category does not exist." }, { status: 400 });
    }
    let slug = data.slug ? slugify(data.slug) : slugify(data.name);
    const base = slug;
    let i = 2;
    while (q1("SELECT id FROM categories WHERE slug = ?", slug)) slug = `${base}-${i++}`;
    const id = insert(
      `INSERT INTO categories (parent_id, slug, name, description, image, position, is_active, seo_title, seo_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.parent_id ?? null, slug, data.name, data.description ?? null, data.image ?? null,
      data.position, data.is_active ? 1 : 0, data.seo_title ?? null, data.seo_description ?? null
    );
    audit(admin.id, "category_created", "category", id, undefined, { name: data.name, slug });
    return NextResponse.json({ ok: true, id, slug });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message || "Invalid category data." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await adminUser();
    const data = z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(1).max(80).optional(),
      description: z.string().max(1000).nullable().optional(),
      image: imageValue.nullable().optional(),
      position: z.number().int().min(0).max(10000).optional(),
      is_active: z.boolean().optional(),
      parent_id: z.number().int().positive().nullable().optional(),
      seo_title: z.string().max(160).nullable().optional(),
      seo_description: z.string().max(300).nullable().optional(),
    }).strict().parse(await req.json());
    const current = q1<any>("SELECT id FROM categories WHERE id = ?", data.id);
    if (!current) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    if (data.parent_id === data.id) return NextResponse.json({ error: "A category cannot be its own parent." }, { status: 400 });
    if (data.parent_id) {
      const parent = q1("SELECT id FROM categories WHERE id = ?", data.parent_id);
      if (!parent) return NextResponse.json({ error: "The selected parent category does not exist." }, { status: 400 });
      const cycle = q1(
        `WITH RECURSIVE descendants(id) AS (
           SELECT id FROM categories WHERE parent_id = ?
           UNION ALL SELECT c.id FROM categories c JOIN descendants d ON c.parent_id = d.id
         ) SELECT id FROM descendants WHERE id = ? LIMIT 1`,
        data.id, data.parent_id
      );
      if (cycle) return NextResponse.json({ error: "A category cannot be moved under one of its own descendants." }, { status: 400 });
    }
    const { id, ...rest } = data;
    const sets: string[] = [];
    const vals: any[] = [];
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined) continue;
      sets.push(`${key} = ?`);
      vals.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
    }
    if (sets.length) run(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, ...vals, id);
    audit(admin.id, "category_updated", "category", id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0]?.message || "Invalid category data." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await adminUser();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Valid category id required." }, { status: 400 });
    const category = q1("SELECT id FROM categories WHERE id = ?", id);
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    const usage = q1<{ c: number }>(
      `WITH RECURSIVE tree(id) AS (
         SELECT id FROM categories WHERE id = ?
         UNION ALL SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id
       ) SELECT COUNT(DISTINCT pc.product_id) AS c FROM product_categories pc JOIN tree ON tree.id = pc.category_id`,
      id
    )?.c ?? 0;
    const children = q1<{ c: number }>("SELECT COUNT(*) AS c FROM categories WHERE parent_id = ?", id)?.c ?? 0;
    if (usage > 0 || children > 0) {
      return NextResponse.json({ error: "This category has products or subcategories. Archive it instead, or move its contents first." }, { status: 400 });
    }
    run("DELETE FROM categories WHERE id = ?", id);
    audit(admin.id, "category_deleted", "category", id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
