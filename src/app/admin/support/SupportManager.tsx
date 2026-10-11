"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminClient";
import { timeAgo } from "@/lib/util";

interface Ticket {
  id: number; reference: string; name: string; email: string; topic: string;
  order_number: string | null; subject: string; status: string; assigned_to: string | null;
  created_at: string; reply_count: number;
}

export default function SupportManager({ tickets }: { tickets: Ticket[] }) {
  const [openId, setOpenId] = useState<number | null>(tickets[0]?.id ?? null);
  const [thread, setThread] = useState<any[] | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!openId) return;
    setThread(null);
    adminFetch(`/api/admin/support/${openId}`).then((t) => {
      // thread comes from replies endpoint below
      return adminFetch(`/api/admin/support/${openId}/replies`).then((r) => setThread(r));
    }).catch(() => setThread([]));
  }, [openId]);

  async function setStatus(id: number, status: string) {
    setBusy(true);
    setMsg("");
    try {
      await adminFetch(`/api/admin/support/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      window.location.reload();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  async function assign(id: number, assigned_to: string) {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/support/${id}`, { method: "PATCH", body: JSON.stringify({ assigned_to: assigned_to || null }) });
      window.location.reload();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  async function send(id: number) {
    if (!reply.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      await adminFetch(`/api/admin/support/${id}`, { method: "POST", body: JSON.stringify({ reply }) });
      setReply("");
      const r = await adminFetch(`/api/admin/support/${id}/replies`);
      setThread(r);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const active = tickets.find((t) => t.id === openId);

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
      <div className="card divide-y divide-ink-800 max-h-[70vh] overflow-y-auto">
        {tickets.map((t) => (
          <button key={t.id} onClick={() => setOpenId(t.id)} className={`w-full text-left px-4 py-3 transition-colors ${openId === t.id ? "bg-ink-800" : "hover:bg-ink-800/50"}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${t.status === "open" ? "bg-gold-400" : t.status === "pending" ? "bg-navy-400" : "bg-ink-600"}`} aria-hidden />
              <span className="text-[13px] font-medium text-cream-100 truncate">{t.subject}</span>
            </div>
            <p className="text-[11px] text-mist-500 mt-1">
              {t.reference} · {t.topic} · {timeAgo(t.created_at)} · {t.reply_count} message{t.reply_count === 1 ? "" : "s"}
            </p>
          </button>
        ))}
      </div>

      {active && (
        <div className="card p-5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-cream-100 mr-auto">{active.subject}</h2>
            <span className={active.status === "open" ? "badge-gold" : active.status === "resolved" || active.status === "closed" ? "badge-green" : "badge-navy"}>{active.status}</span>
          </div>
          <p className="text-xs text-mist-500 mb-4">
            {active.reference} · {active.name} &lt;{active.email}&gt; · {active.topic}
            {active.order_number ? ` · order ${active.order_number}` : ""} · opened {timeAgo(active.created_at)}
          </p>

          <ul className="space-y-3 max-h-[380px] overflow-y-auto pr-1 mb-4">
            {thread === null && <li className="text-sm text-mist-500">Loading conversation…</li>}
            {thread?.map((r: any, i: number) => (
              <li key={i} className={`rounded-lg px-4 py-3 text-sm border ${r.author_type === "team" ? "bg-navy-900/60 border-navy-700/50" : "bg-ink-800 border-ink-700"}`}>
                <p className="text-cream-100 whitespace-pre-wrap">{r.body}</p>
                <p className="text-[10px] text-mist-500 mt-1.5">{r.author_type === "team" ? "FEMZYK team" : `${active.name} (customer)`} · {r.created_at}</p>
              </li>
            ))}
          </ul>

          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <label className="label">Reply to customer (saved to conversation; email is queued, not sent)</label>
              <textarea className="input min-h-[70px]" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a helpful reply…" />
            </div>
            <button className="btn-gold btn-md" disabled={busy || !reply.trim()} onClick={() => send(active.id)}>Send reply</button>
          </div>
          {msg && <p className="text-xs text-red-300 mt-2">{msg}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            <button className="btn-dark btn-sm" disabled={busy} onClick={() => setStatus(active.id, "pending")}>Mark pending</button>
            <button className="btn-dark btn-sm" disabled={busy} onClick={() => setStatus(active.id, "resolved")}>Resolve</button>
            <button className="btn-outline btn-sm border-red-500/40 text-red-300" disabled={busy} onClick={() => setStatus(active.id, "closed")}>Close</button>
            <input
              className="input py-1 text-xs w-44 ml-auto"
              placeholder="Assign to…"
              defaultValue={active.assigned_to ?? ""}
              onBlur={(e) => e.target.value !== (active.assigned_to ?? "") && assign(active.id, e.target.value)}
              aria-label="Assign ticket"
            />
          </div>
        </div>
      )}
    </div>
  );
}
