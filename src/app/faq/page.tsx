import { Metadata } from "next";
import { q } from "@/lib/db";
import FaqAccordion from "@/components/ui/FaqAccordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about FEMZYK MARKET — orders, payments, shipping, returns, digital products and web development services.",
};

export default function FaqPage() {
  const faqs = q<any>("SELECT category, question, answer FROM faq_items WHERE is_active = 1 ORDER BY category, position");
  const groups = new Map<string, { question: string; answer: string }[]>();
  for (const f of faqs) {
    if (!groups.has(f.category)) groups.set(f.category, []);
    groups.get(f.category)!.push(f);
  }

  return (
    <div className="container-page py-12 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <p className="eyebrow">Help center</p>
        <h1 className="font-display text-3xl text-cream-50 mt-2">Frequently asked questions</h1>
        <p className="text-sm text-mist-400 mt-2">Can't find your answer? <a href="/contact" className="text-gold-400 hover:text-gold-300">Ask us directly</a>.</p>
      </div>
      <div className="space-y-10">
        {[...groups.entries()].map(([cat, items]) => (
          <section key={cat}>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-3">{cat}</h2>
            <FaqAccordion faqs={items} />
          </section>
        ))}
      </div>
    </div>
  );
}
