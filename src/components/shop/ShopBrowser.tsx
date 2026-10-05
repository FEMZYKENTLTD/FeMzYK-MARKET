import { cookies } from "next/headers";
import Link from "next/link";
import { listProducts, listCategories, getCategory } from "@/lib/repo/catalog";
import ProductCard from "@/components/product/ProductCard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Pagination from "./Pagination";
import SortSelect from "./SortSelect";

export default function ShopBrowser({
  searchParams,
  category,
  title,
  eyebrow,
  description,
}: {
  searchParams: Record<string, string | undefined>;
  category?: string;
  title: string;
  eyebrow?: string;
  description?: string;
}) {
  const currency = cookies().get("fm_currency")?.value || "USD";
  const sort = (searchParams.sort as any) || "featured";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const type = searchParams.type;
  const q = searchParams.q;
  const max = searchParams.max ? parseInt(searchParams.max, 10) : undefined;
  const min = searchParams.min ? parseInt(searchParams.min, 10) : undefined;
  const inStock = searchParams.stock === "1";

  const result = listProducts({ category, type: type || undefined, q, min, max, inStock, sort, page, perPage: 24 });

  const cat = category ? getCategory(category) : null;
  const subcats = category ? listCategories(category) : [];
  const roots = listCategories();
  const crumbs: { href?: string; label: string }[] = [{ href: "/", label: "Home" }, { href: "/shop/all", label: "Shop" }];
  if (cat?.parent_name) crumbs.push({ href: `/shop/${cat.parent_slug}`, label: cat.parent_name });
  crumbs.push({ label: title });

  // Preserve non-filter params when building links
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = { type, min: min !== undefined ? String(min) : undefined, max: max !== undefined ? String(max) : undefined, stock: inStock ? "1" : undefined, sort: sort !== "featured" ? sort : undefined, q, ...over };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={crumbs} />

      <header className="mt-5 mb-8">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="section-title mt-1.5">{title}</h1>
        {description && <p className="text-sm text-mist-400 mt-2 max-w-2xl">{description}</p>}
      </header>

      {/* Subcategory chips */}
      {subcats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {subcats.map((s) => (
            <Link key={s.slug} href={`/shop/${s.slug}${qs({ page: undefined })}`} className="badge-gray hover:border-gold-500/60 hover:text-cream-100 transition-colors px-3 py-1.5">
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Filters */}
        <aside className="lg:sticky lg:top-24 self-start">
          <form method="GET" className="card p-5 space-y-5">
            {category && <input type="hidden" name="cat" value={category} />}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-2.5">Product type</p>
              <div className="space-y-2">
                {[
                  ["", "All types"],
                  ["PHYSICAL_PRODUCT", "Physical products"],
                  ["DIGITAL_PRODUCT", "Digital products"],
                  ["DOWNLOADABLE_RESOURCE", "Downloadable resources"],
                  ["SERVICE", "Services"],
                ].map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer hover:text-cream-100">
                    <input type="radio" name="type" value={val} defaultChecked={(type || "") === val} className="accent-gold-500" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-2.5">Price (USD)</p>
              <div className="flex items-center gap-2">
                <input name="min" type="number" min={0} defaultValue={min ?? ""} placeholder="Min" className="input py-2 text-xs" aria-label="Minimum price" />
                <span className="text-mist-500">–</span>
                <input name="max" type="number" min={0} defaultValue={max ?? ""} placeholder="Max" className="input py-2 text-xs" aria-label="Maximum price" />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-mist-300 cursor-pointer hover:text-cream-100">
              <input type="checkbox" name="stock" value="1" defaultChecked={inStock} className="accent-gold-500 rounded" />
              In stock only
            </label>
            {q && <input type="hidden" name="q" value={q} />}
            <button className="btn-gold btn-md w-full">Apply filters</button>
            <Link href={category ? `/shop/${category}` : "/shop/all"} className="block text-center text-xs text-mist-500 hover:text-cream-100 transition-colors">
              Clear all
            </Link>
          </form>

          {/* Category quick nav */}
          <nav className="card p-5 mt-4 hidden lg:block" aria-label="Categories">
            <p className="text-xs font-semibold uppercase tracking-widest text-mist-400 mb-2.5">Categories</p>
            <ul className="space-y-1.5">
              {roots.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop/${c.slug}`}
                    className={`text-sm transition-colors ${category === c.slug ? "text-gold-300 font-medium" : "text-mist-300 hover:text-cream-100"}`}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-5">
            <p className="text-sm text-mist-400" role="status">
              {result.total} {result.total === 1 ? "product" : "products"}
            </p>
            <form method="GET" className="flex items-center gap-2">
              {category && <input type="hidden" name="cat" value={category} />}
              {type && <input type="hidden" name="type" value={type} />}
              {min != null && <input type="hidden" name="min" value={min} />}
              {max != null && <input type="hidden" name="max" value={max} />}
              {inStock && <input type="hidden" name="stock" value="1" />}
              {q && <input type="hidden" name="q" value={q} />}
              <label htmlFor="sort" className="text-xs text-mist-500">
                Sort by
              </label>
              <SortSelect value={sort} />
            </form>
          </div>

          {result.items.length === 0 ? (
            <div className="card px-6 py-14 text-center">
              <p className="text-3xl mb-3" aria-hidden>🔍</p>
              <h2 className="font-display text-lg text-cream-50">No products match those filters</h2>
              <p className="text-sm text-mist-400 mt-2">Try removing a filter, or explore a different category.</p>
              <Link href="/shop/all" className="btn-outline btn-md mt-5">
                View all products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {result.items.map((p) => (
                <ProductCard key={p.id} p={p} currency={currency} />
              ))}
            </div>
          )}

          {result.pages > 1 && <Pagination page={result.page} pages={result.pages} qs={qs} />}
        </div>
      </div>
    </div>
  );
}
