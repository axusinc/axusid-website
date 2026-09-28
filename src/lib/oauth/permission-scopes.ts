import "server-only";
import { getAuthSdk } from "@/lib/auth-graphql";
import { getSystemPermissionContext } from "@/lib/permission-config";

export async function describeConsentPermissions(tokenId: string, permissions: string[]) {
  const sdk = getAuthSdk(tokenId);
  const contextAuid = getSystemPermissionContext();
  const result: { key: string; label: string; description: string }[] = [];
  // Bound concurrency; descriptions parse declarations without dynamic validation calls.
  for (let start = 0; start < permissions.length; start += 6) {
    result.push(...await Promise.all(permissions.slice(start, start + 6).map(async (key) => {
      if (key === "*") return { key, label: "All AXUS ID permissions you hold", description: "Lets this app use all your access in AXUS ID’s system context, including managing accounts and sharing permissions." };
      const { describePermission } = await sdk.DescribePermission({ contextAuid, permission: key });
      return { key, label: describePermission.title, description: describePermission.description ?? "" };
    })));
  }
  return result;
}
