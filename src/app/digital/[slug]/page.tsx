import { redirect } from "next/navigation";
import { getProductBySlug } from "@/lib/repo/catalog";

/** Digital products share the full product page experience. */
export default function DigitalProductRoute({ params }: { params: { slug: string } }) {
  const p = getProductBySlug(params.slug);
  if (!p) redirect("/digital");
  redirect(`/products/${p.slug}`);
}
