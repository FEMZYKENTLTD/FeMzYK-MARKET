"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatMoney } from "@/lib/money";

interface Suggestion {
  products: { slug: string; name: string; image: string | null; priceCents: number; type: string }[];
  categories: { slug: string; name: string }[];
}

const RECENT_KEY = "fm_recent_searches";

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sug, setSug] = useState<Suggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recent: string[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") : [];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setSug(null);
      return;
    }
    setBusy(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) setSug(await res.json());
      } finally {
        setBusy(false);
      }
    }, 220);
  }, [q]);

  function remember(term: string) {
    const t = term.trim();
    if (!t) return;
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as string[];
    localStorage.setItem(RECENT_KEY, JSON.stringify([t, ...list.filter((x) => x !== t)].slice(0, 6)));
  }

  function submit(term?: string) {
    const t = (term ?? q).trim();
    if (!t) return;
    remember(t);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  }

  return (
    <div className="relative" ref={boxRef}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="site-search" className="sr-only">
          Search products, categories and services
        </label>
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mist-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            id="site-search"
            className="input pl-9 py-2 text-sm"
            placeholder="Search products, guides, services…"
            value={q}
            autoComplete="off"
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        </div>
      </form>

      {open && (q.trim().length >= 2 || recent.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-ink-600 bg-ink-850 shadow-card-hover z-50 overflow-hidden">
          {q.trim().length >= 2 ? (
            busy ? (
              <div className="px-4 py-4 text-sm text-mist-400">Searching…</div>
            ) : sug && (sug.products.length > 0 || sug.categories.length > 0) ? (
              <div className="max-h-[26rem] overflow-y-auto">
                {sug.categories.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] uppercase tracking-widest text-mist-500 mb-1.5">Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sug.categories.map((c) => (
                        <button
                          key={c.slug}
                          onClick={() => {
                            setOpen(false);
                            router.push(`/shop/${c.slug}`);
                          }}
                          className="badge-navy hover:border-gold-500/50 transition-colors"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {sug.products.length > 0 && (
                  <ul className="py-2">
                    {sug.products.map((p) => (
                      <li key={p.slug}>
                        <button
                          onClick={() => {
                            setOpen(false);
                            router.push(`/products/${p.slug}`);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-ink-800 text-left"
                        >
                          {p.image ? (
                            <Image src={p.image} alt="" width={40} height={40} className="rounded-md object-cover w-10 h-10 bg-ink-700" />
                          ) : (
                            <span className="w-10 h-10 rounded-md bg-ink-700 shrink-0" />
                          )}
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-cream-100 truncate">{p.name}</span>
                            <span className="block text-xs text-mist-400">
                              {p.type === "SERVICE" || p.type === "SERVICE_PACKAGE" ? "Service" : p.type.startsWith("DIGITAL") || p.type === "DOWNLOADABLE_RESOURCE" ? "Digital" : "Product"}
                            </span>
                          </span>
                          <span className="text-sm text-gold-300 shrink-0">{formatMoney(p.priceCents, "USD")}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => submit()}
                  className="w-full text-left px-4 py-2.5 text-sm text-gold-400 hover:bg-ink-800 border-t border-ink-700"
                >
                  See all results for “{q.trim()}” →
                </button>
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-mist-400">
                No matches for “{q.trim()}”. Try “candle”, “python” or “website”.
              </div>
            )
          ) : (
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-mist-500 mb-2">Recent searches</p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((r) => (
                  <button key={r} onClick={() => submit(r)} className="badge-gray hover:border-gold-500/50 transition-colors">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
