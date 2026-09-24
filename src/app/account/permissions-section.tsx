"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, KeyRound, Plus, RefreshCw, UsersRound } from "lucide-react";
import { permissionAction } from "@/app/actions/permissions";
import type { SharedPermission, UserPermission } from "@/lib/permission-types";
import { SubsectionTitle } from "./dashboard-ui";
import { UsernameAvatar } from "@/components/username-avatar";
import { IdentityLabel } from "@/components/ui/identity-label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Field, controlClassName } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Spinner } from "@/components/ui/spinner";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

function SharePermission({ options, initialKey, onClose, onShared }: {
  options: UserPermission[];
  initialKey?: string;
  onClose: () => void;
  onShared: (grant: SharedPermission, alreadyShared: boolean) => void;
}) {
  const [selectedKey, setSelectedKey] = useState(initialKey ?? options[0]?.key ?? "");
  const permission = options.find((option) => option.key === selectedKey);
  const [review, setReview] = useState(false);
  const [username, setUsername] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const reviewRef = useRef<HTMLHeadingElement>(null);

  return (
    <form className="mb-6 space-y-4 rounded-xl border border-black/[0.07] bg-neutral-50 p-4 sm:p-5" onSubmit={async (event) => {
      event.preventDefault();
      if (submitting.current || !permission) return;
      if (!username.trim().replace(/^@/, "")) { setError("Enter a username to continue."); return; }
      if (!review) {
        setError(""); setReview(true);
        requestAnimationFrame(() => reviewRef.current?.focus());
        return;
      }
      submitting.current = true;
      setPending(true); setError("");
      try {
        const result = await permissionAction({ kind: "share", username, permission: permission.key });
        if (result.error) setError(result.error);
        if (result.sharedGrant) onShared(result.sharedGrant, !!result.alreadyShared);
      } catch { setError("Couldn’t share this permission. Please try again."); }
      finally { setPending(false); submitting.current = false; }
    }}>
      <h3 ref={reviewRef} tabIndex={-1} className="text-sm font-semibold text-neutral-950 outline-none">{review ? "Review access" : "Share access"}</h3>
      {review ? (
        <div className="rounded-xl border border-black/[0.05] bg-white p-4">
          <div className="flex items-center gap-3"><UsernameAvatar username={username} size="sm" /><p className="break-all text-sm font-medium">@{username.trim().replace(/^@/, "")}</p></div>
          <p className="mt-4 text-sm font-medium">{permission?.label}</p>
          <p className="mt-1 text-[13px] text-neutral-500">{permission?.scope}</p>
          <p className="mt-2 text-sm text-neutral-600">{permission?.description}</p>
        </div>
      ) : (
        <>
          <Input id="share-username" label="Who do you want to share with?" placeholder="@username" hint="Their AXUS ID username." value={username}
            onChange={(event) => { setUsername(event.target.value); setError(""); }} autoFocus autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={256} />
          <Field id="share-access" label="What can they do?" hint={permission?.description}>
            <select id="share-access" aria-describedby="share-access-hint" className={`${controlClassName} h-11 px-3`} value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} required>
              {options.map((option) => <option key={option.key} value={option.key}>{option.label} — {option.scope}</option>)}
            </select>
          </Field>
        </>
      )}
      {permission?.key.endsWith(".grants.delegate") ? <p className="text-[13px] leading-relaxed text-amber-800">This lets them share permissions on your behalf. Only give this access to someone you trust.</p> : null}
      {review ? <p className="text-[13px] leading-relaxed text-neutral-500">You can remove this permission anytime. Signing out won’t remove it; access pauses if you lose the permission yourself.</p> : null}
      {error ? <FormError>{error}</FormError> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" loading={pending}>{pending ? "Sharing…" : review ? "Confirm and share" : "Review access"}{!review ? <ArrowRight aria-hidden className="h-3.5 w-3.5" /> : null}</Button>
        {review ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setReview(false); setError(""); }}>Back</Button> : null}
        <Button size="sm" variant="ghost" disabled={pending} onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

const sharedStates: Record<SharedPermission["state"], string> = {
  shared: "Shared", paused: "Paused", pending: "Awaiting approval", restricted: "Restricted", unverified: "Status unavailable",
};

