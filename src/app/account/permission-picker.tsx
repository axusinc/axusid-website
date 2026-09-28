"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { permissionAction } from "@/app/actions/permissions";
import { bindPermission, permissionIdentity } from "@/lib/permission-context";
import type { ParameterOptionsFragment } from "@/graphql/sdk";
import type { PermissionContext, PickerDeclaration, SharedPermission, UserPermission } from "@/lib/permission-types";
import { PermissionIcon } from "@/components/permission-icon";
import { Button } from "@/components/ui/button";
import { Field, Input, controlClassName } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-message";
import { Spinner } from "@/components/ui/spinner";
import { UsernameAvatar } from "@/components/username-avatar";
import { ProfileAvatar } from "@/components/ui/profile-avatar";

function bindingsFor(template: string, key?: string): Record<string, string> | null {
  if (!key) return null;
  const parts = key.split(".");
  const segments = template.split(".");
  if (parts.length !== segments.length) return null;
  const bindings: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const match = /^\{([^{}]+)\}$/.exec(segments[i]);
    if (match) bindings[match[1]] = parts[i];
    else if (segments[i] !== parts[i]) return null;
  }
  return bindings;
}

function isAccountParameter(option: ParameterOptionsFragment) {
  if (option.values.some((item) => !/^[0-9]+(?:,[0-9]+)*$/.test(item.value))) return false;
  return /(?:^auid$|auid$|^account$|^account_id$|^context$|^subject$)/i.test(option.name) || /\bAUID\b/i.test(option.label ?? "");
}

