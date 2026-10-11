import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCartToken, cartLines } from "@/lib/cart";
import { q1 } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { providerLabel, getPaymentProvider } from "@/lib/payments";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import { getDisplayCurrency } from "@/lib/moneyServer";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const token = await getCartToken();
  const cart = token ? q1<{ id: number }>("SELECT id FROM carts WHERE token = ?", token) : null;
  const lines = cart ? cartLines(cart.id) : [];
  if (!lines.length) redirect("/cart");

  let provider: ReturnType<typeof getPaymentProvider> | null = null;
  try { provider = getPaymentProvider(); } catch { provider = null; }

  if (!provider) {
    return (
      <div className="container-page py-16 max-w-2xl mx-auto">
        <p className="eyebrow">Checkout</p>
        <h1 className="font-display text-3xl text-cream-50 mt-2">Secure payment is being configured.</h1>
        <div className="card p-6 mt-6">
          <p className="text-sm text-mist-300 leading-relaxed">
            We are not accepting payments until a live payment provider is connected. Your cart is saved; no order was created and no payment was attempted.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/cart" className="btn-gold btn-md">Return to cart</Link>
            <Link href="/help" className="btn-outline btn-md">Visit Help Center</Link>
          </div>
        </div>
      </div>
    );
  }

  const user = await getSessionUser();
  const currency = await getDisplayCurrency();

  return (
    <div className="container-page py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl text-cream-50">Checkout</h1>
          <Link href="/cart" className="text-sm text-mist-400 hover:text-cream-100 transition-colors">← Back to cart</Link>
        </div>
        <CheckoutForm
          email={user?.email ?? ""}
          firstName={user?.firstName ?? ""}
          lastName={user?.lastName ?? ""}
          signedIn={!!user}
          currency={currency}
          needsShipping={lines.some((l) => l.requires_shipping)}
          hasService={lines.some((l) => l.type_code === "SERVICE" || l.type_code === "SERVICE_PACKAGE")}
          providerLabel={providerLabel(provider.code)}
        />
        <p className="text-xs text-mist-500 mt-8 text-center max-w-lg mx-auto leading-relaxed">
          Your payment details are handled securely by {providerLabel(provider.code)}. We never see or store card numbers.
          Need help? <Link href="/help" className="text-gold-400 hover:text-gold-300">Visit the Help Center</Link> — see also our{" "}
          <Link href="/returns" className="text-gold-400 hover:text-gold-300">return policy</Link>.
        </p>
      </div>
    </div>
  );
}
