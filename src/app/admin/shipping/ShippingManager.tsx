"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminClient";

export default function ShippingManager({ zones }: { zones: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function saveMethod(zoneId: number, method: any) {
    setBusy(true);
    setMsg("");
    try {
      await adminFetch("/api/admin/shipping", { method: "POST", body: JSON.stringify({ zone_id: zoneId, method }) });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeMethod(id: number) {
    if (!confirm("Remove this shipping method?")) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/shipping?method_id=${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {msg && <p className="text-sm text-red-300">{msg}</p>}
      {zones.map((z) => (
        <div key={z.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-cream-100">
              {z.name} <span className="text-mist-500 font-normal">· {z.countries.join(", ")}</span>
            </h2>
            <button className="btn-dark btn-sm" disabled={busy} onClick={() => saveMethod(z.id, { name: "New shipping method", price_cents: 0, free_threshold_cents: null, min_days: 5, max_days: 10, is_active: false })}>
              + Add method
            </button>
          </div>
          <div className="space-y-3">
            {z.methods.map((m: any) => (
              <div key={m.id} className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end border border-ink-700 rounded-lg p-3">
                <label className="text-[10px] uppercase tracking-wider text-mist-500 col-span-2">Method
                  <input className="input py-1.5 text-sm mt-1" defaultValue={m.name} onBlur={(e) => saveMethod(z.id, { id: m.id, name: e.target.value })} />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-mist-500">Price (¢)
                  <input type="number" className="input py-1.5 text-sm mt-1" defaultValue={m.price_cents} onBlur={(e) => saveMethod(z.id, { id: m.id, price_cents: Number(e.target.value) })} />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-mist-500">Free over (¢)
                  <input type="number" className="input py-1.5 text-sm mt-1" defaultValue={m.free_threshold_cents ?? ""} onBlur={(e) => saveMethod(z.id, { id: m.id, free_threshold_cents: e.target.value ? Number(e.target.value) : null })} />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-mist-500">Days
                  <span className="flex gap-1 mt-1">
                    <input type="number" className="input py-1.5 text-sm w-16" defaultValue={m.min_days} onBlur={(e) => saveMethod(z.id, { id: m.id, min_days: Number(e.target.value) })} aria-label="Min days" />
                    <input type="number" className="input py-1.5 text-sm w-16" defaultValue={m.max_days} onBlur={(e) => saveMethod(z.id, { id: m.id, max_days: Number(e.target.value) })} aria-label="Max days" />
                  </span>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-mist-400 pb-2">
                  <input type="checkbox" className="accent-gold-500" checked={!!m.is_active} onChange={(e) => saveMethod(z.id, { id: m.id, is_active: e.target.checked })} />
                  Active
                </label>
                <button className="btn-outline btn-sm text-red-300 border-red-500/40" disabled={busy} onClick={() => removeMethod(m.id)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
