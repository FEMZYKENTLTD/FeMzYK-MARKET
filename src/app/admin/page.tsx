import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/statemachine";
import { timeAgo } from "@/lib/util";
import Spark from "./Spark";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const revenue = q1<{ c: number }>("SELECT COALESCE(SUM(total_cents),0) AS c FROM orders WHERE status NOT IN ('PENDING_PAYMENT','PAYMENT_PROCESSING','PAYMENT_FAILED','CANCELLED')")?.c ?? 0;
  const orders = q1<{ c: number }>("SELECT COUNT(*) AS c FROM orders")?.c ?? 0;
  const customers = q1<{ c: number }>("SELECT COUNT(*) AS c FROM users WHERE role = 'CUSTOMER'")?.c ?? 0;
  const products = q1<{ c: number }>("SELECT COUNT(*) AS c FROM products WHERE status != 'archived'")?.c ?? 0;
  const digitalSales = q1<{ c: number }>("SELECT COALESCE(SUM(oi.total_cents),0) AS c FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_type IN ('DIGITAL_PRODUCT','DOWNLOADABLE_RESOURCE') AND o.status NOT IN ('PENDING_PAYMENT','PAYMENT_FAILED','CANCELLED')")?.c ?? 0;
  const serviceRevenue = q1<{ c: number }>("SELECT COALESCE(SUM(oi.total_cents),0) AS c FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_type IN ('SERVICE','SERVICE_PACKAGE') AND o.status NOT IN ('PENDING_PAYMENT','PAYMENT_FAILED','CANCELLED')")?.c ?? 0;
  const pendingFulfillment = q1<{ c: number }>("SELECT COUNT(*) AS c FROM orders WHERE status IN ('PAID','FULFILLMENT_PENDING','PROCESSING')")?.c ?? 0;
  const pendingProjects = q1<{ c: number }>("SELECT COUNT(*) AS c FROM projects WHERE status IN ('PAID','REQUIREMENTS_PENDING','REQUIREMENTS_RECEIVED','IN_PROGRESS','CLIENT_REVIEW')")?.c ?? 0;
  const lowStock = q<any>("SELECT name, stock_qty FROM products WHERE track_inventory = 1 AND stock_qty <= low_stock_threshold AND status = 'published' ORDER BY stock_qty LIMIT 8");
  const pendingReviews = q1<{ c: number }>("SELECT COUNT(*) AS c FROM reviews WHERE status = 'pending'")?.c ?? 0;

  const revenueByDay = q<any>(
    `SELECT date(paid_at) AS d, SUM(total_cents) AS rev, COUNT(*) AS n
     FROM orders WHERE paid_at IS NOT NULL GROUP BY d ORDER BY d DESC LIMIT 14`
  ).reverse();
  const topProducts = q<any>(
    `SELECT p.name, p.slug, p.sales_count, p.price_cents FROM products p WHERE p.sales_count > 0 ORDER BY p.sales_count DESC LIMIT 5`
  );
  const topCategories = q<any>(
    `SELECT c.name, COALESCE(SUM(oi.total_cents),0) AS rev
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id AND o.status NOT IN ('PENDING_PAYMENT','PAYMENT_FAILED','CANCELLED')
     JOIN product_categories pc ON pc.product_id = oi.product_id
     JOIN categories c ON c.id = pc.category_id AND c.parent_id IS NULL
     GROUP BY c.id ORDER BY rev DESC LIMIT 5`
  );
  const recentOrders = q<any>("SELECT order_number, email, status, total_cents, currency, created_at FROM orders ORDER BY created_at DESC LIMIT 6");
  const recentReviews = q<any>(
    `SELECT r.rating, r.author_name, r.status, p.name, r.created_at FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.created_at DESC LIMIT 5`
  );

  const cards: [string, string, string][] = [
    ["Revenue", formatMoney(revenue, "USD"), "/admin/analytics"],
    ["Orders", String(orders), "/admin/orders"],
    ["Customers", String(customers), "/admin/customers"],
    ["Products", String(products), "/admin/products"],
    ["Digital sales", formatMoney(digitalSales, "USD"), "/admin/digital"],
    ["Service revenue", formatMoney(serviceRevenue, "USD"), "/admin/services"],
    ["Pending fulfillment", String(pendingFulfillment), "/admin/orders"],
    ["Active projects", String(pendingProjects), "/admin/services"],
    ["Pending reviews", String(pendingReviews), "/admin/reviews"],
    ["Low stock items", String(lowStock.length), "/admin/products"],
  ];

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={href} className="card card-hover p-4">
            <p className="text-[11px] uppercase tracking-wider text-mist-500">{label}</p>
            <p className="text-xl font-semibold text-cream-50 mt-1.5">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-cream-100">Revenue — last {revenueByDay.length} days</h2>
            <Link href="/admin/analytics" className="text-xs text-gold-400 hover:text-gold-300">Analytics →</Link>
          </div>
          <Spark data={revenueByDay.map((r) => r.rev / 100)} labels={revenueByDay.map((r) => r.d.slice(5))} />
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-cream-100 mb-4">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-mist-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-ink-800">
              {recentOrders.map((o) => (
                <li key={o.order_number} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block text-cream-100 truncate">{o.order_number}</span>
                    <span className="block text-[11px] text-mist-500 truncate">{o.email} · {timeAgo(o.created_at)}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-cream-100">{formatMoney(o.total_cents, o.currency)}</span>
                    <span className="block text-[11px] text-mist-500">{ORDER_STATUS_LABELS[o.status] ?? o.status}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-cream-100 mb-4">Top products</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-mist-500">No sales yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {topProducts.map((p) => (
                <li key={p.slug} className="flex items-center justify-between text-sm">
                  <span className="text-mist-300 truncate pr-3">{p.name}</span>
                  <span className="text-cream-100 shrink-0">{p.sales_count} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-cream-100 mb-4">Top categories by revenue</h2>
          {topCategories.length === 0 ? (
            <p className="text-sm text-mist-500">No data yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {topCategories.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-mist-300">{c.name}</span>
                  <span className="text-cream-100">{formatMoney(c.rev, "USD")}</span>
                </li>
              ))}
            </ul>
          )}
          {lowStock.length > 0 && (
            <div className="mt-5 pt-4 border-t border-ink-700">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-red-300/80 mb-2">⚠ Low stock</h3>
              <ul className="space-y-1.5">
                {lowStock.map((l) => (
                  <li key={l.name} className="flex justify-between text-[13px]">
                    <span className="text-mist-300 truncate pr-3">{l.name}</span>
                    <span className="text-red-300">{l.stock_qty} left</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
