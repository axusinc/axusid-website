import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Fingerprint, Terminal, Workflow } from "lucide-react";
import { getAuthSdk } from "@/lib/auth-graphql";
import { getIssuer } from "@/lib/oauth/constants";
import { getValidMultiSession } from "@/lib/session-access";
import { fetchAccountsDisplayInfo } from "@/lib/user-profile";
import { IntegrationBuilder } from "./integration-builder";

export const metadata: Metadata = {
  title: "AXUS ID developer guide",
  description:
    "Build AXUS ID sign-in with a guided OAuth and OpenID Connect integration, an AI-ready brief, and a practical API reference.",
};

export default async function DevelopersPage() {
  const issuer = getIssuer();
  const multiSession = await getValidMultiSession();
  const accounts = multiSession
    ? await fetchAccountsDisplayInfo(
        multiSession.accounts,
        multiSession.activeAuid,
        getAuthSdk,
      )
    : [];
  return (
    <>
      <div id="start" className="docs-eyebrow">
        The developer guide
      </div>
      <h1>
        One identity.
        <br />
        <span className="text-neutral-400">Every app you build.</span>
      </h1>
      <p className="docs-lead">
        Add “Continue with AXUS ID” to your app. Follow the code, bring your own
        auth library, or give your AI agent a precise integration brief. Start
        here, ship with confidence.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-neutral-500">
        {[
          "OAuth 2.0 + OpenID Connect",
          "PKCE required",
          "No client secret",
        ].map((text) => (
          <span key={text} className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-brand" />
            {text}
          </span>
        ))}
      </div>
      <IntegrationBuilder issuer={issuer} accounts={accounts} />
      <section className="docs-section" aria-labelledby="flow-heading">
        <h2 id="flow-heading">Sign-in and consent in five steps.</h2>
        <p>
          Your app hands off authentication to AXUS ID, then creates its own
          session when the user returns.
        </p>
        <ol className="mt-6 grid gap-5 sm:grid-cols-5">
          {[
            [
              "Register",
              "Save your callback URL and copy your account’s AUID.",
            ],
            [
              "Redirect",
              "Send a fresh PKCE challenge and the required, optional and conditional scopes.",
            ],
            [
              "Review access",
              "The user reviews access. Missing mandatory permissions stop authorization.",
            ],
            [
              "Verify",
              "Exchange the code, verify identity and inspect the approved scope set.",
            ],
            [
              "Sign in",
              "Find or create your local user and start your app’s session.",
            ],
          ].map(([title, body], i) => (
            <li key={title}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 font-mono text-xs text-neutral-500">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-6 text-neutral-500">{body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="docs-section" aria-labelledby="two-apis-heading">
        <h2 id="two-apis-heading">Two APIs. Two jobs.</h2>
        <p>
          Sign-in uses OAuth 2.0 and OpenID Connect. AXUS ID extends authorization
          with optional and conditional permission lists when your app needs API access. Everything else (users,
          usernames, variations, passkeys, permissions, tokens) is GraphQL on
          the engine.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            href="/developers/reference"
            className="group rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
          >
            <h3 className="text-sm font-semibold">Sign users in · OAuth2 / OIDC</h3>
            <p className="mt-2 text-xs leading-6 text-neutral-500">
              Authorize, token, userinfo, revocation, introspection, discovery.
              Compliant endpoints your existing stack already understands.
            </p>
            <ArrowRight
              aria-hidden
              size={15}
              className="mt-4 text-neutral-400 group-hover:text-brand"
            />
          </Link>
          <Link
            href="/developers/api"
            className="group rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
          >
            <h3 className="text-sm font-semibold">Run AXUS ID functions · GraphQL</h3>
            <p className="mt-2 text-xs leading-6 text-neutral-500">
              The complete engine API behind the login: identities, credentials,
              delegation, and tokens. Bearer <code>axus_access_token</code>.
            </p>
            <ArrowRight
              aria-hidden
              size={15}
              className="mt-4 text-neutral-400 group-hover:text-brand"
            />
          </Link>
        </div>
      </section>
      <section id="next" className="docs-section">
        <h2>Go straight to what you need.</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Workflow,
              title: "Follow the quickstart",
              description:
                "From the first redirect to a verified identity and your own session.",
              href: "/developers/quickstart",
            },
            {
              icon: Terminal,
              title: "Read the OAuth reference",
              description:
                "Compliant endpoints, claims, token lifetimes — the sign-in half.",
              href: "/developers/reference",
            },
            {
              icon: Fingerprint,
              title: "Inspect a request",
              description:
                "See how your settings become a PKCE authorization URL.",
              href: "/developers/playground",
            },
            { icon: Terminal, title: "Declare permissions", description: "Discover and delegate typed permissions in the right app context.", href: "/developers/permissions" },
            { icon: Workflow, title: "Become an app", description: "Publish permission templates and connect your dynamic validator.", href: "/developers/become-an-app" },
          ].map(({ icon: Icon, title, description, href }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
            >
              <Icon aria-hidden size={20} className="text-neutral-500" />
              <h3 className="mt-5 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-6 text-neutral-500">
                {description}
              </p>
              <ArrowRight
                aria-hidden
                size={15}
                className="mt-4 text-neutral-400 group-hover:text-brand"
              />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
