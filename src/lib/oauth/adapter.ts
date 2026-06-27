import type { AuthCredentials } from "@/lib/auth-graphql";
import { getAuthSdk } from "@/lib/auth-graphql";

export type OAuthTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope?: string;
};

export function credentialsToTokenResponse(
  credentials: AuthCredentials,
  scope?: string,
): OAuthTokenResponse {
  const expiresAt = Date.parse(credentials.accessTokenExpiresAt);
  const expiresIn = Number.isFinite(expiresAt)
    ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
    : 43200;

  return {
    access_token: credentials.accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    refresh_token: credentials.refreshToken,
    ...(scope ? { scope } : {}),
  };
}

export async function loginWithBackend(
  auid: string,
  password: string,
  permissions: string[],
): Promise<AuthCredentials> {
  const sdk = getAuthSdk();
  const result = await sdk.Login({
    auid,
    password,
    permissions: permissions.length > 0 ? permissions : undefined,
  });

  return result.login;
}

export async function refreshWithBackend(
  refreshToken: string,
): Promise<AuthCredentials> {
  const sdk = getAuthSdk();
  const result = await sdk.RefreshCredentials({ refreshToken });
  return result.refreshCredentials;
}

export async function revokeWithBackend(refreshToken: string): Promise<boolean> {
  const sdk = getAuthSdk();
  const result = await sdk.RevokeCredentials({ refreshToken });
  return result.revokeCredentials;
}

export function oauthError(
  error: string,
  description?: string,
  status = 400,
): Response {
  return Response.json(
    {
      error,
      ...(description ? { error_description: description } : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}
