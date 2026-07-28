import { redirect } from "next/navigation";
import { resolveAuthenticatedRedirect } from "@/lib/auth-redirect";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
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
  const isOAuthFlow = !!redirectUri?.startsWith("/authorize");
  const registered = typeof params.registered === "string" ? params.registered : undefined;
  const addAccount = params.add_account === "true";

  const multiSession = await getValidMultiSession();
  const session = await getValidSession();

  if (session && !addAccount) {
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
      isOAuthFlow={isOAuthFlow}
      registeredUsername={registered}
      redirectUri={redirectUri}
      next={next}
      existingAccounts={existingAccounts}
      isAddAccount={addAccount}
    />
  );
}
