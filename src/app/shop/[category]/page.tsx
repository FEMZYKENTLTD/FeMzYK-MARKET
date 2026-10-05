import { notFound } from "next/navigation";
import { getCategory } from "@/lib/repo/catalog";
import ShopBrowser from "@/components/shop/ShopBrowser";

export function generateMetadata({ params }: { params: { category: string } }) {
  const cat = getCategory(params.category);
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
  params: { category: string };
  searchParams: Record<string, string | undefined>;
}) {
  const cat = getCategory(params.category);
  if (!cat) notFound();
  return (
    <ShopBrowser
      searchParams={searchParams}
      category={cat.slug}
      title={cat.name}
      eyebrow={cat.parent_name ? `${cat.parent_name}` : "Shop by category"}
      description={cat.description}
    />
  );
}
