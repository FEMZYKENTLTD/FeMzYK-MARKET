import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = getSessionUser();
  if (!user) redirect("/account/login?next=/account");

  const links: [string, string][] = [
    ["/account", "Overview"],
    ["/account/orders", "Orders"],
    ["/account/downloads", "Downloads"],
    ["/account/services", "Services & Projects"],
    ["/wishlist", "Wishlist"],
    ["/account/profile", "Profile & Security"],
  ];

  return (
    <div className="container-page py-10">
      <div className="grid lg:grid-cols-[240px_1fr] gap-8 items-start">
        <aside className="card p-5 lg:sticky lg:top-24">
          <p className="text-xs text-mist-500">Signed in as</p>
          <p className="text-sm font-medium text-cream-100 truncate mt-0.5">{user.email}</p>
          {user.role === "ADMIN" && <span className="badge-gold mt-2">Admin</span>}
          <nav className="mt-5 space-y-1" aria-label="Account">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm text-mist-300 hover:text-cream-100 hover:bg-ink-800 transition-colors">
                {label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm text-gold-300 hover:bg-ink-800 transition-colors">
                Admin dashboard →
              </Link>
            )}
          </nav>
          <div className="mt-5 pt-4 border-t border-ink-700">
            <LogoutButton />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
