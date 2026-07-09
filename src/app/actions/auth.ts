"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSdk, getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { loginWithBackend } from "@/lib/oauth/adapter";
import { resolveLoginAuid } from "@/lib/resolve-login-identity";
import {
  getOAuthClient,
  normalizeScopes,
  validateScopes,
} from "@/lib/oauth/clients";

import { getPendingOAuth } from "@/lib/pending-oauth";
import {
  buildAuthorizeResumeUrl,
  buildLoginOAuthUrl,
} from "@/lib/oauth/schemas";
import { getValidSession } from "@/lib/session-access";
import {
  SESSION_COOKIE,
  clearSessionCookieOptions,
  serializeSession,
  sessionCookieOptions,
  type IdPSession,
} from "@/lib/session";

export type AuthActionState = {
  error?: string;
  success?: string;
};

async function getActionSession(): Promise<IdPSession | null> {
  return getValidSession();
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  let auid: string;
  try {
    auid = await resolveLoginAuid(username);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unknown username.",
    };
  }

  const authReq = String(formData.get("auth_req") ?? "");
  const pendingOAuth = authReq ? await getPendingOAuth(authReq) : null;
  let scopes = ["openid"];

  if (pendingOAuth) {
    const client = await getOAuthClient(pendingOAuth.client_id);
    if (!client) {
      return { error: "Unknown OAuth client." };
    }

    try {
      scopes = validateScopes(
        client,
        normalizeScopes(pendingOAuth.scope),
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
    credentials = await loginWithBackend(
      auid,
      password,
    );
  } catch (error) {
    return {
      error: formatGraphqlError(error, "login", "Unable to sign in. Try again."),
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

  if (pendingOAuth && authReq) {
    redirect(buildAuthorizeResumeUrl(authReq));
  }

  redirect("/account");
}

export async function consentAction(formData: FormData) {
  const authReq = String(formData.get("auth_req") ?? "");
  const pendingOAuth = authReq ? await getPendingOAuth(authReq) : null;
  if (!pendingOAuth) {
    redirect(buildLoginOAuthUrl());
  }

  const client = await getOAuthClient(pendingOAuth.client_id);
  if (!client) {
    redirect(buildLoginOAuthUrl());
  }

  const session = await getValidSession();

  if (!session) {
    redirect(buildLoginOAuthUrl());
  }

  const cookieStore = await cookies();
  const updatedSession: IdPSession = {
    ...session,
    consentedClients: [...new Set([...session.consentedClients, client.clientId])],
  };

  cookieStore.set(
    SESSION_COOKIE,
    await serializeSession(updatedSession),
    sessionCookieOptions,
  );

  redirect(buildAuthorizeResumeUrl(authReq));
}

export async function denyConsentAction(formData: FormData) {
  const authReq = String(formData.get("auth_req") ?? "");
  const pendingOAuth = authReq ? await getPendingOAuth(authReq) : null;

  if (!pendingOAuth) {
    redirect("/");
  }

  const url = new URL(pendingOAuth.redirect_uri);
  url.searchParams.set("error", "access_denied");
  url.searchParams.set("error_description", "The user denied the request");
  if (pendingOAuth.state) {
    url.searchParams.set("state", pendingOAuth.state);
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

  try {
    const sdk = getAuthSdk();
    await sdk.CreateUser({ username, password });
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        undefined,
        "Unable to create account. Try again.",
      ),
    };
  }

  redirect(`/login?registered=${encodeURIComponent(username)}`);
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
      error: formatGraphqlError(
        error,
        undefined,
        "Unable to change password. Try again.",
      ),
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
      error: formatGraphqlError(error, undefined, "Unable to add username."),
    };
  }
}
