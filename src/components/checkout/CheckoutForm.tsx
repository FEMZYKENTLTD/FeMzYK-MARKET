"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";

const COUNTRIES = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["NG", "Nigeria"],
  ["AU", "Australia"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["IE", "Ireland"],
  ["NL", "Netherlands"],
  ["AE", "United Arab Emirates"],
] as const;

interface Totals {
  count: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  needsShipping: boolean;
  shippingQuote: { methodName: string; zoneName: string; minDays: number; maxDays: number; free: boolean } | null;
  coupon: { code: string; label: string } | null;
}

export default function CheckoutForm({
  email,
  firstName,
  lastName,
  signedIn,
  currency,
  needsShipping,
  hasService,
  providerLabel,
}: {
  email: string;
  firstName: string;
  lastName: string;
  signedIn: boolean;
  currency: string;
  needsShipping: boolean;
  hasService: boolean;
  providerLabel: string;
}) {
  const router = useRouter();
  const [country, setCountry] = useState(needsShipping ? "US" : "");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email,
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    note: "",
  });

  const loadTotals = useCallback(async () => {
    try {
      const url = `/api/cart/totals?country=${encodeURIComponent(country || "US")}`;
      const res = await fetch(url);
      if (res.ok) setTotals(await res.json());
    } catch {
      /* keep previous */
    }
  }, [country]);

  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload: any = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        currency,
        country: needsShipping ? country : country || undefined,
        customerNote: form.note || undefined,
      };
      if (needsShipping) {
        if (!form.fullName || !form.line1 || !form.city || !form.postalCode) {
          throw new Error("Please complete all required delivery fields.");
        }
        payload.address = {
          fullName: form.fullName,
          line1: form.line1,
          line2: form.line2 || undefined,
          city: form.city,
          state: form.state || undefined,
          postalCode: form.postalCode,
          country,
        };
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Checkout could not be started.");
      window.location.href = json.redirectUrl;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_380px] gap-8 items-start" noValidate>
      <div className="space-y-6">
        {/* Contact */}
        <section className="card p-6">
          <h2 className="font-display text-lg text-cream-50 mb-1">1 · Contact</h2>
          <p className="text-xs text-mist-500 mb-4">Order updates go to this email. No account required.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="co-email">Email *</label>
              <input id="co-email" type="email" required autoComplete="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label" htmlFor="co-first">First name *</label>
              <input id="co-first" required autoComplete="given-name" className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="co-last">Last name *</label>
              <input id="co-last" required autoComplete="family-name" className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </div>
          </div>
          {!signedIn && (
            <p className="text-xs text-mist-500 mt-4">
              Checking out as a guest — that's fine. You can create an account after purchase to track orders and downloads.
            </p>
          )}
        </section>

        {/* Delivery */}
        {needsShipping && (
          <section className="card p-6">
            <h2 className="font-display text-lg text-cream-50 mb-4">2 · Delivery</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="co-country">Country *</label>
                <select id="co-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)} required>
                  {COUNTRIES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="co-name">Full name *</label>
                <input id="co-name" required autoComplete="name" className="input" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="co-line1">Address line 1 *</label>
                <input id="co-line1" required autoComplete="address-line1" className="input" value={form.line1} onChange={(e) => set("line1", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="co-line2">Address line 2 (optional)</label>
                <input id="co-line2" autoComplete="address-line2" className="input" value={form.line2} onChange={(e) => set("line2", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="co-city">City *</label>
                <input id="co-city" required autoComplete="address-level2" className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="co-state">State / region</label>
                <input id="co-state" autoComplete="address-level1" className="input" value={form.state} onChange={(e) => set("state", e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="co-postal">Postal code *</label>
                <input id="co-postal" required autoComplete="postal-code" className="input" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
              </div>
            </div>
            {totals?.shippingQuote && (
              <p className="text-xs text-mist-400 mt-4">
                {totals.shippingQuote.methodName} · {totals.shippingQuote.zoneName} · est. {totals.shippingQuote.minDays}–{totals.shippingQuote.maxDays} business days
                {totals.shippingQuote.free && <span className="text-emerald-300"> · Free</span>}
              </p>
            )}
          </section>
        )}

        {/* Service note */}
        {hasService && (
          <section className="card p-6 border-navy-700/60">
            <h2 className="font-display text-lg text-cream-50 mb-2">Your service project</h2>
            <p className="text-sm text-mist-400 leading-relaxed">
              After payment you'll receive a project dashboard where you'll share requirements, files and references with
              our team. Nothing starts until you've briefed us and approved the direction.
            </p>
          </section>
        )}

        {/* Note */}
        <section className="card p-6">
          <label className="label" htmlFor="co-note">Order note (optional)</label>
          <textarea id="co-note" className="input min-h-[70px]" maxLength={500} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Anything we should know about this order?" />
        </section>
      </div>

      {/* Summary */}
      <aside className="card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg text-cream-50 mb-4">Order review</h2>
        {totals ? (
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-mist-400">Subtotal ({totals.count} items)</dt>
              <dd className="text-cream-100">{formatMoney(totals.subtotal, currency)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-emerald-300">
                <dt>Discount {totals.coupon ? `(${totals.coupon.code})` : ""}</dt>
                <dd>−{formatMoney(totals.discount, currency)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-mist-400">Shipping</dt>
              <dd className="text-cream-100">{totals.needsShipping ? (totals.shipping === 0 ? "Free" : formatMoney(totals.shipping, currency)) : "—"}</dd>
            </div>
            {totals.tax > 0 && (
              <div className="flex justify-between">
                <dt className="text-mist-400">Taxes</dt>
                <dd className="text-cream-100">{formatMoney(totals.tax, currency)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-ink-700 pt-3 mt-3">
              <dt className="font-semibold text-cream-50">Total due today</dt>
              <dd className="font-semibold text-gold-300 text-lg">{formatMoney(totals.total, currency)}</dd>
            </div>
            <p className="text-[11px] text-mist-500">All amounts in {currency}. No hidden fees — this is exactly what you'll be charged.</p>
          </dl>
        ) : (
          <p className="text-sm text-mist-500">Loading totals…</p>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-gold btn-lg w-full mt-5" disabled={busy || !totals}>
          {busy ? "Connecting to payment…" : `Pay ${totals ? formatMoney(totals.total, currency) : ""} securely`}
        </button>
        <p className="text-[11px] text-mist-500 mt-3 text-center">Payment handled by {providerLabel}. You'll be redirected to complete it securely.</p>

        <div className="mt-5 pt-4 border-t border-ink-700 space-y-2 text-[11px] text-mist-500 leading-relaxed">
          <p>✓ The full amount is shown above before you pay — no surprises at the final step.</p>
          <p>✓ 30-day returns on physical products. <a href="/returns" className="text-gold-400 hover:text-gold-300">Details</a></p>
          <p>✓ Problems with payment? Nothing is charged until verification succeeds. <a href="/help" className="text-gold-400 hover:text-gold-300">Support</a></p>
        </div>
      </aside>
    </form>
  );
}
