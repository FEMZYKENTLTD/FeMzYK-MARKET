import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listProducts } from "@/lib/repo/catalog";
import { q } from "@/lib/db";
import FaqAccordion from "@/components/ui/FaqAccordion";

export const metadata: Metadata = {
  title: "FEMZYK Web Development — Websites, Landing Pages & Web Applications",
  description:
    "Professional web design and development by FEMZYK: business websites, landing pages, web applications and maintenance. Clear scope, transparent pricing, real timelines.",
};

export default function ServicesPage() {
  const services = listProducts({ type: "SERVICE", perPage: 24 }).items;
  const faqs = q<any>("SELECT question, answer FROM faq_items WHERE is_active = 1 AND category = 'Web Development Services' ORDER BY position");

  const capabilities = [
    ["Website Development", "Complete marketing and business websites, designed and built end-to-end.", "/services/business-website-development"],
    ["Business Websites", "Multi-page sites with structure, SEO and content strategy baked in.", "/services/business-website-development"],
    ["Landing Pages", "Single focused pages for launches, campaigns and lead generation.", "/services/landing-page-development"],
    ["Web Applications", "Custom tools, dashboards and internal systems scoped to your workflow.", "/contact"],
    ["Backend Systems", "APIs, databases, authentication and the infrastructure underneath.", "/contact"],
    ["API Integration", "Connect payments, CRMs, shipping, email — the systems you already use.", "/contact"],
    ["Maintenance", "Updates, backups, speed and security checks on a clear monthly plan.", "/services/website-maintenance-care"],
    ["Custom Development", "Anything else web — scoped, quoted and built to specification.", "/contact"],
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-700">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-ink-950 to-ink-900" aria-hidden />
        <div className="container-page relative py-16 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="eyebrow">FEMZYK Web Development</p>
            <h1 className="font-display text-4xl sm:text-5xl text-cream-50 mt-3 leading-tight">
              Professional web solutions, <span className="text-gold-400">built properly.</span>
            </h1>
            <p className="mt-5 text-mist-300 leading-relaxed max-w-xl">
              A professional technology service from the FEMZYK team — not a template mill. Clear scope before work
              begins, transparent pricing, structured revisions and a project dashboard so you always know where things stand.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#packages" className="btn-gold btn-lg">
                Start Your Project
              </a>
              <Link href="/contact" className="btn-outline btn-lg">
                Request a Custom Quote
              </Link>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-ink-600 shadow-card-hover">
              <Image src="/images/services/webdev.jpg" alt="Website designs and code on a developer's screen" fill priority className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="container-page py-14">
        <p className="eyebrow">What we do</p>
        <h2 className="section-title mt-2 mb-8">Capabilities</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map(([title, desc, href]) => (
            <Link key={title} href={href} className="card card-hover p-5">
              <h3 className="text-sm font-semibold text-cream-100">{title}</h3>
              <p className="text-[13px] text-mist-400 mt-2 leading-relaxed">{desc}</p>
              <span className="block mt-3 text-xs text-gold-400">Learn more →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="border-y border-ink-700 bg-ink-900">
        <div className="container-page py-14">
          <p className="eyebrow">Services & packages</p>
          <h2 className="section-title mt-2 mb-8">Choose where to start</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => (
              <Link key={s.id} href={`/services/${s.slug}`} className="card card-hover p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge-navy">Service</span>
                  {s.is_featured ? <span className="badge-gold">Featured</span> : null}
                </div>
                <h3 className="font-display text-xl text-cream-50">{s.name}</h3>
                <p className="text-[13px] text-mist-400 mt-2 leading-relaxed">{s.short_description}</p>
                <ul className="mt-4 space-y-2 flex-1">
                  {(s as any).service_included_json
                    ? JSON.parse((s as any).service_included_json || "[]").slice(0, 4).map((it: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] text-cream-200">
                          <svg className="w-4 h-4 mt-0.5 text-gold-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {it}
                        </li>
                      ))
                    : null}
                </ul>
                <div className="mt-5 pt-4 border-t border-ink-700 flex items-center justify-between">
                  <span className="text-sm text-mist-400">
                    {s.service_quote_type === "starting" ? "From " : ""}
                    <span className="text-lg font-semibold text-gold-300">${(s.price_cents / 100).toFixed(0)}</span>
                  </span>
                  <span className="text-xs text-mist-500">
                    {(s as any).service_delivery_min_days}–{(s as any).service_delivery_max_days} days
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="container-page py-14">
        <p className="eyebrow">How it works</p>
        <h2 className="section-title mt-2 mb-8">A clear process, start to launch</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ["1 · Brief", "Choose a package and share your requirements in your project dashboard."],
            ["2 · Design", "We prepare a design direction for your approval before building."],
            ["3 · Build", "We develop with your content, keeping you updated at every milestone."],
            ["4 · Review", "Structured revision rounds until it's right."],
            ["5 · Launch", "We deploy, test everything and hand over documentation."],
          ].map(([t, d]) => (
            <li key={t} className="card p-5">
              <h3 className="text-sm font-semibold text-gold-300">{t}</h3>
              <p className="text-[13px] text-mist-400 mt-2 leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="container-page pb-16 max-w-3xl mx-auto">
          <h2 className="section-title mb-6 text-center">Service questions</h2>
          <FaqAccordion faqs={faqs} />
        </section>
      )}
    </div>
  );
}
