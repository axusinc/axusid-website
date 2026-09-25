"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Braces, Check, Copy, Sparkles } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { focusRing } from "@/lib/design";
import { cn } from "@/lib/utils";

const stacks = [
  "Next.js App Router",
  "React with an existing backend",
  "Python",
  "PHP / Laravel",
  "another stack (ask me which)",
];

function buildConfig(issuer: string, client: string, redirect: string) {
  return `AXUS_ISSUER=${JSON.stringify(issuer)}\nAXUS_CLIENT_ID=${JSON.stringify(client.trim() || "YOUR_AUID")}\nAXUS_REDIRECT_URI=${JSON.stringify(redirect)}`;
}

function buildPrompt(issuer: string, stack: string, config: string) {
  return `Implement “Continue with AXUS ID” in my ${stack} app. Inspect the existing authentication and session architecture first. Preserve existing sign-in methods and use the project's conventions.\n\nConfiguration:\n${config}\n\nProvider contract:\n- Discovery: ${issuer}/.well-known/openid-configuration\n- Authorization Code flow only. Public client, token_endpoint_auth_method=none, no client secret. PKCE S256 is mandatory. client_id is my AXUS account's AUID. I must register the exact redirect URI in ${issuer}/account?section=developer. Do not invent an AUID.\n- GET ${issuer}/authorize: response_type=code, client_id, redirect_uri, scope=openid profile, fresh state, nonce, code_challenge and code_challenge_method=S256. Generate a random 32-byte base64url verifier; challenge is base64url(SHA256(verifier)).\n- Bind state, nonce and verifier to the initiating browser session in short-lived server storage. Consume the transaction once on callback, including error paths. Validate state before handling provider errors. Never share one transaction across users.\n- POST ${issuer}/oauth/token with form-encoded grant_type=authorization_code, client_id, redirect_uri, code, code_verifier. Codes expire after five minutes and are single-use. Do not retry a failed exchange with the same code.\n- Verify id_token using a maintained JWT/OIDC library and ${issuer}/.well-known/jwks.json: RS256, issuer, audience=client_id, expiry, required sub and nonce matching the transaction. Decoding is not verification.\n- GET ${issuer}/oauth/userinfo with Authorization: Bearer access_token. Check status and require userinfo.sub === verified ID token sub. Profile fields can be absent.\n- Key local users by (issuer, sub). Email, if requested, is synthetic (<auid>@amail.com), not a verified contact address. Never merge accounts by email.\n- Create or rotate my app's own server session. Keep provider tokens server-side; set an HttpOnly, SameSite=Lax cookie, Secure in production. Use a fixed safe post-login destination.\n- Token response also includes axus_access_token for native AXUS APIs; do not use it as the ID token. OIDC-only responses omit scope; when present, scope lists AXUS permission keys, not the full OIDC scopes.\n- Request offline_access only for background access. Refresh tokens rotate; store the replacement atomically and serialize refreshes. Reuse outside the 30-second grace period revokes the authorization.\n- No browser CORS support is promised. Use my backend for token and userinfo requests. If I have no backend, explain the required architecture before implementation.\n\nDeliver the actual integration, including loading, cancellation and retry UI, and the AXUS button (${issuer}/axus-mark.png). Clearly identify any session/database adapters I must supply. Test success, denied consent, missing/mismatched state, expired/replayed code, invalid ID token, and subject mismatch. Do not claim completion while a placeholder session implementation remains.\n\nDocs: ${issuer}/developers/quickstart\nReference: ${issuer}/developers/reference`;
}

