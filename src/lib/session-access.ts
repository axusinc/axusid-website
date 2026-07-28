import "server-only";

import { cookies } from "next/headers";
import type { AuthCredentials } from "@/lib/auth-graphql";
import { refreshWithBackend } from "@/lib/oauth/adapter";
import {
  SESSION_COOKIE,
  clearSessionCookieOptions,
  getMultiSession,
  getSession,
  serializeMultiSession,
  serializeSession,
  sessionCookieOptions,
  type IdPSession,
  type MultiSession,
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

export async function persistMultiSession(multiSession: MultiSession): Promise<void> {
  const cookieStore = await cookies();
  if (multiSession.accounts.length === 0) {
    cookieStore.set(SESSION_COOKIE, "", clearSessionCookieOptions);
    return;
  }
  cookieStore.set(
    SESSION_COOKIE,
    await serializeMultiSession(multiSession),
    sessionCookieOptions,
  );
}

/**
 * Returns all valid sessions and active AUID, refreshing credentials as needed.
 */
export async function getValidMultiSession(): Promise<MultiSession | null> {
  const cookieStore = await cookies();
  const multiSession = await getMultiSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!multiSession || multiSession.accounts.length === 0) {
    return null;
  }

  let updated = false;
  const updatedAccounts: IdPSession[] = [];

  for (const account of multiSession.accounts) {
    if (credentialsNeedRefresh(account.credentials)) {
      try {
        const refreshed = await refreshSessionCredentials(account);
        updatedAccounts.push(refreshed);
        updated = true;
      } catch {
        // If refresh fails for an account, keep old or skip depending on whether active
        // If active fails, we keep it so user can be prompted to re-login if needed
        updatedAccounts.push(account);
      }
    } else {
      updatedAccounts.push(account);
    }
  }

  const result: MultiSession = {
    activeAuid: multiSession.activeAuid,
    accounts: updatedAccounts,
  };

  if (updated) {
    await persistMultiSession(result);
  }

  return result;
}

/**
 * Returns the active IdP session, refreshing backend credentials when expired.
 */
export async function getValidSession(): Promise<IdPSession | null> {
  const multi = await getValidMultiSession();
  if (!multi) {
    return null;
  }
  return multi.accounts.find((acc) => acc.auid === multi.activeAuid) ?? multi.accounts[0] ?? null;
}

/**
 * Adds or updates an account in the multi-session store and sets it as active.
 */
export async function addAccountToSession(session: IdPSession): Promise<MultiSession> {
  const existing = await getValidMultiSession();
  const accounts = existing ? [...existing.accounts] : [];

  const index = accounts.findIndex((acc) => acc.auid === session.auid);
  if (index >= 0) {
    accounts[index] = session;
  } else {
    accounts.push(session);
  }

  const newMultiSession: MultiSession = {
    activeAuid: session.auid,
    accounts,
  };

  await persistMultiSession(newMultiSession);
  return newMultiSession;
}

/**
 * Switches the active account in the multi-session store.
 */
export async function switchActiveAccount(auid: string): Promise<boolean> {
  const existing = await getValidMultiSession();
  if (!existing) return false;

  const targetExists = existing.accounts.some((acc) => acc.auid === auid);
  if (!targetExists) return false;

  const updated: MultiSession = {
    ...existing,
    activeAuid: auid,
  };

  await persistMultiSession(updated);
  return true;
}

/**
 * Removes a specific account from the multi-session store.
 */
export async function removeAccountFromSession(auid: string): Promise<MultiSession | null> {
  const existing = await getValidMultiSession();
  if (!existing) return null;

  const remaining = existing.accounts.filter((acc) => acc.auid !== auid);

  if (remaining.length === 0) {
    await clearAllSessions();
    return null;
  }

  let nextActive = existing.activeAuid;
  if (existing.activeAuid === auid) {
    nextActive = remaining[0].auid;
  }

  const updated: MultiSession = {
    activeAuid: nextActive,
    accounts: remaining,
  };

  await persistMultiSession(updated);
  return updated;
}

/**
 * Clears all signed-in sessions.
 */
export async function clearAllSessions(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", clearSessionCookieOptions);
}
