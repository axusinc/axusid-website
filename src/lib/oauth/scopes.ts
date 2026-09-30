export const OIDC_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

export type OidcScope = (typeof OIDC_SCOPES)[number];

// OAuth scope tokens follow RFC 6749; declaration validity belongs to the engine.
const SCOPE_TOKEN = /^[\x21\x23-\x5b\x5d-\x7e]+$/;
const CONTEXTUAL_SCOPE_PREFIX = "axus:";
const CONTEXTUAL_SCOPE = /^axus:([0-9]+(?:,[0-9]+)*):(.+)$/;

export type ParsedPermissionScope = { scope: string; key: string; contextAuid: string | null };

export class InvalidPermissionScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPermissionScopeError";
  }
}

/** Unprefixed permissions retain the system context for existing OAuth clients. */
export function parsePermissionScope(scope: string): ParsedPermissionScope {
  if (scope.startsWith(CONTEXTUAL_SCOPE_PREFIX)) {
    const match = CONTEXTUAL_SCOPE.exec(scope);
    if (!match || !isValidPermissionKey(match[2])) throw new InvalidPermissionScopeError(`Invalid permission scope: ${scope}`);
    const contextAuid = match[1].split(",").map((part) => BigInt(part).toString()).join(",");
    if (contextAuid !== match[1]) throw new InvalidPermissionScopeError(`Non-canonical permission context: ${match[1]}`);
    return { scope, key: match[2], contextAuid };
  }
  if (!isValidPermissionKey(scope)) throw new InvalidPermissionScopeError(`Invalid permission scope: ${scope}`);
  return { scope, key: scope, contextAuid: null };
}

export function validatePermissionScopeCombination(permissions: string[], systemContext: string): void {
  const wildcardContexts = new Set(permissions.map(parsePermissionScope)
    .filter((permission) => permission.key === "*")
    .map((permission) => permission.contextAuid ?? systemContext));
  if (wildcardContexts.size > 1) {
    throw new InvalidPermissionScopeError("An OAuth request can use all-access permissions in only one context");
  }
}

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
  try {
    const parsed = parsePermissionScope(key);
    const label = parsed.key === "*" ? "All permissions you hold" : parsed.key;
    return parsed.contextAuid ? `App ${parsed.contextAuid}: ${label}` : parsed.key === "*" ? "All AXUS ID permissions you hold" : label;
  } catch {
    return key;
  }
}

export function combineScopes(
  oidcScopes: string[],
  axusPermissions: string[],
): string[] {
  return [...oidcScopes, ...axusPermissions];
}
