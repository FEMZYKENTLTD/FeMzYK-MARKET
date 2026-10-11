import { cookies } from "next/headers";
import { insert, q, q1, run, nowIso, randomToken } from "./db";
import { ApiError } from "./auth";
import { getProductById } from "./repo/catalog";
import { convertCents, BASE_CURRENCY, getCurrencies } from "./money";
import { getActiveDigitalFile, isDigitalType } from "./digital";
import { getSettings } from "./settings";

export const CART_COOKIE = "fm_cart";

export interface CartLine {
  id: number;
  product_id: number;
  variant_id: number | null;
  package_id?: number | null;
  package_name?: string | null;
  qty: number;
  saved_for_later: number;
  slug: string;
  name: string;
  type_code: string;
  image: string | null;
  image_alt: string | null;
  unit_price_cents: number; // base USD
  compare_at_cents: number | null;
  stock_qty: number;
  track_inventory: number;
  allow_backorder: number;
  requires_shipping: number;
  variant_name: string | null;
  unavailable: boolean;
  in_stock: boolean;
}

export async function getCartToken(): Promise<string | undefined> {
  return (await cookies()).get(CART_COOKIE)?.value;
}

export async function getOrCreateCartId(): Promise<number> {
  const token = await getCartToken();
  if (token) {
    const c = q1<{ id: number }>("SELECT id FROM carts WHERE token = ?", token);
    if (c) return c.id;
  }
  const t = randomToken(16);
  const id = insert("INSERT INTO carts (token) VALUES (?)", t);
  (await cookies()).set(CART_COOKIE, t, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400 * 90 });
  return id;
}

export async function addToCart(productId: number, variantId: number | null, qty: number, packageId: number | null = null): Promise<void> {
  const p = getProductById(productId);
  if (!p || p.status !== "published") throw new ApiError(400, "This product is currently unavailable.");
  if (isDigitalType(p.type_code) && !getActiveDigitalFile(productId)) {
    throw new ApiError(409, "This digital download is being prepared and cannot be purchased yet. Please check back soon or contact support.");
  }
  qty = Math.max(1, Math.min(99, Math.floor(qty)));
  if (p.type_code === "SERVICE" || p.type_code === "SERVICE_PACKAGE") {
    const packageCount = q1<{ count: number }>("SELECT COUNT(*) AS count FROM service_packages WHERE product_id = ?", productId)?.count ?? 0;
    if (packageId) {
      const pkg = q1("SELECT id FROM service_packages WHERE id = ? AND product_id = ?", packageId, productId);
      if (!pkg) throw new ApiError(400, "That package is not available for this service.");
    } else if (packageCount > 0 || p.service_quote_type !== "fixed") {
      throw new ApiError(409, "A configured service package or fixed price is required before checkout.");
    }
  }
  if (p.track_inventory && !p.allow_backorder) {
    const avail = variantId
      ? q1<{ stock_qty: number }>("SELECT stock_qty FROM product_variants WHERE id = ? AND product_id = ?", variantId, productId)?.stock_qty ?? 0
      : p.stock_qty;
    const token = await getCartToken();
    const already = token
      ? q1<{ qty: number }>(
          "SELECT qty FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.token = ? AND ci.product_id = ? AND ci.variant_id IS ?",
          token,
          productId,
          variantId ?? null
        )?.qty ?? 0
      : 0;
    if (already + qty > avail) throw new ApiError(409, "We don't have enough stock for that quantity right now.");
  }
  const cartId = await getOrCreateCartId();
  const meta = JSON.stringify(packageId ? { packageId } : {});
  const existing = q1<{ id: number; qty: number }>(
    "SELECT id, qty FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id IS ? AND saved_for_later = 0 ORDER BY id LIMIT 1",
    cartId,
    productId,
    variantId
  );
  if (existing) {
    run("UPDATE cart_items SET qty = MIN(99, ? + ?), meta_json = ? WHERE id = ?", existing.qty, qty, meta, existing.id);
  } else {
    insert("INSERT INTO cart_items (cart_id, product_id, variant_id, qty, meta_json) VALUES (?, ?, ?, ?, ?)", cartId, productId, variantId, qty, meta);
  }
  run("UPDATE carts SET updated_at = ? WHERE id = ?", nowIso(), cartId);
}

