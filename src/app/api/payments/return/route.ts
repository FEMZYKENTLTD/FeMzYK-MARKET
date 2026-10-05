import { NextRequest, NextResponse } from "next/server";
import { q1 } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { markOrderPaid } from "@/lib/orders";
import { run, nowIso, insert } from "@/lib/db";

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

  // If still unresolved, attempt server-side verification (real providers).
  if (payment.status === "INITIATED" || payment.status === "PENDING") {
    try {
      const provider = getPaymentProvider();
      const v = await provider.verify(ref);
      insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'return_verify', ?)", payment.id, JSON.stringify(v));
      if (v.status === "SUCCESS") {
        const amountOk = v.amountCents == null || v.amountCents === payment.amount_cents;
        const curOk = !v.currency || v.currency === payment.currency;
        if (amountOk && curOk) {
          markOrderPaid(payment.order_id, payment.id);
          run("UPDATE payments SET provider_ref = ? WHERE id = ?", v.providerRef ?? null, payment.id);
        } else {
          run("UPDATE payments SET status = 'FAILED', resolved_at = ? WHERE id = ?", nowIso(), payment.id);
        }
      } else if (v.status === "FAILED") {
        run("UPDATE payments SET status = 'FAILED', resolved_at = ? WHERE id = ?", nowIso(), payment.id);
        run("UPDATE orders SET status = 'PAYMENT_FAILED', updated_at = ? WHERE id = ?", nowIso(), payment.order_id);
      }
    } catch (e) {
      console.error("[payments/return] verify failed", e);
    }
  }

  const fresh = q1<any>("SELECT status FROM payments WHERE reference = ?", ref);
  if (fresh.status === "SUCCESS") {
    return NextResponse.redirect(new URL(`/order-confirmation?order=${encodeURIComponent(order.order_number)}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`, req.url));
  }
  return NextResponse.redirect(new URL(`/checkout/cancelled?order=${encodeURIComponent(order.order_number)}`, req.url));
}
