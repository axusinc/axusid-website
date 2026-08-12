import "server-only";

import type { AuthCredentials } from "@/lib/auth-graphql";
import { fromBase64Url, toBase64Url } from "@/lib/oauth/pkce";
import { partitionScopes } from "@/lib/oauth/scopes";

export const SESSION_COOKIE = "axusid_session";

export type IdPSession = {
  auid: string;
  credentials: AuthCredentials;
  oidcScopes: string[];
  axusPermissions: string[];
  consentedClients: string[];
};

export type MultiSession = {
  activeAuid: string;
  accounts: IdPSession[];
};

type LegacySessionPayload = IdPSession & {
  exp: number;
  /** @deprecated Legacy field — partitioned on read */
  scopes?: string[];
};

type MultiSessionPayload = {
  activeAuid: string;
  accounts: Array<IdPSession & { scopes?: string[] }>;
  exp: number;
};

const encoder = new TextEncoder();

function isCanonicalAuid(value: unknown): value is string {
  return typeof value === "string" && /^\d+(?:,\d+)*$/.test(value);
}

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

function parseAccountPayload(rawAccount: IdPSession & { scopes?: string[] }): IdPSession {
  if (rawAccount.oidcScopes && rawAccount.axusPermissions) {
    return {
      auid: rawAccount.auid,
      credentials: rawAccount.credentials,
      oidcScopes: rawAccount.oidcScopes,
      axusPermissions: rawAccount.axusPermissions,
      consentedClients: rawAccount.consentedClients ?? [],
    };
  }

  const legacyScopes = rawAccount.scopes ?? [];
  const { oidcScopes, axusPermissions } = partitionScopes(legacyScopes);

  return {
    auid: rawAccount.auid,
    credentials: rawAccount.credentials,
    oidcScopes,
    axusPermissions,
    consentedClients: rawAccount.consentedClients ?? [],
  };
}

export async function encodeMultiSession(multiSession: MultiSession): Promise<string> {
  const payload: MultiSessionPayload = {
    activeAuid: multiSession.activeAuid,
    accounts: multiSession.accounts,
    // 100 years refresh token / session lifetime
    exp: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
  };

  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(body);
  return `${body}.${signature}`;
}

export async function decodeMultiSession(token: string): Promise<MultiSession | null> {
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
    const raw = JSON.parse(json) as Partial<MultiSessionPayload & LegacySessionPayload>;

    if (!raw.exp || raw.exp <= Date.now()) {
      return null;
    }

    // Check if multi-session format
    if (raw.activeAuid && Array.isArray(raw.accounts)) {
      const accounts = raw.accounts
        .filter((account) => isCanonicalAuid(account.auid))
        .map(parseAccountPayload);
      if (accounts.length === 0) {
        return null;
      }
      // Ensure activeAuid exists in accounts; fallback to first account if not found
      const activeExists = accounts.some((acc) => acc.auid === raw.activeAuid);
      const activeAuid = activeExists ? raw.activeAuid! : accounts[0].auid;
      return {
        activeAuid,
        accounts,
      };
    }

    // Fallback: legacy single session payload
    if (isCanonicalAuid(raw.auid) && raw.credentials) {
      const singleAccount = parseAccountPayload(raw as LegacySessionPayload);
      return {
        activeAuid: singleAccount.auid,
        accounts: [singleAccount],
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function getMultiSession(cookieValue?: string): Promise<MultiSession | null> {
  if (!cookieValue) {
    return null;
  }

  return decodeMultiSession(cookieValue);
}

export async function getSession(cookieValue?: string): Promise<IdPSession | null> {
  const multi = await getMultiSession(cookieValue);
  if (!multi) {
    return null;
  }
  return multi.accounts.find((acc) => acc.auid === multi.activeAuid) ?? multi.accounts[0] ?? null;
}

export async function serializeMultiSession(multiSession: MultiSession): Promise<string> {
  return encodeMultiSession(multiSession);
}

export async function serializeSession(session: IdPSession): Promise<string> {
  return encodeMultiSession({
    activeAuid: session.auid,
    accounts: [session],
  });
}

export const sessionCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 100 * 365 * 24 * 60 * 60, // 100 years
};

export const clearSessionCookieOptions = {
  ...sessionCookieOptions,
  maxAge: 0,
};
