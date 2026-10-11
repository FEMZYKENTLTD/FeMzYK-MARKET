import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AdminLogout from "./AdminLogout";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/account/login?next=/admin");
  if (user.role !== "ADMIN") {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl text-cream-50">Access restricted</h1>
        <p className="text-sm text-mist-400 mt-2">This area is for authorized administrators only.</p>
      </div>
    );
  }

  const nav: [string, string][] = [
    ["/admin", "Dashboard"],
    ["/admin/products", "Products"],
    ["/admin/categories", "Categories"],
    ["/admin/collections", "Collections"],
    ["/admin/orders", "Orders"],
    ["/admin/customers", "Customers"],
    ["/admin/reviews", "Reviews"],
    ["/admin/digital", "Digital Files"],
    ["/admin/services", "Service Projects"],
    ["/admin/suppliers", "Suppliers"],
    ["/admin/shipping", "Shipping"],
    ["/admin/payments", "Payments"],
    ["/admin/discounts", "Discounts"],
    ["/admin/support", "Support"],
    ["/admin/emails", "Emails"],
    ["/admin/analytics", "Analytics"],
    ["/admin/content", "Content"],
    ["/admin/settings", "Settings"],
    ["/admin/audit", "Audit Log"],
  ];

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin" className="flex items-baseline gap-2">
          <span className="font-display text-lg text-cream-50">FEMZYK</span>
          <span className="text-[10px] font-semibold tracking-[0.25em] text-gold-400 uppercase">Admin</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-mist-400 hover:text-cream-100">← Back to store</Link>
          <AdminLogout />
        </div>
      </div>
      <div className="grid lg:grid-cols-[210px_1fr] gap-6 items-start">
        <aside className="card p-3 lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <nav className="space-y-0.5" aria-label="Admin">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="block rounded-md px-3 py-1.5 text-[13px] text-mist-300 hover:text-cream-100 hover:bg-ink-800 transition-colors">
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
