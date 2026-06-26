export type OAuthClient = {
  clientId: string;
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
};

const DEV_CLIENTS: OAuthClient[] = [
  {
    clientId: "axusid-dev",
    name: "AXUS ID Dev Client",
    redirectUris: [
      "http://localhost:3000/callback",
      "http://localhost:3001/callback",
      "http://127.0.0.1:3000/callback",
    ],
    allowedScopes: ["openid", "profile", "email", "offline_access"],
  },
];

export function getOAuthClient(clientId: string): OAuthClient | undefined {
  return DEV_CLIENTS.find((client) => client.clientId === clientId);
}

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

export function getIssuer(): string {
  return process.env.OAUTH_ISSUER ?? "http://localhost:3000";
}
