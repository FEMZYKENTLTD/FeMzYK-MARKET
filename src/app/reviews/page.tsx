import { Metadata } from "next";
import Link from "next/link";
import { q } from "@/lib/db";
import { Stars } from "@/components/product/Stars";

export const metadata: Metadata = {
  title: "Customer Reviews",
  description: "Genuine customer reviews for FEMZYK MARKET products and services.",
};

export default function ReviewsPage() {
  const reviews = q<any>(
    `SELECT r.rating, r.title, r.body, r.author_name, r.is_verified, r.is_seed, r.created_at, p.name AS product_name, p.slug AS product_slug, p.type_code
     FROM reviews r JOIN products p ON p.id = r.product_id WHERE r.status = 'approved' AND r.is_verified = 1 AND r.is_seed = 0 ORDER BY r.created_at DESC LIMIT 30`
  );

  return (
    <div className="container-page py-12 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <p className="eyebrow">Real feedback only</p>
        <h1 className="font-display text-3xl text-cream-50 mt-2">Customer reviews</h1>
        <p className="text-sm text-mist-400 mt-3 max-w-xl mx-auto leading-relaxed">
          Only reviews from confirmed, paid customer orders appear here. Reviews are moderated for safety but never edited. If a product has no reviews yet, we say so.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {reviews.map((r, i) => (
          <figure key={i} className="card p-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Stars rating={r.rating} size="sm" />
              {r.is_verified && <span className="badge-green">✓ Verified purchase</span>}
            </div>
            {r.title && <h2 className="text-sm font-semibold text-cream-100 mt-3">{r.title}</h2>}
            <blockquote className="text-sm text-mist-300 mt-2 leading-relaxed">&ldquo;{r.body}&rdquo;</blockquote>
            <figcaption className="text-xs text-mist-500 mt-4">
              <span className="text-cream-200 font-medium">{r.author_name}</span>
              {" · on "}
              <Link href={r.type_code === "SERVICE" || r.type_code === "SERVICE_PACKAGE" ? `/services/${r.product_slug}` : `/products/${r.product_slug}`} className="text-gold-400 hover:text-gold-300">
                {r.product_name}
              </Link>
            </figcaption>
          </figure>
        ))}
      </div>
      {reviews.length === 0 && <p className="text-center text-sm text-mist-500">No approved reviews yet.</p>}
    </div>
  );
}