function ParameterInput({ option, context, declarationId, value, onChange, accounts }: {
  option: ParameterOptionsFragment; context: string; declarationId: string; value: string; onChange: (value: string) => void; accounts: PermissionContext[];
}) {
  const accountParameter = isAccountParameter(option);
  const [manual, setManual] = useState(Boolean(value && !option.values.some((item) => item.value === value)));
  const [search, setSearch] = useState<{ query: string; options?: ParameterOptionsFragment; error?: string } | null>(null);
  useEffect(() => {
    if (!option.dynamic || accountParameter) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      permissionAction({ kind: "search", permissionContext: context, declarationId, param: option.name, query: value.slice(0, 256) })
        .then((result) => { if (!cancelled) setSearch({ query: value, options: result.options, error: result.error }); })
        .catch(() => { if (!cancelled) setSearch({ query: value, error: "Value suggestions are unavailable. Enter a value; the app will validate it." }); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [accountParameter, context, declarationId, option.dynamic, option.name, value]);
  const current = search?.query === value ? search : null;
  const options = current?.options ?? option;
  const id = `permission-param-${option.name}`;
  const accountLabel = !option.label || option.label === option.name ? "For account" : option.label.replace(/\bAUID\b/gi, "account");
  if (accountParameter) return <AccountPicker id={id} label={accountLabel} contexts={accounts} value={value} disabled={false} onChoose={(account) => onChange(account.id)} />;
  if (!option.dynamic && option.values.length && !manual) return (
    <Field id={id} label={option.label ?? option.name}>
      <select id={id} className={`${controlClassName} h-11 px-3 sm:h-10`} value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Choose a value</option>
        {option.values.map((item) => <option key={item.value} value={item.value}>{item.label ?? item.value}</option>)}
      </select>
      {option.values.find((item) => item.value === value)?.description ? <p className="text-xs text-neutral-500">{option.values.find((item) => item.value === value)?.description}</p> : null}
      <Button size="sm" variant="ghost" onClick={() => setManual(true)}>Enter a value instead</Button>
    </Field>
  );
  return <div>
    <Input id={id} label={options.label ?? option.name} className="sm:h-10" value={value} onChange={(event) => onChange(event.target.value)} list={option.dynamic ? `${id}-values` : undefined} required autoComplete="off" maxLength={1024}
      hint={options.degraded || current?.error ? "Suggestions unavailable. You can still enter a value." : option.dynamic ? "Search or enter a value." : undefined} />
    {option.dynamic ? <datalist id={`${id}-values`}>{options.values.map((item) => <option key={item.value} value={item.value}>{item.label ?? item.value}</option>)}</datalist> : null}
    {option.dynamic && !current ? <p role="status" className="mt-1 text-xs text-neutral-500">Finding values…</p> : null}
    {manual && !option.dynamic && option.values.length ? <Button size="sm" variant="ghost" onClick={() => { setManual(false); onChange(""); }}>Choose a suggested value</Button> : null}
  </div>;
}

function BindingForm({ declaration, contextLabel, initial, accountAuid, systemContext, accounts, onClose, onShared, onPendingChange }: {
  declaration: PickerDeclaration; contextLabel: string; initial?: UserPermission; accountAuid: string; systemContext: string; accounts: PermissionContext[];
  onClose: () => void; onShared: (grant: SharedPermission, alreadyShared: boolean) => void; onPendingChange: (pending: boolean) => void;
}) {
  const [bindings, setBindings] = useState<Record<string, string>>(() => bindingsFor(declaration.template, initial?.key) ?? (declaration.context === systemContext ? { auid: accountAuid, context: accountAuid } : {}));
  const [username, setUsername] = useState("");
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [preview, setPreview] = useState<{ identity: string; permission?: UserPermission; error?: string } | null>(null);
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const key = bindPermission(declaration.template, bindings);
  const identity = key ? permissionIdentity(key, declaration.context) : "";
  const current = identity && preview?.identity === identity ? preview : null;
  const permission = current?.permission;
  const parameterNames = [...new Set([...declaration.template.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]))];
  const options = parameterNames.map((name) => declaration.params.find((param) => param.name === name) ?? { name, label: name, dynamic: false, degraded: false, values: [] });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      permissionAction({ kind: "preview", permission: key, permissionContext: declaration.context })
        .then((result) => { if (!cancelled) setPreview({ identity, permission: result.preview, error: result.error }); })
        .catch(() => { if (!cancelled) setPreview({ identity, error: "Couldn’t preview this permission. Change a value or try again." }); });
    }, 350);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [key, identity, declaration.context, previewAttempt]);

  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    if (submitting.current || !permission || permission.available !== true) return;
    if (!username.trim().replace(/^@/, "")) { setError("Enter a recipient’s username."); return; }
    if (!review) { setReview(true); setError(""); requestAnimationFrame(() => heading.current?.focus()); return; }
    submitting.current = true; setPending(true); onPendingChange(true); setError("");
    try {
      const result = await permissionAction({ kind: "share", username, permission: permission.key, permissionContext: permission.context });
      if (result.error) setError(result.error);
      if (result.sharedGrant) onShared(result.sharedGrant, Boolean(result.alreadyShared));
    } catch { setError("Couldn’t share this permission. Please try again."); }
    finally { submitting.current = false; setPending(false); onPendingChange(false); }
  }}>
    {review ? <h3 ref={heading} tabIndex={-1} className="text-sm font-semibold outline-none">Review access</h3> : null}
    {!review ? <div className="grid items-start gap-3 sm:grid-cols-2">
      {options.map((option) => <ParameterInput key={option.name} option={option} context={declaration.context} declarationId={declaration.id} value={bindings[option.name] ?? ""} accounts={accounts} onChange={(value) => { setBindings((previous) => ({ ...previous, [option.name]: value })); setError(""); }} />)}
      <Input id="share-username" label="Share with" className="sm:h-10" placeholder="@username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={256} />
    </div> : <div className="flex items-center gap-3"><UsernameAvatar username={username} size="sm" /><span className="break-all text-sm font-medium">@{username.trim().replace(/^@/, "")}</span></div>}
    {key && !current ? <p role="status" className="flex items-center gap-2 text-sm text-neutral-500"><Spinner />Checking access…</p> : null}
    {current?.error ? <FormError>{current.error}</FormError> : null}
    {current?.error || permission?.available === null ? <Button size="sm" variant="secondary" onClick={() => { setPreview(null); setPreviewAttempt((value) => value + 1); }}>Retry preview</Button> : null}
    {permission ? <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
      {review ? <p className="mb-1 text-xs text-neutral-500">{contextLabel}</p> : null}
      <p className="flex items-center gap-2 text-sm font-medium"><PermissionIcon name={permission.icon} />{permission.label}</p>
      <p className="mt-1 text-sm text-neutral-600">{permission.description}</p>
      {review && permission.params?.length ? <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">{permission.params.map((param) => <div key={param.name}><dt className="text-neutral-500">{param.label ?? param.name}</dt><dd className="break-all"><span className="flex items-center gap-2"><PermissionIcon name={param.valueIcon ?? param.icon} />{param.valueLabel ?? param.value}</span>{param.description ? <span className="block text-neutral-500">{param.description}</span> : null}{param.hint ? <span className="block text-neutral-500">{param.hint}</span> : null}</dd></div>)}</dl> : null}
      {permission.available !== true ? <p className="mt-2 text-sm text-amber-800">{permission.available === false ? "You don’t currently hold this access." : "Your access couldn’t be verified."}</p> : null}
    </div> : null}
    {permission?.context === systemContext && permission.key.endsWith(".grants.delegate") ? <p className="text-xs text-amber-800">This lets the recipient share permissions on your behalf. Only give it to someone you trust.</p> : null}
    {review ? <p className="text-xs text-neutral-500">You can remove this access anytime. The app validates these values again when you share.</p> : null}
    {error ? <FormError>{error}</FormError> : null}
    <div className="flex flex-wrap gap-2">
      <Button type="submit" size="sm" disabled={permission?.available !== true} loading={pending}>{review ? "Confirm and share" : "Review access"}{!review ? <ArrowRight aria-hidden className="h-3.5 w-3.5" /> : null}</Button>
      {review ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => setReview(false)}>Back</Button> : null}
      <Button size="sm" variant="ghost" disabled={pending} onClick={onClose}>Cancel</Button>
    </div>
  </form>;
}

