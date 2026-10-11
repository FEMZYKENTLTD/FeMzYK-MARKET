import { cookies } from "next/headers";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { hasOrderAccess, orderAccessCookieName } from "@/lib/orderAccess";

/** Authenticated owner or same-browser guest with the private order-access cookie. */
export async function getAccessibleProject(reference: string): Promise<{ project: any; user: SessionUser | null } | null> {
  const user = await getSessionUser();
  if (user) {
    const owned = q1<any>("SELECT * FROM projects WHERE reference = ? AND user_id = ?", reference, user.id);
    if (owned) return { project: owned, user };
  }

  const project = q1<any>(
    `SELECT pr.*, o.order_number, o.confirmation_token FROM projects pr
     JOIN orders o ON o.id = pr.order_id
     WHERE pr.reference = ? AND o.paid_at IS NOT NULL`,
    reference
  );
  if (!project) return null;
  const token = (await cookies()).get(orderAccessCookieName(project.order_number))?.value;
  if (!hasOrderAccess(token, project.order_number, project.confirmation_token)) return null;
  return { project, user: null };
}
