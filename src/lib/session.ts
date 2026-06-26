import "server-only";

import type { AuthCredentials } from "@/lib/auth-graphql";
import { fromBase64Url, toBase64Url } from "@/lib/oauth/pkce";

export const SESSION_COOKIE = "axusid_session";

export type IdPSession = {
  auid: string;
  credentials: AuthCredentials;
  scopes: string[];
  consentedClients: string[];
};

type SessionPayload = IdPSession & {
  exp: number;
};

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

async function encodeSession(session: IdPSession): Promise<string> {
  const payload: SessionPayload = {
    ...session,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };

  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(body);
  return `${body}.${signature}`;
}

async function decodeSession(token: string): Promise<IdPSession | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const valid = await verify(body, signature);
  if (!valid) {
    return null;
  }

  try {
    const json = new TextDecoder().decode(fromBase64Url(body));
    const payload = JSON.parse(json) as SessionPayload;

    if (payload.exp <= Date.now()) {
      return null;
    }

    return {
      auid: payload.auid,
      credentials: payload.credentials,
      scopes: payload.scopes,
      consentedClients: payload.consentedClients ?? [],
    };
  } catch {
    return null;
  }
}

export async function getSession(cookieValue?: string): Promise<IdPSession | null> {
  if (!cookieValue) {
    return null;
  }

  return decodeSession(cookieValue);
}

export async function serializeSession(session: IdPSession): Promise<string> {
  return encodeSession(session);
}

export const sessionCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24,
};

export const clearSessionCookieOptions = {
  ...sessionCookieOptions,
  maxAge: 0,
};
