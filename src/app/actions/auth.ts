"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getAuthSdk, getAuthSdkForSession } from "@/lib/auth-graphql";
import {
  DOMAIN_ERROR_CODES,
  formatGraphqlError,
  getPrimaryDomainError,
  isGraphqlClientError,
  isRateLimitError,
  RATE_LIMIT_MESSAGE,
} from "@/lib/graphql-errors";
import { SESSION_PERMISSIONS, loginWithBackend } from "@/lib/oauth/adapter";
import { resolveLoginAuid } from "@/lib/resolve-login-identity";
import {
  getOAuthClient,
  normalizeScopes,
  partitionScopes,
  validateScopes,
} from "@/lib/oauth/clients";
import { grantAuthorization } from "@/lib/oauth/grants";

import {
  addAccountToSession,
  clearAllSessions,
  getValidSession,
  removeAccountFromSession,
  switchActiveAccount,
} from "@/lib/session-access";
import { type IdPSession } from "@/lib/session";
import { setLastAuthMethod } from "@/lib/last-auth-method-server";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import {
  createIdentityProvider,
  createServiceProvider,
  createSamlLogoutRequest,
} from "@/lib/saml/saml-idp";
import { formatSyntheticEmail } from "@/lib/user-profile";
import { avatarImageUrl } from "@/lib/avatar-server";
import {
  clearPendingGoogleRegistration,
  getGoogleClientId,
  getGoogleProviderId,
  getPendingGoogleRegistration,
  setGoogleRegistrationName,
} from "@/lib/google-oauth";

export type AuthActionState = {
  error?: string;
  success?: string;
  auid?: string;
  registrationKey?: string;
};

async function getActionSession(): Promise<IdPSession | null> {
  return getValidSession();
}

export async function checkUsernameAction(
  username: string,
): Promise<{ exists: boolean; error?: string }> {
  const normalizedUsername = username.trim().replace(/^@/, "");

  if (!normalizedUsername) {
    return { exists: false, error: "Enter your username." };
  }

  try {
    await resolveLoginAuid(normalizedUsername);
    return { exists: true };
  } catch (error) {
    if (isRateLimitError(error)) {
      return {
        exists: false,
        error: error instanceof Error ? error.message : RATE_LIMIT_MESSAGE,
      };
    }
    return {
      exists: false,
      error: "We couldn’t find an AXUS ID with that username.",
    };
  }
}

export async function checkUsernameAvailabilityAction(
  username: string,
): Promise<{
  available: boolean;
  reason?: "taken" | "error";
  error?: string;
}> {
  const normalizedUsername = username.trim().replace(/^@/, "");

  if (!normalizedUsername) {
    return { available: true };
  }

  if (normalizedUsername.length < 4) {
    return {
      available: false,
      reason: "error",
      error: "Username must be at least 4 characters long.",
    };
  }

  try {
    const result = await getAuthSdk().OwnerByUsername({
      username: normalizedUsername,
    });

    if (result.ownerByUsername) {
      return {
        available: false,
        reason: "taken",
        error: "That username is already in use. Try another one.",
      };
    }

    return { available: true };
  } catch (error) {
    const domainError = getPrimaryDomainError(error);
    if (
      domainError?.code === DOMAIN_ERROR_CODES.USERNAME_NOT_FOUND ||
      domainError?.code === DOMAIN_ERROR_CODES.USERNAMES_NOT_FOUND ||
      domainError?.code === DOMAIN_ERROR_CODES.IDENTITY_NOT_FOUND
    ) {
      return { available: true };
    }

    return {
      available: false,
      reason: "error",
      error: formatGraphqlError(
        error,
        undefined,
        "We couldn’t check that username. Try again.",
      ),
    };
  }
}

