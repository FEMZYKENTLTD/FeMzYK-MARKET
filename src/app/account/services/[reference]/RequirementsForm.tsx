"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RequirementsForm({ projectRef, fields }: { projectRef: string; fields: any[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectRef}/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not submit your requirements.");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map((f) => (
        <div key={f.id}>
          <label className="label" htmlFor={`req-${f.id}`}>
            {f.label} {f.required && <span className="text-gold-400">*</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea id={`req-${f.id}`} className="input min-h-[90px]" required={f.required} value={values[f.id] || ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} />
          ) : f.type === "select" ? (
            <select id={`req-${f.id}`} className="input" required={f.required} value={values[f.id] || ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}>
              <option value="" disabled>
                Select…
              </option>
              {(f.options ?? []).map((o: string) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input id={`req-${f.id}`} className="input" required={f.required} value={values[f.id] || ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))} />
          )}
        </div>
      ))}
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <button className="btn-gold btn-lg" disabled={busy}>
        {busy ? "Submitting…" : "Submit requirements"}
      </button>
    </form>
  );
}
