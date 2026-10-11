"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";

/**
 * Simulated hosted payment page for the FEMZYK Test Gateway.
 * In production this page is replaced by Flutterwave's or Paystack's hosted
 * checkout — the surrounding flow (callback → server verification → order)
 * stays identical.
 */
export default function GatewayClient({ reference, amountCents, currency }: { reference: string; amountCents: number; currency: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function complete(outcome: "SUCCESS" | "FAILED" | "CANCELLED") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, outcome }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && !json.orderNumber) throw new Error(json.error || "Payment could not be processed.");
      if (outcome === "SUCCESS" && json.orderNumber) {
        router.push(`/order-confirmation?order=${encodeURIComponent(json.orderNumber)}`);
      } else if (outcome === "CANCELLED") {
        router.push(`/checkout/cancelled?order=${encodeURIComponent(json.orderNumber || "")}`);
      } else {
        setError("Your payment could not be completed. No order has been confirmed. Please try again or use another payment method.");
        setBusy(false);
      }
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="card p-8 max-w-md w-full text-center">
      <div className="w-12 h-12 rounded-full bg-gold-500/15 border border-gold-500/40 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-gold-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <p className="eyebrow">FEMZYK Test Gateway</p>
      <h1 className="font-display text-2xl text-cream-50 mt-2">Secure payment</h1>
      <p className="text-sm text-mist-400 mt-2">
        Amount: <span className="text-cream-100 font-semibold">{formatMoney(amountCents, currency)}</span>
      </p>
      <p className="text-xs text-mist-500 mt-1">Reference: {reference}</p>

      <div className="mt-6 space-y-2.5">
        <button className="btn-gold btn-lg w-full" disabled={busy} onClick={() => complete("SUCCESS")}>
          {busy ? "Processing…" : `Pay ${formatMoney(amountCents, currency)}`}
        </button>
        <button className="btn-dark btn-md w-full" disabled={busy} onClick={() => complete("FAILED")}>
          Simulate failed payment
        </button>
        <button className="btn-ghost btn-md w-full" disabled={busy} onClick={() => complete("CANCELLED")}>
          Cancel and return to store
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3" role="alert">
          {error}
        </p>
      )}

      <p className="text-[11px] text-mist-500 mt-6 leading-relaxed">
        This is the sandbox payment gateway used while live payment keys (Flutterwave / Paystack) are not connected.
        The production flow is identical: you'd be redirected to your provider's secure hosted checkout, and your order
        is only confirmed after server-side verification.
      </p>
    </div>
  );
}
