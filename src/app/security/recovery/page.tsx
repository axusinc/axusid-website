import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Account recovery",
  description: "How to keep access to your AXUS ID, and what to do when a sign-in method stops working.",
};

const linkClass = "font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-950";

export default function RecoveryPage() {
  return (
    <LegalPage eyebrow="Trust" title="Account recovery" updated="September 24, 2026">
      <LegalSection id="before" title="Before anything breaks">
        <p>
          AXUS ID lets you sign in several ways — password, passkey, linked Google or GitHub
          account. They are managed in{" "}
          <Link href="/account" className={linkClass}>Account → Security</Link>. Keep at least
          two working methods: a passkey on your main device plus either a password you store in
          a manager or a linked external account.
        </p>
      </LegalSection>

      <LegalSection id="lost-one" title="If you lose one method">
        <LegalList
          items={[
            "Sign in with any remaining method.",
            "Open Account → Security and remove the lost method, then add a replacement.",
            "New device without your passkey? Sign in with your password or a linked account, then register a fresh passkey there — passkeys don’t roam by themselves.",
          ]}
        />
      </LegalSection>

      <LegalSection id="lost-all" title="If you lose all methods">
        <p>
          Be direct about this: there is currently no support-assisted recovery. Nobody can talk
          you back into your account, which is a deliberate security posture and an admitted
          operational gap. The mitigation is the paragraph above — two methods, set up today.
          Assisted recovery with verification is on the roadmap; demand for it decides the order.
        </p>
      </LegalSection>

      <LegalSection id="apps" title="Your apps during recovery">
        <p>
          Fixing sign-in methods never touches your connected apps. Only explicit disconnects —
          or signing out, which retires tokens delegated from that session — affect them.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
