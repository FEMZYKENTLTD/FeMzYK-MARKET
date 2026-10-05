import { z } from "zod";
import { insert, q1 } from "@/lib/db";
import { slugify } from "@/lib/util";

/** Shared product create/update schema for the admin API. */
export const productSchema = z.object({
  type_code: z.string(),
  sku: z.string().min(2).max(40),
  slug: z.string().max(120).optional(),
  name: z.string().min(2).max(200),
  brand: z.string().max(80).optional(),
  short_description: z.string().max(600).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  price_cents: z.number().int().min(0),
  compare_at_cents: z.number().int().min(0).nullable().optional(),
  cost_cents: z.number().int().min(0).nullable().optional(),
  category_ids: z.array(z.number().int()).default([]),
  tags: z.array(z.string()).default([]),
  track_inventory: z.boolean().default(true),
  stock_qty: z.number().int().min(0).default(0),
  low_stock_threshold: z.number().int().min(0).default(5),
  allow_backorder: z.boolean().default(false),
  requires_shipping: z.boolean().default(true),
  weight_grams: z.number().int().min(0).nullable().optional(),
  status: z.enum(["draft", "published", "scheduled", "archived"]).default("draft"),
  publish_at: z.string().nullable().optional(),
  is_featured: z.boolean().default(false),
  is_bestseller: z.boolean().default(false),
  is_new: z.boolean().default(true),
  specs: z.array(z.tuple([z.string(), z.string()])).default([]),
  features: z.array(z.string()).default([]),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  included: z.array(z.string()).default([]),
  warranty_text: z.string().nullable().optional(),
  return_eligible: z.boolean().default(true),
  return_notes: z.string().nullable().optional(),
  // digital
  digital_file_type: z.string().nullable().optional(),
  digital_file_size: z.string().nullable().optional(),
  digital_version: z.string().nullable().optional(),
  digital_download_limit: z.number().int().min(1).nullable().optional(),
  digital_expiry_days: z.number().int().min(1).nullable().optional(),
  // service
  service_quote_type: z.enum(["fixed", "starting", "custom"]).nullable().optional(),
  service_delivery_min_days: z.number().int().min(0).nullable().optional(),
  service_delivery_max_days: z.number().int().min(0).nullable().optional(),
  service_revisions: z.number().int().min(0).nullable().optional(),
  service_included: z.array(z.string()).default([]),
  service_excluded: z.array(z.string()).default([]),
  service_process: z.array(z.tuple([z.string(), z.string()])).default([]),
  service_requirements: z.array(z.any()).default([]),
  // seo
  seo_title: z.string().max(160).nullable().optional(),
  seo_description: z.string().max(300).nullable().optional(),
  seo_keywords: z.string().nullable().optional(),
  supplier_id: z.number().int().nullable().optional(),
  supplier_sku: z.string().nullable().optional(),
  // media & variants
  images: z.array(z.object({ url: z.string(), alt: z.string().default(""), role: z.string().default("gallery") })).default([]),
  variants: z.array(z.object({ id: z.number().optional(), sku: z.string().optional(), name: z.string(), options: z.record(z.string()), price_delta_cents: z.number().int().default(0), stock_qty: z.number().int().min(0).default(0) })).default([]),
});

export function createProduct(data: z.infer<typeof productSchema>, _actorId: number): number {
  let slug = data.slug?.trim() ? slugify(data.slug) : slugify(data.name);
  let i = 2;
  const base = slug;
  while (q1("SELECT id FROM products WHERE slug = ?", slug)) slug = `${base}-${i++}`;
  if (q1("SELECT id FROM products WHERE sku = ?", data.sku)) throw { status: 400, message: "SKU already exists." };

  const type = q1<{ requires_shipping: number; has_inventory: number }>("SELECT requires_shipping, has_inventory FROM product_types WHERE code = ?", data.type_code);
  if (!type) throw { status: 400, message: "Unknown product type." };

  const id = insert(
    `INSERT INTO products (type_code, sku, slug, name, brand, short_description, description, price_cents, compare_at_cents, cost_cents,
      track_inventory, stock_qty, low_stock_threshold, allow_backorder, requires_shipping, weight_grams, status, publish_at,
      is_featured, is_bestseller, is_new, specs_json, features_json, faq_json, included_json, tags_json, warranty_text,
      return_eligible, return_notes, digital_file_type, digital_file_size, digital_version, digital_download_limit, digital_expiry_days,
      service_quote_type, service_delivery_min_days, service_delivery_max_days, service_revisions, service_included_json,
      service_excluded_json, service_process_json, service_requirements_json, seo_title, seo_description, seo_keywords, supplier_id, supplier_sku)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.type_code, data.sku, slug, data.name, data.brand || "FEMZYK", data.short_description ?? null, data.description ?? null,
    data.price_cents, data.compare_at_cents ?? null, data.cost_cents ?? null,
    type.has_inventory && data.track_inventory ? 1 : 0, data.stock_qty, data.low_stock_threshold, data.allow_backorder ? 1 : 0,
    type.requires_shipping && data.requires_shipping ? 1 : 0, data.weight_grams ?? null, data.status, data.publish_at ?? null,
    data.is_featured ? 1 : 0, data.is_bestseller ? 1 : 0, data.is_new ? 1 : 0,
    JSON.stringify(data.specs), JSON.stringify(data.features), JSON.stringify(data.faqs), JSON.stringify(data.included), JSON.stringify(data.tags),
    data.warranty_text ?? null, data.return_eligible ? 1 : 0, data.return_notes ?? null,
    data.digital_file_type ?? null, data.digital_file_size ?? null, data.digital_version ?? null, data.digital_download_limit ?? null, data.digital_expiry_days ?? null,
    data.service_quote_type ?? null, data.service_delivery_min_days ?? null, data.service_delivery_max_days ?? null, data.service_revisions ?? null,
    JSON.stringify(data.service_included), JSON.stringify(data.service_excluded), JSON.stringify(data.service_process), JSON.stringify(data.service_requirements),
    data.seo_title ?? null, data.seo_description ?? null, data.seo_keywords ?? null, data.supplier_id ?? null, data.supplier_sku ?? null
  );

  for (const cid of data.category_ids) insert("INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)", id, cid);
  data.images.forEach((img, pos) => insert("INSERT INTO product_images (product_id, url, alt, role, position) VALUES (?, ?, ?, ?, ?)", id, img.url, img.alt || data.name, img.role, pos));
  for (const v of data.variants) {
    insert("INSERT INTO product_variants (product_id, sku, name, options_json, price_delta_cents, stock_qty) VALUES (?, ?, ?, ?, ?, ?)", id, v.sku || `${data.sku}-${slugify(v.name)}`.toUpperCase(), v.name, JSON.stringify(v.options), v.price_delta_cents, v.stock_qty);
  }
  return id;
}
