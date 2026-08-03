import { redirect } from "next/navigation";
import { AccountDashboard } from "@/app/account/account-dashboard";
import { DashboardShell } from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-message";
import { getAuthSdkForSession, opaqueGraphqlBearer } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { listClientsByOwner } from "@/lib/oauth/client-store";
import { getIssuer } from "@/lib/oauth/constants";
import { getValidSession, getValidMultiSession } from "@/lib/session-access";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import { fetchUserProfileWithVariations, fetchAccountsDisplayInfo } from "@/lib/user-profile";
import { getUserPasskeys } from "@/lib/passkey-graphql";
import { getUserExternalIdentities } from "@/lib/google-oauth";

export default async function AccountPage() {
  const multiSession = await getValidMultiSession();
  const session = await getValidSession();

  if (!session || !multiSession) {
    redirect("/login");
  }

  const accountInfos = await fetchAccountsDisplayInfo(
    multiSession.accounts,
    multiSession.activeAuid,
    (credentials) => getAuthSdkForSession({ auid: "", credentials, oidcScopes: [], axusPermissions: [], consentedClients: [] }),
  );

  const sdk = getAuthSdkForSession(session);
  let profile;

  try {
    profile = await fetchUserProfileWithVariations(sdk, session.auid);
  } catch (error) {
    return (
      <DashboardShell>
        <main className="relative mx-auto flex min-h-full w-full max-w-xl flex-1 items-center px-4 py-8 sm:px-6 sm:py-12">
          <Card className="w-full rounded-[24px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.09),0_3px_12px_rgba(0,0,0,0.04)] sm:p-8">
            <FormError>
              {formatGraphqlError(
                error,
                "account",
                "Unable to load your account. Try again.",
              )}
            </FormError>
            <div className="mt-4">
              <a href="/account">
                <Button type="button" variant="outline">
                  Try again
                </Button>
              </a>
            </div>
          </Card>
        </main>
      </DashboardShell>
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
  const [clients, samlConfig, initialPasskeys, initialExternalIdentities] = await Promise.all([
    listClientsByOwner(session.auid),
    getSamlConfigByAuid(session.auid),
    getUserPasskeys(session.auid, bearerToken),
    getUserExternalIdentities(session.auid, bearerToken),
  ]);
  const issuer = getIssuer();

  return (
    <DashboardShell>
      <main className="relative min-h-screen w-full">
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
        />
      </main>
    </DashboardShell>
  );
}
