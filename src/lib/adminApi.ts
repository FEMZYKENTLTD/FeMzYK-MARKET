import { requireAdmin, SessionUser, audit } from "./auth";

/** Shared guard + helpers for admin API routes. */
export function adminUser(): SessionUser {
  return requireAdmin();
}

export { audit };

export function jsonError(e: any) {
  const status = e?.status ?? 500;
  const message = status === 500 ? "An unexpected error occurred." : e.message;
  return { error: message, status };
}
