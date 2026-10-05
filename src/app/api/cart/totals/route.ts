import { NextRequest, NextResponse } from "next/server";
import { cartTotals, validateCoupon, activeCouponState } from "@/lib/cart";

export async function GET(req: NextRequest) {
  const currency = req.cookies.get("fm_currency")?.value || "USD";
  const country = req.nextUrl.searchParams.get("country") || undefined;
  const couponState = activeCouponState()?.coupon ?? null;
  const totals = cartTotals(currency, { country, coupon: couponState });
  return NextResponse.json({
    count: totals.count,
    currency,
    needsShipping: totals.needsShipping,
    subtotal: totals.subtotalDisp,
    discount: totals.discountDisp,
    shipping: totals.shippingDisp,
    tax: totals.taxDisp,
    total: totals.totalDisp,
    shippingQuote: totals.shipping
      ? { methodName: totals.shipping.methodName, zoneName: totals.shipping.zoneName, minDays: totals.shipping.minDays, maxDays: totals.shipping.maxDays, free: totals.shipping.priceCentsUsd === 0 }
      : null,
    coupon: couponState,
  });
}
