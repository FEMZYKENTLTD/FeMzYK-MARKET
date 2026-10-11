import { q } from "@/lib/db";
import CouponsManager from "./CouponsManager";

export const dynamic = "force-dynamic";

export default function AdminDiscountsPage() {
  const coupons = q<any>("SELECT * FROM coupons ORDER BY id DESC");
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Discounts & coupons</h1>
      <p className="text-sm text-mist-400 mb-6">Percentage or fixed discounts with optional minimum order, usage limits and active dates. No deceptive discounts — compare-at prices must be genuine.</p>
      <CouponsManager coupons={coupons} />
    </div>
  );
}
