import { redirect } from "next/navigation";
import { ConsentForm } from "./consent-form";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import {
  getOAuthClient,
  normalizeScopes,
  partitionScopes,
  validateScopes,
  getConsentPermissions,
} from "@/lib/oauth/clients";
import { getValidSession, getValidMultiSession } from "@/lib/session-access";
import { resolveUserDisplayInfo, fetchAccountsDisplayInfo } from "@/lib/user-profile";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";

type ConsentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : undefined;

  const multiSession = await getValidMultiSession();
  const session = await getValidSession();

  if (!session || !multiSession) {
    redirect(`/login?redirect_uri=${encodeURIComponent(redirectUri ?? "/consent")}`);
  }

  const accountInfos = await fetchAccountsDisplayInfo(
    multiSession.accounts,
    multiSession.activeAuid,
    (credentials) =>
      getAuthSdkForSession({
        auid: "",
        credentials,
        oidcScopes: [],
        axusPermissions: [],
        consentedClients: [],
      }),
  );

  if (!redirectUri || !redirectUri.startsWith("/") || redirectUri.startsWith("//")) {
    redirect("/");
  }

  let url: URL;
  try {
    url = new URL(redirectUri, "http://localhost");
  } catch {
    redirect("/");
  }

  let clientId = url.searchParams.get("client_id") || url.searchParams.get("auid");
  let isSaml = false;
  if (!clientId && url.pathname.startsWith("/saml/sso/")) {
    const parts = url.pathname.split("/");
    clientId = parts[parts.length - 1] || null;
    isSaml = true;
  }

  if (!clientId) {
    redirect("/");
  }

  let redirectHost: string | null = null;
  let permissions: string[] = [];
  let oidcScopes: string[] = [];
  let applicationUser = null;

  const sdk = getAuthSdkForSession(session);

  if (isSaml) {
    const samlConfig = await getSamlConfigByAuid(clientId);
    if (!samlConfig) {
      redirect("/");
    }
    try {
      redirectHost = new URL(samlConfig.acsUrl).host;
    } catch {
      redirectHost = samlConfig.acsUrl;
    }
    try {
      applicationUser = await resolveUserDisplayInfo(sdk, clientId);
    } catch {
      // Owner profile is optional on consent.
    }
  } else {
    const client = await getOAuthClient(clientId);
    if (!client) {
      redirect("/");
    }

    const scopeParam = url.searchParams.get("scope");
    let scopes: string[];
    try {
      scopes = validateScopes(client, normalizeScopes(scopeParam ?? ""));
    } catch {
      redirect("/");
    }

    const partitioned = partitionScopes(scopes);
    oidcScopes = partitioned.oidcScopes;
    permissions = getConsentPermissions(partitioned.axusPermissions);

    const clientRedirectUri = url.searchParams.get("redirect_uri");
    if (clientRedirectUri) {
      try {
        redirectHost = new URL(clientRedirectUri).host;
      } catch {
        redirectHost = null;
      }
    }

    if (client.auid) {
      try {
        applicationUser = await resolveUserDisplayInfo(sdk, client.auid);
      } catch {
        // Owner profile is optional on consent.
      }
    }
  }

  return (
    <ConsentForm
      applicationUser={applicationUser}
      permissions={permissions}
      redirectUri={redirectUri}
      accounts={accountInfos}
      currentAuid={session.auid}
    />
  );
}