export async function activeCouponState() {
  const token = await getCartToken();
  if (!token) return null;
  const cart = q1<{ id: number; coupon_code: string | null }>("SELECT id, coupon_code FROM carts WHERE token = ?", token);
  if (!cart?.coupon_code) return { coupon: null };
  try {
    return { coupon: validateCoupon(cart.coupon_code, 10 ** 12) };
  } catch {
    return { coupon: null };
  }
}

export function cartLines(cartId: number, includeSaved = false): CartLine[] {
  const rows = q<any>(
    `SELECT ci.id, ci.product_id, ci.variant_id, ci.qty, ci.saved_for_later, ci.meta_json,
            p.slug, p.name, p.type_code, p.price_cents, p.compare_at_cents, p.stock_qty,
            p.track_inventory, p.allow_backorder, p.requires_shipping, p.status,
            pv.name AS variant_name, pv.price_delta_cents, pv.stock_qty AS variant_stock,
            sp.name AS package_name, sp.price_cents AS package_price_cents,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image,
            (SELECT alt FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image_alt
     FROM cart_items ci
     JOIN carts c ON c.id = ci.cart_id
     JOIN products p ON p.id = ci.product_id
     LEFT JOIN product_variants pv ON pv.id = ci.variant_id
     LEFT JOIN service_packages sp ON sp.id = json_extract(ci.meta_json, '$.packageId')
     WHERE ci.cart_id = ? ${includeSaved ? "" : "AND ci.saved_for_later = 0"}
     ORDER BY ci.added_at DESC`,
    cartId
  );
  return rows.map((r) => {
    const pkgId = r.meta_json ? (JSON.parse(r.meta_json) as any).packageId ?? null : null;
    const unit = r.package_price_cents != null && pkgId ? r.package_price_cents : r.price_cents + (r.price_delta_cents ?? 0);
    const inStock = !r.track_inventory || r.allow_backorder || (r.variant_id ? r.variant_stock : r.stock_qty) > 0;
    return {
      id: r.id,
      product_id: r.product_id,
      variant_id: r.variant_id,
      package_id: pkgId,
      package_name: r.package_name ?? null,
      qty: r.qty,
      saved_for_later: r.saved_for_later,
      slug: r.slug,
      name: r.name,
      type_code: r.type_code,
      image: r.image,
      image_alt: r.image_alt ?? r.name,
      unit_price_cents: unit,
      compare_at_cents: r.compare_at_cents,
      stock_qty: r.variant_id ? r.variant_stock : r.stock_qty,
      track_inventory: r.track_inventory,
      allow_backorder: r.allow_backorder,
      requires_shipping: r.requires_shipping,
      variant_name: r.variant_name,
      unavailable: r.status !== "published",
      in_stock: inStock,
    };
  });
}

export interface CouponState {
  code: string;
  type: "percent" | "fixed";
  value_cents: number;
  label: string;
}

export function validateCoupon(code: string, subtotalCents: number): CouponState {
  const c = q1<any>(
    `SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND is_active = 1
     AND (starts_at IS NULL OR starts_at <= datetime('now')) AND (ends_at IS NULL OR ends_at >= datetime('now'))`,
    code.trim()
  );
  if (!c) throw new ApiError(404, "That coupon code isn't valid.");
  if ((c.usage_limit ?? 0) > 0 && c.times_used >= c.usage_limit) throw new ApiError(404, "That coupon code has expired.");
  if ((c.min_subtotal_cents ?? 0) > subtotalCents) {
    throw new ApiError(400, `This code needs a subtotal of at least $${(c.min_subtotal_cents / 100).toFixed(2)}.`);
  }
  return { code: c.code, type: c.type, value_cents: c.value_cents, label: c.type === "percent" ? `${c.value_cents / 100}% off` : `$${(c.value_cents / 100).toFixed(2)} off` };
}

export function couponDiscount(coupon: CouponState | null, subtotalCents: number): number {
  if (!coupon) return 0;
  return coupon.type === "percent" ? Math.round((subtotalCents * coupon.value_cents) / 10000) : Math.min(coupon.value_cents, subtotalCents);
}

export interface ShippingQuote {
  zoneCode: string;
  zoneName: string;
  methodName: string;
  priceCentsUsd: number;
  minDays: number;
  maxDays: number;
  freeThresholdCents: number | null;
}

