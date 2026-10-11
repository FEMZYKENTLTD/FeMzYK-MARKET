import { q } from "@/lib/db";
import { parseJson } from "@/lib/util";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminCollectionsPage() {
  const collections = q<any>("SELECT * FROM collections ORDER BY position");
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Collections</h1>
      <p className="text-sm text-mist-400 mb-6">
        Dynamic merchandising groups — rule-driven (type, tag, price cap, sort) or manually curated. Collections power
        Bestsellers, New Arrivals, Under $35 and any new campaign you create.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {collections.map((c) => {
          const rule = parseJson<any>(c.rule_json, {});
          const ruleLabel = rule.sort ? `auto: ${rule.sort}` : rule.type ? `auto: type ${rule.type}` : rule.maxPrice ? `auto: under $${rule.maxPrice}` : rule.tag ? `auto: tag "${rule.tag}"` : "manual curation";
          return (
            <div key={c.id} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-cream-100">{c.name}</h2>
                <span className="badge-navy">{c.is_active ? "active" : "hidden"}</span>
              </div>
              <p className="text-[13px] text-mist-400 mt-1.5">{c.description}</p>
              <p className="text-[11px] text-mist-500 mt-3">
                /collections/{c.slug} · {ruleLabel}
              </p>
            </div>
          );
        })}
      </div>
      <Link href="/collections" className="btn-outline btn-md mt-6">View storefront collections →</Link>
    </div>
  );
}
