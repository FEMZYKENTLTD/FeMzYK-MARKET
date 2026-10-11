import { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { q1, q } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/statemachine";
import EmptyState from "@/components/ui/EmptyState";
import { getSessionUser } from "@/lib/auth";
import { hasOrderAccess, orderAccessCookieName } from "@/lib/orderAccess";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

export default async function OrderConfirmationPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const orderNumber = (await searchParams).order || "";
  const order = orderNumber ? q1<any>("SELECT * FROM orders WHERE order_number = ?", orderNumber) : null;
  if (order) {
    const user = await getSessionUser();
    const access = (await cookies()).get(orderAccessCookieName(order.order_number))?.value;
    if (order.user_id !== user?.id && !hasOrderAccess(access, order.order_number, order.confirmation_token)) notFound();
  }

  if (!order) {
    return (
      <div className="container-page py-16">
        <EmptyState icon="🔎" title="We couldn't find that order" body="If you just completed a payment and see this page, contact support with your payment receipt and we'll sort it out immediately." ctaHref="/help" ctaLabel="Get help" />
      </div>
    );
  }

  const paid = !["PENDING_PAYMENT", "PAYMENT_PROCESSING", "PAYMENT_FAILED", "CANCELLED"].includes(order.status);
  const items = q<any>("SELECT * FROM order_items WHERE order_id = ?", order.id);
  const downloads = q<any>(
    `SELECT de.token, de.download_limit, de.downloads_used, p.name, p.slug
     FROM digital_entitlements de JOIN products p ON p.id = de.product_id WHERE de.order_id = ?`,
    order.id
  );
  const projects = q<any>("SELECT reference, status FROM projects WHERE order_id = ?", order.id);
  const cur = order.currency;

  return (
    <div className="container-page py-12 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        {paid ? (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="font-display text-3xl text-cream-50">Thank you. Your order is confirmed.</h1>
            <p className="mt-3 text-mist-300">
              Order <span className="text-gold-300 font-semibold">{order.order_number}</span> · Save this number to track your order. Email notifications are queued but are not sent until a delivery provider is configured.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl text-cream-50">Order {order.order_number}</h1>
            <p className="mt-3 text-mist-300">
              Status: {ORDER_STATUS_LABELS[order.status] ?? order.status}. If you believe you paid, give it a moment and refresh — verification can take a few seconds.
            </p>
          </>
        )}
      </div>

      {/* Digital downloads ready */}
      {downloads.length > 0 && (
        <div className="card p-6 border-emerald-500/30 mb-6">
          <h2 className="font-display text-lg text-cream-50 mb-1">⚡ Your download is ready</h2>
          <p className="text-sm text-mist-400 mb-4">These links are private and tied to your purchase. They're also saved in your account under Downloads.</p>
          <ul className="space-y-2.5">
            {downloads.map((d) => (
              <li key={d.token} className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-cream-100">{d.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-[11px] text-mist-500">
                    {d.downloads_used}/{d.download_limit} downloads used
                  </span>
                  <a href={`/api/download/${d.token}`} className="btn-gold btn-sm">
                    Download now
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Projects created */}
      {projects.length > 0 && (
        <div className="card p-6 border-navy-600/50 mb-6">
          <h2 className="font-display text-lg text-cream-50 mb-1">🛠️ Your project has been created</h2>
          <p className="text-sm text-mist-400 mb-4">
              Next step: share your requirements in your private project workspace. Keep this browser available or create an account so you can return to the project later.
          </p>
          {projects.map((p) => (
            <div key={p.reference} className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-cream-100">
                Project <span className="text-gold-300">{p.reference}</span>
              </span>
              <Link href={`/projects/${p.reference}`} className="btn-gold btn-sm">
                Open project workspace
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="card p-6 mb-6">
        <h2 className="font-display text-lg text-cream-50 mb-4">Order details</h2>
        <ul className="divide-y divide-ink-800">
          {items.map((it) => (
            <li key={it.id} className="py-3 flex justify-between gap-4 text-sm">
              <span className="text-cream-100">
                {it.name} <span className="text-mist-500">× {it.qty}</span>
              </span>
              <span className="text-mist-300 shrink-0">{formatMoney(it.total_cents, cur)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 pt-4 border-t border-ink-700 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-mist-400">Subtotal</dt>
            <dd className="text-cream-100">{formatMoney(order.subtotal_cents, cur)}</dd>
          </div>
          {order.discount_cents > 0 && (
            <div className="flex justify-between text-emerald-300">
              <dt>Discount</dt>
              <dd>−{formatMoney(order.discount_cents, cur)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-mist-400">Shipping</dt>
            <dd className="text-cream-100">{order.shipping_cents === 0 ? "Free" : formatMoney(order.shipping_cents, cur)}</dd>
          </div>
          {order.tax_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-mist-400">Taxes</dt>
              <dd className="text-cream-100">{formatMoney(order.tax_cents, cur)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold">
            <dt className="text-cream-50">Total paid</dt>
            <dd className="text-gold-300">{formatMoney(order.total_cents, cur)}</dd>
          </div>
        </dl>
      </div>

      {/* Delivery expectations */}
      {order.kind !== "SERVICE" && order.est_delivery_min_days && (
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold text-cream-100 mb-2">Delivery</h2>
          <p className="text-sm text-mist-400">
            Estimated delivery: <span className="text-cream-100">{order.est_delivery_min_days}–{order.est_delivery_max_days} business days</span>
            {order.shipping_method ? ` · ${order.shipping_method}` : ""}. You'll receive a shipping email with tracking when your order dispatches.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <Link href={`/track-order?order=${encodeURIComponent(order.order_number)}`} className="btn-outline btn-md">
          Track this order
        </Link>
        <Link href="/shop/all" className="btn-gold btn-md">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
