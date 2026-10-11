import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment not completed" };

export default async function CancelledPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  return (
    <div className="container-page py-20 text-center max-w-xl mx-auto">
      <p className="text-4xl mb-4" aria-hidden>🕊️</p>
      <h1 className="font-display text-3xl text-cream-50">No payment was taken</h1>
      <p className="mt-4 text-mist-300 leading-relaxed">
        Your payment was cancelled or could not be completed. <strong className="text-cream-100">No order has been confirmed and no charge was made.</strong>
        Your items are still safe in your cart.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/checkout" className="btn-gold btn-lg">
          Try checkout again
        </Link>
        <Link href="/cart" className="btn-outline btn-lg">
          Return to cart
        </Link>
      </div>
      <p className="text-sm text-mist-500 mt-8">
        Having trouble? <Link href="/help" className="text-gold-400 hover:text-gold-300">Contact support</Link> and we'll help you through it.
      </p>
    </div>
  );
}