export async function suggestUsernameFromEmailAction(
  email: string,
): Promise<string | undefined> {
  const localPart = email.split("@", 1)[0]?.trim().replace(/^@/, "");
  if (!localPart) return undefined;

  const base = localPart.length >= 4 ? localPart : localPart.padEnd(4, "0");

  for (let suffix = 0; suffix <= 100; suffix++) {
    const candidate = suffix === 0 ? base : `${base}${suffix}`;
    const result = await checkUsernameAvailabilityAction(candidate);

    if (result.available) return candidate;
    if (result.reason !== "taken") return base;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const candidate = `${base}${suffix}`;
    const result = await checkUsernameAvailabilityAction(candidate);
    if (result.available) return candidate;
    if (result.reason !== "taken") return base;
  }

  return undefined;
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

  let tokenId;
  try {
    tokenId = await loginWithBackend(auid, password, SESSION_PERMISSIONS);
  } catch (error) {
    return {
      error: formatGraphqlError(error, "login", "Unable to sign in. Try again."),
    };
  }

  const session: IdPSession = {
    auid,
    tokenId,
    consentedClients: [],
  };

  await addAccountToSession(session);
  await setLastAuthMethod("password");

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

  if (redirectUri) {
    let target = redirectUri;
    if (target.startsWith("/authorize") || target.startsWith("/saml/sso/")) {
      try {
        const url = new URL(target, "http://localhost");
        url.searchParams.set("account_selected", "true");
        target = `${url.pathname}${url.search}`;
      } catch {
        // fallback
      }
    }
    redirect(target);
  }

  if (next) {
    redirect(next);
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

export async function discardInvalidSessionAction(expectedAuid: string): Promise<string> {
  const session = await getValidSession();
  if (!session) return "/login?add_account=true";
  if (session.auid !== expectedAuid) return "/account";
  const remaining = await removeAccountFromSession(session.auid);
  return remaining ? "/account" : "/login?add_account=true";
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

  const client = isSaml ? undefined : await getOAuthClient(clientId);

  if (isSaml) {
    const samlConfig = await getSamlConfigByAuid(clientId);
    if (!samlConfig) {
      redirect("/");
    }
  } else if (!client) {
    redirect("/");
  }

  const session = await getValidSession();

  if (!session) {
    redirect(`/login?redirect_uri=${encodeURIComponent(redirectUri)}`);
  }

  if (client) {
    // Consent for an OAuth app is a record of its own, holding the app's token and the scopes
    // it may act on. SAML has no such record, so it still rides along in the session.
    let scopes: string[];
    try {
      scopes = validateScopes(normalizeScopes(url.searchParams.get("scope") ?? ""));
    } catch {
      redirect("/");
    }

    await grantAuthorization({
      userAuid: session.auid,
      clientAuid: client.auid,
      sessionTokenId: session.tokenId,
      scopes,
      axusPermissions: partitionScopes(scopes).axusPermissions,
    });
  } else {
    const updatedSession: IdPSession = {
      ...session,
      consentedClients: [...new Set([...session.consentedClients, clientId])],
    };

    await addAccountToSession(updatedSession);
  }

  let targetUri = redirectUri;
  if (targetUri.startsWith("/authorize")) {
    try {
      const targetUrl = new URL(targetUri, "http://localhost");
      if (targetUrl.searchParams.has("prompt")) {
        targetUrl.searchParams.set("prompt_consent", "done");
        targetUri = `${targetUrl.pathname}${targetUrl.search}`;
      }
    } catch {
      // fallback
    }
  }

  redirect(targetUri);
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

export async function ensureRegistrationUsername(
  params: { auid: string; tokenId: string; username: string },
) {
  const sdk = getAuthSdk(params.tokenId);
  const maxAttempts = 5;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 300 * Math.pow(2, attempt - 1)));
    }

    try {
      // Fetch the auto-assigned default username so we can swap it.
      const current = await sdk.Usernames({ auid: params.auid });
      const oldUsername = current.usernames?.defaultUsername ?? "";

      if (oldUsername === params.username) {
        // Already set correctly — nothing to do.
        return;
      }

      await sdk.ChangeUsername({
        auid: params.auid,
        oldUsername,
        newUsername: params.username,
      });
      return;
    } catch (error) {
      const domainError = getPrimaryDomainError(error);

      // The backend may not have propagated the new identity yet — retry on any
      // not-found variant, including unrecognised codes whose message mentions
      // "not found" (e.g. "No usernames found for identity: …").
      const isNotFound =
        domainError?.groupCode === "NOT_FOUND" ||
        domainError?.code === DOMAIN_ERROR_CODES.USERNAMES_NOT_FOUND ||
        domainError?.code === DOMAIN_ERROR_CODES.IDENTITY_NOT_FOUND ||
        (isGraphqlClientError(error) &&
          (error.response.errors ?? []).some((e) =>
            typeof e.message === "string" &&
            e.message.toLowerCase().includes("not found"),
          ));

      if (isNotFound) {
        lastError = error;
        continue;
      }

      console.error("Failed to set registration username:", error);
      return;
    }
  }

  console.error("Failed to set registration username after retries:", lastError);
}

