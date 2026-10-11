"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AddToCartButton({
  productId,
  variantId,
  qty = 1,
  small,
  label,
}: {
  productId: number;
  variantId?: number | null;
  qty?: number;
  small?: boolean;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function add() {
    setState("busy");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId: variantId ?? null, qty }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not add to cart.");
      setState("done");
      router.refresh();
      setTimeout(() => setState("idle"), 1600);
    } catch (e: any) {
      setState("error");
      setMsg(e.message);
      setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <span className="inline-flex flex-col items-stretch">
      <button
        onClick={add}
        disabled={state === "busy"}
        className={small ? "btn-dark btn-sm rounded-lg" : "btn-gold btn-lg w-full"}
        aria-live="polite"
      >
        {state === "busy" ? (
          "Adding…"
        ) : state === "done" ? (
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Added
          </span>
        ) : (
          label ?? (
            <span className="inline-flex items-center gap-1.5">
              {!small && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              )}
              Add to Cart
            </span>
          )
        )}
      </button>
      {state === "error" && (
        <span className="text-xs text-red-300 mt-1" role="alert">
          {msg}
        </span>
      )}
    </span>
  );
}
