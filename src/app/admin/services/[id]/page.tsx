import { notFound } from "next/navigation";
import { q, q1 } from "@/lib/db";
import { PROJECT_STATUS_LABELS, PROJECT_TRANSITIONS } from "@/lib/statemachine";
import { parseJson } from "@/lib/util";
import ProjectAdminPanel from "./ProjectAdminPanel";

export const dynamic = "force-dynamic";

export default function AdminProjectDetail({ params }: { params: { id: string } }) {
  const project = q1<any>("SELECT * FROM projects WHERE id = ?", params.id);
  if (!project) notFound();
  const product = project.product_id ? q1<any>("SELECT name FROM products WHERE id = ?", project.product_id) : null;
  const requirement = q1<any>("SELECT * FROM project_requirements WHERE project_id = ? ORDER BY submitted_at DESC LIMIT 1", project.id);
  const messages = q<any>("SELECT * FROM project_messages WHERE project_id = ? ORDER BY created_at", project.id);
  const milestones = q<any>("SELECT * FROM project_milestones WHERE project_id = ? ORDER BY id", project.id);
  const fields = product?.id ? parseJson<any[]>(q1<any>("SELECT service_requirements_json FROM products WHERE id = ?", project.product_id)?.service_requirements_json || "[]", []) : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl text-cream-50">Project {project.reference}</h1>
        <span className="badge-gold">{PROJECT_STATUS_LABELS[project.status] ?? project.status}</span>
      </div>
      <p className="text-sm text-mist-400 mb-6">
        {product?.name ?? "Custom project"} · client: {project.email} {project.business_name ? `· ${project.business_name}` : ""}
      </p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          {requirement && (
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Client requirements</h2>
              <dl className="space-y-3">
                {Object.entries(parseJson<any>(requirement.content_json, {})).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] uppercase tracking-widest text-mist-500">{fields.find((f) => f.id === k)?.label ?? k}</dt>
                    <dd className="text-sm text-cream-200 mt-0.5 whitespace-pre-wrap">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Messages ({messages.length})</h2>
            <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {messages.map((m) => (
                <li key={m.id} className={`rounded-lg px-4 py-3 text-sm ${m.sender_type === "team" ? "bg-navy-900/60 border border-navy-700/50" : "bg-ink-800 border border-ink-700"}`}>
                  <p className="text-cream-100 whitespace-pre-wrap">{m.body}</p>
                  <p className="text-[10px] text-mist-500 mt-1">{m.sender_type === "team" ? m.sender_name || "Team" : "Client"} · {m.created_at}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ProjectAdminPanel
          projectId={project.id}
          status={project.status}
          nextStatuses={PROJECT_TRANSITIONS[project.status] ?? []}
          milestones={milestones.map((m) => ({ id: m.id, title: m.title, status: m.status }))}
        />
      </div>
    </div>
  );
}
