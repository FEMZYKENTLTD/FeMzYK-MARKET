import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS, PROJECT_STATUS_LABELS } from "@/lib/statemachine";
import { timeAgo } from "@/lib/util";

export default function AccountOverview() {
  const user = getSessionUser()!;
  const orders = q<any>("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5", user.id);
  const downloads = q<any>(
    `SELECT de.*, p.name FROM digital_entitlements de JOIN products p ON p.id = de.product_id WHERE de.user_id = ? ORDER BY de.created_at DESC LIMIT 5`,
    user.id
  );
  const projects = q<any>("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 5", user.id);
  const wishlistCount = q<any>("SELECT COUNT(*) AS c FROM wishlist_items WHERE user_id = ?", user.id)[0]?.c ?? 0;

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Welcome back{user.firstName ? `, ${user.firstName}` : ""}</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Link href="/account/orders" className="card card-hover p-5">
          <p className="text-3xl font-semibold text-gold-300">{orders.length}</p>
          <p className="text-sm text-mist-400 mt-1">Orders</p>
        </Link>
        <Link href="/account/downloads" className="card card-hover p-5">
          <p className="text-3xl font-semibold text-gold-300">{downloads.length}</p>
          <p className="text-sm text-mist-400 mt-1">Digital purchases</p>
        </Link>
        <Link href="/wishlist" className="card card-hover p-5">
          <p className="text-3xl font-semibold text-gold-300">{wishlistCount}</p>
          <p className="text-sm text-mist-400 mt-1">Wishlist items</p>
        </Link>
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400">Recent orders</h2>
          <Link href="/account/orders" className="text-xs text-gold-400 hover:text-gold-300">View all</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-mist-500 card p-5">Your orders will appear here after your first purchase.</p>
        ) : (
          <div className="card divide-y divide-ink-800">
            {orders.map((o) => (
              <Link key={o.id} href={`/account/orders/${o.order_number}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-ink-800 transition-colors">
                <span>
                  <span className="block text-sm text-cream-100">{o.order_number}</span>
                  <span className="block text-[11px] text-mist-500">{timeAgo(o.created_at)}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm text-gold-300">{formatMoney(o.total_cents, o.currency)}</span>
                  <span className="block text-[11px] text-mist-500">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {projects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400">Projects</h2>
            <Link href="/account/services" className="text-xs text-gold-400 hover:text-gold-300">View all</Link>
          </div>
          <div className="card divide-y divide-ink-800">
            {projects.map((p) => (
              <Link key={p.id} href={`/account/services/${p.reference}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-ink-800 transition-colors">
                <span className="text-sm text-cream-100">{p.reference} {p.business_name ? `· ${p.business_name}` : ""}</span>
                <span className="badge-navy">{PROJECT_STATUS_LABELS[p.status] ?? p.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
