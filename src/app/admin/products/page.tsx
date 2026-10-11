import Link from "next/link";
import ProductsManager from "./ProductsManager";
import CsvImport from "@/components/admin/CsvImport";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl text-cream-50">Products</h1>
        <div className="flex gap-2">
          <CsvImport />
          <a href="/api/admin/products/export" className="btn-dark btn-sm">Export CSV</a>
          <Link href="/admin/products/new" className="btn-gold btn-sm">+ Add product</Link>
        </div>
      </div>
      <ProductsManager />
    </div>
  );
}
