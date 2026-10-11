"use client";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminClient";

interface PFile { id: number; filename: string; size_bytes: number | null; uploaded_by: string; created_at: string; }

export default function FileShare({ projectRef, role }: { projectRef: string; role: "customer" | "team" }) {
  const [files, setFiles] = useState<PFile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    const fetcher = role === "team" ? () => adminFetch(`/api/projects/${projectRef}/files`) : () => fetch(`/api/projects/${projectRef}/files`).then(async (r) => (r.ok ? r.json() : []));
    fetcher().then(setFiles).catch(() => setFiles([]));
  };
  useEffect(load, [projectRef, role]);

  async function upload(f: File) {
    setBusy(true);
    setMsg("");
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const res = role === "team"
        ? await adminFetch(`/api/projects/${projectRef}/files`, { method: "POST", body: JSON.stringify({ dataUrl, name: f.name }) })
        : await fetch(`/api/projects/${projectRef}/files`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl, name: f.name }) }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; });
      if (!res.ok && res.ok !== true) throw new Error("Upload failed.");
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {files === null ? (
        <p className="text-xs text-mist-500">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-mist-500">No files shared yet. Exchange brand assets, logos and deliverables here.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2">
              <span className="text-cream-200 truncate">{f.filename}</span>
              <span className="text-[10px] text-mist-500 whitespace-nowrap">
                {f.uploaded_by === "team" ? "FEMZYK" : "client"} · {f.size_bytes ? `${Math.max(1, Math.round(f.size_bytes / 1024))} KB` : ""}
              </span>
              <a href={`/api/project-files/${f.id}`} className="text-xs text-gold-400 hover:text-gold-300 whitespace-nowrap">Download</a>
            </li>
          ))}
        </ul>
      )}
      <label className={`mt-3 cursor-pointer inline-flex ${role === "team" ? "btn-dark btn-sm" : "btn-outline btn-sm"}`}>
        {busy ? "Uploading…" : "Share a file"}
        <input type="file" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </label>
      {msg && <p className="text-xs text-red-300 mt-2">{msg}</p>}
    </div>
  );
}
