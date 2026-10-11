import type { Metadata } from "next";
import Link from "next/link";
import { listCollections, getCollection } from "@/lib/repo/catalog";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Collections",
  description: "Browse currently published FEMZY MARKET collections.",
};

export default function CollectionsIndex() {
  const collections = listCollections()
    .map((collection) => getCollection(collection.slug))
    .filter((collection): collection is NonNullable<typeof collection> => !!collection && collection.items.length > 0);

  return (
    <div className="container-page py-10">
      <p className="eyebrow">FEMZY MARKET</p>
      <h1 className="section-title mt-2 mb-8">Collections</h1>
      {collections.length === 0 ? (
        <EmptyState
          icon="▦"
          title="No collections are currently published."
          body="Published collections will appear here when they contain available listings."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <Link key={collection.slug} href={`/collections/${collection.slug}`} className="card card-hover p-6">
              <h2 className="font-display text-xl text-cream-50">{collection.name}</h2>
              {collection.description && <p className="text-sm text-mist-400 mt-2 leading-relaxed">{collection.description}</p>}
              <span className="block mt-4 text-sm text-gold-400">Explore →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
