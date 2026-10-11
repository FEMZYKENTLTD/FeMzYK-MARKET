import { insert, q, q1, run, nowIso, randomToken, refNumber, tx } from "./db";
import { ApiError } from "./auth";
import { cartLines, getCartToken, cartTotals, CouponState } from "./cart";
import { convertCents } from "./money";
import { sendEmail } from "./email";
import { track } from "./analytics";
import { canTransition, ORDER_TRANSITIONS } from "./statemachine";
import { formatMoney } from "./money";
import { getActiveDigitalFile, isDigitalType } from "./digital";

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

export async function createOrder(input: CheckoutInput): Promise<{ orderId: number; orderNumber: string; totalDispCents: number; kind: string }> {
  const token = await getCartToken();
  const cart = token ? q1<{ id: number }>("SELECT id FROM carts WHERE token = ?", token) : null;
  if (!cart) throw new ApiError(400, "Your cart is empty.");
  const rawLines = cartLines(cart.id);
  if (!rawLines.length) throw new ApiError(400, "Your cart is empty.");
  // SQLite UNIQUE indexes treat NULL variants as distinct; coalesce legacy duplicate rows before checkout.
  const grouped = new Map<string, (typeof rawLines)[number]>();
  for (const line of rawLines) {
    const key = `${line.product_id}:${line.variant_id ?? "none"}:${line.package_id ?? "none"}`;
    const existing = grouped.get(key);
    if (existing) existing.qty += line.qty;
    else grouped.set(key, { ...line });
  }
  const lines = [...grouped.values()];
  if (lines.some((line) => line.requires_shipping) && !input.address) {
    throw new ApiError(400, "A delivery address is required for the physical items in your cart.");
  }
  for (const line of lines) {
    if (line.unavailable) throw new ApiError(409, `“${line.name}” is no longer available. Remove it from your cart to continue.`);
    if (isDigitalType(line.type_code) && !getActiveDigitalFile(line.product_id)) {
      throw new ApiError(409, `“${line.name}” is not ready for digital delivery yet. Remove it from your cart or contact support.`);
    }
  }

  let coupon: CouponState | null = null;
  if (input.couponCode) {
    const { validateCoupon } = require("./cart");
    const subtotalUsd = lines.reduce((s, l) => s + l.unit_price_cents * l.qty, 0);
    coupon = validateCoupon(input.couponCode, subtotalUsd);
  }
  const totals = await cartTotals(input.currency, { country: input.country, coupon });
  if (totals.needsShipping && !totals.shipping) {
    throw new ApiError(409, `Shipping is not configured for ${input.country || "this destination"} yet. Your cart is unchanged; please contact support.`);
  }

  const kind = orderKind(lines.map((l) => l.type_code));
  const rate = totals.fxRate;
  const disp = (usd: number) => convertCents(usd, input.currency);

  return tx(() => {
    // Validate stock atomically
    for (const l of lines) {
      if (l.track_inventory && !l.allow_backorder) {
        const avail = l.variant_id
          ? q1<{ stock_qty: number }>("SELECT stock_qty FROM product_variants WHERE id = ?", l.variant_id)?.stock_qty ?? 0
          : q1<{ stock_qty: number }>("SELECT stock_qty FROM products WHERE id = ?", l.product_id)?.stock_qty ?? 0;
        if (avail < l.qty) throw new ApiError(409, `"${l.name}" has limited stock available. Please adjust the quantity.`);
      }
    }

    const orderNumber = refNumber("FM");
    const confirmationToken = randomToken(32);
    const orderId = insert(
      `INSERT INTO orders (order_number, user_id, email, status, kind, currency, fx_rate,
        subtotal_cents, shipping_cents, tax_cents, discount_cents, total_cents, coupon_code,
        shipping_address_json, shipping_zone, shipping_method, est_delivery_min_days, est_delivery_max_days,
        customer_note, ip, cart_id, confirmation_token)
       VALUES (?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      orderNumber,
      input.userId ?? null,
      input.email.trim().toLowerCase(),
      kind,
      input.currency,
      rate,
      totals.subtotalDisp,
      totals.shippingDisp,
      totals.taxDisp,
      totals.discountDisp,
      totals.totalDisp,
      coupon?.code ?? null,
      input.address ? JSON.stringify(input.address) : null,
      totals.shipping?.zoneCode ?? null,
      totals.shipping?.methodName ?? null,
      totals.shipping?.minDays ?? null,
      totals.shipping?.maxDays ?? null,
      input.customerNote ?? null,
      input.ip ?? null,
      cart.id,
      confirmationToken
    );

    for (const l of lines) {
      const avail = l.variant_id
        ? q1<{ stock_qty: number }>("SELECT stock_qty FROM product_variants WHERE id = ?", l.variant_id)?.stock_qty ?? 0
        : q1<{ stock_qty: number }>("SELECT stock_qty FROM products WHERE id = ?", l.product_id)?.stock_qty ?? 0;
      const reservedQty = l.track_inventory ? Math.min(avail, l.qty) : 0;
      const metadata = {
        ...(l.package_id ? { packageId: l.package_id, packageName: l.package_name } : {}),
        inventoryReservedQty: reservedQty,
        inventoryState: reservedQty > 0 ? "reserved" : "none",
      };
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
        JSON.stringify(metadata)
      );
      // Reserve only real on-hand units; backorders do not fabricate inventory.
      if (reservedQty > 0) {
        if (l.variant_id) run("UPDATE product_variants SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?", reservedQty, l.variant_id);
        run("UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?", reservedQty, l.product_id);
        insert("INSERT INTO inventory_adjustments (product_id, delta, reason) VALUES (?, ?, 'order-reservation')", l.product_id, -reservedQty);
      }
    }

    if (coupon) {
      const cid = q1<{ id: number }>("SELECT id FROM coupons WHERE code = ?", coupon.code)?.id;
      if (cid) run("UPDATE coupons SET times_used = times_used + 1 WHERE id = ?", cid);
    }

    // clear active lines (keep saved-for-later)
    run("DELETE FROM cart_items WHERE cart_id = ? AND saved_for_later = 0", cart.id);
    run("UPDATE carts SET coupon_code = NULL WHERE id = ?", cart.id);

    return { orderId, orderNumber, totalDispCents: totals.totalDisp, kind };
  });
}

export function orderKind(types: string[]): "PHYSICAL" | "DIGITAL" | "SERVICE" | "MIXED" {
  const s = new Set(types.map((t) => (t === "DIGITAL_PRODUCT" || t === "DOWNLOADABLE_RESOURCE" ? "DIGITAL" : t === "SERVICE" || t === "SERVICE_PACKAGE" ? "SERVICE" : "PHYSICAL")));
  if (s.size === 1) return [...s][0] as any;
  return "MIXED";
}

/**
 * A terminal failure/cancellation releases any on-hand units reserved when the
 * order was created and restores the original cart exactly once. A verified
 * late payment can still be reconciled without duplicating the release.
 */
export function releaseOrderReservation(orderId: number): void {
  tx(() => releaseOrderReservationInTx(orderId));
}

function releaseOrderReservationInTx(orderId: number): void {
  const order = q1<any>("SELECT * FROM orders WHERE id = ?", orderId);
  if (!order) return;
  const items = q<any>("SELECT id, product_id, variant_id, qty, meta_json FROM order_items WHERE order_id = ?", orderId);

  for (const item of items) {
    let meta: any = {};
    try { meta = JSON.parse(item.meta_json || "{}"); } catch { meta = {}; }
    const reserved = Number(meta.inventoryReservedQty || 0);
    if (meta.inventoryState === "reserved" && reserved > 0 && item.product_id) {
      if (item.variant_id) run("UPDATE product_variants SET stock_qty = stock_qty + ? WHERE id = ?", reserved, item.variant_id);
      run("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?", reserved, item.product_id);
      insert("INSERT INTO inventory_adjustments (product_id, delta, reason) VALUES (?, ?, 'order-reservation-released')", item.product_id, reserved);
      meta.inventoryState = "released";
      run("UPDATE order_items SET meta_json = ? WHERE id = ?", JSON.stringify(meta), item.id);
    }
  }

  if (order.cart_restored) return;
  if (order.cart_id) {
    for (const item of items) {
      if (!item.product_id) continue;
      let meta: any = {};
      try { meta = JSON.parse(item.meta_json || "{}"); } catch { meta = {}; }
      const existing = q1<{ id: number; qty: number }>(
        "SELECT id, qty FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id IS ? AND saved_for_later = 0 ORDER BY id LIMIT 1",
        order.cart_id, item.product_id, item.variant_id ?? null
      );
      const cartMeta = JSON.stringify(meta.packageId ? { packageId: meta.packageId } : {});
      if (existing) {
        run("UPDATE cart_items SET qty = MIN(99, qty + ?), meta_json = ? WHERE id = ?", item.qty, cartMeta, existing.id);
      } else {
        insert("INSERT INTO cart_items (cart_id, product_id, variant_id, qty, meta_json) VALUES (?, ?, ?, ?, ?)",
          order.cart_id, item.product_id, item.variant_id ?? null, Math.min(99, item.qty), cartMeta);
      }
    }
    if (order.coupon_code) run("UPDATE carts SET coupon_code = ? WHERE id = ?", order.coupon_code, order.cart_id);
  }
  if (order.coupon_code) run("UPDATE coupons SET times_used = MAX(0, times_used - 1) WHERE code = ?", order.coupon_code);
  run("UPDATE orders SET cart_restored = 1 WHERE id = ?", orderId);
}

/** Idempotently mark an order paid and trigger fulfillment side-effects. */
export function markOrderPaid(orderId: number, paymentId: number): boolean {
  return tx(() => {
    const order = q1<any>("SELECT * FROM orders WHERE id = ?", orderId);
    if (!order) return false;
    if (!["PENDING_PAYMENT", "PAYMENT_PROCESSING", "PAYMENT_FAILED"].includes(order.status)) return false;
    const nextStatus = paidNextStatus(order.kind);
    if (!canTransition(ORDER_TRANSITIONS, order.status, nextStatus)) return false;

    const items = q<any>("SELECT * FROM order_items WHERE order_id = ?", orderId);
    for (const item of items) {
      let meta: any = {};
      try { meta = JSON.parse(item.meta_json || "{}"); } catch { meta = {}; }

      // A delayed, verified success after a failure may arrive after inventory
      // was released. Re-reserve what's still on hand; leave any shortfall for
      // manual fulfillment rather than silently overselling stock.
      if (meta.inventoryState === "released" && item.product_id) {
        const product = q1<any>("SELECT stock_qty, track_inventory, allow_backorder FROM products WHERE id = ?", item.product_id);
        if (product?.track_inventory) {
          const available = item.variant_id
            ? q1<{ stock_qty: number }>("SELECT stock_qty FROM product_variants WHERE id = ?", item.variant_id)?.stock_qty ?? 0
            : product.stock_qty;
          const reserve = Math.min(available, item.qty);
          if (reserve > 0) {
            if (item.variant_id) run("UPDATE product_variants SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?", reserve, item.variant_id);
            run("UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?", reserve, item.product_id);
            insert("INSERT INTO inventory_adjustments (product_id, delta, reason) VALUES (?, ?, 'late-payment-reservation')", item.product_id, -reserve);
          }
          meta.inventoryReservedQty = reserve;
          meta.inventoryState = reserve < item.qty && !product.allow_backorder ? "exception" : "committed";
          meta.inventoryShortfallQty = Math.max(0, item.qty - reserve);
        } else {
          meta.inventoryState = "none";
        }
      } else if (meta.inventoryState === "reserved") {
        meta.inventoryState = "committed";
      }
      run("UPDATE order_items SET meta_json = ? WHERE id = ?", JSON.stringify(meta), item.id);
    }

    if (order.cart_restored && order.coupon_code) {
      run("UPDATE coupons SET times_used = times_used + 1 WHERE code = ?", order.coupon_code);
    }
    run("UPDATE orders SET status = ?, paid_at = ?, updated_at = ? WHERE id = ?", nextStatus, nowIso(), nowIso(), orderId);
    run("UPDATE payments SET status = 'SUCCESS', verified = 1, resolved_at = ?, raw_json = COALESCE(raw_json,'{}') WHERE id = ?", nowIso(), paymentId);
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
  tx(() => {
    const o = q1<any>("SELECT status, paid_at FROM orders WHERE id = ?", orderId);
    if (!o) throw new ApiError(404, "Order not found.");
    if (o.status === to) return;
    if (!canTransition(ORDER_TRANSITIONS, o.status, to)) {
      throw new ApiError(400, `Cannot move order from ${o.status} to ${to}.`);
    }
    if (!o.paid_at && (to === "PAYMENT_FAILED" || to === "CANCELLED")) {
      releaseOrderReservationInTx(orderId);
    }
    const extra =
      to === "COMPLETED" ? ", completed_at = datetime('now')" : to === "CANCELLED" ? ", cancelled_at = datetime('now')" : "";
    run(`UPDATE orders SET status = ?, updated_at = datetime('now') ${extra} WHERE id = ?`, to, orderId);
  });
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
