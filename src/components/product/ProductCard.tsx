import Link from "next/link";
import Image from "next/image";
import { convertCents, formatMoney } from "@/lib/money";
import { Stars } from "./Stars";
import AddToCartButton from "./AddToCartButton";
import WishlistButton from "./WishlistButton";

export interface CardProduct {
  id: number;
  slug: string;
  name: string;
  type_code: string;
  price_cents: number;
  compare_at_cents: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  image: string | null;
  image_alt: string | null;
  is_bestseller?: number;
  sales_count?: number;
  is_new?: number;
  stock_qty?: number;
  track_inventory?: number;
}

export default function ProductCard({ p, currency }: { p: CardProduct; currency: string }) {
  const price = convertCents(p.price_cents, currency);
  const compare = p.compare_at_cents ? convertCents(p.compare_at_cents, currency) : null;
  const isService = p.type_code === "SERVICE" || p.type_code === "SERVICE_PACKAGE";
  const isDigital = p.type_code === "DIGITAL_PRODUCT" || p.type_code === "DOWNLOADABLE_RESOURCE";
  const href = isService ? `/services/${p.slug}` : `/products/${p.slug}`;
  const outOfStock = !!p.track_inventory && (p.stock_qty ?? 0) <= 0;
  const isBestseller = !!p.is_bestseller && (p.sales_count ?? 0) > 0;

  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden">
      <div className="relative aspect-square bg-ink-800 overflow-hidden">
        <Link href={href} className="block w-full h-full" tabIndex={-1} aria-hidden>
          {p.image ? (
            <Image
              src={p.image}
              alt={p.image_alt || p.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-mist-500 text-sm">No image</span>
          )}
        </Link>
        {/* badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
          {isService && <span className="badge-navy">Service</span>}
          {isDigital && <span className="badge-gold">Digital · Instant</span>}
          {isBestseller && <span className="badge-gold">Bestseller</span>}
          {!!p.is_new && !isBestseller && <span className="badge-gray">New</span>}
          {outOfStock && <span className="badge-red">Out of stock</span>}
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <WishlistButton productId={p.id} />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <Link href={href} className="block">
          <h3 className="text-sm font-medium text-cream-100 leading-snug line-clamp-2 group-hover:text-gold-300 transition-colors">
            {p.name}
          </h3>
        </Link>
        {p.rating_count != null && p.rating_count > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <Stars rating={p.rating_avg ?? 0} size="sm" />
            <span className="text-[11px] text-mist-500">({p.rating_count})</span>
          </div>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <div>
            <span className="text-[15px] font-semibold text-cream-50">{formatMoney(price, currency)}</span>
            {compare && compare > price && (
              <span className="ml-2 text-xs text-mist-500 line-through">{formatMoney(compare, currency)}</span>
            )}
            {isService && <span className="ml-1 text-[11px] text-mist-500">starting</span>}
          </div>
          {!isService && !outOfStock && <AddToCartButton productId={p.id} small />}
        </div>
      </div>
    </article>
  );
}
