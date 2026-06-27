import "server-only";

import { cookies } from "next/headers";
import type { AuthCredentials } from "@/lib/auth-graphql";
import { refreshWithBackend } from "@/lib/oauth/adapter";
import {
  SESSION_COOKIE,
  getSession,
  serializeSession,
  sessionCookieOptions,
  type IdPSession,
} from "@/lib/session";

/** Refresh the access token this many ms before it expires. */
const REFRESH_BUFFER_MS = 60_000;

export function credentialsNeedRefresh(credentials: AuthCredentials): boolean {
  const expiresAt = Date.parse(credentials.accessTokenExpiresAt);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }
  return expiresAt - Date.now() <= REFRESH_BUFFER_MS;
}

export async function refreshSessionCredentials(
  session: IdPSession,
): Promise<IdPSession> {
  const credentials = await refreshWithBackend(session.credentials.refreshToken);
  return { ...session, credentials };
}

export async function persistSession(session: IdPSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    await serializeSession(session),
    sessionCookieOptions,
  );
}

/**
 * Returns the current IdP session, refreshing backend credentials when the
 * access token is expired or close to expiring.
 */
export async function getValidSession(): Promise<IdPSession | null> {
  const cookieStore = await cookies();
  let session = await getSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    return null;
  }

  if (!credentialsNeedRefresh(session.credentials)) {
    return session;
  }

  try {
    session = await refreshSessionCredentials(session);
    await persistSession(session);
    return session;
  } catch {
    return null;
  }
}