export function IntegrationBuilder({ issuer }: { issuer: string }) {
  const [mode, setMode] = useState<"code" | "ai">("code");
  const [client, setClient] = useState("");
  const [redirect, setRedirect] = useState("http://localhost:3000/api/auth/axus/callback");
  const [stack, setStack] = useState(stacks[0]);
  const [copied, setCopied] = useState(false);

  let validRedirect = false;
  try {
    const url = new URL(redirect);
    validRedirect =
      ["http:", "https:"].includes(url.protocol) &&
      !url.hash &&
      !url.username &&
      !url.password &&
      !redirect.includes("*") &&
      redirect === redirect.trim();
  } catch {}
  const validClient = !client || /^[a-zA-Z0-9_.:-]+$/.test(client);
  const valid = validRedirect && validClient;
  const config = buildConfig(issuer, client, redirect);
  const prompt = buildPrompt(issuer, stack, config);
  const encoded = encodeURIComponent(prompt);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the brief is still readable in the preview.
    }
  };

  const inputClass = cn(
    "mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-mono text-xs text-neutral-900 placeholder:text-neutral-400",
    focusRing,
  );

  return (
    <div className="mt-8 overflow-hidden rounded-[20px] border border-black/[0.07] bg-white">
      <div className="flex flex-wrap gap-1 border-b border-black/[0.06] bg-neutral-50/70 p-2" role="group" aria-label="Integration approach">
        {(
          [
            { id: "code", title: "Build it yourself", icon: Braces },
            { id: "ai", title: "Build with AI", icon: Sparkles },
          ] as const
        ).map(({ id, title, icon: Icon }) => (
          <button
            type="button"
            key={id}
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
              focusRing,
              mode === id
                ? "bg-white text-neutral-950 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06]"
                : "text-neutral-500 hover:text-neutral-900",
            )}
          >
            <Icon size={16} aria-hidden />
            {title}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
              Your app. Your starting point.
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">
              Fill in your public settings to tailor{" "}
              {mode === "ai" ? "the agent brief" : "the configuration"}.
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-500 sm:block">
            Stays in this tab
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-neutral-700">
            Client ID · your AUID
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Paste from Developer settings"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!validClient}
              className={inputClass}
            />
          </label>
          <label className="text-xs font-medium text-neutral-700">
            Callback URL
            <input
              value={redirect}
              onChange={(e) => setRedirect(e.target.value)}
              aria-invalid={!validRedirect}
              aria-describedby="redirect-help"
              autoCapitalize="none"
              spellCheck={false}
              className={inputClass}
            />
          </label>
        </div>
        <p
          id="redirect-help"
          className={cn("mt-3 text-xs leading-relaxed", valid ? "text-neutral-500" : "text-brand")}
        >
          {!validClient
            ? "Use your AUID, without spaces or quotes."
            : !validRedirect
              ? "Enter a full HTTP(S) callback URL without fragments, credentials or wildcards."
              : "Register this exact callback URL in the developer console. Use HTTPS in production."}
        </p>
        {mode === "ai" && (
          <label className="mt-5 block text-xs font-medium text-neutral-700">
            Your stack
            <select
              value={stack}
              onChange={(e) => setStack(e.target.value)}
              className={cn("ml-3 rounded-xl border border-black/10 bg-white p-2 text-sm text-neutral-900", focusRing)}
            >
              {stacks.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}
        {valid && (
          <div className="mt-5">
            {mode === "code" ? (
              <CodeBlock label=".env.local · in your app" code={config} />
            ) : (
              <>
                <p className="mb-3 text-xs leading-relaxed text-neutral-500">
                  Paste this brief into your coding agent. It includes the
                  provider contract, verification rules and acceptance tests.
                  Review its changes before shipping.
                </p>
                <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-neutral-950 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
                    <span className="text-xs font-medium text-neutral-300">Agent integration brief</span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: "ChatGPT", href: `https://chatgpt.com/?q=${encoded}` },
                        { label: "Claude", href: `https://claude.ai/new?q=${encoded}` },
                      ].map(({ label, href }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/10 hover:text-white",
                            focusRing,
                          )}
                        >
                          Open in {label}
                          <ArrowUpRight aria-hidden className="h-3 w-3" />
                        </a>
                      ))}
                      <button
                        type="button"
                        onClick={copy}
                        className={cn(
                          "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors",
                          focusRing,
                          copied ? "text-emerald-400" : "text-neutral-300 hover:bg-white/10 hover:text-white",
                        )}
                        aria-label="Copy agent brief to clipboard"
                      >
                        {copied ? (
                          <Check aria-hidden className="h-3 w-3" strokeWidth={2.5} />
                        ) : (
                          <Copy aria-hidden className="h-3 w-3" />
                        )}
                        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                  <details className="px-4 py-3">
                    <summary className="cursor-pointer text-[13px] font-medium text-neutral-300 hover:text-white">
                      Review the full brief
                    </summary>
                    <pre className="mt-3 max-h-72 overflow-y-auto font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-neutral-300">
                      {prompt}
                    </pre>
                  </details>
                </div>
              </>
            )}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/account?section=developer"
            className="text-xs font-medium text-neutral-600 underline underline-offset-4 hover:text-neutral-950"
          >
            Where do I find my AUID?
          </Link>
          <Link
            href="/developers/quickstart"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
          >
            {mode === "ai" ? "Understand the implementation" : "Follow the implementation"}
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
