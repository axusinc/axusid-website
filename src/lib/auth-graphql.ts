import "server-only";

import { GraphQLClient } from "graphql-request";
import { getSdk } from "@/graphql/sdk";
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

export type AuthCredentials = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};

function credentialsExpiresInSeconds(credentials: AuthCredentials): number {
  const expiresAt = Date.parse(credentials.accessTokenExpiresAt);
  return Number.isFinite(expiresAt)
    ? Math.max(60, Math.floor((expiresAt - Date.now()) / 1000))
    : 43200;
}

/** Backend opaque bearer from login/refresh. */
export function opaqueGraphqlBearer(credentials: AuthCredentials): string {
  return credentials.accessToken;
}

/**
 * IdP JWT access token accepted by the auth GraphQL API as an alternative
 * to the opaque backend token. Permissions are carried in the scope claim.
 */
export async function signGraphqlAccessToken(params: {
  auid: string;
  scopes: string[];
  credentials: AuthCredentials;
  clientId?: string;
}): Promise<string> {
  return signAccessToken({
    sub: params.auid,
    aud: params.clientId ?? getIssuer(),
    scope: params.scopes.join(" "),
    expiresInSeconds: credentialsExpiresInSeconds(params.credentials),
  });
}

export function createAuthGraphqlClient(bearerToken?: string): GraphQLClient {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  return new GraphQLClient(getEndpoint(), { headers });
}

export function getAuthSdk(bearerToken?: string) {
  return getSdk(createAuthGraphqlClient(bearerToken));
}

export function getAuthSdkForSession(session: IdPSession) {
  return getAuthSdk(opaqueGraphqlBearer(session.credentials));
}

export async function getAuthSdkForSessionJwt(session: IdPSession) {
  const bearerToken = await signGraphqlAccessToken({
    auid: session.auid,
    scopes: session.scopes,
    credentials: session.credentials,
  });
  return getAuthSdk(bearerToken);
}
