import { Metadata } from "next";
import { cookies } from "next/headers";
import { listProducts } from "@/lib/repo/catalog";
import { track } from "@/lib/analytics";
import ProductCard from "@/components/product/ProductCard";
import Link from "next/link";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: { searchParams: { q?: string; type?: string } }) {
  const q = (searchParams.q || "").trim();
  const currency = cookies().get("fm_currency")?.value || "USD";
  if (q) track("search", { q });
  const result = q ? listProducts({ q, type: searchParams.type || undefined, perPage: 48, sort: "featured" }) : null;
  const popular = ["candle", "desk", "python", "website", "organization", "gift", "template"];

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl text-cream-50">Search</h1>
      <form method="GET" action="/search" className="mt-5 flex gap-2 max-w-xl" role="search">
        <label htmlFor="search-q" className="sr-only">Search the store</label>
        <input id="search-q" name="q" defaultValue={q} required className="input" placeholder="Search products, guides, services…" />
        {searchParams.type && <input type="hidden" name="type" value={searchParams.type} />}
        <button className="btn-gold btn-md shrink-0">Search</button>
      </form>

      {!result ? (
        <div className="mt-10">
          <p className="text-sm text-mist-400 mb-3">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {popular.map((p) => (
              <Link key={p} href={`/search?q=${encodeURIComponent(p)}`} className="badge-gray px-3 py-1.5 hover:border-gold-500/60 hover:text-cream-100 transition-colors">
                {p}
              </Link>
            ))}
          </div>
        </div>
      ) : result.items.length === 0 ? (
        <div className="mt-10 card p-10 text-center max-w-lg mx-auto">
          <p className="text-3xl mb-3" aria-hidden>🔍</p>
          <h2 className="font-display text-lg text-cream-50">No results for “{q}”</h2>
          <p className="text-sm text-mist-400 mt-2">Try a different word, or explore these starting points:</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/shop/all" className="badge-navy px-3 py-1.5">All products</Link>
            <Link href="/digital" className="badge-navy px-3 py-1.5">Digital store</Link>
            <Link href="/services" className="badge-navy px-3 py-1.5">Web development</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-mist-400" role="status">
            {result.total} result{result.total !== 1 ? "s" : ""} for “{q}”
          </p>
          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {result.items.map((p) => (
              <ProductCard key={p.id} p={p} currency={currency} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
