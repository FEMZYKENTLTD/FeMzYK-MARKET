"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, Th, Td } from "@/lib/adminClient";

interface Cat {
  id: number; parent_id: number | null; slug: string; name: string; description: string | null;
  image: string | null; position: number; is_active: boolean; product_count: number; parent_name: string | null;
  seo_title: string | null; seo_description: string | null;
}

const blank = { name: "", slug: "", parent_id: "", position: 0, description: "", image: "", seo_title: "", seo_description: "" };

export default function CategoriesManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<Cat | null>(null);
  const roots = categories.filter((c) => !c.parent_id);

  async function uploadImage(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const result = await adminFetch("/api/admin/upload", { method: "POST", body: JSON.stringify({ dataUrl, name: file.name }) });
    return result.url as string;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await adminFetch("/api/admin/categories", { method: "POST", body: JSON.stringify({
        name: form.name, slug: form.slug || undefined, parent_id: form.parent_id ? Number(form.parent_id) : null,
        position: form.position, description: form.description || undefined, image: form.image || undefined,
        seo_title: form.seo_title || undefined, seo_description: form.seo_description || undefined,
      }) });
      setForm(blank);
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMsg("");
    try {
      await adminFetch("/api/admin/categories", {
        method: "PATCH",
        body: JSON.stringify({
          id: editing.id,
          name: editing.name,
          description: editing.description,
          image: editing.image,
          position: editing.position,
          parent_id: editing.parent_id,
          seo_title: editing.seo_title,
          seo_description: editing.seo_description,
        }),
      });
      setEditing(null);
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
        <table className="w-full min-w-[620px]">
          <thead className="border-b border-ink-700">
            <tr><Th>Category</Th><Th>Slug</Th><Th>Position</Th><Th>Products</Th><Th>Status</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-ink-800/50">
                <Td className={c.parent_id ? "pl-8 text-mist-300" : "font-medium text-cream-100"}>{c.name}</Td>
                <Td><code className="text-xs text-mist-500">/{c.slug}</code></Td>
                <Td>{c.position}</Td>
                <Td>{c.product_count}</Td>
                <Td>{c.is_active ? <span className="badge-green">Active</span> : <span className="badge-gray">Hidden</span>}</Td>
                <Td>
                  <span className="flex gap-2 whitespace-nowrap">
                    <button className="text-xs text-gold-400 hover:text-gold-300" onClick={() => setEditing(c)}>Edit</button>
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
        <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div><label className="label">Slug (optional)</label><input className="input" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto from name" /></div>
        <div>
          <label className="label">Parent (optional)</label>
          <select className="input" value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
            <option value="">— top level —</option>
            {roots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div><label className="label">Description</label><textarea className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
        <div>
          <label className="label">Category image</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="input text-xs" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { const image = await uploadImage(file); setForm((f) => ({ ...f, image })); } catch (error: any) { setMsg(error.message); } finally { setBusy(false); } }} />
          {form.image && <p className="text-[11px] text-mist-500 mt-1">Image uploaded: {form.image}</p>}
        </div>
        <div><label className="label">SEO title</label><input className="input" value={form.seo_title} onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))} /></div>
        <div><label className="label">SEO description</label><textarea className="input" value={form.seo_description} onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))} /></div>
        <div><label className="label">Sort position</label><input type="number" min="0" className="input" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) }))} /></div>
        <button className="btn-gold btn-md w-full" disabled={busy}>{busy ? "Creating…" : "Create category"}</button>
        <p className="text-[11px] text-mist-500 leading-relaxed">New categories appear in storefront navigation automatically — no code changes needed.</p>
        {msg && !editing && <p className="text-xs text-red-300">{msg}</p>}
      </form>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label={`Edit ${editing.name}`}>
          <form onSubmit={saveEdit} className="card w-full max-w-xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-cream-50">Edit “{editing.name}”</h2>
              <button type="button" className="text-mist-500 hover:text-cream-100 text-sm" onClick={() => setEditing(null)}>Close ✕</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Name</label>
                <input className="input" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Sort position</label>
                <input type="number" className="input" value={editing.position} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="label">Parent</label>
              <select className="input" value={editing.parent_id ?? ""} onChange={(e) => setEditing({ ...editing, parent_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— top level —</option>
                {roots.filter((r) => r.id !== editing.id).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Category image URL</label>
              <input className="input" value={editing.image ?? ""} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="/images/category.webp" />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="input text-xs mt-2" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { const image = await uploadImage(file); setEditing((c) => c ? { ...c, image } : c); } catch (error: any) { setMsg(error.message); } finally { setBusy(false); } }} />
            </div>
            <div className="grid sm:grid-cols-1 gap-3">
              <div>
                <label className="label">SEO title</label>
                <input className="input" value={editing.seo_title ?? ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} />
              </div>
              <div>
                <label className="label">SEO description</label>
                <textarea className="input" value={editing.seo_description ?? ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-dark btn-md" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-gold btn-md" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
            </div>
            {msg && <p className="text-xs text-red-300">{msg}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
