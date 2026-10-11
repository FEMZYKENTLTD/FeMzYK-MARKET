"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { adminFetch } from "@/lib/adminClient";

interface FormState {
  type_code: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  short_description: string;
  description: string;
  price_cents: number;
  compare_at_cents: number | null;
  cost_cents: number | null;
  category_ids: number[];
  tags: string[];
  tagInput: string;
  track_inventory: boolean;
  stock_qty: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
  requires_shipping: boolean;
  weight_grams: number | null;
  status: string;
  publish_at: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  specs: [string, string][];
  features: string[];
  faqs: { q: string; a: string }[];
  included: string[];
  warranty_text: string;
  return_eligible: boolean;
  return_notes: string;
  digital_file_type: string;
  digital_file_size: string;
  digital_version: string;
  digital_download_limit: number | null;
  digital_expiry_days: number | null;
  service_quote_type: string;
  service_delivery_min_days: number | null;
  service_delivery_max_days: number | null;
  service_revisions: number | null;
  service_included: string[];
  service_excluded: string[];
  service_process: [string, string][];
  service_requirements: any[];
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  supplier_id: number | null;
  supplier_sku: string;
  images: { url: string; alt: string; role: string }[];
  variants: { id?: number; sku?: string; name: string; options: Record<string, string>; price_delta_cents: number; stock_qty: number }[];
}

const EMPTY: FormState = {
  type_code: "PHYSICAL_PRODUCT", sku: "", slug: "", name: "", brand: "",
  short_description: "", description: "", price_cents: 0, compare_at_cents: null, cost_cents: null,
  category_ids: [], tags: [], tagInput: "", track_inventory: true, stock_qty: 0, low_stock_threshold: 5,
  allow_backorder: false, requires_shipping: true, weight_grams: null, status: "draft", publish_at: "",
  is_featured: false, is_bestseller: false, is_new: true,
  specs: [], features: [], faqs: [], included: [], warranty_text: "", return_eligible: true, return_notes: "",
  digital_file_type: "", digital_file_size: "", digital_version: "1.0", digital_download_limit: 10, digital_expiry_days: 365,
  service_quote_type: "starting", service_delivery_min_days: null, service_delivery_max_days: null, service_revisions: 2,
  service_included: [], service_excluded: [], service_process: [], service_requirements: [],
  seo_title: "", seo_description: "", seo_keywords: "", supplier_id: null, supplier_sku: "",
  images: [], variants: [],
};

