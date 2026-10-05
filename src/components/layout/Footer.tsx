import Link from "next/link";
import NewsletterForm from "./NewsletterForm";
import { siteConfig } from "@/lib/settings";

export default function Footer() {
  const site = siteConfig();
  return (
    <footer className="border-t border-ink-700 bg-ink-900 mt-20">
      {/* Newsletter */}
      <div className="border-b border-ink-700">
        <div className="container-page py-10 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <h2 className="font-display text-xl text-cream-50">Stay in the loop — without the noise</h2>
            <p className="text-sm text-mist-400 mt-1.5 max-w-md">
              Occasional emails about new products, digital releases and useful FEMZYK content. Easy to unsubscribe — we mean it.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="container-page py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2 max-w-xs">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl text-cream-50">FEMZYK</span>
            <span className="text-[10px] font-semibold tracking-[0.28em] text-gold-400 uppercase">Market</span>
          </div>
          <p className="text-sm text-mist-400 mt-3 leading-relaxed">{site.tagline}</p>
          <p className="text-xs text-mist-500 mt-4">
            The ecommerce and digital-commerce division of {site.businessName}.
          </p>
        </div>

        <FooterCol
          title="Shop"
          links={[
            ["/shop/all", "All Products"],
            ["/shop/home", "Home"],
            ["/shop/pets", "Pets"],
            ["/shop/kitchen", "Kitchen"],
            ["/shop/desk-work", "Desk & Work"],
            ["/digital", "Digital Products"],
            ["/collections", "Collections"],
          ]}
        />
        <FooterCol
          title="Services"
          links={[
            ["/services", "Web Development"],
            ["/services/business-website-development", "Business Websites"],
            ["/services/landing-page-development", "Landing Pages"],
            ["/services/website-maintenance-care", "Maintenance & Care"],
            ["/business", "For Businesses"],
          ]}
        />
        <FooterCol
          title="Support"
          links={[
            ["/help", "Help Center"],
            ["/faq", "FAQ"],
            ["/contact", "Contact"],
            ["/track-order", "Track Order"],
            ["/shipping", "Shipping"],
            ["/returns", "Returns"],
            ["/reviews", "Reviews"],
          ]}
        />
      </div>

      <div className="border-t border-ink-700">
        <div className="container-page py-6 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-mist-500">
          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center">
            <Link href="/privacy" className="hover:text-cream-100 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-cream-100 transition-colors">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-cream-100 transition-colors">Cookie Policy</Link>
            <Link href="/digital-products-policy" className="hover:text-cream-100 transition-colors">Digital Products</Link>
            <Link href="/service-terms" className="hover:text-cream-100 transition-colors">Service Terms</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">
              © {new Date().getFullYear()} {site.businessName}. All rights reserved.
            </span>
            <span className="badge-gray">Secure checkout</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav aria-label={title}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-4">{title}</h3>
      <ul className="space-y-2.5">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-mist-300 hover:text-gold-300 transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
