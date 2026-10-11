import Link from "next/link";

export default function Pagination({ page, pages, qs }: { page: number; pages: number; qs: (o: Record<string, string | undefined>) => string }) {
  const nums: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i);
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Pagination">
      {page > 1 && (
        <Link href={qs({ page: String(page - 1) })} className="btn-dark btn-sm">
          ← Prev
        </Link>
      )}
      {nums.map((n) => (
        <Link
          key={n}
          href={qs({ page: n === 1 ? undefined : String(n) })}
          aria-current={n === page ? "page" : undefined}
          className={`btn-sm rounded-lg min-w-[36px] ${n === page ? "btn-gold" : "btn-dark"}`}
        >
          {n}
        </Link>
      ))}
      {page < pages && (
        <Link href={qs({ page: String(page + 1) })} className="btn-dark btn-sm">
          Next →
        </Link>
      )}
    </nav>
  );
}
