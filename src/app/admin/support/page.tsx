import { q } from "@/lib/db";
import { timeAgo } from "@/lib/util";

export const dynamic = "force-dynamic";

export default function AdminSupportPage() {
  const tickets = q<any>("SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 60");
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Support tickets</h1>
      {tickets.length === 0 ? (
        <p className="text-sm text-mist-500 card p-6">No tickets yet.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <article key={t.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="badge-navy">{t.topic}</span>
                <span className={t.status === "open" ? "badge-gold" : t.status === "resolved" ? "badge-green" : "badge-gray"}>{t.status}</span>
                {t.order_number && <span className="badge-gray font-mono">{t.order_number}</span>}
                <span className="text-[11px] text-mist-500 ml-auto">{t.reference} · {timeAgo(t.created_at)}</span>
              </div>
              <h2 className="text-sm font-semibold text-cream-100">{t.subject}</h2>
              <p className="text-sm text-mist-300 mt-1.5 leading-relaxed">{t.body}</p>
              <p className="text-xs text-mist-500 mt-3">— {t.name} · {t.email}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
