import { Metadata } from "next";
import Link from "next/link";
import { listCollections } from "@/lib/repo/catalog";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated product collections from FEMZYK MARKET — bestsellers, new arrivals, workspace picks and more.",
};

export default function CollectionsIndex() {
  const collections = listCollections();
  return (
    <div className="container-page py-10">
      <p className="eyebrow">Explore FEMZYK</p>
      <h1 className="section-title mt-2 mb-8">Collections</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="card card-hover p-6">
            <h2 className="font-display text-xl text-cream-50">{c.name}</h2>
            <p className="text-sm text-mist-400 mt-2 leading-relaxed">{c.description}</p>
            <span className="block mt-4 text-sm text-gold-400">Explore →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
