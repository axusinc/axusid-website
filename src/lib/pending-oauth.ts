import "server-only";

import type { AuthorizeQuery } from "@/lib/oauth/schemas";
import { authorizeQuerySchema } from "@/lib/oauth/schemas";
import { fromBase64Url, toBase64Url } from "@/lib/oauth/pkce";



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
  token?: string,
): Promise<AuthorizeQuery | null> {
  if (!token) {
    return null;
  }

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


