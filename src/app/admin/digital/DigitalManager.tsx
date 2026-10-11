"use client";
import { useEffect, useState } from "react";
import { adminFetch, Th, Td } from "@/lib/adminClient";

export default function DigitalManager() {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [versions, setVersions] = useState<Record<number, string>>({});

  useEffect(() => {
    adminFetch("/api/admin/digital-files").then(setItems).catch(() => {});
  }, []);

  async function upload(product: any, file: File) {
    setBusy(product.id);
    setMsg("");
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const up = await adminFetch("/api/admin/upload", { method: "POST", body: JSON.stringify({ dataUrl, name: file.name, kind: "digital" }) });
      await adminFetch("/api/admin/digital-files", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          storedPath: up.storedPath,
          originalName: up.originalName,
          mimeType: up.mimeType,
          sizeBytes: up.sizeBytes,
          version: versions[product.id] || product.digital_version || "1.0",
        }),
      });
      setMsg(`Uploaded new file for "${product.name}"${(versions[product.id] || product.digital_version) !== product.digital_version ? " — owners notified of the update." : "."}`);
      const fresh = await adminFetch("/api/admin/digital-files");
      setItems(fresh);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {msg && <p className="text-sm text-emerald-300 mb-4">{msg}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-ink-700">
            <tr><Th>Product</Th><Th>Version</Th><Th>Files</Th><Th>Owners</Th><Th>New version</Th><Th>Upload delivery file</Th></tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-ink-800/50">
                <Td className="text-cream-100">{p.name}</Td>
                <Td>v{p.digital_version || "—"}</Td>
                <Td>{p.file_count}</Td>
                <Td>{p.owners}</Td>
                <Td>
                  <input className="input py-1.5 text-xs w-24" defaultValue={p.digital_version || "1.0"} onChange={(e) => setVersions((v) => ({ ...v, [p.id]: e.target.value }))} aria-label={`New version for ${p.name}`} />
                </Td>
                <Td>
                  <label className="btn-dark btn-sm cursor-pointer inline-flex">
                    {busy === p.id ? "Uploading…" : "Choose file…"}
                    <input type="file" className="sr-only" disabled={busy === p.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(p, f); }} />
                  </label>
                </Td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-mist-500">No digital products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
