import { MetadataRoute } from "next";
import { q } from "@/lib/db";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://femzykmarket.com";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    "", "/shop/all", "/services", "/digital", "/collections", "/about", "/contact", "/faq",
    "/shipping", "/returns", "/privacy", "/terms", "/cookies", "/reviews", "/help", "/business", "/track-order",
  ].map((p) => ({ url: `${BASE}${p || "/"}`, lastModified: now, changeFrequency: "weekly", priority: p === "" ? 1 : 0.7 }));

  const products = q<{ slug: string; updated_at: string }>("SELECT slug, updated_at FROM products WHERE status = 'published'");
  const categories = q<{ slug: string }>("SELECT slug FROM categories WHERE is_active = 1");

  return [
    ...staticPages,
    ...categories.map((c) => ({ url: `${BASE}/shop/${c.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.8 }) as MetadataRoute.Sitemap[number]),
    ...products.map((p) => ({ url: `${BASE}/products/${p.slug}`, lastModified: new Date(p.updated_at?.replace(" ", "T") || now), changeFrequency: "daily", priority: 0.9 }) as MetadataRoute.Sitemap[number]),
  ];
}
