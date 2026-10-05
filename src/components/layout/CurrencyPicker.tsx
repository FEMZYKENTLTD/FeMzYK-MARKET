"use client";
import { useRouter } from "next/navigation";

export default function CurrencyPicker({
  current,
  currencies,
}: {
  current: string;
  currencies: { code: string; symbol: string; name: string }[];
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-1.5 text-xs text-mist-400">
      <span className="sr-only sm:not-sr-only">Currency</span>
      <select
        value={current}
        aria-label="Display currency"
        className="bg-ink-900 border border-ink-600 rounded-md px-2 py-1.5 text-xs text-cream-100 focus:outline-none focus:border-gold-500/70 cursor-pointer"
        onChange={(e) => {
          document.cookie = `fm_currency=${e.target.value};path=/;max-age=${86400 * 365};samesite=lax`;
          router.refresh();
        }}
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} {c.symbol}
          </option>
        ))}
      </select>
    </label>
  );
}
