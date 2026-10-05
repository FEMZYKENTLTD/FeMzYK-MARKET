import { cookies } from "next/headers";
import { getDb, insert, q1, run, nowIso, randomToken } from "./db";
export { hashPassword, verifyPassword } from "./passwords";
import { hashPassword, verifyPassword } from "./passwords";

const SESSION_COOKIE = "fm_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "CUSTOMER" | "ADMIN" | "SUPPORT";
}

// ── Session management (server-side sessions, httpOnly cookie) ────────────
export function createSession(userId: number): string {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString().replace("T", " ").slice(0, 19);
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expires);
  return token;
}

export function destroySession(token: string): void {
  run("DELETE FROM sessions WHERE token = ?", token);
}

export function getSessionUser(): SessionUser | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = q1<{
    token: string; user_id: number; expires_at: string;
    email: string; first_name: string | null; last_name: string | null; role: string;
  }>(
    `SELECT s.token, s.user_id, s.expires_at, u.email, u.first_name, u.last_name, u.role
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    token
  );
  if (!row) return null;
  if (new Date(row.expires_at.replace(" ", "T") + "Z").getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  run("UPDATE sessions SET last_seen_at = ? WHERE token = ?", nowIso(), token);
  return {
    id: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role as SessionUser["role"],
  };
}

export function requireUser(): SessionUser {
  const u = getSessionUser();
  if (!u) throw new ApiError(401, "Please sign in to continue.");
  return u;
}

export function requireAdmin(): SessionUser {
  const u = requireUser();
  if (u.role !== "ADMIN") throw new ApiError(403, "You are not authorized to perform this action.");
  return u;
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function registerUser(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  marketing?: boolean;
}): Promise<number> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Please enter a valid email address.");
  if (!input.password || input.password.length < 8) throw new ApiError(400, "Password must be at least 8 characters.");
  const exists = q1("SELECT id FROM users WHERE email = ?", email);
  if (exists) throw new ApiError(409, "An account with this email already exists. Try signing in.");
  return insert(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, marketing_opt_in)
     VALUES (?, ?, ?, ?, ?, ?)`,
    email,
    hashPassword(input.password),
    input.firstName ?? null,
    input.lastName ?? null,
    input.role ?? "CUSTOMER",
    input.marketing ? 1 : 0
  );
}

export function authenticate(email: string, password: string): { id: number } {
  const row = q1<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = ?",
    email.trim().toLowerCase()
  );
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new ApiError(401, "Incorrect email or password.");
  }
  return { id: row.id };
}

// ── Audit log ─────────────────────────────────────────────────────────────
export function audit(actorId: number | null, action: string, entityType?: string, entityId?: number, prev?: unknown, next?: unknown) {
  try {
    insert(
      "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, previous_json, new_json) VALUES (?, ?, ?, ?, ?, ?)",
      actorId,
      action,
      entityType ?? null,
      entityId ?? null,
      prev == null ? null : JSON.stringify(prev),
      next == null ? null : JSON.stringify(next)
    );
  } catch (e) {
    console.error("[audit]", e);
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ── Simple in-memory rate limiter (per IP + route) ────────────────────────
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}
