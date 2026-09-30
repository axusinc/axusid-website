import { getAuthSdk } from "@/lib/auth-graphql";
import { publicTokenId } from "@/lib/native-token-id";
import { InvalidPermissionScopeError, parsePermissionScope } from "@/lib/oauth/scopes";
import { getSystemPermissionContext } from "@/lib/permission-config";

/**
 * What the user's own session token asks for. An empty list would now mean no permissions at
 * all, so the wildcard is requested explicitly: the session acts for the user on their own
 * account, and each app authorization gets its own narrower token instead.
 */
export const SESSION_PERMISSIONS = ["*"];

/** Signs in with a password and returns the new native token id. */
export async function loginWithBackend(
  auid: string,
  password: string,
  permissions?: string[],
): Promise<string> {
  const sdk = getAuthSdk();
  const result = await sdk.LoginWithPassword({
    auid,
    password,
    ...(permissions?.length ? { permissions } : {}),
  });
  return result.loginWithPassword.id;
}

/**
 * Mints the token an app gets for one authorization: a child of the user's session token,
 * holding only the permissions the user consented to. Revoking it leaves the user's own
 * session untouched.
 */
export async function issueAuthorizationToken(params: {
  sessionTokenId: string;
  userAuid: string;
  permissions: string[];
}): Promise<string> {
  const sdk = getAuthSdk(params.sessionTokenId);
  const systemContext = getSystemPermissionContext();
  const groups = new Map<string, Set<string>>();
  for (const scope of params.permissions) {
    const parsed = parsePermissionScope(scope);
    const context = parsed.contextAuid ?? systemContext;
    if (!groups.has(context)) groups.set(context, new Set());
    groups.get(context)!.add(parsed.key);
  }
  if (groups.size === 0) throw new InvalidPermissionScopeError("At least one permission is required for a native token");
  // The engine can issue a wildcard only while creating a token in that context.
  // Other contexts are added as concrete grants to the same token afterward.
  const wildcardContexts = [...groups].filter(([, keys]) => keys.has("*"));
  if (wildcardContexts.length > 1) throw new InvalidPermissionScopeError("An OAuth request can use all-access permissions in only one context");
  const [primaryContext, primaryPermissions] = wildcardContexts[0] ?? [...groups][0];
  const additional = [...groups].filter(([context]) => context !== primaryContext)
    .flatMap(([context, keys]) => [...keys].map((permission) => ({
      granterAuid: params.userAuid,
      permissionContext: context,
      permission,
    })));
  const result = await sdk.LoginWithToken({
    auid: params.userAuid,
    permissions: [...primaryPermissions],
    permissionContext: primaryContext,
  });
  const bearer = result.loginWithToken.id;
  if (additional.length === 0) return bearer;
  try {
    const tokenId = publicTokenId(bearer);
    if (!tokenId) throw new Error("Engine returned an invalid token ID");
    for (let start = 0; start < additional.length; start += 100) {
      await sdk.ApplyPermissionBatch({
        delegations: additional.slice(start, start + 100).map((grant) => ({ ...grant, granteeTokenId: tokenId })),
        revocations: [],
      });
    }
    return bearer;
  } catch (error) {
    // Revoke any partial token before the OAuth grant can be recorded or returned.
    try { await revokeWithBackend(bearer); }
    catch (revokeError) { console.error("Could not revoke an incomplete OAuth native token:", revokeError); }
    throw error;
  }
}

/** Revokes a native token, which also ends every token delegated from it. */
export async function revokeWithBackend(tokenId: string): Promise<boolean> {
  const result = await getAuthSdk(tokenId).RevokeToken();
  return result.revokeToken;
}

export function oauthError(
  error: string,
  description?: string,
  status = 400,
): Response {
  return Response.json(
    {
      error,
      ...(description ? { error_description: description } : {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}
