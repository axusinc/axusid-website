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
  const redirectUrl = String(formData.get("redirect_url") ?? "");

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

  const isOAuthFlow = redirectUrl.startsWith("/authorize");
  let scopes = ["openid"];

  if (isOAuthFlow) {
    let url: URL;
    try {
      url = new URL(redirectUrl, "http://localhost");
    } catch {
      return { error: "Invalid redirect_url." };
    }
    const clientId = url.searchParams.get("client_id");
    const scopeParam = url.searchParams.get("scope");

    if (!clientId) {
      return { error: "Invalid redirect_url: client_id is missing." };
    }

    const client = await getOAuthClient(clientId);
    if (!client) {
      return { error: "Unknown OAuth client." };
    }

    try {
      scopes = validateScopes(
        client,
        normalizeScopes(scopeParam ?? ""),
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

  if (isOAuthFlow && redirectUrl) {
    if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
      redirect(redirectUrl);
    }
  }

  redirect("/account");
}

export async function consentAction(formData: FormData) {
  const redirectUrl = String(formData.get("redirect_url") ?? "");
  if (!redirectUrl || !redirectUrl.startsWith("/") || redirectUrl.startsWith("//")) {
    redirect("/");
  }

  let url: URL;
  try {
    url = new URL(redirectUrl, "http://localhost");
  } catch {
    redirect("/");
  }

  const clientId = url.searchParams.get("client_id");
  if (!clientId) {
    redirect("/");
  }

  const client = await getOAuthClient(clientId);
  if (!client) {
    redirect("/");
  }

  const session = await getValidSession();

  if (!session) {
    redirect(`/login?redirect_url=${encodeURIComponent(redirectUrl)}`);
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

  redirect(redirectUrl);
}

export async function denyConsentAction(formData: FormData) {
  const redirectUrl = String(formData.get("redirect_url") ?? "");
  if (!redirectUrl || !redirectUrl.startsWith("/") || redirectUrl.startsWith("//")) {
    redirect("/");
  }

  let url: URL;
  try {
    url = new URL(redirectUrl, "http://localhost");
  } catch {
    redirect("/");
  }

  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");

  if (!redirectUri) {
    redirect("/");
  }

  const clientUrl = new URL(redirectUri);
  clientUrl.searchParams.set("error", "access_denied");
  clientUrl.searchParams.set("error_description", "The user denied the request");
  if (state) {
    clientUrl.searchParams.set("state", state);
  }

  redirect(clientUrl.toString());
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const redirectUrl = String(formData.get("redirect_url") ?? "");

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

  const dest = redirectUrl
    ? `/login?registered=${encodeURIComponent(username)}&redirect_url=${encodeURIComponent(redirectUrl)}`
    : `/login?registered=${encodeURIComponent(username)}`;
  redirect(dest);
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
