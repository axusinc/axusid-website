# AXUS ID

Modern identity frontend and OpenID Connect provider for the AXUS auth GraphQL backend.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- GraphQL Code Generator typed SDK (`graphql-request`)
- OpenID Connect + OAuth2 Authorization Code + PKCE (S256)
- PostgreSQL + Drizzle ORM

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Start PostgreSQL (migrations run automatically on server start):

```bash
docker compose up -d
npm run db:seed
```

Migrations in `drizzle/` are applied when the Next.js server boots, similar to Flyway. To apply them manually instead, run `npm run db:migrate`. Set `DATABASE_AUTO_MIGRATE=false` to disable auto-migration.

4. Generate OAuth JWT keys and add them to `.env.local`:

```bash
node scripts/generate-oauth-keys.mjs
```

5. Ensure the auth backend is running at `http://localhost:8081/graphql`.

6. Generate the GraphQL SDK (re-run after schema changes):

```bash
npm run codegen
```

7. Start the dev server:

```bash
npm run dev
```

AXUS ID runs at `http://localhost:3000`.

## Environment

| Variable | Description |
|---|---|
| `AUTH_GRAPHQL_ENDPOINT` | GraphQL endpoint (default: `http://localhost:8081/graphql`) |
| `AXUS_SYSTEM_CONTEXT_AUID` | Must match the engine’s `AXUS_ID_CONTEXT`; defaults to production context `4` |
| `OAUTH_ISSUER` | Public issuer URL (default: `http://localhost:3000`) |
| `SESSION_SECRET` | Secret for signing IdP session cookies and encrypting stored credentials |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_AUTO_MIGRATE` | Set to `false` to skip applying `drizzle/` migrations on server start (default: enabled) |
| `OAUTH_JWT_PRIVATE_KEY` | PEM RS256 private key for IdP JWTs |
| `OAUTH_JWT_PUBLIC_KEY` | PEM RS256 public key (published via JWKS) |

## OAuth / OIDC endpoints

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/openid-configuration` | Discovery document |
| `GET /.well-known/jwks.json` | JWKS for JWT verification |
| `GET /authorize` | Authorization endpoint (Authorization Code + PKCE) |
| `POST /oauth/token` | Token endpoint (`authorization_code`, `refresh_token`) |
| `GET /oauth/userinfo` | UserInfo endpoint (Bearer IdP JWT) |
| `POST /oauth/revoke` | Token revocation (ends the whole authorization) |
| `POST /oauth/introspect` | Token introspection (RFC 7662), for opaque access tokens |
| `POST /oauth/graphql` | Engine GraphQL proxied with the app's OAuth access token |

### Token response

Token exchange returns a dual-token response:

```json
{
  "access_token": "<opaque token, or an IdP-signed JWT for clients configured that way>",
  "id_token": "<IdP-signed JWT when openid scope>",
  "axus_access_token": "<backend bearer for GraphQL>",
  "refresh_token": "<IdP-wrapped opaque token when offline_access scope>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile"
}
```

- `access_token` — for `/oauth/userinfo`, `/oauth/introspect` and `/oauth/graphql`; not accepted by the engine itself. Opaque by default (12 hours, revocable at once); a client can be switched to RS256 JWTs (15 minutes, verifiable offline against the JWKS, and valid until they expire no matter what)
- `axus_access_token` — the native AXUS ID token for this authorization, the only credential engine GraphQL accepts. It does not expire, but it is revoked when the user disconnects the app
- `id_token` — identity JWT when `openid` is granted
- `refresh_token` — opaque refresh token when `offline_access` is granted. It is rotated on every use: the old one keeps working for 30 seconds so a retried request is not punished, and presenting it later revokes the whole authorization, on the assumption that a copy leaked

### Dev client

Seeded by `npm run db:seed`:

- `client_id`: `axusid-dev`
- `redirect_uris`: `http://localhost:3000/callback`, `http://localhost:3001/callback`, `http://127.0.0.1:3000/callback`
- `scopes`: `openid`, `profile`, `email`, `offline_access`

### Developer portal

Any signed-in AXUS ID user can register OAuth clients at `/developer/oauth/clients`.

## GraphQL mapping

Protected GraphQL operations require an `Authorization: Bearer <native token>` header, e.g. `axus_access_token` from `/oauth/token`. The header is the only way to pass a token, and the backend has no access/refresh credentials of its own: OAuth access and refresh tokens are issued and managed by this IdP.

| OAuth2 concept | GraphQL operation |
|---|---|
| User login | `login(auid, password, permissions)` |
| Token refresh | handled by this IdP (`/oauth/token`); native tokens don't expire |
| Token revoke | `revokeToken` with the token as Bearer |
| Registration | `createUser(username, password)` |
| Password change | `changePassword(auid, newPassword)` with Bearer auth |

