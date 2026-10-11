import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { privateStorageRoot, safeUploadName } from "@/lib/storage";
import { adminUser, jsonError } from "@/lib/adminApi";

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_FILE = 50 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** Admin file upload (images and private digital assets). JSON: { dataUrl, name, kind } */
export async function POST(req: NextRequest) {
  try {
    await adminUser();
    const body = await req.json();
    const { dataUrl, name, kind } = body as { dataUrl: string; name?: string; kind?: string };
    if (!dataUrl?.startsWith("data:")) return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });

    const [meta, b64] = dataUrl.slice(5).split(";base64,");
    if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return NextResponse.json({ error: "Invalid file data." }, { status: 400 });
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0) return NextResponse.json({ error: "The file is empty." }, { status: 400 });

    if (kind === "digital") {
      if (buf.length > MAX_FILE) return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 400 });
      const dir = privateStorageRoot();
      fs.mkdirSync(dir, { recursive: true });
      const stored = path.join(dir, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeUploadName(name || "file")}`);
      fs.writeFileSync(stored, buf, { flag: "wx", mode: 0o600 });
      return NextResponse.json({ ok: true, storedPath: stored, originalName: safeUploadName(name || "file"), mimeType: meta, sizeBytes: buf.length });
    }

    const ext = IMAGE_TYPES[meta];
    if (!ext) return NextResponse.json({ error: "Only JPEG, PNG or WebP images are allowed." }, { status: 400 });
    if (buf.length > MAX_IMAGE) return NextResponse.json({ error: "Image too large (max 5 MB)." }, { status: 400 });
    const dir = path.join(process.cwd(), "data/uploads");
    fs.mkdirSync(dir, { recursive: true });
    const fname = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(dir, fname), buf, { flag: "wx", mode: 0o644 });
    return NextResponse.json({ ok: true, url: `/uploads/${fname}` });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
