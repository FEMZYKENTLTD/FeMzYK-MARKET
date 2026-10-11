import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ApiError } from "@/lib/auth";
import { q, q1, insert } from "@/lib/db";
import { adminUser } from "@/lib/adminApi";
import { getAccessibleProject } from "@/lib/projectAccess";
import { privateStorageRoot, safeUploadName } from "@/lib/storage";

const MAX = 25 * 1024 * 1024;

async function resolveProject(reference: string, allowAdmin: boolean) {
  const access = await getAccessibleProject(reference);
  if (access) return { project: access.project, uploader: "customer" };
  if (allowAdmin) {
    try {
      await adminUser();
      const project = q1<any>("SELECT * FROM projects WHERE reference = ?", reference);
      if (project) return { project, uploader: "team" };
    } catch {}
  }
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const resolved = await resolveProject((await params).reference, true);
    if (!resolved) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json(q("SELECT id, filename, size_bytes, uploaded_by, created_at FROM project_files WHERE project_id = ? ORDER BY created_at DESC, id DESC", resolved.project.id));
  } catch {
    return NextResponse.json({ error: "Could not list files." }, { status: 500 });
  }
}

/** Customer or admin uploads a project file into private storage. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const resolved = await resolveProject((await params).reference, true);
    if (!resolved) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const body = await req.json();
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    const originalName = safeUploadName(typeof body?.name === "string" ? body.name : "file");
    if (!dataUrl.startsWith("data:")) throw new ApiError(400, "Invalid file payload.");
    const [meta, b64] = dataUrl.slice(5).split(";base64,");
    if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new ApiError(400, "Invalid file data.");
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0) throw new ApiError(400, "Empty file.");
    if (buf.length > MAX) throw new ApiError(400, "File too large (max 25 MB).");

    const dir = privateStorageRoot();
    fs.mkdirSync(dir, { recursive: true });
    const stored = path.join(dir, `proj-${resolved.project.id}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}-${originalName}`);
    fs.writeFileSync(stored, buf, { flag: "wx", mode: 0o600 });
    const id = insert("INSERT INTO project_files (project_id, filename, stored_path, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?)", resolved.project.id, originalName, stored, buf.length, resolved.uploader);
    return NextResponse.json({ ok: true, id, mime: meta });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not upload the file." }, { status: 500 });
  }
}
