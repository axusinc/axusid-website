import { NextResponse, type NextRequest } from "next/server";
import { createGitHubAuthorization, GITHUB_OAUTH_COOKIE, GITHUB_OAUTH_MAX_AGE, internalDestination } from "@/lib/github-oauth";
import { getValidSession } from "@/lib/session-access";

export async function GET(request: NextRequest) {
  const linking = request.nextUrl.searchParams.get("mode") === "link";
  const redirectUri = internalDestination(request.nextUrl.searchParams.get("redirect_uri"));
  const next = internalDestination(request.nextUrl.searchParams.get("next"));
  try {
    const session = linking ? await getValidSession() : null;
    if (linking && !session) {
      return NextResponse.redirect(new URL("/login?next=%2Faccount%3Fsection%3Dsecurity", request.url));
    }
    const authorization = createGitHubAuthorization(request.url, {
      linkAuid: session?.auid, redirectUri, next,
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
    const url = new URL(linking ? "/account?section=security&github=failed" : "/login?auth_error=github_unavailable&add_account=true", request.url);
    if (!linking && redirectUri) url.searchParams.set("redirect_uri", redirectUri);
    if (!linking && next) url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }
}
