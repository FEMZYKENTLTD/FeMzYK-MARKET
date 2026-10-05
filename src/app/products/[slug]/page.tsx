import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getProductBySlug, relatedProducts, boughtTogether, incrementViews } from "@/lib/repo/catalog";
import { q, run } from "@/lib/db";
import { convertCents, formatMoney } from "@/lib/money";
import { getSessionUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { Stars } from "@/components/product/Stars";
import PurchaseBox from "@/components/product/PurchaseBox";
import ProductCard from "@/components/product/ProductCard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import FaqAccordion from "@/components/ui/FaqAccordion";
import ReviewBlock from "@/components/product/ReviewBlock";
import Gallery from "@/components/product/Gallery";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProductBySlug(params.slug);
  if (!p) return { title: "Product not found" };
  return {
    title: p.seo_title || p.name,
    description: p.seo_description || p.short_description,
    openGraph: p.images?.[0] ? { images: [p.images[0].url] } : undefined,
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const p = getProductBySlug(params.slug);
  if (!p || p.status !== "published") notFound();

  incrementViews(p.id);
  track("product_view", { slug: p.slug, type: p.type_code });

  const currency = cookies().get("fm_currency")?.value || "USD";
  const user = getSessionUser();
  const isService = p.type_code === "SERVICE" || p.type_code === "SERVICE_PACKAGE";
  if (isService) {
    // Services have a dedicated layout.
    return <ServiceRedirect slug={p.slug} />;
  }
  const isDigital = p.type_code === "DIGITAL_PRODUCT" || p.type_code === "DOWNLOADABLE_RESOURCE";

  const price = convertCents(p.price_cents, currency);
  const compare = p.compare_at_cents ? convertCents(p.compare_at_cents, currency) : null;
  const outOfStock = p.track_inventory && p.stock_qty <= 0 && !p.allow_backorder;
  const lowStock = p.track_inventory && p.stock_qty > 0 && p.stock_qty <= p.low_stock_threshold;

  const related = relatedProducts(p, 4);
  const fbt = boughtTogether(p.id, 3).filter((x) => x.id !== p.id);
  const reviews = q<any>(
    "SELECT rating, title, body, author_name, is_verified, is_seed, created_at FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 8",
    p.id
  );
  const ratingAvg = p.rating_avg ? Number(p.rating_avg) : 0;
  const ratingCount = p.rating_count ?? 0;
  const wishlisted = user ? !!q("SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?", user.id, p.id).length : false;
  const canReview = !!user;
  const hasPurchased = user
    ? !!q(
        `SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.user_id = ? AND oi.product_id = ? AND o.status NOT IN ('PENDING_PAYMENT','PAYMENT_FAILED','CANCELLED') LIMIT 1`,
        user.id,
        p.id
      ).length
    : false;

  const variants = p.variants as any[];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.short_description,
    sku: p.sku,
    brand: { "@type": "Brand", name: p.brand || "FEMZYK" },
    image: p.images?.map((i: any) => i.url) ?? [],
    offers: {
      "@type": "Offer",
      price: (p.price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
    ...(ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: ratingAvg.toFixed(1), reviewCount: ratingCount } }
      : {}),
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/shop/all", label: "Shop" },
          ...((p.categories?.[0] && [{ href: `/shop/${p.categories[0].slug}`, label: p.categories[0].name }]) || []),
          { label: p.name },
        ]}
      />

      <div className="grid lg:grid-cols-2 gap-10 mt-6">
        {/* Gallery */}
        <Gallery images={p.images.map((i: any) => ({ url: i.url, alt: i.alt || p.name }))} videos={p.videos} name={p.name} />

        {/* Purchase panel */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {isDigital && <span className="badge-gold">Digital product · Instant delivery</span>}
            {!!p.is_bestseller && <span className="badge-gold">Bestseller</span>}
            {!!p.is_new && <span className="badge-gray">New arrival</span>}
          </div>
          <h1 className="font-display text-3xl text-cream-50 leading-tight">{p.name}</h1>

          {ratingCount > 0 ? (
            <a href="#reviews" className="inline-flex items-center gap-2 mt-3">
              <Stars rating={ratingAvg} />
              <span className="text-sm text-mist-400">
                {ratingAvg.toFixed(1)} · {ratingCount} review{ratingCount !== 1 ? "s" : ""}
              </span>
            </a>
          ) : (
            <p className="text-sm text-mist-500 mt-3">No reviews yet — be the first after your purchase.</p>
          )}

          <div className="mt-5 flex items-end gap-3">
            <span className="text-3xl font-semibold text-cream-50">{formatMoney(price, currency)}</span>
            {compare && compare > price && (
              <>
                <span className="text-lg text-mist-500 line-through">{formatMoney(compare, currency)}</span>
                <span className="badge-gold mb-1.5">Save {formatMoney(compare - price, currency)}</span>
              </>
            )}
            <span className="text-xs text-mist-500 mb-1.5">{currency}</span>
          </div>

          {p.short_description && <p className="mt-4 text-[15px] text-mist-300 leading-relaxed">{p.short_description}</p>}

          {/* Availability */}
          <div className="mt-5">
            {outOfStock ? (
              <span className="badge-red">Out of stock</span>
            ) : lowStock ? (
              <span className="badge-gold">Low stock — {p.stock_qty} left</span>
            ) : p.track_inventory ? (
              <span className="badge-green">In stock — ships in 1–2 business days</span>
            ) : (
              <span className="badge-green">{isDigital ? "Available for instant download" : "Available"}</span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            {!outOfStock && (
              <PurchaseBox productId={p.id} priceCents={p.price_cents} currency={currency} variants={variants} wishlisted={wishlisted} />
            )}
            {outOfStock && (
              <p className="text-sm text-mist-400">
                This product is currently unavailable. Explore similar products below, or <Link href="/contact" className="text-gold-400 hover:text-gold-300">contact us</Link> to ask about restocking.
              </p>
            )}
          </div>

          {/* Trust cards */}
          <div className="mt-8 grid grid-cols-2 gap-2.5">
            <TrustCard icon="🔒" title="Secure checkout" sub="Payments verified server-side" />
            <TrustCard icon="🚚" title={isDigital ? "Instant delivery" : "Delivery information"} sub={isDigital ? "Secure download after payment" : "Estimates shown at checkout"} href={isDigital ? "/digital-products-policy" : "/shipping"} />
            <TrustCard icon="↩️" title={p.return_eligible ? "30-day returns" : "Digital product"} sub={p.return_eligible ? "Original condition" : "See digital policy"} href={p.return_eligible ? "/returns" : "/digital-products-policy"} />
            <TrustCard icon="💬" title="Support" sub="We answer within 1 business day" href="/help" />
          </div>

          {/* What you get / included */}
          {p.included.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-3">{isDigital ? "What you receive" : "What's included"}</h2>
              <ul className="space-y-2">
                {p.included.map((it: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-cream-200">
                    <CheckIcon /> {it}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Digital meta */}
          {isDigital && (p.digital_file_type || p.digital_file_size || p.digital_version) && (
            <div className="mt-6 card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                ["Format", p.digital_file_type],
                ["Size", p.digital_file_size],
                ["Version", p.digital_version],
                ["Downloads", `${p.digital_download_limit ?? 10}×`],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] uppercase tracking-widest text-mist-500">{k}</p>
                    <p className="text-sm text-cream-100 mt-1">{v}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Frequently bought together */}
      {fbt.length > 0 && !isDigital && (
        <section className="mt-14 card p-6">
          <h2 className="font-display text-xl text-cream-50 mb-5">Frequently bought together</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {fbt.map((f: any) => (
              <ProductCard key={f.id} p={f} currency={currency} />
            ))}
          </div>
        </section>
      )}

      {/* Full description & details */}
      <div className="mt-14 grid lg:grid-cols-[1fr_340px] gap-10">
        <div className="space-y-10 min-w-0">
          <section>
            <h2 className="font-display text-xl text-cream-50 mb-4">About this product</h2>
            {p.description?.split("\n\n").map((para: string, i: number) => (
              <p key={i} className="text-[15px] text-mist-300 leading-relaxed mb-3">
                {para}
              </p>
            ))}
          </section>

          {p.features.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-cream-50 mb-4">Key benefits</h2>
              <ul className="grid sm:grid-cols-2 gap-2.5">
                {p.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-cream-200 card px-4 py-3">
                    <CheckIcon /> {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.specs.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-cream-50 mb-4">Specifications</h2>
              <table className="w-full text-sm">
                <tbody>
                  {p.specs.map(([k, v]: [string, string], i: number) => (
                    <tr key={i} className="border-b border-ink-800">
                      <th scope="row" className="text-left py-2.5 pr-6 text-mist-500 font-normal w-1/3">
                        {k}
                      </th>
                      <td className="py-2.5 text-cream-200">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {p.care.length > 0 && (
            <section>
              <h2 className="font-display text-xl text-cream-50 mb-4">Care & usage</h2>
              <ul className="space-y-2">
                {p.care.map((c: string, i: number) => (
                  <li key={i} className="text-sm text-mist-300 flex gap-2.5">
                    <CheckIcon /> {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ReviewBlock productId={p.id} reviews={reviews} ratingAvg={ratingAvg} ratingCount={ratingCount} canReview={canReview} hasPurchased={hasPurchased} />
        </div>

        {/* Right rail: shipping/returns/warranty/faq */}
        <div className="space-y-4 lg:sticky lg:top-24 self-start">
          <InfoPanel title={isDigital ? "Delivery" : "Shipping & delivery"}>
            {isDigital ? (
              <p>Delivered instantly after payment. You'll receive a secure download link by email and in your account. <Link className="text-gold-400 hover:text-gold-300" href="/digital-products-policy">Digital product policy →</Link></p>
            ) : (
              <>
                <p>Ships in 1–2 business days. Estimated delivery:</p>
                <ul className="mt-2 space-y-1">
                  <li>United States: 3–7 business days</li>
                  <li>Canada: 7–14 business days</li>
                  <li>United Kingdom: 6–12 business days</li>
                  <li>International: 10–21 business days</li>
                </ul>
                <Link className="text-gold-400 hover:text-gold-300 inline-block mt-2" href="/shipping">Full shipping policy →</Link>
              </>
            )}
          </InfoPanel>
          <InfoPanel title="Returns">
            {p.return_eligible ? (
              <>
                <p>30-day returns in original condition. Damaged or incorrect items are replaced or refunded in full.</p>
                {p.return_notes && <p className="mt-2">{p.return_notes}</p>}
                <Link className="text-gold-400 hover:text-gold-300 inline-block mt-2" href="/returns">Return policy →</Link>
              </>
            ) : (
              <>
                <p>{p.return_notes || "This product type follows our digital product policy."}</p>
                <Link className="text-gold-400 hover:text-gold-300 inline-block mt-2" href="/digital-products-policy">Learn more →</Link>
              </>
            )}
          </InfoPanel>
          {p.warranty_text && (
            <InfoPanel title="Warranty">
              <p>{p.warranty_text}</p>
            </InfoPanel>
          )}
          {p.faqs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-3">Product FAQs</h3>
              <FaqAccordion faqs={p.faqs} />
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-6">You may also like</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} currency={currency} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ServiceRedirect({ slug }: { slug: string }) {
  return (
    <div className="container-page py-16 text-center">
      <p className="text-sm text-mist-400">This is a service — taking you to its dedicated page…</p>
      <meta httpEquiv="refresh" content={`0;url=/services/${slug}`} />
      <Link href={`/services/${slug}`} className="btn-gold btn-md mt-4">
        Continue
      </Link>
    </div>
  );
}

function TrustCard({ icon, title, sub, href }: { icon: string; title: string; sub: string; href?: string }) {
  const inner = (
    <>
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span>
        <span className="block text-[13px] font-medium text-cream-100">{title}</span>
        <span className="block text-[11px] text-mist-500">{sub}</span>
      </span>
    </>
  );
  const cls = "card flex items-center gap-3 px-4 py-3 card-hover";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-cream-100 mb-2">{title}</h3>
      <div className="text-[13px] text-mist-400 leading-relaxed">{children}</div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 mt-0.5 text-gold-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}


