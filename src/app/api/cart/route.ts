import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addToCart, getCartToken, getOrCreateCartId, validateCoupon, activeCouponState } from "@/lib/cart";
import { ApiError, rateLimit } from "@/lib/auth";
import { q1, run } from "@/lib/db";
import { track } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!rateLimit(`cart:${ip}`, 60)) throw new ApiError(429, "Too many requests — please slow down.");
    const body = await req.json();
    const schema = z.object({
      productId: z.number().int().positive(),
      variantId: z.number().int().positive().nullable().optional(),
      qty: z.number().int().min(1).max(99).optional(),
      packageId: z.number().int().positive().nullable().optional(),
    });
    const data = schema.parse(body);
    await addToCart(data.productId, data.variantId ?? null, data.qty ?? 1, data.packageId ?? null);
    track("add_to_cart", { productId: data.productId, qty: data.qty ?? 1 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    console.error("[api/cart]", e);
    return NextResponse.json({ error: "Could not update your cart." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const schema = z.object({
      lineId: z.number().int().positive(),
      qty: z.number().int().min(0).max(99).optional(),
      savedForLater: z.boolean().optional(),
    });
    const data = schema.parse(body);
    const token = await getCartToken();
    if (!token) throw new ApiError(400, "Cart not found.");
    if (data.qty === 0) {
      run("DELETE FROM cart_items WHERE id = ? AND cart_id = (SELECT id FROM carts WHERE token = ?)", data.lineId, token);
      track("remove_from_cart", { lineId: data.lineId });
    } else if (data.qty != null) {
      run("UPDATE cart_items SET qty = ? WHERE id = ? AND cart_id = (SELECT id FROM carts WHERE token = ?)", data.qty, data.lineId, token);
    } else if (data.savedForLater != null) {
      run("UPDATE cart_items SET saved_for_later = ? WHERE id = ? AND cart_id = (SELECT id FROM carts WHERE token = ?)", data.savedForLater ? 1 : 0, data.lineId, token);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not update your cart." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Coupon application
  try {
    const body = await req.json();
    const code = String(body.code || "").trim();
    const token = await getCartToken();
    const cart = token ? q1<{ id: number }>("SELECT id FROM carts WHERE token = ?", token) : null;
    if (!cart) throw new ApiError(400, "Your cart is empty — add something first.");
    if (!code) {
      run("UPDATE carts SET coupon_code = NULL WHERE id = ?", cart.id);
      return NextResponse.json({ ok: true, removed: true });
    }
    const coupon = validateCoupon(code, 10 ** 12);
    run("UPDATE carts SET coupon_code = ? WHERE id = ?", coupon.code, cart.id);
    return NextResponse.json({ ok: true, coupon });
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not apply the coupon." }, { status: 500 });
  }
}

export async function GET() {
  const state = await activeCouponState();
  return NextResponse.json(state ?? { coupon: null });
}
