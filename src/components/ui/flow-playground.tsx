"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Dices, Fingerprint, Lock, Mail, RefreshCw, UserRound } from "lucide-react";
import { switchAccountAction } from "@/app/actions/auth";
import { saveOauthConfigAction } from "@/app/developer/oauth/actions";
import { AuidField } from "@/components/ui/auid-field";
import { AxusIdButton } from "@/components/ui/axusid-button";
import { focusRing } from "@/lib/design";
import { cn, isRedirectError } from "@/lib/utils";
import type { AccountItemInfo } from "@/lib/user-profile";
import { parseRequestedScopes, type RequestedScope } from "@/lib/oauth/requested-scopes";

const availableScopes = [
  { id: "openid", label: "Identity", hint: "Required for this sign-in example", Icon: Fingerprint, locked: true },
  { id: "profile", label: "Profile", hint: "Name and username, when available", Icon: UserRound, locked: false },
  { id: "email", label: "Email", hint: "Synthetic compatibility address", Icon: Mail, locked: false },
  { id: "offline_access", label: "Refresh token", hint: "For continued server-side API access", Icon: RefreshCw, locked: false },
];

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function generatePkce() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto unavailable");
  }
  const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
  const verifier = random();
  const challenge = base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  return { verifier, challenge, state: random(), nonce: random() };
}

type Preset = {
  id: string;
  label: string;
  surface: "light" | "dark";
  tone: "white" | "black" | "grey";
  swatch: string;
  bar: string;
};

const presets: Preset[] = [
  { id: "light-white", label: "Light surface, white button", surface: "light", tone: "white", swatch: "#f4f4f5", bar: "#ffffff" },
  { id: "light-black", label: "Light surface, black button", surface: "light", tone: "black", swatch: "#f4f4f5", bar: "#0a0a0a" },
  { id: "dark-grey", label: "Dark surface, grey button", surface: "dark", tone: "grey", swatch: "#0a0a0a", bar: "#404040" },
  { id: "dark-black", label: "Dark surface, black button", surface: "dark", tone: "black", swatch: "#171717", bar: "#000000" },
];

