import { NextResponse, type NextRequest } from "next/server";
import { createGitHubAuthorization, GITHUB_OAUTH_COOKIE, GITHUB_OAUTH_MAX_AGE, internalDestination } from "@/lib/github-oauth";
import { getValidSession } from "@/lib/session-access";

function configurationErrorRedirect(request: NextRequest, intent: "login" | "link" | "register"): NextResponse {
  if (intent === "link") {
    return NextResponse.redirect(new URL("/account?section=security&github=failed", request.url));
  }
  if (intent === "register") {
    const url = new URL("/register", request.url);
    url.searchParams.set("auth_error", "github_unavailable");
    return NextResponse.redirect(url);
  }
  const url = new URL("/login", request.url);
  url.searchParams.set("auth_error", "github_unavailable");
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
  const redirectUri = internalDestination(request.nextUrl.searchParams.get("redirect_uri"));
  const next = internalDestination(request.nextUrl.searchParams.get("next"));
  try {
    const linkSession = intent === "link" ? await getValidSession() : null;
    if (intent === "link" && !linkSession) {
      return NextResponse.redirect(new URL("/login?next=%2Faccount%3Fsection%3Dsecurity", request.url));
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
    const authorization = createGitHubAuthorization(request.url, {
      intent,
      linkAuid: linkSession?.auid,
      username: intent === "register" ? username : undefined,
      contextAuid: intent === "register" ? contextAuid : undefined,
      addAccount: intent !== "link" && addAccount ? true : undefined,
      redirectUri,
      next,
    });
    const response = NextResponse.redirect(authorization.url);
    response.cookies.set(GITHUB_OAUTH_COOKIE, authorization.cookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: GITHUB_OAUTH_MAX_AGE,
    });
    return response;
  } catch {
    return configurationErrorRedirect(request, intent);
  }
}
