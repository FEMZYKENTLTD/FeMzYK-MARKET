import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, clearSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = cookies().get("fm_session")?.value;
  if (token) destroySession(token);
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
