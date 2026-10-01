// The three snippets form one server-only module in the integrating app.
export const beginExample = `// lib/axus-auth.ts — server only; install jose in your app
import { randomBytes, createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(\`Missing \${name}\`);
  return value;
}
const issuer = env("AXUS_ISSUER");
const clientId = env("AXUS_CLIENT_ID");
const redirectUri = env("AXUS_REDIRECT_URI");
const jwks = createRemoteJWKSet(
  new URL(issuer + "/.well-known/jwks.json")
);

export type Transaction = {
  state: string;
  nonce: string;
  verifier: string;
  createdAt: number;
  requiredScopes: string[];
};

export function beginSignIn(permissions: {
  required?: string[];
  optional?: string[];
  conditional?: string[];
} = {}) {
  const random = () => randomBytes(32).toString("base64url");
  const transaction: Transaction = {
    state: random(), nonce: random(), verifier: random(),
    createdAt: Date.now(),
    requiredScopes: ["openid", "profile", ...(permissions.required ?? [])],
  };
  const challenge = createHash("sha256")
    .update(transaction.verifier).digest("base64url");
  const url = new URL(issuer + "/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: transaction.requiredScopes.join(" "),
    ...(permissions.optional?.length
      ? { optional_scope: permissions.optional.join(" ") } : {}),
    ...(permissions.conditional?.length
      ? { conditional_scope: permissions.conditional.join(" ") } : {}),
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return { url: url.toString(), transaction };
}`;

export const exchangeExample = `// Continue in lib/axus-auth.ts
export type TokenSet = {
  idToken: string;
  accessToken: string;
  scopes: Set<string>;
};

export async function exchangeCode(
  callback: URL,
  transaction: Transaction | undefined,
) {
  // The route must atomically consume the browser-bound transaction
  // from your server store BEFORE calling this function.
  const state = callback.searchParams.get("state");
  if (!transaction || !state || state !== transaction.state ||
      Date.now() - transaction.createdAt > 10 * 60 * 1000) {
    throw new Error("Invalid or expired sign-in. Start again.");
  }
  if (callback.searchParams.has("error")) {
    // Don't render raw provider error text or log the callback URL.
    if (callback.searchParams.get("error") === "access_denied") {
      throw new Error("Access was declined or this account lacks required permissions.");
    }
    if (callback.searchParams.get("error") === "consent_required") {
      throw new Error("Start an interactive sign-in to review permissions.");
    }
    throw new Error("Sign-in was not completed. Please try again.");
  }
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("Missing authorization code.");

  const response = await fetch(issuer + "/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: transaction.verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Code exchange failed. Start again.");
  const tokens = await response.json();
  if (typeof tokens.id_token !== "string" ||
      typeof tokens.access_token !== "string" ||
      typeof tokens.scope !== "string" ||
      tokens.token_type !== "Bearer") {
    throw new Error("Unexpected token response.");
  }
  const scopes = new Set<string>(tokens.scope.split(/\\s+/).filter(Boolean));
  if (transaction.requiredScopes.some((scope) => !scopes.has(scope))) {
    throw new Error("A required scope was not granted.");
  }
  return {
    idToken: tokens.id_token as string,
    accessToken: tokens.access_token as string,
    scopes,
  };
}`;

export const verifyExample = `// Continue in lib/axus-auth.ts
export async function verifyIdentity(
  tokens: TokenSet,
  transaction: Transaction,
) {
  const { payload } = await jwtVerify(tokens.idToken, jwks, {
    issuer,
    audience: clientId,
    algorithms: ["RS256"],
    requiredClaims: ["iss", "aud", "exp", "iat", "sub", "nonce"],
  });
  if (typeof payload.sub !== "string" || !payload.sub ||
      payload.nonce !== transaction.nonce) {
    throw new Error("Invalid identity or nonce.");
  }
  const response = await fetch(issuer + "/oauth/userinfo", {
    headers: { Authorization: \`Bearer \${tokens.accessToken}\` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Could not load the profile.");
  const profile = await response.json();
  if (profile.sub !== payload.sub) {
    throw new Error("Userinfo subject does not match the ID token.");
  }
  return {
    issuer,
    subject: payload.sub,
    scopes: [...tokens.scopes],
    name: typeof profile.name === "string" ? profile.name : undefined,
    username: typeof profile.preferred_username === "string"
      ? profile.preferred_username : undefined,
  };
}`;

export const permissionRequestExample = `// Replace 5 with the declaration owner's AUID and use declared keys.
// Store the returned transaction before redirecting, just as for sign-in alone.
const { url, transaction } = beginSignIn({
  required: ["app:5:posts.read"],
  optional: ["app:5:posts.write"],
  conditional: ["app:5:posts.moderate"],
});`;

export const grantedScopesExample = `// In your backend callback, after consuming the transaction:
const tokens = await exchangeCode(callback, transaction);
const identity = await verifyIdentity(tokens, transaction);
const granted = new Set(identity.scopes);

const features = {
  canWritePosts: granted.has("app:5:posts.write"),
  canModeratePosts: granted.has("app:5:posts.moderate"),
};
// Keep the approved scope set with your server session, if these features need it.
// Your API must still enforce permissions on every protected operation.`;
