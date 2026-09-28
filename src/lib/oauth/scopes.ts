export const OIDC_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

export type OidcScope = (typeof OIDC_SCOPES)[number];

// OAuth scope tokens follow RFC 6749; declaration validity belongs to the engine.
const SCOPE_TOKEN = /^[\x21\x23-\x5b\x5d-\x7e]+$/;

export function isOidcScope(scope: string): scope is OidcScope {
  return (OIDC_SCOPES as readonly string[]).includes(scope);
}

export function partitionScopes(scopes: string[]): {
  oidcScopes: string[];
  axusPermissions: string[];
} {
  const oidcScopes: string[] = [];
  const axusPermissions: string[] = [];

  for (const scope of scopes) {
    if (isOidcScope(scope)) {
      oidcScopes.push(scope);
    } else {
      axusPermissions.push(scope);
    }
  }

  return { oidcScopes, axusPermissions };
}

export function isValidPermissionKey(key: string): boolean {
  if (!key || key.length > 4096 || !SCOPE_TOKEN.test(key) || /[{}]/.test(key)) return false;
  return key.split(".").every(Boolean);
}

/** Consent coverage is exact until the engine exposes declaration-aware implication. */
export function permissionImplies(granted: string, requested: string): boolean {
  return granted === requested;
}

export function validatePermissionKeys(keys: string[]): string[] {
  const unique = [...new Set(keys.filter(Boolean))];
  const invalid = unique.filter((key) => !isValidPermissionKey(key));

  if (invalid.length > 0) {
    throw new Error(`Invalid permission keys: ${invalid.join(", ")}`);
  }

  return unique;
}

export function getConsentPermissions(axusPermissions: string[]): string[] {
  return axusPermissions;
}

export function formatPermissionLabel(key: string): string {
  return key === "*" ? "All AXUS ID permissions you hold" : key;
}

export function combineScopes(
  oidcScopes: string[],
  axusPermissions: string[],
): string[] {
  return [...oidcScopes, ...axusPermissions];
}
