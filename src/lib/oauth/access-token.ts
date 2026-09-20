import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { oauthAccessTokens } from "@/lib/db/schema";
import type { OAuthClient } from "@/lib/oauth/constants";
import {
  findActiveGrant,
  findGrantById,
  revokeGrant,
  type OAuthGrant,
} from "@/lib/oauth/grants";
import { signAccessToken, verifyAccessToken } from "@/lib/oauth/jwt";
import { generateOpaqueCode, sha256Base64Url } from "@/lib/oauth/pkce";
import { partitionScopes } from "@/lib/oauth/scopes";

/**
 * Opaque access tokens can be revoked the moment a user disconnects an app, so they are
 * allowed to live longer than a JWT, which stays valid until it expires no matter what.
 */
export const OPAQUE_ACCESS_TOKEN_TTL_SECONDS = 12 * 60 * 60;
export const JWT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

const OPAQUE_TOKEN_PREFIX = "axid_at_";

export type IssuedAccessToken = {
  token: string;
  expiresInSeconds: number;
};

export type ResolvedAccessToken = {
  grant: OAuthGrant;
  scopes: string[];
  clientAuid: string;
  userAuid: string;
  expiresAt: Date;
};

export function accessTokenFormat(client: OAuthClient): "opaque" | "jwt" {
  return client.accessTokenFormat === "jwt" ? "jwt" : "opaque";
}

export async function issueAccessToken(params: {
  client: OAuthClient;
  grant: OAuthGrant;
  scopes: string[];
}): Promise<IssuedAccessToken> {
  const { oidcScopes, axusPermissions } = partitionScopes(params.scopes);

  if (accessTokenFormat(params.client) === "jwt") {
    const token = await signAccessToken({
      sub: params.grant.userAuid,
      aud: params.client.auid,
      scope: axusPermissions.join(" "),
      oidcScope: oidcScopes.join(" "),
      expiresInSeconds: JWT_ACCESS_TOKEN_TTL_SECONDS,
      jti: crypto.randomUUID(),
    });
    return { token, expiresInSeconds: JWT_ACCESS_TOKEN_TTL_SECONDS };
  }

  const secret = await generateOpaqueCode(32);
  const token = `${OPAQUE_TOKEN_PREFIX}${secret}`;

  await getDb().insert(oauthAccessTokens).values({
    id: crypto.randomUUID(),
    grantId: params.grant.id,
    tokenHash: await sha256Base64Url(token),
    scopes: params.scopes,
    expiresAt: new Date(Date.now() + OPAQUE_ACCESS_TOKEN_TTL_SECONDS * 1000),
  });

  return { token, expiresInSeconds: OPAQUE_ACCESS_TOKEN_TTL_SECONDS };
}

/**
 * Resolves either token format to the authorization behind it. A JWT carries its own claims
 * and cannot be revoked before it expires; an opaque token is looked up, so disconnecting an
 * app stops it immediately.
 */
export async function resolveAccessToken(
  token: string,
): Promise<ResolvedAccessToken | undefined> {
  if (token.startsWith(OPAQUE_TOKEN_PREFIX)) {
    return resolveOpaqueAccessToken(token);
  }

  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    return undefined;
  }

  const scopes = [
    ...claims.oidcScope.split(/\s+/).filter(Boolean),
    ...claims.scope.split(/\s+/).filter(Boolean),
  ];

  const grant = await findActiveGrant(claims.sub, claims.aud);
  if (!grant) {
    return undefined;
  }

  return {
    grant,
    scopes,
    clientAuid: claims.aud,
    userAuid: claims.sub,
    expiresAt: new Date(claims.exp * 1000),
  };
}

async function resolveOpaqueAccessToken(
  token: string,
): Promise<ResolvedAccessToken | undefined> {
  const rows = await getDb()
    .select()
    .from(oauthAccessTokens)
    .where(
      and(
        eq(oauthAccessTokens.tokenHash, await sha256Base64Url(token)),
        isNull(oauthAccessTokens.revokedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt <= new Date()) {
    return undefined;
  }

  const grant = await findGrantById(row.grantId);
  if (!grant) {
    return undefined;
  }

  return {
    grant,
    scopes: row.scopes,
    clientAuid: grant.clientAuid,
    userAuid: grant.userAuid,
    expiresAt: row.expiresAt,
  };
}

/** RFC 7009: revoking an access token ends the authorization it belongs to. */
export async function revokeByAccessToken(token: string): Promise<boolean> {
  const resolved = await resolveAccessToken(token);
  if (!resolved) {
    return false;
  }

  await revokeGrant(resolved.grant.id, "client");
  return true;
}
