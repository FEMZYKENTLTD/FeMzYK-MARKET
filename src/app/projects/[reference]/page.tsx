import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { hasOrderAccess, orderAccessCookieName } from "@/lib/orderAccess";
import ProjectWorkspace from "@/components/project/ProjectWorkspace";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function GuestProjectPage({ params }: { params: Promise<{ reference: string }> }) {
  const user = await getSessionUser();
  const owned = user ? q1<any>("SELECT * FROM projects WHERE reference = ? AND user_id = ?", (await params).reference, user.id) : null;
  if (owned) {
    const orderNumber = q1<any>("SELECT order_number FROM orders WHERE id = ?", owned.order_id)?.order_number || "";
    return <div className="container-page py-10"><ProjectWorkspace project={owned} orderNumber={orderNumber} /></div>;
  }

  const project = q1<any>(
    `SELECT pr.*, o.order_number, o.confirmation_token FROM projects pr
     JOIN orders o ON o.id = pr.order_id
     WHERE pr.reference = ? AND o.paid_at IS NOT NULL`,
    (await params).reference
  );
  if (!project) notFound();
  const token = (await cookies()).get(orderAccessCookieName(project.order_number))?.value;
  if (!hasOrderAccess(token, project.order_number, project.confirmation_token)) notFound();

  return <div className="container-page py-10"><ProjectWorkspace project={project} guest orderNumber={project.order_number} /></div>;
}
