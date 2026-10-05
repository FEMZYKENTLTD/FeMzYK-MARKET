import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/orders";
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
  address: z
    .object({
      fullName: z.string().min(2).max(120),
      line1: z.string().min(3).max(160),
      line2: z.string().max(160).optional(),
      city: z.string().min(1).max(80),
      state: z.string().max(80).optional(),
      postalCode: z.string().min(2).max(20),
      country: z.string().length(2),
      phone: z.string().max(30).optional(),
    })
    .optional(),
  customerNote: z.string().max(500).optional(),
  couponCode: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`checkout:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many checkout attempts. Please wait a moment and try again." }, { status: 429 });
  }
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const user = getSessionUser();

    const { orderId, orderNumber, totalDispCents, kind } = createOrder({
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

    const order = q1<any>("SELECT * FROM orders WHERE id = ?", orderId)!;
    const reference = `pay_${randomToken(12)}`;
    const provider = getPaymentProvider();
    const paymentId = insert(
      "INSERT INTO payments (order_id, reference, provider, status, amount_cents, currency) VALUES (?, ?, ?, 'INITIATED', ?, ?)",
      orderId,
      reference,
      provider.code,
      totalDispCents,
      order.currency
    );
    insert("INSERT INTO payment_events (payment_id, event_type, payload_json) VALUES (?, 'initiated', ?)", paymentId, JSON.stringify({ orderNumber }));
    run("UPDATE orders SET status = 'PAYMENT_PROCESSING', updated_at = ? WHERE id = ? AND status = 'PENDING_PAYMENT'", nowIso(), orderId);
    track("checkout_started", { order: orderNumber });

    const origin = req.headers.get("origin") || req.headers.get("host") || "";
    const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;
    const result = await provider.createCheckout({
      reference,
      amountCents: totalDispCents,
      currency: order.currency,
      customerEmail: order.email,
      customerName: [data.firstName, data.lastName].filter(Boolean).join(" ") || order.email,
      successUrl: `${baseUrl}/api/payments/return?ref=${reference}`,
      cancelUrl: `${baseUrl}/checkout/cancelled?order=${orderNumber}`,
    });

    return NextResponse.json({ redirectUrl: result.redirectUrl, orderNumber, total: formatMoney(totalDispCents, order.currency) });
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
