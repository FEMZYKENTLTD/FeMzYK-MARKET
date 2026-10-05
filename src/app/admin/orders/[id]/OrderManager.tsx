"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminClient";
import { ORDER_STATUS_LABELS } from "@/lib/statemachine";

export default function OrderManager({
  orderId,
  status,
  nextStatuses,
  shipments,
}: {
  orderId: number;
  status: string;
  nextStatuses: string[];
  shipments: { id: number; carrier: string | null; tracking: string | null; status: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [carrier, setCarrier] = useState(shipments[0]?.carrier ?? "");
  const [tracking, setTracking] = useState(shipments[0]?.tracking ?? "");

  async function transition(to: string) {
    setBusy(true);
    setMsg("");
    try {
      await adminFetch(`/api/admin/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status: to }) });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  async function saveShipment(shipStatus?: string) {
    setBusy(true);
    setMsg("");
    try {
      await adminFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ shipment: { carrier: carrier || undefined, tracking_number: tracking || undefined, status: shipStatus } }),
      });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Move to status</h2>
        {nextStatuses.length === 0 ? (
          <p className="text-sm text-mist-500">This order is in a terminal state ({ORDER_STATUS_LABELS[status] ?? status}).</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <button
                key={s}
                className={`btn-sm rounded-lg ${["CANCELLED", "REFUNDED"].includes(s) ? "btn-outline border-red-500/40 text-red-300" : "btn-gold"}`}
                disabled={busy}
                onClick={() => {
                  if (["CANCELLED", "REFUNDED"].includes(s) && !confirm(`Move this order to ${s}?`)) return;
                  transition(s);
                }}
              >
                {ORDER_STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-mist-500 mt-3">Invalid transitions are rejected by the order state machine. Status changes are audit-logged.</p>
        {msg && <p className="text-xs text-red-300 mt-2">{msg}</p>}
      </div>

      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Shipment & tracking</h2>
        <div className="space-y-2.5">
          <input className="input" placeholder="Carrier (e.g. DHL, UPS, Royal Mail)" value={carrier} onChange={(e) => setCarrier(e.target.value)} aria-label="Carrier" />
          <input className="input" placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} aria-label="Tracking number" />
          <div className="flex flex-wrap gap-2">
            <button className="btn-dark btn-sm" disabled={busy} onClick={() => saveShipment("SHIPPED")}>Mark shipped</button>
            <button className="btn-dark btn-sm" disabled={busy} onClick={() => saveShipment("IN_TRANSIT")}>In transit</button>
            <button className="btn-dark btn-sm" disabled={busy} onClick={() => saveShipment("OUT_FOR_DELIVERY")}>Out for delivery</button>
            <button className="btn-dark btn-sm" disabled={busy} onClick={() => saveShipment("DELIVERED")}>Delivered</button>
          </div>
          {shipments.length > 0 && <p className="text-[11px] text-mist-500">Current: {shipments[0].status} {shipments[0].tracking ? `· ${shipments[0].tracking}` : ""}</p>}
          <p className="text-[11px] text-mist-500">Customers see tracking on the Track Order page and receive a shipping email when marked shipped.</p>
        </div>
      </div>
    </div>
  );
}
