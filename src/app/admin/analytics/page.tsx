import { q, q1 } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import Spark from "../Spark";

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  const revenueByDay = q<any>(
    `SELECT date(paid_at) AS d, SUM(total_cents) AS rev, COUNT(*) AS n FROM orders WHERE paid_at IS NOT NULL GROUP BY d ORDER BY d DESC LIMIT 30`
  ).reverse();
  const ordersByDay = q<any>(`SELECT date(created_at) AS d, COUNT(*) AS n FROM orders GROUP BY d ORDER BY d DESC LIMIT 30`).reverse();
  const events = q<any>(`SELECT event, COUNT(*) AS n FROM analytics_events GROUP BY event ORDER BY n DESC LIMIT 12`);
  const searches = q<any>(
    `SELECT json_extract(payload_json, '$.q') AS term, COUNT(*) AS n FROM analytics_events WHERE event = 'search' GROUP BY term ORDER BY n DESC LIMIT 10`
  );
  const conversion = (() => {
    const views = q1<{ c: number }>("SELECT COUNT(*) AS c FROM analytics_events WHERE event = 'product_view'")?.c ?? 0;
    const purchases = q1<{ c: number }>("SELECT COUNT(*) AS c FROM analytics_events WHERE event = 'purchase'")?.c ?? 0;
    return { views, purchases, rate: views ? ((purchases / views) * 100).toFixed(2) : "0" };
  })();
  const split = q<any>(
    `SELECT CASE WHEN oi.product_type IN ('DIGITAL_PRODUCT','DOWNLOADABLE_RESOURCE') THEN 'Digital' WHEN oi.product_type IN ('SERVICE','SERVICE_PACKAGE') THEN 'Services' ELSE 'Physical' END AS kind,
            SUM(oi.total_cents) AS rev
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.status NOT IN ('PENDING_PAYMENT','PAYMENT_FAILED','CANCELLED') GROUP BY kind`
  );

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-6">Analytics</h1>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5"><p className="text-[11px] uppercase tracking-wider text-mist-500">Product views</p><p className="text-2xl font-semibold text-cream-50 mt-1">{conversion.views}</p></div>
        <div className="card p-5"><p className="text-[11px] uppercase tracking-wider text-mist-500">Purchases</p><p className="text-2xl font-semibold text-cream-50 mt-1">{conversion.purchases}</p></div>
        <div className="card p-5"><p className="text-[11px] uppercase tracking-wider text-mist-500">View → purchase rate</p><p className="text-2xl font-semibold text-gold-300 mt-1">{conversion.rate}%</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-cream-100 mb-4">Revenue (30 days)</h2>
          <Spark data={revenueByDay.map((r) => r.rev / 100)} labels={revenueByDay.map((r) => r.d.slice(5))} />
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-cream-100 mb-4">Orders (30 days)</h2>
          <Spark data={ordersByDay.map((r) => r.n)} labels={ordersByDay.map((r) => r.d.slice(5))} />
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-cream-100 mb-4">Digital vs physical vs services</h2>
          {split.length === 0 ? <p className="text-sm text-mist-500">No sales yet.</p> : (
            <ul className="space-y-3">
              {split.map((s) => (
                <li key={s.kind}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-mist-300">{s.kind}</span><span className="text-cream-100">{formatMoney(s.rev, "USD")}</span></div>
                  <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
                    <div className="h-full bg-gold-500/70" style={{ width: `${Math.min(100, (s.rev / Math.max(...split.map((x) => x.rev))) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-cream-100 mb-4">Tracked events</h2>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.event} className="flex justify-between text-sm"><span className="text-mist-300">{e.event}</span><span className="text-cream-100">{e.n}</span></li>
            ))}
            {events.length === 0 && <p className="text-sm text-mist-500">No events yet.</p>}
          </ul>
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-cream-100 mb-4">Popular searches</h2>
          <div className="flex flex-wrap gap-2">
            {searches.map((s) => (
              <span key={s.term} className="badge-gray px-3 py-1.5">{s.term} · {s.n}</span>
            ))}
            {searches.length === 0 && <p className="text-sm text-mist-500">No searches recorded yet.</p>}
          </div>
          <p className="text-xs text-mist-500 mt-4">First-party, privacy-respecting analytics. No third-party trackers, no unnecessary personal data.</p>
        </div>
      </div>
    </div>
  );
}
