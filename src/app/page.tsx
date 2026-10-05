import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { listProducts, listCategories, listCollections, getCollection } from "@/lib/repo/catalog";
import { getSettings } from "@/lib/settings";
import { q } from "@/lib/db";
import ProductCard from "@/components/product/ProductCard";
import { Stars } from "@/components/product/Stars";
import FaqAccordion from "@/components/ui/FaqAccordion";

export default function HomePage() {
  const currency = cookies().get("fm_currency")?.value || "USD";
  const hero = getSettings<{ title: string; subtitle: string }>("home_hero", {
    title: "Smart products. Digital solutions. Better everyday living.",
    subtitle: "Discover thoughtfully selected products, useful digital resources and practical web solutions designed to make work and everyday life better.",
  });

  const categories = listCategories().slice(0, 8);
  const featured = listProducts({ featured: true, perPage: 8 }).items;
  const bestsellers = getCollection("bestsellers")?.items ?? [];
  const newArrivals = getCollection("new-arrivals")?.items ?? [];
  const digital = listProducts({ type: "DIGITAL_PRODUCT", perPage: 4, sort: "bestselling" }).items;
  const services = listProducts({ type: "SERVICE", perPage: 3 }).items;
  const reviews = q<any>(
    `SELECT r.rating, r.title, r.body, r.author_name, r.created_at, p.name AS product_name, p.slug AS product_slug, p.type_code
     FROM reviews r JOIN products p ON p.id = r.product_id
     WHERE r.status = 'approved' ORDER BY r.is_seed ASC, r.created_at DESC LIMIT 6`
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
            <p className="eyebrow mb-4">FEMZYK MARKET · by FEMZYK ENTERPRISES</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.1] text-cream-50">
              Smart products. Digital solutions. <span className="text-gold-400">Better everyday living.</span>
            </h1>
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
          <div className="relative hidden lg:block">
            <div className="relative aspect-[5/4] rounded-2xl overflow-hidden border border-ink-600 shadow-card-hover">
              <Image src="/images/hero.jpg" alt="A calm, warmly lit workspace with FEMZYK products — a candle warmer lamp glowing beside a tidy desk" fill priority className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/50 via-transparent" aria-hidden />
            </div>
            <div className="absolute -bottom-5 -left-5 card px-5 py-4 bg-ink-850/95 backdrop-blur">
              <p className="text-xs text-mist-400">One store, three worlds</p>
              <p className="text-sm font-medium text-cream-50 mt-0.5">Physical · Digital · Web Development</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────────── */}
      <section aria-label="Why shop with us" className="border-y border-ink-700 bg-ink-900">
        <div className="container-page grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-5 py-6">
          {[
            ["🔒", "Secure Checkout", "Payments verified server-side"],
            ["↩️", "Clear Returns", "30 days on physical products"],
            ["📦", "Order Tracking", "Follow your order to delivery"],
            ["⚡", "Digital Delivery", "Instant, secure downloads"],
            ["💬", "Real Support", "Humans who answer"],
          ].map(([icon, title, sub]) => (
            <div key={title} className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>
                {icon}
              </span>
              <span>
                <span className="block text-[13px] font-medium text-cream-100">{title}</span>
                <span className="block text-[11px] text-mist-500">{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── SHOP BY CATEGORY ─────────────────────────────────────────── */}
      <Section title="Shop by Category" eyebrow="Curated departments" href="/shop/all" hrefLabel="View all">
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
      </Section>

      {/* ── FEATURED PRODUCTS ────────────────────────────────────────── */}
      <Section title="Featured Products" eyebrow="Hand-picked" href="/shop/all" hrefLabel="Shop all">
        <ProductGrid currency={currency} items={featured} />
      </Section>

      {/* ── WEB DEVELOPMENT ──────────────────────────────────────────── */}
      <section className="container-page py-14">
        <div className="card overflow-hidden border-navy-700/60 bg-gradient-to-br from-navy-950 to-ink-900">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <p className="eyebrow">FEMZYK Web Development</p>
              <h2 className="section-title mt-3">Websites and web systems, built properly.</h2>
              <p className="text-mist-300 mt-4 leading-relaxed text-[15px]">
                Business websites, landing pages, web applications and ongoing maintenance — scoped clearly, priced
                transparently and delivered on a real timeline. Track every project from your dashboard.
              </p>
              <ul className="mt-6 space-y-2.5">
                {["Custom design, mobile-first", "Clear scope and pricing before work begins", "Structured revisions and handover", "Post-launch support included"].map((li) => (
                  <li key={li} className="flex items-start gap-2.5 text-sm text-cream-200">
                    <svg className="w-4 h-4 mt-0.5 text-gold-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {li}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/services" className="btn-gold btn-md">
                  Start Your Project
                </Link>
                <Link href="/services/business-website-development" className="btn-outline btn-md">
                  View Packages
                </Link>
              </div>
            </div>
            <div className="relative min-h-[280px] lg:min-h-0">
              <Image src="/images/services/webdev.jpg" alt="Website designs and code on a developer's screen" fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>

      {/* ── BESTSELLERS ──────────────────────────────────────────────── */}
      <Section title="Bestsellers" eyebrow="Ranked by real sales" href="/collections/bestsellers" hrefLabel="See all">
        <ProductGrid currency={currency} items={bestsellers} />
      </Section>

      {/* ── DIGITAL COLLECTION ───────────────────────────────────────── */}
      <section className="container-page py-14">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="eyebrow">FEMZYK Digital</p>
            <h2 className="section-title mt-2">Guides, templates & resources</h2>
            <p className="text-sm text-mist-400 mt-2 max-w-xl">
              Practical digital products delivered instantly — learn to build, run your business better, or ship your next project faster.
            </p>
          </div>
          <Link href="/digital" className="btn-outline btn-md shrink-0 hidden sm:inline-flex">
            Explore Digital
          </Link>
        </div>
        <ProductGrid currency={currency} items={digital} />
        <div className="mt-6 sm:hidden">
          <Link href="/digital" className="btn-outline btn-md w-full">
            Explore FEMZYK Digital
          </Link>
        </div>
      </section>

      {/* ── NEW ARRIVALS ─────────────────────────────────────────────── */}
      <Section title="New Arrivals" eyebrow="Recently published" href="/collections/new-arrivals" hrefLabel="See all">
        <ProductGrid currency={currency} items={newArrivals} />
      </Section>

      {/* ── WHY FEMZYK ───────────────────────────────────────────────── */}
      <section className="border-y border-ink-700 bg-ink-900">
        <div className="container-page py-16 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="eyebrow">Why FEMZYK</p>
            <h2 className="section-title mt-3">A store built on honesty, not hype.</h2>
            <p className="text-mist-300 mt-4 leading-relaxed text-[15px]">
              FEMZYK MARKET is part of FEMZYK ENTERPRISES — a growing technology and digital-focused brand. We sell
              products we'd use ourselves, digital resources we'd learn from, and services we'd stake our name on.
            </p>
            <p className="text-mist-300 mt-3 leading-relaxed text-[15px]">
              No fake countdowns, no invented reviews, no inflated &ldquo;original&rdquo; prices. Just clear information,
              realistic delivery estimates and support that answers.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ["Practical over hype", "Every product earns its place by being genuinely useful in everyday life."],
              ["Transparent everything", "Pricing, delivery estimates and return rules are shown before you buy."],
              ["Quality compounds", "Fewer things, done properly — from candle warmers to code."],
              ["One ecosystem", "Physical goods, digital resources and web services under one trusted brand."],
            ].map(([t, d]) => (
              <div key={t} className="card p-5">
                <h3 className="text-sm font-semibold text-gold-300">{t}</h3>
                <p className="text-[13px] text-mist-400 mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES STRIP ───────────────────────────────────────────── */}
      <Section title="Web Development Services" eyebrow="FEMZYK Digital Services" href="/services" hrefLabel="All services">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} className="card card-hover p-6 flex flex-col">
              <span className="badge-navy w-fit">Service</span>
              <h3 className="font-display text-lg text-cream-50 mt-3">{s.name}</h3>
              <p className="text-[13px] text-mist-400 mt-2 leading-relaxed line-clamp-3">{s.short_description}</p>
              <span className="mt-auto pt-4 text-sm text-gold-300 font-medium">
                From ${(s.price_cents / 100).toFixed(0)} →
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── REVIEWS ──────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <Section title="Customer Reviews" eyebrow="Verified feedback">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((r, i) => (
              <figure key={i} className="card p-6">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} size="sm" />
                  {r.is_seed ? <span className="badge-gray">Initial review</span> : <span className="badge-green">Verified purchase</span>}
                </div>
                <blockquote className="mt-3 text-sm text-cream-200 leading-relaxed">&ldquo;{r.body}&rdquo;</blockquote>
                <figcaption className="mt-4 text-xs text-mist-500">
                  <span className="text-cream-200 font-medium">{r.author_name}</span>
                  {" · on "}
                  <Link href={r.type_code === "SERVICE" ? `/services/${r.product_slug}` : `/products/${r.product_slug}`} className="text-gold-400 hover:text-gold-300">
                    {r.product_name}
                  </Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="container-page py-14">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="eyebrow">Common questions</p>
            <h2 className="section-title mt-2">Good to know</h2>
          </div>
          <FaqAccordion faqs={faqs} />
          <div className="text-center mt-6">
            <Link href="/faq" className="text-sm text-gold-400 hover:text-gold-300">
              See all FAQs →
            </Link>
          </div>
        </div>
      </section>
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
