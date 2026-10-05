import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { q1, run, insert } from "@/lib/db";
import { rateLimit } from "@/lib/auth";
import { track } from "@/lib/analytics";

/**
 * Secure digital download.
 * - Token-scoped URLs (raw storage paths are never exposed).
 * - Download limits + expiry enforced server-side.
 * - Every download is logged for the customer's purchase history.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`dl:${params.token}`, 10, 60_000)) return NextResponse.json({ error: "Too many requests — try again shortly." }, { status: 429 });

  const ent = q1<any>(
    `SELECT de.*, p.name AS product_name FROM digital_entitlements de JOIN products p ON p.id = de.product_id WHERE de.token = ?`,
    params.token
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

  let filePath: string;
  let fileName: string;
  let mime: string;

  const file = q1<any>("SELECT * FROM digital_files WHERE product_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1", ent.product_id);
  if (file && fs.existsSync(file.stored_path)) {
    filePath = file.stored_path;
    fileName = file.original_name;
    mime = file.mime_type || "application/octet-stream";
  } else {
    // Production assets are uploaded by the admin; until then deliver a
    // branded placeholder so the delivery pipeline works end-to-end.
    const dir = path.join(process.cwd(), process.env.STORAGE_ROOT || "data/files");
    fs.mkdirSync(dir, { recursive: true });
    filePath = path.join(dir, `product-${ent.product_id}-placeholder.txt`);
    fs.writeFileSync(
      filePath,
      `FEMZYK MARKET — ${ent.product_name}\n\nThank you for your purchase.\n\nThis placeholder file is delivered because the production asset is still being uploaded by the FEMZYK studio. Once uploaded, this same link automatically serves the real file (latest version).\n\n— The FEMZYK Team\n`
    );
    fileName = `${ent.product_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
    mime = "text/plain";
  }

  run("UPDATE digital_entitlements SET downloads_used = downloads_used + 1 WHERE id = ?", ent.id);
  insert("INSERT INTO digital_downloads (entitlement_id, ip, user_agent) VALUES (?, ?, ?)", ent.id, ip, req.headers.get("user-agent") || "");
  track("download", { productId: ent.product_id });

  const data = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "no-store",
    },
  });
}
