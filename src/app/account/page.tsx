import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountDashboard } from "@/app/account/account-dashboard";
import { StatusPage } from "@/components/status-page";
import { buttonVariants } from "@/components/ui/button";
import { getAuthSdk, getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError, isAuthError, isRateLimitError, isTokenInvalidError } from "@/lib/graphql-errors";
import { listClientsByOwner } from "@/lib/oauth/client-store";
import { listGrantsForUser } from "@/lib/oauth/grants";
import { getIssuer } from "@/lib/oauth/constants";
import { getValidMultiSession } from "@/lib/session-access";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import {
  fetchUserProfileWithVariations,
  fetchAccountsDisplayInfo,
  resolveUserDisplayInfo,
  userDisplayInfoFromProfile,
} from "@/lib/user-profile";
import type { ConnectedApp } from "@/app/account/connected-apps-section";
import { getUserPasskeys } from "@/lib/passkey-graphql";
import { getUserExternalIdentities } from "@/lib/google-oauth";

export const metadata: Metadata = { title: "Account" };

// Handle the error before creating JSX so React does not serialize the raw
// backend error (and its stack) as development component props.
function renderAccountLoadError(error: unknown, auid: string) {
  if (isTokenInvalidError(error) || isAuthError(error)) {
    redirect(`/auth/session-recovery?auid=${encodeURIComponent(auid)}`);
  }
  return (
    <StatusPage
      tone="error"
      title={isRateLimitError(error) ? "Too many requests" : "We couldn’t load your account"}
      description={formatGraphqlError(error, "account", "Something went wrong on our side. Try again.")}
      actions={
        <div className="flex flex-col gap-2 sm:flex-row">
          <a href="/account" className={buttonVariants({ className: "w-full sm:w-auto" })}>
            Try again
          </a>
          <a
            href={`/auth/session-recovery?auid=${encodeURIComponent(auid)}`}
            className={buttonVariants({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            Sign out
          </a>
        </div>
      }
    />
  );
}

export default async function AccountPage() {
  const multiSession = await getValidMultiSession();
  const session = multiSession?.accounts.find((account) => account.auid === multiSession.activeAuid);

  if (!session || !multiSession) {
    redirect("/login");
  }

  const sdk = getAuthSdkForSession(session);
  const [accountResult, profileResult, detailsResult] = await Promise.allSettled([
    fetchAccountsDisplayInfo(
      multiSession.accounts.filter((account) => account.auid !== session.auid),
      multiSession.activeAuid,
      getAuthSdk,
    ),
    fetchUserProfileWithVariations(sdk, session.auid),
    Promise.all([
      listClientsByOwner(session.auid),
      listGrantsForUser(session.auid),
      getSamlConfigByAuid(session.auid),
      getUserPasskeys(session.auid, session.tokenId),
      getUserExternalIdentities(session.auid, session.tokenId),
      sdk.IsPasswordSet({ auid: session.auid }),
    ]),
  ]);

  const failure = [accountResult, profileResult, detailsResult].find(
    (result) => result.status === "rejected" && (isTokenInvalidError(result.reason) || isAuthError(result.reason)),
  ) ?? [accountResult, profileResult, detailsResult].find((result) => result.status === "rejected");
  if (failure?.status === "rejected") return renderAccountLoadError(failure.reason, session.auid);

  if (accountResult.status !== "fulfilled" || profileResult.status !== "fulfilled" || detailsResult.status !== "fulfilled") {
    return renderAccountLoadError(new Error("Account data is unavailable"), session.auid);
  }
  const profile = profileResult.value;
  const activeInfo = userDisplayInfoFromProfile(profile, session.auid);
  const otherInfoByAuid = new Map(accountResult.value.map((account) => [account.auid, account]));
  const accountInfos = multiSession.accounts.map((account) => account.auid === session.auid
    ? { auid: session.auid, ...activeInfo, isActive: true }
    : otherInfoByAuid.get(account.auid) ?? {
        auid: account.auid,
        firstName: null,
        lastName: null,
        username: null,
        displayName: account.auid,
        avatarUrl: null,
        isActive: false,
      });

  const { user, variations } = profile;
  const defaultVariationId = user?.defaultVariation?.variationId;
  const defaultVariation = defaultVariationId
    ? (variations.find((v) => v.id === defaultVariationId) ?? variations[0] ?? null)
    : (variations[0] ?? null);
  const fullName = defaultVariation?.displayName?.trim() || "";
  const username = user?.usernames?.defaultUsername ?? null;

  const [clients, grants, samlConfig, passkeyResult, initialExternalIdentities, passwordStatus] = detailsResult.value;
  const issuer = getIssuer();

  // An app is another AXUS ID account, so its name is looked up like any other profile; an app
  // whose profile cannot be read is still listed, by its AUID.
  const connectedApps: ConnectedApp[] = await Promise.all(
    grants.map(async (grant) => {
      let application = {
        displayName: grant.clientAuid,
        username: null as string | null,
        firstName: null as string | null,
        lastName: null as string | null,
        avatarUrl: null as string | null,
      };
      try {
        const info = await resolveUserDisplayInfo(sdk, grant.clientAuid);
        application = info;
      } catch {
        // Falls back to the AUID.
      }

      return {
        grantId: grant.id,
        application,
        scopes: grant.scopes,
        connectedAt: grant.createdAt.toISOString(),
        lastUsedAt: grant.lastUsedAt?.toISOString() ?? null,
      };
    }),
  );

  return (
    <AccountDashboard
      key={session.auid}
      auid={session.auid}
      accounts={accountInfos}
      currentAuid={session.auid}
      defaultUsername={username}
      defaultVariation={defaultVariation}
      fullName={fullName}
      username={username}
      clients={clients}
      connectedApps={connectedApps}
      issuer={issuer}
      samlConfig={samlConfig}
      initialPasskeys={passkeyResult.passkeys}
      passkeyLoadError={passkeyResult.error}
      initialExternalIdentities={initialExternalIdentities}
      initialHasPassword={passwordStatus.isPasswordSet}
    />
  );
}
