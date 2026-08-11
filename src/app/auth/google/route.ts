import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE,
  GOOGLE_OAUTH_COOKIE_MAX_AGE,
  createCodeChallenge,
  createRandomOAuthValue,
  encodeGoogleOAuthState,
  getGoogleClientId,
  getGoogleRedirectUri,
  normalizeInternalDestination,
} from "@/lib/google-oauth";
import { getValidSession } from "@/lib/session-access";

function configurationErrorRedirect(
  request: NextRequest,
  intent: "login" | "link" | "register",
): NextResponse {
  if (intent === "link") {
    const url = new URL("/account", request.url);
    url.searchParams.set("section", "security");
    url.searchParams.set("google", "failed");
    return NextResponse.redirect(url);
  }

  if (intent === "register") {
    const url = new URL("/register", request.url);
    url.searchParams.set("auth_error", "google_unavailable");
    return NextResponse.redirect(url);
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("auth_error", "google_unavailable");
  url.searchParams.set("add_account", "true");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get("mode");
  const intent: "login" | "link" | "register" =
    modeParam === "link"
      ? "link"
      : modeParam === "register"
        ? "register"
        : "login";

  try {
    const linkSession = intent === "link" ? await getValidSession() : null;
    if (intent === "link" && !linkSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", "/account?section=security");
      return NextResponse.redirect(loginUrl);
    }

    const username =
      request.nextUrl.searchParams.get("username")?.trim().replace(/^@/, "") ||
      undefined;
    const contextAuid =
      request.nextUrl.searchParams.get("contextAuid")?.trim() ||
      request.nextUrl.searchParams.get("context")?.trim() ||
      undefined;
    const addAccount =
      request.nextUrl.searchParams.get("add_account") === "true";

    const state = createRandomOAuthValue();
    const codeVerifier = createRandomOAuthValue();
    const codeChallenge = await createCodeChallenge(codeVerifier);
    const redirectUri = getGoogleRedirectUri(request.url);
    const continuation = normalizeInternalDestination(
      request.nextUrl.searchParams.get("redirect_uri"),
    );
    const next = normalizeInternalDestination(request.nextUrl.searchParams.get("next"));

    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: getGoogleClientId(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "select_account",
    }).toString();

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(
      GOOGLE_OAUTH_COOKIE,
      encodeGoogleOAuthState({
        state,
        codeVerifier,
        intent,
        linkAuid: linkSession?.auid,
        username,
        contextAuid,
        addAccount,
        redirectUri: continuation,
        next,
        createdAt: Date.now(),
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE,
      },
    );
    return response;
  } catch (error) {
    console.error("[Google OAuth Init Error]", error);
    return configurationErrorRedirect(request, intent);
  }
}
