import { insert, q, q1, run, nowIso, randomToken, refNumber, tx } from "./db";
import { ApiError } from "./auth";
import { cartLines, getCartToken, cartTotals, CouponState } from "./cart";
import { convertCents } from "./money";
import { sendEmail } from "./email";
import { track } from "./analytics";
import { canTransition, ORDER_TRANSITIONS } from "./statemachine";
import { formatMoney } from "./money";

export interface CheckoutInput {
  email: string;
  firstName?: string;
  lastName?: string;
  currency: string;
  country?: string;
  address?: { fullName: string; line1: string; line2?: string; city: string; state?: string; postalCode: string; country: string; phone?: string };
  customerNote?: string;
  couponCode?: string;
  userId?: number | null;
  ip?: string;
}

export function createOrder(input: CheckoutInput): { orderId: number; orderNumber: string; totalDispCents: number; kind: string } {
  const token = getCartToken();
  const cart = token ? q1<{ id: number }>("SELECT id FROM carts WHERE token = ?", token) : null;
  if (!cart) throw new ApiError(400, "Your cart is empty.");
  const lines = cartLines(cart.id);
  if (!lines.length) throw new ApiError(400, "Your cart is empty.");

  let coupon: CouponState | null = null;
  if (input.couponCode) {
    const { validateCoupon } = require("./cart");
    const subtotalUsd = lines.reduce((s, l) => s + l.unit_price_cents * l.qty, 0);
    try {
      coupon = validateCoupon(input.couponCode, subtotalUsd);
    } catch {
      coupon = null; // invalid coupon at final step: proceed without, totals stay honest
    }
  }
  const totals = cartTotals(input.currency, { country: input.country, coupon });

  const kind = orderKind(lines.map((l) => l.type_code));
  const rate = totals.fxRate;
  const disp = (usd: number) => convertCents(usd, input.currency);

  return tx(() => {
    // Validate stock atomically
    for (const l of lines) {
      if (l.track_inventory && !l.allow_backorder) {
        const avail = l.variant_id
          ? q1<{ stock_qty: number }>("SELECT stock_qty FROM product_variants WHERE id = ?", l.variant_id)?.stock_qty ?? 0
          : l.stock_qty;
        if (avail < l.qty) throw new ApiError(409, `"${l.name}" has limited stock available. Please adjust the quantity.`);
      }
    }

    const orderNumber = refNumber("FM");
    const orderId = insert(
      `INSERT INTO orders (order_number, user_id, email, status, kind, currency, fx_rate,
        subtotal_cents, shipping_cents, tax_cents, discount_cents, total_cents, coupon_code,
        shipping_address_json, shipping_zone, shipping_method, est_delivery_min_days, est_delivery_max_days,
        customer_note, ip)
       VALUES (?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      orderNumber,
      input.userId ?? null,
      input.email.trim().toLowerCase(),
      kind,
      input.currency,
      rate,
      disp(totals.subtotalUsd),
      disp(totals.shippingUsd),
      disp(totals.taxUsd),
      disp(totals.discountUsd),
      disp(totals.totalUsd),
      coupon?.code ?? null,
      input.address ? JSON.stringify(input.address) : null,
      totals.shipping?.zoneCode ?? null,
      totals.shipping?.methodName ?? null,
      totals.shipping?.minDays ?? null,
      totals.shipping?.maxDays ?? null,
      input.customerNote ?? null,
      input.ip ?? null
    );

    for (const l of lines) {
      insert(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_type, sku, name, qty, unit_price_cents, total_cents, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        orderId,
        l.product_id,
        l.variant_id,
        l.type_code,
        q1<{ sku: string }>("SELECT sku FROM products WHERE id = ?", l.product_id)?.sku ?? null,
        l.name + (l.variant_name ? ` — ${l.variant_name}` : l.package_name ? ` — ${l.package_name}` : ""),
        l.qty,
        disp(l.unit_price_cents),
        disp(l.unit_price_cents * l.qty),
        JSON.stringify(l.package_id ? { packageId: l.package_id, packageName: l.package_name } : {})
      );
      // decrement stock
      if (l.track_inventory) {
        if (l.variant_id) run("UPDATE product_variants SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?", l.qty, l.variant_id);
        run("UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?", l.qty, l.product_id);
        insert("INSERT INTO inventory_adjustments (product_id, delta, reason) VALUES (?, ?, 'order')", l.product_id, -l.qty);
      }
    }

    if (coupon) {
      const cid = q1<{ id: number }>("SELECT id FROM coupons WHERE code = ?", coupon.code)?.id;
      if (cid) run("UPDATE coupons SET times_used = times_used + 1 WHERE id = ?", cid);
    }

    // clear active lines (keep saved-for-later)
    run("DELETE FROM cart_items WHERE cart_id = ? AND saved_for_later = 0", cart.id);
    run("UPDATE carts SET coupon_code = NULL WHERE id = ?", cart.id);

    return { orderId, orderNumber, totalDispCents: disp(totals.totalUsd), kind };
  });
}

export function orderKind(types: string[]): "PHYSICAL" | "DIGITAL" | "SERVICE" | "MIXED" {
  const s = new Set(types.map((t) => (t === "DIGITAL_PRODUCT" || t === "DOWNLOADABLE_RESOURCE" ? "DIGITAL" : t === "SERVICE" || t === "SERVICE_PACKAGE" ? "SERVICE" : "PHYSICAL")));
  if (s.size === 1) return [...s][0] as any;
  return "MIXED";
}

/** Idempotently mark an order paid and trigger fulfillment side-effects. */
export function markOrderPaid(orderId: number, paymentId: number): boolean {
  const order = q1<any>("SELECT * FROM orders WHERE id = ?", orderId);
  if (!order) return false;
  if (order.status !== "PENDING_PAYMENT" && order.status !== "PAYMENT_PROCESSING" && order.status !== "PAYMENT_FAILED") {
    return false; // already handled — duplicate webhook protection
  }
  return tx(() => {
    run("UPDATE orders SET status = ?, paid_at = ?, updated_at = ? WHERE id = ?", paidNextStatus(order.kind), nowIso(), nowIso(), orderId);
    run("UPDATE payments SET status = 'SUCCESS', verified = 1, resolved_at = ?, raw_json = COALESCE(raw_json,'{}') WHERE id = ?", nowIso(), paymentId);
    const items = q<any>("SELECT * FROM order_items WHERE order_id = ?", orderId);
    for (const item of items) {
      run("UPDATE products SET sales_count = sales_count + ? WHERE id = ?", item.qty, item.product_id);
      if (item.product_type === "DIGITAL_PRODUCT" || item.product_type === "DOWNLOADABLE_RESOURCE") {
        grantDigitalAccess(order, item);
      } else if (item.product_type === "SERVICE" || item.product_type === "SERVICE_PACKAGE") {
        createProjectForItem(order, item);
      }
    }
    sendEmail(order.email, "order_confirmation", {
      name: order.email.split("@")[0],
      orderNumber: order.order_number,
      total: formatMoney(order.total_cents, order.currency),
    });
    if (items.some((i) => i.product_type === "DIGITAL_PRODUCT" || i.product_type === "DOWNLOADABLE_RESOURCE")) {
      sendEmail(order.email, "digital_delivery", { orderNumber: order.order_number });
    }
    track("purchase", { order: order.order_number, totalUsd: Math.round(order.total_cents / order.fx_rate), kind: order.kind });
    return true;
  });
}

function paidNextStatus(kind: string): string {
  // Physical orders move to fulfillment; digital/service orders stay PAID until
  // their own flows progress them.
  if (kind === "PHYSICAL") return "FULFILLMENT_PENDING";
  return "PAID";
}

export function transitionOrder(orderId: number, to: string): void {
  const o = q1<{ status: string }>("SELECT status FROM orders WHERE id = ?", orderId);
  if (!o) throw new ApiError(404, "Order not found.");
  if (o.status === to) return;
  if (!canTransition(ORDER_TRANSITIONS, o.status, to)) {
    throw new ApiError(400, `Cannot move order from ${o.status} to ${to}.`);
  }
  const extra =
    to === "COMPLETED" ? ", completed_at = datetime('now')" : to === "CANCELLED" ? ", cancelled_at = datetime('now')" : "";
  run(`UPDATE orders SET status = ?, updated_at = datetime('now') ${extra} WHERE id = ?`, to, orderId);
}

function grantDigitalAccess(order: any, item: any) {
  const product = q1<any>("SELECT * FROM products WHERE id = ?", item.product_id);
  if (!product) return;
  const existing = q1("SELECT id FROM digital_entitlements WHERE order_item_id = ?", item.id);
  if (existing) return;
  const expiresAt = product.digital_expiry_days
    ? new Date(Date.now() + product.digital_expiry_days * 864e5).toISOString().replace("T", " ").slice(0, 19)
    : null;
  insert(
    `INSERT INTO digital_entitlements (order_id, order_item_id, product_id, user_id, email, token, download_limit, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    order.id,
    item.id,
    item.product_id,
    order.user_id,
    order.email,
    randomToken(24),
    product.digital_download_limit ?? 10,
    expiresAt
  );
}

function createProjectForItem(order: any, item: any) {
  const existing = q1("SELECT id FROM projects WHERE order_item_id = ?", item.id);
  if (existing) return;
  const reference = refNumber("PRJ");
  const pid = insert(
    `INSERT INTO projects (reference, order_id, order_item_id, product_id, package_id, user_id, email, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'REQUIREMENTS_PENDING')`,
    reference,
    order.id,
    item.id,
    item.product_id,
    (() => {
      try {
        return JSON.parse(item.meta_json || "{}").packageId ?? null;
      } catch {
        return null;
      }
    })(),
    order.user_id,
    order.email
  );
  const milestones = ["Requirements review", "Design & build", "Review & revisions", "Launch"];
  milestones.forEach((m) => insert("INSERT INTO project_milestones (project_id, title) VALUES (?, ?)", pid, m));
  insert("INSERT INTO project_messages (project_id, sender_type, sender_name, body) VALUES (?, 'team', 'FEMZYK Team', ?)", pid,
    "Welcome! Your project has been received. Please share your requirements below and we'll get started.");
  sendEmail(order.email, "service_confirmation", { reference, name: order.email.split("@")[0] });
}

export function findOrderForTracking(orderNumber: string, email: string) {
  return q1<any>(
    "SELECT * FROM orders WHERE order_number = ? COLLATE NOCASE AND email = ? COLLATE NOCASE",
    orderNumber.trim(),
    email.trim().toLowerCase()
  );
}
