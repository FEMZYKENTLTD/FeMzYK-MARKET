import { q } from "@/lib/db";
import CategoriesManager from "./CategoriesManager";

export const dynamic = "force-dynamic";

export default function AdminCategoriesPage() {
  const categories = q<any>(
    `SELECT c.*, (SELECT COUNT(*) FROM product_categories pc WHERE pc.category_id = c.id) AS product_count,
            (SELECT name FROM categories p WHERE p.id = c.parent_id) AS parent_name
     FROM categories c ORDER BY (c.parent_id IS NOT NULL), c.position, c.name`
  );
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Categories</h1>
      <p className="text-sm text-mist-400 mb-6">Create new departments and subcategories here — no code changes needed. The storefront menu updates automatically.</p>
      <CategoriesManager categories={categories.map((c) => ({ id: c.id, parent_id: c.parent_id, slug: c.slug, name: c.name, position: c.position, is_active: !!c.is_active, product_count: c.product_count, parent_name: c.parent_name }))} />
    </div>
  );
}
