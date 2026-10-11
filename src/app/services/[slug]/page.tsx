import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, relatedProducts } from "@/lib/repo/catalog";
import { q } from "@/lib/db";
import { convertCents, formatMoney } from "@/lib/money";
import { track } from "@/lib/analytics";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FaqAccordion from "@/components/ui/FaqAccordion";
import ServicePurchaseBox from "@/components/product/ServicePurchaseBox";
import { getDisplayCurrency } from "@/lib/moneyServer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProductBySlug((await params).slug);
  if (!p) return { title: "Service not found" };
  return { title: p.seo_title || p.name, description: p.seo_description || p.short_description };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProductBySlug((await params).slug);
  if (!p || p.status !== "published" || !["SERVICE", "SERVICE_PACKAGE"].includes(p.type_code)) notFound();
  track("service_view", { slug: p.slug });

  const currency = await getDisplayCurrency();
  const related = relatedProducts(p, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: p.name,
    description: p.short_description,
    provider: { "@type": "Organization", name: "FEMZYK MARKET" },
    offers: { "@type": "Offer", price: (p.price_cents / 100).toFixed(2), priceCurrency: "USD" },
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/services", label: "Web Development" }, { label: p.name }]} />

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 mt-6">
        <div className="min-w-0">
          <span className="badge-navy">Service listing</span>
          <h1 className="font-display text-3xl sm:text-4xl text-cream-50 mt-3 leading-tight">{p.name}</h1>
          <p className="mt-4 text-mist-300 text-[15px] leading-relaxed max-w-2xl">{p.short_description}</p>

          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {p.service_quote_type === "fixed" || (p.service_quote_type === "starting" && p.packages.length > 0) ? (
              <span className="badge-gold px-3 py-1.5">
                {p.service_quote_type === "starting" ? "From " : ""}
                {formatMoney(convertCents(p.price_cents, currency), currency)}
              </span>
            ) : (
              <span className="badge-gray px-3 py-1.5">See published package options for pricing</span>
            )}
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
              <p className="text-xs text-mist-500 mt-4">Review the listing details and terms before ordering. Contact support if you need clarification.</p>
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
            Review the service scope and terms before ordering. For questions, <Link href="/help" className="text-gold-400 hover:text-gold-300">submit a support request</Link>.
          </div>
        </div>

        {/* Purchase rail */}
        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          <ServicePurchaseBox product={{ id: p.id, slug: p.slug, priceCents: p.price_cents, quoteType: p.service_quote_type }} packages={p.packages ?? []} currency={currency} />
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-cream-100 mb-2">Questions about this listing?</h3>
            <p className="text-[13px] text-mist-400 leading-relaxed">
              Submit a support request before ordering if you need clarification about the published scope or terms.
            </p>
            <Link href="/help" className="btn-outline btn-md w-full mt-3">
              Visit the Help Center
            </Link>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-6">Related services & resources</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link key={r.id} href={r.type_code === "SERVICE" || r.type_code === "SERVICE_PACKAGE" ? `/services/${r.slug}` : `/products/${r.slug}`} className="card card-hover p-5">
                <span className="badge-navy">{r.type_code === "SERVICE" || r.type_code === "SERVICE_PACKAGE" ? "Service" : "Product"}</span>
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
