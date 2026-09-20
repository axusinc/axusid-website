import "server-only";

import {
  ACCESS_TOKEN_TTL_SECONDS,
  signGraphqlAccessToken,
} from "@/lib/auth-graphql";
import { buildOidcClaims } from "@/lib/oauth/claims";
import { signIdToken } from "@/lib/oauth/jwt";
import {
  unwrapRefreshToken,
  wrapRefreshToken,
} from "@/lib/oauth/refresh-token";
import { partitionScopes } from "@/lib/oauth/scopes";

export type DualTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  /** Native AXUS ID token for calling the engine directly. It never expires; revoke it via /oauth/revoke. */
  axus_access_token: string;
  scope?: string;
};

export async function issueTokenResponse(params: {
  auid: string;
  clientId: string;
  scopes: string[];
  tokenId: string;
  nonce?: string;
}): Promise<DualTokenResponse> {
  const { oidcScopes, axusPermissions } = partitionScopes(params.scopes);
  const permissionScopeString = axusPermissions.join(" ");
  const expiresIn = ACCESS_TOKEN_TTL_SECONDS;
  const profileClaims = await buildOidcClaims(params.auid, params.tokenId, oidcScopes);

  const accessToken = await signGraphqlAccessToken({
    auid: params.auid,
    permissions: axusPermissions,
    oidcScopes,
    clientId: params.clientId,
  });

  const response: DualTokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    axus_access_token: params.tokenId,
    ...(permissionScopeString ? { scope: permissionScopeString } : {}),
  };

  if (oidcScopes.includes("openid")) {
    response.id_token = await signIdToken({
      sub: params.auid,
      aud: params.clientId,
      expiresInSeconds: expiresIn,
      claims: profileClaims,
      nonce: params.nonce,
    });
  }

  if (oidcScopes.includes("offline_access")) {
    response.refresh_token = await wrapRefreshToken({
      auid: params.auid,
      clientId: params.clientId,
      scopes: params.scopes,
      tokenId: params.tokenId,
      exp: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000, // 100 years refresh token lifetime
    });
  }

  return response;
}

export async function refreshTokenResponse(
  wrappedRefreshToken: string,
): Promise<DualTokenResponse> {
  const payload = await unwrapRefreshToken(wrappedRefreshToken);

  return issueTokenResponse({
    auid: payload.auid,
    clientId: payload.clientId,
    scopes: payload.scopes,
    tokenId: payload.tokenId,
  });
}

export { unwrapRefreshToken };
