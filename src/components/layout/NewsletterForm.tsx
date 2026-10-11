"use client";
import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setState("done");
    } catch (err: any) {
      setState("error");
      setMsg(err.message);
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3" role="status">
        Thanks — you're subscribed. We'll only email you when it's worth it.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2.5">
      <div className="flex-1">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          type="email"
          required
          className="input"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button className="btn-gold btn-md shrink-0" disabled={state === "busy"}>
        {state === "busy" ? "Subscribing…" : "Subscribe"}
      </button>
      {state === "error" && (
        <p className="text-sm text-red-300 w-full sm:w-auto" role="alert">{msg}</p>
      )}
    </form>
  );
}
