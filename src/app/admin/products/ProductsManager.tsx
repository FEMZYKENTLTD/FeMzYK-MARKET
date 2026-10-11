"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { adminFetch, Th, Td } from "@/lib/adminClient";

const TYPE_LABEL: Record<string, string> = {
  PHYSICAL_PRODUCT: "Physical",
  DIGITAL_PRODUCT: "Digital",
  DOWNLOADABLE_RESOURCE: "Resource",
  SERVICE: "Service",
  SERVICE_PACKAGE: "Package",
};

export default function ProductsManager() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await adminFetch(`/api/admin/products?q=${encodeURIComponent(q)}&status=${status}`).catch(() => null);
    if (data) {
      setItems(data.items);
      setTotal(data.total);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function toggle(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function bulk(action: string, value?: number | string) {
    if (selected.size === 0) return;
    setBusy(true);
    setMsg("");
    try {
      await adminFetch("/api/admin/products/bulk", { method: "POST", body: JSON.stringify({ ids: [...selected], action, value }) });
      setMsg(`Applied "${action}" to ${selected.size} products.`);
      setSelected(new Set());
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function single(id: number, action: "duplicate" | "archive") {
    setBusy(true);
    try {
      if (action === "duplicate") await adminFetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
      else await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input max-w-xs" placeholder="Search name, SKU, slug…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
        <span className="text-sm text-mist-500 self-center">{total} products</span>
      </div>

      {selected.size > 0 && (
        <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-cream-100 mr-2">{selected.size} selected:</span>
          <button className="btn-dark btn-sm" disabled={busy} onClick={() => bulk("publish")}>Publish</button>
          <button className="btn-dark btn-sm" disabled={busy} onClick={() => bulk("unpublish")}>Unpublish</button>
          <button className="btn-dark btn-sm" disabled={busy} onClick={() => bulk("archive")}>Archive</button>
          <button className="btn-dark btn-sm" disabled={busy} onClick={() => { const v = prompt("Price change percent (e.g. -10 or 5):"); if (v) bulk("price-percent", Number(v)); }}>Adjust price %</button>
          <button className="btn-dark btn-sm" disabled={busy} onClick={() => { const v = prompt("Set stock quantity:"); if (v != null && !Number.isNaN(Number(v))) bulk("set-stock", Number(v)); }}>Set stock</button>
        </div>
      )}
      {msg && <p className="text-xs text-mist-400 mb-3">{msg}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-ink-700">
            <tr>
              <Th>
                <input type="checkbox" aria-label="Select all" className="accent-gold-500" checked={selected.size > 0 && selected.size === items.length} onChange={(e) => setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())} />
              </Th>
              <Th>Product</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Price</Th>
              <Th>Stock</Th>
              <Th>Sold</Th>
              <Th>Flags</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-ink-800/50">
                <Td>
                  <input type="checkbox" aria-label={`Select ${p.name}`} className="accent-gold-500" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {p.image ? <Image src={p.image} alt="" width={36} height={36} className="rounded-md object-cover bg-ink-700" /> : <span className="w-9 h-9 rounded-md bg-ink-700 inline-block" />}
                    <span className="min-w-0">
                      <Link href={`/admin/products/${p.id}/edit`} className="block text-cream-100 hover:text-gold-300 transition-colors truncate max-w-[260px]">{p.name}</Link>
                      <span className="block text-[11px] text-mist-500">{p.sku}</span>
                    </span>
                  </div>
                </Td>
                <Td>{TYPE_LABEL[p.type_code] ?? p.type_code}</Td>
                <Td>
                  <span className={p.status === "published" ? "badge-green" : p.status === "archived" ? "badge-red" : "badge-gray"}>{p.status}</span>
                </Td>
                <Td>${(p.price_cents / 100).toFixed(2)}</Td>
                <Td>{p.track_inventory ? (p.stock_qty <= p.low_stock_threshold ? <span className="text-red-300">{p.stock_qty}</span> : p.stock_qty) : "∞"}</Td>
                <Td>{p.sales_count}</Td>
                <Td>
                  <span className="flex gap-1">
                    {p.is_featured ? <span title="Featured">★</span> : null}
                    {p.is_bestseller ? <span title="Bestseller">🔥</span> : null}
                    {p.is_new ? <span title="New">✦</span> : null}
                  </span>
                </Td>
                <Td>
                  <span className="flex gap-2 whitespace-nowrap">
                    <Link href={`/admin/products/${p.id}/edit`} className="text-xs text-gold-400 hover:text-gold-300">Edit</Link>
                    <Link href={`/products/${p.slug}`} target="_blank" className="text-xs text-mist-500 hover:text-cream-100">View</Link>
                    <button className="text-xs text-mist-500 hover:text-cream-100" disabled={busy} onClick={() => single(p.id, "duplicate")}>Duplicate</button>
                    {p.status !== "archived" && (
                      <button className="text-xs text-mist-500 hover:text-red-300" disabled={busy} onClick={() => { if (confirm(`Archive "${p.name}"?`)) single(p.id, "archive"); }}>Archive</button>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-mist-500">
                  No products match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
