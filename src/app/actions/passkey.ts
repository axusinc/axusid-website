"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAuthSdkForSession, opaqueGraphqlBearer } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { getValidSession, addAccountToSession } from "@/lib/session-access";
import type { IdPSession } from "@/lib/session";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { resolveLoginAuid } from "@/lib/resolve-login-identity";
import { getOAuthClient, normalizeScopes, partitionScopes, validateScopes } from "@/lib/oauth/clients";
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

  let axusPermissions: string[] = [];
  if (redirectUri && redirectUri.startsWith("/authorize")) {
    try {
      const url = new URL(redirectUri, "http://localhost");
      const clientId = url.searchParams.get("client_id") || url.searchParams.get("auid");
      const scopeParam = url.searchParams.get("scope");
      if (clientId) {
        const client = await getOAuthClient(clientId);
        if (client) {
          const validated = validateScopes(client, normalizeScopes(scopeParam ?? ""));
          axusPermissions = partitionScopes(validated).axusPermissions;
        }
      }
    } catch {
      // Ignore scope parsing errors for ceremony start
    }
  }

  try {
    const loginPermissions = axusPermissions.length > 0
      ? [
          ...new Set([
            ...axusPermissions,
            ...(auid ? [`identity.${auid}.credentials.issue`] : []),
          ]),
        ]
      : undefined;
    const effectiveRp = await resolveRp(rp);
    const loginResponse = await startPasskeyLogin(
      loginPermissions,
      effectiveRp,
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

  const isOAuthFlow = !!redirectUri?.startsWith("/authorize");
  let oidcScopes = ["openid"];
  let axusPermissions: string[] = [];

  if (isOAuthFlow && redirectUri) {
    let url: URL;
    try {
      url = new URL(redirectUri, "http://localhost");
    } catch {
      return { error: "Invalid redirect_uri." };
    }
    const clientId = url.searchParams.get("client_id") || url.searchParams.get("auid");
    const scopeParam = url.searchParams.get("scope");

    if (clientId) {
      const client = await getOAuthClient(clientId);
      if (client) {
        try {
          const validatedScopes = validateScopes(client, normalizeScopes(scopeParam ?? ""));
          const partitioned = partitionScopes(validatedScopes);
          oidcScopes = partitioned.oidcScopes;
          axusPermissions = partitioned.axusPermissions;
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Invalid scope." };
        }
      }
    }
  }

  let credentials;
  try {
    credentials = await loginWithPasskey(challengeId, credentialResponse, auid);
  } catch (error) {
    return {
      error: formatGraphqlError(error, undefined, "Passkey authentication failed."),
    };
  }

  const session: IdPSession = {
    auid: credentials.auid,
    credentials,
    oidcScopes,
    axusPermissions,
    consentedClients: [],
  };

  await addAccountToSession(session);

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
    const bearer = opaqueGraphqlBearer(session.credentials);
    const sdk = getAuthSdkForSession(session);
    const usernames = await sdk.Usernames({ auid: session.auid });
    const passkeyUsername = usernames.usernames?.defaultUsername?.trim();

    if (!passkeyUsername) {
      return { error: "Your account does not have a default username." };
    }

    const effectiveRp = await resolveRp(rp);
    const response = await startPasskeyEnrollment(session.auid, displayName, bearer, undefined, effectiveRp);
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
    const bearer = opaqueGraphqlBearer(session.credentials);
    await verifyPasskeyEnrollment(
      session.auid,
      challengeId,
      credentialResponse,
      name,
      bearer,
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
    const bearer = opaqueGraphqlBearer(session.credentials);
    const success = await updatePasskeyName(session.auid, passkeyId, trimmedName, bearer);
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
    const bearer = opaqueGraphqlBearer(session.credentials);
    await deletePasskey(session.auid, passkeyId, bearer);

    revalidatePath("/account");
    return { success: "Passkey removed successfully." };
  } catch (error) {
    return {
      error: formatGraphqlError(error, undefined, "Unable to remove passkey."),
    };
  }
}
