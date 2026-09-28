"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
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

function ParameterInput({ option, context, declarationId, value, onChange }: {
  option: ParameterOptionsFragment; context: string; declarationId: string; value: string; onChange: (value: string) => void;
}) {
  const [manual, setManual] = useState(Boolean(value && !option.values.some((item) => item.value === value)));
  const [search, setSearch] = useState<{ query: string; options?: ParameterOptionsFragment; error?: string } | null>(null);
  useEffect(() => {
    if (!option.dynamic) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      permissionAction({ kind: "search", permissionContext: context, declarationId, param: option.name, query: value.slice(0, 256) })
        .then((result) => { if (!cancelled) setSearch({ query: value, options: result.options, error: result.error }); })
        .catch(() => { if (!cancelled) setSearch({ query: value, error: "Value suggestions are unavailable. Enter a value; the app will validate it." }); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [context, declarationId, option.dynamic, option.name, value]);
  const current = search?.query === value ? search : null;
  const options = current?.options ?? option;
  const id = `permission-param-${option.name}`;
  if (!option.dynamic && option.values.length && !manual) return (
    <Field id={id} label={option.label ?? option.name}>
      <select id={id} className={`${controlClassName} h-11 px-3`} value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Choose a value</option>
        {option.values.map((item) => <option key={item.value} value={item.value}>{item.label ?? item.value}</option>)}
      </select>
      {option.values.find((item) => item.value === value)?.description ? <p className="text-xs text-neutral-500">{option.values.find((item) => item.value === value)?.description}</p> : null}
      <Button size="sm" variant="ghost" onClick={() => setManual(true)}>Enter a value instead</Button>
    </Field>
  );
  return <div>
    <Input id={id} label={options.label ?? option.name} value={value} onChange={(event) => onChange(event.target.value)} list={option.dynamic ? `${id}-values` : undefined} required autoComplete="off" maxLength={1024}
      hint={options.degraded || current?.error ? "Validated by app. Enter a value while suggestions are unavailable." : option.dynamic ? "Search for a value or enter one. Validated by app." : "Enter a value. AXUS ID checks the declaration before sharing."} />
    {option.dynamic ? <datalist id={`${id}-values`}>{options.values.map((item) => <option key={item.value} value={item.value}>{item.label ?? item.value}</option>)}</datalist> : null}
    {option.dynamic && !current ? <p role="status" className="mt-1 text-xs text-neutral-500">Finding values…</p> : null}
    {manual && !option.dynamic && option.values.length ? <Button size="sm" variant="ghost" onClick={() => { setManual(false); onChange(""); }}>Choose a suggested value</Button> : null}
  </div>;
}

function BindingForm({ declaration, contextLabel, initial, accountAuid, systemContext, onClose, onShared, onPendingChange }: {
  declaration: PickerDeclaration; contextLabel: string; initial?: UserPermission; accountAuid: string; systemContext: string;
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
    <h3 ref={heading} tabIndex={-1} className="text-sm font-semibold outline-none">{review ? "Review access" : "Choose access"}</h3>
    {!review ? <>
      {options.map((option) => <ParameterInput key={option.name} option={option} context={declaration.context} declarationId={declaration.id} value={bindings[option.name] ?? ""} onChange={(value) => { setBindings((previous) => ({ ...previous, [option.name]: value })); setError(""); }} />)}
      <Input id="share-username" label="Who do you want to share with?" placeholder="@username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={256} />
    </> : <div className="flex items-center gap-3"><UsernameAvatar username={username} size="sm" /><span className="break-all text-sm font-medium">@{username.trim().replace(/^@/, "")}</span></div>}
    {key && !current ? <p role="status" className="flex items-center gap-2 text-sm text-neutral-500"><Spinner />Checking access…</p> : null}
    {current?.error ? <FormError>{current.error}</FormError> : null}
    {current?.error || permission?.available === null ? <Button size="sm" variant="secondary" onClick={() => { setPreview(null); setPreviewAttempt((value) => value + 1); }}>Retry preview</Button> : null}
    {permission ? <div className="rounded-xl border border-black/[0.06] bg-white p-4">
      <p className="text-xs text-neutral-500">{contextLabel}</p>
      <p className="mt-1 flex items-center gap-2 text-sm font-medium"><PermissionIcon name={permission.icon} />{permission.label}</p>
      <p className="mt-1 text-sm text-neutral-600">{permission.description}</p>
      {permission.params?.length ? <dl className="mt-3 space-y-2 text-xs">{permission.params.map((param) => <div key={param.name}><dt className="text-neutral-500">{param.label ?? param.name}</dt><dd className="break-all"><span className="flex items-center gap-2"><PermissionIcon name={param.valueIcon ?? param.icon} />{param.valueLabel ?? param.value}</span>{param.description ? <span className="block text-neutral-500">{param.description}</span> : null}{param.hint ? <span className="block text-neutral-500">{param.hint}</span> : null}</dd></div>)}</dl> : null}
      <code className="mt-3 block break-all text-xs text-neutral-500">{permission.key}</code>
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

export function PermissionPicker({ contexts: knownContexts, initial, systemContext, accountAuid, onClose, onShared }: {
  contexts: PermissionContext[]; initial?: UserPermission; systemContext: string; accountAuid: string;
  onClose: () => void; onShared: (grant: SharedPermission, alreadyShared: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [contexts, setContexts] = useState(knownContexts);
  const [context, setContext] = useState(initial?.context ?? systemContext);
  const [selection, setSelection] = useState("");
  const [catalog, setCatalog] = useState<{ context: string; declarations: PickerDeclaration[]; error?: string } | null>(null);
  const [appUsername, setAppUsername] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [finding, setFinding] = useState(false);
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
  return <div className="mb-6 space-y-4 rounded-xl border border-black/[0.07] bg-neutral-50 p-4 sm:p-5">
    <Field id="permission-context" label="App">
      <select id="permission-context" disabled={busy || finding} className={`${controlClassName} h-11 px-3`} value={context} onChange={(event) => { setContext(event.target.value); setSelection(""); }}>
        {contexts.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </Field>
    <div className="flex flex-wrap items-end gap-2">
      <Input id="permission-app-lookup" disabled={busy} label="Find another app" placeholder="@app_username" value={appUsername} onChange={(event) => setAppUsername(event.target.value)} containerClassName="min-w-0 flex-1" autoComplete="off" />
      <Button size="sm" variant="secondary" loading={finding} disabled={busy || !appUsername.trim()} onClick={async () => {
        if (finding) return;
        setFinding(true); setLookupError("");
        try {
          const result = await permissionAction({ kind: "resolve-context", username: appUsername });
          if (result.context) { const found = result.context; setContexts((items) => items.some((item) => item.id === found.id) ? items : [...items, found]); setContext(found.id); setSelection(""); setAppUsername(""); }
          if (result.error) setLookupError(result.error);
        } catch { setLookupError("Couldn’t find this app. Please try again."); }
        finally { setFinding(false); }
      }}>Find app</Button>
    </div>
    {lookupError ? <FormError>{lookupError}</FormError> : null}
    {!current ? <p role="status" className="flex items-center gap-2 text-sm text-neutral-500"><Spinner />Loading declarations…</p> : current.error ? <><FormError>{current.error}</FormError><Button size="sm" variant="secondary" onClick={() => { setCatalog(null); setRetry((value) => value + 1); }}>Try again</Button></> : !declarations.length ? <p className="text-sm text-neutral-500">This app hasn’t published any permission declarations.</p> : <>
      <Field id="permission-declaration" label="Permission">
        <select id="permission-declaration" disabled={busy || finding} value={selected?.id ?? ""} onChange={(event) => setSelection(event.target.value)} className={`${controlClassName} h-11 px-3`}>
          {groups.map((group) => <optgroup key={group} label={group}>{declarations.filter((item) => item.group === group).map((item) => <option key={item.id} value={item.id}>{item.title ?? item.name}</option>)}</optgroup>)}
        </select>
      </Field>
      {selected ? <BindingForm key={`${context}:${selected.id}`} declaration={selected} contextLabel={contexts.find((item) => item.id === context)?.label ?? "App"} initial={initial?.context === context ? initial : undefined} systemContext={systemContext} accountAuid={accountAuid} onClose={onClose} onShared={onShared} onPendingChange={setBusy} /> : null}
    </>}
    {!selected ? <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button> : null}
  </div>;
}
