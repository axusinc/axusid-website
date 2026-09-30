import "server-only";
import { getAuthSdk } from "@/lib/auth-graphql";
import { getSystemPermissionContext } from "@/lib/permission-config";
import { parsePermissionScope, validatePermissionScopeCombination } from "@/lib/oauth/scopes";

export async function describeConsentPermissions(tokenId: string, permissions: string[]) {
  const sdk = getAuthSdk(tokenId);
  const systemContext = getSystemPermissionContext();
  validatePermissionScopeCombination(permissions, systemContext);
  const result: { key: string; label: string; description: string; contextLabel: string }[] = [];
  // Bound concurrency; descriptions parse declarations without dynamic validation calls.
  for (let start = 0; start < permissions.length; start += 6) {
    result.push(...await Promise.all(permissions.slice(start, start + 6).map(async (scope) => {
      const { key, contextAuid: requestedContext } = parsePermissionScope(scope);
      const contextAuid = requestedContext ?? systemContext;
      const contextLabel = requestedContext ? `App ${contextAuid} permissions` : "AXUS ID permissions";
      if (key === "*") return { key: scope, label: requestedContext ? `All permissions you hold in app ${contextAuid}` : "All AXUS ID permissions you hold", description: `Lets this app use all your access in the ${requestedContext ? `app ${contextAuid}` : "AXUS ID system"} context.`, contextLabel };
      const { describePermission } = await sdk.DescribePermission({ contextAuid, permission: key });
      return { key: scope, label: describePermission.title, description: describePermission.description ?? "", contextLabel };
    })));
  }
  return result;
}
