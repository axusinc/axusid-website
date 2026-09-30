import "server-only";
import { getAuthSdk } from "@/lib/auth-graphql";
import { getSystemPermissionContext } from "@/lib/permission-config";
import { isOidcScope, parsePermissionScope } from "@/lib/oauth/scopes";
import type { AvailableScope, RequestedScope } from "@/lib/oauth/requested-scopes";

/** Errors are propagated: a failed check must never be treated as an absent permission. */
export async function resolveScopeAvailability(tokenId: string, userAuid: string, requested: RequestedScope[]): Promise<AvailableScope[]> {
  const sdk = getAuthSdk(tokenId);
  const result: AvailableScope[] = [];
  for (let start = 0; start < requested.length; start += 6) {
    result.push(...await Promise.all(requested.slice(start, start + 6).map(async (request) => {
      if (isOidcScope(request.scope)) return { ...request, available: true };
      const { key, contextAuid } = parsePermissionScope(request.scope);
      // * asks for a snapshot of whatever access the user holds, including an empty set.
      if (key === "*") return { ...request, available: true };
      const { checkPermission } = await sdk.EffectivePermission({
        auid: userAuid, permission: key,
        permissionContext: contextAuid ?? getSystemPermissionContext(),
      });
      return { ...request, available: checkPermission.allowed };
    })));
  }
  return result;
}
