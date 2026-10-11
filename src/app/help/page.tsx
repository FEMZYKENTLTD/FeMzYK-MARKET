import { Metadata } from "next";
import Link from "next/link";
import TicketChecker from "@/components/support/TicketChecker";

export const metadata: Metadata = { title: "Help Center" };

const cards = [
  ["📦", "Track an order", "See live status, shipping and delivery estimates.", "/track-order"],
  ["↩️", "Returns & refunds", "30-day returns on physical products — here's how it works.", "/returns"],
  ["🚚", "Shipping", "Where we ship, what it costs and realistic delivery times.", "/shipping"],
  ["⚡", "Digital downloads", "Access, limits, expiry and updates for digital purchases.", "/digital-products-policy"],
  ["🛠️", "Web development projects", "Requirements, revisions and project status explained.", "/service-terms"],
  ["❓", "FAQ", "Quick answers to the most common questions.", "/faq"],
  ["✉️", "Contact us", "Create a trackable support request and follow it in the Help Center.", "/contact"],
  ["💳", "Payments", "How checkout works and what happens if a payment fails.", "/faq"],
];

export default function HelpCenter() {
  return (
    <div className="container-page py-12 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <p className="eyebrow">Support</p>
        <h1 className="font-display text-3xl text-cream-50 mt-2">How can we help?</h1>
        <p className="text-sm text-mist-400 mt-2">Everything you need before, during and after your purchase.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(([icon, title, desc, href]) => (
          <Link key={title} href={href} className="card card-hover p-5">
            <span className="text-2xl" aria-hidden>{icon}</span>
            <h2 className="text-sm font-semibold text-cream-100 mt-3">{title}</h2>
            <p className="text-[13px] text-mist-400 mt-1.5 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10">
        <TicketChecker />
      </div>
      <div className="mt-6 card p-6 text-center">
        <p className="text-sm text-mist-300">
          Still stuck? <Link href="/contact" className="text-gold-400 hover:text-gold-300 font-medium">Send us a message</Link> — include your order number if it's about an order, and we'll get back to you fast.
        </p>
      </div>
    </div>
  );
}
