import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, transitionOrder } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { ApiError, getSessionUser, rateLimit } from "@/lib/auth";
import { insert, q1, run, randomToken, nowIso } from "@/lib/db";
import { track } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";

const schema = z.object({
  email: z.string().email("Please enter a valid email address."),
  firstName: z.string().max(60).optional(),
  lastName: z.string().max(60).optional(),
  currency: z.string().length(3).default("USD"),
  country: z.string().length(2).optional(),
  address: z.object({
    fullName: z.string().min(2).max(120),
    line1: z.string().min(3).max(160),
    line2: z.string().max(160).optional(),
    city: z.string().min(1).max(80),
    state: z.string().max(80).optional(),
    postalCode: z.string().min(2).max(20),
    country: z.string().length(2),
    phone: z.string().max(30).optional(),
  }).optional(),
  customerNote: z.string().max(500).optional(),
  couponCode: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`checkout:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many checkout attempts. Please wait a moment and try again." }, { status: 429 });
  }

  try {
    const data = schema.parse(await req.json());

    // Fail closed before order creation, stock reservation, or cart clearing.
    let provider;
    try { provider = getPaymentProvider(); }
    catch {
      throw new ApiError(503, "Secure checkout is temporarily unavailable while payment setup is completed. Your cart is unchanged.");
    }

    let baseUrl: string;
    try {
      const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      if (process.env.NODE_ENV === "production" && !configured) throw new Error("missing site URL");
      const parsed = new URL(configured || req.nextUrl.origin);
      if (parsed.username || parsed.password || (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")) throw new Error("invalid site URL");
      baseUrl = parsed.origin;
    } catch {
      throw new ApiError(503, "Secure checkout is not configured for this site yet. Your cart is unchanged.");
    }

    const user = await getSessionUser();
    const { orderId, orderNumber, totalDispCents } = await createOrder({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      currency: data.currency,
      country: data.country ?? data.address?.country,
      address: data.address,
      customerNote: data.customerNote,
      couponCode: data.couponCode,
      userId: user?.id ?? null,
      ip,
    });

    const order = q1<any>("SELECT * FROM orders WHERE id = ?", orderId);
    if (!order) throw new ApiError(500, "We couldn't prepare your order. Your cart is unchanged.");
    const reference = `pay_${randomToken(24)}`;
    let paymentId: number | null = null;

    try {
      paymentId = insert(
        "INSERT INTO payments (order_id, reference, provider, status, amount_cents, currency) VALUES (?, ?, ?, 'INITIATED', ?, ?)",
        orderId, reference, provider.code, totalDispCents, order.currency
      );
      insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'initiated', ?)", paymentId, JSON.stringify({ orderNumber, provider: provider.code }));
      run("UPDATE orders SET status = 'PAYMENT_PROCESSING', updated_at = ? WHERE id = ? AND status = 'PENDING_PAYMENT'", nowIso(), orderId);
      track("checkout_started", { order: orderNumber });

      const result = await provider.createCheckout({
        reference,
        amountCents: totalDispCents,
        currency: order.currency,
        customerEmail: order.email,
        customerName: [data.firstName, data.lastName].filter(Boolean).join(" ") || order.email,
        successUrl: `${baseUrl}/api/payments/return?ref=${encodeURIComponent(reference)}`,
        cancelUrl: `${baseUrl}/checkout/cancelled?order=${encodeURIComponent(orderNumber)}`,
      });
      return NextResponse.json({ redirectUrl: result.redirectUrl, orderNumber, total: formatMoney(totalDispCents, order.currency) });
    } catch (providerError) {
      // A provider timeout may still produce a delayed webhook. Releasing is
      // idempotent; if a verified success later arrives it is reconciled safely.
      try {
        const current = q1<any>("SELECT status FROM orders WHERE id = ?", orderId);
        if (current && ["PENDING_PAYMENT", "PAYMENT_PROCESSING"].includes(current.status)) transitionOrder(orderId, "PAYMENT_FAILED");
        if (paymentId) {
          run("UPDATE payments SET status = 'FAILED', resolved_at = ? WHERE id = ? AND status != 'SUCCESS'", nowIso(), paymentId);
          insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'checkout_initialization_failed', ?)", paymentId, JSON.stringify({ message: "Payment provider did not confirm checkout initialization." }));
        }
      } catch (rollbackError) {
        console.error("[api/checkout] reservation cleanup failed", rollbackError);
      }
      console.error("[api/checkout] provider initialization failed", providerError);
      throw new ApiError(502, "We couldn't start secure payment. Your cart has been restored; please try again or contact support.");
    }
  } catch (e: any) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) {
      const first = e.errors[0];
      return NextResponse.json({ error: `${first.path.join(".")}: ${first.message}` }, { status: 400 });
    }
    console.error("[api/checkout]", e);
    return NextResponse.json({ error: "We couldn't start checkout. Your cart is unchanged — please try again." }, { status: 500 });
  }
}
