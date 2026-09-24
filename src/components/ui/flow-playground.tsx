"use client";

import { useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

const availableScopes = [
  {
    id: "openid",
    label: "Identity",
    hint: "Required for this sign-in example",
  },
  {
    id: "profile",
    label: "Profile",
    hint: "Name and username, when available",
  },
  { id: "email", label: "Email", hint: "Synthetic compatibility address" },
  {
    id: "offline_access",
    label: "Refresh token",
    hint: "For continued server-side API access",
  },
];
const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export function FlowPlayground({ issuer }: { issuer: string }) {
  const [clientId, setClientId] = useState("");
  const [redirectUri, setRedirectUri] = useState(
    "http://localhost:3000/api/auth/axus/callback",
  );
  const [scopes, setScopes] = useState(["openid", "profile"]);
  const [values, setValues] = useState<{
    verifier: string;
    challenge: string;
    state: string;
    nonce: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
  const ready = validUri && validClient;
  const url =
    ready && values
      ? `${issuer}/authorize?${new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, scope: scopes.join(" "), state: values.state, nonce: values.nonce, code_challenge: values.challenge, code_challenge_method: "S256" })}`
      : "";

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const random = () =>
        base64url(crypto.getRandomValues(new Uint8Array(32)));
      const verifier = random();
      const challenge = base64url(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(verifier),
          ),
        ),
      );
      setValues({ verifier, challenge, state: random(), nonce: random() });
    } catch {
      setError(
        "Your browser could not generate PKCE. Use HTTPS or localhost with WebCrypto enabled, or use the server example in the quickstart.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-xs font-medium text-neutral-700">
          Client ID (your AUID)
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Your registered AUID"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!clientId && !validClient}
            className="mt-2 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 font-mono text-xs"
          />
        </label>
        <label className="text-xs font-medium text-neutral-700">
          Registered callback URL
          <input
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!validUri}
            aria-describedby="playground-uri-help"
            className="mt-2 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 font-mono text-xs"
          />
        </label>
      </div>
      <p
        id="playground-uri-help"
        className={`mt-3 text-xs leading-6 ${!validUri ? "text-brand" : "text-neutral-500"}`}
      >
        {validUri
          ? "The callback must match a URL saved in your developer console, exactly."
          : "Use a full HTTP(S) URL without spaces at either end, credentials, fragments or wildcards."}
      </p>
      <fieldset className="mt-6">
        <legend className="mb-3 text-xs font-medium text-neutral-700">
          Requested scopes
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {availableScopes.map((scope) => (
            <label
              key={scope.id}
              className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3"
            >
              <input
                type="checkbox"
                checked={scopes.includes(scope.id)}
                disabled={scope.id === "openid"}
                onChange={(e) =>
                  setScopes((previous) =>
                    e.target.checked
                      ? [...previous, scope.id]
                      : previous.filter((value) => value !== scope.id),
                  )
                }
                className="mt-1 accent-red-700"
              />
              <span>
                <span className="block text-xs font-medium">
                  {scope.label}{" "}
                  <code className="ml-1 text-[10px] font-normal text-neutral-500">
                    {scope.id}
                  </code>
                </span>
                <span className="mt-1 block text-[11px] leading-5 text-neutral-500">
                  {scope.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!ready || busy}
          onClick={generate}
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw aria-hidden size={14} />
          {busy
            ? "Generating…"
            : values
              ? "Generate fresh values"
              : "Generate request"}
        </button>
        <span role="status" className="text-xs text-neutral-500">
          {!ready
            ? "Enter your AUID and a valid callback URL to begin."
            : values
              ? "Values stay in this page until you reload or regenerate."
              : "Fresh verifier, challenge, state and nonce."}
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-brand">
          {error}
        </p>
      )}
      {url && values && (
        <div className="mt-6 space-y-4">
          <CodeBlock label="Authorization URL" code={url} />
          <details className="rounded-lg border border-neutral-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Inspect the transaction values
            </summary>
            <div className="mt-4">
              <CodeBlock
                label="Development values · do not reuse in production"
                code={`code_verifier = ${values.verifier}\ncode_challenge = ${values.challenge}\nstate = ${values.state}\nnonce = ${values.nonce}`}
              />
            </div>
            <p className="mt-3 text-xs leading-6 text-neutral-500">
              The verifier is retained by the app. Only its SHA-256 challenge is
              sent in the authorization URL.
            </p>
          </details>
          <p className="text-xs leading-6 text-neutral-600">
            Opening the URL starts real authorization in a new tab. Your app’s
            callback will need the transaction that generated it; this page does
            not set your app’s session or cookies.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-medium"
          >
            Open authorization in a new tab{" "}
            <ArrowUpRight size={14} aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}
