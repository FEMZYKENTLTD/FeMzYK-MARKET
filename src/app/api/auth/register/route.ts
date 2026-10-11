import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerUser, createSession, setSessionCookie, ApiError, rateLimit } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`register:${ip}`, 8, 60_000)) return NextResponse.json({ error: "Too many attempts — please wait a minute." }, { status: 429 });
  try {
    const body = await req.json();
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8).max(100),
      firstName: z.string().max(60).optional(),
      lastName: z.string().max(60).optional(),
      marketing: z.boolean().optional(),
    });
    const data = schema.parse(body);
    const id = await registerUser({ email: data.email, password: data.password, firstName: data.firstName, lastName: data.lastName, marketing: data.marketing });
    const token = createSession(id);
    await setSessionCookie(token);
    sendEmail(data.email, "welcome", { name: data.firstName });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
    console.error("[register]", e);
    return NextResponse.json({ error: "Could not create your account." }, { status: 500 });
  }
}
