"use client";
import { useState } from "react";

const TOPICS = [
  ["general", "General question"],
  ["order", "Order problem"],
  ["shipping", "Shipping question"],
  ["returns", "Returns"],
  ["digital", "Digital downloads"],
  ["webdev", "Web development inquiry"],
];

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: "general", orderNumber: "", subject: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send your message.");
      setDone(json.reference);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <p className="text-4xl mb-4" aria-hidden>✅</p>
        <h2 className="font-display text-2xl text-cream-50">Message received</h2>
        <p className="text-sm text-mist-400 mt-3">
          Your reference is <span className="text-gold-300 font-semibold">{done}</span>. We'll reply to your email — usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="ct-name">Your name *</label>
          <input id="ct-name" required className="input" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="ct-email">Email *</label>
          <input id="ct-email" type="email" required className="input" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="ct-topic">Topic</label>
          <select id="ct-topic" className="input" value={form.topic} onChange={(e) => set("topic", e.target.value)}>
            {TOPICS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ct-order">Order number (if relevant)</label>
          <input id="ct-order" className="input" placeholder="FM-…" value={form.orderNumber} onChange={(e) => set("orderNumber", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ct-subject">Subject *</label>
        <input id="ct-subject" required className="input" value={form.subject} onChange={(e) => set("subject", e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="ct-body">How can we help? *</label>
        <textarea id="ct-body" required minLength={10} className="input min-h-[140px]" value={form.body} onChange={(e) => set("body", e.target.value)} />
      </div>
      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3" role="alert">{error}</p>
      )}
      <button className="btn-gold btn-lg" disabled={busy}>
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
