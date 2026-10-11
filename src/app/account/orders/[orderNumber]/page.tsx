import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/statemachine";
import { parseJson } from "@/lib/util";
import ReviewPrompt from "./ReviewPrompt";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const user = (await getSessionUser())!;
  const order = q1<any>("SELECT * FROM orders WHERE order_number = ? AND user_id = ?", (await params).orderNumber, user.id);
  if (!order) notFound();

  const items = q<any>("SELECT * FROM order_items WHERE order_id = ?", order.id);
  const shipments = q<any>("SELECT * FROM shipments WHERE order_id = ?", order.id);
  const downloads = q<any>(
    `SELECT de.token, de.download_limit, de.downloads_used, de.expires_at, p.name FROM digital_entitlements de JOIN products p ON p.id = de.product_id WHERE de.order_id = ?`,
    order.id
  );
  const address = parseJson<any>(order.shipping_address_json, null);

  return (
    <div>
      <Link href="/account/orders" className="text-sm text-mist-400 hover:text-cream-100 transition-colors">← All orders</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 mb-6">
        <h1 className="font-display text-2xl text-cream-50">Order {order.order_number}</h1>
        <span className={order.status === "CANCELLED" || order.status === "PAYMENT_FAILED" ? "badge-red" : "badge-gold"}>
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="card p-6 mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Items</h2>
        <ul className="divide-y divide-ink-800">
          {items.map((it) => (
            <li key={it.id} className="py-3 flex justify-between gap-4 text-sm">
              <span className="text-cream-100">
                {it.name} <span className="text-mist-500">× {it.qty}</span>
              </span>
              <span className="text-mist-300">{formatMoney(it.total_cents, order.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 pt-4 border-t border-ink-700 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-mist-400">Subtotal</dt><dd className="text-cream-100">{formatMoney(order.subtotal_cents, order.currency)}</dd></div>
          {order.discount_cents > 0 && <div className="flex justify-between text-emerald-300"><dt>Discount</dt><dd>−{formatMoney(order.discount_cents, order.currency)}</dd></div>}
          <div className="flex justify-between"><dt className="text-mist-400">Shipping</dt><dd className="text-cream-100">{order.shipping_cents === 0 ? "Free" : formatMoney(order.shipping_cents, order.currency)}</dd></div>
          {order.tax_cents > 0 && <div className="flex justify-between"><dt className="text-mist-400">Taxes</dt><dd className="text-cream-100">{formatMoney(order.tax_cents, order.currency)}</dd></div>}
          <div className="flex justify-between font-semibold text-base"><dt className="text-cream-50">Total</dt><dd className="text-gold-300">{formatMoney(order.total_cents, order.currency)}</dd></div>
        </dl>
      </div>

      {address && (
        <div className="card p-6 mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Delivery address</h2>
          <p className="text-sm text-mist-300 leading-relaxed">
            {address.fullName}<br />{address.line1}{address.line2 ? <><br />{address.line2}</> : null}<br />
            {address.city}{address.state ? `, ${address.state}` : ""} {address.postalCode}<br />{address.country}
          </p>
          {order.est_delivery_min_days && (
            <p className="text-xs text-mist-500 mt-3">Estimated delivery: {order.est_delivery_min_days}–{order.est_delivery_max_days} business days · {order.shipping_method}</p>
          )}
        </div>
      )}

      {shipments.length > 0 && (
        <div className="card p-6 mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Shipment</h2>
          {shipments.map((s) => (
            <p key={s.id} className="text-sm text-mist-300">
              {s.carrier || "Carrier to be assigned"}{s.tracking_number ? <> · <span className="text-cream-100 font-medium">{s.tracking_number}</span></> : null} · {s.status.replace(/_/g, " ").toLowerCase()}
            </p>
          ))}
        </div>
      )}

      {downloads.length > 0 && (
        <div className="card p-6 mb-5 border-emerald-500/30">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Downloads</h2>
          <ul className="space-y-2.5">
            {downloads.map((d) => (
              <li key={d.token} className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-cream-100">{d.name}</span>
                <a href={`/api/download/${d.token}`} className="btn-gold btn-sm">Download ({d.downloads_used}/{d.download_limit})</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ReviewPrompt items={items.filter((i) => i.product_id)} />
    </div>
  );
}
