import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCartToken, cartLines } from "@/lib/cart";
import { q1 } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { providerLabel, getPaymentProvider } from "@/lib/payments";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  const token = getCartToken();
  const cart = token ? q1<{ id: number }>("SELECT id FROM carts WHERE token = ?", token) : null;
  const lines = cart ? cartLines(cart.id) : [];
  if (!lines.length) redirect("/cart");

  const user = getSessionUser();
  const currency = cookies().get("fm_currency")?.value || "USD";
  const provider = getPaymentProvider();

  return (
    <div className="container-page py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl text-cream-50">Checkout</h1>
          <Link href="/cart" className="text-sm text-mist-400 hover:text-cream-100 transition-colors">
            ← Back to cart
          </Link>
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
          Need help? <Link href="/help" className="text-gold-400 hover:text-gold-300">Contact support</Link> — see also our{" "}
          <Link href="/returns" className="text-gold-400 hover:text-gold-300">return policy</Link>.
        </p>
      </div>
    </div>
  );
}
