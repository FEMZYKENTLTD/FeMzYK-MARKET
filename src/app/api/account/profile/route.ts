import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, audit } from "@/lib/auth";
import { run } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = z
      .object({
        firstName: z.string().max(60).optional(),
        lastName: z.string().max(60).optional(),
        marketing: z.boolean().optional(),
      })
      .parse(await req.json());
    run(
      "UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), marketing_opt_in = COALESCE(?, marketing_opt_in), updated_at = datetime('now') WHERE id = ?",
      data.firstName ?? null,
      data.lastName ?? null,
      data.marketing == null ? null : data.marketing ? 1 : 0,
      user.id
    );
    audit(user.id, "profile_updated", "user", user.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.status) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not update your profile." }, { status: 500 });
  }
}
