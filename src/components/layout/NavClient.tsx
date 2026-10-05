"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CurrencyPicker from "./CurrencyPicker";

interface CatRef {
  slug: string;
  name: string;
  image?: string;
  children?: { slug: string; name: string }[];
}

export default function NavClient({
  shopCategories,
  digitalSubs,
  webdevSubs,
  currency,
  currencies,
}: {
  shopCategories: CatRef[];
  digitalSubs: { slug: string; name: string }[];
  webdevSubs: { slug: string; name: string }[];
  currency: string;
  currencies: { code: string; symbol: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setSection(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        className="btn-ghost btn-sm rounded-lg px-2.5 -mr-1"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-ink-900 border-l border-ink-700 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-ink-700 sticky top-0 bg-ink-900">
              <span className="font-display text-lg text-cream-50">Menu</span>
              <button onClick={() => setOpen(false)} className="btn-ghost btn-sm px-2" aria-label="Close menu">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="p-2" aria-label="Mobile">
              <MobileSection label="Shop" open={section === "shop"} onToggle={() => setSection(section === "shop" ? null : "shop")}>
                {shopCategories.map((c) => (
                  <div key={c.slug} className="py-1.5">
                    <Link href={`/shop/${c.slug}`} className="font-medium text-cream-100 text-sm">
                      {c.name}
                    </Link>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      {c.children?.slice(0, 5).map((k) => (
                        <Link key={k.slug} href={`/shop/${k.slug}`} className="text-[13px] text-mist-400 hover:text-cream-100">
                          {k.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link href="/shop/all" className="block mt-2 text-sm font-medium text-gold-400">
                  View all products →
                </Link>
              </MobileSection>
              <MobileSection label="Digital" open={section === "digital"} onToggle={() => setSection(section === "digital" ? null : "digital")}>
                {digitalSubs.map((k) => (
                  <Link key={k.slug} href={`/shop/${k.slug}`} className="block py-1 text-sm text-mist-300 hover:text-cream-100">
                    {k.name}
                  </Link>
                ))}
                <Link href="/digital" className="block mt-2 text-sm font-medium text-gold-400">
                  Explore FEMZYK Digital →
                </Link>
              </MobileSection>
              <MobileSection label="Web Development" open={section === "webdev"} onToggle={() => setSection(section === "webdev" ? null : "webdev")}>
                {webdevSubs.map((k) => (
                  <Link key={k.slug} href={`/shop/${k.slug}`} className="block py-1 text-sm text-mist-300 hover:text-cream-100">
                    {k.name}
                  </Link>
                ))}
                <Link href="/services" className="block mt-2 text-sm font-medium text-gold-400">
                  Explore Web Development →
                </Link>
              </MobileSection>
              <Link href="/collections" className="block px-3 py-3 text-sm text-cream-100 hover:bg-ink-800 rounded-lg">
                Collections
              </Link>
              <Link href="/about" className="block px-3 py-3 text-sm text-cream-100 hover:bg-ink-800 rounded-lg">
                About
              </Link>
              <div className="border-t border-ink-700 mt-2 pt-3 px-3 space-y-2">
                <Link href="/track-order" className="block text-sm text-mist-300 hover:text-cream-100">
                  Track my order
                </Link>
                <Link href="/help" className="block text-sm text-mist-300 hover:text-cream-100">
                  Help Center
                </Link>
                <Link href="/contact" className="block text-sm text-mist-300 hover:text-cream-100">
                  Contact
                </Link>
              </div>
              <div className="px-3 pt-4">
                <CurrencyPicker current={currency} currencies={currencies} />
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileSection({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-ink-800">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-3 text-sm font-medium text-cream-100" aria-expanded={open}>
        {label}
        <svg className={`w-4 h-4 text-mist-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="px-3 pb-4">{children}</div>}
    </div>
  );
}
