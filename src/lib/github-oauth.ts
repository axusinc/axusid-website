import "server-only";
import { exchangeOAuthCode } from "@/lib/oauth-provider";

import { createHash, randomBytes } from "node:crypto";

export const GITHUB_OAUTH_COOKIE = "axusid_github_oauth";
export const GITHUB_OAUTH_MAX_AGE = 10 * 60;

export type GitHubOAuthState = {
  state: string;
  codeVerifier: string;
  callbackUri: string;
  linkAuid?: string;
  redirectUri?: string;
  next?: string;
  createdAt: number;
};

export function internalDestination(value: string | null | undefined): string | undefined {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return undefined;
  return value;
}

export function getGitHubConfig(requestUrl: string) {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("GitHub sign-in is not configured");
  return {
    clientId,
    clientSecret,
    providerId: "github",
    callbackUri: process.env.GITHUB_REDIRECT_URI?.trim() ||
      new URL("/auth/github/callback", process.env.OAUTH_ISSUER?.trim() || requestUrl).toString(),
  };
}

export function createGitHubAuthorization(requestUrl: string, continuation: {
  linkAuid?: string;
  redirectUri?: string;
  next?: string;
}) {
  const config = getGitHubConfig(requestUrl);
  const oauthState: GitHubOAuthState = {
    state: randomBytes(32).toString("base64url"),
    codeVerifier: randomBytes(32).toString("base64url"),
    callbackUri: config.callbackUri,
    linkAuid: continuation.linkAuid,
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
    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      callbackUri: parsed.callbackUri,
      linkAuid: parsed.linkAuid,
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
  return { providerId: config.providerId, clientId: config.clientId, refreshToken: tokens.refreshToken };
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
