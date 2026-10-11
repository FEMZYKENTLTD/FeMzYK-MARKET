import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { q1, run, insert, tx } from "@/lib/db";
import { rateLimit } from "@/lib/auth";
import { getActiveDigitalFile } from "@/lib/digital";
import { safeUploadName } from "@/lib/storage";
import { track } from "@/lib/analytics";

/**
 * Private, entitlement-scoped download. The storage path is never returned to
 * the browser; download limits are atomically enforced to resist parallel use.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(`dl:${(await params).token}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests — try again shortly." }, { status: 429 });
  }

  const ent = q1<any>(
    `SELECT de.*, p.name AS product_name FROM digital_entitlements de JOIN products p ON p.id = de.product_id WHERE de.token = ?`,
    (await params).token
  );
  if (!ent || ent.revoked) {
    return NextResponse.json(
      { error: "This download link isn't valid. If you purchased this product, sign in and open Downloads — or contact support and we'll restore access." },
      { status: 403 }
    );
  }
  if (ent.expires_at && new Date(ent.expires_at.replace(" ", "T") + "Z").getTime() < Date.now()) {
    return NextResponse.json({ error: "Your download access has expired. Your purchase is safe — contact support and we'll renew it." }, { status: 403 });
  }
  if (ent.downloads_used >= ent.download_limit) {
    return NextResponse.json({ error: "This link has reached its download limit. Contact support if you need another copy — we'll verify your purchase." }, { status: 403 });
  }

  const file = getActiveDigitalFile(ent.product_id);
  if (!file || !fs.existsSync(file.stored_path)) {
    // Never substitute a placeholder for a paid digital deliverable.
    return NextResponse.json({ error: "This file is temporarily unavailable. Your access is safe; contact support and we'll help." }, { status: 410 });
  }

  let data: Buffer;
  try {
    data = fs.readFileSync(file.stored_path);
  } catch {
    return NextResponse.json({ error: "This file is temporarily unavailable. Your access is safe; contact support and we'll help." }, { status: 410 });
  }

  const claimed = tx(() => {
    const result = run(
      `UPDATE digital_entitlements SET downloads_used = downloads_used + 1
       WHERE id = ? AND revoked = 0 AND downloads_used < download_limit
         AND (expires_at IS NULL OR expires_at >= datetime('now'))`,
      ent.id
    );
    if (Number(result.changes) !== 1) return false;
    insert("INSERT INTO digital_downloads (entitlement_id, ip, user_agent) VALUES (?, ?, ?)",
      ent.id, req.headers.get("x-forwarded-for") || "", req.headers.get("user-agent") || "");
    return true;
  });
  if (!claimed) {
    const fresh = q1<any>("SELECT revoked, downloads_used, download_limit, expires_at FROM digital_entitlements WHERE id = ?", ent.id);
    if (!fresh || fresh.revoked) return NextResponse.json({ error: "This download link is no longer valid." }, { status: 403 });
    if (fresh.downloads_used >= fresh.download_limit) return NextResponse.json({ error: "This link has reached its download limit. Contact support if you need another copy." }, { status: 403 });
    return NextResponse.json({ error: "Your download access has expired. Contact support and we'll help." }, { status: 403 });
  }

  track("download", { productId: ent.product_id });
  const fileName = safeUploadName(file.original_name || `${ent.product_name}.download`);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
