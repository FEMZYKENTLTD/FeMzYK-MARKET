import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, ApiError, rateLimit } from "@/lib/auth";
import { insert, q1 } from "@/lib/db";
import { track } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`review:${ip}`, 6, 60_000)) return NextResponse.json({ error: "Please wait before submitting another review." }, { status: 429 });
  try {
    const user = getSessionUser();
    if (!user) throw new ApiError(401, "Please sign in to write a review.");
    const body = await req.json();
    const data = z
      .object({
        productId: z.number().int().positive(),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(120).optional(),
        body: z.string().min(20).max(2000),
      })
      .parse(body);

    const product = q1("SELECT id FROM products WHERE id = ? AND status = 'published'", data.productId);
    if (!product) throw new ApiError(404, "Product not found.");
    const purchased = q1(
      `SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status NOT IN ('PENDING_PAYMENT','PAYMENT_FAILED','CANCELLED') LIMIT 1`,
      user.id,
      data.productId
    );
    const name = q1<{ first_name: string | null; email: string }>("SELECT first_name, email FROM users WHERE id = ?", user.id);
    insert(
      `INSERT INTO reviews (product_id, user_id, rating, title, body, author_name, is_verified, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      data.productId,
      user.id,
      data.rating,
      data.title || null,
      data.body,
      name?.first_name || user.email.split("@")[0],
      purchased ? 1 : 0
    );
    track("review_submitted", { productId: data.productId, verified: !!purchased });
    return NextResponse.json({ ok: true, message: "Review submitted for moderation." });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Please complete all fields (review must be at least 20 characters)." }, { status: 400 });
    return NextResponse.json({ error: "Could not submit your review." }, { status: 500 });
  }
}
