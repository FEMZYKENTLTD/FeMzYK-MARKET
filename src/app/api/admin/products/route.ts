import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { q1, run, tx } from "@/lib/db";
import { productSchema, createProduct } from "@/lib/adminProducts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = await adminUser();
    const data = productSchema.parse(await req.json());
    const id = tx(() => createProduct(data, admin.id));
    audit(admin.id, "product_created", "product", id, undefined, { name: data.name, sku: data.sku });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Validation: " + e.errors.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** List for admin with filters. */
export async function GET(req: NextRequest) {
  try {
    await adminUser();
    const q = req.nextUrl.searchParams.get("q") || "";
    const status = req.nextUrl.searchParams.get("status") || "";
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const like = `%${q}%`;
    const where = `WHERE 1=1 ${q ? "AND (p.name LIKE ? OR p.sku LIKE ? OR p.slug LIKE ?)" : ""} ${status ? "AND p.status = ?" : ""}`;
    const params: any[] = [];
    if (q) params.push(like, like, like);
    if (status) params.push(status);
    const { q: query } = await import("@/lib/db");
    const total = (query(`SELECT COUNT(*) AS c FROM products p ${where}`, ...params)[0] as any).c;
    const items = query(
      `SELECT p.*, (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image
       FROM products p ${where} ORDER BY p.updated_at DESC LIMIT 30 OFFSET ?`,
      ...params,
      (page - 1) * 30
    );
    return NextResponse.json({ items, total, page, pages: Math.ceil(total / 30) });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
