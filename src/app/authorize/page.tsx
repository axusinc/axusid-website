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
import { getValidSession } from "@/lib/session-access";

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

  const session = await getValidSession();
  const currentUrl = `/authorize?${new URLSearchParams(queryParams).toString()}`;

  if (!session) {
    redirect(`/login?redirect_uri=${encodeURIComponent(currentUrl)}`);
  }

  const hasConsented = session.consentedClients.includes(client.clientId);

  if (!hasConsented) {
    redirect(`/consent?redirect_uri=${encodeURIComponent(currentUrl)}`);
  }

  const code = await generateOpaqueCode();
  await saveAuthorizationCode({
    code,
    clientId: client.clientId,
    redirectUri: query.redirect_uri,
    scopes,
    auid: session.auid,
    credentials: session.credentials,
    codeChallenge: query.code_challenge,
    codeChallengeMethod: "S256",
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });

  const redirectUrl = new URL(query.redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (query.state) {
    redirectUrl.searchParams.set("state", query.state);
  }

  redirect(redirectUrl.toString());
}
