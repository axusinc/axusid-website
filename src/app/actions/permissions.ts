"use server";

import { ClientError } from "graphql-request";
import { z } from "zod";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { isRateLimitError, RATE_LIMIT_MESSAGE } from "@/lib/graphql-errors";
import { getValidSession } from "@/lib/session-access";
import { permissionPresentation, specificPermissionChoices } from "@/lib/permission-presentation";
import type { MyDelegatedGrantsQuery } from "@/graphql/sdk";
import type { PermissionRequest, PermissionResult, SharedPermission, UserPermission } from "@/lib/permission-types";

const requestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }),
  z.object({
    kind: z.literal("share"),
    username: z.string().trim().transform((value) => value.replace(/^@/, "")).pipe(z.string().min(1).max(256)),
    // Nested AUIDs contain commas; they are never entered or displayed by the user.
    permission: z.string().min(1).max(1024).regex(/^[a-zA-Z0-9_*,]+(?:\.[a-zA-Z0-9_*,]+)*$/),
  }),
  z.object({ kind: z.literal("revoke"), grantId: z.uuid() }),
]);

type Grant = MyDelegatedGrantsQuery["delegatedGrants"][number];

export async function permissionAction(input: PermissionRequest): Promise<PermissionResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the username and permission, then try again." };
  const session = await getValidSession();
  if (!session) return { error: "Your session has ended. Sign in again to view your permissions." };
  const sdk = getAuthSdkForSession(session);
  const args = parsed.data;
  const usernames = new Map<string, Promise<string | null>>();
  const checks = new Map<string, Promise<UserPermission>>();

  function usernameFor(auid: string) {
    if (!usernames.has(auid)) {
      usernames.set(auid, sdk.Usernames({ auid })
        .then(({ usernames }) => usernames?.defaultUsername ?? null)
        .catch(() => null));
    }
    return usernames.get(auid)!;
  }

  function describe(key: string): Promise<UserPermission> {
    if (!checks.has(key)) {
      checks.set(key, (async () => {
        const { target, label, description } = permissionPresentation(key);
        const username = target && target !== "*" && target !== session!.auid ? await usernameFor(target) : null;
        const scope = target === "*" ? "All covered accounts" : target === session!.auid ? "Your account" : username ? `@${username}` : target ? "Another account" : "Account access";
        let available: boolean | null = null;
        try {
          const { checkPermission } = await sdk.EffectivePermission({ auid: session!.auid, permission: key });
          available = checkPermission.allowed;
        } catch (error) {
          if (error instanceof ClientError && error.response.errors?.some((item) => item.extensions?.code === "TOKEN_INVALID")) throw error;
          if (isRateLimitError(error)) throw error;
        }
        return { key, label, scope, description, available };
      })());
    }
    return checks.get(key)!;
  }

  async function sharedView(grant: Grant): Promise<SharedPermission> {
    const permission = await describe(grant.permission);
    return {
      id: grant.id,
      recipientId: grant.granteeAuid,
      username: await usernameFor(grant.granteeAuid),
      permission,
      state: grant.effect === "DENY" || grant.isShadow ? "restricted"
        : grant.activationState === "REQUIRES_APPROVAL" ? "pending"
        : grant.activationState === "INACTIVE" || permission.available === false ? "paused"
        : permission.available === null ? "unverified" : "shared",
    };
  }

  try {
    if (args.kind === "revoke") {
      // Scope this account UI to the signed-in granter even if its token manages other accounts.
      const { delegatedGrants } = await sdk.MyDelegatedGrants({ auid: session.auid });
      if (!delegatedGrants.some((grant) => grant.id === args.grantId)) {
        return { error: "This permission is no longer shared by your account. Refresh the list." };
      }
      const { revokeGrant } = await sdk.RemoveSharedPermission({ grantId: args.grantId });
      return revokeGrant ? { revoked: true } : { error: "Couldn’t remove this permission. Please try again." };
    }
    if (args.kind === "share") {
      const { ownerByUsername: recipient } = await sdk.OwnerByUsername({ username: args.username });
      if (!recipient) return { error: "We couldn’t find that username. Check the spelling and try again." };
      if (recipient === session.auid) return { error: "You already have this access. Enter someone else’s username." };
      const { delegatedGrants } = await sdk.MyDelegatedGrants({ auid: session.auid });
      const existing = delegatedGrants.find((grant) => grant.granteeAuid === recipient && grant.permission === args.permission && grant.effect === "ALLOW" && !grant.isShadow && grant.activationState === "ACTIVE");
      if (existing) return { sharedGrant: await sharedView(existing), alreadyShared: true };
      const { delegatePermission } = await sdk.SharePermission({ granterAuid: session.auid, granteeAuid: recipient, permission: args.permission });
      // The mutation succeeded. Enrichment failures must not make users retry a completed share.
      let view: SharedPermission;
      try { view = await sharedView(delegatePermission); }
      catch {
        const { label, description, target } = permissionPresentation(args.permission);
        view = { id: delegatePermission.id, recipientId: recipient, username: args.username,
          permission: { key: args.permission, label, description, scope: target === session.auid ? "Your account" : "Account access", available: null }, state: "unverified" };
      }
      return { sharedGrant: view };
    }

    const [incoming, outgoing] = await Promise.all([
      sdk.MyGrants({ auid: session.auid }),
      sdk.MyDelegatedGrants({ auid: session.auid }),
    ]);
    const assignedKeys = new Set(incoming.grants.map((grant) => grant.permission));
    const choices = new Set(specificPermissionChoices(session.auid, [...assignedKeys]));
    const keys = [...new Set([...assignedKeys, ...choices, ...outgoing.delegatedGrants.map((grant) => grant.permission)])];
    for (let start = 0; start < keys.length; start += 6) {
      await Promise.all(keys.slice(start, start + 6).map(describe));
    }
    const permissions: UserPermission[] = [];
    const seen = new Set<string>();
    for (const grant of incoming.grants) {
      const { target } = permissionPresentation(grant.permission);
      const granterId = (grant.origin?.delegatorAuid && grant.origin.delegatorAuid !== session.auid)
        ? grant.origin.delegatorAuid
        : (grant.origin?.type === "DELEGATED" && grant.origin?.delegatorAuid)
          ? grant.origin.delegatorAuid
          : (target && target !== "*" && target !== session.auid)
            ? target
            : null;
      const dedupKey = `${grant.permission}:${granterId ?? ""}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const base = await describe(grant.permission);
      const receivedFrom = granterId ? {
        id: granterId,
        username: await usernameFor(granterId),
      } : null;

      permissions.push({
        ...base,
        receivedFrom,
      });
    }
    const shareOptions: UserPermission[] = [];
    for (const key of choices) {
      const base = await describe(key);
      if (base.available === true) {
        shareOptions.push(base);
      }
    }
    const shared: SharedPermission[] = [];
    for (let start = 0; start < outgoing.delegatedGrants.length; start += 6) {
      shared.push(...await Promise.all(outgoing.delegatedGrants.slice(start, start + 6).map(sharedView)));
    }
    permissions.sort((a, b) => Number(b.available) - Number(a.available) || a.label.localeCompare(b.label));
    return {
      permissions,
      shareOptions,
      shared: shared.sort((a, b) => (a.username ?? "").localeCompare(b.username ?? "") || a.permission.label.localeCompare(b.permission.label)),
    };
  } catch (error) {
    if (isRateLimitError(error)) {
      return { error: RATE_LIMIT_MESSAGE };
    }
    const code = error instanceof ClientError ? error.response.errors?.[0]?.extensions?.code : undefined;
    const messages: Record<string, string> = {
      TOKEN_REQUIRED: "Sign in again to view your permissions.",
      TOKEN_INVALID: "Your session has ended. Sign in again.",
      NOT_AUTHORIZED: args.kind === "share" ? "You can’t share this permission right now. Your access may have changed, or sharing may be restricted."
        : args.kind === "revoke" ? "You don’t have permission to remove this access."
        : "Your permissions aren’t available with this sign-in. Try signing in again.",
      USERNAME_NOT_FOUND: "We couldn’t find that username. Check the spelling and try again.",
      INVALID_USERNAME: "Enter a valid username.",
      GRANT_NOT_FOUND: "This permission has already been removed. Refresh the list.",
      GRANT_NOT_REVOCABLE: "This permission can’t be removed here.",
      RATE_LIMITED: RATE_LIMIT_MESSAGE,
    };
    return { error: messages[String(code)] ?? "Couldn’t complete the request. Please try again." };
  }
}
