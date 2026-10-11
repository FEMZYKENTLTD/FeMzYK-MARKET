import Link from "next/link";

export default function EmptyState({
  icon = "🛍️",
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon?: string;
  title: string;
  body?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="card px-6 py-14 text-center max-w-lg mx-auto">
      <div className="text-4xl mb-4" aria-hidden>
        {icon}
      </div>
      <h2 className="font-display text-xl text-cream-50">{title}</h2>
      {body && <p className="text-sm text-mist-400 mt-2 leading-relaxed">{body}</p>}
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className="btn-gold btn-md mt-6">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
