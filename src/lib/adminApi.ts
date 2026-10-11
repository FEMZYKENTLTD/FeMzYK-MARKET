import { requireAdmin, SessionUser, audit } from "./auth";

/** Shared guard + helpers for admin API routes. */
export async function adminUser(): Promise<SessionUser> {
  return await requireAdmin();
}

export { audit };

export function jsonError(e: any) {
  const status = e?.status ?? 500;
  const message = status === 500 ? "An unexpected error occurred." : e.message;
  return { error: message, status };
}
