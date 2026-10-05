import { q } from "@/lib/db";
import ShippingManager from "./ShippingManager";

export const dynamic = "force-dynamic";

export default function AdminShippingPage() {
  const zones = q<any>("SELECT * FROM shipping_zones ORDER BY id").map((z) => ({
    ...z,
    countries: JSON.parse(z.countries_json),
    methods: q<any>("SELECT * FROM shipping_methods WHERE zone_id = ? ORDER BY price_cents", z.id),
  }));
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Shipping zones & methods</h1>
      <p className="text-sm text-mist-400 mb-6">
        Rates are honest estimates shown at checkout. Use <code className="text-mist-300">*</code> in a zone's country list to catch all remaining countries.
      </p>
      <ShippingManager zones={zones} />
    </div>
  );
}
