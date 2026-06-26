import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { getIssuer } from "@/lib/oauth/clients";

export default function HomePage() {
  const issuer = getIssuer();

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-black/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-brand/[0.06] blur-3xl" />

      <main className="relative mx-auto flex min-h-full max-w-5xl flex-col px-6 py-16">
        <div className="flex items-center gap-4">
          <Logo size={48} />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-black">
              Identity, simplified.
            </h1>
          </div>
        </div>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-black/5 bg-white/70 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-black">For people</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Create an AXUS ID, manage your profile, and sign in to connected
              applications with a clean, minimal experience.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register">
                <Button variant="brand">Create account</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline">Sign in</Button>
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-black/5 bg-white/70 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-black">For developers</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              OAuth2 Authorization Code + PKCE adapter backed by the AXUS GraphQL
              auth API. Discovery, authorize, token, and revoke endpoints included.
            </p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="rounded-xl border border-black/5 bg-neutral-50/80 px-4 py-3">
                <dt className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                  Issuer
                </dt>
                <dd className="mt-1 font-mono text-xs text-black">{issuer}</dd>
              </div>
              <div className="rounded-xl border border-black/5 bg-neutral-50/80 px-4 py-3">
                <dt className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                  Discovery
                </dt>
                <dd className="mt-1 font-mono text-xs text-black">
                  {issuer}/.well-known/openid-configuration
                </dd>
              </div>
            </dl>
          </article>
        </section>
      </main>
    </div>
  );
}
