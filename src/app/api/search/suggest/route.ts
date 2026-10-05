import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@/lib/repo/catalog";
import { q } from "@/lib/db";
import { rateLimit } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateLimit(`suggest:${ip}`, 40, 10_000)) return NextResponse.json({ products: [], categories: [] });
  const term = (req.nextUrl.searchParams.get("q") || "").trim();
  if (term.length < 2) return NextResponse.json({ products: [], categories: [] });

  const products = listProducts({ q: term, perPage: 6 }).items.map((p) => ({
    slug: p.slug,
    name: p.name,
    image: p.image,
    priceCents: p.price_cents,
    type: p.type_code,
  }));
  const like = `%${term}%`;
  const categories = q<any>("SELECT slug, name FROM categories WHERE is_active = 1 AND (name LIKE ? OR description LIKE ?) ORDER BY position LIMIT 5", like, like);
  return NextResponse.json({ products, categories });
}
