"use server";

import { z } from "zod";
import { getAuthSdkForSession } from "@/lib/auth-graphql";
import { getPrimaryDomainError, isRateLimitError, permissionErrorMessage } from "@/lib/graphql-errors";
import { getValidSession } from "@/lib/session-access";
import { getSystemPermissionContext } from "@/lib/permission-config";
import { bindPermission, normalizePermissionContext, permissionIdentity } from "@/lib/permission-context";
import { permissionPresentation } from "@/lib/permission-presentation";
import { avatarImageUrl } from "@/lib/avatar-server";
import type { MyDelegatedGrantsQuery, ParameterOptionsFragment } from "@/graphql/sdk";
import type { PermissionRequest, PermissionResult, SharedPermission, UserPermission, PickerDeclaration } from "@/lib/permission-types";

const auidSchema = z.string().max(1024).regex(/^[0-9]+(?:,[0-9]+)*$/).transform((value) => normalizePermissionContext(value, value));
const usernameSchema = z.string().trim().transform((value) => value.replace(/^@/, "")).pipe(z.string().min(1).max(256));
const keySchema = z.string().min(1).max(4096);
const requestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list") }),
  z.object({ kind: z.literal("share"), username: usernameSchema, permission: keySchema, permissionContext: auidSchema.nullish() }),
  z.object({ kind: z.literal("revoke"), grantId: z.uuid() }),
  z.object({ kind: z.literal("catalog"), permissionContext: auidSchema }),
  z.object({ kind: z.literal("resolve-context"), username: usernameSchema }),
  z.object({ kind: z.literal("resolve-account"), accountId: auidSchema }),
  z.object({ kind: z.literal("preview"), permission: keySchema, permissionContext: auidSchema }),
  z.object({ kind: z.literal("search"), permissionContext: auidSchema, declarationId: z.uuid(), param: z.string().min(1).max(256), query: z.string().max(256) }),
  z.object({ kind: z.literal("search-accounts"), permissionContext: auidSchema, declarationId: z.uuid(), param: z.string().min(1).max(256), query: z.string().max(256) }),
]);

type Grant = MyDelegatedGrantsQuery["delegatedGrants"][number];
type TreeNode = { keyPrefix: string; title?: string | null; declarations?: string[]; params?: ParameterOptionsFragment[]; children?: TreeNode[] };

