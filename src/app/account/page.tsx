import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountDashboard } from "@/app/account/account-dashboard";
import { StatusPage } from "@/components/status-page";
import { buttonVariants } from "@/components/ui/button";
import { getAuthSdkForSession, opaqueGraphqlBearer } from "@/lib/auth-graphql";
import { formatGraphqlError, isAuthError } from "@/lib/graphql-errors";
import { listClientsByOwner } from "@/lib/oauth/client-store";
import { getIssuer } from "@/lib/oauth/constants";
import { getValidSession, getValidMultiSession, removeAccountFromSession } from "@/lib/session-access";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import { fetchUserProfileWithVariations, fetchAccountsDisplayInfo } from "@/lib/user-profile";
import { getUserPasskeys } from "@/lib/passkey-graphql";
import { getUserExternalIdentities } from "@/lib/google-oauth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const multiSession = await getValidMultiSession();
  const session = await getValidSession();

  if (!session || !multiSession) {
    redirect("/login");
  }

  let accountInfos;
  try {
    accountInfos = await fetchAccountsDisplayInfo(
      multiSession.accounts,
      multiSession.activeAuid,
      (credentials) => getAuthSdkForSession({ auid: "", credentials, oidcScopes: [], axusPermissions: [], consentedClients: [] }),
    );
  } catch (error) {
    if (isAuthError(error)) {
      await removeAccountFromSession(session.auid);
      redirect("/login");
    }
    throw error;
  }

  const sdk = getAuthSdkForSession(session);
  let profile;

  try {
    profile = await fetchUserProfileWithVariations(sdk, session.auid);
  } catch (error) {
    if (isAuthError(error)) {
      await removeAccountFromSession(session.auid);
      redirect("/login");
    }
    return (
      <StatusPage
        tone="error"
        title="We couldn’t load your account"
        description={formatGraphqlError(error, "account", "Something went wrong on our side. Try again.")}
        actions={
      <a href="/account" className={buttonVariants({ className: "w-full sm:w-auto" })}>
        Try again
      </a>
        }
      />
    );
  }

  const { user, variations } = profile;
  const defaultVariationId = user?.defaultVariation?.variationId;
  const defaultVariation = defaultVariationId
    ? (variations.find((v) => v.id === defaultVariationId) ?? variations[0] ?? null)
    : (variations[0] ?? null);
  const fullName = defaultVariation?.displayName?.trim() || "";
  const username = user?.usernames?.defaultUsername ?? null;
  const bearerToken = opaqueGraphqlBearer(session.credentials);
  const refreshToken = session.credentials.refreshToken;
  const [clients, samlConfig, initialPasskeys, initialExternalIdentities, passwordStatus] = await Promise.all([
    listClientsByOwner(session.auid),
    getSamlConfigByAuid(session.auid),
    getUserPasskeys(session.auid, bearerToken, undefined, refreshToken),
    getUserExternalIdentities(session.auid, bearerToken),
    sdk.IsPasswordSet({ auid: session.auid }),
  ]);
  const issuer = getIssuer();

  return (
    <AccountDashboard
      auid={session.auid}
      accounts={accountInfos}
      currentAuid={session.auid}
      defaultUsername={username}
      defaultVariation={defaultVariation}
      fullName={fullName}
      username={username}
      clients={clients}
      issuer={issuer}
      samlConfig={samlConfig}
      initialPasskeys={initialPasskeys}
      initialExternalIdentities={initialExternalIdentities}
      initialHasPassword={passwordStatus.isPasswordSet}
    />
  );
}
