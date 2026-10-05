import { q } from "@/lib/db";
import { Stars } from "@/components/product/Stars";
import { timeAgo } from "@/lib/util";
import ReviewsModeration from "./ReviewsModeration";

export const dynamic = "force-dynamic";

export default function AdminReviewsPage() {
  const pending = q<any>(
    `SELECT r.*, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id WHERE r.status = 'pending' ORDER BY r.created_at`
  );
  const decided = q<any>(
    `SELECT r.*, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id WHERE r.status != 'pending' ORDER BY r.created_at DESC LIMIT 40`
  );
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Review moderation</h1>
      <p className="text-sm text-mist-400 mb-6">Only approved reviews are public. We never edit review text, and verified purchases get their badge automatically.</p>
      <ReviewsModeration
        pending={pending.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, author: r.author_name, verified: !!r.is_verified, seed: !!r.is_seed, product: r.product_name, at: r.created_at }))}
        decided={decided.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, author: r.author_name, verified: !!r.is_verified, seed: !!r.is_seed, product: r.product_name, at: r.created_at, status: r.status }))}
      />
    </div>
  );
}
