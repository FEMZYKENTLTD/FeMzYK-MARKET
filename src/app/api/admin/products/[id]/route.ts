import { NextRequest, NextResponse } from "next/server";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { q, q1, run, insert, tx } from "@/lib/db";
import { productSchema } from "@/lib/adminProducts";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminUser();
    const p = q1<any>("SELECT * FROM products WHERE id = ?", (await params).id);
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    p.images = q("SELECT id, url, alt, role FROM product_images WHERE product_id = ? ORDER BY position", p.id);
    p.variants = q("SELECT id, sku, name, options_json, price_delta_cents, stock_qty FROM product_variants WHERE product_id = ?", p.id);
    p.category_ids = q("SELECT category_id FROM product_categories WHERE product_id = ?", p.id).map((r: any) => r.category_id);
    return NextResponse.json(p);
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminUser();
    const id = parseInt((await params).id, 10);
    const before = q1<any>("SELECT price_cents, stock_qty, status, sku, name FROM products WHERE id = ?", id);
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = productSchema.partial().parse(await req.json());
    tx(() => {
      const sets: string[] = [];
      const vals: any[] = [];
      const direct = [
        "name", "brand", "short_description", "description", "price_cents", "compare_at_cents", "cost_cents",
        "track_inventory", "stock_qty", "low_stock_threshold", "allow_backorder", "requires_shipping", "weight_grams",
        "status", "publish_at", "is_featured", "is_bestseller", "is_new", "warranty_text", "return_eligible", "return_notes",
        "digital_file_type", "digital_file_size", "digital_version", "digital_download_limit", "digital_expiry_days",
        "service_quote_type", "service_delivery_min_days", "service_delivery_max_days", "service_revisions",
        "seo_title", "seo_description", "seo_keywords", "supplier_id", "supplier_sku", "sku",
      ];
      for (const k of direct) {
        if ((data as any)[k] !== undefined) {
          sets.push(`${k} = ?`);
          vals.push((data as any)[k]);
        }
      }
      const jsonMap: [string, string][] = [
        ["specs", "specs_json"], ["features", "features_json"], ["faqs", "faq_json"], ["included", "included_json"],
        ["tags", "tags_json"], ["service_included", "service_included_json"], ["service_excluded", "service_excluded_json"],
        ["service_process", "service_process_json"], ["service_requirements", "service_requirements_json"],
      ];
      for (const [src, col] of jsonMap) {
        if ((data as any)[src] !== undefined) {
          sets.push(`${col} = ?`);
          vals.push(JSON.stringify((data as any)[src]));
        }
      }
      if (sets.length) {
        sets.push("updated_at = datetime('now')");
        run(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, ...vals, id);
      }
      if (data.category_ids) {
        run("DELETE FROM product_categories WHERE product_id = ?", id);
        for (const cid of data.category_ids) insert("INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)", id, cid);
      }
      if (data.images) {
        run("DELETE FROM product_images WHERE product_id = ?", id);
        data.images.forEach((img, pos) => insert("INSERT INTO product_images (product_id, url, alt, role, position) VALUES (?, ?, ?, ?, ?)", id, img.url, img.alt || data.name || "", img.role || "gallery", pos));
      }
      if (data.variants) {
        const keep = new Set<number>();
        for (const v of data.variants) {
          if (v.id) {
            keep.add(v.id);
            run("UPDATE product_variants SET name = ?, options_json = ?, price_delta_cents = ?, stock_qty = ?, sku = COALESCE(?, sku) WHERE id = ? AND product_id = ?", v.name, JSON.stringify(v.options ?? {}), v.price_delta_cents ?? 0, v.stock_qty ?? 0, v.sku ?? null, v.id, id);
          } else {
            insert("INSERT INTO product_variants (product_id, sku, name, options_json, price_delta_cents, stock_qty) VALUES (?, ?, ?, ?, ?, ?)", id, v.sku || null, v.name, JSON.stringify(v.options ?? {}), v.price_delta_cents ?? 0, v.stock_qty ?? 0);
          }
        }
        // remove deleted variants (only if none have sold — keep soft)
        if (keep.size) run(`DELETE FROM product_variants WHERE product_id = ? AND id NOT IN (${[...keep].join(",")})`, id);
        else run("DELETE FROM product_variants WHERE product_id = ?", id);
      }
    });

    const after = q1<any>("SELECT price_cents, stock_qty, status, sku, name FROM products WHERE id = ?", id);
    if (before.price_cents !== after.price_cents) audit(admin.id, "product_price_changed", "product", id, { price_cents: before.price_cents }, { price_cents: after.price_cents });
    if (before.stock_qty !== after.stock_qty) audit(admin.id, "product_inventory_changed", "product", id, { stock_qty: before.stock_qty }, { stock_qty: after.stock_qty });
    if (before.status !== after.status) audit(admin.id, "product_status_changed", "product", id, { status: before.status }, { status: after.status });
    audit(admin.id, "product_updated", "product", id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminUser();
    const p = q1<any>("SELECT slug, name, status FROM products WHERE id = ?", (await params).id);
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Archive instead of hard delete by default (protects order history).
    run("UPDATE products SET status = 'archived', updated_at = datetime('now') WHERE id = ?", (await params).id);
    audit(admin.id, "product_archived", "product", Number((await params).id), { status: p.status }, { status: "archived" });
    return NextResponse.json({ ok: true, archived: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