function SharedPermissionRow({ grant, disabled, onRemoved, onPendingChange }: { grant: SharedPermission; disabled: boolean; onRemoved: () => void; onPendingChange: (pending: boolean) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const isPaused = grant.state === "paused";
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-medium text-neutral-900">{grant.permission.label}</p>
            {isPaused ? (
              <Badge tone="warning" dot>
                Paused
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13px] text-neutral-500">{grant.permission.scope}</p>
          {isPaused ? (
            grant.permission.available === false ? (
              <p className="mt-1 text-xs text-neutral-500">You no longer have this access</p>
            ) : null
          ) : (
            <p className="mt-1 text-xs text-neutral-500">{sharedStates[grant.state]}</p>
          )}
        </div>
        {!confirm ? <Button variant="danger-ghost" size="sm" disabled={disabled} aria-label={`Remove ${grant.permission.label} from ${grant.username ? `@${grant.username}` : "this account"}`} onClick={() => setConfirm(true)}>Remove</Button> : null}
      </div>
      {confirm ? <div className="mt-3 rounded-xl bg-neutral-50 p-3">
        <p className="text-[13px] text-neutral-700">Remove this permission from {grant.username ? `@${grant.username}` : "this account"}? Any access they have through other permissions will remain.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button autoFocus size="sm" variant="danger" loading={pending} disabled={disabled} onClick={async () => {
            if (submitting.current) return;
            submitting.current = true; setPending(true); onPendingChange(true); setError("");
            try {
              const result = await permissionAction({ kind: "revoke", grantId: grant.id });
              if (result.error) setError(result.error);
              if (result.revoked) onRemoved();
            } catch { setError("Couldn’t remove this permission. Please try again."); }
            finally { setPending(false); onPendingChange(false); submitting.current = false; }
          }}>Remove permission</Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setConfirm(false); setError(""); }}>Cancel</Button>
        </div>
      </div> : null}
      {error ? <FormError className="mt-3">{error}</FormError> : null}
    </li>
  );
}

