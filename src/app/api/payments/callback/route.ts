import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPaymentProvider } from "@/lib/payments";
import { insert, q1, run, nowIso } from "@/lib/db";
import { markOrderPaid } from "@/lib/orders";
import { rateLimit } from "@/lib/auth";

/**
 * Payment result endpoint — used by the internal test gateway (POST) and
 * structured like a real provider webhook. Security model:
 *  - Outcome is NEVER trusted from the client. The provider's verify() is the
 *    source of truth (real providers re-check with their API + signature).
 *  - Amount and currency are re-checked against the order.
 *  - Duplicate callbacks are absorbed idempotently (payment_events ledger).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`paycb:${ip}`, 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  try {
    const body = await req.json();
    const schema = z.object({
      reference: z.string().min(6).max(80),
      outcome: z.enum(["SUCCESS", "FAILED", "CANCELLED"]).optional(),
      providerRef: z.string().max(200).optional(),
    });
    const data = schema.parse(body);

    const payment = q1<any>("SELECT * FROM payments WHERE reference = ?", data.reference);
    if (!payment) return NextResponse.json({ error: "Unknown payment reference." }, { status: 404 });

    // Duplicate callback: if already resolved, respond ok without reprocessing.
    if (payment.status === "SUCCESS" || payment.status === "REFUNDED") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const provider = getPaymentProvider();
    const verification = await provider.verify(data.reference, data.outcome ?? data.providerRef);
    insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'callback', ?)", payment.id, JSON.stringify({ outcome: data.outcome, verification: { status: verification.status, providerRef: verification.providerRef } }));

    const order = q1<any>("SELECT * FROM orders WHERE id = ?", payment.order_id);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    if (verification.status === "SUCCESS") {
      // Amount & currency guard — never mark paid on mismatch.
      if (verification.amountCents != null && verification.amountCents !== payment.amount_cents) {
        run("UPDATE payments SET status = 'FAILED', resolved_at = ? WHERE id = ?", nowIso(), payment.id);
        insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'amount_mismatch', ?)", payment.id, JSON.stringify({ expected: payment.amount_cents, received: verification.amountCents }));
        return NextResponse.json({ error: "Payment amount mismatch — order not confirmed." }, { status: 400 });
      }
      if (verification.currency && verification.currency !== payment.currency) {
        run("UPDATE payments SET status = 'FAILED', resolved_at = ? WHERE id = ?", nowIso(), payment.id);
        return NextResponse.json({ error: "Payment currency mismatch — order not confirmed." }, { status: 400 });
      }
      const applied = markOrderPaid(order.id, payment.id);
      run("UPDATE payments SET provider_ref = ?, raw_json = ? WHERE id = ?", verification.providerRef ?? null, JSON.stringify(verification.raw ?? {}), payment.id);
      return NextResponse.json({ ok: true, paid: applied, orderNumber: order.order_number });
    }

    // Failed / cancelled
    const status = verification.status === "PENDING" ? "PENDING" : data.outcome === "CANCELLED" ? "CANCELLED" : "FAILED";
    run("UPDATE payments SET status = ?, resolved_at = ? WHERE id = ?", status, nowIso(), payment.id);
    if (status !== "PENDING" && order.status === "PAYMENT_PROCESSING") {
      run("UPDATE orders SET status = 'PAYMENT_FAILED', updated_at = ? WHERE id = ?", nowIso(), order.id);
    }
    return NextResponse.json({ ok: true, paid: false, status });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    console.error("[payments/callback]", e);
    return NextResponse.json({ error: "Payment could not be processed." }, { status: 500 });
  }
}
