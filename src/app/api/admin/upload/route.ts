import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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
    adminUser();
    const body = await req.json();
    const { dataUrl, name, kind } = body as { dataUrl: string; name?: string; kind?: string };
    if (!dataUrl?.startsWith("data:")) return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });

    const [meta, b64] = dataUrl.slice(5).split(";base64,");
    const buf = Buffer.from(b64 || "", "base64");

    if (kind === "digital") {
      if (buf.length > MAX_FILE) return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 400 });
      const dir = path.join(process.cwd(), process.env.STORAGE_ROOT || "data/files");
      fs.mkdirSync(dir, { recursive: true });
      const stored = path.join(dir, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${(name || "file").replace(/[^\w.\-]+/g, "_")}`);
      fs.writeFileSync(stored, buf);
      return NextResponse.json({ ok: true, storedPath: stored, originalName: name || "file", mimeType: meta, sizeBytes: buf.length });
    }

    const ext = IMAGE_TYPES[meta];
    if (!ext) return NextResponse.json({ error: "Only JPEG, PNG or WebP images are allowed." }, { status: 400 });
    if (buf.length > MAX_IMAGE) return NextResponse.json({ error: "Image too large (max 5 MB)." }, { status: 400 });
    const dir = path.join(process.cwd(), "data/uploads");
    fs.mkdirSync(dir, { recursive: true });
    const fname = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(dir, fname), buf);
    return NextResponse.json({ ok: true, url: `/uploads/${fname}` });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
