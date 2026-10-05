import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, createSession, setSessionCookie, ApiError, rateLimit } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`login:${ip}`, 12, 60_000)) return NextResponse.json({ error: "Too many sign-in attempts — please wait a minute." }, { status: 429 });
  try {
    const body = await req.json();
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const data = schema.parse(body);
    const user = authenticate(data.email, data.password);
    const token = createSession(user.id);
    setSessionCookie(token);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
}
