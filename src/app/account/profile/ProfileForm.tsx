"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileForm({ firstName, lastName, email, marketing }: { firstName: string; lastName: string; email: string; marketing: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName, lastName, marketing });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save changes.");
      setMsg("Saved.");
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="label" htmlFor="pf-email">Email</label>
        <input id="pf-email" className="input opacity-60" value={email} disabled aria-disabled />
        <p className="text-[11px] text-mist-500 mt-1">Contact support to change your email address.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pf-first">First name</label>
          <input id="pf-first" className="input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="pf-last">Last name</label>
          <input id="pf-last" className="input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
        </div>
      </div>
      <label className="flex items-start gap-2.5 text-xs text-mist-400 cursor-pointer">
        <input type="checkbox" className="accent-gold-500 mt-0.5" checked={form.marketing} onChange={(e) => setForm((f) => ({ ...f, marketing: e.target.checked }))} />
        Receive product and digital release emails (you can unsubscribe any time).
      </label>
      <button className="btn-gold btn-md" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </button>
      {msg && (
        <p className="text-sm text-mist-300" role="status">
          {msg}
        </p>
      )}
    </form>
  );
}
