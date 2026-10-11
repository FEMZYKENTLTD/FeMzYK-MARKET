export function Stars({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5 w-[18px] h-[18px]";
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fillPct = Math.round(Math.max(0, Math.min(1, rating - (i - 1))) * 100);
        return (
          <span key={i} className={`relative inline-block ${cls}`}>
            <StarIcon className={`absolute inset-0 ${cls} text-ink-600`} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
              <StarIcon className={`${cls} text-gold-400`} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.77l-5.2 2.75.99-5.8L1.58 7.62l5.82-.85L10 1.5z" />
    </svg>
  );
}
