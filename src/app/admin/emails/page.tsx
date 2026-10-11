import { q } from "@/lib/db";
import { timeAgo } from "@/lib/util";

export const dynamic = "force-dynamic";

export default function AdminEmailsPage() {
  const emails = q<any>("SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT 60");
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Email outbox</h1>
      <p className="text-sm text-mist-400 mb-6">
        Transactional message drafts are recorded here for review. <strong className="text-cream-200">Queued does not mean sent:</strong> no outbound email provider is connected in this build, so customers must use order tracking and the Help Center unless you arrange a separate delivery workflow.
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-ink-700">
            <tr>{["To", "Template", "Subject", "Provider", "Queued"].map((h) => <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-mist-500 px-3 py-2.5">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {emails.map((e) => (
              <tr key={e.id} className="hover:bg-ink-800/50 align-top">
                <td className="px-3 py-2.5 text-sm text-mist-300">{e.to_email}</td>
                <td className="px-3 py-2.5"><span className="badge-navy">{e.template}</span></td>
                <td className="px-3 py-2.5 text-sm text-cream-100 max-w-[280px] truncate">{e.subject}</td>
                <td className="px-3 py-2.5 text-sm text-mist-500">{e.provider}</td>
                <td className="px-3 py-2.5 text-sm text-mist-500">{timeAgo(e.created_at)}</td>
              </tr>
            ))}
            {emails.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-mist-500">No emails queued yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
