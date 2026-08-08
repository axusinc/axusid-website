import "server-only";
import { getAuthSdk } from "@/lib/auth-graphql";
import { getOAuthClient } from "@/lib/oauth/clients";
import { getSamlConfigByAuid } from "@/lib/saml/saml-store";
import { resolveUserDisplayInfo } from "@/lib/user-profile";

export type OAuthFlowMetadata = {
  isOAuthFlow: boolean;
  isSaml: boolean;
  clientId: string | null;
  appName: string | null;
  targetHost: string | null;
  applicationUser: {
    displayName: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export async function resolveOAuthFlowMetadata(
  redirectUri: string | undefined,
): Promise<OAuthFlowMetadata> {
  if (!redirectUri || !redirectUri.startsWith("/") || redirectUri.startsWith("//")) {
    return {
      isOAuthFlow: false,
      isSaml: false,
      clientId: null,
      appName: null,
      targetHost: null,
      applicationUser: null,
    };
  }

  let url: URL;
  try {
    url = new URL(redirectUri, "http://localhost");
  } catch {
    return {
      isOAuthFlow: false,
      isSaml: false,
      clientId: null,
      appName: null,
      targetHost: null,
      applicationUser: null,
    };
  }

  const isAuthorize = url.pathname.startsWith("/authorize");
  const isSaml = url.pathname.startsWith("/saml/sso/");

  if (!isAuthorize && !isSaml) {
    return {
      isOAuthFlow: false,
      isSaml: false,
      clientId: null,
      appName: null,
      targetHost: null,
      applicationUser: null,
    };
  }

  let clientId: string | null = null;
  if (isAuthorize) {
    clientId = url.searchParams.get("client_id") || url.searchParams.get("auid");
  } else if (isSaml) {
    const parts = url.pathname.split("/");
    clientId = parts[parts.length - 1] || null;
  }

  if (!clientId) {
    return {
      isOAuthFlow: true,
      isSaml,
      clientId: null,
      appName: null,
      targetHost: null,
      applicationUser: null,
    };
  }

  let appName: string | null = null;
  let targetHost: string | null = null;
  let applicationUser: OAuthFlowMetadata["applicationUser"] = null;
  const sdk = getAuthSdk();

  if (isSaml) {
    const samlConfig = await getSamlConfigByAuid(clientId);
    if (samlConfig?.acsUrl) {
      try {
        targetHost = new URL(samlConfig.acsUrl).host;
      } catch {
        targetHost = samlConfig.acsUrl;
      }
      if (samlConfig.name) {
        appName = samlConfig.name;
      }
    }
    try {
      const ownerInfo = await resolveUserDisplayInfo(sdk, clientId);
      applicationUser = ownerInfo;
      if (!appName) {
        appName = ownerInfo.username ? `@${ownerInfo.username}` : ownerInfo.displayName;
      }
    } catch {
      // Owner profile optional
    }
  } else {
    const client = await getOAuthClient(clientId);
    const clientRedirectUri = url.searchParams.get("redirect_uri");
    if (clientRedirectUri) {
      try {
        targetHost = new URL(clientRedirectUri).host;
      } catch {
        targetHost = null;
      }
    }
    if (client?.auid) {
      try {
        const ownerInfo = await resolveUserDisplayInfo(sdk, client.auid);
        applicationUser = ownerInfo;
        appName = ownerInfo.username ? `@${ownerInfo.username}` : ownerInfo.displayName;
      } catch {
        // Owner profile optional
      }
    }
  }

  return {
    isOAuthFlow: true,
    isSaml,
    clientId,
    appName: appName || clientId,
    targetHost,
    applicationUser,
  };
}
