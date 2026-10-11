import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

/** Serve admin-uploaded public images from data/uploads. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const safe = path.basename((await params).file);
  const abs = path.join(process.cwd(), "data/uploads", safe);
  if (!fs.existsSync(abs)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const type = abs.endsWith(".png") ? "image/png" : abs.endsWith(".webp") ? "image/webp" : "image/jpeg";
  const data = fs.readFileSync(abs);
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
