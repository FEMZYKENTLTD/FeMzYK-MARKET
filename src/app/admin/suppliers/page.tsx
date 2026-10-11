import { q } from "@/lib/db";
import SuppliersManager from "./SuppliersManager";

export const dynamic = "force-dynamic";

export default function AdminSuppliersPage() {
  const suppliers = q<any>(
    `SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id) AS product_count FROM suppliers s ORDER BY s.name`
  );
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Suppliers</h1>
      <p className="text-sm text-mist-400 mb-6">
        Fulfillment is modular — products link to suppliers, so adding a new supplier never requires architecture changes.
        Vendor-facing marketplace features stay hidden until explicitly activated.
      </p>
      <SuppliersManager suppliers={suppliers} />
    </div>
  );
}
