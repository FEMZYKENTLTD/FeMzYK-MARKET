import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getCollection } from "@/lib/repo/catalog";
import ProductCard from "@/components/product/ProductCard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const col = getCollection(params.slug);
  return { title: col?.name || "Collection", description: col?.description };
}

export default function CollectionPage({ params }: { params: { slug: string } }) {
  const col = getCollection(params.slug);
  if (!col) notFound();
  const currency = cookies().get("fm_currency")?.value || "USD";

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
