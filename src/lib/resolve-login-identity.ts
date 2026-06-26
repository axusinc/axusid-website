import "server-only";

import { getAuthSdk } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";

export async function resolveLoginAuid(username: string): Promise<string> {
  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error("Username is required.");
  }

  const sdk = getAuthSdk();
  let result;
  try {
    result = await sdk.OwnerByUsername({ username: trimmed });
  } catch (error) {
    throw new Error(formatGraphqlError(error, "login", "Unknown username."));
  }

  const auid = result.ownerByUsername;

  if (!auid) {
    throw new Error("Unknown username.");
  }

  return auid;
}
