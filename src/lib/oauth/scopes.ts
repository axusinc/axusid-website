export const OIDC_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

export type OidcScope = (typeof OIDC_SCOPES)[number];

const PERMISSION_SEGMENT = /^[a-zA-Z0-9_*]+$/;

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
  if (!key || key.startsWith(".") || key.endsWith(".")) {
    return false;
  }

  const segments = key.split(".");
  if (segments.length === 0 || segments.some((segment) => !segment)) {
    return false;
  }

  return segments.every((segment) => PERMISSION_SEGMENT.test(segment));
}

export function permissionImplies(granted: string, requested: string): boolean {
  const grantedParts = granted.split(".");
  const requestedParts = requested.split(".");

  for (let i = 0; i < grantedParts.length; i++) {
    if (grantedParts[i] === "*") {
      return true;
    }
    if (i >= requestedParts.length) {
      return false;
    }
    if (grantedParts[i] !== requestedParts[i]) {
      return false;
    }
  }

  return grantedParts.length === requestedParts.length;
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
  const segments = key.split(".");
  if (segments.length === 0) {
    return key;
  }

  const action = segments[segments.length - 1];
  const resource = segments.slice(0, -1).join(" ");

  if (action === "*") {
    return `Full access to ${resource || key}`;
  }

  const actionLabel = action.replace(/_/g, " ");
  if (resource) {
    return `${actionLabel.charAt(0).toUpperCase()}${actionLabel.slice(1)} ${resource}`;
  }

  return key;
}

export function combineScopes(
  oidcScopes: string[],
  axusPermissions: string[],
): string[] {
  return [...oidcScopes, ...axusPermissions];
}
