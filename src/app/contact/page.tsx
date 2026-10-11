import { Metadata } from "next";
import { siteConfig } from "@/lib/settings";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the FEMZYK MARKET team — orders, shipping, returns, digital downloads or web development inquiries.",
};

export default function ContactPage() {
  const site = siteConfig();
  return (
    <div className="container-page py-12 max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-[320px_1fr] gap-10 items-start">
        <div>
          <p className="eyebrow">We're listening</p>
          <h1 className="font-display text-3xl text-cream-50 mt-2">Contact FEMZYK MARKET</h1>
          <p className="text-sm text-mist-400 mt-3 leading-relaxed">
            Use the form to create a support request and keep the reference shown after submission. For an existing order, include your order number.
          </p>
          <div className="mt-6 space-y-4">
            {site.supportEmail && (
              <div className="card p-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400">Email</h2>
                <a className="text-sm text-gold-300 mt-1.5 inline-block" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
              </div>
            )}
            <div className="card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400">Business</h2>
              <p className="text-sm text-mist-300 mt-1.5">{site.businessName}</p>
              {site.businessAddress && <p className="text-xs text-mist-500 mt-1">{site.businessAddress}</p>}
            </div>
            <div className="card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-mist-400">Before you write</h2>
              <ul className="text-sm text-mist-300 mt-1.5 space-y-1">
                <li><a href="/faq" className="text-gold-400 hover:text-gold-300">FAQ</a> — quick answers</li>
                <li><a href="/track-order" className="text-gold-400 hover:text-gold-300">Track an order</a></li>
                <li><a href="/shipping" className="text-gold-400 hover:text-gold-300">Shipping info</a></li>
                <li><a href="/returns" className="text-gold-400 hover:text-gold-300">Returns</a></li>
              </ul>
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
