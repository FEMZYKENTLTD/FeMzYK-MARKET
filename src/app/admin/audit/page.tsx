import { q } from "@/lib/db";
import { timeAgo } from "@/lib/util";

export const dynamic = "force-dynamic";

export default function AdminAuditPage() {
  const logs = q<any>(
    `SELECT a.*, u.email AS actor_email FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT 120`
  );
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Audit log</h1>
      <p className="text-sm text-mist-400 mb-6">Sensitive admin actions are recorded with actor, timestamp and before/after values: price changes, inventory, refunds, review moderation, payment configuration and more.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-ink-700">
            <tr>{["When", "Actor", "Action", "Entity", "Change"].map((h) => <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-mist-500 px-3 py-2.5">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-ink-800/50 align-top">
                <td className="px-3 py-2.5 text-sm text-mist-500 whitespace-nowrap">{timeAgo(l.created_at)}</td>
                <td className="px-3 py-2.5 text-sm text-mist-300">{l.actor_email || "system"}</td>
                <td className="px-3 py-2.5 text-sm text-cream-100">{l.action}</td>
                <td className="px-3 py-2.5 text-sm text-mist-400">{l.entity_type ? `${l.entity_type}#${l.entity_id}` : "—"}</td>
                <td className="px-3 py-2.5 text-xs text-mist-500 font-mono max-w-[300px] truncate">
                  {l.previous_json || l.new_json ? `${l.previous_json || "{}"} → ${l.new_json || "{}"}` : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-mist-500">No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
