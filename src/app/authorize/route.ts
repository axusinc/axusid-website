import { NextRequest, NextResponse } from "next/server";
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
  PENDING_OAUTH_COOKIE,
  clearPendingOAuthCookieOptions,
  pendingOAuthCookieOptions,
  resolvePendingOAuth,
  serializePendingOAuth,
} from "@/lib/pending-oauth";
import {
  type AuthorizeQuery,
  authorizeQuerySchema,
  buildLoginOAuthUrl,
} from "@/lib/oauth/schemas";
import {
  SESSION_COOKIE,
  serializeSession,
  sessionCookieOptions,
  type IdPSession,
} from "@/lib/session";
import { getValidSession } from "@/lib/session-access";

function oauthRedirectError(
  redirectUri: string,
  error: string,
  state?: string,
  description?: string,
): NextResponse {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (description) {
    url.searchParams.set("error_description", description);
  }
  if (state) {
    url.searchParams.set("state", state);
  }

  return NextResponse.redirect(url);
}

function authorize400(
  error: string,
  errorDescription: string,
  meta: Record<string, unknown> = {},
): NextResponse {
  console.error("authorize_400", {
    error,
    error_description: errorDescription,
    ...meta,
  });

  return NextResponse.json(
    {
      error,
      error_description: errorDescription,
    },
    { status: 400 },
  );
}

async function attachPendingOAuth(
  response: NextResponse,
  query: AuthorizeQuery,
  session: IdPSession | null,
): Promise<NextResponse> {
  response.cookies.set(
    PENDING_OAUTH_COOKIE,
    await serializePendingOAuth(query),
    pendingOAuthCookieOptions,
  );

  if (session) {
    response.cookies.set(
      SESSION_COOKIE,
      await serializeSession({ ...session, pendingOAuth: query }),
      sessionCookieOptions,
    );
  }

  return response;
}

function clearPendingOAuth(response: NextResponse): NextResponse {
  response.cookies.set(
    PENDING_OAUTH_COOKIE,
    "",
    clearPendingOAuthCookieOptions,
  );
  return response;
}

async function clearPendingOAuthFromSession(
  response: NextResponse,
  session: IdPSession,
): Promise<NextResponse> {
  const { pendingOAuth: _pendingOAuth, ...rest } = session;
  response.cookies.set(
    SESSION_COOKIE,
    await serializeSession(rest),
    sessionCookieOptions,
  );
  return response;
}

export async function GET(request: NextRequest) {
  const pendingCookie = request.cookies.get(PENDING_OAUTH_COOKIE)?.value;
  const session = await getValidSession();
  const resume = request.nextUrl.searchParams.get("resume") === "1";

  let query: AuthorizeQuery;

  if (resume) {
    const pending = await resolvePendingOAuth(pendingCookie, session);
    if (!pending) {
      return authorize400(
        "invalid_request",
        "No pending authorization request",
        { resume: true },
      );
    }
    query = pending;
  } else {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = authorizeQuerySchema.safeParse(params);

    if (!parsed.success) {
      return authorize400(
        "invalid_request",
        parsed.error.issues[0]?.message ?? "Invalid request",
        {
          client_id: params.client_id,
          redirect_uri: params.redirect_uri,
        },
      );
    }

    query = parsed.data;
  }

  const client = await getOAuthClient(query.client_id);

  if (!client) {
    return authorize400("invalid_client", "Unknown client_id", {
      client_id: query.client_id,
      redirect_uri: query.redirect_uri,
    });
  }

  if (!validateRedirectUri(client, query.redirect_uri)) {
    return authorize400(
      "invalid_request",
      "redirect_uri is not registered for this client",
      {
        client_id: query.client_id,
        redirect_uri: query.redirect_uri,
      },
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

  if (!session) {
    const loginUrl = new URL(buildLoginOAuthUrl(), request.url);
    const response = NextResponse.redirect(loginUrl);
    return attachPendingOAuth(response, query, null);
  }

  const hasConsented = session.consentedClients.includes(client.clientId);

  if (!hasConsented) {
    const consentUrl = new URL("/consent", request.url);
    const response = NextResponse.redirect(consentUrl);
    return attachPendingOAuth(response, query, session);
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

  let response = NextResponse.redirect(redirectUrl);
  response = clearPendingOAuth(response);
  response = await clearPendingOAuthFromSession(response, session);
  return response;
}
