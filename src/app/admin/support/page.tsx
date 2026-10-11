import { q } from "@/lib/db";
import { timeAgo } from "@/lib/util";
import SupportManager from "./SupportManager";

export const dynamic = "force-dynamic";

export default function AdminSupportPage() {
  const tickets = q<any>(
    `SELECT t.*, (SELECT COUNT(*) FROM support_replies r WHERE r.ticket_id = t.id) AS reply_count
     FROM support_tickets t ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'pending' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END, t.created_at DESC LIMIT 80`
  );
  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Support tickets</h1>
      <p className="text-sm text-mist-400 mb-6">Replies are saved to the support conversation. Email events are queued in the outbox but are not sent until a delivery provider is integrated.</p>
      {tickets.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3" aria-hidden>💬</p>
          <h2 className="font-display text-lg text-cream-50">No tickets yet</h2>
          <p className="text-sm text-mist-400 mt-2">Customer requests from the contact and help pages will appear here.</p>
        </div>
      ) : (
        <SupportManager
          tickets={tickets.map((t) => ({
            id: t.id, reference: t.reference, name: t.name, email: t.email, topic: t.topic,
            order_number: t.order_number, subject: t.subject, status: t.status, assigned_to: t.assigned_to,
            created_at: t.created_at, reply_count: t.reply_count,
          }))}
        />
      )}
    </div>
  );
}
