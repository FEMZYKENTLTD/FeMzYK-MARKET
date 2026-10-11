import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-400 uppercase">404</p>
      <h1 className="font-display text-3xl text-cream-50 mt-3">This page doesn't exist.</h1>
      <p className="text-sm text-mist-400 mt-3 max-w-md mx-auto leading-relaxed">
        The link may be outdated, or the page may have moved. Everything we sell lives in the shop, the digital store and
        the services studio.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop/all" className="btn-gold btn-md">Shop all products</Link>
        <Link href="/digital" className="btn-outline btn-md">Digital store</Link>
        <Link href="/services" className="btn-outline btn-md">Web development</Link>
      </div>
    </div>
  );
}