function AccountPicker({ contexts, value, disabled, onChoose, label = "Account", id = "permission-context" }: {
  contexts: PermissionContext[]; value: string; disabled: boolean; onChoose: (account: PermissionContext) => void; label?: string; id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [lookup, setLookup] = useState<{ query: string; account?: PermissionContext; error?: string } | null>(null);
  const [resolved, setResolved] = useState<PermissionContext | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const selected = contexts.find((item) => item.id === value) ?? (resolved?.id === value ? resolved : undefined);
  const normalized = query.trim().replace(/^@/, "").toLowerCase();
  const available = selected && !contexts.some((item) => item.id === selected.id) ? [...contexts, selected] : contexts;
  const matches = available.filter((item) => !normalized || item.username?.toLowerCase().includes(normalized));
  const exactKnown = available.some((item) => item.username?.toLowerCase() === normalized);
  const found = lookup?.query === normalized ? lookup : null;
  const options = found?.account && !matches.some((item) => item.id === found.account?.id) ? [...matches, found.account] : matches;
  const active = options[Math.min(highlight, options.length - 1)];

  useEffect(() => {
    if (!value || contexts.some((item) => item.id === value)) return;
    let cancelled = false;
    permissionAction({ kind: "resolve-account", accountId: value })
      .then((result) => { if (!cancelled && result.context) setResolved(result.context); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [contexts, value]);

  useEffect(() => {
    if (!open || !normalized || exactKnown) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      permissionAction({ kind: "resolve-context", username: normalized })
        .then((result) => { if (!cancelled) setLookup({ query: normalized, account: result.context, error: result.error }); })
        .catch(() => { if (!cancelled) setLookup({ query: normalized, error: "Account lookup is unavailable. Try again." }); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [open, normalized, exactKnown]);

  const choose = (account: PermissionContext) => {
    onChoose(account);
    setOpen(false);
    setQuery("");
    setHighlight(0);
    input.current?.blur();
  };

  return <div className="min-w-0 space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-neutral-800">{label}</label>
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setQuery(""); } }}>
      <div className="relative">
        {!open && selected ? <ProfileAvatar imageUrl={selected.avatarUrl} username={selected.username} alt={selected.username ? `@${selected.username}` : selected.label} seed={selected.id} size="sm" className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2" /> : null}
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-activedescendant={open && active ? `${id}-option-${active.id}` : undefined}
          disabled={disabled}
          value={open ? query : selected?.username ? `@${selected.username}` : selected?.label ?? (value ? "Loading account…" : "")}
          onFocus={() => { setOpen(true); setQuery(""); setHighlight(0); }}
          onChange={(event) => { setQuery(event.target.value); setHighlight(0); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setOpen(false); setQuery(""); input.current?.blur(); }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (options.length) setHighlight((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length); }
            if (event.key === "Enter" && active) { event.preventDefault(); choose(active); }
          }}
          placeholder="Search @username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={`${controlClassName} h-11 pr-10 sm:h-10 ${!open && selected ? "pl-12" : "pl-3"}`}
        />
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>
      {open ? <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.1)]">
        <ul id={`${id}-options`} role="listbox" aria-label="Accounts" className="max-h-56 overflow-y-auto p-1">
          {options.map((item, index) => <li key={item.id} id={`${id}-option-${item.id}`} role="option" aria-selected={item.id === value}>
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)} className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-50 ${index === highlight ? "bg-neutral-100" : ""}`}>
              <ProfileAvatar imageUrl={item.avatarUrl} username={item.username} alt={item.username ? `@${item.username}` : item.label} seed={item.id} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{item.username ? `@${item.username}` : item.label}</span>
              {item.id === value ? <Check aria-hidden className="h-4 w-4 text-neutral-500" /> : null}
            </button>
          </li>)}
        </ul>
        {normalized && !exactKnown && !found ? <p role="status" className="px-3 pb-2 text-xs text-neutral-500">Looking up @{normalized}…</p> : null}
        {normalized && found?.error && !options.length ? <p className="px-3 pb-2 text-xs text-neutral-500">{found.error}</p> : null}
      </div> : null}
    </div>
  </div>;
}

export function PermissionPicker({ contexts: knownContexts, initial, systemContext, accountAuid, onClose, onShared }: {
  contexts: PermissionContext[]; initial?: UserPermission; systemContext: string; accountAuid: string;
  onClose: () => void; onShared: (grant: SharedPermission, alreadyShared: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [contexts, setContexts] = useState(knownContexts);
  const [context, setContext] = useState(initial?.context ?? systemContext);
  const [selection, setSelection] = useState("");
  const [catalog, setCatalog] = useState<{ context: string; declarations: PickerDeclaration[]; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    permissionAction({ kind: "catalog", permissionContext: context })
      .then((result) => { if (!cancelled) setCatalog({ context, declarations: result.declarations ?? [], error: result.error }); })
      .catch(() => { if (!cancelled) setCatalog({ context, declarations: [], error: "Couldn’t load this app’s permissions." }); });
    return () => { cancelled = true; };
  }, [context, retry]);
  const current = catalog?.context === context ? catalog : null;
  const declarations = current?.declarations ?? [];
  const initialDeclaration = initial?.context === context ? declarations.find((item) => bindingsFor(item.template, initial.key)) : undefined;
  const selected = declarations.find((item) => item.id === selection) ?? initialDeclaration ?? declarations[0];
  const groups = [...new Set(declarations.map((item) => item.group))];
  return <div className="mb-5 space-y-3 border-b border-black/[0.07] pb-5 [&_label]:text-xs [&_label]:text-neutral-500">
    <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <AccountPicker contexts={contexts} value={context} disabled={busy} onChoose={(found) => {
        setContexts((items) => items.some((item) => item.id === found.id) ? items.map((item) => item.id === found.id ? found : item) : [...items, found]);
        setContext(found.id);
        setSelection("");
      }} />
      {declarations.length ? <Field id="permission-declaration" label="Permission" className="min-w-0">
        <select id="permission-declaration" disabled={busy} value={selected?.id ?? ""} onChange={(event) => setSelection(event.target.value)} className={`${controlClassName} h-11 px-3 sm:h-10`}>
          {groups.map((group) => <optgroup key={group} label={group}>{declarations.filter((item) => item.group === group).map((item) => <option key={item.id} value={item.id}>{item.title ?? item.name}</option>)}</optgroup>)}
        </select>
      </Field> : null}
    </div>
    {!current ? <p role="status" className="flex items-center gap-2 text-sm text-neutral-500"><Spinner />Loading declarations…</p> : current.error ? <><FormError>{current.error}</FormError><Button size="sm" variant="secondary" onClick={() => { setCatalog(null); setRetry((value) => value + 1); }}>Try again</Button></> : !declarations.length ? <p className="text-sm text-neutral-500">This app hasn’t published any permission declarations.</p> : <>
      {selected ? <BindingForm key={`${context}:${selected.id}`} declaration={selected} contextLabel={contexts.find((item) => item.id === context)?.label ?? "Account"} initial={initial?.context === context ? initial : undefined} systemContext={systemContext} accountAuid={accountAuid} accounts={contexts} onClose={onClose} onShared={onShared} onPendingChange={setBusy} /> : null}
    </>}
    {!selected ? <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button> : null}
  </div>;
}
