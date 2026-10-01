import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConsentForm } from "./consent-form";
import { StatusPage } from "@/components/status-page";
import { buttonVariants } from "@/components/ui/button";
import { getAuthSdk, getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError, isRateLimitError } from "@/lib/graphql-errors";
import {
  getOAuthClient,
  validateRedirectUri,
  partitionScopes,
  getConsentPermissions,
} from "@/lib/oauth/clients";
import { getValidSession, getValidMultiSession } from "@/lib/session-access";
import { resolveUserDisplayInfo, fetchAccountsDisplayInfo } from "@/lib/user-profile";
import { describeConsentPermissions } from "@/lib/oauth/permission-scopes";
import { parsePermissionScope } from "@/lib/oauth/scopes";
import { permissionErrorMessage } from "@/lib/graphql-errors";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import type { PermissionContext } from "@/lib/permission-types";
import { MissingRequiredPermissionsError, parseRequestedScopes, type AvailableScope } from "@/lib/oauth/requested-scopes";
import { authorizeQuerySchema } from "@/lib/oauth/schemas";
import { resolveScopeAvailability } from "@/lib/oauth/scope-availability";
import { getSystemPermissionContext } from "@/lib/permission-config";

export const metadata: Metadata = { title: "Review access" };

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

  let accountInfos;
  try {
    accountInfos = await fetchAccountsDisplayInfo(
      multiSession.accounts,
      multiSession.activeAuid,
      getAuthSdk,
    );
  } catch (error) {
    return (
      <StatusPage
        tone="error"
        title={isRateLimitError(error) ? "Too many requests" : "We couldn’t load this page"}
        description={formatGraphqlError(error, "account", "Something went wrong on our side. Try again.")}
        actions={
          <a
            href={redirectUri ? `/consent?redirect_uri=${encodeURIComponent(redirectUri)}` : "/consent"}
            className={buttonVariants({ className: "w-full sm:w-auto" })}
          >
            Try again
          </a>
        }
      />
    );
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
  let scopeChoices: AvailableScope[] = [];
  let applicationUser = null;
  let missingPermissionReturnUri: string | undefined;

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

    const queryParams = Object.fromEntries(url.searchParams);
    if (!queryParams.client_id && queryParams.auid) queryParams.client_id = queryParams.auid;
    const parsed = authorizeQuerySchema.safeParse(queryParams);
    if (url.pathname !== "/authorize" || !parsed.success || !validateRedirectUri(client, parsed.data.redirect_uri)) {
      redirect("/");
    }
    // Silent requests must go through authorization without rendering interactive UI.
    if (parsed.data.prompt?.trim().split(/\s+/).includes("none")) redirect(redirectUri);

    try {
      const requested = parseRequestedScopes(parsed.data, getSystemPermissionContext());
      scopeChoices = await resolveScopeAvailability(session.tokenId, session.auid, requested);
    } catch (error) {
      return <StatusPage tone="error" title="We couldn’t check this access request" description={permissionErrorMessage(error)} actions={<a href={`/consent?redirect_uri=${encodeURIComponent(redirectUri)}`} className={buttonVariants()}>Try again</a>} />;
    }
    const missingScopes = scopeChoices.filter(({ mode, available }) => mode === "required" && !available);
    if (missingScopes.length) {
      const response = new URL(parsed.data.redirect_uri);
      response.searchParams.set("error", "access_denied");
      response.searchParams.set("error_description", new MissingRequiredPermissionsError(missingScopes.map(({ scope }) => scope)).message);
      if (parsed.data.state) response.searchParams.set("state", parsed.data.state);
      missingPermissionReturnUri = response.toString();
    }
    const partitioned = partitionScopes((missingScopes.length ? missingScopes : scopeChoices).map(({ scope }) => scope));
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

  let describedPermissions;
  try {
    describedPermissions = await describeConsentPermissions(session.tokenId, permissions);
  } catch (error) {
    return <StatusPage tone="error" title="These permissions aren’t available" description={permissionErrorMessage(error, "Couldn’t load the requested permissions. Please try again.")} actions={<a href={`/consent?redirect_uri=${encodeURIComponent(redirectUri)}`} className={buttonVariants()}>Try again</a>} />;
  }

  // Resolve unique app contexts (username, display name, avatar) for other apps' permissions
  const contextAuids = [
    ...new Set(
      describedPermissions
        .map((p) => p.contextAuid)
        .filter((auid): auid is string => Boolean(auid)),
    ),
  ];

  const contextApps = new Map<string, PermissionContext>();
  await Promise.all(
    contextAuids.map(async (auid) => {
      try {
        const info = await resolveUserDisplayInfo(sdk, auid);
        const username = info.username ?? null;
        contextApps.set(auid, {
          id: auid,
          username,
          label: username ? `@${username}` : (info.displayName || `App ${auid}`),
          avatarUrl: info.avatarUrl ?? null,
        });
      } catch {
        contextApps.set(auid, {
          id: auid,
          username: null,
          label: `App ${auid}`,
          avatarUrl: null,
        });
      }
    }),
  );

  const permissionsWithApps = describedPermissions.map((permission) => {
    if (!permission.contextAuid) {
      return permission;
    }
    const app = contextApps.get(permission.contextAuid) ?? permission.app;
    const appLabel = app?.label ?? `App ${permission.contextAuid}`;
    let label = permission.label;
    let description = permission.description;
    const { key } = parsePermissionScope(permission.key);
    if (key === "*") {
      label = "All permissions you hold";
      description = `Lets this app use all your access in ${appLabel}.`;
    }
    return {
      ...permission,
      label,
      description,
      contextLabel: appLabel,
      app: app ?? null,
    };
  });

  return (
    <ConsentForm
      applicationUser={applicationUser}
      redirectHost={redirectHost}
      oidcScopes={oidcScopes}
      scopeChoices={scopeChoices}
      permissions={permissionsWithApps.map((permission) => {
        const choice = scopeChoices.find(({ scope }) => scope === permission.key);
        return { ...permission, mode: choice?.mode, available: choice?.available };
      })}
      redirectUri={redirectUri}
      missingPermissionReturnUri={missingPermissionReturnUri}
      accounts={accountInfos}
      currentAuid={session.auid}
    />
  );
}
