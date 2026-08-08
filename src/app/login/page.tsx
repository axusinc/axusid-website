import { redirect } from "next/navigation";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { resolveOAuthFlowMetadata } from "@/lib/oauth/flow-metadata";
import { getValidMultiSession, getValidSession } from "@/lib/session-access";
import { fetchAccountsDisplayInfo } from "@/lib/user-profile";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;

  const flowMeta = await resolveOAuthFlowMetadata(redirectUri);

  const registered = typeof params.registered === "string" ? params.registered : undefined;
  const addAccount = params.add_account === "true";
  const authErrorCode = typeof params.auth_error === "string" ? params.auth_error : undefined;
  const authError =
    authErrorCode === "google_cancelled"
      ? "Google sign-in was cancelled."
      : authErrorCode === "google_unavailable"
        ? "Google sign-in is not configured yet."
        : authErrorCode === "google_not_linked"
          ? "This Google account isn’t connected to an AXUS ID yet. Sign in with your username, then connect Google in Security."
        : authErrorCode === "google_failed"
          ? "We couldn’t sign you in with Google. Try again."
          : undefined;

  const multiSession = await getValidMultiSession();
  const session = await getValidSession();

  let promptRequiresAuth = false;
  if (redirectUri?.startsWith("/authorize")) {
    try {
      const url = new URL(redirectUri, "http://localhost");
      const prompt = url.searchParams.get("prompt") || "";
      const promptTokens = new Set(prompt.trim().split(/\s+/));
      if (promptTokens.has("login") && url.searchParams.get("prompt_reauth") !== "true") {
        promptRequiresAuth = true;
      }
      if (promptTokens.has("select_account") && url.searchParams.get("account_selected") !== "true") {
        promptRequiresAuth = true;
      }
    } catch {}
  }

  const hasMultipleAccounts = Boolean(
    multiSession &&
      multiSession.accounts.length > 1 &&
      params.account_selected !== "true",
  );

  const selectAccount =
    params.select_account === "true" ||
    params.prompt === "select_account" ||
    promptRequiresAuth ||
    hasMultipleAccounts;

  if (session && !addAccount && !selectAccount) {
    redirect(resolveAuthenticatedRedirect({ redirectUri, next }));
  }

  const existingAccounts = multiSession
    ? await fetchAccountsDisplayInfo(
        multiSession.accounts,
        multiSession.activeAuid,
        (credentials) =>
          getAuthSdkForSession({
            auid: "",
            credentials,
            oidcScopes: [],
            axusPermissions: [],
            consentedClients: [],
          }),
      )
    : [];

  return (
    <LoginForm
      isOAuthFlow={flowMeta.isOAuthFlow}
      targetAppName={flowMeta.appName}
      targetHost={flowMeta.targetHost}
      targetAppUser={flowMeta.applicationUser}
      registeredUsername={registered}
      redirectUri={redirectUri}
      next={next}
      existingAccounts={existingAccounts}
      isAddAccount={addAccount}
      authError={authError}
    />
  );
}
