import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { AccountDashboard } from "@/app/account/account-dashboard";
import { DashboardShell } from "@/app/account/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-message";
import { Logo } from "@/components/ui/logo";
import { UserAccountSwitcher } from "@/components/user-account-switcher";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { listClientsByOwner } from "@/lib/oauth/client-store";
import { getIssuer } from "@/lib/oauth/constants";
import { getValidSession, getValidMultiSession } from "@/lib/session-access";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import { fetchUserProfileWithVariations, fetchAccountsDisplayInfo, type AccountItemInfo } from "@/lib/user-profile";

type TopBarProps = {
  accounts: AccountItemInfo[];
  currentAuid: string;
};

function TopBar({ accounts, currentAuid }: TopBarProps) {
  return (
    <header className="relative border-b border-black/5 bg-white/70 backdrop-blur-xl z-30">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <p className="text-sm font-medium text-black">Account</p>
        </div>
        <div className="flex items-center gap-3">
          <UserAccountSwitcher accounts={accounts} currentAuid={currentAuid} />
        </div>
      </div>
    </header>
  );
}

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
        <TopBar accounts={accountInfos} currentAuid={session.auid} />
        <main className="relative mx-auto max-w-5xl px-6 py-10">
          <Card className="p-6 sm:p-8">
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

  const fullName = [defaultVariation?.firstName, defaultVariation?.lastName]
    .filter(Boolean)
    .join(" ");
  const username = user?.usernames?.defaultUsername ?? null;
  const [clients, samlConfig] = await Promise.all([
    listClientsByOwner(session.auid),
    getSamlConfigByAuid(session.auid),
  ]);
  const issuer = getIssuer();

  return (
    <DashboardShell>
      <TopBar accounts={accountInfos} currentAuid={session.auid} />

      <main className="relative mx-auto max-w-5xl px-6 py-10">
        <AccountDashboard
          auid={session.auid}
          defaultUsername={username}
          defaultVariation={defaultVariation}
          fullName={fullName}
          username={username}
          clients={clients}
          issuer={issuer}
          samlConfig={samlConfig}
        />
      </main>
    </DashboardShell>
  );
}
