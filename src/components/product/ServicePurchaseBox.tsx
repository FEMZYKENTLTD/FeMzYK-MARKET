"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertCents, formatMoney } from "@/lib/money";

interface Pkg {
  id: number;
  name: string;
  price_cents: number;
  description: string | null;
  features_json: string;
  is_popular: number;
}

export default function ServicePurchaseBox({
  product,
  packages,
  currency,
}: {
  product: { id: number; slug: string; priceCents: number; quoteType: string | null };
  packages: Pkg[];
  currency: string;
}) {
  const [pkgId, setPkgId] = useState<number | null>(packages.find((p) => p.is_popular)?.id ?? packages[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function start(goCheckout: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, variantId: null, qty: 1, packageId: pkgId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not start your project.");
      router.refresh();
      if (goCheckout) router.push("/checkout");
      else {
        setMsg("Added — review your cart when you're ready.");
      }
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const selected = packages.find((p) => p.id === pkgId);

  return (
    <div className="card p-6">
      <h2 className="font-display text-lg text-cream-50 mb-4">Start your project</h2>

      {packages.length > 0 ? (
        <div className="space-y-2.5" role="radiogroup" aria-label="Choose a package">
          {packages.map((pk) => {
            const feats: string[] = JSON.parse(pk.features_json || "[]");
            return (
              <button
                key={pk.id}
                role="radio"
                aria-checked={pkgId === pk.id}
                onClick={() => setPkgId(pk.id)}
                className={`w-full text-left rounded-lg border p-4 transition-colors ${
                  pkgId === pk.id ? "border-gold-500 bg-gold-500/10" : "border-ink-600 hover:border-ink-500 bg-ink-900"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-cream-100">
                    {pk.name}
                    {pk.is_popular ? <span className="badge-gold ml-2">Popular</span> : null}
                  </span>
                  <span className="text-sm font-semibold text-gold-300">{formatMoney(convertCents(pk.price_cents, currency), currency)}</span>
                </span>
                {pk.description && <span className="block text-xs text-mist-400 mt-1">{pk.description}</span>}
                {pkgId === pk.id && feats.length > 0 && (
                  <span className="block mt-2.5 pt-2.5 border-t border-ink-700">
                    {feats.map((f, i) => (
                      <span key={i} className="block text-[12px] text-mist-300 py-0.5">
                        ✓ {f}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-ink-600 bg-ink-900 p-4 text-sm text-mist-300">
          {product.quoteType === "custom" ? (
            <>This is a custom-scoped service. Contact us and we'll prepare a quote before any payment.</>
          ) : (
            <>
              Starting at <span className="text-gold-300 font-semibold">{formatMoney(convertCents(product.priceCents, currency), currency)}</span>. Final price confirmed with your scope.
            </>
          )}
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        <button className="btn-gold btn-lg w-full" disabled={busy} onClick={() => start(true)}>
          {busy ? "Preparing…" : "Start Your Project"}
        </button>
        <button className="btn-outline btn-md w-full" disabled={busy} onClick={() => start(false)}>
          Add to cart first
        </button>
      </div>
      {msg && <p className="text-xs text-mist-400 mt-3 text-center">{msg}</p>}
      <p className="text-[11px] text-mist-500 mt-4 leading-relaxed">
        After payment you'll get a project dashboard to share requirements, files and feedback. Unstarted projects are fully refundable.
      </p>
    </div>
  );
}
