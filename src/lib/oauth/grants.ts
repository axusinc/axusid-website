import "server-only";

import { and, desc, eq, isNull, or } from "drizzle-orm";
import { decryptJson, encryptJson } from "@/lib/crypto/secret-box";
import { getDb } from "@/lib/db";
import { oauthGrants, type OAuthGrantRow } from "@/lib/db/schema";
import { recordOAuthEvent } from "@/lib/oauth/audit";
import { issueAuthorizationToken, revokeWithBackend } from "@/lib/oauth/adapter";
import { permissionImplies } from "@/lib/oauth/scopes";
import { describeConsentPermissions } from "@/lib/oauth/permission-scopes";
import { sha256Base64Url } from "@/lib/oauth/pkce";

export type OAuthGrant = {
  id: string;
  userAuid: string;
  clientAuid: string;
  scopes: string[];
  /** Native token the app acts with, if native permissions were requested. */
  tokenId: string | null;
  parentSessionTokenHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
};

async function toGrant(row: OAuthGrantRow): Promise<OAuthGrant> {
  return {
    id: row.id,
    userAuid: row.userAuid,
    clientAuid: row.clientAuid,
    scopes: row.scopes,
    tokenId: row.tokenId ? await decryptJson<string>(row.tokenId) : null,
    parentSessionTokenHash: row.parentSessionTokenHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastUsedAt: row.lastUsedAt,
  };
}

