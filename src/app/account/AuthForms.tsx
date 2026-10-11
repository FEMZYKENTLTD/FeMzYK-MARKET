"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForms({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", confirm: "", firstName: "", lastName: "", marketing: false });
  const [modeState, setModeState] = useState(mode);

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (modeState === "register" && form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${modeState}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          marketing: form.marketing,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      router.push(next && next.startsWith("/") ? next : "/account");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-ink-900 border border-ink-700 mb-6" role="tablist">
        <button
          role="tab"
          aria-selected={modeState === "login"}
          className={`rounded-md py-2 text-sm font-medium transition-colors ${modeState === "login" ? "bg-ink-700 text-cream-50" : "text-mist-400 hover:text-cream-100"}`}
          onClick={() => setModeState("login")}
        >
          Sign in
        </button>
        <button
          role="tab"
          aria-selected={modeState === "register"}
          className={`rounded-md py-2 text-sm font-medium transition-colors ${modeState === "register" ? "bg-ink-700 text-cream-50" : "text-mist-400 hover:text-cream-100"}`}
          onClick={() => setModeState("register")}
        >
          Create account
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {modeState === "register" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="au-first">First name</label>
              <input id="au-first" className="input" autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="au-last">Last name</label>
              <input id="au-last" className="input" autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </div>
          </div>
        )}
        <div>
          <label className="label" htmlFor="au-email">Email</label>
          <input id="au-email" type="email" required autoComplete="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="au-pass">Password {modeState === "register" && <span className="text-mist-500 normal-case">(min. 8 characters)</span>}</label>
          <input id="au-pass" type="password" required minLength={modeState === "register" ? 8 : 1} autoComplete={modeState === "login" ? "current-password" : "new-password"} className="input" value={form.password} onChange={(e) => set("password", e.target.value)} />
        </div>
        {modeState === "register" && (
          <>
            <div>
              <label className="label" htmlFor="au-confirm">Confirm password</label>
              <input id="au-confirm" type="password" required className="input" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
            </div>
            <label className="flex items-start gap-2.5 text-xs text-mist-400 cursor-pointer">
              <input type="checkbox" className="accent-gold-500 mt-0.5" checked={form.marketing} onChange={(e) => set("marketing", e.target.checked)} />
              Email me about new products and digital releases (optional — easy to unsubscribe).
            </label>
          </>
        )}

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3" role="alert">
            {error}
          </p>
        )}

        <button className="btn-gold btn-lg w-full" disabled={busy}>
          {busy ? "Please wait…" : modeState === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      {modeState === "login" && (
        <p className="text-xs text-mist-500 mt-4 text-center">
          Forgot your password? <Link href="/account/forgot" className="text-gold-400 hover:text-gold-300">Reset it</Link>
        </p>
      )}
    </div>
  );
}
