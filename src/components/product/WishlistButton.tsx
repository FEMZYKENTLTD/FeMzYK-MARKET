"use client";
import { useState } from "react";

export default function WishlistButton({ productId, active, large }: { productId: number; active?: boolean; large?: boolean }) {
  const [state, setState] = useState(active ? "on" : "off");
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/account/login?next=/wishlist";
          return;
        }
        throw new Error(json.error || "Could not update wishlist.");
      }
      setState(json.added ? "on" : "off");
    } catch (e) {
      // silent
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={state === "on" ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={state === "on"}
      className={`${large ? "btn-dark btn-lg px-4" : "rounded-full p-2 bg-ink-900/80 border border-ink-600 backdrop-blur"} transition-colors hover:border-gold-500/60`}
      title={state === "on" ? "Remove from wishlist" : "Save to wishlist"}
    >
      <svg
        className={`${large ? "w-5 h-5" : "w-4 h-4"} ${state === "on" ? "text-gold-400 fill-gold-400" : "text-cream-200"}`}
        fill={state === "on" ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth={1.6}
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    </button>
  );
}
