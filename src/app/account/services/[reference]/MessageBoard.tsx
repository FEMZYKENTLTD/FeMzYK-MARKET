"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/util";

export default function MessageBoard({
  projectRef,
  messages,
}: {
  projectRef: string;
  messages: { id: number; senderType: string; senderName: string | null; body: string; createdAt: string }[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectRef}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send the message.");
      setBody("");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ul className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
        {messages.map((m) => (
          <li key={m.id} className={`flex ${m.senderType === "customer" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 ${m.senderType === "customer" ? "bg-navy-800/70 border border-navy-600/50" : "bg-ink-800 border border-ink-700"}`}>
              <p className="text-sm text-cream-100 whitespace-pre-wrap leading-relaxed">{m.body}</p>
              <p className="text-[10px] text-mist-500 mt-1.5">
                {m.senderType === "team" ? m.senderName || "FEMZYK Team" : "You"} · {timeAgo(m.createdAt)}
              </p>
            </div>
          </li>
        ))}
        {messages.length === 0 && <li className="text-sm text-mist-500">No messages yet.</li>}
      </ul>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <label htmlFor="msg-body" className="sr-only">Your message</label>
        <input id="msg-body" className="input" placeholder="Write a message to the FEMZYK team…" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
        <button className="btn-gold btn-md shrink-0" disabled={busy || !body.trim()}>
          {busy ? "…" : "Send"}
        </button>
      </form>
      {error && (
        <p className="text-xs text-red-300 mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
