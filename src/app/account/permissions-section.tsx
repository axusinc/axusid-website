"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, UsersRound } from "lucide-react";
import { permissionAction } from "@/app/actions/permissions";
import type { PermissionContext, SharedPermission, UserPermission } from "@/lib/permission-types";
import { PermissionIcon } from "@/components/permission-icon";
import { AccountAvatar, PermissionPicker } from "./permission-picker";
import { permissionIdentity } from "@/lib/permission-context";
import { SubsectionTitle } from "./dashboard-ui";
import { UsernameAvatar } from "@/components/username-avatar";
import { IdentityLabel } from "@/components/ui/identity-label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Spinner } from "@/components/ui/spinner";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";

const sharedStates: Record<SharedPermission["state"], string> = {
  shared: "Shared", paused: "Paused", pending: "Awaiting approval", restricted: "Restricted", unverified: "Status unavailable",
};

function SharedPermissionRow({
  grant,
  appContext,
  disabled,
  onRemoved,
  onPendingChange,
}: {
  grant: SharedPermission;
  appContext?: PermissionContext;
  disabled: boolean;
  onRemoved: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const isPaused = grant.state === "paused";
  const hasTitle = Boolean(grant.permission.label && grant.permission.label !== grant.permission.key);
  const title = hasTitle ? grant.permission.label : grant.permission.key;
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <PermissionIcon name={grant.permission.icon} className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-medium text-neutral-900">{title}</p>
              {isPaused ? (
                <Badge tone="warning" dot>
                  Paused
                </Badge>
              ) : null}
            </div>
            {grant.permission.scope ? (
              <div className="mt-1 flex items-center gap-1.5 text-[13px] text-neutral-500">
                <AccountAvatar
                  account={
                    appContext ?? {
                      id: grant.permission.context,
                      label: grant.permission.scope,
                      username: grant.permission.scope.startsWith("@") ? grant.permission.scope.slice(1) : null,
                      avatarUrl: null,
                    }
                  }
                  size="xs"
                  className="h-4 w-4 shrink-0 text-[9px]"
                  shape="rounded"
                />
                <span>{grant.permission.scope}</span>
              </div>
            ) : null}
            {grant.permission.description ? (
              <p className="mt-1 text-[13px] text-neutral-500">{grant.permission.description}</p>
            ) : null}
            {grant.permission.params?.length ? (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                {grant.permission.params.map((param) => (
                  <span key={param.name} className="inline-flex items-center gap-1">
                    <span className="text-neutral-400">{param.label ?? param.name}:</span>
                    <span className="font-medium text-neutral-700">{param.valueLabel ?? param.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
            {isPaused ? (
              grant.permission.available === false ? (
                <p className="mt-1 text-xs text-neutral-500">You no longer have this access</p>
              ) : null
            ) : (
              <p className="mt-1 text-xs text-neutral-500">{sharedStates[grant.state]}</p>
            )}
          </div>
        </div>
        {!confirm ? (
          <Button
            variant="danger-ghost"
            size="sm"
            disabled={disabled}
            aria-label={`Remove ${grant.permission.label || grant.permission.key} from ${grant.username ? `@${grant.username}` : "this account"}`}
            onClick={() => setConfirm(true)}
          >
            Remove
          </Button>
        ) : null}
      </div>
      {confirm ? (
        <div className="mt-3 rounded-xl bg-neutral-50 p-3">
          <p className="text-[13px] text-neutral-700">
            Remove this permission from {grant.username ? `@${grant.username}` : "this account"}? Any access they have through other permissions will remain.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              autoFocus
              size="sm"
              variant="danger"
              loading={pending}
              disabled={disabled}
              onClick={async () => {
                if (submitting.current) return;
                submitting.current = true;
                setPending(true);
                onPendingChange(true);
                setError("");
                try {
                  const result = await permissionAction({ kind: "revoke", grantId: grant.id });
                  if (result.error) setError(result.error);
                  if (result.revoked) onRemoved();
                } catch {
                  setError("Couldn’t remove this permission. Please try again.");
                } finally {
                  setPending(false);
                  onPendingChange(false);
                  submitting.current = false;
                }
              }}
            >
              Remove permission
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setConfirm(false); setError(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <FormError className="mt-3">{error}</FormError> : null}
    </li>
  );
}

function UserPermissionRow({
  permission,
  appContext,
  canShare,
  disabled,
  onShare,
}: {
  permission: UserPermission;
  appContext?: PermissionContext;
  canShare: boolean;
  disabled: boolean;
  onShare: () => void;
}) {
  const isPaused = Boolean(permission.receivedFrom && permission.available === false);
  const hasTitle = Boolean(permission.label && permission.label !== permission.key);
  const title = hasTitle ? permission.label : permission.key;
  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <PermissionIcon name={permission.icon} className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-neutral-900">{title}</p>
          {isPaused ? (
            <Badge tone="warning" dot>
              Paused
            </Badge>
          ) : null}
        </div>
        {permission.scope ? (
          <div className="mt-1 flex items-center gap-1.5 text-[13px] text-neutral-500">
            <AccountAvatar
              account={
                appContext ?? {
                  id: permission.context,
                  label: permission.scope,
                  username: permission.scope.startsWith("@") ? permission.scope.slice(1) : null,
                  avatarUrl: null,
                }
              }
              size="xs"
              className="h-4 w-4 shrink-0 text-[9px]"
              shape="rounded"
            />
            <span>{permission.scope}</span>
          </div>
        ) : null}
        {permission.description ? (
          <p className="mt-1 text-[13px] text-neutral-500">{permission.description}</p>
        ) : null}
        {permission.params?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
            {permission.params.map((param) => (
              <span key={param.name} className="inline-flex items-center gap-1">
                <span className="text-neutral-400">{param.label ?? param.name}:</span>
                <span className="font-medium text-neutral-700">{param.valueLabel ?? param.value}</span>
              </span>
            ))}
          </div>
        ) : null}
        {permission.available !== true ? (
          <p className="mt-1 text-xs text-neutral-500">
            {isPaused
              ? "Access is currently paused"
              : permission.available === false
                ? "Not currently available"
                : "Availability couldn’t be verified"}
          </p>
        ) : null}
      </div>
      {canShare ? (
        <Button size="sm" variant="secondary" disabled={disabled} onClick={onShare}>
          Share
        </Button>
      ) : null}
    </li>
  );
}

export function PermissionsSection({ auid, accounts, onEditingChange }: { auid: string; accounts: AccountItemInfo[]; onEditingChange?: (editing: boolean) => void }) {
  const [contexts, setContexts] = useState<PermissionContext[]>([]);
  const [systemContext, setSystemContext] = useState("");
  const [accountAuid, setAccountAuid] = useState("");
  const [shareOptions, setShareOptions] = useState<UserPermission[]>([]);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [shared, setShared] = useState<SharedPermission[]>([]);
  const [view, setView] = useState<"shared" | "yours">("shared");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [message, setMessage] = useState("");
  const [mutating, setMutating] = useState(false);
  const [reload, setReload] = useState(0);
  const [sharing, setSharing] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const shareButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    permissionAction({ kind: "list" }).then((result) => {
      if (cancelled) return;
      if (!result.error) {
        setPermissions(result.permissions ?? []);
        setContexts(result.contexts ?? []);
        setSystemContext(result.systemContext ?? "");
        setAccountAuid(result.accountAuid ?? "");
        setShareOptions(result.shareOptions ?? []);
        setShared(result.shared ?? []);
      }
      setError(result.error ?? ""); setRecoveryRequired(Boolean(result.recoveryRequired)); setLoading(false);
    }).catch(() => {
      if (!cancelled) { setError("Couldn’t load your permissions. Please try again."); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [reload]);

  function openShare(key = "new") { setSharing(key); setMessage(""); onEditingChange?.(true); }
  function closeShare() {
    setSharing(null); onEditingChange?.(false);
    requestAnimationFrame(() => shareButton.current?.focus());
  }
  function refresh() { setLoading(true); setError(""); setRecoveryRequired(false); setReload((value) => value + 1); }
  const query = filter.toLowerCase();

  const directPermissions = permissions.filter((p) => !p.receivedFrom);
  const receivedPermissions = permissions.filter((p) => !!p.receivedFrom);

  const visibleDirect = directPermissions.filter((permission) =>
    `${permission.label} ${permission.scope}`.toLowerCase().includes(query)
  );
  const isOwnAccountPermission = (permission: UserPermission) =>
    permission.context === systemContext && permission.key.startsWith(`identity.${accountAuid}.`) &&
    permission.key !== `identity.${accountAuid}.*`;
  const accountPermissions = visibleDirect.filter(isOwnAccountPermission);
  const otherDirectPermissions = visibleDirect.filter((permission) => !isOwnAccountPermission(permission));

  const senders = new Map<string, { username: string | null; permissions: UserPermission[] }>();
  for (const permission of receivedPermissions) {
    const sender = permission.receivedFrom!;
    if (!`${sender.username ?? "Account name unavailable"} ${permission.label} ${permission.scope}`.toLowerCase().includes(query)) {
      continue;
    }
    const group = senders.get(sender.id) ?? { username: sender.username, permissions: [] };
    group.permissions.push(permission);
    senders.set(sender.id, group);
  }

  const recipients = new Map<string, SharedPermission[]>();
  for (const grant of shared) {
    if (!`${grant.username ?? "Account name unavailable"} ${grant.permission.label} ${grant.permission.scope}`.toLowerCase().includes(query)) continue;
    const group = recipients.get(grant.recipientId) ?? [];
    group.push(grant); recipients.set(grant.recipientId, group);
  }

  const signedInAccounts: PermissionContext[] = [...accounts].sort((a, b) => Number(b.isActive) - Number(a.isActive)).map((account) => ({
    id: account.auid,
    username: account.username,
    label: account.username ? `@${account.username}` : "Username unavailable",
    avatarUrl: account.avatarUrl,
  }));
  const accountSuggestions = new Map(signedInAccounts.map((account) => [account.id, account]));
  for (const grant of shared) if (grant.username && !accountSuggestions.has(grant.recipientId)) {
    accountSuggestions.set(grant.recipientId, { id: grant.recipientId, username: grant.username, label: `@${grant.username}`, avatarUrl: null });
  }
  for (const permission of receivedPermissions) {
    const sender = permission.receivedFrom;
    if (sender?.username && !accountSuggestions.has(sender.id)) accountSuggestions.set(sender.id, { id: sender.id, username: sender.username, label: `@${sender.username}`, avatarUrl: null });
  }

  const contextLabel = (id: string) => contexts.find((item) => item.id === id)?.label ?? signedInAccounts.find((item) => item.id === id)?.label ?? `Context ${id}`;
  const getAppContext = (contextId: string, fallbackScope?: string | null): PermissionContext => {
    const found = contexts.find((c) => c.id === contextId) ?? signedInAccounts.find((a) => a.id === contextId);
    if (found) {
      if (fallbackScope && !found.label) {
        return { ...found, label: fallbackScope };
      }
      return found;
    }
    const username = fallbackScope?.startsWith("@") ? fallbackScope.slice(1) : null;
    return {
      id: contextId,
      label: fallbackScope || contextLabel(contextId),
      username,
      avatarUrl: null,
    };
  };

  const directPermissionRow = (permission: UserPermission) => (
    <UserPermissionRow
      key={permissionIdentity(permission.key, permission.context)}
      permission={permission}
      appContext={getAppContext(permission.context, permission.scope)}
      canShare={shareOptions.some((option) => permissionIdentity(option.key, option.context) === permissionIdentity(permission.key, permission.context))}
      disabled={sharing !== null || mutating}
      onShare={() => openShare(permissionIdentity(permission.key, permission.context))}
    />
  );

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <SubsectionTitle title="Account access" description="Manage what you share and see the permissions you have." />
        <div className="flex items-center gap-2">
          <Button ref={shareButton} size="sm" disabled={loading || !!error || sharing !== null || mutating} onClick={() => openShare()}><Plus aria-hidden className="h-3.5 w-3.5" />Share access</Button>
          <Button size="sm" variant="ghost" aria-label="Refresh permissions" disabled={loading || sharing !== null || mutating} onClick={refresh}><RefreshCw aria-hidden className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      {sharing !== null ? <PermissionPicker key={sharing} contexts={contexts} signedInAccounts={signedInAccounts} recipientSuggestions={[...accountSuggestions.values()]} systemContext={systemContext} accountAuid={accountAuid} initial={shareOptions.find((option) => permissionIdentity(option.key, option.context) === sharing)} onClose={closeShare} onShared={(grant, alreadyShared) => {
        setShared((items) => [...items.filter((item) => item.id !== grant.id), grant]);
        setView("shared"); setFilter("");
        setMessage(alreadyShared ? "This permission is already shared with this person." : `${grant.permission.label} shared with ${grant.username ? `@${grant.username}` : "the recipient"}.`);
        closeShare();
        if (grant.recipientId === accountAuid) refresh();
      }} /> : null}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06]">
        <div className="flex gap-4" aria-label="Permission views">
          {([['shared', 'Shared with others', shared.length], ['yours', 'Your permissions', permissions.length]] as const).map(([id, label, count]) => <button key={id} type="button" disabled={sharing !== null || mutating} aria-pressed={view === id} onClick={() => { setView(id); setFilter(""); }} className={cn("-mb-px cursor-pointer border-b-2 pb-3 text-[13px] font-medium transition-colors disabled:opacity-50 sm:text-sm", focusRing, view === id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-900")}>
            {label}{!loading && !error ? <span className="ml-1.5 rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">{count}</span> : null}
          </button>)}
        </div>
      </div>
      {message ? <FormSuccess className="mb-5">{message}</FormSuccess> : null}
      {loading ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-neutral-500"><Spinner />Loading permissions…</p> : error ? <div className="space-y-3"><FormError>{error}</FormError>{recoveryRequired ? <a className={buttonVariants({ size: "sm", variant: "secondary" })} href={`/auth/session-recovery?auid=${encodeURIComponent(auid)}`}>Sign in again</a> : <Button size="sm" variant="secondary" onClick={refresh}>Try again</Button>}</div> : <>
        {(view === "shared" ? shared.length : permissions.length) > 6 ? <div className="mb-5"><Input id="find-permission" label={view === "shared" || receivedPermissions.length > 0 ? "Find a person or permission" : "Find a permission"} placeholder={view === "shared" || receivedPermissions.length > 0 ? "Search usernames or permissions…" : "Search permissions…"} value={filter} onChange={(event) => setFilter(event.target.value)} disabled={sharing !== null || mutating} /></div> : null}
        {view === "shared" ? <>
          {!shared.length ? <div className="py-8 text-center"><UsersRound aria-hidden className="mx-auto mb-3 h-6 w-6 text-neutral-400" /><p className="text-sm font-medium text-neutral-900">You haven’t shared any permissions</p><p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">Give someone specific access to your account or app. You can remove it here whenever you need to.</p></div> : <div className="space-y-5">
            {[...recipients.entries()].map(([id, grants]) => <section key={id} className="overflow-hidden rounded-xl border border-black/[0.07]">
              <div className="flex items-center gap-3 border-b border-black/[0.05] bg-neutral-50/70 px-4 py-3"><UsernameAvatar username={grants[0].username} size="sm" /><IdentityLabel username={grants[0].username} fallback="Account name unavailable" /></div>
              <ul className="divide-y divide-black/[0.05] p-4">{grants.map((grant) => <SharedPermissionRow key={grant.id} grant={grant} appContext={getAppContext(grant.permission.context, grant.permission.scope)} disabled={sharing !== null || mutating} onPendingChange={setMutating} onRemoved={() => {
                setShared((items) => items.filter((item) => item.id !== grant.id)); setMessage("Permission removed.");
                if (grant.recipientId === accountAuid) refresh();
                requestAnimationFrame(() => shareButton.current?.focus());
              }} />)}</ul>
            </section>)}
            {!recipients.size ? <p className="py-4 text-sm text-neutral-500">No people or permissions match your search.</p> : null}
          </div>}
          {shared.length > 0 ? <p className="mt-5 text-xs leading-relaxed text-neutral-500">You can remove shared access here at any time. Access delegated from other apps can pause if you lose the permission yourself.</p> : null}
        </> : <>
          <p className="mb-4 text-[13px] text-neutral-500">Permissions assigned to your account. Availability reflects your current access.</p>
          {!permissions.length ? (
            <p className="py-6 text-sm text-neutral-500">No permissions have been assigned to your account yet.</p>
          ) : visibleDirect.length === 0 && senders.size === 0 ? (
            <p className="py-4 text-sm text-neutral-500">{receivedPermissions.length > 0 ? "No people or permissions match your search." : "No permissions match your search."}</p>
          ) : (
            <div className="space-y-6">
              {visibleDirect.length > 0 ? (
                <div className={receivedPermissions.length > 0 ? "space-y-3" : undefined}>
                  {receivedPermissions.length > 0 ? (
                    <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Your account</h3>
                  ) : null}
                  {accountPermissions.length > 0 ? (
                    <details key={query} open={Boolean(query)} className="rounded-xl border border-black/[0.07] px-4 py-3">
                      <summary className={cn("cursor-pointer text-sm font-medium text-neutral-900", focusRing)}>
                        Account management <span className="ml-1 text-xs font-normal text-neutral-500">({accountPermissions.length})</span>
                      </summary>
                      <ul className="mt-3 divide-y divide-black/[0.05]">{accountPermissions.map(directPermissionRow)}</ul>
                    </details>
                  ) : null}
                  {otherDirectPermissions.length > 0 ? (
                    <ul className="divide-y divide-black/[0.05]">{otherDirectPermissions.map(directPermissionRow)}</ul>
                  ) : null}
                </div>
              ) : null}

              {senders.size > 0 ? (
                <div className="space-y-3">
                  {directPermissions.length > 0 ? (
                    <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Received from others</h3>
                  ) : null}
                  <div className="space-y-5">
                    {[...senders.entries()].map(([id, group]) => (
                      <section key={id} className="overflow-hidden rounded-xl border border-black/[0.07]">
                        <div className="flex items-center gap-3 border-b border-black/[0.05] bg-neutral-50/70 px-4 py-3">
                          <UsernameAvatar username={group.username} size="sm" />
                          <IdentityLabel username={group.username} fallback="Account name unavailable" />
                        </div>
                        <ul className="divide-y divide-black/[0.05] p-4">
                          {group.permissions.map((permission) => (
                            <UserPermissionRow
                              key={`${id}-${permissionIdentity(permission.key, permission.context)}`}
                              permission={permission}
                              appContext={getAppContext(permission.context, permission.scope)}
                              canShare={shareOptions.some((option) => permissionIdentity(option.key, option.context) === permissionIdentity(permission.key, permission.context))}
                              disabled={sharing !== null || mutating}
                              onShare={() => openShare(permissionIdentity(permission.key, permission.context))}
                            />
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>}
      </>}
    </Card>
  );
}
