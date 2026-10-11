import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, ApiError, rateLimit } from "@/lib/auth";
import { insert, q1 } from "@/lib/db";
import { track } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`review:${ip}`, 6, 60_000)) return NextResponse.json({ error: "Please wait before submitting another review." }, { status: 429 });
  try {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "Please sign in to write a review.");
    const data = z.object({
      productId: z.number().int().positive(),
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().max(120).optional(),
      body: z.string().trim().min(20).max(2000),
    }).strict().parse(await req.json());

    const product = q1("SELECT id FROM products WHERE id = ? AND status = 'published'", data.productId);
    if (!product) throw new ApiError(404, "Product not found.");
    const purchased = q1<{ id: number }>(
      `SELECT o.id FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.paid_at IS NOT NULL
         AND o.status NOT IN ('CANCELLED','REFUNDED')
       ORDER BY o.paid_at DESC LIMIT 1`,
      user.id, data.productId
    );
    if (!purchased) throw new ApiError(403, "Reviews are open to customers with a confirmed, paid purchase of this product.");
    if (q1("SELECT id FROM reviews WHERE user_id = ? AND product_id = ?", user.id, data.productId)) {
      throw new ApiError(409, "You have already submitted a review for this product.");
    }
    const name = q1<{ first_name: string | null }>("SELECT first_name FROM users WHERE id = ?", user.id);
    insert(
      `INSERT INTO reviews (product_id, user_id, order_id, rating, title, body, author_name, is_verified, is_seed, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 'pending')`,
      data.productId, user.id, purchased.id, data.rating, data.title || null, data.body,
      name?.first_name || user.email.split("@")[0]
    );
    track("review_submitted", { productId: data.productId, verified: true });
    return NextResponse.json({ ok: true, message: "Review submitted for moderation." });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Please complete all fields (review must be at least 20 characters)." }, { status: 400 });
    return NextResponse.json({ error: "Could not submit your review." }, { status: 500 });
  }
}