const surfaceStyles = {
  light: {
    panel: "bg-neutral-100",
    heading: "text-neutral-500",
    faint: "text-neutral-400",
    chips: "bg-black/[0.06] text-neutral-700",
    urlBox: "bg-white",
    urlText: "text-neutral-600",
    details: "bg-white",
    detailsText: "text-neutral-600",
    detailsCode: "text-neutral-500",
    divider: "border-black/[0.06]",
    glow: "radial-gradient(420px 220px at 50% 0%, rgba(182,28,28,0.08), transparent 70%)",
  },
  dark: {
    panel: "bg-neutral-950",
    heading: "text-neutral-300",
    faint: "text-neutral-500",
    chips: "bg-white/10 text-neutral-200",
    urlBox: "bg-white/[0.06]",
    urlText: "text-neutral-300",
    details: "bg-white/[0.04]",
    detailsText: "text-neutral-300",
    detailsCode: "text-neutral-400",
    divider: "border-white/10",
    glow: "radial-gradient(420px 220px at 50% 0%, rgba(182,28,28,0.22), transparent 70%), radial-gradient(300px 200px at 90% 100%, rgba(255,255,255,0.05), transparent 70%)",
  },
};

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        <span className="font-mono font-normal text-neutral-400">{n}</span> {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function FlowPlayground({
  issuer,
  systemContext,
  accounts = [],
  developerClient = null,
  initialClientId = "",
}: {
  issuer: string;
  systemContext: string;
  accounts?: AccountItemInfo[];
  developerClient?: { auid: string; redirectUris: string[] } | null;
  initialClientId?: string;
}) {
  // Empty by default: the visitor chooses a client explicitly.
  const [clientId, setClientId] = useState(initialClientId);
  const [redirectUri, setRedirectUri] = useState("http://localhost:3000/callback");
  const [scopes, setScopes] = useState(["openid", "profile"]);
  const [requiredScopes, setRequiredScopes] = useState("");
  const [optionalScopes, setOptionalScopes] = useState("");
  const [conditionalScopes, setConditionalScopes] = useState("");
  const [presetId, setPresetId] = useState(presets[1].id);
  const preset = presets.find((p) => p.id === presetId) ?? presets[1];
  const tone = preset.tone;
  const s = surfaceStyles[preset.surface];
  const [values, setValues] = useState<{
    verifier: string;
    challenge: string;
    state: string;
    nonce: string;
  }>();
  const [supported, setSupported] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedUris, setSavedUris] = useState<string[]>(developerClient?.redirectUris ?? []);
  const [saveError, setSaveError] = useState("");
  const [savePending, startSaveTransition] = useTransition();
  const [switchError, setSwitchError] = useState("");
  const [switchPending, startSwitchTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    generatePkce().then(
      (v) => {
        if (alive) setValues(v);
      },
      () => {
        if (alive) setSupported(false);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const reroll = async () => {
    try {
      setValues(await generatePkce());
    } catch {
      setSupported(false);
    }
  };

  let validUri = false;
  try {
    const parsed = new URL(redirectUri);
    validUri =
      ["https:", "http:"].includes(parsed.protocol) &&
      !parsed.hash &&
      !parsed.username &&
      !parsed.password &&
      !redirectUri.includes("*") &&
      redirectUri === redirectUri.trim();
  } catch {}
  const validClient = /^[a-zA-Z0-9_.:-]+$/.test(clientId);
  let scopeError = "";
  let requested: RequestedScope[] = [];
  try {
    requested = parseRequestedScopes({
      scope: [...scopes, requiredScopes].join(" "),
      optional_scope: optionalScopes,
      conditional_scope: conditionalScopes,
    }, systemContext);
  } catch (error) {
    scopeError = error instanceof Error ? error.message : "Check the requested scopes.";
  }
  const scopeParams = {
    scope: requested.filter(({ mode }) => mode === "required").map(({ scope }) => scope).join(" "),
    ...(optionalScopes.trim() ? { optional_scope: requested.filter(({ mode }) => mode === "optional").map(({ scope }) => scope).join(" ") } : {}),
    ...(conditionalScopes.trim() ? { conditional_scope: requested.filter(({ mode }) => mode === "conditional").map(({ scope }) => scope).join(" ") } : {}),
  };
  const armed = validUri && validClient && !scopeError && !!values;
  const url = armed
    ? `${issuer}/authorize?${new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, ...scopeParams, state: values.state, nonce: values.nonce, code_challenge: values.challenge, code_challenge_method: "S256" })}`
    : "";

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard unavailable — values stay visible.
    }
  };

  const enteredOwner = accounts.find((a) => a.auid === clientId.trim()) ?? null;
  // Editable when the entered account is the active one: either it already has
  // an OAuth client (append to its URIs) or it has none yet (create it inline).
  const editable =
    enteredOwner !== null &&
    enteredOwner.isActive &&
    (developerClient === null || developerClient.auid === enteredOwner.auid);
  const registered =
    editable && validUri && savedUris.includes(redirectUri.trim());

  const addCallback = () => {
    // NOTE: developerClient may be null here — that is the create path.
    if (!editable || !validUri) return;
    const uri = redirectUri.trim();
    if (savedUris.includes(uri)) return;
    startSaveTransition(async () => {
      setSaveError("");
      const form = new FormData();
      form.set("redirectUris", [...savedUris, uri].join("\n"));
      try {
        const result = await saveOauthConfigAction({}, form);
        if (result.error) {
          setSaveError(result.error);
        } else {
          setSavedUris((prev) => (prev.includes(uri) ? prev : [...prev, uri]));
        }
      } catch (error) {
        // A login redirect must navigate, not masquerade as a save failure.
        if (isRedirectError(error)) throw error;
        console.error("[Playground] Saving callback failed:", error);
        setSaveError("Couldn’t save this callback. Try again from the developer portal.");
      }
    });
  };

  const switchToOwner = (auid: string) => {
    setSwitchError("");
    startSwitchTransition(async () => {
      const form = new FormData();
      form.set("auid", auid);
      // Come back with the client pre-selected so nothing has to be picked twice.
      form.set("next", `${window.location.pathname}?client_id=${encodeURIComponent(auid)}`);
      try {
        const result = await switchAccountAction(form);
        if (result?.error) setSwitchError(result.error);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        setSwitchError("Couldn’t switch accounts. Try again.");
      }
    });
  };

  const inputClass = cn(
    "mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-mono text-[13px] text-neutral-900 placeholder:text-neutral-400",
    focusRing,
  );

  if (!supported) {
    return (
      <p className="rounded-[20px] border border-black/[0.07] bg-white p-6 text-sm leading-relaxed text-neutral-500">
        Your browser blocked WebCrypto, so PKCE can’t be generated here. Use HTTPS or
        localhost, or follow the server example in the quickstart instead.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-black/[0.07] bg-white">
      <div className="grid lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-7 p-5 sm:p-7">
          <Step n="01" title="Your app">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <AuidField
                id="pg-client"
                value={clientId}
                onChange={setClientId}
                accounts={accounts}
                invalid={!!clientId && !validClient}
              />
              <label className="text-xs font-medium text-neutral-700">
                Callback URL
                <input
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={!validUri}
                  aria-describedby="playground-uri-help"
                  className={inputClass}
                />
              </label>
            </div>
            <p
              id="playground-uri-help"
              className={cn("mt-2.5 text-xs leading-relaxed", !validUri && redirectUri ? "text-brand" : "text-neutral-500")}
            >
              {validUri
                ? "Valid URL — if it isn’t saved yet, register it below."
                : "Enter a full HTTP(S) URL — no fragments, credentials, or wildcards."}
            </p>
            {editable ? (
              <div className="mt-3" aria-live="polite">
                {registered ? (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Registered for {enteredOwner?.username ? `@${enteredOwner.username}` : "your account"}
                  </p>
                ) : validUri ? (
                  <div>
                    <button
                      type="button"
                      onClick={addCallback}
                      disabled={savePending}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-800 transition-colors hover:border-black/20 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60",
                        focusRing,
                      )}
                    >
                      {savePending
                        ? "Saving…"
                        : developerClient
                          ? `Save this callback for ${enteredOwner?.username ? `@${enteredOwner.username}` : "your account"}`
                          : `Create OAuth client for ${enteredOwner?.username ? `@${enteredOwner.username}` : "your account"}`}
                    </button>
                    {saveError ? <p role="alert" className="mt-2 text-xs text-brand">{saveError}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : enteredOwner ? (
              <div className="mt-3">
                <p className="text-[11px] leading-relaxed text-neutral-400">
                  That client belongs to {enteredOwner.username ? `@${enteredOwner.username}` : "another account"}.
                </p>
                <button
                  type="button"
                  onClick={() => switchToOwner(enteredOwner.auid)}
                  disabled={switchPending}
                  className={cn(
                    "mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-800 transition-colors hover:border-black/20 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60",
                    focusRing,
                  )}
                >
                  {switchPending
                    ? "Switching…"
                    : `Switch to ${enteredOwner.username ? `@${enteredOwner.username}` : "that account"} to edit callbacks`}
                </button>
                {switchError ? <p role="alert" className="mt-2 text-xs text-brand">{switchError}</p> : null}
              </div>
            ) : null}
          </Step>

          <Step n="02" title="Scopes">
            <p className="mb-3 text-xs leading-relaxed text-neutral-500">Selected identity scopes go in mandatory <code>scope</code>. Use the fields below to choose how API access and optional identity data are requested.</p>
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Requested scopes">
              {availableScopes.map(({ id, label, hint, Icon, locked }) => {
                const on = scopes.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={locked}
                    onClick={() =>
                      setScopes((previous) =>
                        on ? previous.filter((value) => value !== id) : [...previous, id],
                      )
                    }
                    aria-pressed={on}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 text-left transition-all",
                      focusRing,
                      on
                        ? "border-brand/40 shadow-[0_0_0_1px_rgba(182,28,28,0.15)]"
                        : "border-black/[0.07] hover:border-black/[0.14]",
                      locked && "cursor-default",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        on ? "bg-brand/[0.08] text-brand" : "bg-neutral-100 text-neutral-400",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-900">
                        {label}
                        <code className="truncate text-[10px] font-normal text-neutral-500">
                          {id}
                        </code>
                        {locked ? <Lock aria-label="Always required" className="h-3 w-3 shrink-0 text-neutral-400" /> : null}
                      </span>
                      <span className="mt-1 block text-[11px] leading-5 text-neutral-500">
                        {hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-4">
              {[
                { id: "required", label: "Required AXUS scopes", value: requiredScopes, setValue: setRequiredScopes, placeholder: "app:5:posts.read", help: "Added to scope. Missing mandatory access stops sign-in with access_denied." },
                { id: "optional", label: "Optional scopes", value: optionalScopes, setValue: setOptionalScopes, placeholder: "app:5:posts.write", help: "Sent as optional_scope. The user can turn available scopes off; unavailable permissions are omitted." },
                { id: "conditional", label: "Conditional AXUS scopes", value: conditionalScopes, setValue: setConditionalScopes, placeholder: "app:5:posts.moderate", help: "Sent as conditional_scope. Required when held, omitted otherwise; AXUS permissions only." },
              ].map(({ id, label, value, setValue, placeholder, help }) => (
                <label key={id} className="block text-xs font-medium text-neutral-700">
                  {label}
                  <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} autoCapitalize="none" spellCheck={false} aria-describedby={`pg-${id}-help`} className={inputClass} />
                  <span id={`pg-${id}-help`} className="mt-1.5 block text-[11px] font-normal leading-5 text-neutral-500">{help}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">Separate scopes with spaces and put each scope in one list only. Replace the example app AUID with the permission’s declaration owner. Availability is checked during authorization.</p>
            {scopeError ? <p role="alert" className="mt-2 text-xs leading-relaxed text-brand">{scopeError}</p> : null}
          </Step>

          <Step n="03" title="Fresh values">
            <div className="flex items-center gap-2 rounded-xl bg-neutral-50 py-1.5 pl-3 pr-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-600" title={values?.verifier}>
                {values ? `verifier ${values.verifier.slice(0, 24)}…` : "generating…"}
              </code>
              {values ? (
                <button
                  type="button"
                  onClick={() => copy("verifier", values.verifier)}
                  aria-label="Copy code verifier"
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors",
                    focusRing,
                    copied === "verifier"
                      ? "text-emerald-600"
                      : "text-neutral-500 hover:bg-black/[0.05] hover:text-neutral-900",
                  )}
                >
                  {copied === "verifier" ? (
                    <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    <Copy aria-hidden className="h-3.5 w-3.5" />
                  )}
                  <span aria-live="polite">{copied === "verifier" ? "Copied" : "Copy"}</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={reroll}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-neutral-500 transition-colors hover:bg-black/[0.05] hover:text-neutral-900",
                  focusRing,
                )}
              >
                <Dices aria-hidden className="h-3.5 w-3.5" />
                Re-roll
              </button>
            </div>
          </Step>
        </div>

        <div className={cn("relative flex flex-col overflow-hidden p-5 transition-colors sm:p-7", s.panel)}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: s.glow }}
          />
          <div className="relative flex items-center justify-between gap-2">
            <p className={cn("inline-flex items-center gap-2 text-xs font-medium", preset.surface === "light" ? "text-neutral-600" : s.heading)}>
              <Image src="/axus-mark.png" alt="" aria-hidden width={869} height={905} className="h-[18px] w-auto" />
              Live request
            </p>
            <div className="flex items-center gap-1.5" role="group" aria-label="Background and button combination">
              {presets.map((p) => {
                const selected = p.id === presetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPresetId(p.id)}
                    aria-pressed={selected}
                    aria-label={p.label}
                    title={p.label}
                    className={cn(
                      "flex h-8 w-11 cursor-pointer items-center justify-center rounded-lg border transition-transform",
                      focusRing,
                      preset.surface === "light" ? "border-black/10" : "border-white/20",
                      selected ? "scale-105 ring-2 ring-brand/70" : "opacity-60 hover:opacity-100",
                    )}
                    style={{ background: p.swatch }}
                  >
                    <span
                      aria-hidden
                      className="h-2 w-6 rounded-full border border-black/10"
                      style={{ background: p.bar }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex min-h-44 flex-1 flex-col justify-center py-6">
            {url ? (
              <>
                <div className="flex flex-wrap gap-1.5" aria-live="polite" aria-label="Requested scopes">
                  {requested.map(({ scope, mode }) => (
                    <span key={scope} className={cn("rounded-full px-2.5 py-1 font-mono text-[11px]", s.chips)}>
                      {scope} <span className="font-sans opacity-70">· {mode}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <AxusIdButton href={url} tone={tone} />
                </div>
              </>
            ) : (
              <div className={cn("rounded-2xl border border-dashed px-4 py-8 text-center", preset.surface === "light" ? "border-black/15" : "border-white/15")}>
                <Image src="/axus-mark.png" alt="" aria-hidden width={869} height={905} className="mx-auto h-6 w-auto opacity-50" />
                <p className={cn("mt-3 text-sm", preset.surface === "light" ? "text-neutral-500" : "text-neutral-400")}>
                  {!values
                    ? "Generating fresh values…"
                    : scopeError ? "Correct the scope lists to generate the request." : "Enter your AUID and a valid callback URL to arm the request."}
                </p>
              </div>
            )}
          </div>

          {url && values ? (
            <div className={cn("relative space-y-3 border-t pt-4", s.divider)}>
              <div className={cn("flex items-center gap-1.5 rounded-xl py-1.5 pl-3 pr-1.5", s.urlBox)}>
                <code className={cn("min-w-0 flex-1 truncate font-mono text-xs", s.urlText)} title={url}>
                  {url}
                </code>
                <button
                  type="button"
                  onClick={() => copy("url", url)}
                  aria-label="Copy authorization URL"
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                    focusRing,
                    preset.surface === "light"
                      ? "text-neutral-500 hover:bg-black/[0.05] hover:text-neutral-900"
                      : "text-neutral-400 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {copied === "url" ? (
                    <Check aria-hidden className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy aria-hidden className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <details className={cn("rounded-xl px-3 py-2", s.details)}>
                <summary className={cn("cursor-pointer text-[13px] font-medium", preset.surface === "light" ? "text-neutral-700 hover:text-neutral-950" : cn(s.detailsText, "hover:text-white"))}>
                  Inspect the values
                </summary>
                <pre className={cn("mt-2 max-h-44 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap break-all", s.detailsCode)}>
                  {`verifier = ${values.verifier}\nchallenge = ${values.challenge}\nstate = ${values.state}\nnonce = ${values.nonce}`}
                </pre>
              </details>
              <p className={cn("text-xs leading-relaxed", s.faint)}>
                Opens real authorization in a new tab. Your app’s callback needs the
                transaction that generated it — this page sets no session or cookies.
              </p>
            </div>
          ) : (
            <p className={cn("relative border-t pt-4 text-xs leading-relaxed", s.divider, s.faint)}>
              Nothing here is sent anywhere until you press the button.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
