import "server-only";

import type { AuthorizeQuery } from "@/lib/oauth/schemas";
import { authorizeQuerySchema } from "@/lib/oauth/schemas";
import { fromBase64Url, toBase64Url } from "@/lib/oauth/pkce";
import type { IdPSession } from "@/lib/session";

export const PENDING_OAUTH_COOKIE = "axusid_pending_oauth";

export const PENDING_OAUTH_TTL_MS = 15 * 60 * 1000;

const encoder = new TextEncoder();

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

async function verify(value: string, signature: string): Promise<boolean> {
  const expected = await sign(value);
  return expected === signature;
}

type PendingOAuthPayload = AuthorizeQuery & {
  exp: number;
};

export async function serializePendingOAuth(
  query: AuthorizeQuery,
): Promise<string> {
  const payload: PendingOAuthPayload = {
    ...query,
    exp: Date.now() + PENDING_OAUTH_TTL_MS,
  };

  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(body);
  return `${body}.${signature}`;
}

export async function getPendingOAuth(
  cookieValue?: string,
): Promise<AuthorizeQuery | null> {
  if (!cookieValue) {
    return null;
  }

  const [body, signature] = cookieValue.split(".");
  if (!body || !signature) {
    return null;
  }

  const valid = await verify(body, signature);
  if (!valid) {
    return null;
  }

  try {
    const json = new TextDecoder().decode(fromBase64Url(body));
    const payload = JSON.parse(json) as PendingOAuthPayload;

    if (payload.exp <= Date.now()) {
      return null;
    }

    const parsed = authorizeQuerySchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function resolvePendingOAuth(
  cookieValue: string | undefined,
  session: IdPSession | null,
): Promise<AuthorizeQuery | null> {
  if (session?.pendingOAuth) {
    const parsed = authorizeQuerySchema.safeParse(session.pendingOAuth);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return getPendingOAuth(cookieValue);
}

export const pendingOAuthCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: PENDING_OAUTH_TTL_MS / 1000,
};

export const clearPendingOAuthCookieOptions = {
  ...pendingOAuthCookieOptions,
  maxAge: 0,
};