export async function permissionAction(input: PermissionRequest): Promise<PermissionResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the username and permission values, then try again." };
  const session = await getValidSession();
  if (!session) return { error: "Your session has ended. Sign in again to view your permissions." };
  const sdk = getAuthSdkForSession(session);
  const args = parsed.data;
  const systemContext = getSystemPermissionContext();
  const contextFor = (context?: string | null) => normalizePermissionContext(context, systemContext);
  const usernames = new Map<string, Promise<string | null>>();
  const contextViews = new Map<string, Promise<{ id: string; username: string | null; label: string; avatarUrl: string | null }>>();
  const checks = new Map<string, Promise<UserPermission>>();

  function usernameFor(auid: string) {
    if (!usernames.has(auid)) usernames.set(auid, sdk.Usernames({ auid }).then(({ usernames }) => usernames?.defaultUsername ?? null).catch(() => null));
    return usernames.get(auid)!;
  }
  function contextView(context: string) {
    if (!contextViews.has(context)) contextViews.set(context, (async () => {
      const [resolvedUsername, variation] = await Promise.all([
        usernameFor(context),
        sdk.DefaultVariation({ auid: context }).then((result) => result.defaultVariation).catch(() => null),
      ]);
      const username = resolvedUsername;
      const avatar = variation ? await sdk.Avatar({ variationId: variation.variationId }).then((result) => result.avatar).catch(() => null) : null;
      return { id: context, username, label: username ? `@${username}` : "Username unavailable", avatarUrl: avatar?.objectKey && variation ? avatarImageUrl(variation.variationId, avatar.updatedAt) : null };
    })());
    return contextViews.get(context)!;
  }
  function describe(key: string, permissionContext?: string | null, strict = false): Promise<UserPermission> {
    const context = contextFor(permissionContext);
    const identity = permissionIdentity(key, context);
    if (!checks.has(identity)) checks.set(identity, (async () => {
      const app = await contextView(context);
      let base: UserPermission = { key, context, label: key, description: "Permission details are unavailable.", scope: app.label, available: null };
      try {
        const { describePermission } = await sdk.DescribePermission({ contextAuid: context, permission: key });
        base = { ...base, label: describePermission.title, description: describePermission.description ?? "", icon: describePermission.icon, params: describePermission.params };
      } catch (error) {
        if (strict) throw error;
        const code = getPrimaryDomainError(error)?.code;
        if (code === "TOKEN_INVALID" || code === "TOKEN_REQUIRED" || isRateLimitError(error)) throw error;
        if (code === "UNDECLARED_PERMISSION" || code === "INVALID_PERMISSION_BINDINGS" || code === "PERMISSION_INVARIANT_VIOLATED") {
          // Engine account-root authority is exposed as identity.<auid>.* for display,
          // but is not a declared permission that can be checked or delegated.
          const root = context === systemContext && key === `identity.${session!.auid}.*`;
          return { ...base, label: root ? "Account authority" : key, description: root ? "Built-in authority for your account. Choose a declared permission to share specific access." : "This permission is no longer declared or its values are invalid.", available: root ? null : false };
        }
      }
      try {
        const { checkPermission } = await sdk.EffectivePermission({ auid: session!.auid, permission: key, permissionContext: context });
        base.available = checkPermission.allowed;
      } catch (error) {
        const code = getPrimaryDomainError(error)?.code;
        if (code === "TOKEN_INVALID" || code === "TOKEN_REQUIRED" || isRateLimitError(error)) throw error;
        if (code === "UNDECLARED_PERMISSION" || code === "INVALID_PERMISSION_BINDINGS" || code === "PERMISSION_INVARIANT_VIOLATED") base.available = false;
      }
      return base;
    })());
    return checks.get(identity)!;
  }
  async function sharedView(grant: Grant): Promise<SharedPermission> {
    const permission = await describe(grant.permission, grant.permissionContext);
    return { id: grant.id, recipientId: grant.granteeAuid, username: await usernameFor(grant.granteeAuid), permission,
      state: grant.effect === "DENY" || grant.isShadow ? "restricted" : grant.activationState === "REQUIRES_APPROVAL" ? "pending"
        : grant.activationState === "INACTIVE" || permission.available === false ? "paused" : permission.available === null ? "unverified" : "shared" };
  }

  try {
    if (args.kind === "resolve-context") {
      const { ownerByUsername } = await sdk.OwnerByUsername({ username: args.username });
      if (!ownerByUsername) return { error: "We couldn’t find that username." };
      const context = await contextView(ownerByUsername);
      return { context: context.username ? context : { ...context, username: args.username, label: `@${args.username}` } };
    }
    if (args.kind === "resolve-account") {
      return { context: await contextView(args.accountId) };
    }
    if (args.kind === "catalog") {
      const [summaries, tree] = await Promise.all([
        sdk.PermissionDeclarations({ contextAuid: args.permissionContext }), sdk.PermissionTree({ contextAuid: args.permissionContext }),
      ]);
      const locations = new Map<string, { group: string; params: ParameterOptionsFragment[] }>();
      function visit(node: TreeNode, group: string) {
        if (!node.declarations) throw new Error("Permission tree exceeds supported depth");
        for (const id of node.declarations) locations.set(id, { group, params: node.params ?? [] });
        for (const child of node.children ?? []) visit(child, group);
      }
      for (const node of tree.permissionTree) visit(node, node.title ?? node.keyPrefix);
      const declarations: PickerDeclaration[] = summaries.permissionDeclarations.map((declaration) => ({
        ...declaration, ...(locations.get(declaration.id) ?? { group: "Permissions", params: [] }),
      }));
      return { declarations };
    }
    if (args.kind === "search") {
      const { searchPermissionValues } = await sdk.SearchPermissionValues({ contextAuid: args.permissionContext, declarationId: args.declarationId, param: args.param, query: args.query, limit: 20 });
      return { options: searchPermissionValues };
    }
    if (args.kind === "search-accounts") {
      const { searchPermissionValues } = await sdk.SearchPermissionValues({ contextAuid: args.permissionContext, declarationId: args.declarationId, param: args.param, query: args.query, limit: 20 });
      const ids = [...new Set(searchPermissionValues.values.map((item) => item.value).filter((value) => /^[0-9]+(?:,[0-9]+)*$/.test(value)))];
      return { accountSuggestions: await Promise.all(ids.map(contextView)) };
    }
    if (args.kind === "preview") {
      // Unlike list enrichment, preview must reject undeclared keys and invalid bindings.
      return { preview: await describe(args.permission, args.permissionContext, true) };
    }
    if (args.kind === "revoke") {
      const { delegatedGrants } = await sdk.MyDelegatedGrants({ auid: session.auid });
      if (!delegatedGrants.some((grant) => grant.id === args.grantId)) return { error: "This permission is no longer shared by your account. Refresh the list." };
      const { revokeGrant } = await sdk.RemoveSharedPermission({ grantId: args.grantId });
      return revokeGrant ? { revoked: true } : { error: "Couldn’t remove this permission. Please try again." };
    }
    if (args.kind === "share") {
      if (args.permission === "*") return { error: "Choose a declared permission to share. All-access token scopes cannot be shared as grants." };
      const context = contextFor(args.permissionContext);
      const { ownerByUsername: recipient } = await sdk.OwnerByUsername({ username: args.username });
      if (!recipient) return { error: "We couldn’t find that username. Check the spelling and try again." };
      if (recipient === session.auid) return { error: "You already have this access. Enter someone else’s username." };
      const { delegatedGrants } = await sdk.MyDelegatedGrants({ auid: session.auid });
      const existing = delegatedGrants.find((grant) => grant.granteeAuid === recipient && grant.permission === args.permission && contextFor(grant.permissionContext) === context && grant.effect === "ALLOW" && !grant.isShadow && grant.activationState === "ACTIVE");
      if (existing) return { sharedGrant: await sharedView(existing), alreadyShared: true };
      const { delegatePermission } = await sdk.SharePermission({ granterAuid: session.auid, granteeAuid: recipient, permission: args.permission, permissionContext: context });
      let view: SharedPermission;
      try { view = await sharedView(delegatePermission); }
      catch {
        const app = await contextView(context);
        view = { id: delegatePermission.id, recipientId: recipient, username: args.username, permission: { key: args.permission, context, label: args.permission, description: "", scope: app.label, available: null }, state: "unverified" };
      }
      return { sharedGrant: view };
    }

    const [incoming, outgoing, system] = await Promise.all([
      sdk.MyGrants({ auid: session.auid }), sdk.MyDelegatedGrants({ auid: session.auid }), sdk.PermissionDeclarations({ contextAuid: systemContext }),
    ]);
    const choices = new Map<string, { key: string; context: string }>();
    for (const grant of incoming.grants) {
      if (grant.permission !== "*") choices.set(permissionIdentity(grant.permission, contextFor(grant.permissionContext)), { key: grant.permission, context: contextFor(grant.permissionContext) });
    }
    const targets = new Set([session.auid]);
    for (const grant of incoming.grants) {
      if (contextFor(grant.permissionContext) === systemContext) {
        const target = permissionPresentation(grant.permission).target;
        if (target && /^[0-9]+(?:,[0-9]+)*$/.test(target)) targets.add(target);
      }
    }
    // Expand only actual engine declarations, including all system capabilities.
    for (const declaration of system.permissionDeclarations) for (const target of targets) {
      const key = bindPermission(declaration.template, { auid: target, context: target });
      if (key) choices.set(permissionIdentity(key, systemContext), { key, context: systemContext });
    }
    const shareOptions: UserPermission[] = [];
    const candidates = [...choices.values()];
    for (let start = 0; start < candidates.length; start += 6) {
      const batch = await Promise.all(candidates.slice(start, start + 6).map(({ key, context }) => describe(key, context)));
      shareOptions.push(...batch.filter((permission) => permission.available === true && permission.key !== "*"));
    }
    const permissions: UserPermission[] = [];
    const seen = new Set<string>();
    for (const grant of incoming.grants) {
      const context = contextFor(grant.permissionContext);
      const granterId = grant.origin?.delegatorAuid ?? null;
      const identity = JSON.stringify([context, grant.permission, granterId]);
      if (seen.has(identity)) continue;
      seen.add(identity);
      const base = await describe(grant.permission, context);
      permissions.push({ ...base, receivedFrom: granterId && granterId !== session.auid ? { id: granterId, username: await usernameFor(granterId) } : null });
    }
    const shared: SharedPermission[] = [];
    for (let start = 0; start < outgoing.delegatedGrants.length; start += 6) shared.push(...await Promise.all(outgoing.delegatedGrants.slice(start, start + 6).map(sharedView)));
    const contexts = [...new Set([systemContext, session.auid, ...incoming.grants.map((grant) => contextFor(grant.permissionContext)), ...outgoing.delegatedGrants.map((grant) => contextFor(grant.permissionContext))])];
    return { systemContext, accountAuid: session.auid, contexts: await Promise.all(contexts.map(contextView)), permissions: permissions.sort((a, b) => Number(b.available) - Number(a.available) || a.label.localeCompare(b.label)), shareOptions,
      shared: shared.sort((a, b) => (a.username ?? "").localeCompare(b.username ?? "") || a.permission.label.localeCompare(b.permission.label)) };
  } catch (error) {
    if (args.kind === "list" && getPrimaryDomainError(error)?.code === "NOT_AUTHORIZED") {
      return {
        error: "This sign-in can’t read your account permissions. Sign in again to refresh access. If the problem continues, contact support.",
        recoveryRequired: true,
      };
    }
    return { error: permissionErrorMessage(error) };
  }
}
