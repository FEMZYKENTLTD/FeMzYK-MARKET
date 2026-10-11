import { insert, randomToken } from "./db";

/**
 * Privacy-respecting first-party analytics. We record meaningful events
 * (product views, searches, purchases…) without collecting unnecessary
 * personal information. No third-party trackers are injected.
 */

export function getAnalyticsSession(): string {
  // This identifier is deliberately ephemeral; no persistent tracking cookie is set.
  return randomToken(12);
}

export function track(event: string, payload: Record<string, unknown> = {}, sessionId?: string): void {
  try {
    insert(
      "INSERT INTO analytics_events (session_id, event, payload_json) VALUES (?, ?, ?)",
      sessionId ?? getAnalyticsSession(),
      event,
      JSON.stringify(payload)
    );
  } catch (e) {
    // Analytics must never break the request.
    console.error("[analytics]", e);
  }
}
