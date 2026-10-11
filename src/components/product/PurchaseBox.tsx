"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertCents, formatMoney } from "@/lib/money";
import WishlistButton from "./WishlistButton";

interface VariantOpt {
  id: number;
  name: string;
  price_delta_cents: number;
  stock_qty: number;
}

export default function PurchaseBox({
  productId,
  priceCents,
  currency,
  variants,
  wishlisted,
}: {
  productId: number;
  priceCents: number;
  currency: string;
  variants: VariantOpt[];
  wishlisted: boolean;
}) {
  const [variantId, setVariantId] = useState<number | null>(variants?.[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const selected = variants.find((v) => v.id === variantId);
  const unit = priceCents + (selected?.price_delta_cents ?? 0);
  const variantOutOfStock = !!selected && selected.stock_qty <= 0;

  async function addToCart(goCheckout = false) {
    setState("busy");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId, qty }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not add to cart.");
      router.refresh();
      if (goCheckout) {
        router.push("/checkout");
      } else {
        setState("done");
        setTimeout(() => setState("idle"), 1600);
      }
    } catch (e: any) {
      setState("error");
      setMsg(e.message);
      setTimeout(() => setState("idle"), 2600);
    }
  }

  return (
    <div className="space-y-4">
      {variants.length > 0 && (
        <div>
          <p className="label">Choose an option</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Product options">
            {variants.map((v) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={variantId === v.id}
                onClick={() => setVariantId(v.id)}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  variantId === v.id ? "border-gold-500 text-gold-300 bg-gold-500/10" : "border-ink-600 text-mist-300 hover:border-ink-500"
                } ${v.stock_qty <= 0 ? "opacity-50 line-through" : ""}`}
              >
                {v.name}
                <span className="block text-[11px] text-mist-500">{formatMoney(convertCents(priceCents + v.price_delta_cents, currency), currency)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-stretch">
        <div className="flex items-center rounded-lg border border-ink-600 bg-ink-900">
          <button className="px-3.5 py-3 text-mist-300 hover:text-cream-50" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}>
            −
          </button>
          <input
            aria-label="Quantity"
            className="w-12 text-center bg-transparent text-sm text-cream-100 focus:outline-none"
            value={qty}
            inputMode="numeric"
            onChange={(e) => setQty(Math.max(1, Math.min(99, parseInt(e.target.value || "1", 10))))}
          />
          <button className="px-3.5 py-3 text-mist-300 hover:text-cream-50" aria-label="Increase quantity" onClick={() => setQty(Math.min(99, qty + 1))}>
            +
          </button>
        </div>
        <button onClick={() => addToCart(false)} disabled={state === "busy" || variantOutOfStock} className="btn-gold btn-lg flex-1 min-w-[160px]">
          {state === "busy" ? "Adding…" : state === "done" ? "✓ Added to cart" : "Add to Cart"}
        </button>
        <button onClick={() => addToCart(true)} disabled={state === "busy" || variantOutOfStock} className="btn-outline btn-lg flex-1 min-w-[140px]">
          Buy Now
        </button>
        <WishlistButton productId={productId} active={wishlisted} large />
      </div>
      {variantOutOfStock && <p className="text-xs text-red-300">This option is currently out of stock.</p>}
      {state === "error" && (
        <p className="text-sm text-red-300" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
