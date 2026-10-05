import { q, q1, run } from "../db";
import { parseJson } from "../util";

export interface ProductRow {
  id: number;
  type_code: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  short_description: string | null;
  description: string | null;
  price_cents: number;
  compare_at_cents: number | null;
  currency: string;
  track_inventory: number;
  stock_qty: number;
  allow_backorder: number;
  requires_shipping: number;
  status: string;
  is_featured: number;
  is_bestseller: number;
  is_new: number;
  rating_avg: number | null;
  rating_count: number | null;
  image: string | null;
  image_alt: string | null;
  category_slugs: string;
  category_names: string;
  sales_count: number;
  publish_at: string | null;
  created_at: string;
  // full rows also carry the rest; typed loosely where needed
  [key: string]: unknown;
}

export interface ProductFilters {
  category?: string;
  type?: string;
  q?: string;
  min?: number;
  max?: number;
  tag?: string;
  inStock?: boolean;
  featured?: boolean;
  sort?: "featured" | "new" | "price-asc" | "price-desc" | "bestselling" | "name";
  page?: number;
  perPage?: number;
}

const LIST_SELECT = `
  SELECT p.id, p.type_code, p.sku, p.slug, p.name, p.brand, p.short_description,
         p.price_cents, p.compare_at_cents, p.currency, p.track_inventory, p.stock_qty,
         p.allow_backorder, p.requires_shipping, p.status, p.is_featured, p.is_bestseller,
         p.is_new, p.sales_count, p.publish_at, p.created_at,
         (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS rating_avg,
         (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS rating_count,
         (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image,
         (SELECT alt FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image_alt,
         GROUP_CONCAT(DISTINCT c.slug) AS category_slugs,
         GROUP_CONCAT(DISTINCT c.name) AS category_names
  FROM products p
  LEFT JOIN product_categories pc ON pc.product_id = p.id
  LEFT JOIN categories c ON c.id = pc.category_id
`;

function buildWhere(f: ProductFilters): { where: string; params: unknown[] } {
  const cond: string[] = ["p.status = 'published'", "(p.publish_at IS NULL OR p.publish_at <= datetime('now'))"];
  const params: unknown[] = [];
  if (f.category) {
    cond.push(`(c.slug = ? OR EXISTS (SELECT 1 FROM categories sub WHERE sub.parent_id = c.id AND sub.slug = ?) OR EXISTS (
      SELECT 1 FROM product_categories pc2 JOIN categories c2 ON c2.id = pc2.category_id
      WHERE pc2.product_id = p.id AND (c2.slug = ? OR c2.parent_id IN (SELECT id FROM categories WHERE slug = ?))))`);
    params.push(f.category, f.category, f.category, f.category);
  }
  if (f.type) {
    cond.push("p.type_code = ?");
    params.push(f.type);
  }
  if (f.q) {
    cond.push("(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.tags_json LIKE ?)");
    const like = `%${f.q}%`;
    params.push(like, like, like, like, like, like);
  }
  if (f.min != null) {
    cond.push("p.price_cents >= ?");
    params.push(f.min * 100);
  }
  if (f.max != null) {
    cond.push("p.price_cents <= ?");
    params.push(f.max * 100);
  }
  if (f.tag) {
    cond.push("p.tags_json LIKE ?");
    params.push(`%"${f.tag}"%`);
  }
  if (f.inStock) cond.push("(p.track_inventory = 0 OR p.stock_qty > 0 OR p.allow_backorder = 1)");
  if (f.featured) cond.push("p.is_featured = 1");
  return { where: cond.length ? "WHERE " + cond.join(" AND ") : "", params };
}

const SORTS: Record<string, string> = {
  featured: "ORDER BY p.is_featured DESC, p.sales_count DESC, p.created_at DESC",
  new: "ORDER BY COALESCE(p.publish_at, p.created_at) DESC",
  "price-asc": "ORDER BY p.price_cents ASC",
  "price-desc": "ORDER BY p.price_cents DESC",
  bestselling: "ORDER BY p.sales_count DESC, p.created_at DESC",
  name: "ORDER BY p.name ASC",
};

