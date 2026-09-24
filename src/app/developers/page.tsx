import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Fingerprint, Terminal, Workflow } from "lucide-react";
import { CopyField } from "@/components/ui/copy-field";
import { getIssuer } from "@/lib/oauth/constants";
import { IntegrationBuilder } from "./integration-builder";

export const metadata: Metadata = {
  title: "AXUS ID developer guide",
  description:
    "Build AXUS ID sign-in with a guided OAuth and OpenID Connect integration, an AI-ready brief, and a practical API reference.",
};

export default function DevelopersPage() {
  const issuer = getIssuer();
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
      <IntegrationBuilder issuer={issuer} />
      <section className="docs-section" aria-labelledby="flow-heading">
        <h2 id="flow-heading">A familiar sign-in. Four small steps.</h2>
        <p>
          Your app hands off authentication to AXUS ID, then creates its own
          session when the user returns.
        </p>
        <ol className="mt-6 grid gap-5 sm:grid-cols-4">
          {[
            [
              "Register",
              "Save your callback URL and copy your account’s AUID.",
            ],
            [
              "Redirect",
              "Send the user to AXUS ID with a fresh PKCE challenge.",
            ],
            [
              "Verify",
              "Exchange the returned code and verify the user’s identity.",
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
              title: "Explore the API",
              description:
                "Parameters, claims, token lifetimes and provider-specific behavior.",
              href: "/developers/reference",
            },
            {
              icon: Fingerprint,
              title: "Inspect a request",
              description:
                "See how your settings become a PKCE authorization URL.",
              href: "/developers/playground",
            },
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
      <section className="docs-section">
        <h2>Already have an OIDC library?</h2>
        <p>
          Use discovery with Authorization Code, PKCE S256 and token endpoint
          authentication set to <code>none</code>. Check your library’s
          public-client support. AXUS-specific claims and scope behavior are
          described in the{" "}
          <Link href="/developers/reference#tokens" className="docs-link">
            reference
          </Link>
          .
        </p>
        <div className="mt-5 grid gap-4">
          <CopyField label="Issuer" value={issuer} />
          <CopyField
            label="Discovery document"
            value={`${issuer}/.well-known/openid-configuration`}
          />
        </div>
        <div className="docs-note">
          <strong>One detail to know early:</strong> the email claim is a
          synthetic compatibility address. Identify users by issuer + subject (
          <code>sub</code>), and collect a verified contact email separately if
          your app needs one.
        </div>
      </section>
    </>
  );
}
