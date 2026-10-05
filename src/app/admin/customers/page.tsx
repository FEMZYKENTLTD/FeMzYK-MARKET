import { q } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/util";
import { initials } from "@/lib/util";

export const dynamic = "force-dynamic";

export default function AdminCustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const term = searchParams.q || "";
  const where = term ? "WHERE u.email LIKE ? OR COALESCE(u.first_name,'') LIKE ? OR COALESCE(u.last_name,'') LIKE ?" : "";
  const params = term ? [`%${term}%`, `%${term}%`, `%${term}%`] : [];
  const customers = q<any>(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.created_at, u.marketing_opt_in,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
            (SELECT COALESCE(SUM(o.total_cents),0) FROM orders o WHERE o.user_id = u.id AND o.status NOT IN ('PENDING_PAYMENT','PAYMENT_FAILED','CANCELLED')) AS spent_cents
     FROM users u ${where} ORDER BY u.created_at DESC LIMIT 80`,
    ...params
  );

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Customers</h1>
      <form method="GET" className="mb-5">
        <input name="q" defaultValue={term} className="input max-w-xs" placeholder="Search email or name…" aria-label="Search customers" />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead className="border-b border-ink-700">
            <tr>{["Customer", "Joined", "Orders", "Lifetime spend", "Marketing"].map((h) => <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-mist-500 px-3 py-2.5">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-ink-800/50">
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-navy-800 border border-navy-600/50 text-[11px] font-semibold text-cream-200 flex items-center justify-center">{initials(`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email)}</span>
                    <span>
                      <span className="block text-sm text-cream-100">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</span>
                      <span className="block text-[11px] text-mist-500">{c.email}</span>
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm text-mist-400">{timeAgo(c.created_at)}</td>
                <td className="px-3 py-2.5 text-sm text-mist-300">{c.order_count}</td>
                <td className="px-3 py-2.5 text-sm text-cream-100">{formatMoney(c.spent_cents, "USD")}</td>
                <td className="px-3 py-2.5 text-sm">{c.marketing_opt_in ? <span className="badge-green">Subscribed</span> : <span className="badge-gray">No</span>}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-mist-500">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-mist-500 mt-3">Guest checkouts are tracked via orders (by email) and appear here once an account exists.</p>
    </div>
  );
}
