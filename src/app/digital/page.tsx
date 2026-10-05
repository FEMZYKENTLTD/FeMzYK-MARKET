import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { listProducts } from "@/lib/repo/catalog";
import ProductCard from "@/components/product/ProductCard";

export const metadata: Metadata = {
  title: "FEMZYK Digital — Guides, Templates & Resources",
  description:
    "Premium digital products from FEMZYK: programming guides, web development resources, business templates and design assets. Instant delivery, lifetime updates.",
};

export default function DigitalHub() {
  const currency = cookies().get("fm_currency")?.value || "USD";
  const sections = [
    { title: "Programming", type: "DIGITAL_PRODUCT", q: "python programming", blurb: "Learn to code with practical, project-based guides." },
    { title: "Web Development", type: "DIGITAL_PRODUCT", q: "website web development guide", blurb: "Everything about building for the web." },
    { title: "Business & Templates", type: "DIGITAL_PRODUCT", q: "business template", blurb: "Documents and systems for small businesses." },
  ];
  const all = listProducts({ type: "DIGITAL_PRODUCT", perPage: 24, sort: "new" }).items;
  const resources = listProducts({ type: "DOWNLOADABLE_RESOURCE", perPage: 12 }).items;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-ink-700">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-ink-950 to-ink-900" aria-hidden />
        <div className="container-page relative py-16 text-center">
          <p className="eyebrow">FEMZYK Digital</p>
          <h1 className="font-display text-4xl sm:text-5xl text-cream-50 mt-3">Premium resources, delivered instantly.</h1>
          <p className="mt-4 text-mist-300 max-w-2xl mx-auto leading-relaxed">
            Guides, templates and resources built by the FEMZYK studio. Buy once, download securely, keep every future update free.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["Programming", "Web Development", "Business", "Design", "Productivity", "Templates", "Guides", "Resources"].map((t) => (
              <Link key={t} href={`/search?q=${encodeURIComponent(t)}&type=DIGITAL_PRODUCT`} className="badge-gray px-3 py-1.5 hover:border-gold-500/60 hover:text-cream-100 transition-colors">
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="eyebrow">Newest releases</p>
            <h2 className="section-title mt-2">The digital collection</h2>
          </div>
          <Link href="/shop/digital" className="btn-outline btn-md hidden sm:inline-flex">
            Browse all
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {all.map((p) => (
            <ProductCard key={p.id} p={p} currency={currency} />
          ))}
        </div>
      </section>

      <section className="border-t border-ink-700 bg-ink-900">
        <div className="container-page py-12 grid sm:grid-cols-3 gap-4">
          {[
            ["⚡", "Instant delivery", "Secure download links the moment payment is verified."],
            ["🔄", "Free updates", "When a product you own improves, the new version is yours."],
            ["🔐", "Private downloads", "Your files live in protected storage — never public URLs."],
          ].map(([icon, t, d]) => (
            <div key={t} className="card p-6 text-center">
              <span className="text-2xl" aria-hidden>{icon}</span>
              <h3 className="text-sm font-semibold text-cream-100 mt-3">{t}</h3>
              <p className="text-[13px] text-mist-400 mt-1.5 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
