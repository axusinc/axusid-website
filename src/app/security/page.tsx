import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Security",
  description: "How AXUS ID protects sign-in: passkeys, mandatory PKCE, hashed tokens, rotating refresh tokens, and honest limits.",
};

const linkClass = "font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-950";

export default function SecurityPage() {
  return (
    <LegalPage eyebrow="Trust" title="Security" updated="September 24, 2026">
      <LegalSection id="signin" title="Sign-in">
        <LegalList
          items={[
            "Passkeys (WebAuthn) with Face ID, Touch ID, or security keys — phishing-resistant by construction.",
            "Passwords are verified by the auth backend; the website never stores a plaintext password.",
            "Google and GitHub linking uses state plus PKCE, and only the refresh token reaches the auth backend.",
          ]}
        />
      </LegalSection>

      <LegalSection id="protocol" title="Protocol">
        <LegalList
          items={[
            "PKCE (S256) is mandatory on every authorization. There are no client secrets to leak.",
            "ID tokens and JWT access tokens are RS256 and verifiable offline against the published JWKS.",
            "Default access tokens are opaque, stored as SHA-256 hashes, live 12 hours, and die instantly when you disconnect the app. JWT-format tokens (15 minutes) stay valid until they expire — that’s the tradeoff, stated plainly.",
            "Refresh tokens rotate on every use. The old one works 30 seconds for retried requests; reuse after that revokes the whole authorization as presumed theft.",
            "Revoking any token ends the entire authorization, including the app’s backend token. Your own session is untouched.",
          ]}
        />
      </LegalSection>

      <LegalSection id="sessions" title="Sessions and transport">
        <LegalList
          items={[
            "Session cookies are HttpOnly, SameSite=Lax, and Secure in production.",
            "HTTPS with HSTS in production. Security headers (no sniffing, no framing) are set on every response.",
            "Rate limits are enforced by the auth engine, and security events are logged.",
          ]}
        />
      </LegalSection>

      <LegalSection id="recovery" title="If you lose access">
        <p>
          The best recovery is set up before you need it — see{" "}
          <Link href="/security/recovery" className={linkClass}>Recovery</Link>. Short version:
          keep two sign-in methods. If you lose one, sign in with the other and fix it in
          Security settings.
        </p>
      </LegalSection>

      <LegalSection id="scope" title="What we don’t claim">
        <p>
          No SOC 2, no penetration-test report, no bug-bounty program — yet. If your threat model
          needs any of those, that demand is what schedules them.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
