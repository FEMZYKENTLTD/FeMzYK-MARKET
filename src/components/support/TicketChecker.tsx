"use client";
import { useState } from "react";

export default function TicketChecker() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setData(null);
    try {
      const r = await fetch(`/api/support/ticket?reference=${encodeURIComponent(reference.trim())}&email=${encodeURIComponent(email.trim())}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Lookup failed.");
      setData(j);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: reference.trim(), email: email.trim(), body: reply }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not send.");
      setReply("");
      const r2 = await fetch(`/api/support/ticket?reference=${encodeURIComponent(reference.trim())}&email=${encodeURIComponent(email.trim())}`);
      setData(await r2.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-lg text-cream-50">Check an existing request</h2>
      <p className="text-[13px] text-mist-400 mt-1 mb-4">Enter the full reference shown after you submitted your request and the email address you used.</p>
      <form onSubmit={lookup} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
        <input className="input font-mono" placeholder="SUP-…" value={reference} onChange={(e) => setReference(e.target.value)} required aria-label="Ticket reference" />
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email used for the request" />
        <button className="btn-outline btn-md" disabled={busy}>{busy ? "…" : "View"}</button>
      </form>
      {error && <p className="text-sm text-red-300 mt-3">{error}</p>}

      {data && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-navy">{data.ticket.topic}</span>
            <span className={data.ticket.status === "open" ? "badge-gold" : data.ticket.status === "closed" ? "badge-gray" : "badge-green"}>{data.ticket.status}</span>
            <span className="text-sm text-cream-100 font-medium">{data.ticket.subject}</span>
          </div>
          <ul className="mt-4 space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {data.replies.map((r: any, i: number) => (
              <li key={i} className={`rounded-lg px-4 py-3 text-sm border ${r.author_type === "team" ? "bg-navy-900/60 border-navy-700/50" : "bg-ink-800 border-ink-700"}`}>
                <p className="text-cream-100 whitespace-pre-wrap">{r.body}</p>
                <p className="text-[10px] text-mist-500 mt-1.5">{r.author_type === "team" ? "FEMZYK team" : "You"} · {r.created_at}</p>
              </li>
            ))}
          </ul>
          {data.ticket.status !== "closed" && (
            <div className="mt-4">
              <label className="label">Add a reply</label>
              <textarea className="input min-h-[70px]" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write your reply…" />
              <button className="btn-gold btn-sm mt-2" disabled={busy || !reply.trim()} onClick={sendReply}>Send reply</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
