import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using AXUS ID, with broad discretion reserved for the operator.",
};

const linkClass = "font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-950";

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of use" updated="September 24, 2026">
      <LegalSection id="service" title="The service">
        <p>
          AXUS ID provides sign-in and delegated authorization: one account, standard OAuth 2.0
          with PKCE and OpenID Connect, plus SAML for apps that need it. The service is provided
          as-is, without warranties of any kind — availability, fitness, or otherwise. There is no
          SLA and no promised level of support.
        </p>
      </LegalSection>

      <LegalSection id="license" title="Rights you grant us">
        <p>
          By using the service you grant us a worldwide, royalty-free license to host, process,
          transmit, and display your content as needed to operate, secure, and improve the
          service. Feedback, suggestions, and bug reports may be used freely, without compensation
          or confidentiality obligations.
        </p>
      </LegalSection>

      <LegalSection id="users" title="If you use an AXUS ID">
        <LegalList
          items={[
            "You are responsible for activity under your account. Keep at least two sign-in methods (see Recovery) and review connected apps periodically.",
            "Usernames are first-come. Impersonation and misleading profile details can get an account suspended.",
            "Don’t probe, overload, or bypass access controls. Rate limits exist and are enforced.",
          ]}
        />
      </LegalSection>

      <LegalSection id="developers" title="If you integrate the button">
        <LegalList
          items={[
            "Always send users to the hosted authorize page. Never collect AXUS ID credentials on your own screens.",
            "Render the button per the brand page: approved labels, unmodified mark, same size as neighboring login buttons.",
            "Register redirect URIs you own, exactly — no wildcards, no fragments. Keep them current.",
            "Request the smallest scopes you need. Ask for offline_access only if you refresh tokens server-side.",
            "Your app is your responsibility: its own privacy notices, user consents, and data handling are on you, not us.",
          ]}
        />
        <p>
          Full technical rules are in the{" "}
          <Link href="/developers/reference" className={linkClass}>OAuth and OIDC reference</Link>.
        </p>
      </LegalSection>

      <LegalSection id="enforcement" title="Suspension and termination">
        <p>
          We may suspend or terminate accounts or clients at our sole discretion, with or without
          warning — including for credential harvesting, phishing, redirect-URI spoofing, attacks
          on the service, or legal exposure. Users can stop using any app at any time by
          disconnecting it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to these terms">
        <p>
          We may change these terms at any time. Continued use after changes take effect counts as
          acceptance. Check back occasionally; the date above shows the latest revision.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Liability and indemnity">
        <p>
          To the extent permitted by law, AXUS ID is not liable for indirect, incidental, or
          consequential damages, including loss of access to third-party apps connected through
          it. Total liability is limited to what you paid for the service — currently nothing,
          since it’s free. You indemnify us against claims arising from your use, your content,
          or — for developers — your app’s handling of its users’ data.
        </p>
      </LegalSection>

      <LegalSection id="review" title="A note on review">
        <p>
          This is a working draft, not counsel-reviewed legal text. Regulated use cases need a
          proper pass before relying on it.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
