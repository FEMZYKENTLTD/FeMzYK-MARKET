import { getSessionUser } from "@/lib/auth";
import { q } from "@/lib/db";
import EmptyState from "@/components/ui/EmptyState";

export default async function DownloadsPage() {
  const user = (await getSessionUser())!;
  const items = q<any>(
    `SELECT de.*, p.name, p.slug, p.digital_file_type, p.digital_version,
            (SELECT COUNT(*) FROM digital_downloads dd WHERE dd.entitlement_id = de.id) AS total_downloads
     FROM digital_entitlements de JOIN products p ON p.id = de.product_id
     WHERE de.user_id = ? ORDER BY de.created_at DESC`,
    user.id
  );

  return (
    <div>
      <h1 className="font-display text-2xl text-cream-50 mb-2">Your downloads</h1>
      <p className="text-sm text-mist-400 mb-6">Every digital product you own, with secure private links. Updates to purchased products appear here automatically.</p>
      {items.length === 0 ? (
        <EmptyState icon="📚" title="Your digital purchases will appear here." body="Guides, templates and resources you buy are delivered instantly and live in this library — with free updates." ctaHref="/digital" ctaLabel="Explore FEMZYK Digital" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((d) => {
            const expired = d.expires_at && new Date(d.expires_at.replace(" ", "T") + "Z").getTime() < Date.now();
            return (
              <div key={d.id} className="card p-5 flex flex-col">
                <span className="badge-gold w-fit">Digital</span>
                <h2 className="text-sm font-semibold text-cream-100 mt-3">{d.name}</h2>
                <p className="text-xs text-mist-500 mt-1">
                  {d.digital_file_type || "File"} {d.digital_version ? `· v${d.digital_version}` : ""} · {d.downloads_used}/{d.download_limit} downloads used
                </p>
                <div className="mt-auto pt-4">
                  {d.revoked ? (
                    <span className="badge-red">Access revoked — contact support</span>
                  ) : expired ? (
                    <span className="badge-gray">Access expired — contact support to renew</span>
                  ) : (
                    <a href={`/api/download/${d.token}`} className="btn-gold btn-sm">
                      Download
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
