import { redirect } from "next/navigation";
import { getProductBySlug } from "@/lib/repo/catalog";

/** Digital products share the full product page experience. */
export default async function DigitalProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProductBySlug((await params).slug);
  if (!p) redirect("/digital");
  redirect(`/products/${p.slug}`);
}
