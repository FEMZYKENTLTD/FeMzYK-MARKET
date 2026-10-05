import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Businesses",
  description: "Web development, digital resources and considered products for growing businesses — from FEMZYK ENTERPRISES.",
};

export default function BusinessPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-ink-700">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-ink-950 to-ink-900" aria-hidden />
        <div className="container-page relative py-16 text-center max-w-3xl mx-auto">
          <p className="eyebrow">FEMZYK for Business</p>
          <h1 className="font-display text-4xl text-cream-50 mt-3 leading-tight">Build your business presence, properly.</h1>
          <p className="mt-4 text-mist-300 leading-relaxed">
            Whether you need a professional website, ready-made business documents, or tools for your team — FEMZYK brings
            products, digital resources and technology services together under one trusted brand.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/services" className="btn-gold btn-lg">Explore Web Development</Link>
            <Link href="/digital" className="btn-outline btn-lg">Digital Resources</Link>
          </div>
        </div>
      </section>

      <section className="container-page py-14 grid md:grid-cols-3 gap-5">
        {[
          ["🖥️", "Websites & web apps", "Business websites, landing pages, web applications and maintenance — scoped clearly and delivered on a real timeline.", "/services"],
          ["📄", "Business templates", "Proposals, invoices, launch checklists and planners you can edit today.", "/products/femzyk-business-creator-template-bundle"],
          ["📚", "Guides for builders", "Learn web development and programming with practical, project-based guides.", "/digital"],
        ].map(([icon, t, d, href]) => (
          <Link key={t} href={href} className="card card-hover p-6">
            <span className="text-2xl" aria-hidden>{icon}</span>
            <h2 className="font-display text-lg text-cream-50 mt-3">{t}</h2>
            <p className="text-sm text-mist-400 mt-2 leading-relaxed">{d}</p>
            <span className="block mt-4 text-sm text-gold-400">Learn more →</span>
          </Link>
        ))}
      </section>

      <section className="container-page pb-16 max-w-2xl mx-auto text-center">
        <div className="card p-8">
          <h2 className="font-display text-2xl text-cream-50">Have a project in mind?</h2>
          <p className="text-sm text-mist-400 mt-3 leading-relaxed">
            Tell us what you're building and we'll recommend the right scope and package — or prepare a custom quote. No pressure, no jargon.
          </p>
          <Link href="/contact" className="btn-gold btn-lg mt-6">Start a conversation</Link>
        </div>
      </section>
    </div>
  );
}
