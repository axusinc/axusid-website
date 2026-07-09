import "server-only";

import { getClientById } from "@/lib/oauth/client-store";
import type { OAuthClient } from "@/lib/oauth/constants";

export type { OAuthClient, SupportedScope } from "@/lib/oauth/constants";
export {
  SUPPORTED_SCOPES,
  getIssuer,
  normalizeScopes,
  validateRedirectUri,
  validateRedirectUris,
  validateScopes,
  validateSupportedScopes,
} from "@/lib/oauth/constants";
export {
  OIDC_SCOPES,
  partitionScopes,
  isOidcScope,
  isValidPermissionKey,
  permissionImplies,
  validatePermissionKeys,
  getConsentPermissions,
  formatPermissionLabel,
  combineScopes,
} from "@/lib/oauth/scopes";

export async function getOAuthClient(
  auid: string,
): Promise<OAuthClient | undefined> {
  return getClientById(auid);
}
