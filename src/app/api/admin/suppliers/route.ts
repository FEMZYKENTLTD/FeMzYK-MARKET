import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { insert, run, q1 } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const admin = await adminUser();
    const data = z.object({ name: z.string().min(2).max(120), contact_email: z.string().max(160).optional(), country: z.string().max(60).optional(), lead_time_days: z.number().int().min(0).nullable().optional(), notes: z.string().max(500).optional() }).parse(await req.json());
    const id = insert("INSERT INTO suppliers (name, contact_email, country, lead_time_days, notes) VALUES (?, ?, ?, ?, ?)", data.name, data.contact_email || null, data.country || null, data.lead_time_days ?? null, data.notes || null);
    audit(admin.id, "supplier_created", "supplier", id, undefined, { name: data.name });
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid supplier data." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await adminUser();
    const id = Number(req.nextUrl.searchParams.get("id"));
    const used = q1<{ c: number }>("SELECT COUNT(*) AS c FROM products WHERE supplier_id = ?", id)?.c ?? 0;
    if (used > 0) return NextResponse.json({ error: "Supplier has assigned products." }, { status: 400 });
    run("DELETE FROM suppliers WHERE id = ?", id);
    audit(admin.id, "supplier_deleted", "supplier", id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
