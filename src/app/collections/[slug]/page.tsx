import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/repo/catalog";
import ProductCard from "@/components/product/ProductCard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { getDisplayCurrency } from "@/lib/moneyServer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const col = getCollection((await params).slug);
  if (!col || col.items.length === 0) return { title: "Collection" };
  return { title: col.name, description: col.description };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const col = getCollection((await params).slug);
  if (!col || col.items.length === 0) notFound();
  const currency = await getDisplayCurrency();

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/collections", label: "Collections" }, { label: col.name }]} />
      <header className="mt-5 mb-8">
        <p className="eyebrow">Collection</p>
        <h1 className="section-title mt-1.5">{col.name}</h1>
        {col.description && <p className="text-sm text-mist-400 mt-2 max-w-2xl">{col.description}</p>}
      </header>
      {col.items.length === 0 ? (
        <p className="text-sm text-mist-500">This collection is being prepared — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {col.items.map((p: any) => (
            <ProductCard key={p.id} p={p} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
