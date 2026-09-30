import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AxusIdButton } from "@/components/ui/axusid-button";
import { CodeBlock } from "@/components/ui/code-block";
import { FlowPlayground } from "@/components/ui/flow-playground";
import { SnippetTabs, type Snippet } from "@/components/ui/snippet-tabs";
import { getAuthSdk } from "@/lib/auth-graphql";
import { getOAuthClient } from "@/lib/oauth/clients";
import { getIssuer } from "@/lib/oauth/constants";
import { getValidMultiSession } from "@/lib/session-access";
import { fetchAccountsDisplayInfo } from "@/lib/user-profile";
import { EnvConfig } from "../env-config";
import { beginExample, exchangeExample, verifyExample } from "./examples";

export const metadata: Metadata = {
  title: "Add AXUS ID sign-in",
  description:
    "A complete walkthrough of PKCE, callback handling, verified identity and the session adapter your app needs.",
};

export default async function QuickstartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const issuer = getIssuer();
  const params = await searchParams;
  const requestedClient =
    typeof params.client_id === "string" ? params.client_id : "";
  const multiSession = await getValidMultiSession();
  const accounts = multiSession
    ? await fetchAccountsDisplayInfo(
        multiSession.accounts,
        multiSession.activeAuid,
        getAuthSdk,
      )
    : [];
  const activeAccount = accounts.find((a) => a.isActive) ?? null;
  const activeClient = activeAccount ? await getOAuthClient(activeAccount.auid) : undefined;
  const developerClient =
    activeAccount && activeClient
      ? { auid: activeAccount.auid, redirectUris: activeClient.redirectUris }
      : null;

  const startSnippets: Snippet[] = [
    {
      id: "html",
      label: "HTML",
      code: `<a id="axus-login" href="#">Continue with AXUS ID</a>\n<script>\nconst ISSUER = "${issuer}";\nconst CLIENT_ID = "YOUR_AUID";\nconst REDIRECT_URI = "https://app.example.com/auth/callback";\nconst b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");\ndocument.getElementById("axus-login").addEventListener("click", async (e) => {\n  e.preventDefault();\n  const verifier = b64(crypto.getRandomValues(new Uint8Array(32)));\n  const challenge = b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));\n  const state = b64(crypto.getRandomValues(new Uint8Array(16)));\n  sessionStorage.setItem("axus_verifier", verifier);\n  sessionStorage.setItem("axus_state", state);\n  const q = new URLSearchParams({ response_type: "code", client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, scope: "openid profile", state, code_challenge: challenge, code_challenge_method: "S256" });\n  location.href = ISSUER + "/authorize?" + q;\n});\n</script>\n<!-- Exchange the code from your backend (step 03), never in this script. -->`,
    },
    {
      id: "react",
      label: "React",
      code: `const ISSUER = "${issuer}";\nconst CLIENT_ID = "YOUR_AUID";\nconst REDIRECT_URI = "https://app.example.com/auth/callback";\n\nasync function login() {\n  const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");\n  const verifier = b64(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);\n  const challenge = b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));\n  const state = b64(crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer);\n  sessionStorage.setItem("axus_verifier", verifier);\n  sessionStorage.setItem("axus_state", state);\n  const q = new URLSearchParams({ response_type: "code", client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, scope: "openid profile", state, code_challenge: challenge, code_challenge_method: "S256" });\n  location.href = ISSUER + "/authorize?" + q;\n}\n// Exchange the code from your backend (step 03), never in the component.`,
    },
    {
      id: "nextjs",
      label: "Next.js",
      code: `// app/api/auth/axus/login/route.ts — exchange stays server-side (step 03)\nimport { randomBytes, createHash } from "node:crypto";\nimport { NextResponse } from "next/server";\n\nconst ISSUER = "${issuer}";\nconst b64url = (b: Buffer) => b.toString("base64").replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");\n\nexport async function GET() {\n  const verifier = b64url(randomBytes(32));\n  const challenge = b64url(createHash("sha256").update(verifier).digest());\n  const state = b64url(randomBytes(16));\n  const q = new URLSearchParams({ response_type: "code", client_id: process.env.AXUS_CLIENT_ID!, redirect_uri: process.env.AXUS_REDIRECT_URI!, scope: "openid profile", state, code_challenge: challenge, code_challenge_method: "S256" });\n  const res = NextResponse.redirect(ISSUER + "/authorize?" + q);\n  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };\n  res.cookies.set("axus_verifier", verifier, opts);\n  res.cookies.set("axus_state", state, opts);\n  return res;\n}`,
    },
  ];
  return (
    <>
      <p className="docs-eyebrow">Quickstart · Authorization Code + PKCE</p>
      <h1>
        From button
        <br />
        to signed-in user.
      </h1>
      <p className="docs-lead">
        The full path, with each responsibility made explicit. AXUS ID
        authenticates the user. Your app verifies the response and creates its
        own session.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-xs text-neutral-600">
        <span className="rounded-full border border-black/10 bg-white px-3 py-1.5">
          Server-side TypeScript
        </span>
        <span className="rounded-full border border-black/10 bg-white px-3 py-1.5">
          Node.js + jose
        </span>
        <span className="rounded-full border border-black/10 bg-white px-3 py-1.5">
          No AXUS SDK
        </span>
      </div>
      <div className="docs-note">
        <strong>Before you begin.</strong> You need a backend and a session
        store. The snippets below form one authentication helper; you must
        connect it to your routes, database and session library. Using another
        stack? The HTTP flow is the same.{" "}
        <Link className="docs-link" href="/developers">
          Generate an AI brief
        </Link>{" "}
        tailored to your app, or configure your existing OIDC library with
        discovery and public-client authentication.
      </div>

      <section id="register" className="docs-section">
        <p className="docs-eyebrow">01 / Configure</p>
        <h2>Register the return address.</h2>
        <p>
          Open{" "}
          <Link href="/account?section=developer" className="docs-link">
            Developer settings
          </Link>
          , copy your account’s AUID, and register your app’s callback URL. This
          AUID becomes <code>client_id</code>. Register development and
          production URLs separately; the protocol, host, port, path and
          trailing slash must match.
        </p>
        <div className="mt-5">
          <EnvConfig issuer={issuer} accounts={accounts} />
        </div>
        <p>
          If your app already uses port 3000, use its actual callback port. The
          issuer points to AXUS ID; the redirect URI points to your app. Use
          HTTPS in production.
        </p>
        <details className="mt-5 rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-medium text-neutral-900">
            What are issuer, client ID and redirect URI?
          </summary>
          <dl className="mt-4 space-y-3 text-sm leading-7 text-neutral-600">
            <div>
              <dt className="font-semibold text-neutral-900">Issuer</dt>
              <dd>
                The identity provider you trust. It must match the ID token’s{" "}
                <code>iss</code> claim exactly.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-900">Client ID</dt>
              <dd>
                The public identifier for your app’s authorization
                configuration. It is not a password.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-neutral-900">Redirect URI</dt>
              <dd>
                Your backend route that receives the user after sign-in.
                Registering it prevents codes being sent to an arbitrary
                destination.
              </dd>
            </div>
          </dl>
        </details>
      </section>

      <section id="authorize" className="docs-section">
        <p className="docs-eyebrow">02 / Send the user to AXUS ID</p>
        <h2>Create a fresh sign-in transaction.</h2>
        <p>
          Install <code>jose</code> in your app (<code>npm install jose</code>).
          Add the following helper on your server. Each attempt gets a random
          state, nonce and verifier. The SHA-256 challenge can go in the URL;
          the verifier stays on your server.
        </p>
        <div className="mt-5">
          <CodeBlock
            label="lib/axus-auth.ts · part 1 of 3"
            code={beginExample}
          />
        </div>
        <div className="docs-note">
          <strong>Wire your login route:</strong> call{" "}
          <code>beginSignIn()</code>, store the transaction with a ten-minute
          expiry, bound to the initiating browser session and state, then
          redirect to the returned URL. Use an opaque HttpOnly, SameSite=Lax
          cookie to identify that session, with Secure in production. Never put
          the transaction in a shared global variable.
        </div>
        <div className="mt-6">
          <h3 className="text-base font-semibold tracking-tight text-neutral-950">
            The same redirect in your stack
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            These start the flow only. The exchange, verification, and session
            below stay server-side regardless of stack.
          </p>
          <div className="mt-4">
            <SnippetTabs snippets={startSnippets} defaultId="nextjs" />
          </div>
        </div>
        <p>
          Point the “Continue with AXUS ID” button to that login route. Use the{" "}
          <Link className="docs-link" href="/brand">
            button and brand assets
          </Link>{" "}
          to match your existing sign-in options.
        </p>
        <div className="mt-5 grid max-w-md gap-2.5 rounded-2xl border border-black/[0.06] bg-neutral-50 p-4">
          <p className="text-xs font-medium text-neutral-500">
            White or black on light surfaces — same size as neighboring buttons
          </p>
          <AxusIdButton href="#authorize" tone="white" />
          <AxusIdButton href="#authorize" tone="black" />
        </div>
        <div className="mt-8">
          <h3 className="text-base font-semibold tracking-tight text-neutral-950">
            Try it live
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Configure a request and press the real button into the flow. Locally, the
            seeded <code>axusid-dev</code> client accepts{" "}
            <code>http://localhost:3000/callback</code> after{" "}
            <code>npm run db:seed</code>.
          </p>
          <div className="mt-4">
            <FlowPlayground issuer={issuer} accounts={accounts} initialClientId={requestedClient} developerClient={developerClient} key={activeAccount?.auid ?? "signed-out"} />
          </div>
        </div>
        <details className="mt-5 rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-5">
          <summary className="cursor-pointer text-sm font-medium text-neutral-900">
            Why three random values?
          </summary>
          <p className="mt-3 text-sm leading-7 text-neutral-600">
            <strong>State</strong> binds the callback to the browser that
            started sign-in. <strong>PKCE</strong> binds the authorization code
            to the app holding the verifier. <strong>Nonce</strong> binds the ID
            token to this particular sign-in attempt. They do different jobs;
            keep all three.
          </p>
        </details>
      </section>

      <section id="callback" className="docs-section">
        <p className="docs-eyebrow">03 / Handle the return</p>
        <h2>Consume the transaction. Exchange the code.</h2>
        <p>
          On your registered callback route, load and atomically delete the
          transaction belonging to this browser and the returned state. Missing
          transaction? Start over. Then pass it and the callback URL to{" "}
          <code>exchangeCode()</code>. Handle thrown errors with a friendly
          retry page; do not create a session on failure.
        </p>
        <div className="mt-5">
          <CodeBlock
            label="lib/axus-auth.ts · part 2 of 3"
            code={exchangeExample}
          />
        </div>
        <p>
          Codes expire after five minutes and are single-use. A failed exchange
          can consume the code too, so start a new sign-in instead of repeatedly
          submitting the old code. Clear the transaction on cancellation and
          errors as well as success.
        </p>
        <div className="docs-note">
          <strong>Browser + backend boundary:</strong> send token and userinfo
          requests from your backend. Browser CORS support is not advertised by
          these endpoints. A frontend-only button snippet is not a complete
          authentication implementation.
        </div>
      </section>

      <section id="verify" className="docs-section">
        <p className="docs-eyebrow">04 / Trust, then use</p>
        <h2>Verify the identity, not just the JSON.</h2>
        <p>
          Verify the ID token’s signature, issuer, audience, expiry and nonce
          before trusting its subject. The example also reads userinfo and
          checks that both responses identify the same person. Decoding a JWT by
          itself does not verify it.
        </p>
        <div className="mt-5">
          <CodeBlock
            label="lib/axus-auth.ts · part 3 of 3"
            code={verifyExample}
          />
        </div>
        <p>
          The <code>sub</code> claim is the user’s AUID. Name and username can
          be absent. The example requests only <code>openid profile</code>; add
          other scopes only when your app needs them. Unprefixed permission keys use the AXUS ID system context; request another app’s permission as <code>app:&lt;app AUID&gt;:&lt;permission key&gt;</code>. See the <Link href="/developers/permissions#oauth" className="docs-link">permission guide</Link>.
        </p>
      </section>

      <section id="session" className="docs-section">
        <p className="docs-eyebrow">05 / Finish in your app</p>
        <h2>Create your session.</h2>
        <p>
          Call <code>verifyIdentity(tokens, transaction)</code> after the
          exchange. Use the returned <code>issuer</code> and{" "}
          <code>subject</code> as a unique external identity in your database.
          Then create or rotate a session using your app’s existing session
          library.
        </p>
        <ol className="mt-5 space-y-4 text-sm leading-7 text-neutral-600">
          <li>
            <strong className="text-neutral-900">
              1. Resolve the local user.
            </strong>{" "}
            Look up the (issuer, subject) pair, or create a new local user.
            Enforce uniqueness in your database.
          </li>
          <li>
            <strong className="text-neutral-900">
              2. Start a new session.
            </strong>{" "}
            Store session data on your server. Return only an opaque session
            cookie: HttpOnly, SameSite=Lax, Secure in production, with an
            explicit lifetime.
          </li>
          <li>
            <strong className="text-neutral-900">
              3. Finish the redirect.
            </strong>{" "}
            Redirect to a fixed safe page in your app. Keep codes and tokens out
            of URLs, analytics, logs and browser storage.
          </li>
          <li>
            <strong className="text-neutral-900">
              4. Keep only what you need.
            </strong>{" "}
            For sign-in alone, you do not need a refresh token. Store provider
            tokens securely on the server only if your app will call AXUS APIs
            later.
          </li>
        </ol>
        <div className="docs-note">
          <strong>Account linking is a separate action.</strong> Never merge
          local accounts using the synthetic email claim, a name or username.
          Require an authenticated user and explicit confirmation to connect
          AXUS ID to an existing account.
        </div>
        <h3 className="mt-8 text-base font-semibold">
          Before you call it done
        </h3>
        <p className="mt-2 text-sm leading-7 text-neutral-500">
          Exercise these paths in your own app. A successful token exchange
          alone is not a completed integration.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            "A new user can sign in and gets a local session.",
            "A returning user reaches the same local account.",
            "Denied consent offers a safe way to try again.",
            "Missing or mismatched state never creates a session.",
            "Expired or replayed codes require a fresh sign-in.",
            "Invalid signatures, nonce or subject mismatches fail closed.",
            "Two tabs keep separate sign-in transactions.",
            "Local logout destroys your app’s session.",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-xl border border-black/[0.07] bg-white p-3 text-xs leading-6 text-neutral-600"
            >
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
              />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-neutral-200 pt-6">
        <Link href="/developers/troubleshooting" className="docs-link text-sm">
          Something went wrong?
        </Link>
        <Link
          href="/developers/reference"
          className="inline-flex items-center gap-2 text-sm font-medium"
        >
          Explore the API reference <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </>
  );
}
