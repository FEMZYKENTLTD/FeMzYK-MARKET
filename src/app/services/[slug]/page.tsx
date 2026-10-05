import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, relatedProducts } from "@/lib/repo/catalog";
import { q } from "@/lib/db";
import { convertCents, formatMoney } from "@/lib/money";
import { cookies } from "next/headers";
import { track } from "@/lib/analytics";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FaqAccordion from "@/components/ui/FaqAccordion";
import ServicePurchaseBox from "@/components/product/ServicePurchaseBox";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProductBySlug(params.slug);
  if (!p) return { title: "Service not found" };
  return { title: p.seo_title || p.name, description: p.seo_description || p.short_description };
}

export default function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const p = getProductBySlug(params.slug);
  if (!p || p.status !== "published") notFound();
  track("service_view", { slug: p.slug });

  const currency = cookies().get("fm_currency")?.value || "USD";
  const related = relatedProducts(p, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: p.name,
    description: p.short_description,
    provider: { "@type": "Organization", name: "FEMZYK ENTERPRISES" },
    offers: { "@type": "Offer", price: (p.price_cents / 100).toFixed(2), priceCurrency: "USD" },
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/services", label: "Web Development" }, { label: p.name }]} />

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 mt-6">
        <div className="min-w-0">
          <span className="badge-navy">Web Development Service</span>
          <h1 className="font-display text-3xl sm:text-4xl text-cream-50 mt-3 leading-tight">{p.name}</h1>
          <p className="mt-4 text-mist-300 text-[15px] leading-relaxed max-w-2xl">{p.short_description}</p>

          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <span className="badge-gold px-3 py-1.5">
              {p.service_quote_type === "starting" ? "From " : ""}
              {formatMoney(convertCents(p.price_cents, currency), currency)}
            </span>
            {p.service_delivery_min_days && (
              <span className="badge-gray px-3 py-1.5">
                Est. {p.service_delivery_min_days}–{p.service_delivery_max_days} days
              </span>
            )}
            {p.service_revisions > 0 && <span className="badge-gray px-3 py-1.5">{p.service_revisions} revision rounds included</span>}
          </div>

          {/* What it is / who it's for */}
          <section className="mt-10">
            <h2 className="font-display text-xl text-cream-50 mb-3">What this service is</h2>
            {p.description?.split("\n\n").map((para: string, i: number) => (
              <p key={i} className="text-[15px] text-mist-300 leading-relaxed mb-3">
                {para}
              </p>
            ))}
          </section>

          {/* Included / excluded */}
          <div className="mt-10 grid md:grid-cols-2 gap-4">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-emerald-300 mb-3">✓ What's included</h3>
              <ul className="space-y-2">
                {p.serviceIncluded.map((it: string, i: number) => (
                  <li key={i} className="text-sm text-cream-200 flex gap-2">
                    <span className="text-emerald-400">•</span> {it}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-mist-400 mb-3">What's not included</h3>
              <ul className="space-y-2">
                {p.serviceExcluded.map((it: string, i: number) => (
                  <li key={i} className="text-sm text-mist-400 flex gap-2">
                    <span>•</span> {it}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-mist-500 mt-4">Need any of these? Ask for a custom quote — we scope everything transparently.</p>
            </div>
          </div>

          {/* Process */}
          {p.serviceProcess.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-xl text-cream-50 mb-5">The process</h2>
              <ol className="space-y-3">
                {p.serviceProcess.map(([title, desc]: [string, string], i: number) => (
                  <li key={i} className="card p-5 flex gap-4">
                    <span className="w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 text-sm font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-cream-100">{title}</span>
                      <span className="block text-[13px] text-mist-400 mt-1 leading-relaxed">{desc}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* FAQ */}
          {p.faqs.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-xl text-cream-50 mb-5">Questions about this service</h2>
              <FaqAccordion faqs={p.faqs} />
            </section>
          )}

          <div className="mt-10 card p-5 text-sm text-mist-400">
            Covered by our <Link href="/service-terms" className="text-gold-400 hover:text-gold-300">Service Terms</Link>. Work is only billed once the scope is agreed, and unstarted projects are fully refundable.
          </div>
        </div>

        {/* Purchase rail */}
        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          <ServicePurchaseBox product={{ id: p.id, slug: p.slug, priceCents: p.price_cents, quoteType: p.service_quote_type }} packages={p.packages ?? []} currency={currency} />
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-cream-100 mb-2">Prefer to talk first?</h3>
            <p className="text-[13px] text-mist-400 leading-relaxed">
              Every project can start with a conversation. Tell us what you're thinking and we'll recommend the right scope.
            </p>
            <Link href="/contact" className="btn-outline btn-md w-full mt-3">
              Contact the team
            </Link>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-6">Related services & resources</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.id} href={r.type_code === "SERVICE" ? `/services/${r.slug}` : `/products/${r.slug}`} className="card card-hover p-5">
                <span className="badge-navy">{r.type_code === "SERVICE" ? "Service" : "Product"}</span>
                <h3 className="text-sm font-semibold text-cream-100 mt-3">{r.name}</h3>
                <p className="text-[13px] text-mist-400 mt-1.5 line-clamp-2">{r.short_description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
