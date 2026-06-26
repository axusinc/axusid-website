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
| `POST /oauth/revoke` | Token revocation |

### Token response

Token exchange returns a dual-token response:

```json
{
  "access_token": "<IdP-signed JWT>",
  "id_token": "<IdP-signed JWT when openid scope>",
  "axus_access_token": "<backend bearer for GraphQL>",
  "refresh_token": "<IdP-wrapped opaque token when offline_access scope>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile"
}
```

- `access_token` — IdP JWT for OIDC libraries, `/oauth/userinfo`, and AXUS GraphQL API calls
- `axus_access_token` — backend opaque token for AXUS GraphQL API calls
- `id_token` — identity JWT when `openid` is granted
- `refresh_token` — wrapped refresh token when `offline_access` is granted

### Dev client

Seeded by `npm run db:seed`:

- `client_id`: `axusid-dev`
- `redirect_uris`: `http://localhost:3000/callback`, `http://localhost:3001/callback`, `http://127.0.0.1:3000/callback`
- `scopes`: `openid`, `profile`, `email`, `offline_access`

### Developer portal

Any signed-in AXUS ID user can register OAuth clients at `/developer/oauth/clients`.

## GraphQL mapping

Protected GraphQL operations require an `Authorization: Bearer …` header. The backend accepts either:

- the opaque backend token (`axus_access_token` from `/oauth/token`), or
- the IdP JWT access token (`access_token` from `/oauth/token`, with permissions in the `scope` claim)

| OAuth2 concept | GraphQL operation |
|---|---|
| User login | `login(auid, password, permissions)` |
| Token refresh | `refreshCredentials(refreshToken)` |
| Token revoke | `revokeCredentials(refreshToken)` |
| Registration | `createUser(username, password)` |
| Password change | `changePassword(auid, newPassword)` with Bearer auth |

OIDC scopes (`openid`, `profile`, `email`, `offline_access`) are **not** AXUS hierarchical permissions. They control consent, JWT claims, and refresh token issuance. Backend `permissions` on login are omitted for standard OIDC scopes.

The `email` scope is accepted but no email claim is available until the backend exposes one.

## OAuth2 flow

1. Client redirects the user to `/authorize` with PKCE params.
2. User signs in at `/login` with **AUID + password**.
3. User approves scopes at `/consent`.
4. AXUS ID stores a short-lived authorization code in PostgreSQL and redirects back.
5. Client exchanges the code at `/oauth/token` with the PKCE verifier.
6. AXUS ID returns IdP JWTs plus `axus_access_token`.

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
