import { Metadata } from "next";
import ShopBrowser from "@/components/shop/ShopBrowser";

export const metadata: Metadata = {
  title: "Shop All Products",
  description: "Browse the full FEMZYK MARKET catalog — home, pets, kitchen, desk, lifestyle, gifts, digital products and more.",
};

export default async function ShopAllPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <ShopBrowser
      searchParams={await searchParams}
      title="All Products"
      eyebrow="The full catalog"
      description="Physical products, digital resources and services — filter by type, category or price."
    />
  );
}