export async function clearPendingGoogleRegistrationAction(): Promise<AuthActionState> {
  await clearPendingGoogleRegistration();
  return { success: "Google signup cleared." };
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const next = String(formData.get("next") ?? "");
  const contextAuid = String(formData.get("contextAuid") ?? "").trim();
  const requestedUsername = String(formData.get("username") ?? "").trim();
  const rawKey = String(formData.get("registrationKey") ?? "").trim();
  const registrationKey = rawKey || crypto.randomUUID();

  if (!requestedUsername) {
    return { error: "Username is required.", registrationKey };
  }

  if (requestedUsername.length < 4) {
    return {
      error: "Username must be at least 4 characters long.",
      registrationKey,
    };
  }

  const pendingGoogle = await getPendingGoogleRegistration();

  if (pendingGoogle) {
    try {
      const sdk = getAuthSdk();
      const result = await sdk.CreateUser({
        registrationKey,
        contextAuid: contextAuid || undefined,
      });
      const auid = result.createUser.auid;
      const tokenId = result.createUser.token.id;

      await ensureRegistrationUsername({
        auid,
        tokenId,
        username: requestedUsername,
      });

      await getAuthSdk(tokenId).LinkExternalIdentity({
        auid,
        authentication: {
          providerId: getGoogleProviderId(),
          refreshToken: pendingGoogle.refreshToken,
          clientId: getGoogleClientId(),
        },
      });

      await setGoogleRegistrationName({
        auid,
        tokenId,
        profile: pendingGoogle,
      });
      const session: IdPSession = {
        auid,
        tokenId,
        consentedClients: [],
      };

      await addAccountToSession(session);
      await clearPendingGoogleRegistration();
      await setLastAuthMethod("google");
    } catch (error) {
      return {
        error: formatGraphqlError(
          error,
          undefined,
          "Unable to create account with Google. Try again.",
        ),
        registrationKey,
      };
    }

    redirect(
      resolveAuthenticatedRedirect({
        redirectUri: redirectUri || undefined,
        next: next || undefined,
      }),
    );
  }

  if (!password) {
    return { error: "Password is required.", registrationKey };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", registrationKey };
  }

  try {
    const sdk = getAuthSdk();
    const result = await sdk.CreateUser({
      registrationKey,
      contextAuid: contextAuid || undefined,
    });
    const auid = result.createUser.auid;
    const tokenId = result.createUser.token.id;

    await ensureRegistrationUsername({
      auid,
      tokenId,
      username: requestedUsername,
    });
    await getAuthSdk(tokenId).SetPassword({ auid, password });

    const session: IdPSession = {
      auid,
      tokenId,
      consentedClients: [],
    };

    await addAccountToSession(session);
    await setLastAuthMethod("password");
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        undefined,
        "Unable to create account. Try again.",
      ),
      registrationKey,
    };
  }

  redirect(
    resolveAuthenticatedRedirect({
      redirectUri: redirectUri || undefined,
      next: next || undefined,
    }),
  );
}

export async function createNestedAccountAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const session = await getActionSession();
  if (!session) {
    return { error: "Your session has expired. Sign in again." };
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const customContextAuid = String(formData.get("contextAuid") ?? "").trim();
  const contextAuid = customContextAuid || session.auid;
  const rawKey = String(formData.get("registrationKey") ?? "").trim();
  const registrationKey = rawKey || crypto.randomUUID();
  const requestedUsername = String(formData.get("username") ?? "").trim();

  if (requestedUsername && requestedUsername.length < 4) {
    return {
      error: "Username must be at least 4 characters long.",
      registrationKey,
    };
  }

  if (!password) {
    return { error: "Password is required.", registrationKey };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match.", registrationKey };
  }

  try {
    const sdk = getAuthSdkForSession(session);
    const result = await sdk.CreateUser({
      contextAuid,
      registrationKey,
    });

    const auid = result.createUser.auid;
    const tokenId = result.createUser.token.id;

    await ensureRegistrationUsername({
      auid,
      tokenId,
      username: requestedUsername || registrationKey,
    });
    await getAuthSdk(tokenId).SetPassword({ auid, password });

    revalidatePath("/account");
    return {
      success: `Nested account created successfully (AUID: ${auid}).`,
      auid,
      registrationKey,
    };
  } catch (error) {
    return {
      error: formatGraphqlError(
        error,
        "account",
        "Unable to create nested account. Try again.",
      ),
      registrationKey,
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
    await sdk.SetPassword({ auid: session.auid, password: newPassword });
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

/**
 * Public profile photo URL for a username, or null when the user has none
 * (or anything fails). Photo reads are public, so no session is required and
 * failures degrade to the initials fallback rather than an error surface.
 */
export async function avatarUrlForUsernameAction(
  username: string,
): Promise<{ url: string | null }> {
  const normalizedUsername = username.trim().replace(/^@/, "");
  if (!normalizedUsername) {
    return { url: null };
  }

  try {
    const sdk = getAuthSdk();
    const owner = await sdk.OwnerByUsername({ username: normalizedUsername });
    const auid = owner.ownerByUsername;
    if (!auid) {
      return { url: null };
    }
    const details = await sdk.DefaultVariation({ auid });
    const variationId = details.defaultVariation?.variationId;
    if (!variationId) {
      return { url: null };
    }
    const avatar = await sdk.Avatar({ variationId });
    if (!avatar.avatar?.objectKey) {
      return { url: null };
    }
    return { url: avatarImageUrl(variationId, avatar.avatar.updatedAt) };
  } catch {
    return { url: null };
  }
}
