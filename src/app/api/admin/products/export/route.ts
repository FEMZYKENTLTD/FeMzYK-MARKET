import { NextResponse } from "next/server";
import { adminUser, jsonError } from "@/lib/adminApi";
import { q } from "@/lib/db";

/** CSV export of the full catalog (admin-only). */
export async function GET() {
  try {
    adminUser();
    const rows = q<any>(
      `SELECT p.id, p.sku, p.slug, p.name, p.type_code, p.brand, p.status, p.price_cents, p.compare_at_cents, p.stock_qty,
              p.is_featured, p.is_bestseller, p.sales_count, p.views, p.created_at,
              GROUP_CONCAT(DISTINCT c.slug) AS categories
       FROM products p LEFT JOIN product_categories pc ON pc.product_id = p.id LEFT JOIN categories c ON c.id = pc.category_id
       GROUP BY p.id ORDER BY p.id`
    );
    const header = ["id", "sku", "slug", "name", "type_code", "brand", "status", "price_cents", "compare_at_cents", "stock_qty", "is_featured", "is_bestseller", "sales_count", "views", "created_at", "categories"];
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header.join(","), ...rows.map((r) => header.map((h) => esc(r[h])).join(","))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="femzyk-products-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
