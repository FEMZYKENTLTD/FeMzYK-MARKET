"use client";
import { useState } from "react";

export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (newPassword !== confirm) { setError("The new passwords don't match."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not update your password.");
      setCurrentPassword(""); setNewPassword(""); setConfirm(""); setMessage(j.message);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-mist-400">Change password</h3>
      <div><label className="label" htmlFor="current-password">Current password</label><input id="current-password" className="input" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
      <div><label className="label" htmlFor="new-password">New password (12+ characters)</label><input id="new-password" className="input" type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
      <div><label className="label" htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" className="input" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      <button className="btn-outline btn-sm" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
      {message && <p className="text-xs text-emerald-300" role="status">{message}</p>}
      {error && <p className="text-xs text-red-300" role="alert">{error}</p>}
    </form>
  );
}
