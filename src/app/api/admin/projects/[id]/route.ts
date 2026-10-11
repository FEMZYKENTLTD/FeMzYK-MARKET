import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { q1, run, insert } from "@/lib/db";
import { canTransition, PROJECT_TRANSITIONS, PROJECT_STATUS_LABELS } from "@/lib/statemachine";
import { sendEmail } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminUser();
    const data = z
      .object({
        status: z.string().optional(),
        message: z.string().min(1).max(2000).optional(),
        milestone: z.object({ id: z.number().int(), status: z.enum(["TODO", "IN_PROGRESS", "DONE"]) }).optional(),
        business_name: z.string().max(120).optional(),
      })
      .parse(await req.json());

    const project = q1<any>("SELECT * FROM projects WHERE id = ?", (await params).id);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    if (data.status && data.status !== project.status) {
      if (!canTransition(PROJECT_TRANSITIONS, project.status, data.status)) {
        return NextResponse.json({ error: `Cannot move project from ${project.status} to ${data.status}.` }, { status: 400 });
      }
      run("UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?", data.status, project.id);
      audit(admin.id, "project_status_changed", "project", project.id, { status: project.status }, { status: data.status });
      sendEmail(project.email, "service_status", { reference: project.reference, status: PROJECT_STATUS_LABELS[data.status] || data.status });
    }
    if (data.message) {
      insert("INSERT INTO project_messages (project_id, sender_type, sender_name, body) VALUES (?, 'team', ?, ?)", project.id, admin.firstName || "FEMZYK Team", data.message);
    }
    if (data.milestone) {
      run("UPDATE project_milestones SET status = ?, completed_at = CASE WHEN ? = 'DONE' THEN datetime('now') ELSE NULL END WHERE id = ? AND project_id = ?", data.milestone.status, data.milestone.status, data.milestone.id, project.id);
    }
    if (data.business_name !== undefined) {
      run("UPDATE projects SET business_name = ? WHERE id = ?", data.business_name || null, project.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
