import { cookies } from "next/headers";
import { exchangeOAuthCode, loginWithOAuthIdentity, linkOAuthIdentity } from "@/lib/oauth-provider";
import { fetchGitHubProfile } from "@/lib/github-oauth";
import { getAuthSdk } from "@/lib/auth-graphql";
import { buildGoogleNameElements } from "@/lib/profile-name";
import type { IdPSession } from "@/lib/session";

export const GOOGLE_OAUTH_COOKIE = "axusid_google_oauth";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE = 10 * 60;

export const GOOGLE_PENDING_REGISTRATION_COOKIE = "axusid_google_pending_reg";
export const GOOGLE_PENDING_REGISTRATION_COOKIE_MAX_AGE = 15 * 60;

export type PendingGoogleRegistration = {
  refreshToken: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  createdAt: number;
};

export function encodePendingGoogleRegistration(value: PendingGoogleRegistration): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodePendingGoogleRegistration(value?: string): PendingGoogleRegistration | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<PendingGoogleRegistration>;
    const createdAt = parsed.createdAt;
    const age = typeof createdAt === "number" ? Date.now() - createdAt : -1;
    const isFresh =
      age >= 0 && age <= GOOGLE_PENDING_REGISTRATION_COOKIE_MAX_AGE * 1000;

    if (typeof parsed.refreshToken !== "string" || typeof createdAt !== "number" || !isFresh) {
      return null;
    }

    return {
      refreshToken: parsed.refreshToken,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      givenName: typeof parsed.givenName === "string" ? parsed.givenName : undefined,
      familyName: typeof parsed.familyName === "string" ? parsed.familyName : undefined,
      picture: typeof parsed.picture === "string" ? parsed.picture : undefined,
      createdAt,
    };
  } catch {
    return null;
  }
}

export async function getPendingGoogleRegistration(): Promise<PendingGoogleRegistration | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GOOGLE_PENDING_REGISTRATION_COOKIE)?.value;
  return decodePendingGoogleRegistration(raw);
}

export async function clearPendingGoogleRegistration(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GOOGLE_PENDING_REGISTRATION_COOKIE);
}

export async function fetchGoogleProfileFromAccessToken(
  accessToken: string,
): Promise<ExternalIdentityUserInfo | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (res.ok) {
      const info = (await res.json()) as {
        email?: string;
        name?: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
      };
      return {
        email: info.email,
        name: info.name,
        givenName: info.given_name,
        familyName: info.family_name,
        picture: info.picture,
      };
    }
  } catch {
    // Ignore error
  }
  return null;
}

export type GoogleOAuthState = {
  state: string;
  codeVerifier: string;
  intent: "login" | "link" | "register";
  linkAuid?: string;
  username?: string;
  contextAuid?: string;
  addAccount?: boolean;
  redirectUri?: string;
  next?: string;
  createdAt: number;
};

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

    const intent =
      parsed.intent === "link"
        ? "link"
        : parsed.intent === "register"
          ? "register"
          : "login";
    const linkAuid =
      intent === "link" && typeof parsed.linkAuid === "string"
        ? parsed.linkAuid
        : undefined;
    if (intent === "link" && !linkAuid) {
      return null;
    }

    const username =
      typeof parsed.username === "string" ? parsed.username : undefined;
    const contextAuid =
      typeof parsed.contextAuid === "string" ? parsed.contextAuid : undefined;
    const addAccount = parsed.addAccount === true;

    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      intent,
      linkAuid,
      username,
      contextAuid,
      addAccount,
      redirectUri: normalizeInternalDestination(parsed.redirectUri ?? null),
      next: normalizeInternalDestination(parsed.next ?? null),
      createdAt,
    };
  } catch {
    return null;
  }
}

export type ExchangeGoogleCodeResult = {
  refreshToken: string;
  idToken?: string;
  accessToken?: string;
};

export async function exchangeGoogleCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<ExchangeGoogleCodeResult> {
  return exchangeOAuthCode({
    ...params,
    tokenUri: "https://oauth2.googleapis.com/token",
    clientId: getGoogleClientId(),
    clientSecret: getGoogleClientSecret(),
  });
}

