import { q } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/util";
import { providerLabel } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default function AdminPaymentsPage() {
  const payments = q<any>(
    `SELECT p.*, o.order_number FROM payments p JOIN orders o ON o.id = p.order_id ORDER BY p.created_at DESC LIMIT 80`
  );
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Payments</h1>
      <p className="text-sm text-mist-400 mb-6">
        Every payment reference, provider and verification state. Amounts and currencies are re-checked server-side before
        an order is ever marked paid — mismatches are logged as payment events.
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-ink-700">
            <tr>{["Reference", "Order", "Provider", "Amount", "Status", "Verified", "Created"].map((h) => <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-mist-500 px-3 py-2.5">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-ink-800/50">
                <td className="px-3 py-2.5 text-xs text-mist-400 font-mono">{p.reference}</td>
                <td className="px-3 py-2.5 text-sm text-cream-100">{p.order_number}</td>
                <td className="px-3 py-2.5 text-sm text-mist-300">{providerLabel(p.provider)}</td>
                <td className="px-3 py-2.5 text-sm text-cream-100">{formatMoney(p.amount_cents, p.currency)}</td>
                <td className="px-3 py-2.5">
                  <span className={p.status === "SUCCESS" ? "badge-green" : ["FAILED", "CANCELLED"].includes(p.status) ? "badge-red" : "badge-gray"}>{p.status}</span>
                </td>
                <td className="px-3 py-2.5 text-sm">{p.verified ? "✓ server-side" : "—"}</td>
                <td className="px-3 py-2.5 text-sm text-mist-500">{timeAgo(p.created_at)}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-mist-500">No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
