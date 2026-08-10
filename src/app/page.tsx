import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { roundedRect } from "@/lib/design";
import { cn } from "@/lib/utils";
import { getIssuer } from "@/lib/oauth/constants";

export default function HomePage() {
  const issuer = getIssuer();

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-black/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-brand/[0.06] blur-3xl" />

      <main className="relative mx-auto flex min-h-[100dvh] max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-16">
        <div className="flex items-center gap-4">
          <Logo size={48} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              Identity, simplified.
            </h1>
          </div>
        </div>

        <section className="mt-9 grid gap-4 sm:mt-16 sm:gap-6 lg:grid-cols-2">
          <article className={cn("border border-black/5 bg-white/70 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-8", roundedRect)}>
            <h2 className="text-xl font-semibold text-black">For people</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Create an AXUS ID, manage your profile, and sign in to connected
              applications with a clean, minimal experience.
            </p>
            <div className="mt-6 grid gap-3 min-[420px]:flex min-[420px]:flex-wrap">
              <Link href="/register" className="block">
                <Button variant="brand" className="w-full min-[420px]:w-auto">Create account</Button>
              </Link>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full min-[420px]:w-auto">Sign in</Button>
              </Link>
            </div>
          </article>

          <article className={cn("min-w-0 border border-black/5 bg-white/70 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-8", roundedRect)}>
            <h2 className="text-xl font-semibold text-black">For developers</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              OAuth2 Authorization Code + PKCE adapter backed by the AXUS GraphQL
              auth API. Discovery, authorize, token, and revoke endpoints included.
            </p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className={cn("border border-black/5 bg-neutral-50/80 px-4 py-3", roundedRect)}>
                <dt className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                  Issuer
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-black">{issuer}</dd>
              </div>
              <div className={cn("border border-black/5 bg-neutral-50/80 px-4 py-3", roundedRect)}>
                <dt className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                  Discovery
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-black">
                  {issuer}/.well-known/openid-configuration
                </dd>
              </div>
            </dl>
            <div className="mt-6">
              <Link href="/account?section=developer">
                <Button variant="outline">Register your app</Button>
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
