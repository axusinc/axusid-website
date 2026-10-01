import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyField } from "@/components/ui/copy-field";
import { getIssuer } from "@/lib/oauth/constants";

export const metadata: Metadata = {
  title: "OAuth and OIDC reference",
  description:
    "AXUS ID OAuth endpoints, parameters, token fields and claims. Authorization Code with PKCE, OpenID Connect, revocation and introspection.",
};

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-8 text-xl font-semibold tracking-tight text-neutral-950"
    >
      <a href={`#${id}`} className="hover:underline">
        {children}
      </a>
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-relaxed text-neutral-500">{children}</p>
  );
}

function M({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[13px] text-neutral-800">{children}</code>
  );
}

function Table({
  head,
  rows,
}: {
  head: [string, string, string];
  rows: [string, string, string][];
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${head[0]} table, scroll horizontally for more`}
      className="mt-4 overflow-x-auto rounded-xl border border-black/[0.07]"
    >
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-black/[0.07] bg-neutral-50">
            {head.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.05] bg-white">
          {rows.map(([a, b, c]) => (
            <tr key={a}>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-neutral-900">
                {a}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-neutral-600">
                {b}
              </td>
              <td className="px-4 py-2.5 text-[13px] leading-relaxed text-neutral-600">
                {c}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReferencePage() {
  const issuer = getIssuer();

  return (
    <>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
        Reference
      </p>
      <h1 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
        The contract behind the code.
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-neutral-500">
        This page matches the implementation — the sign-in half of AXUS ID
        (OAuth2/OIDC endpoints). The other half, every engine function behind
        the login, lives in the{" "}
        <Link
          href="/developers/api"
          className="font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-950"
        >
          GraphQL API explorer
        </Link>
        . Worked examples are in the{" "}
        <Link
          href="/developers/quickstart"
          className="font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-950"
        >
          quickstart
        </Link>
        . Client IDs are AUIDs. Token, userinfo and introspection responses use{" "}
        <M>Cache-Control: no-store</M>.
      </p>

      <section
        aria-label="Endpoints"
        className="mt-8 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8"
      >
        <Table
          head={["Endpoint", "Method", "Purpose"]}
          rows={[
            [
              "/authorize",
              "GET",
              "Start the Authorization Code flow with PKCE",
            ],
            ["/oauth/token", "POST", "Exchange a code; redeem a refresh token"],
            [
              "/oauth/userinfo",
              "GET / POST",
              "Profile claims for the access token",
            ],
            ["/oauth/revoke", "POST", "End the whole authorization (RFC 7009)"],
            [
              "/oauth/introspect",
              "POST",
              "Check an opaque access token (RFC 7662)",
            ],
            [
              "/oauth/graphql",
              "POST",
              "Proxy AXUS GraphQL using an OAuth access token",
            ],
            ["/gravatar/<email_hash>", "GET", "Gravatar-compatible account avatar"],
            ["/.well-known/openid-configuration", "GET", "Discovery document"],
            [
              "/.well-known/jwks.json",
              "GET",
              "Public keys for ID and JWT access tokens",
            ],
          ]}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <CopyField label="Issuer" value={issuer} />
          <CopyField
            label="Discovery document"
            value={`${issuer}/.well-known/openid-configuration`}
          />
        </div>
      </section>

      <section
        aria-label="Authorize"
        className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8"
      >
        <H id="authorize">GET /authorize</H>
        <P>
          Authorization Code flow with mandatory PKCE (S256) — no client secrets
          exist. Details per parameter:
        </P>
        <Table
          head={["Parameter", "Required", "Notes"]}
          rows={[
            ["response_type", "yes", "Must be code"],
            ["client_id", "yes", "Your account’s AUID"],
            ["redirect_uri", "yes", "Must be a registered URI, byte for byte"],
            [
              "code_challenge",
              "yes",
              "S256 output: 43-character unpadded base64url SHA-256 digest",
            ],
            ["code_challenge_method", "yes", "Must be S256"],
            ["scope", "no", "Mandatory, space-separated; defaults to openid"],
            ["optional_scope", "no", "AXUS ID extension: scopes the user can toggle; unavailable permissions are omitted"],
            ["conditional_scope", "no", "AXUS ID extension: AXUS permissions required when held, omitted otherwise"],
            [
              "state",
              "recommended",
              "Returned unchanged; generate a fresh value and require it on callback",
            ],
            [
              "nonce",
              "recommended",
              "Echoed into the ID token when openid is granted; verify against the transaction",
            ],
            ["prompt", "no", "login, select_account, consent, or none; none cannot be combined with other values"],
          ]}
        />
        <P>
          Scopes are the four OIDC scopes plus declared AXUS permission keys. Unprefixed
          keys use system context; use <M>app:&lt;app AUID&gt;:&lt;permission key&gt;</M> for another
          app’s context. Parameter wildcards require declaration support; bare <M>*</M>
          requests all permissions the caller holds in one context. Legacy prefix
          wildcards are rejected. The user reviews engine-provided descriptions on
          the consent screen. See <Link href="/developers/permissions#oauth" className="docs-link">permission scopes and contexts</Link>.
        </P>
        <P>
          A scope must appear in only one list. Optional scopes can include OIDC scopes;
          conditional scopes support AXUS permissions only. If <M>scope</M> is omitted,
          it defaults to <M>openid</M>. Pass <M>optional_scope</M> and <M>conditional_scope</M>
          as additional authorization parameters when using an OIDC library.
        </P>
        <div className="mt-4">
          <CodeBlock label="Three permission modes · add to your PKCE authorization request" code={JSON.stringify({
            scope: "openid profile app:5:posts.read",
            optional_scope: "app:5:posts.write",
            conditional_scope: "app:5:posts.moderate",
          }, null, 2)} />
        </div>
        <P>
          Replace <M>5</M> with the declaration owner’s AUID and use declared keys.
          Available optional scopes start checked. Conditional permissions are required
          when held and cannot be toggled off; unavailable optional and conditional
          permissions are omitted. Availability is checked again at consent submission.
        </P>
        <h3 id="authorization-result" className="mt-6 scroll-mt-8 text-base font-semibold">Authorization outcomes</h3>
        <Table head={["Callback", "When", "App behavior"]} rows={[
          ["code + state", "Access approved", "Exchange once; check the token response’s scope for the complete approved set."],
          ["access_denied + state", "User cancels, mandatory access is missing, or the engine denies issuance", "Do not exchange or create a session. Offer a new sign-in with a suitable account."],
          ["consent_required + state", "prompt=none needs approval", "Start an interactive authorization to review scopes."],
          ["invalid_scope + state", "Invalid scope syntax, overlapping lists, or invalid permission declarations/bindings", "Correct the requested lists and start a fresh authorization."],
          ["server_error + state", "Permission checks or token issuance cannot complete", "Treat as failure, not absent conditional access; retry when the service recovers."],
        ]} />
        <P>
          Validate state before handling success or errors. Missing mandatory access issues
          no code or tokens and leaves the AXUS ID session active. Declined optional scopes
          prompt again when requested later. Use <M>prompt=consent</M> to review previously
          approved choices. See the <Link href="/developers/quickstart#permission-modes" className="docs-link">flow walkthrough</Link>.
        </P>
      </section>

      <section
        aria-label="Token"
        className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8"
      >
        <H id="token">POST /oauth/token</H>
        <P>
          Accepts form-encoded or JSON bodies. <M>client_id</M> can travel in
          the body, as the username half of Basic auth (password ignored for
          library compatibility), or as <M>auid</M>.
        </P>
        <div className="mt-4">
          <CodeBlock
            label="Exchange a code · replace the placeholder values"
            code={[
              `curl --request POST '${issuer}/oauth/token'`,
              "  --data-urlencode 'grant_type=authorization_code'",
              "  --data-urlencode 'client_id=YOUR_AUID'",
              "  --data-urlencode 'redirect_uri=https://app.example/auth/callback'",
              "  --data-urlencode 'code=AUTHORIZATION_CODE'",
              "  --data-urlencode 'code_verifier=ORIGINAL_VERIFIER'",
            ].join(" \\\n")}
          />
        </div>
        <Table
          head={["Field", "Grant", "Notes"]}
          rows={[
            ["grant_type", "both", "authorization_code or refresh_token"],
            [
              "code",
              "code",
              "Single use; must match client_id and redirect_uri",
            ],
            ["redirect_uri", "code", "Must equal the authorize request’s URI"],
            ["client_id", "both", "Must own the code or the refresh token"],
            [
              "code_verifier",
              "code",
              "Original verifier; generate 43–128 unreserved characters (32 random base64url bytes works)",
            ],
            ["refresh_token", "refresh", "Rotates on every use (see below)"],
          ]}
        />
        <P>
          Failure codes, all JSON with <M>error</M> and <M>error_description</M>
          :
        </P>
        <Table
          head={["Error", "Status", "Meaning"]}
          rows={[
            [
              "invalid_request",
              "400",
              "Malformed request or missing PKCE fields",
            ],
            ["invalid_client", "401", "Unknown client_id"],
            [
              "invalid_grant",
              "400 / 401",
              "Bad, expired or reused code; PKCE or URI mismatch; revoked grant. Refresh failures return 401",
            ],
            ["server_error", "500", "Token issuance failed on our side"],
          ]}
        />
      </section>

      <section
        aria-label="Token response"
        className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8"
      >
        <H id="tokens">The token response</H>
        <div className="mt-4">
          <CodeBlock
            label="Example · openid profile · default opaque access token"
            code={`{\n  "access_token": "axid_at_…",\n  "token_type": "Bearer",\n  "expires_in": 43200,\n  "id_token": "eyJhbG…",\n  "axus_access_token": "…"\n}`}
          />
        </div>
        <Table
          head={["Field", "Present", "Notes"]}
          rows={[
            [
              "access_token",
              "always",
              "Opaque (axid_at_…, 12h, revocable instantly) by default; per-client RS256 JWT (15min, offline-verifiable via JWKS)",
            ],
            ["token_type", "always", "Bearer"],
            [
              "expires_in",
              "always",
              "Seconds until access_token expiry: 43200 opaque, 900 JWT",
            ],
            [
              "scope",
              "always",
              "Complete approved scope set, including OIDC; excludes declined or unavailable permissions",
            ],
            [
              "id_token",
              "openid scope",
              "RS256 JWT: sub is the user AUID, aud is your client AUID, carries nonce when sent",
            ],
            [
              "refresh_token",
              "offline_access scope",
              "Opaque. Rotates on every use; the old one works 30s for retries, then reuse revokes the whole authorization",
            ],
            [
              "axus_access_token",
              "AXUS permission scopes",
              "Native token for AXUS GraphQL APIs. No expiry; dies when the user disconnects the app",
            ],
          ]}
        />
        <div className="docs-note">
          <strong>Check approved scopes:</strong> the token response’s <M>scope</M>
          lists the complete approved OIDC and AXUS scope set. Enable optional or
          conditional features only when their scopes appear here. Missing mandatory
          permissions return <M>access_denied</M> without an authorization code.
        </div>
        <P>
          Refresh tokens are bound to their client. Request{" "}
          <M>offline_access</M> only for continued API access; serialize
          refreshes and save each replacement atomically.
        </P>
      </section>

      <section
        aria-label="Userinfo"
        className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8"
      >
        <H id="userinfo">GET /oauth/userinfo</H>
        <P>
          <M>Authorization: Bearer &lt;access_token&gt;</M>, GET or POST. The
          token must carry the <M>openid</M> scope or you get{" "}
          <M>invalid_token</M> (401, with <M>WWW-Authenticate</M>). Claims are
          filtered by granted scope — you never see more than the user approved:
        </P>
        <Table
          head={["Claim", "Scope", "Notes"]}
          rows={[
            ["sub", "openid", "The user’s AUID"],
            ["preferred_username", "profile", "Default username, without @"],
            ["name", "profile", "Display name"],
            ["given_name / family_name", "profile", "When set on the profile"],
            [
              "email",
              "email",
              "Synthetic compatibility address: <auid>@amail.com; not proof of a deliverable or verified contact address",
            ],
          ]}
        />
      </section>

      <section
        aria-label="Gravatar avatars"
        className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8"
      >
        <H id="gravatar">GET /gravatar/&lt;email_hash&gt;</H>
        <P>
          Hash the trimmed, lowercase synthetic email (<M>&lt;auid&gt;@amail.com</M>)
          using MD5 or SHA-256. This public endpoint returns the current default
          variation’s avatar as a square JPEG. An optional <M>.jpg</M> suffix is
          accepted. Responses cache for five minutes and allow cross-origin reads.
        </P>
        <Table
          head={["Parameter", "Default", "Notes"]}
          rows={[
            ["s / size", "80", "Square edge in pixels, 1–2048; invalid values use 80"],
            ["d / default", "Gravatar default", "404 returns HTTP 404; built-in styles and custom image URLs redirect to Gravatar’s default-image service"],
            ["f / forcedefault", "off", "Set to y to always return the requested default"],
          ]}
        />
        <P>
          Accounts become available after signing in through this provider.
          Missing accounts or avatars use the requested default; service failures
          return an uncached 503.
        </P>
        <div className="mt-4">
          <CodeBlock label="Avatar URL" code={`${issuer}/gravatar/<email_hash>?s=128&d=404`} />
        </div>
      </section>

      <section
        aria-label="Revocation and introspection"
        className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8"
      >
        <H id="revoke">POST /oauth/revoke</H>
        <P>
          Body: <M>token</M> (required), <M>token_type_hint</M> (
          <M>access_token</M> or <M>refresh_token</M>, optional — both kinds are
          tried). Revoking any token ends the whole authorization: the app’s
          native token is revoked at the engine and its remaining tokens go with
          it. The user’s own session is untouched. Unknown tokens still return
          200.
        </P>
        <div className="mt-6">
          <H id="introspect">POST /oauth/introspect</H>
          <P>
            RFC 7662 for opaque access tokens. <M>client_id</M> (body or Basic
            auth) is required. Missing or unknown clients receive 401; a missing
            token receives 400. Inactive tokens and tokens owned by another
            client return
            <M>{"{ active: false }"}</M>. Active tokens return <M>active</M>,{" "}
            <M>scope</M>, <M>client_id</M>, <M>sub</M>, <M>token_type</M>,{" "}
            <M>exp</M>, and <M>iss</M>.
          </P>
          <div className="mt-4">
            <CodeBlock
              label="Introspection request"
              code={[
                `curl --request POST '${issuer}/oauth/introspect'`,
                "  --data-urlencode 'client_id=YOUR_AUID'",
                "  --data-urlencode 'token=ACCESS_TOKEN'",
              ].join(" \\\n")}
            />
          </div>
          <div className="mt-4">
            <CodeBlock
              label="Example active response"
              code={JSON.stringify(
                {
                  active: true,
                  scope: "openid profile",
                  client_id: "YOUR_AUID",
                  sub: "USER_AUID",
                  token_type: "Bearer",
                  exp: 2000000000,
                  iss: issuer,
                },
                null,
                2,
              )}
            />
          </div>
        </div>
      </section>
      <section className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8">
        <H id="graphql">POST /oauth/graphql</H>
        <P>
          Send a JSON GraphQL request with{" "}
          <M>Authorization: Bearer &lt;access_token&gt;</M>. The proxy resolves
          the OAuth token to the authorization’s native AXUS token and forwards
          the request to the engine, limited by granted permissions (discovery:{" "}
          <M>axus_graphql_proxy_endpoint</M>). The separate{" "}
          <M>axus_access_token</M> is a server-side credential for direct native
          calls — not an identifier, not an ID token.
        </P>
      </section>
      <section className="mt-6 rounded-[20px] border border-black/[0.07] bg-white p-6 sm:p-8">
        <H id="refresh">Refresh an authorization</H>
        <P>
          Request <M>offline_access</M> during authorization to receive a
          refresh token. Each successful refresh returns a replacement. Tokens
          are long-lived but can be revoked; do not assume the connection will
          last indefinitely.
        </P>
        <div className="mt-4">
          <CodeBlock
            label="Server-side refresh request"
            code={[
              `curl --request POST '${issuer}/oauth/token'`,
              "  --data-urlencode 'grant_type=refresh_token'",
              "  --data-urlencode 'client_id=YOUR_AUID'",
              "  --data-urlencode 'refresh_token=CURRENT_REFRESH_TOKEN'",
            ].join(" \\\n")}
          />
        </div>
        <div className="docs-note">
          <strong>Logout and disconnect are different.</strong> Local logout
          deletes your app’s session. Revocation disconnects the whole AXUS
          authorization. Offline JWT verification alone cannot detect immediate
          revocation; a previously issued JWT can still verify until its expiry.
          AXUS endpoints check authorization state when resolving access tokens.
        </div>
      </section>
    </>
  );
}
