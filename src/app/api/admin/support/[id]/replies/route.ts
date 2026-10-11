import { NextRequest, NextResponse } from "next/server";
import { adminUser, jsonError } from "@/lib/adminApi";
import { q } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminUser();
    return NextResponse.json(q("SELECT author_type, body, created_at FROM support_replies WHERE ticket_id = ? ORDER BY created_at, id", (await params).id));
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
