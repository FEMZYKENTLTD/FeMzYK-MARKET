import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminUser, audit, jsonError } from "@/lib/adminApi";
import { q1, run, insert, q } from "@/lib/db";
import { transitionOrder } from "@/lib/orders";
import { canTransition, ORDER_TRANSITIONS } from "@/lib/statemachine";
import { sendEmail } from "@/lib/email";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminUser();
    const data = z
      .object({
        status: z.string().optional(),
        shipment: z.object({ carrier: z.string().max(80).optional(), tracking_number: z.string().max(120).optional(), status: z.string().optional() }).optional(),
        note: z.string().max(500).optional(),
      })
      .parse(await req.json());

    const order = /^\d+$/.test((await params).id)
      ? q1<any>("SELECT * FROM orders WHERE id = ?", (await params).id)
      : q1<any>("SELECT * FROM orders WHERE order_number = ?", (await params).id);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    if (data.status && data.status !== order.status) {
      const from = order.status;
      transitionOrder(order.id, data.status);
      audit(admin.id, "order_status_changed", "order", order.id, { status: from }, { status: data.status });
      if (data.status === "SHIPPED") {
        sendEmail(order.email, "shipping_confirmation", { orderNumber: order.order_number, name: "", estimate: order.est_delivery_min_days ? `${order.est_delivery_min_days}–${order.est_delivery_max_days} business days` : "" });
      }
      if (data.status === "DELIVERED") sendEmail(order.email, "delivery_notification", { orderNumber: order.order_number, name: "" });
      // Refund side-effect: revoke digital entitlements
      if (data.status === "REFUNDED") {
        run("UPDATE digital_entitlements SET revoked = 1 WHERE order_id = ?", order.id);
      }
    }

    if (data.shipment) {
      const existing = q1<any>("SELECT id FROM shipments WHERE order_id = ? ORDER BY id DESC LIMIT 1", order.id);
      if (existing) {
        run("UPDATE shipments SET carrier = COALESCE(?, carrier), tracking_number = COALESCE(?, tracking_number), status = COALESCE(?, status) WHERE id = ?", data.shipment.carrier ?? null, data.shipment.tracking_number ?? null, data.shipment.status ?? null, existing.id);
        if (data.shipment.status === "SHIPPED" || data.shipment.status === "IN_TRANSIT") run("UPDATE shipments SET shipped_at = COALESCE(shipped_at, datetime('now')) WHERE id = ?", existing.id);
        if (data.shipment.status === "DELIVERED") run("UPDATE shipments SET delivered_at = datetime('now') WHERE id = ?", existing.id);
      } else {
        insert("INSERT INTO shipments (order_id, carrier, tracking_number, status) VALUES (?, ?, ?, ?)", order.id, data.shipment.carrier ?? null, data.shipment.tracking_number ?? null, data.shipment.status || "PENDING");
      }
      audit(admin.id, "shipment_updated", "order", order.id, undefined, data.shipment);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid data." }, { status: 400 });
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await adminUser();
    const order = /^\d+$/.test((await params).id)
      ? q1<any>("SELECT * FROM orders WHERE id = ?", (await params).id)
      : q1<any>("SELECT * FROM orders WHERE order_number = ?", (await params).id);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    order.items = q("SELECT * FROM order_items WHERE order_id = ?", order.id);
    order.shipments = q("SELECT * FROM shipments WHERE order_id = ?", order.id);
    order.payments = q("SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC", order.id);
    return NextResponse.json(order);
  } catch (e: any) {
    const { error, status } = jsonError(e);
    return NextResponse.json({ error }, { status });
  }
}
