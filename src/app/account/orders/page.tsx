import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/statemachine";
import EmptyState from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/util";

export default async function OrdersPage() {
  const user = (await getSessionUser())!;
  const orders = q<any>(
    `SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`,
    user.id
  );

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Your orders</h1>
      {orders.length === 0 ? (
        <EmptyState icon="📦" title="Your orders will appear here after your first purchase." body="When you shop with your account signed in, every order, its status and tracking live in this dashboard." ctaHref="/shop/all" ctaLabel="Start shopping" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.order_number}`} className="card card-hover p-5 flex flex-wrap items-center gap-4 justify-between">
              <div>
                <p className="text-sm font-medium text-cream-100">{o.order_number}</p>
                <p className="text-xs text-mist-500 mt-0.5">
                  {timeAgo(o.created_at)} · {o.item_count} item{o.item_count !== 1 ? "s" : ""} · {o.kind.toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gold-300">{formatMoney(o.total_cents, o.currency)}</span>
                <span className={o.status === "CANCELLED" || o.status === "PAYMENT_FAILED" ? "badge-red" : o.status === "DELIVERED" || o.status === "COMPLETED" ? "badge-green" : "badge-navy"}>
                  {ORDER_STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
