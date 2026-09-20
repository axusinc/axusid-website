import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { oauthRefreshTokens } from "@/lib/db/schema";
import { findGrantById, revokeGrant, type OAuthGrant } from "@/lib/oauth/grants";
import { generateOpaqueCode, sha256Base64Url } from "@/lib/oauth/pkce";

/** Deliberately long-lived: an app stays connected until the user disconnects it. */
export const REFRESH_TOKEN_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000;

/**
 * A rotated refresh token is still accepted for this long, so a client that retries a request
 * whose response it never saw is not locked out. Past it, the old token showing up again can
 * only mean a copy is in someone else's hands.
 */
export const REFRESH_ROTATION_GRACE_MS = 30 * 1000;

export class RefreshTokenError extends Error {}

export async function issueRefreshToken(grantId: string): Promise<string> {
  const token = await generateOpaqueCode(32);

  await getDb().insert(oauthRefreshTokens).values({
    id: crypto.randomUUID(),
    grantId,
    tokenHash: await sha256Base64Url(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return token;
}

/**
 * Exchanges a refresh token for its successor. Rotation is what makes a leak detectable: the
 * used token is marked, and presenting it again after the grace window revokes the whole
 * authorization, since the legitimate client and a thief cannot both hold the newest one.
 *
 * Only the hash is stored, so a copy of the database yields no usable token.
 */
export async function redeemRefreshToken(token: string): Promise<{
  grant: OAuthGrant;
  refreshToken: string;
}> {
  const db = getDb();
  const tokenHash = await sha256Base64Url(token);

  const rows = await db
    .select()
    .from(oauthRefreshTokens)
    .where(eq(oauthRefreshTokens.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new RefreshTokenError("Refresh token is invalid");
  }

  if (row.revokedAt) {
    throw new RefreshTokenError("Refresh token has been revoked");
  }

  if (row.expiresAt <= new Date()) {
    throw new RefreshTokenError("Refresh token has expired");
  }

  if (row.rotatedAt) {
    const withinGrace = Date.now() - row.rotatedAt.getTime() <= REFRESH_ROTATION_GRACE_MS;
    if (!withinGrace) {
      await revokeGrant(row.grantId, "reuse_detected");
      throw new RefreshTokenError("Refresh token was already used");
    }
  }

  const grant = await findGrantById(row.grantId);
  if (!grant) {
    throw new RefreshTokenError("The authorization has been revoked");
  }

  await db
    .update(oauthRefreshTokens)
    .set({ rotatedAt: row.rotatedAt ?? new Date() })
    .where(eq(oauthRefreshTokens.id, row.id));

  return { grant, refreshToken: await issueRefreshToken(grant.id) };
}

/** RFC 7009: revoking a refresh token ends the authorization it belongs to. */
export async function revokeByRefreshToken(token: string): Promise<boolean> {
  const tokenHash = await sha256Base64Url(token);
  const rows = await getDb()
    .select()
    .from(oauthRefreshTokens)
    .where(
      and(eq(oauthRefreshTokens.tokenHash, tokenHash), isNull(oauthRefreshTokens.revokedAt)),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return false;
  }

  await revokeGrant(row.grantId, "client");
  return true;
}
