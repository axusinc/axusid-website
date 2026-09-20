import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { oauthAuditLog } from "@/lib/db/schema";

export type OAuthAuditEvent =
  | "consent.granted"
  | "consent.updated"
  | "grant.revoked"
  | "token.issued"
  | "token.refreshed"
  | "refresh.reuse_detected";

/**
 * Records what happened to an authorization. Never throws: an authorization that worked must
 * not fail because its audit row could not be written.
 */
export async function recordOAuthEvent(entry: {
  event: OAuthAuditEvent;
  userAuid?: string;
  clientAuid?: string;
  grantId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getDb()
      .insert(oauthAuditLog)
      .values({
        id: crypto.randomUUID(),
        event: entry.event,
        userAuid: entry.userAuid ?? null,
        clientAuid: entry.clientAuid ?? null,
        grantId: entry.grantId ?? null,
        detail: entry.detail ?? null,
      });
  } catch (error) {
    console.error("Failed to record OAuth audit event", entry.event, error);
  }
}

export async function listAuditEventsForUser(userAuid: string, limit = 50) {
  return getDb()
    .select()
    .from(oauthAuditLog)
    .where(eq(oauthAuditLog.userAuid, userAuid))
    .orderBy(desc(oauthAuditLog.at))
    .limit(limit);
}