export async function loginWithGoogleIdentity(refreshToken: string, permissions: string[]) {
  return loginWithOAuthIdentity({ providerId: getGoogleProviderId(), clientId: getGoogleClientId(), refreshToken }, permissions);
}

export async function linkGoogleIdentity(session: IdPSession, refreshToken: string): Promise<void> {
  return linkOAuthIdentity(session, { providerId: getGoogleProviderId(), clientId: getGoogleClientId(), refreshToken });
}

export type ExternalIdentityUserInfo = {
  username?: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
};

export async function setGoogleRegistrationName(params: {
  auid: string;
  tokenId: string;
  profile: Pick<ExternalIdentityUserInfo, "name" | "givenName" | "familyName">;
}): Promise<void> {
  const elements = buildGoogleNameElements(params.profile);
  if (elements.length === 0) return;

  const sdk = getAuthSdk(params.tokenId);
  const maxAttempts = 5;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, 300 * Math.pow(2, attempt - 1)),
      );
    }

    try {
      const result = await sdk.DefaultVariation({ auid: params.auid });
      const variationId = result.defaultVariation?.variationId;
      if (!variationId) {
        throw new Error("The new account does not have a default variation yet");
      }

      await sdk.ChangeName({ auid: params.auid, variationId, elements });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export type ExternalIdentity = {
  id: string;
  providerId: string;
  createdAt: string;
  userInfo?: ExternalIdentityUserInfo | null;
};

export async function getExternalIdentityAccessToken(
  auid: string,
  externalIdentityId: string,
  bearerToken?: string,
): Promise<{ accessToken: string; tokenType?: string | null; expiresIn?: number | null; scopes: string[] } | null> {
  const sdk = getAuthSdk(bearerToken);
  try {
    const data = await sdk.ExternalIdentityAccessToken({ auid, externalIdentityId });
    return data.externalIdentityAccessToken;
  } catch {
    return null;
  }
}

export async function getUserExternalIdentities(
  auid: string,
  bearerToken?: string,
): Promise<ExternalIdentity[]> {
  const sdk = getAuthSdk(bearerToken);
  try {
    const data = await sdk.ExternalIdentities({ auid });
    const items = data.externalIdentities ?? [];

    const enriched = await Promise.all(
      items.map(async (item) => {
        let userInfo: ExternalIdentityUserInfo | null = null;

        if (item.providerId.toLowerCase() === "google") {
          try {
            const tokenRes = await getExternalIdentityAccessToken(
              auid,
              item.id,
              bearerToken,
            );

            if (tokenRes?.accessToken) {
              const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: {
                  Authorization: `Bearer ${tokenRes.accessToken}`,
                },
                cache: "no-store",
                signal: AbortSignal.timeout(5_000),
              });

              if (res.ok) {
                const info = (await res.json()) as {
                  email?: string;
                  name?: string;
                  picture?: string;
                };
                userInfo = {
                  email: info.email,
                  name: info.name,
                  picture: info.picture,
                };
              }
            }
          } catch {
            // Ignore error fetching external user info
          }
        }

        if (item.providerId.toLowerCase() === "github") {
          const tokenRes = await getExternalIdentityAccessToken(auid, item.id, bearerToken);
          if (tokenRes?.accessToken) {
            userInfo = await fetchGitHubProfile(tokenRes.accessToken);
          }
        }

        return {
          id: item.id,
          providerId: item.providerId,
          createdAt: item.createdAt,
          userInfo,
        };
      }),
    );

    return enriched;
  } catch {
    return [];
  }
}

export async function unlinkExternalIdentity(
  auid: string,
  externalIdentityId: string,
  bearerToken?: string,
): Promise<boolean> {
  const sdk = getAuthSdk(bearerToken);
  try {
    const data = await sdk.UnlinkExternalIdentity({ auid, externalIdentityId });
    return data.unlinkExternalIdentity;
  } catch {
    return false;
  }
}
