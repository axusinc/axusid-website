export type OAuthClient = {
  clientId: string;
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
  ownerAuid?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const SUPPORTED_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

export type SupportedScope = (typeof SUPPORTED_SCOPES)[number];

export function validateRedirectUri(
  client: OAuthClient,
  redirectUri: string,
): boolean {
  return client.redirectUris.includes(redirectUri);
}

export function normalizeScopes(scope?: string): string[] {
  if (!scope?.trim()) {
    return ["openid"];
  }

  return [...new Set(scope.trim().split(/\s+/).filter(Boolean))];
}

export function validateScopes(
  client: OAuthClient,
  scopes: string[],
): string[] {
  const invalid = scopes.filter(
    (scope) => !client.allowedScopes.includes(scope),
  );

  if (invalid.length > 0) {
    throw new Error(`Invalid scopes: ${invalid.join(", ")}`);
  }

  return scopes;
}

export function validateSupportedScopes(scopes: string[]): string[] {
  const invalid = scopes.filter(
    (scope) => !SUPPORTED_SCOPES.includes(scope as SupportedScope),
  );

  if (invalid.length > 0) {
    throw new Error(`Invalid scopes: ${invalid.join(", ")}`);
  }

  return scopes;
}

export function getIssuer(): string {
  return process.env.OAUTH_ISSUER ?? "http://localhost:3000";
}

export function validateRedirectUris(uris: string[]): string[] {
  const normalized = [...new Set(uris.map((uri) => uri.trim()).filter(Boolean))];

  if (normalized.length === 0) {
    throw new Error("At least one redirect URI is required.");
  }

  for (const uri of normalized) {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      throw new Error(`Invalid redirect URI: ${uri}`);
    }

    if (parsed.hash) {
      throw new Error(`Redirect URI must not contain a fragment: ${uri}`);
    }

    if (parsed.pathname.includes("*") || parsed.host.includes("*")) {
      throw new Error(`Redirect URI must not contain wildcards: ${uri}`);
    }

    if (process.env.NODE_ENV === "production") {
      const isLocalhost =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (parsed.protocol !== "https:" && !isLocalhost) {
        throw new Error(
          `Production redirect URIs must use HTTPS (except localhost): ${uri}`,
        );
      }
    }
  }

  return normalized;
}
