import { Metadata } from "next";
import Link from "next/link";
import { getCartToken, cartLines, cartTotals, activeCouponState } from "@/lib/cart";
import { q1 } from "@/lib/db";
import { convertCents, formatMoney } from "@/lib/money";
import EmptyState from "@/components/ui/EmptyState";
import CartActions from "@/components/cart/CartActions";
import { getDisplayCurrency } from "@/lib/moneyServer";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const currency = await getDisplayCurrency();
  const token = await getCartToken();
  const cart = token ? q1<{ id: number }>("SELECT id FROM carts WHERE token = ?", token) : null;
  const lines = cart ? cartLines(cart.id) : [];
  const saved = cart ? cartLines(cart.id, true).filter((l) => l.saved_for_later) : [];

  if (!lines.length && !saved.length) {
    return (
      <div className="container-page py-16">
        <h1 className="font-display text-3xl text-cream-50 mb-8">Your cart</h1>
        <EmptyState icon="🛒" title="Your cart is waiting for something good." body="Browse the catalog, or jump straight to our bestsellers and digital resources." ctaHref="/shop/all" ctaLabel="Start shopping" />
      </div>
    );
  }

  const couponState = await activeCouponState();
  const totals = await cartTotals(currency, { coupon: couponState?.coupon ?? null });

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl text-cream-50 mb-8">Your cart</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-4">
          {lines.map((l) => (
            <CartActions.LineRow key={l.id} line={l} currency={currency} />
          ))}
          {lines.length === 0 && <p className="text-sm text-mist-500">All items are saved for later.</p>}

          {saved.length > 0 && (
            <div className="pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-4">Saved for later ({saved.length})</h2>
              <div className="space-y-3">
                {saved.map((l) => (
                  <CartActions.SavedRow key={l.id} line={l} currency={currency} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <aside className="card p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg text-cream-50 mb-4">Order summary</h2>
          <CartActions.CouponForm initialCode={couponState?.coupon?.code ?? ""} />
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-mist-400">Subtotal ({totals.count} items)</dt>
              <dd className="text-cream-100">{formatMoney(totals.subtotalDisp, currency)}</dd>
            </div>
            {totals.discountUsd > 0 && (
              <div className="flex justify-between text-emerald-300">
                <dt>Discount</dt>
                <dd>−{formatMoney(totals.discountDisp, currency)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-mist-400">Shipping</dt>
              <dd className="text-cream-100">{totals.needsShipping ? "Calculated before payment" : "No shipping needed"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mist-400">Taxes</dt>
              <dd className="text-cream-100">Calculated by destination at checkout</dd>
            </div>
            <div className="flex justify-between border-t border-ink-700 pt-3">
              <dt className="font-semibold text-cream-50">Items total before shipping & tax</dt>
              <dd className="font-semibold text-gold-300 text-base">{formatMoney(totals.subtotalDisp - totals.discountDisp, currency)}</dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn-gold btn-lg w-full mt-5">
            Proceed to Checkout
          </Link>
          <Link href="/shop/all" className="btn-ghost btn-md w-full mt-2">
            Continue Shopping
          </Link>
          <div className="mt-5 pt-4 border-t border-ink-700 space-y-1.5 text-[11px] text-mist-500">
            <p>🔒 Payments are accepted only when a secure provider is configured.</p>
            <p>↩️ Product return eligibility is described in our <Link href="/returns" className="text-gold-400 hover:text-gold-300">Returns policy</Link>.</p>
            <p>📦 Order tracking included with every purchase.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
