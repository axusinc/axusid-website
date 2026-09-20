import { getAuthSdk } from "@/lib/auth-graphql";

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
