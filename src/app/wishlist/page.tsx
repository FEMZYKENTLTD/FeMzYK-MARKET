import { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import ProductCard from "@/components/product/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import { getDisplayCurrency } from "@/lib/moneyServer";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await getSessionUser();
  const currency = await getDisplayCurrency();

  if (!user) {
    return (
      <div className="container-page py-16">
        <h1 className="font-display text-3xl text-cream-50 mb-8">Wishlist</h1>
        <EmptyState icon="❤️" title="Save products here so you can find them later." body="Sign in and your wishlist follows you across devices." ctaHref="/account/login?next=/wishlist" ctaLabel="Sign in" />
      </div>
    );
  }

  const items = q<any>(
    `SELECT p.id, p.slug, p.name, p.type_code, p.price_cents, p.compare_at_cents, p.is_bestseller, p.is_new, p.stock_qty, p.track_inventory,
            (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.status='approved' AND r.is_verified=1 AND r.is_seed=0) AS rating_avg,
            (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status='approved' AND r.is_verified=1 AND r.is_seed=0) AS rating_count,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image,
            (SELECT alt FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image_alt
     FROM wishlist_items w JOIN products p ON p.id = w.product_id
     WHERE w.user_id = ? ORDER BY w.added_at DESC`,
    user.id
  );

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl text-cream-50 mb-8">Your wishlist</h1>
      {items.length === 0 ? (
        <EmptyState icon="❤️" title="Save products here so you can find them later." body="Tap the heart on any product to keep it here — useful for gifts and future-you." ctaHref="/shop/all" ctaLabel="Browse products" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
