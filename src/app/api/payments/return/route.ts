import { NextRequest, NextResponse } from "next/server";
import { q1 } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { markOrderPaid } from "@/lib/orders";
import { run, nowIso, insert } from "@/lib/db";
import { transitionOrder } from "@/lib/orders";
import { setOrderAccessCookie } from "@/lib/orderAccess";

/**
 * Return endpoint after a hosted payment page redirect (Flutterwave/Paystack).
 * Never trusts the redirect — re-verifies with the provider before
 * confirming. For the internal test gateway the callback has already been
 * posted; this just routes the customer to the right page.
 */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const origin = req.nextUrl.searchParams.get("origin") || "";
  if (!ref) return NextResponse.redirect(new URL("/checkout", req.url));

  const payment = q1<any>("SELECT * FROM payments WHERE reference = ?", ref);
  if (!payment) return NextResponse.redirect(new URL("/cart", req.url));

  const order = q1<any>("SELECT * FROM orders WHERE id = ?", payment.order_id);
  if (!order) return NextResponse.redirect(new URL("/cart", req.url));

  // If still unresolved, attempt server-side verification (real providers).
  if (payment.status === "INITIATED" || payment.status === "PENDING") {
    try {
      const provider = getPaymentProvider();
      const v = await provider.verify(ref);
      insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'return_verify', ?)", payment.id, JSON.stringify(v));
      if (v.status === "SUCCESS") {
        const amountOk = provider.code === "mock" || (v.amountCents != null && v.amountCents === payment.amount_cents);
        const curOk = provider.code === "mock" || (!!v.currency && v.currency === payment.currency);
        if (amountOk && curOk) {
          const applied = markOrderPaid(payment.order_id, payment.id);
          run("UPDATE payments SET provider_ref = ?, raw_json = ? WHERE id = ?", v.providerRef ?? null, JSON.stringify(v.raw ?? {}), payment.id);
          if (!applied && order && ["CANCELLED", "REFUNDED"].includes(order.status)) {
            run("UPDATE payments SET status = 'SUCCESS', verified = 1, resolved_at = ? WHERE id = ?", nowIso(), payment.id);
            insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'verified_payment_after_terminal_order', ?)", payment.id, JSON.stringify({ orderStatus: order.status, needsManualReview: true }));
          }
        } else {
          run("UPDATE payments SET status = 'FAILED', resolved_at = ? WHERE id = ?", nowIso(), payment.id);
          transitionOrder(payment.order_id, "PAYMENT_FAILED");
        }
      } else if (v.status === "FAILED") {
        run("UPDATE payments SET status = 'FAILED', resolved_at = ? WHERE id = ?", nowIso(), payment.id);
        if (order && !["CANCELLED", "REFUNDED"].includes(order.status)) transitionOrder(payment.order_id, "PAYMENT_FAILED");
      }
    } catch (e) {
      console.error("[payments/return] verify failed", e);
    }
  }

  const fresh = q1<any>("SELECT status FROM payments WHERE reference = ?", ref);
  if (fresh.status === "SUCCESS") {
    const response = NextResponse.redirect(new URL(`/order-confirmation?order=${encodeURIComponent(order.order_number)}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`, req.url));
    return setOrderAccessCookie(response, order.order_number, order.confirmation_token);
  }
  return NextResponse.redirect(new URL(`/checkout/cancelled?order=${encodeURIComponent(order.order_number)}`, req.url));
}
