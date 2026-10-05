"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { convertCents, formatMoney } from "@/lib/money";
import type { CartLine } from "@/lib/cartTypes";

async function patchLine(payload: Record<string, unknown>) {
  const res = await fetch("/api/cart", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "Could not update the cart.");
  }
}

function LineRow({ line, currency }: { line: CartLine; currency: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unit = convertCents(line.unit_price_cents, currency);
  const typeLabel =
    line.type_code === "SERVICE" || line.type_code === "SERVICE_PACKAGE" ? "Service" : line.type_code.startsWith("DIGITAL") || line.type_code === "DOWNLOADABLE_RESOURCE" ? "Digital · instant delivery" : "Physical · ships in 1–2 days";

  async function update(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card p-4 sm:p-5 flex gap-4 ${!line.in_stock || line.unavailable ? "opacity-70" : ""}`}>
      <Link href={`/products/${line.slug}`} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-ink-800 shrink-0">
        {line.image ? <Image src={line.image} alt={line.image_alt || line.name} fill sizes="96px" className="object-cover" /> : null}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/products/${line.slug}`} className="text-sm font-medium text-cream-100 hover:text-gold-300 transition-colors line-clamp-2">
              {line.name}
            </Link>
            {(line.variant_name || line.package_name) && <p className="text-xs text-mist-400 mt-0.5">{line.package_name || line.variant_name}</p>}
            <p className="text-[11px] text-mist-500 mt-1">{typeLabel}</p>
          </div>
          <button
            className="text-mist-500 hover:text-red-300 transition-colors shrink-0"
            aria-label={`Remove ${line.name} from cart`}
            disabled={busy}
            onClick={() => update(() => patchLine({ lineId: line.id, qty: 0 }))}
          >
            <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {(!line.in_stock || line.unavailable) && (
          <p className="text-xs text-red-300 mt-2">This item is currently unavailable — remove it or save it for later.</p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center rounded-lg border border-ink-600 bg-ink-900">
            <button className="px-3 py-1.5 text-mist-300 hover:text-cream-50" aria-label="Decrease quantity" disabled={busy} onClick={() => update(() => patchLine({ lineId: line.id, qty: Math.max(1, line.qty - 1) }))}>
              −
            </button>
            <span className="w-10 text-center text-sm text-cream-100" aria-label={`Quantity: ${line.qty}`}>
              {line.qty}
            </span>
            <button
              className="px-3 py-1.5 text-mist-300 hover:text-cream-50 disabled:opacity-40"
              aria-label="Increase quantity"
              disabled={busy || (!!line.track_inventory && !line.allow_backorder && line.qty >= line.stock_qty)}
              onClick={() => update(() => patchLine({ lineId: line.id, qty: line.qty + 1 }))}
            >
              +
            </button>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-cream-50">{formatMoney(unit * line.qty, currency)}</p>
            {line.qty > 1 && <p className="text-[11px] text-mist-500">{formatMoney(unit, currency)} each</p>}
          </div>
        </div>
        <button className="text-[11px] text-mist-500 hover:text-gold-300 mt-2 transition-colors" disabled={busy} onClick={() => update(() => patchLine({ lineId: line.id, savedForLater: true }))}>
          Save for later
        </button>
      </div>
    </div>
  );
}

function SavedRow({ line, currency }: { line: CartLine; currency: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unit = convertCents(line.unit_price_cents, currency);

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 flex items-center gap-4">
      <Link href={`/products/${line.slug}`} className="relative w-14 h-14 rounded-lg overflow-hidden bg-ink-800 shrink-0">
        {line.image ? <Image src={line.image} alt="" fill sizes="56px" className="object-cover" /> : null}
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/products/${line.slug}`} className="text-sm text-cream-100 hover:text-gold-300 transition-colors line-clamp-1">
          {line.name}
        </Link>
        <p className="text-xs text-mist-500 mt-0.5">{formatMoney(unit, currency)}</p>
      </div>
      <button className="btn-dark btn-sm shrink-0" disabled={busy} onClick={() => act(() => patchLine({ lineId: line.id, savedForLater: false }))}>
        Move to cart
      </button>
      <button className="text-mist-500 hover:text-red-300 px-1 shrink-0" aria-label="Remove" disabled={busy} onClick={() => act(() => patchLine({ lineId: line.id, qty: 0 }))}>
        ✕
      </button>
    </div>
  );
}

function CouponForm({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode || "");
  const [applied, setApplied] = useState(initialCode || "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not apply that code.");
      if (json.removed) {
        setApplied("");
        setMsg({ ok: true, text: "Coupon removed." });
      } else {
        setApplied(json.coupon.code);
        setMsg({ ok: true, text: `Coupon ${json.coupon.code} applied — ${json.coupon.label}.` });
      }
      router.refresh();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={apply}>
      <label htmlFor="coupon" className="label">
        Coupon code
      </label>
      <div className="flex gap-2">
        <input id="coupon" className="input py-2 text-sm" placeholder="e.g. WELCOME10" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="btn-dark btn-sm shrink-0" disabled={busy || !code.trim()}>
          {busy ? "…" : applied ? "Update" : "Apply"}
        </button>
      </div>
      {applied && (
        <button type="button" className="text-[11px] text-mist-500 hover:text-red-300 mt-1.5" onClick={() => setCode("")}>
          Applied: {applied} — enter empty and press Update to remove
        </button>
      )}
      {msg && (
        <p className={`text-xs mt-1.5 ${msg.ok ? "text-emerald-300" : "text-red-300"}`} role="status">
          {msg.text}
        </p>
      )}
    </form>
  );
}

const CartActions = { LineRow, SavedRow, CouponForm };
export default CartActions;
