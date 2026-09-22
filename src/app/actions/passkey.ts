"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { getValidSession, addAccountToSession } from "@/lib/session-access";
import type { IdPSession } from "@/lib/session";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { resolveLoginAuid } from "@/lib/resolve-login-identity";
import { SESSION_PERMISSIONS } from "@/lib/oauth/adapter";
import { setLastAuthMethod } from "@/lib/last-auth-method-server";
import {
  startPasskeyEnrollment,
  verifyPasskeyEnrollment,
  updatePasskeyName,
  startPasskeyLogin,
  loginWithPasskey,
  deletePasskey,
  type PasskeyEnrollmentResponse,
  type PasskeyLoginResponse,
} from "@/lib/passkey-graphql";

export type PasskeyActionState = {
  error?: string;
  success?: string;
  enrollmentResponse?: PasskeyEnrollmentResponse;
  loginResponse?: PasskeyLoginResponse;
  auid?: string;
  passkeyUsername?: string;
};

async function resolveRp(explicitRp?: string): Promise<string | undefined> {
  if (explicitRp?.trim()) {
    return explicitRp.trim();
  }
  try {
    const headerList = await headers();
    const hostHeader =
      headerList.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      headerList.get("host")?.trim();
    if (hostHeader) {
      return hostHeader.split(":")[0];
    }
  } catch {
    // Fallback if headers context unavailable
  }
  return undefined;
}

export async function startPasskeyLoginAction(
  username?: string,
  redirectUri?: string,
  rp?: string,
): Promise<{ error?: string; loginResponse?: PasskeyLoginResponse; auid?: string }> {
  const normalizedUsername = username?.trim().replace(/^@/, "");

  let auid: string | undefined;
  if (normalizedUsername) {
    try {
      auid = await resolveLoginAuid(normalizedUsername);
    } catch {
      // Username resolution is optional for passkey authentication
    }
  }

  try {
    const effectiveRp = (await resolveRp(rp)) || "localhost";
    const loginResponse = await startPasskeyLogin(
      effectiveRp,
      SESSION_PERMISSIONS,
    );
    return { loginResponse, auid };
  } catch (error) {
    return {
      error: formatGraphqlError(error, undefined, "Unable to initiate passkey sign-in."),
    };
  }
}

export async function loginWithPasskeyAction(params: {
  username?: string;
  challengeId: string;
  credentialResponse: string;
  redirectUri?: string;
  next?: string;
}): Promise<PasskeyActionState> {
  const { username, challengeId, credentialResponse, redirectUri, next } = params;

  let auid: string | undefined;
  if (username) {
    const normalizedUsername = username.trim().replace(/^@/, "");
    if (normalizedUsername) {
      try {
        auid = await resolveLoginAuid(normalizedUsername);
      } catch {
        // Optional username resolution ignored for passkeys
      }
    }
  }

  let login;
  try {
    login = await loginWithPasskey(challengeId, credentialResponse, auid);
  } catch (error) {
    return {
      error: formatGraphqlError(error, undefined, "Passkey authentication failed."),
    };
  }

  const session: IdPSession = {
    auid: login.auid,
    tokenId: login.tokenId,
    consentedClients: [],
  };

  await addAccountToSession(session);
  await setLastAuthMethod("passkey");

  redirect(
    resolveAuthenticatedRedirect({
      redirectUri: redirectUri || undefined,
      next: next || undefined,
    }),
  );
}

export async function startPasskeyEnrollmentAction(
  displayName?: string,
  rp?: string,
): Promise<PasskeyActionState> {
  const session = await getValidSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  try {
    const sdk = getAuthSdkForSession(session);
    const usernames = await sdk.Usernames({ auid: session.auid });
    const passkeyUsername = usernames.usernames?.defaultUsername?.trim();

    if (!passkeyUsername) {
      return { error: "Your account does not have a default username." };
    }

    const effectiveRp = (await resolveRp(rp)) || "localhost";
    const response = await startPasskeyEnrollment(session.auid, effectiveRp, displayName, session.tokenId);
    return { enrollmentResponse: response, passkeyUsername };
  } catch (error) {
    return {
      error: formatGraphqlError(error, undefined, "Unable to start passkey registration."),
    };
  }
}

export async function verifyPasskeyEnrollmentAction(
  challengeId: string,
  credentialResponse: string,
  name?: string,
): Promise<PasskeyActionState> {
  const session = await getValidSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  try {
    await verifyPasskeyEnrollment(
      session.auid,
      challengeId,
      credentialResponse,
      name,
      session.tokenId,
    );

    revalidatePath("/account");
    return { success: "Passkey registered successfully!" };
  } catch (error) {
    return {
      error: formatGraphqlError(error, undefined, "Unable to register passkey."),
    };
  }
}

export async function updatePasskeyNameAction(
  passkeyId: string,
  name: string,
): Promise<PasskeyActionState> {
  const session = await getValidSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Passkey name cannot be empty." };
  }

  try {
    const success = await updatePasskeyName(session.auid, passkeyId, trimmedName, session.tokenId);
    if (!success) {
      return { error: "Failed to update passkey name." };
    }

    revalidatePath("/account");
    return { success: "Passkey name updated successfully." };
  } catch (error) {
    return {
      error: formatGraphqlError(error, undefined, "Unable to update passkey name."),
    };
  }
}

export async function deletePasskeyAction(
  passkeyId: string,
): Promise<PasskeyActionState> {
  const session = await getValidSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  try {
    const deleted = await deletePasskey(session.auid, passkeyId, session.tokenId);
    if (!deleted) {
      return {
        error: "This passkey cannot be removed. Add another way to sign in first.",
      };
    }

    revalidatePath("/account");
    return { success: "Passkey removed successfully." };
  } catch (error) {
    return {
      error: formatGraphqlError(error, undefined, "Unable to remove passkey."),
    };
  }
}
