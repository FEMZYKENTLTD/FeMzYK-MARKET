"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminClient";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export default function CsvImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResult(null);
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) { setError("The file needs a header row and at least one product row."); return; }
    const header = parsed[0].map((h) => h.trim().toLowerCase());
    const needed = ["sku", "name", "price_cents"];
    const missing = needed.filter((n) => !header.includes(n));
    if (missing.length) { setError(`Missing required columns: ${missing.join(", ")}. Required: sku, name, price_cents. Optional: type_code, brand, status, compare_at_cents, stock_qty, categories (|-separated slugs), short_description.`); return; }
    setRows(parsed.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]))));
  }

  async function runImport() {
    setBusy(true);
    setError("");
    setResult(null);
    const cats = await adminFetch("/api/admin/categories").catch(() => []);
    const slugToId: Record<string, number> = Object.fromEntries((cats as any[]).map((c) => [c.slug, c.id]));
    let ok = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const category_ids = (r.categories || "").split("|").map((s) => s.trim()).filter(Boolean).map((s) => slugToId[s]).filter((x): x is number => typeof x === "number");
        await adminFetch("/api/admin/products", {
          method: "POST",
          body: JSON.stringify({
            sku: r.sku,
            name: r.name,
            type_code: r.type_code || "PHYSICAL_PRODUCT",
            brand: r.brand || undefined,
            status: r.status || "draft",
            price_cents: Number(r.price_cents),
            compare_at_cents: r.compare_at_cents ? Number(r.compare_at_cents) : null,
            stock_qty: Number(r.stock_qty || 0),
            short_description: r.short_description || null,
            category_ids,
          }),
        });
        ok++;
      } catch (e: any) {
        errors.push(`${r.sku || r.name || "?"}: ${e.message}`);
      }
    }
    setResult({ ok, errors });
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn-dark btn-sm" onClick={() => { setOpen(!open); setResult(null); setRows([]); setError(""); }}>Import CSV</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="Import products from CSV">
          <div className="card w-full max-w-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-cream-50">Import products from CSV</h2>
              <button className="text-mist-500 hover:text-cream-100 text-sm" onClick={() => setOpen(false)}>Close ✕</button>
            </div>
            <p className="text-[13px] text-mist-400 leading-relaxed">
              Required columns: <code className="text-mist-300">sku, name, price_cents</code>. Optional: <code className="text-mist-300">type_code, brand, status, compare_at_cents, stock_qty, short_description, categories</code> (category slugs separated by <code className="text-mist-300">|</code>).
              Products import as drafts by default so you can review before publishing.
            </p>
            <input type="file" accept=".csv,text/csv" className="input" onChange={onFile} aria-label="CSV file" />
            {error && <p className="text-sm text-red-300">{error}</p>}
            {rows.length > 0 && (
              <>
                <p className="text-sm text-mist-300">{rows.length} row{rows.length === 1 ? "" : "s"} ready to import.</p>
                <div className="max-h-[240px] overflow-y-auto card p-3">
                  <table className="w-full text-xs">
                    <thead><tr className="text-mist-500 text-left"><th className="pr-3">SKU</th><th className="pr-3">Name</th><th className="pr-3">Price</th><th>Type</th></tr></thead>
                    <tbody>
                      {rows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="text-mist-300"><td className="pr-3 font-mono">{r.sku}</td><td className="pr-3">{r.name}</td><td className="pr-3">${(Number(r.price_cents) / 100).toFixed(2)}</td><td>{r.type_code || "PHYSICAL_PRODUCT"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 50 && <p className="text-[11px] text-mist-500 mt-2">…and {rows.length - 50} more rows.</p>}
                </div>
                <button className="btn-gold btn-md" disabled={busy} onClick={runImport}>{busy ? "Importing…" : `Import ${rows.length} products`}</button>
              </>
            )}
            {result && (
              <div className="text-sm space-y-1">
                <p className="text-emerald-300">{result.ok} product{result.ok === 1 ? "" : "s"} imported.</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-red-300">{e}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
