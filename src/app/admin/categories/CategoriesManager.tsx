"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, Th, Td } from "@/lib/adminClient";

interface Cat { id: number; parent_id: number | null; slug: string; name: string; position: number; is_active: boolean; product_count: number; parent_name: string | null; }

export default function CategoriesManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", parent_id: "", position: 0 });
  const roots = categories.filter((c) => !c.parent_id);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await adminFetch("/api/admin/categories", { method: "POST", body: JSON.stringify({ name: form.name, parent_id: form.parent_id ? Number(form.parent_id) : null, position: form.position }) });
      setForm({ name: "", parent_id: "", position: 0 });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: Cat) {
    setBusy(true);
    try {
      await adminFetch("/api/admin/categories", { method: "PATCH", body: JSON.stringify({ id: c.id, is_active: !c.is_active }) });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Cat) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/categories?id=${c.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="border-b border-ink-700">
            <tr><Th>Category</Th><Th>Slug</Th><Th>Products</Th><Th>Status</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-ink-800/50">
                <Td className={c.parent_id ? "pl-8" : "font-medium text-cream-100"}>{c.name}</Td>
                <Td><code className="text-xs text-mist-500">/{c.slug}</code></Td>
                <Td>{c.product_count}</Td>
                <Td>{c.is_active ? <span className="badge-green">Active</span> : <span className="badge-gray">Hidden</span>}</Td>
                <Td>
                  <span className="flex gap-2 whitespace-nowrap">
                    <button className="text-xs text-mist-500 hover:text-cream-100" disabled={busy} onClick={() => toggleActive(c)}>{c.is_active ? "Hide" : "Show"}</button>
                    <button className="text-xs text-mist-500 hover:text-red-300" disabled={busy || c.product_count > 0} title={c.product_count > 0 ? "Remove products first" : ""} onClick={() => remove(c)}>Delete</button>
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="card p-5 space-y-3 lg:sticky lg:top-24">
        <h2 className="text-sm font-semibold text-cream-100">Add category</h2>
        <div>
          <label className="label">Name *</label>
          <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Parent (optional)</label>
          <select className="input" value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
            <option value="">— top level —</option>
            {roots.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sort position</label>
          <input type="number" className="input" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) }))} />
        </div>
        <button className="btn-gold btn-md w-full" disabled={busy}>{busy ? "Creating…" : "Create category"}</button>
        {msg && <p className="text-xs text-red-300">{msg}</p>}
      </form>
    </div>
  );
}
