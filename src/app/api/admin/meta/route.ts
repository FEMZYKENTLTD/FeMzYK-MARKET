import { NextResponse } from "next/server";
import { adminUser, jsonError } from "@/lib/adminApi";
import { q } from "@/lib/db";

/** Shared metadata for admin forms. */
export async function GET() {
  try {
    adminUser();
    return NextResponse.json({
      types: q("SELECT code, name, requires_shipping, has_inventory FROM product_types ORDER BY id"),
      suppliers: q("SELECT id, name FROM suppliers WHERE is_active = 1 ORDER BY name"),
      zones: q("SELECT * FROM shipping_zones ORDER BY id"),
    });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
