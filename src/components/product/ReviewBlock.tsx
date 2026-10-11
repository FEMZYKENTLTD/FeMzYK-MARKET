"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stars } from "./Stars";

export default function ReviewBlock({
  productId,
  reviews,
  ratingAvg,
  ratingCount,
  canReview,
  hasPurchased,
}: {
  productId: number;
  reviews: any[];
  ratingAvg: number;
  ratingCount: number;
  canReview: boolean;
  hasPurchased: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not submit your review.");
      setMsg({ ok: true, text: "Thanks! Your review has been submitted and will appear once it's approved." });
      setTitle("");
      setBody("");
      setShowForm(false);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="reviews">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-xl text-cream-50">Customer reviews</h2>
          {ratingCount > 0 ? (
            <div className="flex items-center gap-2 mt-1.5">
              <Stars rating={ratingAvg} />
              <span className="text-sm text-mist-400">
                {ratingAvg.toFixed(1)} out of 5 · {ratingCount} review{ratingCount !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <p className="text-sm text-mist-500 mt-1">No approved reviews yet.</p>
          )}
        </div>
        {canReview && hasPurchased ? (
          <button className="btn-outline btn-md" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Close" : "Write a review"}
          </button>
        ) : canReview ? (
          <p className="text-xs text-mist-500">Reviews are open to customers with a confirmed, paid purchase.</p>
        ) : (
          <Link href="/account/login" className="btn-outline btn-md">
            Sign in to review
          </Link>
        )}
      </div>

      {msg && (
        <p className={`text-sm rounded-lg px-4 py-3 mb-5 border ${msg.ok ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" : "text-red-300 bg-red-500/10 border-red-500/30"}`} role="status">
          {msg.text}
        </p>
      )}

      {showForm && (
        <form onSubmit={submit} className="card p-6 mb-6 space-y-4">
          <div>
            <label className="label">Your rating</label>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  onClick={() => setRating(n)}
                  className={`text-2xl transition-colors ${n <= rating ? "text-gold-400" : "text-ink-600 hover:text-gold-300"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="review-title">Title (optional)</label>
            <input id="review-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div>
            <label className="label" htmlFor="review-body">Your review</label>
            <textarea id="review-body" className="input min-h-[120px]" required value={body} onChange={(e) => setBody(e.target.value)} minLength={20} maxLength={2000} placeholder="What did you like or dislike? How did it work for you?" />
          </div>
          {!hasPurchased && <p className="text-xs text-mist-500">You haven't purchased this product with your account, so your review won't carry a verified-purchase badge.</p>}
          <button className="btn-gold btn-md" disabled={busy}>
            {busy ? "Submitting…" : "Submit review"}
          </button>
        </form>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((r, i) => (
            <article key={i} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={r.rating} size="sm" />
                {r.is_seed ? (
                  <span className="badge-gray">Initial review</span>
                ) : r.is_verified ? (
                  <span className="badge-green">✓ Verified purchase</span>
                ) : null}
                <span className="text-xs text-mist-500 ml-auto">{new Date(r.created_at + "Z").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
              </div>
              {r.title && <h3 className="text-sm font-semibold text-cream-100 mt-3">{r.title}</h3>}
              <p className="text-sm text-mist-300 mt-2 leading-relaxed">{r.body}</p>
              <p className="text-xs text-mist-500 mt-3">— {r.author_name}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mist-500">Be the first to share your experience with this product.</p>
      )}
    </section>
  );
}
