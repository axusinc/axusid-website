import Link from "next/link";
import {
  ArrowRight,
  Check,
  Fingerprint,
  Layers,
  ShieldCheck,
  UserRound,
  UsersRound,
  Workflow,
} from "lucide-react";
import { BrandMark, SiteFooter } from "@/components/brand-mark";
import { PageBackground } from "@/components/page-background";
import { Logo } from "@/components/ui/logo";
import { buttonVariants } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { eyebrow, shellSurface } from "@/lib/design";
import { getIssuer } from "@/lib/oauth/constants";
import { getValidSession } from "@/lib/session-access";
import { cn } from "@/lib/utils";

const features = [
  {
    Icon: Fingerprint,
    title: "Passkeys built in",
    description:
      "Sign in with Face ID, Touch ID or a security key. No passwords to remember, nothing to phish.",
  },
  {
    Icon: ShieldCheck,
    title: "You decide what’s shared",
    description:
      "Every app asks first. See exactly what it gets before you continue, and where you’ll be sent.",
  },
  {
    Icon: UsersRound,
    title: "Multiple identities",
    description:
      "Stay signed in to several accounts and switch in one click, or create nested identities.",
  },
  {
    Icon: Workflow,
    title: "Standards, not lock-in",
    description:
      "OAuth 2.0 with PKCE, OpenID Connect and SAML 2.0. Works with the libraries you already use.",
  },
];

const developerPoints = [
  "Authorization Code flow with PKCE",
  "OpenID Connect discovery, ID tokens and userinfo",
  "SAML 2.0 identity provider with metadata",
  "Refresh tokens and token revocation",
];

function SignInPreview() {
  return (
    <div aria-hidden className={cn("w-full max-w-sm select-none rounded-[22px] p-6", shellSurface)}>
      <div className="flex items-center gap-2.5">
        <Logo size={24} />
        <span className="text-sm font-semibold text-neutral-950">
          AXUS <span className="text-neutral-400">ID</span>
        </span>
      </div>
      <p className="mt-6 text-lg font-semibold tracking-tight text-neutral-950">Sign in to Northwind</p>
      <p className="mt-1 text-[13px] text-neutral-500">northwind.app</p>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-black/[0.06] bg-neutral-50 p-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800">
          AL
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-neutral-950">John Doe</span>
          <span className="block text-xs text-neutral-500">@john</span>
        </span>
      </div>

      <p className={cn(eyebrow, "mt-5")}>Northwind will see</p>
      <ul className="mt-2 space-y-2 text-[13px] text-neutral-700">
        <li className="flex items-center gap-2">
          <UserRound className="h-3.5 w-3.5 text-neutral-400" />
          Your name and username
        </li>
        <li className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-neutral-400" />
          Your AXUS ID identifier
        </li>
      </ul>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <span className="flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-medium text-neutral-800">
          Cancel
        </span>
        <span className="flex h-10 items-center justify-center rounded-xl bg-neutral-950 text-sm font-medium text-white">
          Continue
        </span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const issuer = getIssuer();
  const session = await getValidSession();

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col">
      <PageBackground />

      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <BrandMark size={30} />
        <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Main">
          <Link
            href="#developers"
            className={buttonVariants({ variant: "ghost", size: "md", className: "hidden sm:inline-flex" })}
          >
            Developers
          </Link>
          {session ? (
            <Link href="/account" className={buttonVariants({ size: "md" })}>
              Manage account
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "md" })}>
                Sign in
              </Link>
              <Link href="/register" className={buttonVariants({ size: "md" })}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="animate-[fadeIn_0.4s_ease-out]">
            <p className="inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white px-3 py-1 text-xs font-medium text-neutral-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              Single sign-on for the AXUS ecosystem
            </p>
            <h1 className="mt-6 max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-neutral-950 sm:text-5xl lg:text-[3.5rem]">
              One secure account for every app you use.
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-neutral-500 sm:text-lg">
              Sign in with a passkey, Google or a password — and see exactly what each app gets
              before you continue.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 min-[420px]:flex-row">
              {session ? (
                <Link href="/account" className={buttonVariants({ className: "gap-2" })}>
                  Go to your account
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link href="/register" className={buttonVariants({ className: "gap-2" })}>
                    Create your AXUS ID
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </Link>
                  <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <SignInPreview />
          </div>
        </section>

        <section aria-labelledby="features-heading" className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-black/[0.07] bg-black/[0.07] sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ Icon, title, description }) => (
              <div key={title} className="bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.06] bg-neutral-50 text-neutral-700">
                  <Icon aria-hidden className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-neutral-950">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="developers"
          aria-labelledby="developers-heading"
          className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 pb-24 sm:px-6"
        >
          <div className="grid gap-10 rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">For developers</p>
              <h2
                id="developers-heading"
                className="mt-3 text-balance text-2xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-3xl"
              >
                Add “Sign in with AXUS ID” in minutes.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500 sm:text-base">
                Point any standard OAuth 2.0 / OpenID Connect or SAML library at AXUS ID. Register
                your redirect URIs and you’re done.
              </p>
              <ul className="mt-6 space-y-2.5">
                {developerPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-neutral-700">
                    <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/account?section=developer"
                className={buttonVariants({ variant: "secondary", className: "mt-8 gap-2" })}
              >
                Register your app
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-col justify-center gap-4">
              <CopyField label="Issuer" value={issuer} />
              <CopyField label="Discovery document" value={`${issuer}/.well-known/openid-configuration`} />
              <CopyField label="JWKS" value={`${issuer}/.well-known/jwks.json`} />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter className="pb-10" />
    </div>
  );
}
