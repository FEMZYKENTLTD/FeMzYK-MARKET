import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { insert, q, run, q1 } from "@/lib/db";

const schema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(["percent", "fixed"]),
  value_cents: z.number().int().min(1),
  min_subtotal_cents: z.number().int().min(0).default(0),
  usage_limit: z.number().int().min(1).nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

export async function GET() {
  try {
    adminUser();
    return NextResponse.json(q("SELECT * FROM coupons ORDER BY created_at DESC".replace("created_at", "id")));
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = adminUser();
    const data = schema.parse(await req.json());
    if (q1("SELECT id FROM coupons WHERE code = ? COLLATE NOCASE", data.code.trim().toUpperCase())) {
      return NextResponse.json({ error: "A coupon with this code already exists." }, { status: 409 });
    }
    const id = insert(
      "INSERT INTO coupons (code, type, value_cents, min_subtotal_cents, usage_limit, starts_at, ends_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      data.code.trim().toUpperCase(), data.type, data.value_cents, data.min_subtotal_cents, data.usage_limit ?? null, data.starts_at ?? null, data.ends_at ?? null, data.is_active ? 1 : 0
    );
    audit(admin.id, "coupon_created", "coupon", id, undefined, { code: data.code });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid coupon data." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = adminUser();
    const data = schema.partial().extend({ id: z.number().int() }).parse(await req.json());
    const { id, ...rest } = data;
    const sets: string[] = [];
    const vals: any[] = [];
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) {
        sets.push(`${k} = ?`);
        vals.push(typeof v === "boolean" ? (v ? 1 : 0) : k === "code" ? String(v).toUpperCase() : v);
      }
    }
    if (sets.length) run(`UPDATE coupons SET ${sets.join(", ")} WHERE id = ?`, ...vals, id);
    audit(admin.id, "coupon_updated", "coupon", id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = adminUser();
    const id = Number(req.nextUrl.searchParams.get("id"));
    run("DELETE FROM coupons WHERE id = ?", id);
    audit(admin.id, "coupon_deleted", "coupon", id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
