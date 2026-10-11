import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { q1 } from "@/lib/db";
import Markdown from "@/components/ui/Markdown";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

const LEGAL_SLUGS = ["about", "shipping", "returns", "privacy", "terms", "cookies", "digital-products", "digital-products-policy", "service-terms"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug === "digital-products-policy" ? "digital-products" : (await params).slug;
  const page = q1<{ title: string }>("SELECT title FROM content_pages WHERE slug = ?", slug);
  return { title: page?.title || "FEMZYK MARKET" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug === "digital-products-policy" ? "digital-products" : (await params).slug;
  if (!LEGAL_SLUGS.includes(slug)) notFound();
  const page = q1<any>("SELECT * FROM content_pages WHERE slug = ?", slug);
  if (!page) notFound();

  return (
    <div className="container-page py-10 max-w-3xl mx-auto">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: page.title }]} />
      <h1 className="font-display text-3xl text-cream-50 mt-5 mb-6">{page.title}</h1>
      <Markdown md={page.body_md} />
      <div className="mt-10 card p-5 text-sm text-mist-400">
        Questions about this policy? <Link href="/contact" className="text-gold-400 hover:text-gold-300">Create a support request</Link> and keep the reference shown after submission.
      </div>
    </div>
  );
}
