import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getPaymentProvider } from "@/lib/payments";
import { insert, q1, run, nowIso } from "@/lib/db";
import { markOrderPaid, transitionOrder } from "@/lib/orders";
import { rateLimit } from "@/lib/auth";

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

/** Signed provider webhooks are hints; payment state is always re-verified with the provider API. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`pay-webhook:${ip}`, 60, 60_000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const raw = await req.text();
  if (raw.length > 128_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

  let provider;
  try { provider = getPaymentProvider(); }
  catch { return NextResponse.json({ error: "payment_provider_unavailable" }, { status: 503 }); }
  if (provider.code === "mock") return NextResponse.json({ error: "webhooks_not_available_for_test_gateway" }, { status: 404 });

  if (provider.code === "flutterwave") {
    const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH || "";
    const supplied = req.headers.get("verif-hash") || "";
    if (!expected || !supplied || !safeEqual(supplied, expected)) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  } else if (provider.code === "paystack") {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";
    const supplied = req.headers.get("x-paystack-signature") || "";
    const expected = secret ? createHmac("sha512", secret).update(raw).digest("hex") : "";
    if (!expected || !supplied || !safeEqual(supplied, expected)) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  } else {
    return NextResponse.json({ error: "unsupported_provider" }, { status: 404 });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const reference = String(body?.data?.tx_ref || body?.data?.reference || body?.tx_ref || body?.reference || "").trim();
  if (!reference || reference.length > 80) return NextResponse.json({ error: "missing_reference" }, { status: 400 });

  try {
    const payment = q1<any>("SELECT * FROM payments WHERE reference = ?", reference);
    if (!payment) return NextResponse.json({ error: "unknown_reference" }, { status: 404 });
    if (payment.status === "SUCCESS" || payment.status === "REFUNDED") return NextResponse.json({ ok: true, duplicate: true });

    const verification = await provider.verify(reference);
    insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'signed_webhook', ?)", payment.id,
      JSON.stringify({ provider: provider.code, webhookStatus: body?.data?.status || body?.event || null, verifiedStatus: verification.status, providerRef: verification.providerRef || null }));

    const order = q1<any>("SELECT * FROM orders WHERE id = ?", payment.order_id);
    if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

    if (verification.status === "PENDING") {
      run("UPDATE payments SET status = 'PENDING' WHERE id = ? AND status IN ('INITIATED','PENDING')", payment.id);
      return NextResponse.json({ ok: true, pending: true }, { status: 202 });
    }
    if (verification.status !== "SUCCESS") {
      run("UPDATE payments SET status = 'FAILED', resolved_at = ? WHERE id = ?", nowIso(), payment.id);
      if (!["CANCELLED", "REFUNDED", "COMPLETED", "DELIVERED", "SHIPPED", "IN_TRANSIT"].includes(order.status)) {
        try { transitionOrder(order.id, "PAYMENT_FAILED"); } catch { /* terminal state retained; event remains for reconciliation */ }
      }
      return NextResponse.json({ ok: true, paid: false });
    }

    if (verification.amountCents == null || verification.amountCents !== payment.amount_cents || !verification.currency || verification.currency !== payment.currency) {
      run("UPDATE payments SET status = 'FAILED', resolved_at = ? WHERE id = ?", nowIso(), payment.id);
      insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'verified_amount_currency_mismatch', ?)", payment.id,
        JSON.stringify({ expectedAmount: payment.amount_cents, receivedAmount: verification.amountCents, expectedCurrency: payment.currency, receivedCurrency: verification.currency }));
      if (!["CANCELLED", "REFUNDED", "COMPLETED", "DELIVERED", "SHIPPED", "IN_TRANSIT"].includes(order.status)) {
        try { transitionOrder(order.id, "PAYMENT_FAILED"); } catch { /* terminal state retained */ }
      }
      return NextResponse.json({ error: "verified_payment_mismatch" }, { status: 202 });
    }

    const applied = markOrderPaid(order.id, payment.id);
    run("UPDATE payments SET provider_ref = ?, raw_json = ? WHERE id = ?", verification.providerRef ?? null, JSON.stringify(verification.raw ?? {}), payment.id);
    if (!applied && ["CANCELLED", "REFUNDED"].includes(order.status)) {
      run("UPDATE payments SET status = 'SUCCESS', verified = 1, resolved_at = ? WHERE id = ?", nowIso(), payment.id);
      insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'verified_payment_after_terminal_order', ?)", payment.id,
        JSON.stringify({ orderStatus: order.status, needsManualReview: true }));
      return NextResponse.json({ ok: true, paid: false, needsReview: true }, { status: 202 });
    }
    return NextResponse.json({ ok: true, paid: applied, duplicate: !applied });
  } catch (e) {
    console.error("[payments/webhook] processing failed", e);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}
