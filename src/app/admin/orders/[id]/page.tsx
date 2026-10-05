import { notFound } from "next/navigation";
import { q, q1 } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from "@/lib/statemachine";
import OrderManager from "./OrderManager";

export const dynamic = "force-dynamic";

export default function AdminOrderDetail({ params }: { params: { id: string } }) {
  const order = q1<any>("SELECT * FROM orders WHERE id = ?", params.id);
  if (!order) notFound();
  const items = q<any>("SELECT * FROM order_items WHERE order_id = ?", order.id);
  const shipments = q<any>("SELECT * FROM shipments WHERE order_id = ?", order.id);
  const payments = q<any>("SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC", order.id);
  const nextStatuses = ORDER_TRANSITIONS[order.status] ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl text-cream-50">Order {order.order_number}</h1>
        <span className="badge-gold">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Items</h2>
            <ul className="divide-y divide-ink-800">
              {items.map((it) => (
                <li key={it.id} className="py-2.5 flex justify-between gap-3 text-sm">
                  <span className="text-cream-100">{it.name} × {it.qty} <span className="text-mist-500 text-xs">({it.product_type})</span></span>
                  <span className="text-mist-300">{formatMoney(it.total_cents, order.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 pt-3 border-t border-ink-700 text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-mist-400">Subtotal</dt><dd className="text-cream-100">{formatMoney(order.subtotal_cents, order.currency)}</dd></div>
              {order.discount_cents > 0 && <div className="flex justify-between text-emerald-300"><dt>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</dt><dd>−{formatMoney(order.discount_cents, order.currency)}</dd></div>}
              <div className="flex justify-between"><dt className="text-mist-400">Shipping</dt><dd className="text-cream-100">{order.shipping_cents === 0 ? "Free" : formatMoney(order.shipping_cents, order.currency)}</dd></div>
              <div className="flex justify-between font-semibold"><dt className="text-cream-50">Total</dt><dd className="text-gold-300">{formatMoney(order.total_cents, order.currency)}</dd></div>
            </dl>
          </div>

          {order.shipping_address_json && (
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-2">Delivery</h2>
              <pre className="text-sm text-mist-300 whitespace-pre-wrap font-sans">{JSON.stringify(JSON.parse(order.shipping_address_json), null, 2).replace(/[{}","]+/g, "")}</pre>
              {order.customer_note && <p className="text-xs text-mist-500 mt-2">Note: {order.customer_note}</p>}
            </div>
          )}

          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Payments</h2>
            {payments.map((p) => (
              <p key={p.id} className="text-sm text-mist-300 mb-1">
                <span className={p.status === "SUCCESS" ? "text-emerald-300" : p.status === "FAILED" || p.status === "CANCELLED" ? "text-red-300" : "text-mist-300"}>{p.status}</span>
                {" · "}{p.provider} · {p.reference} {p.verified ? "· ✓ verified server-side" : ""}
              </p>
            ))}
          </div>
        </div>

        <OrderManager
          orderId={order.id}
          status={order.status}
          nextStatuses={nextStatuses}
          shipments={shipments.map((s) => ({ id: s.id, carrier: s.carrier, tracking: s.tracking_number, status: s.status }))}
        />
      </div>
    </div>
  );
}
