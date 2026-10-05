import { q } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/statemachine";
import { timeAgo } from "@/lib/util";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const status = searchParams.status || "";
  const term = searchParams.q || "";
  const where = `WHERE 1=1 ${status ? "AND o.status = ?" : ""} ${term ? "AND (o.order_number LIKE ? OR o.email LIKE ?)" : ""}`;
  const params: any[] = [];
  if (status) params.push(status);
  if (term) params.push(`%${term}%`, `%${term}%`);
  const orders = q<any>(`SELECT * FROM orders o ${where} ORDER BY o.created_at DESC LIMIT 60`, ...params);

  const statuses = Object.keys(ORDER_STATUS_LABELS);

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Orders</h1>
      <form method="GET" className="flex flex-wrap gap-2 mb-5">
        <input name="q" defaultValue={term} className="input max-w-xs" placeholder="Order number or email…" aria-label="Search orders" />
        <select name="status" defaultValue={status} className="input w-auto" aria-label="Filter by status">
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button className="btn-dark btn-md">Filter</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-ink-700">
            <tr>
              {["Order", "Customer", "Kind", "Total", "Status", "Placed", ""].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-mist-500 px-3 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-ink-800/50">
                <td className="px-3 py-2.5 text-sm text-cream-100">{o.order_number}</td>
                <td className="px-3 py-2.5 text-sm text-mist-300 max-w-[220px] truncate">{o.email}</td>
                <td className="px-3 py-2.5 text-sm text-mist-400">{o.kind}</td>
                <td className="px-3 py-2.5 text-sm text-cream-100">{formatMoney(o.total_cents, o.currency)}</td>
                <td className="px-3 py-2.5"><span className={o.status === "CANCELLED" || o.status === "PAYMENT_FAILED" ? "badge-red" : ["DELIVERED", "COMPLETED", "PAID", "FULFILLMENT_PENDING"].includes(o.status) ? "badge-green" : "badge-navy"}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</span></td>
                <td className="px-3 py-2.5 text-sm text-mist-500">{timeAgo(o.created_at)}</td>
                <td className="px-3 py-2.5"><Link href={`/admin/orders/${o.id}`} className="text-xs text-gold-400 hover:text-gold-300">Manage →</Link></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-mist-500">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
