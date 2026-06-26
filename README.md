# AXUS ID

Modern identity frontend and OAuth2 adapter for the AXUS auth GraphQL backend.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- GraphQL Code Generator typed SDK (`graphql-request`)
- OAuth2 Authorization Code + PKCE (S256)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Ensure the auth backend is running at `http://localhost:8081/graphql`.

4. Generate the GraphQL SDK (re-run after schema changes):

```bash
npm run codegen
```

5. Start the dev server:

```bash
npm run dev
```

AXUS ID runs at `http://localhost:3000`.

## Environment

| Variable | Description |
|---|---|
| `AUTH_GRAPHQL_ENDPOINT` | GraphQL endpoint (default: `http://localhost:8081/graphql`) |
| `OAUTH_ISSUER` | Public issuer URL (default: `http://localhost:3000`) |
| `SESSION_SECRET` | Secret for signing IdP session cookies |

## OAuth2 endpoints

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/openid-configuration` | Discovery document |
| `GET /authorize` | Authorization endpoint (Authorization Code + PKCE) |
| `POST /oauth/token` | Token endpoint (`authorization_code`, `refresh_token`) |
| `POST /oauth/revoke` | Token revocation |

### Dev client

Registered by default in `src/lib/oauth/clients.ts`:

- `client_id`: `axusid-dev`
- `redirect_uris`: `http://localhost:3000/callback`, `http://localhost:3001/callback`
- `scopes`: `openid`, `profile`, `email`, `offline_access`

## GraphQL mapping

| OAuth2 concept | GraphQL operation |
|---|---|
| User login | `login(auid, password, permissions)` |
| Token refresh | `refreshCredentials(refreshToken)` |
| Token revoke | `revokeCredentials(refreshToken)` |
| Registration | `createUser(username, password)` |
| Password change | `changePassword(auid, tokenId, newPassword)` |

`permissions` on `login` carries the requested OAuth scopes.

## OAuth2 flow

1. Client redirects the user to `/authorize` with PKCE params.
2. User signs in at `/login` with **AUID + password** (no username lookup exists yet).
3. User approves scopes at `/consent`.
4. AXUS ID issues a short-lived authorization code and redirects back.
5. Client exchanges the code at `/oauth/token` with the PKCE verifier.
6. Backend-issued `AuthCredentials` are returned as OAuth tokens.

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
| `/callback` | Dev OAuth redirect handler |

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run codegen   # Regenerate GraphQL SDK
npm run lint      # ESLint
```

## Design

- White, minimal aesthetic with frosted-glass blur surfaces
- Black as the default accent; brand red `#B61C1C` for primary CTAs
- Placeholder square logo at `public/axusid-tm-logo.png`
