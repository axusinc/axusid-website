"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getAuthSdk, getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { loginWithBackend } from "@/lib/oauth/adapter";
import { resolveLoginAuid } from "@/lib/resolve-login-identity";
import {
  getOAuthClient,
  normalizeScopes,
  partitionScopes,
  validateScopes,
} from "@/lib/oauth/clients";

import {
  addAccountToSession,
  clearAllSessions,
  getValidSession,
  removeAccountFromSession,
  switchActiveAccount,
} from "@/lib/session-access";
import {
  SESSION_COOKIE,
  clearSessionCookieOptions,
  serializeSession,
  sessionCookieOptions,
  type IdPSession,
} from "@/lib/session";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import {
  createIdentityProvider,
  createServiceProvider,
  createSamlLogoutRequest,
} from "@/lib/saml/saml-idp";
import { formatSyntheticEmail } from "@/lib/user-profile";

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
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const next = String(formData.get("next") ?? "");

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

  const isOAuthFlow = redirectUri.startsWith("/authorize");
  let oidcScopes = ["openid"];
  let axusPermissions: string[] = [];

  if (isOAuthFlow) {
    let url: URL;
    try {
      url = new URL(redirectUri, "http://localhost");
    } catch {
      return { error: "Invalid redirect_uri." };
    }
    const clientId = url.searchParams.get("client_id") || url.searchParams.get("auid");
    const scopeParam = url.searchParams.get("scope");

    if (!clientId) {
      return { error: "Invalid redirect_uri: client_id or auid is missing." };
    }

    const client = await getOAuthClient(clientId);
    if (!client) {
      return { error: "Unknown OAuth client." };
    }

    try {
      const validatedScopes = validateScopes(
        client,
        normalizeScopes(scopeParam ?? ""),
      );
      const partitioned = partitionScopes(validatedScopes);
      oidcScopes = partitioned.oidcScopes;
      axusPermissions = partitioned.axusPermissions;
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
      axusPermissions.length > 0 ? axusPermissions : undefined,
    );
  } catch (error) {
    return {
      error: formatGraphqlError(error, "login", "Unable to sign in. Try again."),
    };
  }

  const session: IdPSession = {
    auid,
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

export async function switchAccountAction(formData: FormData): Promise<AuthActionState> {
  const auid = String(formData.get("auid") ?? "").trim();
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const next = String(formData.get("next") ?? "");

  if (auid) {
    await switchActiveAccount(auid);
  }

  revalidatePath("/account");

  if (redirectUri || next) {
    redirect(
      resolveAuthenticatedRedirect({
        redirectUri: redirectUri || undefined,
        next: next || undefined,
      }),
    );
  }

  return { success: "Account switched successfully." };
}

export async function logoutAccountAction(formData: FormData) {
  const auid = String(formData.get("auid") ?? "").trim();
  const redirectUri = String(formData.get("redirect_uri") ?? "");

  if (auid) {
    const remaining = await removeAccountFromSession(auid);
    revalidatePath("/", "layout");
    if (!remaining) {
      redirect("/login");
    }
    if (redirectUri) {
      redirect(redirectUri);
    }
    redirect("/account");
  }

  redirect("/account");
}

export async function logoutAllAction() {
  await clearAllSessions();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function logoutAction(formData?: FormData) {
  const targetAuid = formData ? String(formData.get("auid") ?? "").trim() : "";
  const logoutAll = formData ? formData.get("logout_all") === "true" : false;

  if (logoutAll) {
    await clearAllSessions();
    revalidatePath("/", "layout");
    redirect("/login");
  }

  if (targetAuid) {
    const remaining = await removeAccountFromSession(targetAuid);
    revalidatePath("/", "layout");
    if (!remaining) {
      redirect("/login");
    }
    redirect("/account");
  }

  const session = await getValidSession();
  let redirectUrl: string = "/login";

  if (session?.auid) {
    try {
      const samlConfig = await getSamlConfigByAuid(session.auid);
      if (samlConfig && samlConfig.sloUrl) {
        const email = formatSyntheticEmail(session.auid);
        const idp = createIdentityProvider(session.auid);
        const sp = createServiceProvider(samlConfig.entityId, samlConfig.acsUrl, samlConfig.sloUrl);
        const logoutReq = await createSamlLogoutRequest(idp, sp, email);
        redirectUrl = logoutReq.context;
      }
    } catch (e) {
      console.error("Failed to generate SAML SLO request during logout:", e);
    }

    const remaining = await removeAccountFromSession(session.auid);
    revalidatePath("/", "layout");

    if (remaining) {
      redirect("/account");
    }
  } else {
    await clearAllSessions();
    revalidatePath("/", "layout");
  }

  redirect(redirectUrl);
}

export async function consentAction(formData: FormData) {
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  if (!redirectUri || !redirectUri.startsWith("/") || redirectUri.startsWith("//")) {
    redirect("/");
  }

  let url: URL;
  try {
    url = new URL(redirectUri, "http://localhost");
  } catch {
    redirect("/");
  }

  let clientId = url.searchParams.get("client_id") || url.searchParams.get("auid");
  let isSaml = false;
  if (!clientId && url.pathname.startsWith("/saml/sso/")) {
    const parts = url.pathname.split("/");
    clientId = parts[parts.length - 1] || null;
    isSaml = true;
  }

  if (!clientId) {
    redirect("/");
  }

  if (isSaml) {
    const samlConfig = await getSamlConfigByAuid(clientId);
    if (!samlConfig) {
      redirect("/");
    }
  } else {
    const client = await getOAuthClient(clientId);
    if (!client) {
      redirect("/");
    }
  }

  const session = await getValidSession();

  if (!session) {
    redirect(`/login?redirect_uri=${encodeURIComponent(redirectUri)}`);
  }

  const updatedSession: IdPSession = {
    ...session,
    consentedClients: [...new Set([...session.consentedClients, clientId])],
  };

  await addAccountToSession(updatedSession);

  redirect(redirectUri);
}

export async function denyConsentAction(formData: FormData) {
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  if (!redirectUri || !redirectUri.startsWith("/") || redirectUri.startsWith("//")) {
    redirect("/");
  }

  let url: URL;
  try {
    url = new URL(redirectUri, "http://localhost");
  } catch {
    redirect("/");
  }

  let clientId = url.searchParams.get("client_id") || url.searchParams.get("auid");
  let isSaml = false;
  if (!clientId && url.pathname.startsWith("/saml/sso/")) {
    const parts = url.pathname.split("/");
    clientId = parts[parts.length - 1] || null;
    isSaml = true;
  }

  if (isSaml && clientId) {
    const samlConfig = await getSamlConfigByAuid(clientId);
    if (samlConfig?.acsUrl) {
      const acsUrl = new URL(samlConfig.acsUrl);
      acsUrl.searchParams.set("error", "access_denied");
      acsUrl.searchParams.set("error_description", "The user denied the request");
      const relayState = url.searchParams.get("RelayState");
      if (relayState) {
        acsUrl.searchParams.set("RelayState", relayState);
      }
      redirect(acsUrl.toString());
    }
  }

  const clientRedirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");

  if (!clientRedirectUri) {
    redirect("/");
  }

  const clientUrl = new URL(clientRedirectUri);
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
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const contextAuid = String(formData.get("contextAuid") ?? "").trim();

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const sdk = getAuthSdk();
    await sdk.CreateUser({
      username,
      password,
      contextAuid: contextAuid || undefined,
    });
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        undefined,
        "Unable to create account. Try again.",
      ),
    };
  }

  const dest = redirectUri
    ? `/login?registered=${encodeURIComponent(username)}&redirect_uri=${encodeURIComponent(redirectUri)}`
    : `/login?registered=${encodeURIComponent(username)}`;
  redirect(dest);
}

export async function createNestedAccountAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await getActionSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const customContextAuid = String(formData.get("contextAuid") ?? "").trim();
  const contextAuid = customContextAuid || session.auid;

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const sdk = getAuthSdkForSession(session);
    const result = await sdk.CreateUser({
      username,
      password,
      contextAuid,
    });

    revalidatePath("/account");
    return {
      success: `Nested account created successfully: @${username} (AUID: ${result.createUser.auid}).`,
    };
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        "account",
        "Unable to create nested account. Try again.",
      ),
    };
  }
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
