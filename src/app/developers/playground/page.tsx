import type { Metadata } from "next";
import Link from "next/link";
import { FlowPlayground } from "@/components/ui/flow-playground";
import { getIssuer } from "@/lib/oauth/constants";

export const metadata: Metadata = {
  title: "Authorization request playground",
  description:
    "Build and inspect an AXUS ID authorization URL with a fresh PKCE challenge, state and nonce.",
};
export default function PlaygroundPage() {
  return (
    <>
      <p className="docs-eyebrow">Tools / Request playground</p>
      <h1>
        See the request
        <br />
        before you send it.
      </h1>
      <p className="docs-lead">
        Turn your app’s settings into a real authorization URL. Inspect the PKCE
        values and copy the request to understand each part of the flow.
      </p>
      <section id="start" className="mt-8">
        <FlowPlayground issuer={getIssuer()} />
      </section>
      <section id="next" className="docs-section">
        <h2>What happens after authorization?</h2>
        <p>
          AXUS ID redirects to your registered callback with a code and state.
          This playground keeps its verifier in this page only; it does not
          create a transaction in your app. Your normal callback should reject
          an attempt it did not initiate. To complete a real integration,{" "}
          <Link href="/developers/quickstart" className="docs-link">
            generate and store the transaction in your app
          </Link>
          .
        </p>
        <div className="docs-note">
          These generated values are for development. Reloading this page
          discards them. No token exchange or app session is performed here. Do
          not paste access tokens or client secrets into the settings.
        </div>
      </section>
    </>
  );
}
