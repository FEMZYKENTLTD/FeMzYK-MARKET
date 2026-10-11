import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { insert, q, run, q1 } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { resolvePrivateFile, safeUploadName } from "@/lib/storage";
import fs from "node:fs";

export async function GET() {
  try {
    await adminUser();
    return NextResponse.json(
      q(
        `SELECT p.id, p.name, p.digital_version, p.digital_file_type,
                (SELECT COUNT(*) FROM digital_files df WHERE df.product_id = p.id) AS file_count,
                (SELECT COUNT(*) FROM digital_entitlements de WHERE de.product_id = p.id) AS owners
         FROM products p WHERE p.type_code IN ('DIGITAL_PRODUCT','DOWNLOADABLE_RESOURCE') ORDER BY p.name`
      )
    );
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

/** Upload/replace the delivery file for a digital product; notify owners on version bump. */
export async function POST(req: NextRequest) {
  try {
    const admin = await adminUser();
    const data = z.object({ productId: z.number().int().positive(), storedPath: z.string().min(1).max(1200), originalName: z.string().min(1).max(200), mimeType: z.string().max(120).optional(), sizeBytes: z.number().int().nonnegative().optional(), version: z.string().min(1).max(20), notify: z.boolean().default(true) }).parse(await req.json());
    const product = q1<any>("SELECT id, name, digital_version, type_code FROM products WHERE id = ?", data.productId);
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    if (!['DIGITAL_PRODUCT', 'DOWNLOADABLE_RESOURCE'].includes(product.type_code)) return NextResponse.json({ error: "Files can only be attached to digital products." }, { status: 400 });
    let privatePath: string;
    try { privatePath = resolvePrivateFile(data.storedPath); } catch { return NextResponse.json({ error: "The uploaded file must exist inside private storage." }, { status: 400 }); }
    const actualSize = fs.statSync(privatePath).size;
    if (actualSize > 50 * 1024 * 1024 || (data.sizeBytes != null && data.sizeBytes !== actualSize)) return NextResponse.json({ error: "The uploaded file size is invalid." }, { status: 400 });

    // Keep old file records for audit/history, but only one version is active.
    run("UPDATE digital_files SET is_active = 0 WHERE product_id = ?", data.productId);
    insert("INSERT INTO digital_files (product_id, label, stored_path, original_name, mime_type, size_bytes, version) VALUES (?, 'Main file', ?, ?, ?, ?, ?)", data.productId, privatePath, safeUploadName(data.originalName), data.mimeType ?? null, actualSize, data.version);
    const bumped = data.version !== product.digital_version;
    run("UPDATE products SET digital_version = ?, digital_file_size = ? WHERE id = ?", data.version, data.sizeBytes ? `${Math.round(data.sizeBytes / 1024)} KB` : null, data.productId);
    audit(admin.id, "digital_file_uploaded", "product", data.productId, { version: product.digital_version }, { version: data.version });

    if (bumped && data.notify) {
      const owners = q<{ email: string }>("SELECT DISTINCT email FROM digital_entitlements WHERE product_id = ? AND revoked = 0", data.productId);
      for (const o of owners) sendEmail(o.email, "digital_update", { productName: product.name, version: data.version });
      audit(admin.id, "digital_update_notified", "product", data.productId, undefined, { recipients: owners.length });
    }
    return NextResponse.json({ ok: true, notified: bumped && data.notify });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid upload data." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
