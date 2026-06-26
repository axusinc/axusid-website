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
import { authorizeQuerySchema } from "@/lib/oauth/schemas";
import { SESSION_COOKIE, getSession } from "@/lib/session";

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

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = authorizeQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  const query = parsed.data;
  const client = await getOAuthClient(query.client_id);

  if (!client) {
    return NextResponse.json(
      { error: "invalid_client", error_description: "Unknown client_id" },
      { status: 400 },
    );
  }

  if (!validateRedirectUri(client, query.redirect_uri)) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "redirect_uri is not registered for this client",
      },
      { status: 400 },
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

  const session = await getSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("oauth", "1");
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        loginUrl.searchParams.set(key, value);
      }
    }
    return NextResponse.redirect(loginUrl);
  }

  const hasConsented = session.consentedClients.includes(client.clientId);

  if (!hasConsented) {
    const consentUrl = new URL("/consent", request.url);
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        consentUrl.searchParams.set(key, value);
      }
    }
    return NextResponse.redirect(consentUrl);
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

  return NextResponse.redirect(redirectUrl);
}
