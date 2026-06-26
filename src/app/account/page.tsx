import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-message";
import { Logo } from "@/components/ui/logo";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { SESSION_COOKIE, getSession } from "@/lib/session";
import { fetchUserProfileWithVariations } from "@/lib/user-profile";
import { AccountForms } from "./account-forms";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const session = await getSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) {
    redirect("/login");
  }

  const sdk = getAuthSdkForSession(session);
  let profile;
  try {
    profile = await fetchUserProfileWithVariations(sdk, session.auid);
  } catch (error) {
    return (
      <div className="relative min-h-full overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)]" />

        <header className="relative border-b border-black/5 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <Logo size={36} />
              <div>
                <p className="text-sm font-medium text-black">Account</p>
              </div>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <main className="relative mx-auto max-w-5xl px-6 py-10">
          <FormError>
            {formatGraphqlError(
              error,
              "account",
              "Unable to load your account. Try again.",
            )}
          </FormError>
        </main>

        <footer className="relative border-t border-black/5 px-6 py-6 text-center text-sm text-neutral-500">
          <Link href="/" className="hover:text-black">
            Back to AXUS ID
          </Link>
        </footer>
      </div>
    );
  }

  const { user, variations } = profile;

  return (
    <div className="relative min-h-full overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)]" />

      <header className="relative border-b border-black/5 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <p className="text-sm font-medium text-black">Account</p>
              {user?.usernames?.defaultUsername ? (
                <p className="text-xs text-neutral-500">
                  @{user.usernames.defaultUsername}
                </p>
              ) : null}
            </div>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-black/5 bg-white/70 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Profile
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Manage your identity, usernames, and variations.
          </p>

          <dl className="mt-8 space-y-4">
            <div className="rounded-xl border border-black/5 bg-neutral-50/70 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                Username
              </dt>
              <dd className="mt-1 text-sm font-medium text-black">
                {user?.usernames?.defaultUsername}
              </dd>
            </div>
            <div className="rounded-xl border border-black/5 bg-neutral-50/70 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                All usernames
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {user?.usernames?.usernames.map((username) => (
                  <span
                    key={username}
                    className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-neutral-700"
                  >
                    {username}
                    {username === user?.usernames?.defaultUsername ? (
                      <span className="ml-1 text-neutral-400">default</span>
                    ) : null}
                  </span>
                ))}
              </dd>
            </div>
            <div className="rounded-xl border border-black/5 bg-neutral-50/70 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                AUID
              </dt>
              <dd className="mt-1 font-mono text-sm text-neutral-600">
                {user?.identity.auid}
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/developer/oauth/clients">
              <Button variant="outline">Developer apps</Button>
            </Link>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-400">
              Variations
            </h2>
            <div className="mt-4 space-y-3">
              {variations.length === 0 ? (
                <p className="text-sm text-neutral-500">No variations yet.</p>
              ) : (
                variations.map((variation) => (
                  <article
                    key={variation.id}
                    className="rounded-xl border border-black/5 bg-white/80 px-4 py-3 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-black">
                          {[variation.firstName, variation.lastName]
                            .filter(Boolean)
                            .join(" ") || "Untitled variation"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {variation.status ?? "No status"}
                        </p>
                      </div>
                      {user?.defaultVariation?.variationId === variation.id ? (
                        <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                          Default
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <AccountForms auid={session.auid} />
      </main>

      <footer className="relative border-t border-black/5 px-6 py-6 text-center text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">
          Back to AXUS ID
        </Link>
      </footer>
    </div>
  );
}
