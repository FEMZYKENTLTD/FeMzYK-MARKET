import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/auth";
import { getAccessibleProject } from "@/lib/projectAccess";
import { q1, insert, run } from "@/lib/db";
import { canTransition, PROJECT_TRANSITIONS } from "@/lib/statemachine";
import { sendEmail } from "@/lib/email";
import { parseJson } from "@/lib/util";

export async function POST(req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const access = await getAccessibleProject((await params).reference);
    if (!access) throw new ApiError(404, "Project not found.");
    const { project } = access;
    if (!canTransition(PROJECT_TRANSITIONS, project.status, "REQUIREMENTS_RECEIVED") && project.status !== "REQUIREMENTS_PENDING") {
      throw new ApiError(400, "Requirements can't be updated in the current project state.");
    }
    const content = await req.json();
    if (!content || typeof content !== "object" || Array.isArray(content) || Object.keys(content).length === 0 || Object.keys(content).length > 40) {
      throw new ApiError(400, "Please complete the requirements form.");
    }
    for (const [key, value] of Object.entries(content)) {
      if (!/^[\w-]{1,80}$/.test(key) || typeof value !== "string" || value.length > 5000) {
        throw new ApiError(400, "Please check the requirements fields and try again.");
      }
    }
    const product = project.product_id ? q1<any>("SELECT service_requirements_json FROM products WHERE id = ?", project.product_id) : null;
    const fields = product ? parseJson<any[]>(product.service_requirements_json, []) : [];
    const allowed = new Set(fields.map((f) => f.id));
    if (fields.length && Object.keys(content).some((key) => !allowed.has(key))) throw new ApiError(400, "The requirements form has changed. Refresh and try again.");
    insert("INSERT INTO project_requirements (project_id, content_json) VALUES (?, ?)", project.id, JSON.stringify(content));
    if (canTransition(PROJECT_TRANSITIONS, project.status, "REQUIREMENTS_RECEIVED")) {
      run("UPDATE projects SET status = 'REQUIREMENTS_RECEIVED', updated_at = datetime('now') WHERE id = ?", project.id);
    }
    sendEmail(project.email, "service_status", { reference: project.reference, status: "Requirements received" });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not submit requirements." }, { status: 500 });
  }
}
