import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { loginWithOAuthIdentity, linkOAuthIdentity } from "@/lib/oauth-provider";
import { decodeGitHubState, exchangeGitHubCode, GITHUB_OAUTH_COOKIE } from "@/lib/github-oauth";
import { getPrimaryDomainError } from "@/lib/graphql-errors";
import { setLastAuthMethod } from "@/lib/last-auth-method-server";
import { SESSION_PERMISSIONS } from "@/lib/oauth/adapter";
import { addAccountToSession, getValidSession } from "@/lib/session-access";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const state = decodeGitHubState(cookieStore.get(GITHUB_OAUTH_COOKIE)?.value);
  cookieStore.delete(GITHUB_OAUTH_COOKIE);

  function finish(status: string) {
    const url = new URL(state?.linkAuid ? "/account?section=security" : "/login?add_account=true", request.url);
    url.searchParams.set(state?.linkAuid ? "github" : "auth_error", state?.linkAuid ? status : `github_${status}`);
    if (!state?.linkAuid && state?.redirectUri) url.searchParams.set("redirect_uri", state.redirectUri);
    if (!state?.linkAuid && state?.next) url.searchParams.set("next", state.next);
    return NextResponse.redirect(url);
  }

  if (!state || request.nextUrl.searchParams.get("state") !== state.state) return finish("failed");
  if (request.nextUrl.searchParams.get("error")) return finish("cancelled");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return finish("failed");

  let stage = "session";
  try {
    const session = state.linkAuid ? await getValidSession() : null;
    if (state.linkAuid && (!session || session.auid !== state.linkAuid)) return finish("failed");
    stage = "code-exchange";
    const authentication = await exchangeGitHubCode(code, state, request.url);
    if (session) {
      stage = "link";
      await linkOAuthIdentity(session, authentication);
      return finish("linked");
    }
    stage = "login";
    const result = await loginWithOAuthIdentity(authentication, SESSION_PERMISSIONS);
    await addAccountToSession({
      auid: result.auid,
      tokenId: result.tokenId,
      consentedClients: [],
    });
    await setLastAuthMethod("github");
    return NextResponse.redirect(new URL(resolveAuthenticatedRedirect({ redirectUri: state.redirectUri, next: state.next }), request.url));
  } catch (error) {
    // GraphQL errors can contain request credentials; do not log the raw error.
    const code = getPrimaryDomainError(error)?.code;
    const responseErrors = (error as { response?: { errors?: Array<{ extensions?: { code?: unknown } }> } } | null)?.response?.errors;
    console.error("[GitHub OAuth callback failed]", {
      stage,
      codes: Array.isArray(responseErrors)
        ? responseErrors.map(item => item.extensions?.code).filter(value => typeof value === "string" && /^[A-Z_]{1,64}$/.test(value))
        : [],
    });
    return finish(code === "EXTERNAL_IDENTITY_ALREADY_LINKED" ? "already_linked" :
      !state.linkAuid && code === "INVALID_EXTERNAL_IDENTITY" ? "not_linked" : "failed");
  }
}
