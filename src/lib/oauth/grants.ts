import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { decryptJson, encryptJson } from "@/lib/crypto/secret-box";
import { getDb } from "@/lib/db";
import { oauthGrants, type OAuthGrantRow } from "@/lib/db/schema";
import { recordOAuthEvent } from "@/lib/oauth/audit";
import { issueAuthorizationToken, revokeWithBackend } from "@/lib/oauth/adapter";
import { permissionImplies } from "@/lib/oauth/scopes";

export type OAuthGrant = {
  id: string;
  userAuid: string;
  clientAuid: string;
  scopes: string[];
  /** Native token the app acts with. */
  tokenId: string;
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
    tokenId: await decryptJson<string>(row.tokenId),
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
 * authorization keeps its token as long as it still covers the request; widening it mints a
 * fresh token and revokes the old one, so a token never silently gains permissions.
 */
export async function grantAuthorization(params: {
  userAuid: string;
  clientAuid: string;
  sessionTokenId: string;
  scopes: string[];
  axusPermissions: string[];
}): Promise<OAuthGrant> {
  const db = getDb();
  const existing = await findActiveGrant(params.userAuid, params.clientAuid);

  if (existing && grantCoversScopes(existing, params.scopes)) {
    const now = new Date();
    await db
      .update(oauthGrants)
      .set({ lastUsedAt: now, updatedAt: now })
      .where(eq(oauthGrants.id, existing.id));
    return { ...existing, lastUsedAt: now, updatedAt: now };
  }

  const tokenId = await issueAuthorizationToken({
    sessionTokenId: params.sessionTokenId,
    userAuid: params.userAuid,
    permissions: params.axusPermissions,
  });

  const scopes = existing
    ? [...new Set([...existing.scopes, ...params.scopes])]
    : params.scopes;

  if (existing) {
    await db
      .update(oauthGrants)
      .set({
        scopes,
        tokenId: await encryptJson(tokenId),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      })
      .where(eq(oauthGrants.id, existing.id));

    // The previous token stays valid until here so a request in flight is not cut off
    // mid-authorization; from now on the app uses the new one.
    await revokeQuietly(existing.tokenId);
    await recordOAuthEvent({
      event: "consent.updated",
      userAuid: params.userAuid,
      clientAuid: params.clientAuid,
      grantId: existing.id,
      detail: { scopes },
    });

    return { ...existing, scopes, tokenId, updatedAt: new Date() };
  }

  const id = crypto.randomUUID();
  await db.insert(oauthGrants).values({
    id,
    userAuid: params.userAuid,
    clientAuid: params.clientAuid,
    scopes,
    tokenId: await encryptJson(tokenId),
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
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: new Date(),
  };
}

/**
 * Ends an authorization: the app's native token is revoked at the engine, and its refresh and
 * access tokens go with the row.
 */
export async function revokeGrant(
  grantId: string,
  reason: "user" | "client" | "reuse_detected",
): Promise<void> {
  const rows = await getDb()
    .select()
    .from(oauthGrants)
    .where(and(eq(oauthGrants.id, grantId), isNull(oauthGrants.revokedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return;
  }

  const grant = await toGrant(row);
  await revokeQuietly(grant.tokenId);

  await getDb()
    .update(oauthGrants)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(oauthGrants.id, grantId));

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
