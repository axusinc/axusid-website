import "server-only";
import { cookies } from "next/headers";
import { exchangeOAuthCode } from "@/lib/oauth-provider";
import { getAuthSdk } from "@/lib/auth-graphql";
import { buildGoogleNameElements } from "@/lib/profile-name";

import { createHash, randomBytes } from "node:crypto";

export const GITHUB_OAUTH_COOKIE = "axusid_github_oauth";
export const GITHUB_OAUTH_MAX_AGE = 10 * 60;

export const GITHUB_PENDING_REGISTRATION_COOKIE = "axusid_github_pending_reg";
export const GITHUB_PENDING_REGISTRATION_COOKIE_MAX_AGE = 15 * 60;

export type PendingGitHubRegistration = {
  refreshToken: string;
  username?: string;
  name?: string;
  email?: string;
  picture?: string;
  createdAt: number;
};

export function encodePendingGitHubRegistration(value: PendingGitHubRegistration): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodePendingGitHubRegistration(value?: string): PendingGitHubRegistration | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<PendingGitHubRegistration>;
    const createdAt = parsed.createdAt;
    const age = typeof createdAt === "number" ? Date.now() - createdAt : -1;
    const isFresh =
      age >= 0 && age <= GITHUB_PENDING_REGISTRATION_COOKIE_MAX_AGE * 1000;

    if (typeof parsed.refreshToken !== "string" || typeof createdAt !== "number" || !isFresh) {
      return null;
    }

    return {
      refreshToken: parsed.refreshToken,
      username: typeof parsed.username === "string" ? parsed.username : undefined,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      picture: typeof parsed.picture === "string" ? parsed.picture : undefined,
      createdAt,
    };
  } catch {
    return null;
  }
}

export async function getPendingGitHubRegistration(): Promise<PendingGitHubRegistration | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GITHUB_PENDING_REGISTRATION_COOKIE)?.value;
  return decodePendingGitHubRegistration(raw);
}

export async function clearPendingGitHubRegistration(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GITHUB_PENDING_REGISTRATION_COOKIE);
}

export async function setGitHubRegistrationName(params: {
  auid: string;
  tokenId: string;
  profile: Pick<PendingGitHubRegistration, "name">;
}): Promise<void> {
  const elements = buildGoogleNameElements({ name: params.profile.name });
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

export type GitHubOAuthState = {
  state: string;
  codeVerifier: string;
  callbackUri: string;
  intent: "login" | "link" | "register";
  linkAuid?: string;
  username?: string;
  contextAuid?: string;
  addAccount?: boolean;
  redirectUri?: string;
  next?: string;
  createdAt: number;
};

export function internalDestination(value: string | null | undefined): string | undefined {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return undefined;
  return value;
}

export function getGitHubClientId(): string {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!clientId) throw new Error("GitHub sign-in is not configured");
  return clientId;
}

export function getGitHubClientSecret(): string {
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientSecret) throw new Error("GitHub sign-in is not configured");
  return clientSecret;
}

export function getGitHubProviderId(): string {
  return "github";
}

export function getGitHubConfig(requestUrl: string) {
  return {
    clientId: getGitHubClientId(),
    clientSecret: getGitHubClientSecret(),
    providerId: getGitHubProviderId(),
    callbackUri: process.env.GITHUB_REDIRECT_URI?.trim() ||
      new URL("/auth/github/callback", process.env.OAUTH_ISSUER?.trim() || requestUrl).toString(),
  };
}

export function createGitHubAuthorization(requestUrl: string, continuation: {
  intent?: "login" | "link" | "register";
  linkAuid?: string;
  username?: string;
  contextAuid?: string;
  addAccount?: boolean;
  redirectUri?: string;
  next?: string;
}) {
  const config = getGitHubConfig(requestUrl);
  const intent = continuation.intent === "link" || continuation.linkAuid
    ? "link"
    : continuation.intent === "register"
      ? "register"
      : "login";
  const linkAuid = intent === "link" ? continuation.linkAuid : undefined;
  const oauthState: GitHubOAuthState = {
    state: randomBytes(32).toString("base64url"),
    codeVerifier: randomBytes(32).toString("base64url"),
    callbackUri: config.callbackUri,
    intent,
    linkAuid,
    username: typeof continuation.username === "string" && continuation.username ? continuation.username : undefined,
    contextAuid: typeof continuation.contextAuid === "string" && continuation.contextAuid ? continuation.contextAuid : undefined,
    addAccount: continuation.addAccount === true ? true : undefined,
    redirectUri: internalDestination(continuation.redirectUri),
    next: internalDestination(continuation.next),
    createdAt: Date.now(),
  };
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUri,
    state: oauthState.state,
    scope: "read:user user:email offline_access",
    code_challenge: createHash("sha256").update(oauthState.codeVerifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  return { url, cookie: Buffer.from(JSON.stringify(oauthState)).toString("base64url") };
}

export function decodeGitHubState(value?: string): GitHubOAuthState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<GitHubOAuthState>;
    const age = typeof parsed.createdAt === "number" ? Date.now() - parsed.createdAt : -1;
    if (typeof parsed.state !== "string" || !parsed.state ||
        typeof parsed.codeVerifier !== "string" || !parsed.codeVerifier ||
        typeof parsed.callbackUri !== "string" ||
        age < 0 || age > GITHUB_OAUTH_MAX_AGE * 1000 ||
        (parsed.linkAuid !== undefined && typeof parsed.linkAuid !== "string")) return null;
    // Backwards compat: cookies written before `intent` existed carry only
    // `linkAuid` for the link flow — treat those as link intents.
    const intent =
      parsed.intent === "link" || (parsed.intent === undefined && typeof parsed.linkAuid === "string")
        ? "link"
        : parsed.intent === "register"
          ? "register"
          : "login";
    const linkAuid = intent === "link" && typeof parsed.linkAuid === "string" ? parsed.linkAuid : undefined;
    if (intent === "link" && !linkAuid) return null;
    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      callbackUri: parsed.callbackUri,
      intent,
      linkAuid,
      username: typeof parsed.username === "string" && parsed.username ? parsed.username : undefined,
      contextAuid: typeof parsed.contextAuid === "string" && parsed.contextAuid ? parsed.contextAuid : undefined,
      addAccount: parsed.addAccount === true ? true : undefined,
      redirectUri: typeof parsed.redirectUri === "string" ? internalDestination(parsed.redirectUri) : undefined,
      next: typeof parsed.next === "string" ? internalDestination(parsed.next) : undefined,
      createdAt: parsed.createdAt!,
    };
  } catch {
    return null;
  }
}

export async function exchangeGitHubCode(code: string, state: GitHubOAuthState, requestUrl: string) {
  const config = getGitHubConfig(requestUrl);
  if (state.callbackUri !== config.callbackUri) throw new Error("GitHub callback configuration changed");
  const tokens = await exchangeOAuthCode({
    tokenUri: "https://github.com/login/oauth/access_token",
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    code,
    codeVerifier: state.codeVerifier,
    redirectUri: state.callbackUri,
  });
  return { providerId: config.providerId, clientId: config.clientId, refreshToken: tokens.refreshToken, accessToken: tokens.accessToken };
}

export async function fetchGitHubProfile(accessToken: string) {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const info = await response.json() as {
      login: string;
      name: string | null;
      email: string | null;
      avatar_url: string;
    };
    return {
      username: info.login,
      name: info.name || undefined,
      email: info.email || undefined,
      picture: info.avatar_url,
    };
  } catch {
    return null;
  }
}
