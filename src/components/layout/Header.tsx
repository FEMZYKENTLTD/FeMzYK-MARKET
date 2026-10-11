import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getCartToken } from "@/lib/cart";
import { q1 } from "@/lib/db";
import { menuTree } from "@/lib/repo/catalog";
import { getCurrencies } from "@/lib/money";
import NavClient from "./NavClient";
import SearchBox from "./SearchBox";
import CurrencyPicker from "./CurrencyPicker";
import CartIcon from "./CartIcon";
import { getDisplayCurrency } from "@/lib/moneyServer";

export default async function Header() {
  const user = await getSessionUser();
  const cartToken = await getCartToken();
  const cartCount =
    cartToken != null
      ? q1<{ c: number }>(
          `SELECT COALESCE(SUM(ci.qty),0) AS c FROM cart_items ci JOIN carts c ON c.id = ci.cart_id
           WHERE c.token = ? AND ci.saved_for_later = 0`,
          cartToken
        )?.c ?? 0
      : 0;
  const currency = await getDisplayCurrency();
  const menu = menuTree();
  const currencies = Object.values(getCurrencies());

  const shopRoots = menu.filter((c) => !["digital", "web-dev-services"].includes(c.slug));
  const digital = menu.find((c) => c.slug === "digital");
  const webdev = menu.find((c) => c.slug === "web-dev-services");

  return (
    <header className="sticky top-0 z-50 border-b border-ink-700/80 bg-ink-950/90 backdrop-blur-md">
      <div className="container-page flex items-center gap-3 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-2 shrink-0 group" aria-label="FEMZYK MARKET home">
          <span className="font-display text-xl tracking-wide text-cream-50 group-hover:text-gold-300 transition-colors">
            FEMZYK
          </span>
          <span className="hidden xs:inline text-[10px] font-semibold tracking-[0.28em] text-gold-400 uppercase">
            Market
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-6" aria-label="Primary">
          <NavLink href="/shop/all" mega="shop">
            Shop
          </NavLink>
          <NavLink href="/digital" mega="digital">
            Digital
          </NavLink>
          <NavLink href="/services" mega="webdev">
            Web Development
          </NavLink>
          <NavLink href="/collections">Collections</NavLink>
          <NavLink href="/about">About</NavLink>
        </nav>

        {/* Search */}
        <div className="flex-1 hidden md:block max-w-md ml-auto">
          <SearchBox />
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 ml-auto md:ml-3">
          <div className="hidden md:block mr-1">
            <CurrencyPicker current={currency} currencies={currencies.map((c) => ({ code: c.code, symbol: c.symbol, name: c.name }))} />
          </div>
          <Link
            href={user ? "/account" : "/account/login"}
            className="btn-ghost btn-sm rounded-lg px-2.5"
            aria-label={user ? "Account" : "Sign in"}
            title={user ? `Signed in as ${user.email}` : "Sign in"}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="sr-only">Account</span>
          </Link>
          <Link href="/wishlist" className="btn-ghost btn-sm rounded-lg px-2.5" aria-label="Wishlist">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span className="sr-only">Wishlist</span>
          </Link>
          <Link href="/cart" className="btn-ghost btn-sm rounded-lg px-2.5 relative" aria-label={`Cart, ${cartCount} items`}>
            <CartIcon count={cartCount} />
            <span className="sr-only">Cart</span>
          </Link>
        </div>

        {/* Client-side menu (mobile drawer + mega menus) */}
        <NavClient
          shopCategories={shopRoots.map((c) => ({ slug: c.slug, name: c.name, image: c.image, children: c.children.map((k: any) => ({ slug: k.slug, name: k.name })) }))}
          digitalSubs={(digital?.children ?? []).map((k: any) => ({ slug: k.slug, name: k.name }))}
          webdevSubs={(webdev?.children ?? []).map((k: any) => ({ slug: k.slug, name: k.name }))}
          currency={currency}
          currencies={currencies.map((c) => ({ code: c.code, symbol: c.symbol, name: c.name }))}
        />
      </div>
      {/* Mobile search */}
      <div className="md:hidden border-t border-ink-800 px-4 py-2.5">
        <SearchBox />
      </div>
    </header>
  );
}

function NavLink({ href, children, mega }: { href: string; children: React.ReactNode; mega?: string }) {
  if (!mega) {
    return (
      <Link href={href} className="px-3 py-2 text-sm text-mist-300 hover:text-cream-50 transition-colors rounded-md">
        {children}
      </Link>
    );
  }
  return (
    <div className="relative group">
      <Link
        href={href}
        className="px-3 py-2 text-sm text-mist-300 hover:text-cream-50 transition-colors rounded-md inline-flex items-center gap-1"
      >
        {children}
        <svg className="w-3 h-3 text-mist-500 group-hover:text-gold-400 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </Link>
      <MegaMenu type={mega} />
    </div>
  );
}

import { menuTree as _mt } from "@/lib/repo/catalog";
function MegaMenu({ type }: { type: string }) {
  const menu = _mt();
  if (type === "shop") {
    const cats = menu.filter((c) => !["digital", "web-dev-services"].includes(c.slug));
    return (
      <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 absolute left-0 top-full pt-2 z-50">
        <div className="rounded-xl border border-ink-600 bg-ink-850 shadow-card-hover p-6 grid grid-cols-3 gap-x-10 gap-y-2 w-[560px]">
          {cats.map((c) => (
            <div key={c.slug}>
              <Link href={`/shop/${c.slug}`} className="text-sm font-semibold text-cream-50 hover:text-gold-300 transition-colors">
                {c.name}
              </Link>
              <ul className="mt-2 space-y-1.5">
                {c.children.slice(0, 4).map((k: any) => (
                  <li key={k.slug}>
                    <Link href={`/shop/${k.slug}`} className="text-[13px] text-mist-400 hover:text-cream-100 transition-colors">
                      {k.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link href="/shop/all" className="text-[13px] font-medium text-gold-400 hover:text-gold-300 mt-2">
            View all products →
          </Link>
        </div>
      </div>
    );
  }
  const cat = menu.find((c) => (type === "digital" ? c.slug === "digital" : c.slug === "web-dev-services"));
  const base = type === "digital" ? "/shop" : "/shop";
  return (
    <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 absolute left-0 top-full pt-2 z-50">
      <div className="rounded-xl border border-ink-600 bg-ink-850 shadow-card-hover p-6 w-[340px]">
        <ul className="space-y-2">
          {(cat?.children ?? []).map((k: any) => (
            <li key={k.slug}>
              <Link href={`${base}/${k.slug}`} className="text-[13px] text-mist-300 hover:text-cream-100 transition-colors">
                {k.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link href={type === "digital" ? "/digital" : "/services"} className="block mt-4 pt-4 border-t border-ink-700 text-[13px] font-medium text-gold-400 hover:text-gold-300">
          {type === "digital" ? "Explore FEMZYK Digital →" : "Explore FEMZYK Web Development →"}
        </Link>
      </div>
    </div>
  );
}
