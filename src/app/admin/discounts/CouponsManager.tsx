"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, Th, Td } from "@/lib/adminClient";

export default function CouponsManager({ coupons }: { coupons: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ code: "", type: "percent", value: "10", min_subtotal: "0", usage_limit: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await adminFetch("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value_cents: form.type === "percent" ? Math.round(Number(form.value) * 100) : Math.round(Number(form.value) * 100),
          min_subtotal_cents: Math.round(Number(form.min_subtotal || 0) * 100),
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        }),
      });
      setForm({ code: "", type: "percent", value: "10", min_subtotal: "0", usage_limit: "" });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(c: any) {
    setBusy(true);
    try {
      await adminFetch("/api/admin/coupons", { method: "PATCH", body: JSON.stringify({ id: c.id, is_active: !c.is_active }) });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this coupon?")) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead className="border-b border-ink-700">
            <tr><Th>Code</Th><Th>Discount</Th><Th>Min order</Th><Th>Usage</Th><Th>Status</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-ink-800/50">
                <Td className="font-mono text-cream-100">{c.code}</Td>
                <Td>{c.type === "percent" ? `${c.value_cents / 100}% off` : `$${(c.value_cents / 100).toFixed(2)} off`}</Td>
                <Td>{c.min_subtotal_cents ? `$${(c.min_subtotal_cents / 100).toFixed(0)}` : "—"}</Td>
                <Td>{c.times_used}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</Td>
                <Td>{c.is_active ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}</Td>
                <Td>
                  <span className="flex gap-2 whitespace-nowrap">
                    <button className="text-xs text-mist-500 hover:text-cream-100" disabled={busy} onClick={() => toggle(c)}>{c.is_active ? "Deactivate" : "Activate"}</button>
                    <button className="text-xs text-mist-500 hover:text-red-300" disabled={busy} onClick={() => remove(c.id)}>Delete</button>
                  </span>
                </Td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-mist-500">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-cream-100">Create coupon</h2>
        <input className="input font-mono uppercase" placeholder="CODE *" required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} aria-label="Discount type">
            <option value="percent">Percent %</option>
            <option value="fixed">Fixed $</option>
          </select>
          <input className="input" type="number" step="0.01" min="0" required value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} aria-label="Discount value" />
        </div>
        <input className="input" type="number" step="0.01" min="0" placeholder="Min order ($, optional)" value={form.min_subtotal} onChange={(e) => setForm((f) => ({ ...f, min_subtotal: e.target.value }))} />
        <input className="input" type="number" min="1" placeholder="Usage limit (optional)" value={form.usage_limit} onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))} />
        <button className="btn-gold btn-md" disabled={busy}>{busy ? "Creating…" : "Create coupon"}</button>
        {msg && <p className="text-xs text-red-300">{msg}</p>}
      </form>
    </div>
  );
}
