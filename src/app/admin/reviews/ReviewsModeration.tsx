"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminClient";
import { Stars } from "@/components/product/Stars";
import { timeAgo } from "@/lib/util";

interface R {
  id: number; rating: number; title: string | null; body: string; author: string; verified: boolean; seed: boolean; product: string; at: string; status?: string;
}

export default function ReviewsModeration({ pending, decided }: { pending: R[]; decided: R[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  async function act(id: number, status: string) {
    setBusy(id);
    try {
      await adminFetch(`/api/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  const Card = ({ r, showActions }: { r: R; showActions: "pending" | "decided" }) => (
    <article className="card p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Stars rating={r.rating} size="sm" />
        {r.verified && <span className="badge-green">Verified purchase</span>}
        {r.seed && <span className="badge-gray">Initial review</span>}
        {r.status && <span className={r.status === "approved" ? "badge-green" : "badge-red"}>{r.status}</span>}
        <span className="text-[11px] text-mist-500 ml-auto">{timeAgo(r.at)}</span>
      </div>
      {r.title && <h3 className="text-sm font-semibold text-cream-100">{r.title}</h3>}
      <p className="text-sm text-mist-300 mt-1 leading-relaxed">{r.body}</p>
      <p className="text-xs text-mist-500 mt-2">— {r.author} · on {r.product}</p>
      <div className="mt-3 flex gap-2">
        {showActions === "pending" ? (
          <>
            <button className="btn-gold btn-sm" disabled={busy === r.id} onClick={() => act(r.id, "approved")}>Approve</button>
            <button className="btn-outline btn-sm" disabled={busy === r.id} onClick={() => act(r.id, "rejected")}>Reject</button>
          </>
        ) : r.status === "approved" ? (
          <button className="btn-dark btn-sm" disabled={busy === r.id} onClick={() => act(r.id, "rejected")}>Unpublish</button>
        ) : (
          <button className="btn-dark btn-sm" disabled={busy === r.id} onClick={() => act(r.id, "approved")}>Approve</button>
        )}
      </div>
    </article>
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-3">Pending ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-mist-500 card p-5">Nothing waiting for moderation.</p> : (
          <div className="grid md:grid-cols-2 gap-4">{pending.map((r) => <Card key={r.id} r={r} showActions="pending" />)}</div>
        )}
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-mist-400 mb-3">Recently moderated</h2>
        <div className="grid md:grid-cols-2 gap-4">{decided.map((r) => <Card key={r.id} r={r} showActions="decided" />)}</div>
      </section>
    </div>
  );
}