OIDC scopes (`openid`, `profile`, `email`, `offline_access`) are **not** AXUS declared permissions. They control consent, JWT claims, and refresh token issuance. Backend `permissions` on login are omitted for standard OIDC scopes.

The `email` scope returns a synthetic email (`[auid]@amail.com`) for app compatibility.

### Gravatar-compatible avatars

`GET /gravatar/<email_hash>?s=80&d=identicon` serves the account's current
default-variation avatar as a square JPEG. Hash the trimmed, lowercase synthetic
email (`<auid>@amail.com`) using MD5 or SHA-256; both are accepted, along with an
optional `.jpg` suffix. No authentication is required.

- `s` / `size`: 1–2048 pixels, default 80 (invalid values use 80).
- `d` / `default`: `404` returns HTTP 404 when no avatar exists. Other values
  (including `mp`, `blank`, `identicon`, `retro`, and custom image URLs) redirect
  to Gravatar's default-image service with `f=y`.
- `f=y` / `forcedefault=y`: always return the requested default.
- Responses allow cross-origin reads and cache for five minutes. Backend or
  image-processing failures return an uncached HTTP 503.

Use the AXUS ID frontend's public URL directly:
`https://<frontend-host>/gravatar/<email_hash>`. Grafana's
`security.gravatar_url` should be `https://<frontend-host>/gravatar`.
No additional avatar hostname or ingress rule is required.
The database migration backfills accounts already known to this IdP; new
sign-ins and OIDC profile claims register their hashes. Accounts used only
through the engine must sign in here once before their hashes can be resolved.

```js
import { createHash } from "node:crypto";

const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
const avatarUrl = `${axusIdFrontendUrl}/gravatar/${hash}?s=128&d=404`;
```

## Required, optional and conditional OAuth scopes

The authorization request supports three space-separated scope lists:

| Parameter | Behavior |
| --- | --- |
| `scope` | Mandatory. Defaults to `openid`. Missing AXUS permissions stop authorization with `access_denied`. |
| `optional_scope` | User-controlled checkboxes, initially enabled for available scopes. Unavailable permissions are disabled and omitted. Supports OIDC scopes too. |
| `conditional_scope` | AXUS permissions required when the user holds them, otherwise omitted. These cannot be toggled off. |

For example, request `scope=openid app:5:posts.read`,
`optional_scope=app:5:posts.write`, and `conditional_scope=app:5:posts.moderate`.
The extra parameters are AXUS ID extensions. A scope must appear in only one list;
OIDC scopes cannot be conditional. Context syntax is the same in every list.
A bare `*` (including `app:5:*`) requests whatever access the user holds in that
context, even if empty; it is not a concrete permission whose absence blocks sign-in.
Only one wildcard context is allowed across the three lists.

Effective permission checks run after account selection and again on consent submission.
Check failures stop authorization rather than treating access as absent. The engine still
validates the granted permissions during token issuance. No authorization code or tokens
are issued when a mandatory permission is missing; the callback receives `access_denied`,
an explanation, and the original `state`. This does not end the user's session.

Authorization codes, access tokens and the token response's `scope` contain only the
approved scopes, including OIDC scopes. Apps must inspect the returned `scope` before
using optional or conditional features. Changing the approved set replaces the native
app token and revokes its previous token. Declined optional scopes are not remembered
as a separate refusal: requesting them again prompts for consent (or returns
`consent_required` with `prompt=none`). Use `prompt=consent` to review existing choices.

## OAuth2 flow

1. Client redirects the user to `/authorize` with PKCE params. PKCE is required: there are no
   client secrets, and `none` is the only client authentication method.
2. User signs in at `/login` with **AUID + password**.
3. User approves scopes at `/consent`. The approval is stored server-side and listed under
   Connected apps while the session that issued its native token remains active. Signing out
   or signing in again retires grants issued from the previous session; the app must request
   authorization again. Asking for scopes beyond what was approved also prompts again.
4. AXUS ID mints a native token for this app alone - holding the approved permissions plus the
   rate-limit drain permission for the user's account - stores a short-lived authorization code
   in PostgreSQL, and redirects back.
5. Client exchanges the code at `/oauth/token` with the PKCE verifier.
6. AXUS ID returns its own tokens plus `axus_access_token`.

The user can disconnect an app at any time from the account page, which revokes its native
token at the engine and every OAuth token issued for it. The user's own session is untouched.
Signing out of AXUS ID revokes native app tokens delegated from that session and retires their
OAuth grants, since the engine revokes delegated tokens with their parent session token.

### Example authorize URL

