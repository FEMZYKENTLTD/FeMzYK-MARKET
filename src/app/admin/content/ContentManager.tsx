"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminClient";

export default function ContentManager({ pages, faqs }: { pages: { slug: string; title: string; updated_at: string }[]; faqs: any[] }) {
  const [settings, setSettings] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(pages[0]?.slug ?? null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/settings").then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/admin/content/${selected}`).then(async (r) => {
      if (!r.ok) return;
      const j = await r.json();
      setTitle(j.title || "");
      setBody(j.body_md || "");
    });
  }, [selected]);

  async function savePage() {
    if (!selected) return;
    setBusy(true);
    setMsg("");
    try {
      await adminFetch(`/api/admin/content/${selected}`, { method: "PATCH", body: JSON.stringify({ title, body_md: body }) });
      setMsg("Page saved.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    setMsg("");
    try {
      await adminFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ site: settings.site, home_hero: settings.home_hero, promotion: settings.promotion }) });
      setMsg("Homepage content saved.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {settings && (
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400">Homepage & announcements</h2>
          <div>
            <label className="label">Hero title</label>
            <input className="input" value={settings.home_hero?.title || ""} onChange={(e) => setSettings({ ...settings, home_hero: { ...settings.home_hero, title: e.target.value } })} />
          </div>
          <div>
            <label className="label">Hero subtitle</label>
            <textarea className="input" value={settings.home_hero?.subtitle || ""} onChange={(e) => setSettings({ ...settings, home_hero: { ...settings.home_hero, subtitle: e.target.value } })} />
          </div>
          <div>
            <label className="label">Announcement bar (blank = hidden)</label>
            <input className="input" value={settings.site?.announcement || ""} onChange={(e) => setSettings({ ...settings, site: { ...settings.site, announcement: e.target.value } })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Support email</label>
              <input className="input" value={settings.site?.supportEmail || ""} onChange={(e) => setSettings({ ...settings, site: { ...settings.site, supportEmail: e.target.value } })} />
            </div>
            <div>
              <label className="label">Free shipping note</label>
              <input className="input" value={settings.site?.freeShippingNote || ""} onChange={(e) => setSettings({ ...settings, site: { ...settings.site, freeShippingNote: e.target.value } })} />
            </div>
          </div>
          <button className="btn-gold btn-md" onClick={saveSettings} disabled={busy}>{busy ? "Saving…" : "Save homepage content"}</button>
        </div>
      )}

      <div className="grid lg:grid-cols-[240px_1fr] gap-5 items-start">
        <nav className="card p-3 lg:sticky lg:top-24">
          <p className="text-[11px] uppercase tracking-widest text-mist-500 px-3 pb-2">Pages</p>
          {pages.map((p) => (
            <button key={p.slug} className={`block w-full text-left rounded-md px-3 py-2 text-[13px] transition-colors ${selected === p.slug ? "bg-ink-700 text-cream-50" : "text-mist-400 hover:text-cream-100"}`} onClick={() => setSelected(p.slug)}>
              {p.title}
            </button>
          ))}
        </nav>
        <div className="card p-6 space-y-3 min-w-0">
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="label">Body (simple markdown: ## headings, - lists, **bold**, | tables)</label>
          <textarea className="input min-h-[380px] font-mono text-[13px]" value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn-gold btn-md" onClick={savePage} disabled={busy}>{busy ? "Saving…" : "Save page"}</button>
          {msg && <p className={`text-sm ${msg.includes("saved") || msg.includes("Saved") ? "text-emerald-300" : "text-red-300"}`}>{msg}</p>}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-4">FAQ items ({faqs.length})</h2>
        <ul className="space-y-3">
          {faqs.map((f) => (
            <li key={f.id} className="border border-ink-700 rounded-lg p-4">
              <p className="text-sm font-medium text-cream-100">{f.question}</p>
              <p className="text-[13px] text-mist-400 mt-1 leading-relaxed">{f.answer}</p>
              <p className="text-[10px] text-mist-500 mt-2 uppercase tracking-wider">{f.category}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
