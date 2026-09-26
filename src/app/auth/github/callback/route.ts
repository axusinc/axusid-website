import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ensureRegistrationUsername } from "@/app/actions/auth";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getAuthSdk } from "@/lib/auth-graphql";
import { loginWithOAuthIdentity, linkOAuthIdentity } from "@/lib/oauth-provider";
import {
  GITHUB_OAUTH_COOKIE,
  GITHUB_PENDING_REGISTRATION_COOKIE,
  GITHUB_PENDING_REGISTRATION_COOKIE_MAX_AGE,
  decodeGitHubState,
  encodePendingGitHubRegistration,
  exchangeGitHubCode,
  fetchGitHubProfile,
  getGitHubClientId,
  getGitHubProviderId,
  setGitHubRegistrationName,
  type GitHubOAuthState,
} from "@/lib/github-oauth";
import { importExternalAvatar, normalizeGitHubAvatarUrl } from "@/lib/external-avatar";
import { DOMAIN_ERROR_CODES, getPrimaryDomainError } from "@/lib/graphql-errors";
import { setLastAuthMethod } from "@/lib/last-auth-method-server";
import { SESSION_PERMISSIONS } from "@/lib/oauth/adapter";
import { addAccountToSession, getValidSession } from "@/lib/session-access";
import type { IdPSession } from "@/lib/session";

function loginRedirect(
  request: NextRequest,
  authError: string,
  oauthState?: GitHubOAuthState | null,
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
  oauthState?: GitHubOAuthState | null,
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
  url.searchParams.set("github", status);
  return NextResponse.redirect(url);
}

function flowErrorRedirect(
  request: NextRequest,
  authError: string,
  oauthState?: GitHubOAuthState | null,
): NextResponse {
  if (oauthState?.intent === "link" || oauthState?.linkAuid) {
    return accountRedirect(
      request,
      authError === "github_cancelled" ? "cancelled" : "failed",
    );
  }
  if (oauthState?.intent === "register") {
    return registerRedirect(request, authError, oauthState);
  }
  return loginRedirect(request, authError, oauthState);
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const oauthState = decodeGitHubState(cookieStore.get(GITHUB_OAUTH_COOKIE)?.value);
  cookieStore.delete(GITHUB_OAUTH_COOKIE);

  const returnedState = request.nextUrl.searchParams.get("state");
  if (!oauthState || !returnedState || returnedState !== oauthState.state) {
    return flowErrorRedirect(request, "github_failed", oauthState);
  }

  if (request.nextUrl.searchParams.get("error")) {
    return flowErrorRedirect(request, "github_cancelled", oauthState);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return flowErrorRedirect(request, "github_failed", oauthState);
  }

  try {
    const authentication = await exchangeGitHubCode(code, oauthState, request.url);
    const githubProfile = await fetchGitHubProfile(authentication.accessToken);
    const pictureUrl = normalizeGitHubAvatarUrl(githubProfile?.picture);

    if (oauthState.intent === "link" || oauthState.linkAuid) {
      const session = await getValidSession();
      if (!session || (oauthState.linkAuid && session.auid !== oauthState.linkAuid)) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set(
          "next",
          "/account?section=security&github=failed",
        );
        return NextResponse.redirect(loginUrl);
      }

      try {
        await linkOAuthIdentity(session, authentication);
      } catch (linkError) {
        const domainError = getPrimaryDomainError(linkError);
        return accountRedirect(
          request,
          domainError?.code === "EXTERNAL_IDENTITY_ALREADY_LINKED"
            ? "already_linked"
            : "failed",
        );
      }
      // Backfill the profile photo when the account has none yet.
      await importExternalAvatar({ auid: session.auid, tokenId: session.tokenId, pictureUrl });
      return accountRedirect(request, "linked");
    }

    // First try logging into an existing account linked with this GitHub identity
    try {
      const result = await loginWithOAuthIdentity(authentication, SESSION_PERMISSIONS);
      const session: IdPSession = {
        auid: result.auid,
        tokenId: result.tokenId,
        consentedClients: [],
      };

      await addAccountToSession(session);
      await setLastAuthMethod("github");
      // Backfill the profile photo when the account has none yet.
      await importExternalAvatar({
        auid: result.auid,
        tokenId: result.tokenId,
        pictureUrl,
      });

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

      // GitHub identity is NOT linked to an existing account.
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

        await ensureRegistrationUsername({
          auid,
          tokenId,
          username: oauthState.username,
        });

        await getAuthSdk(tokenId).LinkExternalIdentity({
          auid,
          authentication: {
            providerId: getGitHubProviderId(),
            refreshToken: authentication.refreshToken,
            clientId: getGitHubClientId(),
          },
        });

        await setGitHubRegistrationName({
          auid,
          tokenId,
          profile: { name: githubProfile?.name },
        });
        // A fresh account has no photo yet: copy the GitHub picture in.
        await importExternalAvatar({
          auid,
          tokenId,
          pictureUrl,
          onlyIfEmpty: false,
        });
        const session: IdPSession = {
          auid,
          tokenId,
          consentedClients: [],
        };

        await addAccountToSession(session);
        await setLastAuthMethod("github");

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

      // No username provided yet: store pending GitHub registration details in cookie and redirect to /register
      cookieStore.set(
        GITHUB_PENDING_REGISTRATION_COOKIE,
        encodePendingGitHubRegistration({
          refreshToken: authentication.refreshToken,
          username: githubProfile?.username,
          name: githubProfile?.name,
          email: githubProfile?.email,
          picture: githubProfile?.picture,
          createdAt: Date.now(),
        }),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: GITHUB_PENDING_REGISTRATION_COOKIE_MAX_AGE,
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
    console.error("[GitHub OAuth callback failed]", error);
    if (oauthState.intent === "link" || oauthState?.linkAuid) {
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
            : "github_failed";
      return registerRedirect(request, authError, oauthState);
    }
    const domainError = getPrimaryDomainError(error);
    return loginRedirect(
      request,
      domainError?.code === "INVALID_EXTERNAL_IDENTITY"
        ? "github_not_linked"
        : "github_failed",
      oauthState,
    );
  }
}
