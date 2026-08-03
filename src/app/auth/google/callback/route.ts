import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import {
  GOOGLE_OAUTH_COOKIE,
  decodeGoogleOAuthState,
  exchangeGoogleCode,
  getGoogleRedirectUri,
  linkGoogleIdentity,
  loginWithGoogleIdentity,
  resolveExternalLoginScopes,
  type GoogleOAuthState,
} from "@/lib/google-oauth";
import { getPrimaryDomainError } from "@/lib/graphql-errors";
import { addAccountToSession, getValidSession } from "@/lib/session-access";
import type { IdPSession } from "@/lib/session";

function loginRedirect(
  request: NextRequest,
  authError: string,
  oauthState?: GoogleOAuthState | null,
): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("auth_error", authError);
  url.searchParams.set("add_account", "true");
  if (oauthState?.redirectUri) {
    url.searchParams.set("redirect_uri", oauthState.redirectUri);
  }
  if (oauthState?.next) {
    url.searchParams.set("next", oauthState.next);
  }
  return NextResponse.redirect(url);
}

function accountRedirect(
  request: NextRequest,
  status: "linked" | "cancelled" | "already_linked" | "failed",
): NextResponse {
  const url = new URL("/account", request.url);
  url.searchParams.set("section", "security");
  url.searchParams.set("google", status);
  return NextResponse.redirect(url);
}

function flowErrorRedirect(
  request: NextRequest,
  authError: string,
  oauthState?: GoogleOAuthState | null,
): NextResponse {
  if (oauthState?.intent === "link") {
    return accountRedirect(
      request,
      authError === "google_cancelled" ? "cancelled" : "failed",
    );
  }
  return loginRedirect(request, authError, oauthState);
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const oauthState = decodeGoogleOAuthState(
    cookieStore.get(GOOGLE_OAUTH_COOKIE)?.value,
  );
  cookieStore.delete(GOOGLE_OAUTH_COOKIE);

  const returnedState = request.nextUrl.searchParams.get("state");
  if (!oauthState || !returnedState || returnedState !== oauthState.state) {
    return flowErrorRedirect(request, "google_failed", oauthState);
  }

  if (request.nextUrl.searchParams.get("error")) {
    return flowErrorRedirect(request, "google_cancelled", oauthState);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return flowErrorRedirect(request, "google_failed", oauthState);
  }

  try {
    const idToken = await exchangeGoogleCode({
      code,
      codeVerifier: oauthState.codeVerifier,
      redirectUri: getGoogleRedirectUri(request.url),
    });

    if (oauthState.intent === "link") {
      const session = await getValidSession();
      if (!session || session.auid !== oauthState.linkAuid) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set(
          "next",
          "/account?section=security&google=failed",
        );
        return NextResponse.redirect(loginUrl);
      }

      await linkGoogleIdentity(session, idToken);
      return accountRedirect(request, "linked");
    }

    const { oidcScopes, axusPermissions } = await resolveExternalLoginScopes(
      oauthState.redirectUri,
    );
    const credentials = await loginWithGoogleIdentity(idToken, axusPermissions);
    const session: IdPSession = {
      auid: credentials.auid,
      credentials,
      oidcScopes,
      axusPermissions,
      consentedClients: [],
    };

    await addAccountToSession(session);

    return NextResponse.redirect(
      new URL(
        resolveAuthenticatedRedirect({
          redirectUri: oauthState.redirectUri,
          next: oauthState.next,
        }),
        request.url,
      ),
    );
  } catch (error) {
    if (oauthState.intent === "link") {
      const domainError = getPrimaryDomainError(error);
      return accountRedirect(
        request,
        domainError?.code === "EXTERNAL_IDENTITY_ALREADY_LINKED"
          ? "already_linked"
          : "failed",
      );
    }
    const domainError = getPrimaryDomainError(error);
    return loginRedirect(
      request,
      domainError?.code === "INVALID_EXTERNAL_IDENTITY"
        ? "google_not_linked"
        : "google_failed",
      oauthState,
    );
  }
}
