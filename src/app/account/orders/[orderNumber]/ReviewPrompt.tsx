import Link from "next/link";

export default function ReviewPrompt({ items }: { items: { product_id: number | null; name: string; meta?: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-cream-100 mb-2">Enjoying your purchase?</h2>
      <p className="text-sm text-mist-400 mb-4">Honest reviews help other customers choose well. Verified purchases get a badge.</p>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 4).map((it, i) => (
          <span key={i} className="text-xs text-mist-500">
            Review on the <span className="text-mist-300">{it.name}</span> page ↓
          </span>
        ))}
      </div>
    </div>
  );
}