export function quoteShipping(countryCode: string, subtotalCentsUsd: number): ShippingQuote | null {
  const zones = q<any>("SELECT * FROM shipping_zones WHERE is_active = 1");
  let zone = zones.find((z) => JSON.parse(z.countries_json).includes(countryCode));
  if (!zone) zone = zones.find((z) => JSON.parse(z.countries_json).includes("*"));
  if (!zone) return null;
  const methods = q<any>("SELECT * FROM shipping_methods WHERE zone_id = ? AND is_active = 1 ORDER BY price_cents", zone.id);
  if (!methods.length) return null;
  const m = methods[0];
  const free = m.free_threshold_cents != null && subtotalCentsUsd >= m.free_threshold_cents;
  return {
    zoneCode: zone.code,
    zoneName: zone.name,
    methodName: m.name,
    priceCentsUsd: free ? 0 : m.price_cents,
    minDays: m.min_days,
    maxDays: m.max_days,
    freeThresholdCents: m.free_threshold_cents,
  };
}

export async function cartTotals(currency: string, opts?: { country?: string; coupon?: CouponState | null }) {
  if (!getCurrencies()[currency]) throw new ApiError(400, "That currency is not enabled for checkout.");
  const token = await getCartToken();
  const cart = token ? q1<{ id: number }>("SELECT id FROM carts WHERE token = ?", token) : null;
  const lines = cart ? cartLines(cart.id) : [];
  const subtotalUsd = lines.reduce((s, l) => s + l.unit_price_cents * l.qty, 0);
  const needsShipping = lines.some((l) => l.requires_shipping);
  const coupon = opts?.coupon === undefined ? await activeCoupon() : opts.coupon;
  const discountUsd = couponDiscount(coupon, subtotalUsd);
  const shipping = needsShipping && opts?.country ? quoteShipping(opts.country, subtotalUsd - discountUsd) : null;
  const shippingUsd = shipping?.priceCentsUsd ?? 0;
  const taxRate = taxRateFor(opts?.country);
  const taxUsd = Math.round((subtotalUsd - discountUsd) * taxRate);
  const totalUsd = subtotalUsd - discountUsd + shippingUsd + taxUsd;
  const rate = currency === BASE_CURRENCY ? 1 : convertCents(100, currency) / 100;
  const subtotalDisp = lines.reduce((sum, line) => sum + convertCents(line.unit_price_cents * line.qty, currency), 0);
  const discountDisp = convertCents(discountUsd, currency);
  const shippingDisp = convertCents(shippingUsd, currency);
  const taxDisp = convertCents(taxUsd, currency);
  const totalDisp = subtotalDisp - discountDisp + shippingDisp + taxDisp;
  return {
    lines,
    currency,
    fxRate: rate,
    subtotalUsd,
    discountUsd,
    shippingUsd,
    shipping,
    taxUsd,
    taxRate,
    totalUsd,
    needsShipping,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotalDisp,
    discountDisp,
    shippingDisp,
    taxDisp,
    totalDisp,
    freeThresholdUsd: shipping?.freeThresholdCents ?? null,
  };
}

export function taxRateFor(country?: string): number {
  // Admin-configured percentage rates. Default zero is explicit, not an inferred tax calculation.
  if (!country) return 0;
  const rates = getSettings<Record<string, number>>("tax_rates", { US: 0, CA: 0, GB: 0, NG: 0 });
  const percentage = Number(rates[country] ?? 0);
  return Number.isFinite(percentage) && percentage >= 0 ? percentage / 100 : 0;
}

async function activeCoupon(): Promise<CouponState | null> {
  const token = await getCartToken();
  if (!token) return null;
  const cart = q1<{ id: number; coupon_code: string | null }>("SELECT id, coupon_code FROM carts WHERE token = ?", token);
  if (!cart?.coupon_code) return null;
  try {
    return validateCoupon(cart.coupon_code, 10 ** 12);
  } catch {
    return null;
  }
}

export async function clearCart(): Promise<void> {
  const token = await getCartToken();
  if (!token) return;
  const cart = q1<{ id: number }>("SELECT id FROM carts WHERE token = ?", token);
  if (cart) {
    run("DELETE FROM cart_items WHERE cart_id = ? AND saved_for_later = 0", cart.id);
    run("UPDATE carts SET coupon_code = NULL WHERE id = ?", cart.id);
  }
}
