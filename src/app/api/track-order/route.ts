import { NextRequest, NextResponse } from "next/server";
import { findOrderForTracking } from "@/lib/orders";
import { q } from "@/lib/db";
import { rateLimit } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`track:${ip}`, 15, 60_000)) return NextResponse.json({ error: "Too many lookups — please wait a moment." }, { status: 429 });
  const orderNumber = req.nextUrl.searchParams.get("order") || "";
  const email = req.nextUrl.searchParams.get("email") || "";
  if (!orderNumber || !email) return NextResponse.json({ error: "Please provide both your order number and email." }, { status: 400 });

  const order = findOrderForTracking(orderNumber, email);
  if (!order) return NextResponse.json({ error: "We couldn't find an order with that number and email. Double-check both and try again." }, { status: 404 });

  const items = q("SELECT name, qty, total_cents FROM order_items WHERE order_id = ?", order.id);
  const shipments = q("SELECT carrier, tracking_number, status, shipped_at, delivered_at FROM shipments WHERE order_id = ? ORDER BY created_at DESC", order.id);
  const payments = q("SELECT status, provider, created_at FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1", order.id);
  const entitlements = q(
    `SELECT de.token, de.download_limit, de.downloads_used, de.expires_at, p.name, p.slug, p.digital_file_type
     FROM digital_entitlements de JOIN products p ON p.id = de.product_id WHERE de.order_id = ?`,
    order.id
  );

  return NextResponse.json({
    order: {
      orderNumber: order.order_number,
      status: order.status,
      kind: order.kind,
      currency: order.currency,
      totalCents: order.total_cents,
      createdAt: order.created_at,
      estMin: order.est_delivery_min_days,
      estMax: order.est_delivery_max_days,
    },
    items,
    shipments,
    payment: payments[0] ?? null,
    downloads: entitlements,
  });
}
