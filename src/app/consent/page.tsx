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
import { getValidSession } from "@/lib/session-access";
import { resolveUserDisplayInfo } from "@/lib/user-profile";

type ConsentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const redirectUri = typeof params.redirect_uri === "string" ? params.redirect_uri : undefined;

  const session = await getValidSession();
  if (!session) {
    redirect(`/login?redirect_uri=${encodeURIComponent(redirectUri ?? "/consent")}`);
  }

  if (!redirectUri || !redirectUri.startsWith("/") || redirectUri.startsWith("//")) {
    redirect("/");
  }

  let url: URL;
  try {
    url = new URL(redirectUri, "http://localhost");
  } catch {
    redirect("/");
  }

  const clientId = url.searchParams.get("client_id") || url.searchParams.get("auid");
  const scopeParam = url.searchParams.get("scope");

  if (!clientId) {
    redirect("/");
  }

  const client = await getOAuthClient(clientId);
  if (!client) {
    redirect("/");
  }

  let scopes: string[];
  try {
    scopes = validateScopes(client, normalizeScopes(scopeParam ?? ""));
  } catch {
    redirect("/");
  }

  const { axusPermissions } = partitionScopes(scopes);
  const permissions = getConsentPermissions(axusPermissions);

  const clientRedirectUri = url.searchParams.get("redirect_uri");
  let redirectHost: string | null = null;
  if (clientRedirectUri) {
    try {
      redirectHost = new URL(clientRedirectUri).host;
    } catch {
      redirectHost = null;
    }
  }

  const sdk = getAuthSdkForSession(session);
  let applicationUser = null;

  if (client.auid) {
    try {
      applicationUser = await resolveUserDisplayInfo(sdk, client.auid);
    } catch {
      // Owner profile is optional on consent.
    }
  }

  return (
    <ConsentForm
      applicationUser={applicationUser}
      redirectHost={redirectHost}
      permissions={permissions}
      redirectUri={redirectUri}
    />
  );
}
