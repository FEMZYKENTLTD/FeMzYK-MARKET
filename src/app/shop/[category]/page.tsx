import { notFound } from "next/navigation";
import { getCategory } from "@/lib/repo/catalog";
import ShopBrowser from "@/components/shop/ShopBrowser";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const cat = getCategory((await params).category);
  if (!cat) return { title: "Shop" };
  return {
    title: cat.seo_title || `${cat.name}`,
    description: cat.seo_description || cat.description,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const cat = getCategory((await params).category);
  const filters = await searchParams;
  if (!cat) notFound();
  return (
    <ShopBrowser
      searchParams={filters}
      category={cat.slug}
      title={cat.name}
      eyebrow={cat.parent_name ? `${cat.parent_name}` : "Shop by category"}
      description={cat.description}
    />
  );
}
