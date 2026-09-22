import "server-only";

import { getAuthSdk } from "@/lib/auth-graphql";
import type { IdPSession } from "@/lib/session";

export type OAuthProof = { providerId: string; clientId: string; refreshToken: string };

export async function exchangeOAuthCode(params: {
  tokenUri: string;
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}) {
  const response = await fetch(params.tokenUri, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    console.error("[OAuth code exchange failed]", { status: response.status });
    throw new Error("OAuth code exchange failed");
  }
  const result = await response.json() as {
    access_token?: string; refresh_token?: string; id_token?: string; error?: string;
  };
  if (result.error || !result.access_token || !result.refresh_token) {
    console.error("[OAuth token response rejected]", {
      providerError: typeof result.error === "string" && /^[a-z_]{1,64}$/.test(result.error) ? result.error : undefined,
      hasAccessToken: Boolean(result.access_token),
      hasRefreshToken: Boolean(result.refresh_token),
    });
    throw new Error("OAuth provider did not issue an access/refresh token pair; authorize again with offline access");
  }
  // The engine exchanges and verifies this refresh token before storing its own token pair.
  return { accessToken: result.access_token, refreshToken: result.refresh_token, idToken: result.id_token };
}

export async function loginWithOAuthIdentity(authentication: OAuthProof, permissions: string[]) {
  const result = await getAuthSdk().LoginWithExternalIdentity({
    authentication, permissions: permissions.length > 0 ? permissions : undefined,
  });
  return { auid: result.loginWithExternalIdentity.auid, tokenId: result.loginWithExternalIdentity.id };
}

export async function linkOAuthIdentity(session: IdPSession, authentication: OAuthProof): Promise<void> {
  await getAuthSdk(session.tokenId).LinkExternalIdentity({ auid: session.auid, authentication });
}
