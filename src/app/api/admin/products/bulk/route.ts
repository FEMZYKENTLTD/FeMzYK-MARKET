import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { run } from "@/lib/db";

/** Bulk product operations: publish / unpublish / archive / price adjust / category change / tags. */
export async function POST(req: NextRequest) {
  try {
    const admin = adminUser();
    const data = z
      .object({
        ids: z.array(z.number().int()).min(1).max(500),
        action: z.enum(["publish", "unpublish", "archive", "restore-draft", "price-percent", "add-category", "remove-category", "add-tag", "remove-tag", "set-stock"]),
        value: z.union([z.number(), z.string()]).optional(),
      })
      .parse(await req.json());

    const marks = data.ids.join(",");
    switch (data.action) {
      case "publish":
        run(`UPDATE products SET status = 'published', updated_at = datetime('now') WHERE id IN (${marks})`);
        break;
      case "unpublish":
        run(`UPDATE products SET status = 'draft', updated_at = datetime('now') WHERE id IN (${marks})`);
        break;
      case "archive":
        run(`UPDATE products SET status = 'archived', updated_at = datetime('now') WHERE id IN (${marks})`);
        break;
      case "restore-draft":
        run(`UPDATE products SET status = 'draft', updated_at = datetime('now') WHERE id IN (${marks})`);
        break;
      case "price-percent": {
        const pct = Number(data.value);
        if (!pct) return NextResponse.json({ error: "Percent required." }, { status: 400 });
        run(`UPDATE products SET price_cents = MAX(0, ROUND(price_cents * (1 + ?/100.0))), updated_at = datetime('now') WHERE id IN (${marks})`, pct);
        break;
      }
      case "set-stock": {
        const qty = Number(data.value);
        if (Number.isNaN(qty) || qty < 0) return NextResponse.json({ error: "Valid quantity required." }, { status: 400 });
        run(`UPDATE products SET stock_qty = ?, updated_at = datetime('now') WHERE id IN (${marks})`, qty);
        break;
      }
      case "add-category":
        for (const id of data.ids) run("INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)", id, Number(data.value));
        break;
      case "remove-category":
        for (const id of data.ids) run("DELETE FROM product_categories WHERE product_id = ? AND category_id = ?", id, Number(data.value));
        break;
      case "add-tag":
      case "remove-tag": {
        const { q: query } = await import("@/lib/db");
        const tag = String(data.value || "").trim();
        if (!tag) return NextResponse.json({ error: "Tag required." }, { status: 400 });
        for (const id of data.ids) {
          const row = query<any>("SELECT tags_json FROM products WHERE id = ?", id)[0];
          const tags: string[] = JSON.parse(row.tags_json || "[]");
          if (data.action === "add-tag") {
            if (!tags.includes(tag)) tags.push(tag);
          } else {
            const ix = tags.indexOf(tag);
            if (ix >= 0) tags.splice(ix, 1);
          }
          run("UPDATE products SET tags_json = ? WHERE id = ?", JSON.stringify(tags), id);
        }
        break;
      }
    }
    audit(admin.id, `bulk_${data.action}`, "product", undefined, undefined, { count: data.ids.length, value: data.value });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid bulk request." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
