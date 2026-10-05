import ProductForm from "../../ProductForm";

export const dynamic = "force-dynamic";

export default function EditProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Edit product</h1>
      <ProductForm productId={parseInt(params.id, 10)} />
    </div>
  );
}
