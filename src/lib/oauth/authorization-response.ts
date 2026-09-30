import "server-only";
import { grantAuthorization } from "@/lib/oauth/grants";
import { AUTH_CODE_TTL_MS, saveAuthorizationCode } from "@/lib/oauth/auth-code-store";
import { generateOpaqueCode } from "@/lib/oauth/pkce";
import { partitionScopes } from "@/lib/oauth/scopes";
import type { AuthorizeQuery } from "@/lib/oauth/schemas";
import { MissingRequiredPermissionsError } from "@/lib/oauth/requested-scopes";
import { getPrimaryDomainError, isPermissionValidationError } from "@/lib/graphql-errors";

export function authorizationErrorCode(error: unknown): string {
  const code = getPrimaryDomainError(error)?.code;
  if (error instanceof MissingRequiredPermissionsError || code === "NOT_AUTHORIZED" || code === "GRANT_APPROVAL_DENIED") return "access_denied";
  return isPermissionValidationError(error) ? "invalid_scope" : "server_error";
}

/** Shared by silent authorization and the consent POST; only approved scopes reach the code. */
export async function createAuthorizationResponse(params: {
  query: AuthorizeQuery;
  clientAuid: string;
  userAuid: string;
  sessionTokenId: string;
  scopes: string[];
}): Promise<string> {
  const { query, scopes } = params;
  const grant = await grantAuthorization({
    userAuid: params.userAuid, clientAuid: params.clientAuid,
    sessionTokenId: params.sessionTokenId, scopes,
    axusPermissions: partitionScopes(scopes).axusPermissions,
  });
  const code = await generateOpaqueCode();
  await saveAuthorizationCode({
    code, clientAuid: params.clientAuid, redirectUri: query.redirect_uri,
    scopes, userAuid: params.userAuid, grantId: grant.id,
    codeChallenge: query.code_challenge, codeChallengeMethod: "S256", nonce: query.nonce,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });
  const response = new URL(query.redirect_uri);
  response.searchParams.set("code", code);
  if (query.state) response.searchParams.set("state", query.state);
  return response.toString();
}
