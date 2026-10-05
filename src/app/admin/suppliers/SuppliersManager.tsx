"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, Th, Td } from "@/lib/adminClient";

export default function SuppliersManager({ suppliers }: { suppliers: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", contact_email: "", country: "", lead_time_days: "", notes: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await adminFetch("/api/admin/suppliers", { method: "POST", body: JSON.stringify({ ...form, lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null }) });
      setForm({ name: "", contact_email: "", country: "", lead_time_days: "", notes: "" });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this supplier?")) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/suppliers?id=${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-ink-700">
            <tr><Th>Supplier</Th><Th>Contact</Th><Th>Country</Th><Th>Lead time</Th><Th>Products</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-ink-800/50">
                <Td className="text-cream-100">{s.name}</Td>
                <Td>{s.contact_email || "—"}</Td>
                <Td>{s.country || "—"}</Td>
                <Td>{s.lead_time_days != null ? `${s.lead_time_days}d` : "—"}</Td>
                <Td>{s.product_count}</Td>
                <Td>
                  <button className="text-xs text-mist-500 hover:text-red-300" disabled={busy || s.product_count > 0} title={s.product_count > 0 ? "Supplier has products assigned" : ""} onClick={() => remove(s.id)}>
                    Remove
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={create} className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-cream-100">Add supplier</h2>
        <input className="input" placeholder="Name *" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <input className="input" type="email" placeholder="Contact email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
        <input className="input" placeholder="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
        <input className="input" type="number" placeholder="Lead time (days)" value={form.lead_time_days} onChange={(e) => setForm((f) => ({ ...f, lead_time_days: e.target.value }))} />
        <textarea className="input" placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        <button className="btn-gold btn-md" disabled={busy}>{busy ? "Saving…" : "Add supplier"}</button>
        {msg && <p className="text-xs text-red-300">{msg}</p>}
      </form>
    </div>
  );
}
