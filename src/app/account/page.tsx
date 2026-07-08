import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { AccountDashboard } from "@/app/account/account-dashboard";
import { DashboardShell } from "@/app/account/dashboard-ui";
import { FormError } from "@/components/ui/form-message";
import { Logo } from "@/components/ui/logo";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { getValidSession } from "@/lib/session-access";
import { fetchUserProfileWithVariations } from "@/lib/user-profile";

function TopBar({ username }: { username?: string | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/20 px-6 py-4 backdrop-blur-2xl lg:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="opacity-80 transition-opacity hover:opacity-100">
          <Logo size={28} />
        </Link>

        <div className="flex items-center gap-6">
          {username ? (
            <span className="hidden text-[13px] text-neutral-400 sm:inline">@{username}</span>
          ) : null}
          <form action={logoutAction}>
            <button
              type="submit"
              className="cursor-pointer text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default async function AccountPage() {
  const session = await getValidSession();

  if (!session) {
    redirect("/login");
  }

  const sdk = getAuthSdkForSession(session);
  let profile;

  try {
    profile = await fetchUserProfileWithVariations(sdk, session.auid);
  } catch (error) {
    return (
      <DashboardShell>
        <TopBar />
        <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <FormError>
            {formatGraphqlError(
              error,
              "account",
              "Unable to load your account. Try again.",
            )}
          </FormError>
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

  return (
    <DashboardShell>
      <TopBar username={username} />

      <AccountDashboard
        auid={session.auid}
        defaultUsername={username}
        defaultVariation={defaultVariation}
        fullName={fullName}
        username={username}
      />

      <footer className="border-t border-white/30 py-8 text-center">
        <Link
          href="/"
          className="text-[13px] text-neutral-400 transition-colors hover:text-neutral-600"
        >
          axus.id
        </Link>
      </footer>
    </DashboardShell>
  );
}
