import "server-only";

import { issueAccessToken } from "@/lib/oauth/access-token";
import { recordOAuthEvent } from "@/lib/oauth/audit";
import { buildOidcClaims } from "@/lib/oauth/claims";
import type { OAuthClient } from "@/lib/oauth/constants";
import { touchGrant, type OAuthGrant } from "@/lib/oauth/grants";
import { signIdToken } from "@/lib/oauth/jwt";
import {
  RefreshTokenError,
  issueRefreshToken,
  redeemRefreshToken,
} from "@/lib/oauth/refresh-token";
import { partitionScopes } from "@/lib/oauth/scopes";

export type DualTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  /**
   * The app's own native AXUS ID token, for calling the engine directly. It does not expire,
   * and it dies with the authorization when the user disconnects the app.
   */
  axus_access_token: string;
  scope?: string;
};

async function buildResponse(params: {
  client: OAuthClient;
  grant: OAuthGrant;
  scopes: string[];
  nonce?: string;
  withRefreshToken: string | undefined;
}): Promise<DualTokenResponse> {
  const { oidcScopes, axusPermissions } = partitionScopes(params.scopes);
  const permissionScopeString = axusPermissions.join(" ");

  const accessToken = await issueAccessToken({
    client: params.client,
    grant: params.grant,
    scopes: params.scopes,
  });

  const response: DualTokenResponse = {
    access_token: accessToken.token,
    token_type: "Bearer",
    expires_in: accessToken.expiresInSeconds,
    axus_access_token: params.grant.tokenId,
    ...(permissionScopeString ? { scope: permissionScopeString } : {}),
  };

  if (params.withRefreshToken) {
    response.refresh_token = params.withRefreshToken;
  }

  if (oidcScopes.includes("openid")) {
    const profileClaims = await buildOidcClaims(
      params.grant.userAuid,
      params.grant.tokenId,
      oidcScopes,
    );

    response.id_token = await signIdToken({
      sub: params.grant.userAuid,
      aud: params.client.auid,
      expiresInSeconds: accessToken.expiresInSeconds,
      claims: profileClaims,
      nonce: params.nonce,
    });
  }

  return response;
}

export async function issueTokenResponse(params: {
  client: OAuthClient;
  grant: OAuthGrant;
  scopes: string[];
  nonce?: string;
}): Promise<DualTokenResponse> {
  const { oidcScopes } = partitionScopes(params.scopes);
  const refreshToken = oidcScopes.includes("offline_access")
    ? await issueRefreshToken(params.grant.id)
    : undefined;

  const response = await buildResponse({ ...params, withRefreshToken: refreshToken });

  await recordOAuthEvent({
    event: "token.issued",
    userAuid: params.grant.userAuid,
    clientAuid: params.client.auid,
    grantId: params.grant.id,
    detail: { scopes: params.scopes, offline: Boolean(refreshToken) },
  });

  return response;
}

export async function refreshTokenResponse(params: {
  refreshToken: string;
  client: OAuthClient;
}): Promise<DualTokenResponse> {
  const { grant, refreshToken } = await redeemRefreshToken(params.refreshToken);

  // A refresh token belongs to the client it was issued to; presenting it as another client
  // is a stolen token, not a mistake.
  if (grant.clientAuid !== params.client.auid) {
    throw new RefreshTokenError("Refresh token was issued to a different client");
  }

  await touchGrant(grant.id);

  const response = await buildResponse({
    client: params.client,
    grant,
    scopes: grant.scopes,
    withRefreshToken: refreshToken,
  });

  await recordOAuthEvent({
    event: "token.refreshed",
    userAuid: grant.userAuid,
    clientAuid: grant.clientAuid,
    grantId: grant.id,
  });

  return response;
}
