"use client";

import { Bot, Check, KeyRound, Laptop, Plus, Server, Smartphone, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { permissionAction } from "@/app/actions/permissions";
import { tokenAction, type AccountToken } from "@/app/actions/tokens";
import { PermissionIcon } from "@/components/permission-icon";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { focusRing } from "@/lib/design";
import type { PermissionContext, UserPermission } from "@/lib/permission-types";
import type { AccountItemInfo } from "@/lib/user-profile";
import { cn } from "@/lib/utils";
import { AccountAvatar, AccountPicker, TokenPermissionPicker } from "./permission-picker";

const tokenIcons = [
  { value: "key", label: "Key", Icon: KeyRound },
  { value: "laptop", label: "Laptop", Icon: Laptop },
  { value: "smartphone", label: "Phone", Icon: Smartphone },
  { value: "server", label: "Server", Icon: Server },
  { value: "terminal", label: "Terminal", Icon: Terminal },
  { value: "bot", label: "Bot", Icon: Bot },
] as const;

type IconName = (typeof tokenIcons)[number]["value"];

function TokenIcon({ name }: { name: string | null | undefined }) {
  const Icon = tokenIcons.find((item) => item.value === name)?.Icon ?? KeyRound;
  return <Icon aria-hidden className="h-[18px] w-[18px]" />;
}

function IconPicker({ value, onChange, disabled }: { value: IconName; onChange: (value: IconName) => void; disabled: boolean }) {
  return <div>
    <p className="mb-2 text-sm font-medium text-neutral-800">Icon</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Token icon">
      {tokenIcons.map(({ value: option, label, Icon }) => <button key={option} type="button" title={label} aria-label={label}
        aria-pressed={value === option} disabled={disabled} onClick={() => onChange(option)}
        className={cn("flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-50", focusRing,
          value === option ? "border-neutral-900 bg-neutral-950 text-white" : "border-black/10 bg-white text-neutral-500 hover:border-black/20 hover:text-neutral-900")}>
        <Icon aria-hidden className="h-4 w-4" />
      </button>)}
    </div>
  </div>;
}

export function TokensSection({ auid, accounts = [], onEditingChange }: { auid: string; accounts?: AccountItemInfo[]; onEditingChange?: (editing: boolean) => void }) {
  const [tokens, setTokens] = useState<AccountToken[]>([]);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [contexts, setContexts] = useState<PermissionContext[]>([]);
  const [context, setContext] = useState("");
  const [systemContext, setSystemContext] = useState("");
  const [accountAuid, setAccountAuid] = useState(auid);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<IconName>("key");
  const [scopeMode, setScopeMode] = useState<"specific" | "all">("specific");
  const [selectedPermissions, setSelectedPermissions] = useState<UserPermission[]>([]);
  const [bearer, setBearer] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPermissionsId, setEditingPermissionsId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editIcon, setEditIcon] = useState<IconName>("key");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([tokenAction({ kind: "list" }), permissionAction({ kind: "list" })])
      .then(([tokenResult, catalog]) => {
        if (cancelled) return;
        setTokens(tokenResult.tokens ?? []);
        setLoadError(tokenResult.error ?? "");
        setPermissions(catalog.shareOptions ?? []);
        setContexts(catalog.contexts ?? []);
        setContext(catalog.systemContext ?? catalog.contexts?.[0]?.id ?? "");
        setSystemContext(catalog.systemContext ?? "");
        setAccountAuid(catalog.accountAuid ?? auid);
        setCatalogError(catalog.error ?? "");
      })
      .catch(() => { if (!cancelled) setLoadError("Couldn’t load tokens. Try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [auid]);

  async function refreshTokens() {
    const result = await tokenAction({ kind: "list" });
    if (result.tokens) { setTokens(result.tokens); setLoadError(""); }
    else if (result.error) setLoadError(result.error);
  }

  function closeEditor() {
    setCreating(false);
    setEditingId(null);
    setEditingPermissionsId(null);
    setError("");
    setSelectedPermissions([]);
    onEditingChange?.(false);
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setEditingPermissionsId(null);
    setConfirmId(null);
    setError("");
    setMessage("");
    setSelectedPermissions([]);
    setScopeMode("specific");
    onEditingChange?.(true);
  }

  function startEdit(token: AccountToken) {
    setCreating(false);
    setEditingId(token.tokenId);
    setEditingPermissionsId(null);
    setEditTitle(token.title ?? "");
    setEditIcon(tokenIcons.find((item) => item.value === token.icon)?.value ?? "key");
    setConfirmId(null);
    setError("");
    onEditingChange?.(true);
  }

  function startPermissionEdit(token: AccountToken) {
    const tokenContext = token.permissions[0]?.context ?? systemContext;
    const hasWildcard = token.permissions.some((grant) => grant.key === "*");
    setCreating(false);
    setEditingId(null);
    setEditingPermissionsId(token.tokenId);
    setConfirmId(null);
    setContext(tokenContext);
    setScopeMode(hasWildcard ? "all" : "specific");
    setSelectedPermissions(token.permissions.filter((grant, index, grants) => grant.key !== "*" && grants.findIndex((item) => item.key === grant.key && item.context === grant.context) === index).map((grant) =>
      permissions.find((item) => item.context === grant.context && item.key === grant.key) ?? {
        key: grant.key, context: grant.context, label: grant.key, scope: "", description: "", available: null,
      }
    ));
    setError("");
    setMessage("");
    onEditingChange?.(true);
  }

  const signedInAccounts: PermissionContext[] = accounts.map((account) => ({
    id: account.auid,
    username: account.username,
    label: account.username ? `@${account.username}` : "Username unavailable",
    avatarUrl: account.avatarUrl,
  }));

  const availableExisting = permissions.filter(
    (item) => item.context === context && item.available === true && item.key !== "*" && !selectedPermissions.some((p) => p.key === item.key)
  );
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
  const visibleTokens = [...tokens].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "") || a.tokenId.localeCompare(b.tokenId));

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const scopes = scopeMode === "all" ? ["*"] : selectedPermissions.map((p) => p.key);
    if (!title.trim() || !context || scopes.length === 0) return;
    setPending(true);
    setError("");
    try {
      const result = await tokenAction({ kind: "create", title, icon, permissions: scopes, permissionContext: context });
      if (result.error) { setError(result.error); return; }
      if (result.bearer) {
        setBearer(result.bearer);
        setTitle("");
        setSelectedPermissions([]);
        closeEditor();
        await refreshTokens();
      }
    } catch { setError("Couldn’t create the token. Try again."); }
    finally { setPending(false); }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || pending || !editTitle.trim()) return;
    setPending(true);
    setError("");
    try {
      const result = await tokenAction({ kind: "update", tokenId: editingId, title: editTitle, icon: editIcon });
      if (result.error) { setError(result.error); return; }
      if (result.updated) {
        const updated = result.updated;
        setTokens((current) => current.map((item) => item.tokenId === updated.tokenId ? { ...item, title: updated.title, icon: updated.icon } : item));
        closeEditor();
        setMessage("Token details saved.");
      }
    } catch { setError("Couldn’t save the token. Try again."); }
    finally { setPending(false); }
  }

  async function savePermissions() {
    if (!editingPermissionsId || pending || scopeMode === "all" || selectedPermissions.length === 0) return;
    const token = tokens.find((item) => item.tokenId === editingPermissionsId);
    if (!token) return;
    const desired = selectedPermissions.map(({ key, context }) => ({ key, context }));
    const unchanged = token.permissions.length === desired.length && token.permissions.every((grant) =>
      desired.some((item) => item.context === grant.context && item.key === grant.key)
    );
    if (unchanged) { closeEditor(); return; }
    setPending(true);
    setError("");
    try {
      const result = await tokenAction({ kind: "change-permissions", tokenId: editingPermissionsId, permissions: desired });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.permissionsChanged) {
        await refreshTokens().catch(() => setLoadError("Couldn’t refresh tokens. Try again."));
        closeEditor();
        setMessage("Token permissions saved. The existing token secret still works.");
      } else setError("Couldn’t save token permissions. Try again.");
    } catch { setError("Couldn’t save token permissions. Try again."); }
    finally { setPending(false); }
  }

  async function revoke(tokenId: string) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await tokenAction({ kind: "revoke", tokenId });
      if (result.error) { setError(result.error); return; }
      if (result.revoked) {
        setTokens((current) => current.filter((item) => item.tokenId !== tokenId));
        setConfirmId(null);
        setMessage("Token revoked. It can no longer be used.");
      }
    } catch { setError("Couldn’t revoke the token. Try again."); }
    finally { setPending(false); }
  }

  return <div className="space-y-5">
    {bearer ? <Card className="border-amber-200 bg-amber-50/60">
      <CardHeader icon={<KeyRound />} title="Your new token" description="Copy it now. For your security, the secret won’t be shown again." />
      <div className="mt-5"><CopyField label="Token" value={bearer} /></div>
      <Button size="sm" variant="secondary" className="mt-4" onClick={() => setBearer("")}>Done</Button>
    </Card> : null}
    <Card>
      <CardHeader icon={<KeyRound />} title="Account tokens" description="Manage personal tokens created for scripts, devices and services."
        action={!creating && !bearer ? <Button size="sm" onClick={startCreate}><Plus aria-hidden className="h-4 w-4" />Create token</Button> : null} />
      {loadError ? <div className="mt-5"><FormError>{loadError}</FormError><Button size="sm" variant="secondary" className="mt-3" onClick={() => { setLoading(true); refreshTokens().finally(() => setLoading(false)); }}>Retry</Button></div> : null}
      {message ? <div className="mt-5"><FormSuccess>{message}</FormSuccess></div> : null}
      {error && !creating && !editingId && !confirmId ? <div className="mt-5"><FormError>{error}</FormError></div> : null}
      {creating ? <form className="mt-6 space-y-5 border-t border-black/[0.06] pt-5" onSubmit={create}>
        <Input id="token-title" label="Name" hint="Use a name that identifies where you’ll use this token." value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required autoFocus disabled={pending} placeholder="e.g. Build server" />
        <IconPicker value={icon} onChange={setIcon} disabled={pending} />
        <fieldset><legend className="text-sm font-medium text-neutral-800">Access</legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.07] bg-white p-3 text-sm text-neutral-800">
              <input type="radio" name="scope-mode" checked={scopeMode === "specific"} onChange={() => setScopeMode("specific")} disabled={pending} className="mt-0.5 accent-neutral-950" />
              <span><span className="block font-medium">Selected permissions</span><span className="mt-0.5 block text-[13px] text-neutral-500">Give the token only the access you choose below.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.07] bg-white p-3 text-sm text-neutral-800">
              <input type="radio" name="scope-mode" checked={scopeMode === "all"} onChange={() => setScopeMode("all")} disabled={pending} className="mt-0.5 accent-neutral-950" />
              <span><span className="block font-medium">All current access</span><span className="mt-0.5 block text-[13px] text-neutral-500">This token can use all access you hold in this application.</span></span>
            </label>
          </div>

          {scopeMode === "all" ? (
            <div className="mt-3 rounded-xl border border-black/[0.07] bg-white p-4">
              <AccountPicker
                id="token-context-all"
                label="Application"
                subject="application"
                contexts={contexts}
                value={context}
                disabled={pending || Boolean(catalogError)}
                onChoose={(found) => {
                  setContexts((items) => items.some((item) => item.id === found.id) ? items.map((item) => item.id === found.id ? found : item) : [...items, found]);
                  setContext(found.id);
                }}
              />
              <p className="mt-2 text-[13px] text-neutral-500">
                This token can use all capabilities you hold in this application context (<code className="font-mono text-xs">*</code>).
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {selectedPermissions.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">
                    Selected permissions ({selectedPermissions.length})
                  </h4>
                  <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.07] bg-white p-3">
                    {selectedPermissions.map((item) => {
                      const hasTitle = Boolean(item.label && item.label !== item.key);
                      const applicationLabel = item.scope || contextLabel(item.context);
                      const appContext = getAppContext(item.context, item.scope);
                      return (
                        <li key={item.key} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="flex items-start gap-3 min-w-0">
                            <PermissionIcon name={item.icon} className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-neutral-900">{hasTitle ? item.label : item.key}</p>
                              {applicationLabel ? (
                                <div className="mt-1 flex items-center gap-1.5 text-[13px] text-neutral-500">
                                  <AccountAvatar account={appContext} size="xs" className="h-4 w-4 shrink-0 text-[9px]" shape="rounded" />
                                  <span>{applicationLabel}</span>
                                </div>
                              ) : null}
                              {item.description ? (
                                <p className="mt-1 text-[13px] text-neutral-500">{item.description}</p>
                              ) : null}
                              {item.params?.length ? (
                                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                                  {item.params.map((param) => (
                                    <span key={param.name} className="inline-flex items-center gap-1">
                                      <span className="text-neutral-400">{param.label ?? param.name}:</span>
                                      <span className="font-medium text-neutral-700">{param.valueLabel ?? param.value}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="danger-ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => setSelectedPermissions((curr) => curr.filter((p) => p.key !== item.key))}
                            aria-label={`Remove ${item.label || item.key}`}
                          >
                            Remove
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <TokenPermissionPicker
                contexts={contexts}
                context={context}
                onContextChange={(newContext) => {
                  if (newContext !== context) {
                    setContext(newContext);
                    setSelectedPermissions([]);
                  }
                }}
                signedInAccounts={signedInAccounts}
                systemContext={systemContext}
                accountAuid={accountAuid}
                selectedKeys={selectedPermissions.map((p) => p.key)}
                onAdd={(permission) => {
                  setSelectedPermissions((curr) => [...curr, permission]);
                  setMessage("");
                }}
              />

              {availableExisting.length > 0 ? (
                <details className="text-xs text-neutral-600">
                  <summary className={cn("w-fit cursor-pointer font-medium text-neutral-700 hover:text-neutral-950", focusRing)}>
                    Choose from your current permissions ({availableExisting.length})
                  </summary>
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-black/[0.07] bg-white p-2">
                    {availableExisting.map((item) => {
                      const hasTitle = Boolean(item.label && item.label !== item.key);
                      const applicationLabel = item.scope || contextLabel(item.context);
                      const appContext = getAppContext(item.context, item.scope);
                      return (
                        <div key={item.key} className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-neutral-50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PermissionIcon name={item.icon} className="h-4 w-4 shrink-0 text-neutral-400" />
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-medium text-neutral-800">{hasTitle ? item.label : item.key}</span>
                              {applicationLabel ? (
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                                  <AccountAvatar account={appContext} size="xs" className="h-3.5 w-3.5 shrink-0 text-[8px]" shape="rounded" />
                                  <span className="truncate">{applicationLabel}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="shrink-0"
                            onClick={() => setSelectedPermissions((curr) => [...curr, item])}
                          >
                            <Plus aria-hidden className="h-3 w-3" />
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </fieldset>
        {catalogError ? <FormError>{catalogError}</FormError> : null}
        {error ? <FormError>{error}</FormError> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="sm"
            loading={pending}
            disabled={Boolean(catalogError) || !context || !title.trim() || (scopeMode === "specific" && selectedPermissions.length === 0)}
          >
            Create token
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={closeEditor}>
            Cancel
          </Button>
        </div>
      </form> : null}
      {loading ? <div className="mt-7 flex items-center gap-2 text-sm text-neutral-500"><Spinner />Loading tokens…</div> : null}
      {!loading && !loadError && tokens.length === 0 && !creating ? <p className="mt-6 text-sm text-neutral-500">No personal tokens created yet.</p> : null}
      {tokens.length > 0 ? <ul className="mt-6 divide-y divide-black/[0.06] border-t border-black/[0.06]">{visibleTokens.map((token) => <li key={token.tokenId} className="py-4 last:pb-0">
        <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            disabled={pending || editingId === token.tokenId}
            onClick={() => startEdit(token)}
            title="Change token icon or name"
            aria-label={`Change icon for ${token.title || "token"}`}
            className={cn(
              "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-black/[0.06] bg-neutral-50 text-neutral-700 transition-colors hover:border-black/20 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50",
              focusRing
            )}
          >
            <TokenIcon name={token.icon} />
          </button>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-neutral-900">{token.title ?? "Untitled token"}</p></div>
            <p className="mt-1 text-xs text-neutral-500">{token.permissions.some((permission) => permission.key === "*") ? "All access" : `${token.permissions.length} ${token.permissions.length === 1 ? "permission" : "permissions"}`}</p>
            <code className="mt-1 block truncate font-mono text-xs text-neutral-400" title={token.tokenId}>{token.tokenId}</code>
          </div></div>
          {editingId !== token.tokenId && editingPermissionsId !== token.tokenId && confirmId !== token.tokenId ? <div className="flex shrink-0 flex-wrap justify-end gap-1">
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => startEdit(token)}>Edit</Button>
            <Button size="sm" variant="ghost" disabled={pending || Boolean(catalogError)} onClick={() => startPermissionEdit(token)}>Change access</Button>
            <Button size="sm" variant="danger-ghost" disabled={pending} onClick={() => { setConfirmId(token.tokenId); setMessage(""); }}>Revoke</Button>
          </div> : null}
        </div>
        <details className="ml-[52px] mt-3 text-[13px] text-neutral-600"><summary className={cn("w-fit cursor-pointer font-medium text-neutral-700 hover:text-neutral-950", focusRing)}>View access</summary>
          <ul className="mt-2 space-y-1.5">{token.permissions.map((grant) => {
            const described = permissions.find((item) => item.context === grant.context && item.key === grant.key);
            const appLabel = described?.scope || contextLabel(grant.context);
            const hasTitle = Boolean(described?.label && described.label !== grant.key);
            const title = grant.key === "*" ? `All access` : (hasTitle ? described!.label : grant.key);
            const appContext = getAppContext(grant.context, described?.scope);
            return (
              <li key={grant.grantId} className="flex items-center gap-2">
                <PermissionIcon name={described?.icon} className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span className="flex items-center gap-1.5">
                  <span>{title}</span>
                  {appLabel ? (
                    <>
                      <span className="text-neutral-400">·</span>
                      <span className="inline-flex items-center gap-1 font-normal text-neutral-500">
                        <AccountAvatar account={appContext} size="xs" className="h-3.5 w-3.5 shrink-0 text-[8px]" shape="rounded" />
                        <span>{appLabel}</span>
                      </span>
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}</ul>
        </details>
        {editingId === token.tokenId ? <form className="mt-4 space-y-4 rounded-xl bg-neutral-50 p-4" onSubmit={saveEdit}>
          <Input id={`token-edit-${token.tokenId}`} label="Name" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={100} required disabled={pending} />
          <IconPicker value={editIcon} onChange={setEditIcon} disabled={pending} />
          {error ? <FormError>{error}</FormError> : null}
          <div className="flex gap-2"><Button type="submit" size="sm" loading={pending}><Check aria-hidden className="h-3.5 w-3.5" />Save</Button><Button size="sm" variant="ghost" disabled={pending} onClick={closeEditor}>Cancel</Button></div>
        </form> : null}
        {editingPermissionsId === token.tokenId ? <div className="mt-4 space-y-4 rounded-xl bg-neutral-50 p-4">
          <div>
            <h4 className="text-sm font-semibold text-neutral-900">Change access</h4>
            <p className="mt-1 text-[13px] text-neutral-600">Changes take effect for the existing token secret as soon as you save.</p>
          </div>
          {token.permissions.some((grant) => grant.key === "*") ? <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-neutral-800">Access</legend>
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="radio" name={`edit-scope-${token.tokenId}`} checked={scopeMode === "all"} disabled={pending} onChange={() => { setScopeMode("all"); setContext(token.permissions[0]?.context ?? systemContext); }} className="accent-neutral-950" />Keep all current access</label>
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="radio" name={`edit-scope-${token.tokenId}`} checked={scopeMode === "specific"} disabled={pending} onChange={() => setScopeMode("specific")} className="accent-neutral-950" />Limit to selected permissions</label>
          </fieldset> : null}
          {scopeMode === "specific" ? <>
            {selectedPermissions.length > 0 ? <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.07] bg-white px-3">
              {selectedPermissions.map((item) => <li key={`${item.context}:${item.key}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-sm text-neutral-800" title={item.key}>{item.label || item.key}<span className="ml-2 text-xs text-neutral-500">{item.scope || contextLabel(item.context)}</span></span>
                <Button type="button" variant="danger-ghost" size="sm" disabled={pending} onClick={() => setSelectedPermissions((current) => current.filter((selected) => selected.context !== item.context || selected.key !== item.key))} aria-label={`Remove ${item.label || item.key}`}>Remove</Button>
              </li>)}
            </ul> : <p className="text-[13px] text-neutral-600">Choose at least one permission.</p>}
            <fieldset disabled={pending}>
              <TokenPermissionPicker
                contexts={contexts}
                context={context}
                onContextChange={(newContext) => {
                  if (newContext !== context) setContext(newContext);
                }}
                signedInAccounts={signedInAccounts}
                systemContext={systemContext}
                accountAuid={accountAuid}
                selectedKeys={selectedPermissions.filter((item) => item.context === context).map((item) => item.key)}
                onAdd={(permission) => setSelectedPermissions((current) => [...current, permission])}
              />
            </fieldset>
          </> : <p className="text-[13px] text-neutral-600">This token can use all access you hold in its application context. Choose selected permissions to narrow it.</p>}
          {error ? <FormError>{error}</FormError> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={pending} disabled={scopeMode === "specific" && selectedPermissions.length === 0} onClick={scopeMode === "all" ? closeEditor : savePermissions}><Check aria-hidden className="h-3.5 w-3.5" />{scopeMode === "all" ? "Done" : "Save permissions"}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={closeEditor}>Cancel</Button>
          </div>
        </div> : null}
        {confirmId === token.tokenId ? <div className="mt-4 rounded-xl bg-red-50/70 p-4">
          <p className="text-[13px] text-neutral-700">Revoke {token.title || "this token"}? Anything using it will lose access immediately.</p>
          {error ? <div className="mt-3"><FormError>{error}</FormError></div> : null}
          <div className="mt-3 flex gap-2"><Button size="sm" variant="danger" loading={pending} onClick={() => revoke(token.tokenId)}>Revoke token</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => { setConfirmId(null); setError(""); }}>Cancel</Button></div>
        </div> : null}
      </li>)}</ul> : null}
    </Card>
  </div>;
}
