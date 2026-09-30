"use server";

import { z } from "zod";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { formatGraphqlError } from "@/lib/graphql-errors";
import { getValidSession, removeAccountFromSession } from "@/lib/session-access";
import { listGrantsForUser, revokeGrant, revokeGrantsForSessionHash } from "@/lib/oauth/grants";
import { forgetLoginTokenId, getLoginTokenHash, listLoginTokenIds, trackLoginToken } from "@/lib/login-tokens";
import { publicTokenId } from "@/lib/native-token-id";
import type { UserDisplayInfo } from "@/lib/user-profile";
import type { AccountTokensQuery } from "@/graphql/sdk";

export type AccountToken = AccountTokensQuery["accountTokens"][number] & {
  application: (UserDisplayInfo & { auid: string }) | null;
  session: boolean;
};

export type TokenApplication = UserDisplayInfo & { auid: string };

export type TokenRequest =
  | { kind: "list" }
  | { kind: "create"; title: string; icon: string; permissions: string[]; permissionContext: string }
  | { kind: "update"; tokenId: string; title: string; icon: string }
  | { kind: "change-permissions"; tokenId: string; permissions: { key: string; context: string }[] }
  | { kind: "revoke"; tokenId: string };

export type TokenResult = {
  tokens?: AccountToken[];
  sessionApplication?: TokenApplication | null;
  bearer?: string;
  updated?: { tokenId: string; title: string | null; icon: string | null };
  permissionsChanged?: boolean;
  revoked?: boolean;
  error?: string;
};

const tokenId = z.string().min(1).max(255);
const title = z.string().trim().min(1).max(100);
const icon = z.enum(["key", "laptop", "smartphone", "server", "terminal", "bot"]);
const request = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }),
  z.object({ kind: z.literal("create"), title, icon, permissions: z.array(z.string().min(1).max(4096)).min(1).max(100), permissionContext: z.string().regex(/^\d+(?:,\d+)*$/) }),
  z.object({ kind: z.literal("update"), tokenId, title, icon }),
  z.object({ kind: z.literal("change-permissions"), tokenId, permissions: z.array(z.object({ key: z.string().min(1).max(4096), context: z.string().regex(/^\d+(?:,\d+)*$/) })).min(1).max(100).refine((items) => new Set(items.map((item) => JSON.stringify([item.context, item.key]))).size === items.length) }),
  z.object({ kind: z.literal("revoke"), tokenId }),
]);

export async function tokenAction(input: TokenRequest): Promise<TokenResult> {
  const parsed = request.safeParse(input);
  if (!parsed.success) return { error: "Check the token details and try again." };
  const session = await getValidSession();
  if (!session) return { error: "Your session has ended. Sign in again." };
  const sdk = getAuthSdkForSession(session);
  const args = parsed.data;
  try {
    if (args.kind === "list") {
      const [{ accountTokens }, grants, loginTokenIds] = await Promise.all([
        sdk.AccountTokens({ auid: session.auid }),
        listGrantsForUser(session.auid),
        listLoginTokenIds(session.auid),
      ]);
      // Backfill an already-signed-in browser only after the engine confirms its token.
      if (accountTokens.some((token) => token.current && token.tokenId === publicTokenId(session.tokenId))) {
        await trackLoginToken(session.auid, session.tokenId);
      }
      const sessions = new Set(loginTokenIds);
      const grantTokenIds = new Set(
        grants
          .map((grant) => (grant.tokenId ? publicTokenId(grant.tokenId) : null))
          .filter((id): id is string => Boolean(id)),
      );

      // Exclude browser sessions (including current session) and tokens minted for OAuth2 grants.
      // Leave only personal native tokens created directly by the user.
      const tokens = accountTokens
        .filter((token) => !token.current && !sessions.has(token.tokenId) && !grantTokenIds.has(token.tokenId))
        .map((token) => ({
          ...token,
          application: null,
          session: false,
        }));

      return { tokens, sessionApplication: null };
    }
    if (args.kind === "create") {
      const { loginWithToken } = await sdk.LoginWithToken({
        auid: session.auid,
        permissions: args.permissions,
        permissionContext: args.permissionContext,
        title: args.title,
        icon: args.icon,
      });
      return { bearer: loginWithToken.id };
    }
    if (args.kind === "update" || args.kind === "change-permissions") {
      const grants = await listGrantsForUser(session.auid);
      if (grants.some((grant) => grant.tokenId && publicTokenId(grant.tokenId) === args.tokenId)) {
        return { error: "Application token details are managed by the application profile." };
      }
      if (publicTokenId(session.tokenId) === args.tokenId || await getLoginTokenHash(session.auid, args.tokenId)) {
        return { error: "Browser session details are managed by AXUS ID." };
      }
      if (args.kind === "change-permissions") {
        const { accountTokens } = await sdk.AccountTokens({ auid: session.auid });
        const target = accountTokens.find((token) => token.tokenId === args.tokenId && !token.current);
        if (!target) return { error: "This token is no longer available. Refresh the list." };
        const desired = new Set(args.permissions.map(({ key, context }) => JSON.stringify([context, key])));
        const current = new Set(target.permissions.map((grant) => JSON.stringify([grant.context, grant.key])));
        if (args.permissions.some(({ key, context }) => key === "*" && !current.has(JSON.stringify([context, key])))) {
          return { error: "All-access permissions can’t be added to an existing token. Create a new token for all access." };
        }
        const delegations = args.permissions.filter(({ key, context }) => !current.has(JSON.stringify([context, key])))
          .map(({ key, context }) => ({ granterAuid: session.auid, granteeTokenId: args.tokenId, permission: key, permissionContext: context }));
        const kept = new Set<string>();
        const revocations = target.permissions.flatMap((grant) => {
          const identity = JSON.stringify([grant.context, grant.key]);
          if (desired.has(identity) && !kept.has(identity)) { kept.add(identity); return []; }
          return [{ grantId: grant.grantId, granterAuid: session.auid }];
        });
        if (delegations.length + revocations.length > 100) {
          return { error: "This edit changes more than 100 grants. Save a smaller set of changes first." };
        }
        if (delegations.length || revocations.length) {
          await sdk.ApplyPermissionBatch({ delegations, revocations });
        }
        return { permissionsChanged: true };
      }
      const { changeAccountTokenPresentation } = await sdk.ChangeAccountTokenPresentation({
        auid: session.auid,
        tokenId: args.tokenId,
        title: args.title,
        icon: args.icon,
      });
      return { updated: changeAccountTokenPresentation };
    }
    const grant = (await listGrantsForUser(session.auid)).find((item) => item.tokenId && publicTokenId(item.tokenId) === args.tokenId);
    if (grant) {
      await revokeGrant(grant.id, "user");
      return { revoked: true };
    }
    if (publicTokenId(session.tokenId) === args.tokenId) {
      await removeAccountFromSession(session.auid);
      return { revoked: true };
    }
    const loginTokenHash = await getLoginTokenHash(session.auid, args.tokenId);
    if (loginTokenHash) await revokeGrantsForSessionHash(session.auid, loginTokenHash);
    const { revokeAccountToken } = await sdk.RevokeAccountToken({ auid: session.auid, tokenId: args.tokenId });
    if (revokeAccountToken) {
      try { await forgetLoginTokenId(session.auid, args.tokenId); } catch (error) {
        console.error("Could not forget a revoked login token:", error);
      }
    }
    return { revoked: revokeAccountToken };
  } catch (error) {
    return { error: formatGraphqlError(error, "account", "Couldn’t manage tokens. Please try again.") };
  }
}
