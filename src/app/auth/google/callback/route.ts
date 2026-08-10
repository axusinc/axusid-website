import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ensureRegistrationUsername } from "@/app/actions/auth";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getAuthSdk } from "@/lib/auth-graphql";
import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_PENDING_REGISTRATION_COOKIE,
  GOOGLE_PENDING_REGISTRATION_COOKIE_MAX_AGE,
  decodeGoogleOAuthState,
  encodePendingGoogleRegistration,
  exchangeGoogleCode,
  fetchGoogleProfileFromAccessToken,
  getGoogleClientId,
  getGoogleProviderId,
  getGoogleRedirectUri,
  linkGoogleIdentity,
  loginWithGoogleIdentity,
  resolveExternalLoginScopes,
  setGoogleRegistrationName,
  type GoogleOAuthState,
} from "@/lib/google-oauth";
import { DOMAIN_ERROR_CODES, getPrimaryDomainError } from "@/lib/graphql-errors";
import { wrapTokenWithBackend } from "@/lib/oauth/adapter";
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

function registerRedirect(
  request: NextRequest,
  authError: string,
  oauthState?: GoogleOAuthState | null,
): NextResponse {
  const url = new URL("/register", request.url);
  url.searchParams.set("auth_error", authError);
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
  if (oauthState?.intent === "register") {
    return registerRedirect(request, authError, oauthState);
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
    const { refreshToken, accessToken } = await exchangeGoogleCode({
      code,
      codeVerifier: oauthState.codeVerifier,
      redirectUri: getGoogleRedirectUri(request.url),
    });

    const googleProfile = accessToken
      ? await fetchGoogleProfileFromAccessToken(accessToken)
      : null;

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

      await linkGoogleIdentity(session, refreshToken);
      return accountRedirect(request, "linked");
    }

    const { oidcScopes, axusPermissions } = await resolveExternalLoginScopes(
      oauthState.redirectUri,
    );

    // First try logging into an existing account linked with this Google identity
    try {
      const credentials = await loginWithGoogleIdentity(refreshToken, axusPermissions);
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
    } catch (loginError) {
      const domainError = getPrimaryDomainError(loginError);
      if (domainError?.code !== "INVALID_EXTERNAL_IDENTITY") {
        throw loginError;
      }

      // Google identity is NOT linked to an existing account.
      // If a username was specified in registration state, finish creating the account now:
      if (oauthState.intent === "register" && oauthState.username) {
        const sdk = getAuthSdk();
        const registrationKey = crypto.randomUUID();

        const result = await sdk.CreateUser({
          registrationKey,
          contextAuid: oauthState.contextAuid || undefined,
        });

        const auid = result.createUser.auid;
        const tokenId = result.createUser.token.id;

        await ensureRegistrationUsername(sdk, {
          auid,
          tokenId,
          username: oauthState.username,
        });

        await sdk.LinkExternalIdentity({
          auid,
          tokenId,
          authentication: {
            providerId: getGoogleProviderId(),
            refreshToken,
            clientId: getGoogleClientId(),
          },
        });

        const credentials = await wrapTokenWithBackend(auid, tokenId);
        await setGoogleRegistrationName({
          auid,
          credentials,
          profile: googleProfile ?? {},
        });
        const session: IdPSession = {
          auid,
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
      }

      // No username provided yet: store pending Google registration details in cookie and redirect to /register
      cookieStore.set(
        GOOGLE_PENDING_REGISTRATION_COOKIE,
        encodePendingGoogleRegistration({
          refreshToken,
          email: googleProfile?.email,
          name: googleProfile?.name,
          givenName: googleProfile?.givenName,
          familyName: googleProfile?.familyName,
          picture: googleProfile?.picture,
          createdAt: Date.now(),
        }),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: GOOGLE_PENDING_REGISTRATION_COOKIE_MAX_AGE,
        },
      );

      const registerUrl = new URL("/register", request.url);
      if (oauthState.redirectUri) {
        registerUrl.searchParams.set("redirect_uri", oauthState.redirectUri);
      }
      if (oauthState.next) {
        registerUrl.searchParams.set("next", oauthState.next);
      }
      if (oauthState.addAccount) {
        registerUrl.searchParams.set("add_account", "true");
      }
      if (oauthState.contextAuid) {
        registerUrl.searchParams.set("contextAuid", oauthState.contextAuid);
      }
      return NextResponse.redirect(registerUrl);
    }
  } catch (error) {
    console.error("[Google OAuth Callback Error]", error);
    if (oauthState.intent === "link") {
      const domainError = getPrimaryDomainError(error);
      return accountRedirect(
        request,
        domainError?.code === "EXTERNAL_IDENTITY_ALREADY_LINKED"
          ? "already_linked"
          : "failed",
      );
    }
    if (oauthState.intent === "register") {
      const domainError = getPrimaryDomainError(error);
      const authError =
        domainError?.code === "EXTERNAL_IDENTITY_ALREADY_LINKED"
          ? "already_linked"
          : domainError?.code === DOMAIN_ERROR_CODES.USERNAME_ALREADY_EXISTS
            ? "username_taken"
            : "google_failed";
      return registerRedirect(request, authError, oauthState);
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
