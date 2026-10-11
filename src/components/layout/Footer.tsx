import Link from "next/link";
import { siteConfig } from "@/lib/settings";
import { listCategories } from "@/lib/repo/catalog";

export default function Footer() {
  const site = siteConfig();
  const shopLinks: [string, string][] = [
    ["/shop/all", "All Products"],
    ...listCategories()
      .filter((category) => !["digital", "web-dev-services"].includes(category.slug))
      .slice(0, 4)
      .map((category) => [`/shop/${category.slug}`, category.name] as [string, string]),
    ["/digital", "Digital Products"],
    ["/collections", "Collections"],
  ];
  return (
    <footer className="border-t border-ink-700 bg-ink-900 mt-20">
      <div className="container-page py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2 max-w-xs">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl text-cream-50">FEMZYK</span>
            <span className="text-[10px] font-semibold tracking-[0.28em] text-gold-400 uppercase">Market</span>
          </div>
          <p className="text-sm text-mist-400 mt-3 leading-relaxed">{site.tagline}</p>
          {site.businessName && site.businessName !== site.storeName && <p className="text-xs text-mist-500 mt-4">{site.businessName}</p>}
        </div>

        <FooterCol
          title="Shop"
          links={shopLinks}
        />
        <FooterCol
          title="Services"
          links={[
            ["/services", "Web Development"],
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
