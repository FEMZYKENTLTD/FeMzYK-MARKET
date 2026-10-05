import { NextRequest, NextResponse } from "next/server";
import { requireUser, ApiError } from "@/lib/auth";
import { q1, insert } from "@/lib/db";
import { canTransition, PROJECT_TRANSITIONS } from "@/lib/statemachine";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: { reference: string } }) {
  try {
    const user = requireUser();
    const project = q1<any>("SELECT * FROM projects WHERE reference = ? AND user_id = ?", params.reference, user.id);
    if (!project) throw new ApiError(404, "Project not found.");
    if (!canTransition(PROJECT_TRANSITIONS, project.status, "REQUIREMENTS_RECEIVED") && project.status !== "REQUIREMENTS_PENDING") {
      throw new ApiError(400, "Requirements can't be updated in the current project state.");
    }
    const content = await req.json();
    if (!content || typeof content !== "object" || Object.keys(content).length === 0) {
      throw new ApiError(400, "Please complete the requirements form.");
    }
    insert("INSERT INTO project_requirements (project_id, content_json) VALUES (?, ?)", project.id, JSON.stringify(content));
    if (canTransition(PROJECT_TRANSITIONS, project.status, "REQUIREMENTS_RECEIVED")) {
      // use db run for update
      const { run } = await import("@/lib/db");
      run("UPDATE projects SET status = 'REQUIREMENTS_RECEIVED', updated_at = datetime('now') WHERE id = ?", project.id);
    }
    sendEmail(user.email, "service_status", { reference: project.reference, status: "Requirements received" });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not submit requirements." }, { status: 500 });
  }
}
