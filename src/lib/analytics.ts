import { cookies } from "next/headers";
import { insert } from "./db";

/**
 * Privacy-respecting first-party analytics. We record meaningful events
 * (product views, searches, purchases…) without collecting unnecessary
 * personal information. No third-party trackers are injected.
 */

export function getAnalyticsSession(): string {
  let sid = cookies().get("fm_sid")?.value;
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return sid;
}

export function track(event: string, payload: Record<string, unknown> = {}, sessionId?: string): void {
  try {
    let sid = sessionId;
    try {
      sid = sid || getAnalyticsSession();
    } catch {
      /* outside request context */
    }
    insert(
      "INSERT INTO analytics_events (session_id, event, payload_json) VALUES (?, ?, ?)",
      sid ?? null,
      event,
      JSON.stringify(payload)
    );
  } catch (e) {
    // Analytics must never break the request.
    console.error("[analytics]", e);
  }
}
