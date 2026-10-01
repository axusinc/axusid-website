import type { Metadata } from "next";
import Link from "next/link";
import { FlowPlayground } from "@/components/ui/flow-playground";
import { getAuthSdk } from "@/lib/auth-graphql";
import { getOAuthClient } from "@/lib/oauth/clients";
import { getIssuer } from "@/lib/oauth/constants";
import { getSystemPermissionContext } from "@/lib/permission-config";
import { getValidMultiSession } from "@/lib/session-access";
import { fetchAccountsDisplayInfo } from "@/lib/user-profile";

export const metadata: Metadata = {
  title: "Authorization request playground",
  description:
    "Build and inspect an AXUS ID authorization URL with a fresh PKCE challenge, state and nonce.",
};
export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedClient =
    typeof params.client_id === "string" ? params.client_id : "";
  const multiSession = await getValidMultiSession();
  const accounts = multiSession
    ? await fetchAccountsDisplayInfo(
        multiSession.accounts,
        multiSession.activeAuid,
        getAuthSdk,
      )
    : [];
  const activeAccount = accounts.find((a) => a.isActive) ?? null;
  const activeClient = activeAccount ? await getOAuthClient(activeAccount.auid) : undefined;
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
        Choose required, optional and conditional scopes to try the consent behavior.
      </p>
      <section id="start" className="mt-8">
        <FlowPlayground
          key={activeAccount?.auid ?? "signed-out"}
          issuer={getIssuer()}
          systemContext={getSystemPermissionContext()}
          accounts={accounts}
          initialClientId={requestedClient}
          developerClient={
            activeAccount && activeClient
              ? { auid: activeAccount.auid, redirectUris: activeClient.redirectUris }
              : null
          }
        />
      </section>
      <section id="next" className="docs-section">
        <h2>What happens after authorization?</h2>
        <p>
          After account selection, AXUS ID checks access and asks for any needed consent.
          Missing mandatory permissions return <code>access_denied</code> with state and no code.
          Optional scopes can be turned off; unavailable optional and conditional permissions
          are omitted. Held conditional permissions must be approved to continue.
        </p>
        <p>
          On success, AXUS ID redirects to your registered callback with a code and state.
          This playground keeps its verifier in this page only; it does not
          create a transaction in your app. Your normal callback should reject
          an attempt it did not initiate. To complete a real integration,{" "}
          <Link href="/developers/quickstart" className="docs-link">
            generate and store the transaction in your app
          </Link>
          .
        </p>
        <p>
          After exchanging the code, check the token response’s <code>scope</code> for the approved
          OIDC and AXUS scopes before enabling features. See the <Link href="/developers/quickstart#permission-modes" className="docs-link">permission flow walkthrough</Link>.
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
