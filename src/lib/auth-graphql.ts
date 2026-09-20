import "server-only";

import { GraphQLClient } from "graphql-request";
import { getSdk } from "@/graphql/sdk";
import { isTokenInvalidError } from "@/lib/graphql-errors";
import { getIssuer } from "@/lib/oauth/constants";
import { signAccessToken } from "@/lib/oauth/jwt";
import type { IdPSession } from "@/lib/session";

function getEndpoint(): string {
  const endpoint = process.env.AUTH_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    throw new Error("AUTH_GRAPHQL_ENDPOINT is not configured");
  }
  return endpoint;
}

/**
 * Lifetime of the OAuth access tokens this IdP signs. The native token behind one never expires,
 * so this only bounds how long a leaked access token stays usable without a refresh.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 12 * 60 * 60;

/**
 * OAuth access token (JWT) for apps. The engine only accepts native tokens, so this is
 * checked by this IdP alone (e.g. /oauth/userinfo). Permissions are carried in the scope claim.
 */
export async function signGraphqlAccessToken(params: {
  auid: string;
  permissions: string[];
  oidcScopes: string[];
  clientId?: string;
}): Promise<string> {
  return signAccessToken({
    sub: params.auid,
    aud: params.clientId ?? getIssuer(),
    scope: params.permissions.join(" "),
    oidcScope: params.oidcScopes.join(" "),
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function createAuthGraphqlClient(
  bearerToken?: string,
  extraHeaders?: Record<string, string>,
): GraphQLClient {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  return new GraphQLClient(getEndpoint(), { headers });
}

/** Calls the engine as the holder of [bearerToken], a native token id. */
export function getAuthSdk(
  bearerToken?: string,
  extraHeaders?: Record<string, string>,
) {
  return getSdk(createAuthGraphqlClient(bearerToken, extraHeaders));
}

/**
 * Calls the engine as the signed-in user. If the engine reports that the session's token is
 * gone - revoked elsewhere, or lost - the account is dropped from the session here, so the
 * user is asked to sign in again instead of browsing a session whose writes all fail.
 */
export function getAuthSdkForSession(
  session: IdPSession,
  extraHeaders?: Record<string, string>,
) {
  return getSdk(
    createAuthGraphqlClient(session.tokenId, extraHeaders),
    async (action) => {
      try {
        return await action();
      } catch (error) {
        if (isTokenInvalidError(error)) {
          // Imported here because session handling calls back into this module.
          const { removeAccountFromSession } = await import("@/lib/session-access");
          await removeAccountFromSession(session.auid);
        }
        throw error;
      }
    },
  );
}
