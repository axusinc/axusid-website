"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSdk, getAuthSdkForSession } from "@/lib/auth-graphql";
import { loginWithBackend } from "@/lib/oauth/adapter";
import {
  getOAuthClient,
  normalizeScopes,
  validateScopes,
} from "@/lib/oauth/clients";
import { scopesToBackendPermissions } from "@/lib/oauth/permissions";
import {
  authorizeQuerySchema,
  buildAuthorizeReturnUrl,
} from "@/lib/oauth/schemas";
import {
  SESSION_COOKIE,
  clearSessionCookieOptions,
  getSession,
  serializeSession,
  sessionCookieOptions,
  type IdPSession,
} from "@/lib/session";

export type AuthActionState = {
  error?: string;
  success?: string;
};

async function getActionSession(): Promise<IdPSession | null> {
  const cookieStore = await cookies();
  return getSession(cookieStore.get(SESSION_COOKIE)?.value);
}

function parseOAuthParams(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const oauthParams = {
    response_type: raw.response_type,
    client_id: raw.client_id,
    redirect_uri: raw.redirect_uri,
    scope: raw.scope || undefined,
    state: raw.state || undefined,
    code_challenge: raw.code_challenge,
    code_challenge_method: raw.code_challenge_method,
  };

  const parsed = authorizeQuerySchema.safeParse(oauthParams);
  return parsed.success ? parsed.data : null;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const auid = String(formData.get("auid") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!auid || !password) {
    return { error: "AUID and password are required." };
  }

  const oauthParams = parseOAuthParams(formData);
  let scopes = ["openid"];

  if (oauthParams) {
    const client = await getOAuthClient(oauthParams.client_id);
    if (!client) {
      return { error: "Unknown OAuth client." };
    }

    try {
      scopes = validateScopes(
        client,
        normalizeScopes(oauthParams.scope),
      );
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Invalid requested scopes.",
      };
    }
  }

  let credentials;
  try {
    const backendPermissions = scopesToBackendPermissions(scopes);
    credentials = await loginWithBackend(
      auid,
      password,
      backendPermissions ?? [],
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to sign in. Try again.",
    };
  }

  const session: IdPSession = {
    auid,
    credentials,
    scopes,
    consentedClients: [],
  };

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    await serializeSession(session),
    sessionCookieOptions,
  );

  if (oauthParams) {
    redirect(buildAuthorizeReturnUrl(oauthParams));
  }

  redirect("/account");
}

export async function consentAction(formData: FormData) {
  const oauthParams = parseOAuthParams(formData);
  if (!oauthParams) {
    redirect("/login");
  }

  const client = await getOAuthClient(oauthParams.client_id);
  if (!client) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const { getSession } = await import("@/lib/session");
  const session = await getSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) {
    redirect("/login");
  }

  const updatedSession: IdPSession = {
    ...session,
    consentedClients: [...new Set([...session.consentedClients, client.clientId])],
  };

  cookieStore.set(
    SESSION_COOKIE,
    await serializeSession(updatedSession),
    sessionCookieOptions,
  );

  redirect(buildAuthorizeReturnUrl(oauthParams));
}

export async function denyConsentAction(formData: FormData) {
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");

  if (!redirectUri) {
    redirect("/");
  }

  const url = new URL(redirectUri);
  url.searchParams.set("error", "access_denied");
  url.searchParams.set("error_description", "The user denied the request");
  if (state) {
    url.searchParams.set("state", state);
  }

  redirect(url.toString());
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  let auid: string;
  try {
    const sdk = getAuthSdk();
    const result = await sdk.CreateUser({ username, password });
    auid = result.createUser.auid;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create account. Try again.";

    if (message.includes('"path":["createUser"]')) {
      return {
        error:
          "Unable to create account. This username may already be taken.",
      };
    }

    return { error: message };
  }

  redirect(`/login?registered=${encodeURIComponent(auid)}`);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", clearSessionCookieOptions);
  redirect("/login");
}

export async function changePasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await getActionSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!newPassword) {
    return { error: "New password is required." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const sdk = getAuthSdkForSession(session);
    await sdk.ChangePassword({ auid: session.auid, newPassword });
    return { success: "Password updated successfully." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to change password. Try again.",
    };
  }
}

export async function addUsernameAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await getActionSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  const username = String(formData.get("username") ?? "").trim();

  if (!username) {
    return { error: "Username is required." };
  }

  try {
    const sdk = getAuthSdkForSession(session);
    await sdk.AddUsername({ auid: session.auid, username });
    return { success: "Username added." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to add username.",
    };
  }
}
