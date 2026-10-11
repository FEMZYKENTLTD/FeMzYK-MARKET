import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { PROJECT_STATUS_LABELS } from "@/lib/statemachine";
import { parseJson } from "@/lib/util";
import RequirementsForm from "@/app/account/services/[reference]/RequirementsForm";
import MessageBoard from "@/app/account/services/[reference]/MessageBoard";
import FileShare from "@/components/project/FileShare";

export default function ProjectWorkspace({ project, guest = false, orderNumber = "" }: { project: any; guest?: boolean; orderNumber?: string }) {
  const product = project.product_id ? q1<any>("SELECT name, service_requirements_json FROM products WHERE id = ?", project.product_id) : null;
  const pkg = project.package_id ? q1<any>("SELECT * FROM service_packages WHERE id = ?", project.package_id) : null;
  const milestones = q<any>("SELECT * FROM project_milestones WHERE project_id = ? ORDER BY id", project.id);
  const messages = q<any>("SELECT * FROM project_messages WHERE project_id = ? ORDER BY created_at", project.id);
  const requirement = q1<any>("SELECT * FROM project_requirements WHERE project_id = ? ORDER BY submitted_at DESC LIMIT 1", project.id);
  const fields = product ? parseJson<any[]>(product.service_requirements_json, []) : [];
  const STEPS = ["PAID", "REQUIREMENTS_PENDING", "REQUIREMENTS_RECEIVED", "IN_PROGRESS", "CLIENT_REVIEW", "COMPLETED"];
  const stepIdx = STEPS.indexOf(project.status);
  const fileShare = <FileShare projectRef={project.reference} role="customer" />;

  return (
    <div>
      <Link href={guest ? `/order-confirmation?order=${encodeURIComponent(orderNumber)}` : "/account/services"} className="text-sm text-mist-400 hover:text-cream-100 transition-colors">
        {guest ? "← Back to your order" : "← All projects"}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <div>
          <h1 className="font-display text-2xl text-cream-50">{project.reference}</h1>
          <p className="text-sm text-mist-400 mt-1">
            {product?.name ?? "FEMZYK project"} {pkg ? `· ${pkg.name}` : ""} {project.business_name ? `· ${project.business_name}` : ""}
          </p>
        </div>
        <span className={project.status === "COMPLETED" ? "badge-green" : project.status === "CANCELLED" ? "badge-red" : "badge-gold"}>
          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
        </span>
      </div>

      {stepIdx >= 0 && (
        <ol className="mt-6 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className={`badge px-3 py-1.5 ${i <= stepIdx ? "bg-gold-500/15 text-gold-300 border border-gold-500/40" : "bg-ink-800 text-mist-500 border border-ink-700"}`}>
              {PROJECT_STATUS_LABELS[s]}
            </li>
          ))}
        </ol>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-8 items-start">
        <div className="space-y-6 min-w-0">
          {project.status === "REQUIREMENTS_PENDING" && !requirement && fields.length > 0 ? (
            <div className="card p-6">
              <h2 className="font-display text-lg text-cream-50 mb-1">Share your project requirements</h2>
              <p className="text-sm text-mist-400 mb-5">The more specific you are, the better the first draft. You can add details later in messages.</p>
              <RequirementsForm projectRef={project.reference} fields={fields} />
            </div>
          ) : requirement ? (
            <div className="card p-6">
              <h2 className="font-display text-lg text-cream-50 mb-3">Your requirements</h2>
              <dl className="space-y-3">
                {Object.entries(parseJson<any>(requirement.content_json, {})).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] uppercase tracking-widest text-mist-500">{fields.find((f: any) => f.id === k)?.label ?? k}</dt>
                    <dd className="text-sm text-cream-200 mt-0.5 whitespace-pre-wrap">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="card p-6">
            <h2 className="font-display text-lg text-cream-50 mb-4">Project messages</h2>
            <MessageBoard projectRef={project.reference} messages={messages.map((m) => ({ id: m.id, senderType: m.sender_type, senderName: m.sender_name, body: m.body, createdAt: m.created_at }))} />
          </div>
        </div>

        <div className="space-y-4">
          {milestones.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Milestones</h3>
              <ul className="space-y-2.5">
                {milestones.map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5 text-sm">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${m.status === "DONE" ? "bg-emerald-400" : m.status === "IN_PROGRESS" ? "bg-gold-400" : "bg-ink-600"}`} aria-hidden />
                    <span className={m.status === "DONE" ? "text-mist-500 line-through" : "text-cream-200"}>{m.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Files</h3>
            {fileShare}
          </div>
          <div className="card p-5 text-xs text-mist-500 leading-relaxed">
            Questions about scope, timeline or anything else? Message the FEMZYK team here.
          </div>
        </div>
      </div>
    </div>
  );
}
