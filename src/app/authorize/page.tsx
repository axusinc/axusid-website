import { redirect } from "next/navigation";
import {
  getOAuthClient,
  normalizeScopes,
  validateRedirectUri,
  validateScopes,
} from "@/lib/oauth/clients";
import {
  AUTH_CODE_TTL_MS,
  saveAuthorizationCode,
} from "@/lib/oauth/auth-code-store";
import { generateOpaqueCode } from "@/lib/oauth/pkce";
import {
  authorizeQuerySchema,
} from "@/lib/oauth/schemas";
import { getValidSession, getValidMultiSession } from "@/lib/session-access";

type AuthorizePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function oauthRedirectError(
  redirectUri: string,
  error: string,
  state?: string,
  description?: string,
): never {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (description) {
    url.searchParams.set("error_description", description);
  }
  if (state) {
    url.searchParams.set("state", state);
  }
  redirect(url.toString());
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps) {
  const params = await searchParams;

  // Convert searchParams to Record<string, string>
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      queryParams[key] = value;
    }
  }

  if (!queryParams.client_id && queryParams.auid) {
    queryParams.client_id = queryParams.auid;
  }

  const parsed = authorizeQuerySchema.safeParse(queryParams);

  if (!parsed.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
        <div className="w-full max-w-md space-y-4 border border-black/5 bg-white p-6 shadow-sm rounded-xl">
          <h1 className="text-lg font-semibold text-neutral-900">Invalid Request</h1>
          <p className="text-sm text-neutral-600">
            {parsed.error.issues[0]?.message ?? "The authorization request is invalid."}
          </p>
        </div>
      </div>
    );
  }

  const query = parsed.data;
  const client = await getOAuthClient(query.client_id);

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
        <div className="w-full max-w-md space-y-4 border border-black/5 bg-white p-6 shadow-sm rounded-xl">
          <h1 className="text-lg font-semibold text-neutral-900">Unknown Client</h1>
          <p className="text-sm text-neutral-600">
            The client ID &ldquo;{query.client_id}&rdquo; is not registered.
          </p>
        </div>
      </div>
    );
  }

  if (!validateRedirectUri(client, query.redirect_uri)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
        <div className="w-full max-w-md space-y-4 border border-black/5 bg-white p-6 shadow-sm rounded-xl">
          <h1 className="text-lg font-semibold text-neutral-900">Invalid Redirect URI</h1>
          <p className="text-sm text-neutral-600">
            The redirect URI is not registered for this client application.
          </p>
        </div>
      </div>
    );
  }

  let scopes: string[];
  try {
    scopes = validateScopes(client, normalizeScopes(query.scope));
  } catch (error) {
    return oauthRedirectError(
      query.redirect_uri,
      "invalid_scope",
      query.state,
      error instanceof Error ? error.message : "Invalid scope",
    );
  }

  const promptTokens = new Set(
    query.prompt ? query.prompt.trim().split(/\s+/) : []
  );

  // 1. OIDC Spec: prompt=none MUST NOT be used with any other prompt values
  if (promptTokens.has("none") && promptTokens.size > 1) {
    return oauthRedirectError(
      query.redirect_uri,
      "invalid_request",
      query.state,
      "The prompt parameter value 'none' cannot be used with other prompt values",
    );
  }

  const session = await getValidSession();
  const multiSession = await getValidMultiSession();
  const currentUrl = `/authorize?${new URLSearchParams(queryParams).toString()}`;

  // 2. Handle prompt=none (MUST NOT show any interactive UI)
  if (promptTokens.has("none")) {
    if (!session) {
      return oauthRedirectError(
        query.redirect_uri,
        "login_required",
        query.state,
        "User is not authenticated",
      );
    }

    if (multiSession && multiSession.accounts.length > 1 && queryParams.account_selected !== "true") {
      return oauthRedirectError(
        query.redirect_uri,
        "account_selection_required",
        query.state,
        "Account selection is required",
      );
    }

    const hasConsented = session.consentedClients.includes(client.auid);
    if (!hasConsented) {
      return oauthRedirectError(
        query.redirect_uri,
        "consent_required",
        query.state,
        "User consent is required",
      );
    }
  } else {
    // 3. Handle prompt=login (requires re-authentication)
    if (promptTokens.has("login") && queryParams.prompt_reauth !== "true") {
      redirect(`/login?redirect_uri=${encodeURIComponent(currentUrl)}`);
    }

    // 4. Handle prompt=select_account (requires account selector UI when multiple accounts exist)
    if (
      promptTokens.has("select_account") &&
      queryParams.account_selected !== "true" &&
      multiSession &&
      multiSession.accounts.length > 1
    ) {
      redirect(`/login?redirect_uri=${encodeURIComponent(currentUrl)}`);
    }

    // Standard session check
    if (!session) {
      redirect(`/login?redirect_uri=${encodeURIComponent(currentUrl)}`);
    }

    // Standard multi-session check
    if (multiSession && multiSession.accounts.length > 1 && queryParams.account_selected !== "true") {
      redirect(`/login?redirect_uri=${encodeURIComponent(currentUrl)}`);
    }

    // 5. Handle prompt=consent or standard consent check
    const hasConsented = session.consentedClients.includes(client.auid);
    const forceConsent = promptTokens.has("consent") && queryParams.prompt_consent !== "done";

    if (!hasConsented || forceConsent) {
      redirect(`/consent?redirect_uri=${encodeURIComponent(currentUrl)}`);
    }
  }

  const code = await generateOpaqueCode();
  await saveAuthorizationCode({
    code,
    clientAuid: client.auid,
    redirectUri: query.redirect_uri,
    scopes,
    userAuid: session.auid,
    credentials: session.credentials,
    codeChallenge: query.code_challenge,
    codeChallengeMethod: query.code_challenge ? "S256" : undefined,
    nonce: query.nonce,
    // eslint-disable-next-line react-hooks/purity
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });

  const redirectUrl = new URL(query.redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (query.state) {
    redirectUrl.searchParams.set("state", query.state);
  }

  redirect(redirectUrl.toString());
}
