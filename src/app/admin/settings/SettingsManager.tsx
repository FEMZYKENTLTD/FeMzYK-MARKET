"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminClient";

export default function SettingsManager() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/settings").then(setData).catch((e) => setMsg(e.message));
  }, []);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const rates: Record<string, number> = {};
      for (const [k, v] of Object.entries(data.currency_rates || {})) rates[k] = Number(v);
      await adminFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ site: data.site, currency_rates: rates, promotion: data.promotion }) });
      setMsg("Settings saved.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="text-sm text-mist-500">{msg || "Loading settings…"}</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400">Business</h2>
        <div><label className="label">Store name</label><input className="input" value={data.site.storeName} onChange={(e) => setData({ ...data, site: { ...data.site, storeName: e.target.value } })} /></div>
        <div><label className="label">Tagline</label><input className="input" value={data.site.tagline} onChange={(e) => setData({ ...data, site: { ...data.site, tagline: e.target.value } })} /></div>
        <div><label className="label">Support email</label><input className="input" value={data.site.supportEmail} onChange={(e) => setData({ ...data, site: { ...data.site, supportEmail: e.target.value } })} /></div>
        <div><label className="label">Business name</label><input className="input" value={data.site.businessName} onChange={(e) => setData({ ...data, site: { ...data.site, businessName: e.target.value } })} /></div>
        <div><label className="label">Business address line</label><input className="input" value={data.site.businessAddress} onChange={(e) => setData({ ...data, site: { ...data.site, businessAddress: e.target.value } })} /></div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400">Multi-currency rates (1 USD =)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.keys(data.currency_rates).map((code) => (
            <div key={code}>
              <label className="label">{code}</label>
              <input type="number" step="0.0001" className="input" value={data.currency_rates[code]} onChange={(e) => setData({ ...data, currency_rates: { ...data.currency_rates, [code]: e.target.value } })} />
            </div>
          ))}
        </div>
        <p className="text-xs text-mist-500">USD, CAD, GBP and NGN are supported now; additional currencies can be added to the platform without redesign.</p>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400">Promotion</h2>
        <label className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer">
          <input type="checkbox" className="accent-gold-500" checked={!!data.promotion.active} onChange={(e) => setData({ ...data, promotion: { ...data.promotion, active: e.target.checked } })} />
          Show a real, admin-set promotional message (never fake urgency)
        </label>
        <input className="input" placeholder="e.g. Free shipping on US orders over $75 this week" value={data.promotion.message || ""} onChange={(e) => setData({ ...data, promotion: { ...data.promotion, message: e.target.value } })} />
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-3">Payments & environment</h2>
        <p className="text-xs text-mist-500 mt-2 leading-relaxed">
          The active provider is configured via environment variables (PAYMENT_PROVIDER + provider keys) — not editable
          from the browser, and never exposed to the frontend. Flutterwave and Paystack adapters are built in; switching
          providers never requires checkout code changes.
        </p>
      </div>

      <button className="btn-gold btn-lg" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
      {msg && <p className={`text-sm ${msg === "Settings saved." ? "text-emerald-300" : "text-red-300"}`}>{msg}</p>}
    </div>
  );
}