export function listProducts(f: ProductFilters = {}): { items: ProductRow[]; total: number; page: number; pages: number } {
  const page = Math.max(1, f.page ?? 1);
  const perPage = Math.min(60, f.perPage ?? 24);
  const { where, params } = buildWhere(f);
  const sort = SORTS[f.sort ?? "featured"] ?? SORTS.featured;
  const groupBy = "GROUP BY p.id";
  const total = (q1<{ c: number }>(`SELECT COUNT(DISTINCT p.id) AS c FROM products p LEFT JOIN product_categories pc ON pc.product_id = p.id LEFT JOIN categories c ON c.id = pc.category_id ${where}`, ...params)?.c ?? 0);
  const items = q<ProductRow>(`${LIST_SELECT} ${where} ${groupBy} ${sort} LIMIT ? OFFSET ?`, ...params, perPage, (page - 1) * perPage);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function getProductBySlug(slug: string) {
  const p = q1<any>(`SELECT p.*, 
      (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.status='approved') AS rating_avg,
      (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status='approved') AS rating_count
    FROM products p WHERE p.slug = ?`, slug);
  if (!p) return null;
  p.images = q("SELECT url, alt, role FROM product_images WHERE product_id = ? ORDER BY position", p.id);
  p.videos = q("SELECT url, poster FROM product_videos WHERE product_id = ? ORDER BY position", p.id);
  p.variants = q("SELECT id, sku, name, options_json, price_delta_cents, stock_qty FROM product_variants WHERE product_id = ? AND is_active = 1", p.id);
  p.categories = q(
    `SELECT c.slug, c.name FROM product_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.product_id = ?`,
    p.id
  );
  p.specs = parseJson(p.specs_json, [] as any[]);
  p.features = parseJson(p.features_json, [] as any[]);
  p.faqs = parseJson(p.faq_json, [] as any[]);
  p.included = parseJson(p.included_json, [] as any[]);
  p.care = parseJson(p.care_json, [] as any[]);
  p.tags = parseJson(p.tags_json, [] as string[]);
  p.serviceIncluded = parseJson(p.service_included_json, [] as any[]);
  p.serviceExcluded = parseJson(p.service_excluded_json, [] as any[]);
  p.serviceProcess = parseJson(p.service_process_json, [] as any[]);
  p.serviceRequirements = parseJson(p.service_requirements_json, [] as any[]);
  if (p.type_code === "SERVICE" || p.type_code === "SERVICE_PACKAGE") {
    p.packages = q("SELECT * FROM service_packages WHERE product_id = ? ORDER BY position", p.id);
  }
  return p;
}

export function getProductById(id: number) {
  return q1<any>("SELECT * FROM products WHERE id = ?", id);
}

export function incrementViews(id: number) {
  run("UPDATE products SET views = views + 1 WHERE id = ?", id);
}

/** Rule-based recommendations: same category family, then same type. */
export function relatedProducts(p: any, limit = 4): ProductRow[] {
  const catSlugs: string[] = (p.categories ?? []).map((c: any) => c.slug);
  if (catSlugs.length) {
    const res = listProducts({ category: catSlugs[0], perPage: limit + 1, sort: "bestselling" });
    const items = res.items.filter((x) => x.id !== p.id);
    if (items.length >= limit) return items.slice(0, limit);
  }
  const res = listProducts({ type: p.type_code, perPage: limit + 1, sort: "bestselling" });
  return res.items.filter((x) => x.id !== p.id).slice(0, limit);
}

/** Frequently bought together: products most often appearing in the same orders. */
export function boughtTogether(productId: number, limit = 3): ProductRow[] {
  const rows = q<any>(
    `SELECT p2.id, COUNT(DISTINCT oi1.order_id) AS co
     FROM order_items oi1
     JOIN order_items oi2 ON oi2.order_id = oi1.order_id AND oi2.product_id != oi1.product_id
     JOIN products p2 ON p2.id = oi2.product_id AND p2.status = 'published'
     WHERE oi1.product_id = ?
     GROUP BY p2.id ORDER BY co DESC LIMIT ?`,
    productId,
    limit
  );
  if (rows.length === 0) return relatedProducts({ id: productId, type_code: q1("SELECT type_code FROM products WHERE id = ?", productId)?.["type_code"], categories: [] }, limit);
  const ids = rows.map((r) => r.id).join(",");
  return q<ProductRow>(
    `${LIST_SELECT} WHERE p.id IN (${ids}) GROUP BY p.id`
  );
}

export function getCategory(slug: string) {
  return q1<any>(
    `SELECT c.*, (SELECT slug FROM categories WHERE id = c.parent_id) AS parent_slug,
            (SELECT name FROM categories WHERE id = c.parent_id) AS parent_name
     FROM categories c WHERE c.slug = ? AND c.is_active = 1`,
    slug
  );
}

export function listCategories(parentSlug: string | null = null) {
  if (parentSlug === null) {
    return q<any>("SELECT * FROM categories WHERE parent_id IS NULL AND is_active = 1 ORDER BY position, name");
  }
  return q<any>(
    "SELECT * FROM categories WHERE parent_id = (SELECT id FROM categories WHERE slug = ?) AND is_active = 1 ORDER BY position, name",
    parentSlug
  );
}

export function menuTree() {
  const roots = q<any>("SELECT * FROM categories WHERE parent_id IS NULL AND is_active = 1 ORDER BY position");
  const children = q<any>("SELECT * FROM categories WHERE parent_id IS NOT NULL AND is_active = 1 ORDER BY position");
  return roots.map((r) => ({ ...r, children: children.filter((c) => c.parent_id === r.id) }));
}

export function getCollection(slug: string) {
  const col = q1<any>("SELECT * FROM collections WHERE slug = ? AND is_active = 1", slug);
  if (!col) return null;
  const manual = q<any>(
    `SELECT p.id FROM collection_products cp JOIN products p ON p.id = cp.product_id AND p.status='published'
     WHERE cp.collection_id = ? ORDER BY cp.position`,
    col.id
  );
  const rule = parseJson<any>(col.rule_json, {});
  let items: ProductRow[];
  if (rule.type) items = listProducts({ type: rule.type, perPage: rule.limit ?? 12, sort: rule.sort ?? "featured" }).items;
  else if (rule.tag) items = listProducts({ tag: rule.tag, perPage: rule.limit ?? 12 }).items;
  else if (rule.maxPrice) items = listProducts({ max: rule.maxPrice, perPage: rule.limit ?? 12, sort: "bestselling" }).items;
  else if (manual.length) {
    const ids = manual.map((m) => m.id).join(",");
    items = q<ProductRow>(`${LIST_SELECT} WHERE p.id IN (${ids}) AND p.status='published' GROUP BY p.id`);
  } else items = listProducts({ perPage: rule.limit ?? 12 }).items;
  return { ...col, items };
}

export function listCollections() {
  return q<any>("SELECT * FROM collections WHERE is_active = 1 ORDER BY position");
}
