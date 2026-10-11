import Link from "next/link";
import Image from "next/image";
import { listProducts, listCategories, listCollections, getCollection } from "@/lib/repo/catalog";
import { getSettings } from "@/lib/settings";
import { q } from "@/lib/db";
import ProductCard from "@/components/product/ProductCard";
import { Stars } from "@/components/product/Stars";
import FaqAccordion from "@/components/ui/FaqAccordion";
import { getDisplayCurrency } from "@/lib/moneyServer";

export default async function HomePage() {
  const currency = await getDisplayCurrency();
  const hero = getSettings<{ title: string; subtitle: string }>("home_hero", process.env.NODE_ENV === "production"
    ? { title: "FEMZYK MARKET", subtitle: "Store and business information is being prepared. Please check back soon." }
    : {
        title: "Smart products. Digital solutions. Better everyday living.",
        subtitle: "Discover thoughtfully selected products, useful digital resources and practical web solutions designed to make work and everyday life better.",
      });

  const categories = listCategories().slice(0, 8);
  const featured = listProducts({ featured: true, perPage: 8 }).items;
  const bestsellers = getCollection("bestsellers")?.items ?? [];
  const newArrivals = getCollection("new-arrivals")?.items ?? [];
  const digital = [
    ...listProducts({ type: "DIGITAL_PRODUCT", perPage: 4, sort: "bestselling" }).items,
    ...listProducts({ type: "DOWNLOADABLE_RESOURCE", perPage: 4, sort: "bestselling" }).items,
  ].slice(0, 4);
  const services = listProducts({ type: "SERVICE", perPage: 3 }).items;
  const reviews = q<any>(
    `SELECT r.rating, r.title, r.body, r.author_name, r.created_at, p.name AS product_name, p.slug AS product_slug, p.type_code
     FROM reviews r JOIN products p ON p.id = r.product_id
     WHERE r.status = 'approved' AND r.is_verified = 1 AND r.is_seed = 0 ORDER BY r.created_at DESC LIMIT 6`
  );
  const faqs = q<any>("SELECT question, answer FROM faq_items WHERE is_active = 1 ORDER BY position LIMIT 6");

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-ink-950 to-ink-900" aria-hidden />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(ellipse 60% 50% at 75% 30%, rgba(37,69,133,.55), transparent), radial-gradient(ellipse 40% 35% at 20% 80%, rgba(201,162,75,.16), transparent)",
          }}
          aria-hidden
        />
        <div className="container-page relative grid lg:grid-cols-2 gap-10 items-center py-16 sm:py-24">
          <div className="animate-fadeUp">
            <p className="eyebrow mb-4">FEMZYK MARKET</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.1] text-cream-50">{hero.title}</h1>
            <p className="mt-5 text-mist-300 text-base sm:text-lg leading-relaxed max-w-xl">{hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop/all" className="btn-gold btn-lg">
                Shop Now
              </Link>
              <Link href="/digital" className="btn-outline btn-lg">
                Explore Digital
              </Link>
              <Link href="/services" className="btn-ghost btn-lg">
                Web Development →
              </Link>
            </div>
          </div>
          {process.env.NODE_ENV !== "production" && (
            <div className="relative hidden lg:block">
              <div className="relative aspect-[5/4] rounded-2xl overflow-hidden border border-ink-600 shadow-card-hover">
                <Image src="/images/hero.jpg" alt="Illustrative workspace artwork; not a photograph of a product for sale" fill priority className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/50 via-transparent" aria-hidden />
              </div>
              <div className="absolute -bottom-5 -left-5 card px-5 py-4 bg-ink-850/95 backdrop-blur">
                <p className="text-xs text-mist-400">Store preview</p>
                <p className="text-sm font-medium text-cream-50 mt-0.5">Physical · Digital · Web Development</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── OFFERING TYPES ───────────────────────────────────────────── */}
      <section aria-label="Store sections" className="border-y border-ink-700 bg-ink-900">
        <div className="container-page grid sm:grid-cols-3 gap-4 py-5">
          {[
            ["Physical products", "See the items currently published in the catalog.", "/shop/all"],
            ["Digital resources", "Available only when a delivery file is published.", "/digital"],
            ["Web development", "Review currently published service listings and scope.", "/services"],
          ].map(([title, description, href]) => (
            <Link key={title} href={href} className="card p-4 hover:border-ink-500 transition-colors">
              <span className="block text-sm font-medium text-cream-100">{title}</span>
              <span className="block text-xs text-mist-500 mt-1">{description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── SHOP BY CATEGORY ─────────────────────────────────────────── */}
      {categories.length > 0 && <Section title="Shop by Category" eyebrow="Browse categories" href="/shop/all" hrefLabel="View all">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={c.slug === "digital" ? "/digital" : c.slug === "web-dev-services" ? "/services" : `/shop/${c.slug}`}
              className="card card-hover group relative overflow-hidden aspect-[4/3]"
            >
              {c.image && (
                <Image src={c.image} alt="" fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/25 to-transparent" aria-hidden />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-display text-lg text-cream-50">{c.name}</h3>
                <p className="text-[11px] text-mist-400 line-clamp-1 mt-0.5">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>}

      {/* ── FEATURED PRODUCTS ────────────────────────────────────────── */}
      {featured.length > 0 && (
        <Section title="Featured Products" eyebrow="Featured listings" href="/shop/all" hrefLabel="Shop all">
          <ProductGrid currency={currency} items={featured} />
        </Section>
      )}

      {/* ── WEB DEVELOPMENT ──────────────────────────────────────────── */}
      {services.length > 0 && (
        <section className="container-page py-14">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="eyebrow">Published service listings</p>
              <h2 className="section-title mt-2">Services</h2>
              <p className="text-sm text-mist-400 mt-2 max-w-2xl">Review each listing's scope, pricing, exclusions and timing before placing an order.</p>
            </div>
            <Link href="/services" className="btn-outline btn-md">View services</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="card card-hover p-6 flex flex-col">
                <h3 className="font-display text-lg text-cream-50">{service.name}</h3>
                <p className="text-[13px] text-mist-400 mt-2 leading-relaxed line-clamp-3">{service.short_description}</p>
                <span className="mt-4 text-sm text-gold-300 font-medium">View scope and price →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── BESTSELLERS ──────────────────────────────────────────────── */}
      {bestsellers.length > 0 && (
        <Section title="Bestsellers" eyebrow="Ranked by verified sales" href="/collections/bestsellers" hrefLabel="See all">
          <ProductGrid currency={currency} items={bestsellers} />
        </Section>
      )}

      {/* ── DIGITAL COLLECTION ───────────────────────────────────────── */}
      {digital.length > 0 && (
        <section className="container-page py-14">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="eyebrow">FEMZYK Digital</p>
              <h2 className="section-title mt-2">Guides, templates & resources</h2>
              <p className="text-sm text-mist-400 mt-2 max-w-xl">
                Published digital listings. Access to a file follows payment verification and is shown on the product page.
              </p>
            </div>
            <Link href="/digital" className="btn-outline btn-md shrink-0 hidden sm:inline-flex">Explore Digital</Link>
          </div>
          <ProductGrid currency={currency} items={digital} />
          <div className="mt-6 sm:hidden"><Link href="/digital" className="btn-outline btn-md w-full">Explore FEMZYK Digital</Link></div>
        </section>
      )}

      {/* ── NEW ARRIVALS ─────────────────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <Section title="New Arrivals" eyebrow="Recently published" href="/collections/new-arrivals" hrefLabel="See all">
          <ProductGrid currency={currency} items={newArrivals} />
        </Section>
      )}

      {/* ── REVIEWS ──────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <Section title="Customer Reviews" eyebrow="Verified feedback">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((r, i) => (
              <figure key={i} className="card p-6">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} size="sm" />
                  <span className="badge-green">Verified purchase</span>
                </div>
                <blockquote className="mt-3 text-sm text-cream-200 leading-relaxed">&ldquo;{r.body}&rdquo;</blockquote>
                <figcaption className="mt-4 text-xs text-mist-500">
                  <span className="text-cream-200 font-medium">{r.author_name}</span>
                  {" · on "}
                  <Link href={r.type_code === "SERVICE" || r.type_code === "SERVICE_PACKAGE" ? `/services/${r.product_slug}` : `/products/${r.product_slug}`} className="text-gold-400 hover:text-gold-300">
                    {r.product_name}
                  </Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="container-page py-14">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <p className="eyebrow">Common questions</p>
              <h2 className="section-title mt-2">Good to know</h2>
            </div>
            <FaqAccordion faqs={faqs} />
            <div className="text-center mt-6">
              <Link href="/faq" className="text-sm text-gold-400 hover:text-gold-300">See all FAQs →</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Section({
  title,
  eyebrow,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container-page py-14">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="section-title mt-2">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="btn-outline btn-md shrink-0 hidden sm:inline-flex">
            {hrefLabel ?? "See all"}
          </Link>
        )}
      </div>
      {children}
      {href && (
        <div className="mt-6 sm:hidden">
          <Link href={href} className="btn-outline btn-md w-full">
            {hrefLabel ?? "See all"}
          </Link>
        </div>
      )}
    </section>
  );
}

function ProductGrid({ items, currency }: { items: any[]; currency: string }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} currency={currency} />
      ))}
    </div>
  );
}
