"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/statemachine";

interface TrackData {
  order: { orderNumber: string; status: string; kind: string; currency: string; totalCents: number; createdAt: string; estMin: number | null; estMax: number | null };
  items: { name: string; qty: number; total_cents: number }[];
  shipments: { carrier: string | null; tracking_number: string | null; status: string; shipped_at: string | null }[];
  payment: { status: string; provider: string } | null;
  downloads: { token: string; name: string; downloads_used: number; download_limit: number }[];
}

const PHYSICAL_STEPS = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"];

export default function TrackOrderClient({ initialOrder }: { initialOrder: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [email, setEmail] = useState("");
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/track-order?order=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "We couldn't find that order.");
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialOrder && email) lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusIndex = data ? Math.max(PHYSICAL_STEPS.indexOf(data.order.status), data.order.status === "FULFILLMENT_PENDING" ? 1 : -1) : -1;

  return (
    <div>
      <form onSubmit={lookup} className="card p-6 grid sm:grid-cols-[1fr_1fr_auto] gap-3">
        <div>
          <label className="label" htmlFor="tr-order">Order number</label>
          <input id="tr-order" className="input" placeholder="FM-XXXXXXXXXX" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="tr-email">Email</label>
          <input id="tr-email" type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button className="btn-gold btn-md self-end" disabled={busy}>
          {busy ? "Looking up…" : "Track"}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3" role="alert">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-6 space-y-5">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="font-display text-xl text-cream-50">Order {data.order.orderNumber}</h2>
                <p className="text-xs text-mist-500 mt-1">Placed {new Date(data.order.createdAt + "Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
              <span className={data.order.status === "CANCELLED" || data.order.status === "PAYMENT_FAILED" ? "badge-red" : data.order.status === "DELIVERED" || data.order.status === "COMPLETED" ? "badge-green" : "badge-gold"}>
                {ORDER_STATUS_LABELS[data.order.status] ?? data.order.status}
              </span>
            </div>

            {data.order.kind !== "DIGITAL" && data.order.kind !== "SERVICE" && (
              <ol className="relative space-y-5 ml-2">
                {PHYSICAL_STEPS.map((step, i) => {
                  const done = statusIndex >= i || (i === 1 && ["PAID", "FULFILLMENT_PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED"].includes(data.order.status));
                  const current = statusIndex === i;
                  return (
                    <li key={step} className="flex items-start gap-3">
                      <span className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${done ? "bg-gold-400" : "bg-ink-600"} ${current ? "ring-4 ring-gold-500/25" : ""}`} aria-hidden />
                      <span className={`text-sm ${done ? "text-cream-100" : "text-mist-500"}`}>
                        {ORDER_STATUS_LABELS[step]}
                        {step === "DELIVERED" && data.order.estMin && !done && (
                          <span className="block text-[11px] text-mist-500 mt-0.5">
                            Estimated {data.order.estMin}–{data.order.estMax} business days
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {data.shipments.length > 0 && (
              <div className="mt-6 pt-5 border-t border-ink-700">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Tracking</h3>
                {data.shipments.map((s, i) => (
                  <p key={i} className="text-sm text-mist-300">
                    {s.carrier || "Carrier to be assigned"} {s.tracking_number && <span className="text-cream-100 font-medium">· {s.tracking_number}</span>}
                    <span className="text-mist-500"> · {s.status.replace(/_/g, " ").toLowerCase()}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {data.downloads.length > 0 && (
            <div className="card p-6">
              <h3 className="font-display text-lg text-cream-50 mb-3">Your downloads</h3>
              <ul className="space-y-2.5">
                {data.downloads.map((d) => (
                  <li key={d.token} className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm text-cream-100">{d.name}</span>
                    <a href={`/api/download/${d.token}`} className="btn-gold btn-sm">
                      Download ({d.downloads_used}/{d.download_limit})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Items</h3>
            <ul className="space-y-2">
              {data.items.map((it, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-cream-100">{it.name} × {it.qty}</span>
                  <span className="text-mist-300">{formatMoney(it.total_cents, data.order.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-mist-400 mt-4 pt-3 border-t border-ink-700 flex justify-between">
              <span>Total {data.payment ? `· payment ${data.payment.status.toLowerCase()}` : ""}</span>
              <span className="text-gold-300 font-semibold">{formatMoney(data.order.totalCents, data.order.currency)}</span>
            </p>
          </div>

          <p className="text-xs text-mist-500 text-center">
            Something not right with this order? <Link href="/help" className="text-gold-400 hover:text-gold-300">Contact support</Link> with your order number.
          </p>
        </div>
      )}
    </div>
  );
}
