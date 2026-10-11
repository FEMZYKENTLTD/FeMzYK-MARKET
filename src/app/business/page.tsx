import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Businesses",
  description: "View business-related service and digital-resource listings currently published by FEMZYK MARKET.",
};

export default function BusinessPage() {
  return (
    <div className="container-page py-14 max-w-3xl mx-auto">
      <div className="card p-8 sm:p-12 text-center">
        <p className="eyebrow">FEMZYK MARKET</p>
        <h1 className="font-display text-3xl sm:text-4xl text-cream-50 mt-3">For businesses</h1>
        <p className="text-mist-300 mt-4 leading-relaxed">
          Browse the web-development services and digital resources currently published in the store. Scope, pricing, exclusions, and timing are shown on each listing when available.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/services" className="btn-gold btn-lg">View service listings</Link>
          <Link href="/digital" className="btn-outline btn-lg">View digital resources</Link>
          <Link href="/help" className="btn-ghost btn-lg">Ask support</Link>
        </div>
      </div>
    </div>
  );
}
