import "server-only";

import {
  opaqueGraphqlBearer,
  signGraphqlAccessToken,
  type AuthCredentials,
} from "@/lib/auth-graphql";
import { buildOidcClaims } from "@/lib/oauth/claims";
import { signIdToken } from "@/lib/oauth/jwt";
import {
  unwrapRefreshToken,
  wrapRefreshToken,
} from "@/lib/oauth/refresh-token";
import { refreshWithBackend } from "@/lib/oauth/adapter";
import { partitionScopes } from "@/lib/oauth/scopes";

export type DualTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  axus_access_token: string;
  scope?: string;
};

function credentialsExpiresIn(credentials: AuthCredentials): number {
  const expiresAt = Date.parse(credentials.accessTokenExpiresAt);
  return Number.isFinite(expiresAt)
    ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    : 43200;
}

export async function issueTokenResponse(params: {
  auid: string;
  clientId: string;
  scopes: string[];
  credentials: AuthCredentials;
  nonce?: string;
}): Promise<DualTokenResponse> {
  const { oidcScopes, axusPermissions } = partitionScopes(params.scopes);
  const permissionScopeString = axusPermissions.join(" ");
  const expiresIn = credentialsExpiresIn(params.credentials);
  const profileClaims = await buildOidcClaims(
    params.auid,
    opaqueGraphqlBearer(params.credentials),
    oidcScopes,
  );

  const accessToken = await signGraphqlAccessToken({
    auid: params.auid,
    permissions: axusPermissions,
    oidcScopes,
    credentials: params.credentials,
    clientId: params.clientId,
  });

  const response: DualTokenResponse = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    axus_access_token: params.credentials.accessToken,
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
      backendRefreshToken: params.credentials.refreshToken,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours refresh token lifetime
    });
  }

  return response;
}

export async function refreshTokenResponse(
  wrappedRefreshToken: string,
): Promise<DualTokenResponse> {
  const payload = await unwrapRefreshToken(wrappedRefreshToken);
  const credentials = await refreshWithBackend(payload.backendRefreshToken);

  return issueTokenResponse({
    auid: payload.auid,
    clientId: payload.clientId,
    scopes: payload.scopes,
    credentials,
  });
}

export { unwrapRefreshToken };
