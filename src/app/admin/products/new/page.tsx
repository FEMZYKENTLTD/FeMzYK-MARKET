import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Add product</h1>
      <ProductForm />
    </div>
  );
}
