import { getAuthSdk } from "@/lib/auth-graphql";

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
 * holding only the permissions the user consented to. It always includes the rate-limit drain
 * permission, so the app's calls are charged to the user's account rather than falling back to
 * the much smaller per-IP budget. Revoking it leaves the user's own session untouched.
 */
export async function issueAuthorizationToken(params: {
  sessionTokenId: string;
  userAuid: string;
  permissions: string[];
}): Promise<string> {
  const sdk = getAuthSdk(params.sessionTokenId);
  const permissions = [
    ...new Set([...params.permissions, rateLimitDrainPermission(params.userAuid)]),
  ];
  const result = await sdk.LoginWithToken({ auid: params.userAuid, permissions });
  return result.loginWithToken.id;
}

export function rateLimitDrainPermission(userAuid: string): string {
  return `identity.${userAuid}.ratelimit.drain`;
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