export default function ProductForm({ productId }: { productId?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState("basics");

  useEffect(() => {
    (async () => {
      const [cats, sups] = await Promise.all([
        adminFetch("/api/admin/categories"),
        adminFetch("/api/admin/meta"),
      ]);
      setCategories(cats);
      setTypes(sups.types);
      setSuppliers(sups.suppliers);
      if (productId) {
        const p = await adminFetch(`/api/admin/products/${productId}`);
        setForm({
          ...EMPTY,
          ...p,
          price_cents: p.price_cents ?? 0,
          compare_at_cents: p.compare_at_cents,
          cost_cents: p.cost_cents,
          category_ids: p.category_ids ?? [],
          tags: JSON.parse(p.tags_json || "[]"),
          tagInput: "",
          specs: JSON.parse(p.specs_json || "[]"),
          features: JSON.parse(p.features_json || "[]"),
          faqs: JSON.parse(p.faq_json || "[]"),
          included: JSON.parse(p.included_json || "[]"),
          warranty_text: p.warranty_text || "",
          return_notes: p.return_notes || "",
          digital_file_type: p.digital_file_type || "",
          digital_file_size: p.digital_file_size || "",
          digital_version: p.digital_version || "1.0",
          digital_download_limit: p.digital_download_limit,
          digital_expiry_days: p.digital_expiry_days,
          service_quote_type: p.service_quote_type || "starting",
          service_delivery_min_days: p.service_delivery_min_days,
          service_delivery_max_days: p.service_delivery_max_days,
          service_revisions: p.service_revisions,
          service_included: JSON.parse(p.service_included_json || "[]"),
          service_excluded: JSON.parse(p.service_excluded_json || "[]"),
          service_process: JSON.parse(p.service_process_json || "[]"),
          service_requirements: JSON.parse(p.service_requirements_json || "[]"),
          seo_title: p.seo_title || "",
          seo_description: p.seo_description || "",
          seo_keywords: p.seo_keywords || "",
          supplier_id: p.supplier_id,
          supplier_sku: p.supplier_sku || "",
          slug: p.slug,
          publish_at: p.publish_at || "",
          images: p.images?.map((i: any) => ({ url: i.url, alt: i.alt, role: i.role })) ?? [],
          variants: p.variants?.map((v: any) => ({ id: v.id, sku: v.sku, name: v.name, options: JSON.parse(v.options_json || "{}"), price_delta_cents: v.price_delta_cents, stock_qty: v.stock_qty })) ?? [],
        });
      }
    })();
  }, [productId]);

  const isDigital = form.type_code === "DIGITAL_PRODUCT" || form.type_code === "DOWNLOADABLE_RESOURCE";
  const isService = form.type_code === "SERVICE" || form.type_code === "SERVICE_PACKAGE";

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadImage(file: File) {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const json = await adminFetch("/api/admin/upload", { method: "POST", body: JSON.stringify({ dataUrl, name: file.name }) });
    return json.url as string;
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const payload = {
        ...form,
        compare_at_cents: form.compare_at_cents || null,
        cost_cents: form.cost_cents || null,
        publish_at: form.status === "scheduled" && form.publish_at ? form.publish_at.replace("T", " ").slice(0, 19) : null,
        supplier_id: form.supplier_id || null,
      };
      delete (payload as any).tagInput;
      if (productId) await adminFetch(`/api/admin/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) });
      else {
        const res = await adminFetch("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
        router.push(`/admin/products/${res.id}/edit`);
      }
      setMsg("Saved.");
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const sections = useMemo(
    () => [
      ["basics", "Basic info"],
      ["pricing", "Pricing"],
      ["inventory", "Inventory"],
      ["media", "Media"],
      ["content", "Description & content"],
      ...(isDigital ? [["digital", "Digital delivery"]] : []),
      ...(isService ? [["service", "Service setup"]] : []),
      ["shipping", "Shipping"],
      ["seo", "SEO"],
      ["publish", "Publishing"],
    ],
    [isDigital, isService]
  );

  const ListEditor = ({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) => (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input className="input" value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="btn-dark btn-sm shrink-0" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn-ghost btn-sm" onClick={() => onChange([...items, ""])}>+ Add item</button>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[190px_1fr] gap-6 items-start">
      {/* Section nav */}
      <nav className="card p-3 lg:sticky lg:top-24">
        {sections.map(([key, label]) => (
          <button key={key} className={`block w-full text-left rounded-md px-3 py-2 text-[13px] transition-colors ${section === key ? "bg-ink-700 text-cream-50" : "text-mist-400 hover:text-cream-100"}`} onClick={() => setSection(key)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="space-y-5 min-w-0">
        {section === "basics" && (
          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Product name *</label>
              <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Product type *</label>
                <select className="input" value={form.type_code} onChange={(e) => set("type_code", e.target.value)}>
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">SKU *</label>
                <input className="input" value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="label">Brand / manufacturer (if applicable)</label>
                <input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
              </div>
              <div>
                <label className="label">Slug (URL)</label>
                <input className="input" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated from name if empty" />
              </div>
            </div>
            <div>
              <label className="label">Categories</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto border border-ink-700 rounded-lg p-3">
                {categories.map((c) => (
                  <label key={c.id} className={`flex items-center gap-2 text-[13px] ${c.parent_id ? "pl-5" : ""} ${!c.parent_id ? "font-medium text-cream-100" : "text-mist-400"}`}>
                    <input
                      type="checkbox"
                      className="accent-gold-500"
                      checked={form.category_ids.includes(c.id)}
                      onChange={(e) => set("category_ids", e.target.checked ? [...form.category_ids, c.id] : form.category_ids.filter((x) => x !== c.id))}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map((t) => (
                  <button key={t} type="button" className="badge-gray" onClick={() => set("tags", form.tags.filter((x) => x !== t))}>
                    {t} ✕
                  </button>
                ))}
              </div>
              <input
                className="input"
                value={form.tagInput}
                placeholder="Type a tag and press Enter"
                onChange={(e) => set("tagInput", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && form.tagInput.trim()) {
                    e.preventDefault();
                    const t = form.tagInput.trim().toLowerCase();
                    if (!form.tags.includes(t)) set("tags", [...form.tags, t]);
                    set("tagInput", "");
                  }
                }}
              />
            </div>
            <div>
              <label className="label">Supplier</label>
              <div className="grid sm:grid-cols-2 gap-3">
                <select className="input" value={form.supplier_id ?? ""} onChange={(e) => set("supplier_id", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— none —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input className="input" placeholder="Supplier SKU" value={form.supplier_sku} onChange={(e) => set("supplier_sku", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {section === "pricing" && (
          <div className="card p-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Price (USD cents) *</label>
                <input type="number" className="input" value={form.price_cents} min={0} onChange={(e) => set("price_cents", Number(e.target.value))} />
                <p className="text-[11px] text-mist-500 mt-1">= ${(form.price_cents / 100).toFixed(2)}</p>
              </div>
              <div>
                <label className="label">Compare-at price (cents)</label>
                <input type="number" className="input" value={form.compare_at_cents ?? ""} min={0} onChange={(e) => set("compare_at_cents", e.target.value ? Number(e.target.value) : null)} />
                <p className="text-[11px] text-mist-500 mt-1">Only set for genuine reference prices.</p>
              </div>
              <div>
                <label className="label">Cost (cents)</label>
                <input type="number" className="input" value={form.cost_cents ?? ""} min={0} onChange={(e) => set("cost_cents", e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>
            {/* Variants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Variants</label>
                <button type="button" className="btn-ghost btn-sm" onClick={() => set("variants", [...form.variants, { name: "", options: {}, price_delta_cents: 0, stock_qty: 0 }])}>+ Add variant</button>
              </div>
              {form.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2 items-center">
                  <input className="input" placeholder="Name (e.g. Charcoal Black)" value={v.name} onChange={(e) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <input className="input" placeholder="Option (Color: Black)" value={Object.entries(v.options).map(([k, val]) => `${k}: ${val}`).join(", ")} onChange={(e) => {
                    const opts: Record<string, string> = {};
                    e.target.value.split(",").forEach((pair) => { const [k, val] = pair.split(":").map((s) => s.trim()); if (k && val) opts[k] = val; });
                    set("variants", form.variants.map((x, j) => (j === i ? { ...x, options: opts } : x)));
                  }} />
                  <input type="number" className="input" placeholder="Δ cents" value={v.price_delta_cents} onChange={(e) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, price_delta_cents: Number(e.target.value) } : x)))} />
                  <input type="number" className="input" placeholder="Stock" value={v.stock_qty} onChange={(e) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, stock_qty: Number(e.target.value) } : x)))} />
                  <button type="button" className="btn-dark btn-sm" onClick={() => set("variants", form.variants.filter((_, j) => j !== i))}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "inventory" && (
          <div className="card p-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Stock quantity</label>
                <input type="number" className="input" value={form.stock_qty} min={0} disabled={!form.track_inventory} onChange={(e) => set("stock_qty", Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Low-stock threshold</label>
                <input type="number" className="input" value={form.low_stock_threshold} min={0} onChange={(e) => set("low_stock_threshold", Number(e.target.value))} />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer">
              <input type="checkbox" className="accent-gold-500" checked={form.track_inventory} onChange={(e) => set("track_inventory", e.target.checked)} /> Track inventory (turn off for digital/service)
            </label>
            <label className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer">
              <input type="checkbox" className="accent-gold-500" checked={form.allow_backorder} onChange={(e) => set("allow_backorder", e.target.checked)} /> Allow backorders (overselling disabled unless checked)
            </label>
            {isDigital && <p className="text-xs text-mist-500">Digital products don't use inventory — tracking is disabled automatically.</p>}
          </div>
        )}

        {section === "media" && (
          <div className="card p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden border border-ink-700 aspect-square group">
                  <Image src={img.url} alt={img.alt || "Product image"} fill className="object-cover" />
                  <button type="button" className="absolute top-1.5 right-1.5 rounded-md bg-ink-950/80 px-2 py-1 text-[10px] text-red-300 opacity-0 group-hover:opacity-100" onClick={() => set("images", form.images.filter((_, j) => j !== i))}>Remove</button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border border-dashed border-ink-600 flex flex-col items-center justify-center text-mist-500 text-xs cursor-pointer hover:border-gold-500/60 hover:text-gold-300 transition-colors">
                <span className="text-2xl mb-1" aria-hidden>＋</span>
                Upload image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const url = await uploadImage(f);
                      set("images", [...form.images, { url, alt: form.name || "Product image", role: form.images.length === 0 ? "primary" : "gallery" }]);
                    } catch (err: any) {
                      setMsg(err.message);
                    }
                  }}
                />
              </label>
            </div>
            {form.images.length > 0 && (
              <div>
                <label className="label">Alt text (accessibility & SEO)</label>
                {form.images.map((img, i) => (
                  <input key={i} className="input mb-2" value={img.alt} placeholder="Describe the image" onChange={(e) => set("images", form.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                ))}
              </div>
            )}
          </div>
        )}

        {section === "content" && (
          <div className="card p-6 space-y-5">
            <div>
              <label className="label">Short description</label>
              <textarea className="input" value={form.short_description} onChange={(e) => set("short_description", e.target.value)} maxLength={600} />
            </div>
            <div>
              <label className="label">Full description</label>
              <textarea className="input min-h-[180px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
              <p className="text-[11px] text-mist-500 mt-1">Separate paragraphs with a blank line. Write like a real company — specific, honest, useful.</p>
            </div>
            <div>
              <label className="label">Key benefits / features</label>
              <ListEditor items={form.features} onChange={(v) => set("features", v)} placeholder="Feature" />
            </div>
            <div>
              <label className="label">What's included</label>
              <ListEditor items={form.included} onChange={(v) => set("included", v)} placeholder="Included item" />
            </div>
            <div>
              <label className="label">Specifications (key / value)</label>
              {form.specs.map(([k, v], i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className="input" placeholder="Key" value={k} onChange={(e) => set("specs", form.specs.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                  <input className="input" placeholder="Value" value={v} onChange={(e) => set("specs", form.specs.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                  <button type="button" className="btn-dark btn-sm shrink-0" onClick={() => set("specs", form.specs.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <button type="button" className="btn-ghost btn-sm" onClick={() => set("specs", [...form.specs, ["", ""]])}>+ Add specification</button>
            </div>
            <div>
              <label className="label">FAQs</label>
              {form.faqs.map((f, i) => (
                <div key={i} className="space-y-1.5 mb-3 border border-ink-700 rounded-lg p-3">
                  <input className="input" placeholder="Question" value={f.q} onChange={(e) => set("faqs", form.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
                  <textarea className="input" placeholder="Answer" value={f.a} onChange={(e) => set("faqs", form.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
                  <button type="button" className="btn-dark btn-sm" onClick={() => set("faqs", form.faqs.filter((_, j) => j !== i))}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn-ghost btn-sm" onClick={() => set("faqs", [...form.faqs, { q: "", a: "" }])}>+ Add FAQ</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Warranty</label>
                <input className="input" value={form.warranty_text} onChange={(e) => set("warranty_text", e.target.value)} />
              </div>
              <div>
                <label className="label">Return notes</label>
                <input className="input" value={form.return_notes} onChange={(e) => set("return_notes", e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer">
              <input type="checkbox" className="accent-gold-500" checked={form.return_eligible} onChange={(e) => set("return_eligible", e.target.checked)} /> Return eligible (30-day policy)
            </label>
          </div>
        )}

        {section === "digital" && isDigital && (
          <div className="card p-6 space-y-4">
            <p className="text-xs text-mist-500">Files themselves are uploaded in <strong>Digital Files</strong>. These settings control delivery rules.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">File type</label><input className="input" placeholder="PDF + ZIP" value={form.digital_file_type} onChange={(e) => set("digital_file_type", e.target.value)} /></div>
              <div><label className="label">File size</label><input className="input" placeholder="≈ 20 MB" value={form.digital_file_size} onChange={(e) => set("digital_file_size", e.target.value)} /></div>
              <div><label className="label">Version</label><input className="input" value={form.digital_version} onChange={(e) => set("digital_version", e.target.value)} /></div>
              <div><label className="label">Download limit</label><input type="number" className="input" value={form.digital_download_limit ?? 10} onChange={(e) => set("digital_download_limit", Number(e.target.value))} /></div>
              <div><label className="label">Access expiry (days)</label><input type="number" className="input" value={form.digital_expiry_days ?? 365} onChange={(e) => set("digital_expiry_days", Number(e.target.value))} /></div>
            </div>
          </div>
        )}

        {section === "service" && isService && (
          <div className="card p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Quote type</label>
                <select className="input" value={form.service_quote_type} onChange={(e) => set("service_quote_type", e.target.value)}>
                  <option value="fixed">Fixed price</option>
                  <option value="starting">Starting from</option>
                  <option value="custom">Custom quote</option>
                </select>
              </div>
              <div><label className="label">Revisions included</label><input type="number" className="input" value={form.service_revisions ?? 0} onChange={(e) => set("service_revisions", Number(e.target.value))} /></div>
              <div><label className="label">Delivery — min days</label><input type="number" className="input" value={form.service_delivery_min_days ?? ""} onChange={(e) => set("service_delivery_min_days", e.target.value ? Number(e.target.value) : null)} /></div>
              <div><label className="label">Delivery — max days</label><input type="number" className="input" value={form.service_delivery_max_days ?? ""} onChange={(e) => set("service_delivery_max_days", e.target.value ? Number(e.target.value) : null)} /></div>
            </div>
            <div><label className="label">Included</label><ListEditor items={form.service_included} onChange={(v) => set("service_included", v)} placeholder="Included" /></div>
            <div><label className="label">Excluded</label><ListEditor items={form.service_excluded} onChange={(v) => set("service_excluded", v)} placeholder="Excluded" /></div>
            <div>
              <label className="label">Process steps</label>
              {form.service_process.map(([t, d], i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className="input w-1/3" placeholder="Step" value={t} onChange={(e) => set("service_process", form.service_process.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                  <input className="input" placeholder="Description" value={d} onChange={(e) => set("service_process", form.service_process.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                  <button type="button" className="btn-dark btn-sm shrink-0" onClick={() => set("service_process", form.service_process.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <button type="button" className="btn-ghost btn-sm" onClick={() => set("service_process", [...form.service_process, ["", ""]])}>+ Add step</button>
            </div>
            <p className="text-xs text-mist-500">Service packages and requirement forms are managed on the service detail (data-driven JSON).</p>
          </div>
        )}

        {section === "shipping" && (
          <div className="card p-6 space-y-4">
            <label className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer">
              <input type="checkbox" className="accent-gold-500" checked={form.requires_shipping} onChange={(e) => set("requires_shipping", e.target.checked)} /> Requires shipping
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Weight (grams)</label>
                <input type="number" className="input" value={form.weight_grams ?? ""} onChange={(e) => set("weight_grams", e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label className="label">Shipping class</label>
                <input className="input" placeholder="e.g. standard, fragile" />
              </div>
            </div>
          </div>
        )}

        {section === "seo" && (
          <div className="card p-6 space-y-4">
            <div><label className="label">SEO title</label><input className="input" value={form.seo_title} maxLength={160} onChange={(e) => set("seo_title", e.target.value)} /></div>
            <div><label className="label">Meta description</label><textarea className="input" value={form.seo_description} maxLength={300} onChange={(e) => set("seo_description", e.target.value)} /></div>
            <div><label className="label">Keywords (comma separated)</label><input className="input" value={form.seo_keywords} onChange={(e) => set("seo_keywords", e.target.value)} /></div>
          </div>
        )}

        {section === "publish" && (
          <div className="card p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              {form.status === "scheduled" && (
                <div>
                  <label className="label">Publish at</label>
                  <input type="datetime-local" className="input" value={form.publish_at} onChange={(e) => set("publish_at", e.target.value)} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer"><input type="checkbox" className="accent-gold-500" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} /> Featured</label>
              <label className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer"><input type="checkbox" className="accent-gold-500" checked={form.is_bestseller} onChange={(e) => set("is_bestseller", e.target.checked)} /> Bestseller</label>
              <label className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer"><input type="checkbox" className="accent-gold-500" checked={form.is_new} onChange={(e) => set("is_new", e.target.checked)} /> New arrival</label>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 sticky bottom-4">
          <button className="btn-gold btn-lg" onClick={save} disabled={busy || !form.name || !form.sku}>
            {busy ? "Saving…" : productId ? "Save changes" : "Create product"}
          </button>
          {msg && <p className={`text-sm ${msg === "Saved." ? "text-emerald-300" : "text-red-300"}`} role="status">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