```
http://localhost:3000/authorize?response_type=code&client_id=axusid-dev&redirect_uri=http://localhost:3000/callback&scope=openid%20profile&state=xyz&code_challenge=CHALLENGE&code_challenge_method=S256
```

Generate PKCE values (example):

```bash
# verifier (43-128 chars)
openssl rand -base64 32

# S256 challenge
echo -n "VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr '+/' '-_' | tr -d '='
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/register` | Create a new AXUS ID |
| `/login` | Sign in (AUID + password) |
| `/consent` | OAuth scope approval |
| `/account` | Profile, usernames, variations |
| `/account?section=permissions` | View outgoing and received permissions; share access by username |
| `/developer/oauth/clients` | Self-service OAuth client registration |
| `/callback` | Dev OAuth redirect handler |

## Scripts

```bash
npm run dev         # Start development server
npm run build       # Production build
npm run codegen     # Regenerate GraphQL SDK
npm run db:generate # Generate Drizzle migrations
npm run db:migrate  # Apply migrations
npm run db:seed     # Seed axusid-dev client
npm run lint        # ESLint
```

## Design

- White, minimal aesthetic with frosted-glass blur surfaces
- Black as the default accent; brand red `#B61C1C` for primary CTAs
- Placeholder square logo at `public/axusid-tm-logo.png`

## Permission management

Deploy the declaration-enabled engine before this website. `schema_prod.graphql` is synchronized
with the engine SDL and drives both `npm run codegen` and `/developers/api`.
Set `AXUS_SYSTEM_CONTEXT_AUID` to the engine's `AXUS_ID_CONTEXT` (production: `4`).

Account → Permissions discovers actual declarations, supports app lookup by username, offers
static and dynamic parameter choices, and previews descriptions and effective access before
sharing. Dynamic search degradation permits raw input; grants still fail closed on validation
failure. Context and key together identify a permission everywhere. System capabilities keep
their existing names. Incoming/outgoing lists remain engine-backed; granters and declaration
owners come from the active session, and removal/cache invalidation verify ownership.

Account → Developer → Permission declarations lists declarations, publishes complete JSON
inputs with a review step, and clears cached validation. Same-name publishing updates in place
and increments the version. Keep complete source definitions: the engine summary API does not
return parameter constraints or invariant source. The picker leaves bindings as strings and
uses server validation because the read API does not expose types or wildcard eligibility.

Developer guides: `/developers/permissions` and `/developers/become-an-app`. They cover the
validator validate/search/describe protocol, cache invalidation, all declaration errors and migration.
Legacy `identity.<auid>.*` and bare `*` cannot be delegated as stored grants. AXUS ID now grants
concrete account permissions directly on creation and backfills existing accounts at startup;
legacy account-root grants may appear during migration. Bare `*` remains valid in native token
scopes. OAuth consent uses exact scope matching and engine descriptions;
unprefixed OAuth permission keys use system context. To request another app's permission,
use the scope `app:<app AUID>:<permission key>` (for example, `app:5:posts.read`).
The context is part of the permission identity: the same key in two apps grants different
access. One authorization can request permissions from multiple app contexts. A bare `*`
can be requested in only one context per authorization; it grants all access the user holds
there, so use concrete keys whenever possible.

The engine V32 migration deletes legacy HierarchicalPermission grants. Coordinate authority
reprovisioning and fresh app authorization as part of the engine rollout. Publishing an app's
permission declaration does not create an initial grant for its owner. The website never
recreates removed grants automatically.

Run focused contract and authorization tests with:

```bash
node --test tests/permissions.test.mjs tests/permission-declarations.test.mjs tests/permission-scopes.test.mjs
```

## GitHub sign-in

Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the frontend server environment using the same OAuth app configured for the engine. Register `<OAUTH_ISSUER>/auth/github/callback` as a callback URL in GitHub, or set `GITHUB_REDIRECT_URI` explicitly. The engine provider ID must be `github`. These credentials must not use a `NEXT_PUBLIC_` prefix.

Users connect GitHub in Account → Security, then use **Continue with GitHub** on the login page or **Sign up with GitHub** on the register page. An unlinked GitHub account starts pending registration and redirects to `/register` to pick a username (mirroring Google); `?mode=register&username=` plus `contextAuid`/`add_account` creates the account directly when the username is pre-collected. The authorization flow uses state, PKCE, and `read:user user:email offline_access` to obtain expiring access tokens and refresh tokens. Google and GitHub share the authorization-code exchange and engine login/link helpers. Only the real refresh token is sent to the engine, which exchanges it, verifies the identity, and stores the resulting token pair. Deploy with the backend token-lifecycle migration; existing GitHub connections must authorize again.
