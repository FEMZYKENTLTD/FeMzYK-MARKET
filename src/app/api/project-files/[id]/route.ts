import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { q1 } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { adminUser } from "@/lib/adminApi";
import { getAccessibleProject } from "@/lib/projectAccess";
import { resolvePrivateFile, safeUploadName } from "@/lib/storage";

/** Project owner (including same-browser guest) or admin only. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const file = q1<any>(
    `SELECT pf.*, pr.reference, pr.user_id AS owner_id FROM project_files pf JOIN projects pr ON pr.id = pf.project_id WHERE pf.id = ?`,
    (await params).id
  );
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const user = await getSessionUser();
  let allowed = !!user && (file.owner_id === user.id);
  if (!allowed) {
    const access = await getAccessibleProject(file.reference);
    allowed = !!access && access.project.id === file.project_id;
  }
  if (!allowed) {
    try { await adminUser(); allowed = true; } catch {}
  }
  if (!allowed) return NextResponse.json({ error: "You don't have access to this file." }, { status: user ? 403 : 401 });

  let fullPath: string;
  try { fullPath = resolvePrivateFile(file.stored_path); } catch { return NextResponse.json({ error: "The file is no longer available. Contact support." }, { status: 410 }); }
  try {
    const data = fs.readFileSync(fullPath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeUploadName(file.filename))}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "The file is no longer available. Contact support." }, { status: 410 });
  }
}
