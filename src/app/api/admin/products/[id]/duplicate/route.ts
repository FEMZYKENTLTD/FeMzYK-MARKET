import { NextRequest, NextResponse } from "next/server";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { q, q1, insert, tx } from "@/lib/db";
import { slugify } from "@/lib/util";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminUser();
    const src = q1<any>("SELECT * FROM products WHERE id = ?", (await params).id);
    if (!src) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const id = tx(() => {
      let slug = `${src.slug}-copy`;
      let i = 2;
      while (q1("SELECT id FROM products WHERE slug = ?", slug)) slug = `${src.slug}-copy-${i++}`;
      let sku = `${src.sku}-COPY`;
      while (q1("SELECT id FROM products WHERE sku = ?", sku)) sku = `${src.sku}-COPY${i++}`;
      const copy = { ...src };
      delete copy.id;
      const cols = Object.keys(copy).filter((k) => !["views", "sales_count", "created_at", "updated_at"].includes(k));
      const vals = cols.map((k) => {
        if (k === "slug") return slug;
        if (k === "sku") return sku;
        if (k === "name") return `${src.name} (Copy)`;
        if (k === "status") return "draft";
        return copy[k];
      });
      const newId = insert(`INSERT INTO products (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, ...vals);
      for (const img of q("SELECT url, alt, role, position FROM product_images WHERE product_id = ?", src.id) as any[]) {
        insert("INSERT INTO product_images (product_id, url, alt, role, position) VALUES (?, ?, ?, ?, ?)", newId, img.url, img.alt, img.role, img.position);
      }
      for (const v of q("SELECT name, options_json, price_delta_cents, stock_qty FROM product_variants WHERE product_id = ?", src.id) as any[]) {
        insert("INSERT INTO product_variants (product_id, name, options_json, price_delta_cents, stock_qty) VALUES (?, ?, ?, ?, ?)", newId, v.name, v.options_json, v.price_delta_cents, v.stock_qty);
      }
      for (const c of q("SELECT category_id FROM product_categories WHERE product_id = ?", src.id) as any[]) {
        insert("INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)", newId, c.category_id);
      }
      return newId;
    });
    audit(admin.id, "product_duplicated", "product", id, { from: Number((await params).id) });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
