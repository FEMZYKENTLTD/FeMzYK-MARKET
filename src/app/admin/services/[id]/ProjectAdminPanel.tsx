"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminClient";
import { PROJECT_STATUS_LABELS } from "@/lib/statemachine";

export default function ProjectAdminPanel({
  projectId,
  status,
  nextStatuses,
  milestones,
}: {
  projectId: number;
  status: string;
  nextStatuses: string[];
  milestones: { id: number; title: string; status: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [message, setMessage] = useState("");

  async function transition(to: string) {
    setBusy(true);
    setMsg("");
    try {
      await adminFetch(`/api/admin/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ status: to }) });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  async function send() {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ message }) });
      setMessage("");
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  async function setMilestone(id: number, ms: string) {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ milestone: { id, status: ms } }) });
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Status</h2>
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <button key={s} className={`btn-sm rounded-lg ${["CANCELLED", "REFUNDED"].includes(s) ? "btn-outline border-red-500/40 text-red-300" : "btn-gold"}`} disabled={busy} onClick={() => transition(s)}>
              {PROJECT_STATUS_LABELS[s] ?? s}
            </button>
          ))}
          {nextStatuses.length === 0 && <p className="text-sm text-mist-500">Terminal state.</p>}
        </div>
        {msg && <p className="text-xs text-red-300 mt-2">{msg}</p>}
      </div>

      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Milestones</h2>
        <ul className="space-y-2.5">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={m.status === "DONE" ? "text-mist-500 line-through" : "text-cream-200"}>{m.title}</span>
              <select className="input w-auto py-1 text-xs" value={m.status} disabled={busy} onChange={(e) => setMilestone(m.id, e.target.value)} aria-label={`Status for ${m.title}`}>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-3">Message the client</h2>
        <textarea className="input min-h-[80px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write an update visible in the client's project dashboard…" />
        <button className="btn-gold btn-sm mt-2" disabled={busy || !message.trim()} onClick={send}>
          Send message
        </button>
      </div>
    </div>
  );
}
