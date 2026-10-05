import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { insert, run, q1 } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const admin = adminUser();
    const data = z.object({ zone_id: z.number().int(), method: z.object({ id: z.number().optional(), name: z.string().min(1).max(80).optional(), price_cents: z.number().int().min(0).optional(), free_threshold_cents: z.number().int().min(0).nullable().optional(), min_days: z.number().int().min(0).optional(), max_days: z.number().int().min(0).optional() }) }).parse(await req.json());
    const m = data.method;
    if (m.id) {
      const sets: string[] = [];
      const vals: any[] = [];
      for (const [k, v] of Object.entries(m)) {
        if (k === "id" || v === undefined) continue;
        sets.push(`${k} = ?`);
        vals.push(v);
      }
      if (sets.length) run(`UPDATE shipping_methods SET ${sets.join(", ")} WHERE id = ? AND zone_id = ?`, ...vals, m.id, data.zone_id);
      audit(admin.id, "shipping_method_updated", "shipping_method", m.id);
    } else {
      const id = insert(
        "INSERT INTO shipping_methods (zone_id, name, price_cents, free_threshold_cents, min_days, max_days) VALUES (?, ?, ?, ?, ?, ?)",
        data.zone_id, m.name || "Standard Shipping", m.price_cents ?? 0, m.free_threshold_cents ?? null, m.min_days ?? 3, m.max_days ?? 7
      );
      audit(admin.id, "shipping_method_created", "shipping_method", id);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid shipping data." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = adminUser();
    const id = Number(req.nextUrl.searchParams.get("method_id"));
    run("DELETE FROM shipping_methods WHERE id = ?", id);
    audit(admin.id, "shipping_method_deleted", "shipping_method", id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