function UserPermissionRow({ permission, canShare, disabled, onShare }: { permission: UserPermission; canShare: boolean; disabled: boolean; onShare: () => void }) {
  const isPaused = Boolean(permission.receivedFrom && permission.available === false);
  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <KeyRound aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-neutral-900">{permission.label}</p>
          {isPaused ? (
            <Badge tone="warning" dot>
              Paused
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-[13px] text-neutral-500">{permission.scope}</p>
        <p className="mt-1 text-[13px] text-neutral-500">{permission.description}</p>
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
      {canShare ? <Button size="sm" variant="secondary" disabled={disabled} onClick={onShare}>Share</Button> : null}
    </li>
  );
}

export function PermissionsSection({ onEditingChange }: { onEditingChange?: (editing: boolean) => void }) {
  const [shareOptions, setShareOptions] = useState<UserPermission[]>([]);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [shared, setShared] = useState<SharedPermission[]>([]);
  const [view, setView] = useState<"shared" | "yours">("shared");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        setShareOptions(result.shareOptions ?? []);
        setShared(result.shared ?? []);
      }
      setError(result.error ?? ""); setLoading(false);
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
  function refresh() { setLoading(true); setError(""); setReload((value) => value + 1); }
  const query = filter.toLowerCase();

  const directPermissions = permissions.filter((p) => !p.receivedFrom);
  const receivedPermissions = permissions.filter((p) => !!p.receivedFrom);

  const visibleDirect = directPermissions.filter((permission) =>
    `${permission.label} ${permission.scope}`.toLowerCase().includes(query)
  );

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

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <SubsectionTitle title="Account access" description="Manage what you share and see the permissions you have." />
        <div className="flex items-center gap-2">
          <Button ref={shareButton} size="sm" disabled={loading || !!error || sharing !== null || mutating || !shareOptions.length} onClick={() => openShare()}><Plus aria-hidden className="h-3.5 w-3.5" />Share access</Button>
          <Button size="sm" variant="ghost" aria-label="Refresh permissions" disabled={loading || sharing !== null || mutating} onClick={refresh}><RefreshCw aria-hidden className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      {sharing !== null ? <SharePermission key={sharing} options={shareOptions} initialKey={sharing === "new" ? undefined : sharing} onClose={closeShare} onShared={(grant, alreadyShared) => {
        setShared((items) => [...items.filter((item) => item.id !== grant.id), grant]);
        setView("shared"); setFilter("");
        setMessage(alreadyShared ? "This permission is already shared with this person." : `${grant.permission.label} shared with ${grant.username ? `@${grant.username}` : "the recipient"}.`);
        closeShare();
      }} /> : null}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06]">
        <div className="flex gap-4" aria-label="Permission views">
          {([['shared', 'Shared with others', shared.length], ['yours', 'Your permissions', permissions.length]] as const).map(([id, label, count]) => <button key={id} type="button" disabled={sharing !== null || mutating} aria-pressed={view === id} onClick={() => { setView(id); setFilter(""); }} className={cn("-mb-px cursor-pointer border-b-2 pb-3 text-[13px] font-medium transition-colors disabled:opacity-50 sm:text-sm", focusRing, view === id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-900")}>
            {label}{!loading && !error ? <span className="ml-1.5 rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">{count}</span> : null}
          </button>)}
        </div>
      </div>
      {message ? <FormSuccess className="mb-5">{message}</FormSuccess> : null}
      {loading ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-neutral-500"><Spinner />Loading permissions…</p> : error ? <div className="space-y-3"><FormError>{error}</FormError><Button size="sm" variant="secondary" onClick={refresh}>Try again</Button></div> : <>
        {(view === "shared" ? shared.length : permissions.length) > 6 ? <div className="mb-5"><Input id="find-permission" label={view === "shared" || receivedPermissions.length > 0 ? "Find a person or permission" : "Find a permission"} placeholder={view === "shared" || receivedPermissions.length > 0 ? "Search usernames or permissions…" : "Search permissions…"} value={filter} onChange={(event) => setFilter(event.target.value)} disabled={sharing !== null || mutating} /></div> : null}
        {view === "shared" ? <>
          {!shared.length ? <div className="py-8 text-center"><UsersRound aria-hidden className="mx-auto mb-3 h-6 w-6 text-neutral-400" /><p className="text-sm font-medium text-neutral-900">You haven’t shared any permissions</p><p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">Give someone specific access to your account. You can remove it here whenever you need to.</p></div> : <div className="space-y-5">
            {[...recipients.entries()].map(([id, grants]) => <section key={id} className="overflow-hidden rounded-xl border border-black/[0.07]">
              <div className="flex items-center gap-3 border-b border-black/[0.05] bg-neutral-50/70 px-4 py-3"><UsernameAvatar username={grants[0].username} size="sm" /><IdentityLabel username={grants[0].username} fallback="Account name unavailable" /></div>
              <ul className="divide-y divide-black/[0.05] p-4">{grants.map((grant) => <SharedPermissionRow key={grant.id} grant={grant} disabled={sharing !== null || mutating} onPendingChange={setMutating} onRemoved={() => {
                setShared((items) => items.filter((item) => item.id !== grant.id)); setMessage("Permission removed.");
                requestAnimationFrame(() => shareButton.current?.focus());
              }} />)}</ul>
            </section>)}
            {!recipients.size ? <p className="py-4 text-sm text-neutral-500">No people or permissions match your search.</p> : null}
          </div>}
          {shared.length > 0 ? <p className="mt-5 text-xs leading-relaxed text-neutral-500">Shared access stays linked to your account, even after you sign out. It can pause if you lose the permission yourself.</p> : null}
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
                  <ul className="divide-y divide-black/[0.05]">
                    {visibleDirect.map((permission) => (
                      <UserPermissionRow
                        key={permission.key}
                        permission={permission}
                        canShare={shareOptions.some((option) => option.key === permission.key)}
                        disabled={sharing !== null || mutating}
                        onShare={() => openShare(permission.key)}
                      />
                    ))}
                  </ul>
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
                              key={`${id}-${permission.key}`}
                              permission={permission}
                              canShare={shareOptions.some((option) => option.key === permission.key)}
                              disabled={sharing !== null || mutating}
                              onShare={() => openShare(permission.key)}
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
