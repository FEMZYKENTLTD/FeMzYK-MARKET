import { q } from "@/lib/db";
import ContentManager from "./ContentManager";

export const dynamic = "force-dynamic";

export default function AdminContentPage() {
  const pages = q<any>("SELECT slug, title, updated_at FROM content_pages ORDER BY slug");
  const faqs = q<any>("SELECT * FROM faq_items ORDER BY category, position");
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Content</h1>
      <p className="text-sm text-mist-400 mb-6">Homepage hero, announcements, policy pages and FAQs — all editable here without developer intervention.</p>
      <ContentManager pages={pages} faqs={faqs} />
    </div>
  );
}
