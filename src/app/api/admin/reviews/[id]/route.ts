import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { q1, run } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = adminUser();
    const { status } = z.object({ status: z.enum(["pending", "approved", "rejected"]) }).parse(await req.json());
    const before = q1<{ status: string }>("SELECT status FROM reviews WHERE id = ?", params.id);
    if (!before) return NextResponse.json({ error: "Review not found." }, { status: 404 });
    run("UPDATE reviews SET status = ? WHERE id = ?", status, params.id);
    audit(admin.id, `review_${status}`, "review", Number(params.id), { status: before.status }, { status });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = adminUser();
    run("DELETE FROM reviews WHERE id = ?", params.id);
    audit(admin.id, "review_deleted", "review", Number(params.id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
