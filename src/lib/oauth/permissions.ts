const OIDC_SCOPES = new Set([
  "openid",
  "profile",
  "email",
  "offline_access",
]);

export function scopesToBackendPermissions(
  scopes: string[],
): string[] | undefined {
  const axusPermissions = scopes.filter((scope) => !OIDC_SCOPES.has(scope));
  return axusPermissions.length > 0 ? axusPermissions : undefined;
}