export async function findActiveGrant(
  userAuid: string,
  clientAuid: string,
): Promise<OAuthGrant | undefined> {
  const rows = await getDb()
    .select()
    .from(oauthGrants)
    .where(
      and(
        eq(oauthGrants.userAuid, userAuid),
        eq(oauthGrants.clientAuid, clientAuid),
        isNull(oauthGrants.revokedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  return row ? toGrant(row) : undefined;
}

export async function findGrantById(id: string): Promise<OAuthGrant | undefined> {
  const rows = await getDb()
    .select()
    .from(oauthGrants)
    .where(and(eq(oauthGrants.id, id), isNull(oauthGrants.revokedAt)))
    .limit(1);

  const row = rows[0];
  return row ? toGrant(row) : undefined;
}

export async function listGrantsForUser(userAuid: string): Promise<OAuthGrant[]> {
  const rows = await getDb()
    .select()
    .from(oauthGrants)
    .where(and(eq(oauthGrants.userAuid, userAuid), isNull(oauthGrants.revokedAt)))
    .orderBy(desc(oauthGrants.updatedAt));

  return Promise.all(rows.map(toGrant));
}

/** Whether a grant already covers everything a new authorization request asks for. */
export function grantCoversScopes(grant: OAuthGrant, requested: string[]): boolean {
  return requested.every((scope) =>
    grant.scopes.some((granted) => granted === scope || permissionImplies(granted, scope)),
  );
}

/**
 * Records the user's consent and hands back the token the app will act with. An existing
 * authorization keeps its token while the scopes and parent session still match. Changing
 * scopes (including removing access) or the session mints a new token and revokes the old one.
 */
export async function grantAuthorization(params: {
  userAuid: string;
  clientAuid: string;
  sessionTokenId: string;
  scopes: string[];
  axusPermissions: string[];
}): Promise<OAuthGrant> {
  // Re-parse against current declarations even when reusing an existing app token.
  if (params.axusPermissions.length > 0) {
    await describeConsentPermissions(params.sessionTokenId, params.axusPermissions);
  }
  const db = getDb();
  const existing = await findActiveGrant(params.userAuid, params.clientAuid);
  const parentSessionTokenHash = await sha256Base64Url(params.sessionTokenId);

  if (existing && existing.parentSessionTokenHash === parentSessionTokenHash &&
    existing.scopes.length === new Set(params.scopes).size && grantCoversScopes(existing, params.scopes)) {
    const now = new Date();
    await db
      .update(oauthGrants)
      .set({ lastUsedAt: now, updatedAt: now })
      .where(eq(oauthGrants.id, existing.id));
    return { ...existing, lastUsedAt: now, updatedAt: now };
  }

  // Only mint a native token if AXUS permissions were requested. Pure OAuth2/OIDC does not need one.
  const tokenId = params.axusPermissions.length > 0
    ? await issueAuthorizationToken({
        sessionTokenId: params.sessionTokenId,
        userAuid: params.userAuid,
        permissions: params.axusPermissions,
      })
    : null;
  // Stored consent must describe the replacement token, which only receives these scopes.
  const scopes = [...new Set(params.scopes)];
  const encryptedTokenId = tokenId ? await encryptJson(tokenId) : null;

  if (existing) {
    await db
      .update(oauthGrants)
      .set({
        scopes,
        tokenId: encryptedTokenId,
        parentSessionTokenHash,
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      })
      .where(eq(oauthGrants.id, existing.id));

    // The previous token stays valid until here so a request in flight is not cut off
    // mid-authorization; from now on the app uses the new one.
    if (existing.tokenId) {
      await revokeQuietly(existing.tokenId);
    }
    await recordOAuthEvent({
      event: "consent.updated",
      userAuid: params.userAuid,
      clientAuid: params.clientAuid,
      grantId: existing.id,
      detail: { scopes },
    });

    return { ...existing, scopes, tokenId, parentSessionTokenHash, updatedAt: new Date() };
  }

  const id = crypto.randomUUID();
  await db.insert(oauthGrants).values({
    id,
    userAuid: params.userAuid,
    clientAuid: params.clientAuid,
    scopes,
    tokenId: encryptedTokenId,
    parentSessionTokenHash,
    lastUsedAt: new Date(),
  });

  await recordOAuthEvent({
    event: "consent.granted",
    userAuid: params.userAuid,
    clientAuid: params.clientAuid,
    grantId: id,
    detail: { scopes },
  });

  return {
    id,
    userAuid: params.userAuid,
    clientAuid: params.clientAuid,
    scopes,
    tokenId,
    parentSessionTokenHash,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: new Date(),
  };
}

/** Retire app grants whose native tokens depend on a session being revoked. */
export async function revokeGrantsForSession(userAuid: string, sessionTokenId: string): Promise<void> {
  const parentSessionTokenHash = await sha256Base64Url(sessionTokenId);
  await revokeGrantsForSessionHash(userAuid, parentSessionTokenHash, true);
}

/** Retire the app grants of a session identified by its saved bearer hash. */
export async function revokeGrantsForSessionHash(
  userAuid: string,
  parentSessionTokenHash: string,
  includeUnbound = false,
): Promise<void> {
  const rows = await getDb()
    .select({ id: oauthGrants.id, parentSessionTokenHash: oauthGrants.parentSessionTokenHash })
    .from(oauthGrants)
    .where(and(
      eq(oauthGrants.userAuid, userAuid),
      isNull(oauthGrants.revokedAt),
      includeUnbound
        ? or(eq(oauthGrants.parentSessionTokenHash, parentSessionTokenHash), isNull(oauthGrants.parentSessionTokenHash))
        : eq(oauthGrants.parentSessionTokenHash, parentSessionTokenHash),
    ));
  await Promise.all(rows.map((row) => revokeGrant(row.id, "session_ended", row.parentSessionTokenHash)));
}

/**
 * Ends an authorization: the app's native token is revoked at the engine, and its refresh and
 * access tokens go with the row.
 */
export async function revokeGrant(
  grantId: string,
  reason: "user" | "client" | "reuse_detected" | "session_ended",
  expectedParentSessionTokenHash?: string | null,
): Promise<void> {
  const parentCondition = expectedParentSessionTokenHash === undefined
    ? undefined
    : expectedParentSessionTokenHash === null
      ? isNull(oauthGrants.parentSessionTokenHash)
      : eq(oauthGrants.parentSessionTokenHash, expectedParentSessionTokenHash);
  const rows = await getDb()
    .update(oauthGrants)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(oauthGrants.id, grantId), isNull(oauthGrants.revokedAt), parentCondition))
    .returning();

  const row = rows[0];
  if (!row) {
    return;
  }

  const grant = await toGrant(row);
  if (grant.tokenId) {
    await revokeQuietly(grant.tokenId);
  }

  await recordOAuthEvent({
    event: reason === "reuse_detected" ? "refresh.reuse_detected" : "grant.revoked",
    userAuid: grant.userAuid,
    clientAuid: grant.clientAuid,
    grantId,
    detail: { reason },
  });
}

export async function touchGrant(grantId: string): Promise<void> {
  await getDb()
    .update(oauthGrants)
    .set({ lastUsedAt: new Date() })
    .where(eq(oauthGrants.id, grantId));
}

/** The engine may already have lost the token; that is still a successful revocation here. */
async function revokeQuietly(tokenId: string): Promise<void> {
  try {
    await revokeWithBackend(tokenId);
  } catch {
    // Unknown or already revoked.
  }
}
