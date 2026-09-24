import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What data AXUS ID collects and the broad rights reserved to process it.",
};

const linkClass = "font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-950";

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy policy" updated="September 24, 2026">
      <LegalSection id="summary" title="Summary">
        <p>
          Running an identity service requires identity data. This policy reserves wide room to
          process it: operate the service, keep it safe, and improve it. There are no narrow
          guarantees here by design — no “your data is only yours,” no zero-logging claims. No
          third-party analytics or ad trackers today; fonts and assets are served by us.
        </p>
      </LegalSection>

      <LegalSection id="data" title="Data we collect">
        <LegalList
          items={[
            "Identity: your AUID, usernames, and profile details you set (name, description, status, avatar) — plus anything you add later as features grow.",
            "Sign-in material: password verifiers and passkey public keys are held by the auth backend; plaintext passwords are never stored by this website.",
            "Linked accounts: connecting Google or GitHub involves tokens that are exchanged and kept by the auth backend, not in your browser beyond the session.",
            "Authorizations: which apps you approved, for which scopes, and when. Opaque tokens are stored as SHA-256 hashes.",
            "Operational logs: requests, errors, and associated metadata such as IP addresses and user agents — kept as long as useful for reliability, security, and abuse prevention.",
            "Device and flow state: a marker remembering your last sign-in method, and short-lived PKCE and state values during login.",
          ]}
        />
      </LegalSection>

      <LegalSection id="use" title="How we may use it">
        <LegalList
          items={[
            "Operate, maintain, and troubleshoot the service.",
            "Protect it: enforce rate limits, investigate abuse, suspend accounts or clients at our discretion.",
            "Develop and improve it, including de-identified or aggregated analysis, which we may use without restriction.",
            "Comply with applicable law and respond to lawful requests.",
          ]}
        />
      </LegalSection>

      <LegalSection id="sharing" title="Who else may see it">
        <LegalList
          items={[
            "Apps you approve receive the claims covered by the scopes you granted — nothing beyond the documented behavior in the OAuth and OIDC reference.",
            "Infrastructure providers that host, store, or carry the service, as needed to run it.",
            "Authorities where required by law, and counterparties in a merger, acquisition, or asset transfer.",
            "Anyone, where data is de-identified or aggregated beyond reasonable re-identification.",
          ]}
        />
        <p>
          Disconnecting an app in your account ends the authorization and revokes its tokens;
          already-issued JWT access tokens, where used, expire on their own short schedule
          instead. How each endpoint behaves is documented in the{" "}
          <Link href="/developers/reference" className={linkClass}>OAuth and OIDC reference</Link>.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="Retention">
        <p>
          We keep data as long as the account exists or as needed for the purposes above,
          security, or legal obligations. There is no fixed deletion schedule and currently no
          self-serve deletion or export. Assume anything you put here stays until we say otherwise.
        </p>
      </LegalSection>

      <LegalSection id="control" title="What you can do yourself">
        <LegalList
          items={[
            "Review and disconnect connected apps from your account.",
            "Change usernames, profile details, and sign-in methods without asking us.",
            "Sign out to end sessions issued from that sign-in, including app tokens delegated from it.",
          ]}
        />
      </LegalSection>
    </LegalPage>
  );
}
