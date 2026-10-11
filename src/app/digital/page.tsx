import { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/lib/repo/catalog";
import ProductCard from "@/components/product/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import { getDisplayCurrency } from "@/lib/moneyServer";

export const metadata: Metadata = {
  title: "Digital Resources",
  description: "Browse digital products currently published by FEMZYK MARKET.",
};

export default async function DigitalHub() {
  const currency = await getDisplayCurrency();
  const all = [
    ...listProducts({ type: "DIGITAL_PRODUCT", perPage: 24, sort: "new" }).items,
    ...listProducts({ type: "DOWNLOADABLE_RESOURCE", perPage: 24, sort: "new" }).items,
  ].slice(0, 24);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-ink-700">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-ink-950 to-ink-900" aria-hidden />
        <div className="container-page relative py-16 text-center">
          <p className="eyebrow">Digital resources</p>
          <h1 className="font-display text-4xl sm:text-5xl text-cream-50 mt-3">{all.length > 0 ? "Published digital listings" : "Digital resources"}</h1>
          <p className="mt-4 text-mist-300 max-w-2xl mx-auto leading-relaxed">
            {all.length > 0
              ? "Review each listing's description, format, and access terms. Private file access follows verified payment."
              : "No downloadable products are currently available. Listings appear here after their content and private delivery file are published."}
          </p>
          {all.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["Programming", "Web Development", "Business", "Design", "Productivity", "Templates", "Guides", "Resources"].map((t) => (
                <Link key={t} href={`/search?q=${encodeURIComponent(t)}&type=DIGITAL_PRODUCT`} className="badge-gray px-3 py-1.5 hover:border-gold-500/60 hover:text-cream-100 transition-colors">{t}</Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container-page py-12">
        {all.length > 0 ? (
          <>
            <div className="flex items-end justify-between mb-6">
              <div><p className="eyebrow">Available downloads</p><h2 className="section-title mt-2">The digital collection</h2></div>
              <Link href="/shop/digital" className="btn-outline btn-md hidden sm:inline-flex">Browse all</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {all.map((p) => <ProductCard key={p.id} p={p} currency={currency} />)}
            </div>
          </>
        ) : (
          <EmptyState icon="📚" title="No digital downloads are available right now." body="Digital products appear here after their content and secure delivery files are published. You can still explore physical products or FEMZYK web development services." ctaHref="/shop/all" ctaLabel="Explore the shop" />
        )}
      </section>

      {all.length > 0 && (
        <section className="border-t border-ink-700 bg-ink-900">
          <div className="container-page py-12 grid sm:grid-cols-3 gap-4">
            {[
              ["⚡", "Private delivery", "Download links appear after payment is verified."],
              ["🔄", "Versioned files", "Active purchases can access the current published version."],
              ["🔐", "Protected storage", "Delivery files are served through access-controlled routes."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="card p-6 text-center">
                <span className="text-2xl" aria-hidden>{icon}</span>
                <h3 className="text-sm font-semibold text-cream-100 mt-3">{title}</h3>
                <p className="text-[13px] text-mist-400 mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
