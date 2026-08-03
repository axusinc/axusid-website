import "server-only";

import gql from "graphql-tag";
import {
  createAuthGraphqlClient,
  opaqueGraphqlBearer,
  type AuthCredentials,
} from "@/lib/auth-graphql";
import {
  getOAuthClient,
  normalizeScopes,
  partitionScopes,
  validateScopes,
} from "@/lib/oauth/clients";
import { wrapTokenWithBackend } from "@/lib/oauth/adapter";
import type { IdPSession } from "@/lib/session";

export const GOOGLE_OAUTH_COOKIE = "axusid_google_oauth";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE = 10 * 60;

export type GoogleOAuthState = {
  state: string;
  codeVerifier: string;
  intent: "login" | "link";
  linkAuid?: string;
  redirectUri?: string;
  next?: string;
  createdAt: number;
};

type GoogleTokenResponse = {
  id_token?: string;
};

const LOGIN_WITH_EXTERNAL_IDENTITY = gql`
  mutation LoginWithExternalIdentity(
    $authentication: ExternalAuthenticationInput!
    $permissions: [String!]
  ) {
    loginWithExternalIdentity(
      authentication: $authentication
      permissions: $permissions
    ) {
      id
      auid
    }
  }
`;

const LINK_EXTERNAL_IDENTITY = gql`
  mutation LinkGoogleIdentity(
    $auid: ID!
    $authentication: ExternalAuthenticationInput!
  ) {
    linkExternalIdentity(auid: $auid, authentication: $authentication) {
      id
      providerId
      createdAt
    }
  }
`;

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function requireEnvironmentValue(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getGoogleClientId(): string {
  return requireEnvironmentValue("GOOGLE_CLIENT_ID");
}

export function getGoogleClientSecret(): string {
  return requireEnvironmentValue("GOOGLE_CLIENT_SECRET");
}

export function getGoogleProviderId(): string {
  return process.env.GOOGLE_EXTERNAL_PROVIDER_ID?.trim() || "google";
}

export function getGoogleRedirectUri(requestUrl: string): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }

  const baseUrl = process.env.OAUTH_ISSUER?.trim() || requestUrl;
  return new URL("/auth/google/callback", baseUrl).toString();
}

export function normalizeInternalDestination(value: string | null): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }
  return value;
}

export function createRandomOAuthValue(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  return base64Url(new Uint8Array(digest));
}

export function encodeGoogleOAuthState(value: GoogleOAuthState): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeGoogleOAuthState(value?: string): GoogleOAuthState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<GoogleOAuthState>;
    const createdAt = parsed.createdAt;
    const age = typeof createdAt === "number" ? Date.now() - createdAt : -1;
    const isFresh = age >= 0 && age <= GOOGLE_OAUTH_COOKIE_MAX_AGE * 1000;

    if (
      typeof parsed.state !== "string" ||
      typeof parsed.codeVerifier !== "string" ||
      typeof createdAt !== "number" ||
      !isFresh
    ) {
      return null;
    }

    const intent = parsed.intent === "link" ? "link" : "login";
    const linkAuid =
      intent === "link" && typeof parsed.linkAuid === "string"
        ? parsed.linkAuid
        : undefined;
    if (intent === "link" && !linkAuid) {
      return null;
    }

    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      intent,
      linkAuid,
      redirectUri: normalizeInternalDestination(parsed.redirectUri ?? null),
      next: normalizeInternalDestination(parsed.next ?? null),
      createdAt,
    };
  } catch {
    return null;
  }
}

export async function exchangeGoogleCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
      code_verifier: params.codeVerifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error("Google rejected the authorization code");
  }

  const result = (await response.json()) as GoogleTokenResponse;
  if (!result.id_token) {
    throw new Error("Google did not return an identity token");
  }

  return result.id_token;
}

export async function resolveExternalLoginScopes(redirectUri?: string): Promise<{
  oidcScopes: string[];
  axusPermissions: string[];
}> {
  if (!redirectUri?.startsWith("/authorize")) {
    return { oidcScopes: ["openid"], axusPermissions: [] };
  }

  const url = new URL(redirectUri, "http://localhost");
  const clientId = url.searchParams.get("client_id") || url.searchParams.get("auid");
  if (!clientId) {
    throw new Error("The authorization request is missing its client ID");
  }

  const client = await getOAuthClient(clientId);
  if (!client) {
    throw new Error("The authorization request has an unknown client");
  }

  const scopes = validateScopes(client, normalizeScopes(url.searchParams.get("scope") ?? ""));
  return partitionScopes(scopes);
}

export async function loginWithGoogleIdentity(
  idToken: string,
  permissions: string[],
): Promise<AuthCredentials & { auid: string }> {
  const client = createAuthGraphqlClient();
  const authenticate = (requestedPermissions?: string[]) => client.request<{
    loginWithExternalIdentity: { id: string; auid: string };
  }>(LOGIN_WITH_EXTERNAL_IDENTITY, {
    authentication: {
      providerId: getGoogleProviderId(),
      token: idToken,
    },
    permissions: requestedPermissions?.length ? requestedPermissions : undefined,
  });

  // The first authentication resolves the AXUS identity linked to the Google
  // subject. A second token can then request that identity's credential-issue
  // permission without trusting identity data from the browser.
  const identityResult = await authenticate();
  const auid = identityResult.loginWithExternalIdentity.auid;
  const credentialPermission = `identity.${auid}.credentials.issue`;
  const tokenResult = await authenticate(
    permissions.length > 0
      ? [...new Set([...permissions, credentialPermission])]
      : undefined,
  );

  return wrapTokenWithBackend(auid, tokenResult.loginWithExternalIdentity.id);
}

export async function linkGoogleIdentity(
  session: IdPSession,
  idToken: string,
): Promise<void> {
  const client = createAuthGraphqlClient(opaqueGraphqlBearer(session.credentials));
  await client.request(LINK_EXTERNAL_IDENTITY, {
    auid: session.auid,
    authentication: {
      providerId: getGoogleProviderId(),
      token: idToken,
    },
  });
}

export type ExternalIdentity = {
  id: string;
  providerId: string;
  createdAt: string;
};

const EXTERNAL_IDENTITIES_QUERY = gql`
  query ExternalIdentities($auid: ID!) {
    externalIdentities(auid: $auid) {
      id
      providerId
      createdAt
    }
  }
`;

const UNLINK_EXTERNAL_IDENTITY = gql`
  mutation UnlinkExternalIdentity($auid: ID!, $externalIdentityId: ID!) {
    unlinkExternalIdentity(auid: $auid, externalIdentityId: $externalIdentityId)
  }
`;

export async function getUserExternalIdentities(
  auid: string,
  bearerToken?: string,
): Promise<ExternalIdentity[]> {
  const client = createAuthGraphqlClient(bearerToken);
  try {
    const data = await client.request<{ externalIdentities: ExternalIdentity[] }>(
      EXTERNAL_IDENTITIES_QUERY,
      { auid },
    );
    return data.externalIdentities ?? [];
  } catch {
    return [];
  }
}

export async function unlinkExternalIdentity(
  auid: string,
  externalIdentityId: string,
  bearerToken?: string,
): Promise<boolean> {
  const client = createAuthGraphqlClient(bearerToken);
  try {
    const data = await client.request<{ unlinkExternalIdentity: boolean }>(
      UNLINK_EXTERNAL_IDENTITY,
      { auid, externalIdentityId },
    );
    return data.unlinkExternalIdentity;
  } catch {
    return false;
  }
}

