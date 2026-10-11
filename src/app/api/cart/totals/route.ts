import { NextRequest, NextResponse } from "next/server";
import { cartTotals, activeCouponState } from "@/lib/cart";
import { BASE_CURRENCY, getCurrencies } from "@/lib/money";

export async function GET(req: NextRequest) {
  const requestedCurrency = req.cookies.get("fm_currency")?.value || BASE_CURRENCY;
  const currency = getCurrencies()[requestedCurrency] ? requestedCurrency : BASE_CURRENCY;
  const country = req.nextUrl.searchParams.get("country") || undefined;
  const couponState = (await activeCouponState())?.coupon ?? null;
  const totals = await cartTotals(currency, { country, coupon: couponState });
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
