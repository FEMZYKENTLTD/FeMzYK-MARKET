import { MetadataRoute } from "next";
import { q } from "@/lib/db";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    "", "/shop/all", "/services", "/digital", "/collections", "/about", "/contact", "/faq",
    "/shipping", "/returns", "/privacy", "/terms", "/cookies", "/reviews", "/help", "/business",
  ].map((page) => ({ url: `${BASE}${page || "/"}`, lastModified: now, changeFrequency: "weekly", priority: page === "" ? 1 : 0.7 }));

  const products = q<{ slug: string; type_code: string; updated_at: string }>(
    `SELECT p.slug, p.type_code, p.updated_at FROM products p
     WHERE p.status = 'published' AND (p.publish_at IS NULL OR p.publish_at <= datetime('now'))
       AND (p.type_code NOT IN ('DIGITAL_PRODUCT','DOWNLOADABLE_RESOURCE')
         OR EXISTS (SELECT 1 FROM digital_files df WHERE df.product_id = p.id AND df.is_active = 1))`
  );
  const categories = q<{ slug: string }>("SELECT slug FROM categories WHERE is_active = 1");

  return [
    ...staticPages,
    ...categories.map((category) => ({ url: `${BASE}/shop/${category.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.8 }) as MetadataRoute.Sitemap[number]),
    ...products.map((product) => ({
      url: `${BASE}/${product.type_code === "SERVICE" || product.type_code === "SERVICE_PACKAGE" ? "services" : "products"}/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at.replace(" ", "T")) : now,
      changeFrequency: "daily",
      priority: 0.9,
    }) as MetadataRoute.Sitemap[number]),
  ];
}
