import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { requireUser, ApiError, verifyPassword, hashPassword, rateLimit, audit } from "@/lib/auth";
import { q1, run, nowIso } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`password-change:${ip}`, 6, 60_000)) return NextResponse.json({ error: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  try {
    const user = await requireUser();
    const data = z.object({ currentPassword: z.string().min(1).max(100), newPassword: z.string().min(12).max(100) }).parse(await req.json());
    const record = q1<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", user.id);
    if (!record || !verifyPassword(data.currentPassword, record.password_hash)) {
      return NextResponse.json({ error: "Current password is not correct." }, { status: 400 });
    }
    if (data.currentPassword === data.newPassword) return NextResponse.json({ error: "Choose a new password different from your current one." }, { status: 400 });
    run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", hashPassword(data.newPassword), nowIso(), user.id);
    const currentToken = (await cookies()).get("fm_session")?.value;
    if (currentToken) run("DELETE FROM sessions WHERE user_id = ? AND token != ?", user.id, currentToken);
    audit(user.id, "password_changed", "user", user.id);
    return NextResponse.json({ ok: true, message: "Password updated. Other signed-in sessions have been ended." });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Use a new password with at least 12 characters." }, { status: 400 });
    return NextResponse.json({ error: "Could not update your password." }, { status: 500 });
  }
}
