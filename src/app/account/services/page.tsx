import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { PROJECT_STATUS_LABELS } from "@/lib/statemachine";
import EmptyState from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/util";

export default function ServicesDashboard() {
  const user = getSessionUser()!;
  const projects = q<any>(
    `SELECT pr.*, p.name AS service_name FROM projects pr LEFT JOIN products p ON p.id = pr.product_id
     WHERE pr.user_id = ? ORDER BY pr.created_at DESC`,
    user.id
  );

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Services & projects</h1>
      <p className="text-sm text-mist-400 mb-6">Track every FEMZYK Web Development project — status, requirements, messages and deliverables.</p>
      {projects.length === 0 ? (
        <EmptyState icon="🛠️" title="No projects yet." body="When you purchase a web development service, your project workspace appears here with a clear status timeline." ctaHref="/services" ctaLabel="Explore services" />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/account/services/${p.reference}`} className="card card-hover p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-cream-100">
                  {p.reference} {p.service_name ? <span className="text-mist-500">· {p.service_name}</span> : null}
                </p>
                <p className="text-xs text-mist-500 mt-0.5">Started {timeAgo(p.created_at)} {p.business_name ? `· ${p.business_name}` : ""}</p>
              </div>
              <span className={p.status === "COMPLETED" ? "badge-green" : p.status === "CANCELLED" ? "badge-red" : "badge-navy"}>
                {PROJECT_STATUS_LABELS[p.status] ?? p.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
