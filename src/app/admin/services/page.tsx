import Link from "next/link";
import { q } from "@/lib/db";
import { PROJECT_STATUS_LABELS } from "@/lib/statemachine";
import { timeAgo } from "@/lib/util";

export const dynamic = "force-dynamic";

export default function AdminProjectsPage() {
  const projects = q<any>(
    `SELECT pr.*, p.name AS service_name, o.order_number FROM projects pr
     LEFT JOIN products p ON p.id = pr.product_id LEFT JOIN orders o ON o.id = pr.order_id
     ORDER BY pr.created_at DESC`
  );

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Service projects</h1>
      <p className="text-sm text-mist-400 mb-6">Every web development project with status, requirements and messages. Status changes notify the customer by email.</p>
      {projects.length === 0 ? (
        <p className="text-sm text-mist-500 card p-6">No projects yet — they appear when customers purchase a service.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/admin/services/${p.id}`} className="card card-hover p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-cream-100">
                  {p.reference} <span className="text-mist-500">· {p.service_name ?? "Custom"}</span>
                </p>
                <p className="text-xs text-mist-500 mt-0.5">
                  {p.email} {p.business_name ? `· ${p.business_name}` : ""} · started {timeAgo(p.created_at)}
                </p>
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
