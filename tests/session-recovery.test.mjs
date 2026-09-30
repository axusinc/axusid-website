import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { ClientError } from "graphql-request";

const require = createRequire(import.meta.url);

function loadTs(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", source)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}

const graphqlErrors = loadTs("src/lib/graphql-errors.ts", {
  "server-only": {},
  "graphql-request": { ClientError },
});

const { isTokenInvalidError } = graphqlErrors;

test("isTokenInvalidError detects TOKEN_INVALID code", () => {
  const error = new ClientError(
    { errors: [{ message: "Token is invalid", extensions: { code: "TOKEN_INVALID" } }] },
    { query: "query" },
  );
  assert.equal(isTokenInvalidError(error), true);
});

test("isTokenInvalidError detects INVALID_TOKEN_ID code", () => {
  const error = new ClientError(
    { errors: [{ message: "Invalid token id", extensions: { code: "INVALID_TOKEN_ID" } }] },
    { query: "query" },
  );
  assert.equal(isTokenInvalidError(error), true);
});

test("isTokenInvalidError detects TOKEN_REQUIRED code", () => {
  const error = new ClientError(
    { errors: [{ message: "Token is required", extensions: { code: "TOKEN_REQUIRED" } }] },
    { query: "query" },
  );
  assert.equal(isTokenInvalidError(error), true);
});

test("isTokenInvalidError detects HTTP 401 and 403 status codes", () => {
  const err401 = new ClientError({ status: 401, errors: [] }, { query: "query" });
  assert.equal(isTokenInvalidError(err401), true);

  const err403 = new ClientError({ status: 403, errors: [] }, { query: "query" });
  assert.equal(isTokenInvalidError(err403), true);
});

test("isTokenInvalidError detects unauthenticated and invalid token messages", () => {
  assert.equal(isTokenInvalidError(new Error("Request is unauthenticated")), true);
  assert.equal(isTokenInvalidError(new Error("Bearer token has expired")), true);
  assert.equal(isTokenInvalidError(new Error("Native token was revoked")), true);
  assert.equal(isTokenInvalidError(new Error("Network connection error")), false);
});

test("discardInvalidSessionAction redirects rather than returning a destination string", async () => {
  let redirectedTo = null;
  const redirect = (url) => {
    redirectedTo = url;
    throw new Error(`REDIRECT:${url}`);
  };

  let sessionState = { auid: "1", tokenId: "token-1" };
  const authActions = loadTs("src/app/actions/auth.ts", {
    "server-only": {},
    "next/headers": { cookies: () => ({}) },
    "next/navigation": { redirect },
    "next/cache": { revalidatePath: () => {} },
    "@/lib/auth-redirect": { resolveAuthenticatedRedirect: () => "/" },
    "@/lib/auth-graphql": { getAuthSdk: () => ({}), getAuthSdkForSession: () => ({}) },
    "@/lib/graphql-errors": graphqlErrors,
    "@/lib/oauth/adapter": { SESSION_PERMISSIONS: ["*"], loginWithBackend: async () => "token" },
    "@/lib/resolve-login-identity": {},
    "@/lib/oauth/clients": { getOAuthClient: async () => null, normalizeScopes: () => [], partitionScopes: () => ({}), validateScopes: () => [] },
    "@/lib/oauth/schemas": {},
    "@/lib/oauth/requested-scopes": {},
    "@/lib/oauth/scope-availability": {},
    "@/lib/oauth/authorization-response": {},
    "@/lib/permission-config": {},
    "@/lib/session-access": {
      addAccountToSession: async () => {},
      clearAllSessions: async () => {},
      getValidSession: async () => sessionState,
      removeAccountFromSession: async () => null,
      switchActiveAccount: async () => {},
    },
    "@/lib/session": { SESSION_COOKIE: "session", clearSessionCookieOptions: {}, serializeSession: () => "", sessionCookieOptions: {} },
    "@/lib/saml/saml-store": { getSamlConfigByAuid: async () => null },
    "@/lib/saml/saml-idp": { createIdentityProvider: () => ({}), createServiceProvider: () => ({}), createSamlLogoutRequest: async () => ({}) },
    "@/lib/user-profile": { formatSyntheticEmail: () => "" },
    "@/lib/avatar-server": { avatarImageUrl: () => "" },
    "@/lib/google-oauth": { clearPendingGoogleRegistration: async () => {}, getGoogleClientId: () => "", getGoogleProviderId: () => "", getPendingGoogleRegistration: async () => null, setGoogleRegistrationName: async () => {} },
    "@/lib/github-oauth": { clearPendingGitHubRegistration: async () => {}, getGitHubClientId: () => "", getGitHubProviderId: () => "", getPendingGitHubRegistration: async () => null, setGitHubRegistrationName: async () => {} },
    "@/lib/external-avatar": { importExternalAvatar: async () => false, normalizeGitHubAvatarUrl: (url) => url, normalizeGooglePictureUrl: (url) => url },
    "@/lib/last-auth-method-server": { setLastAuthMethod: async () => {}, getLastAuthMethod: async () => null },
  });

  await assert.rejects(
    authActions.discardInvalidSessionAction("1"),
    (err) => err.message === "REDIRECT:/login?add_account=true",
  );
  assert.equal(redirectedTo, "/login?add_account=true");
});
