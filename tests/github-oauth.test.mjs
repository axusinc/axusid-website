import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadTs(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", source)(
    name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports,
  );
  return module.exports;
}
const sharedOAuth = loadTs("src/lib/oauth-provider.ts", { "server-only": {}, "@/lib/auth-graphql": {} });
const oauth = loadTs("src/lib/github-oauth.ts", { "server-only": {}, "@/lib/oauth-provider": sharedOAuth });

function configure(t) {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.GITHUB_CLIENT_ID = "test-client";
  process.env.GITHUB_CLIENT_SECRET = "test-secret";
  process.env.OAUTH_ISSUER = "https://id.example.com";
  delete process.env.GITHUB_REDIRECT_URI;
}

test("authorization binds PKCE, callback and safe continuation to a fresh state", t => {
  configure(t);
  const first = oauth.createGitHubAuthorization("https://id.example.com/auth/github", { next: "/account" });
  const second = oauth.createGitHubAuthorization("https://id.example.com/auth/github", {});
  const state = oauth.decodeGitHubState(first.cookie);
  assert.equal(first.url.origin, "https://github.com");
  assert.equal(first.url.searchParams.get("client_id"), "test-client");
  assert.equal(first.url.searchParams.get("scope"), "read:user user:email offline_access");
  assert.equal(first.url.searchParams.get("redirect_uri"), "https://id.example.com/auth/github/callback");
  assert.equal(first.url.searchParams.get("state"), state.state);
  assert.equal(first.url.searchParams.get("code_challenge"), createHash("sha256").update(state.codeVerifier).digest("base64url"));
  assert.equal(first.url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(state.next, "/account");
  assert.notEqual(first.cookie, second.cookie);
  assert.equal(first.url.searchParams.has("client_secret"), false);
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  assert.equal(oauth.decodeGitHubState(encode({ ...state, createdAt: Date.now() - 601000 })), null);
  assert.equal(oauth.decodeGitHubState(encode({ ...state, createdAt: Date.now() + 10000 })), null);
  assert.equal(oauth.decodeGitHubState("invalid"), null);
  for (const unsafe of ["https://evil.test", "//evil.test", "/\\evil.test", "/\nevil.test"]) {
    assert.equal(oauth.internalDestination(unsafe), undefined);
  }
});

test("token exchange uses refresh token as engine proof and rejects OAuth errors", async t => {
  configure(t);
  const state = oauth.decodeGitHubState(oauth.createGitHubAuthorization("https://id.example.com", {}).cookie);
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async (url, options) => {
    assert.equal(url, "https://github.com/login/oauth/access_token");
    assert.equal(options.body.get("code_verifier"), state.codeVerifier);
    assert.equal(options.body.get("client_secret"), "test-secret");
    assert.equal(options.headers.Accept, "application/json");
    return { ok: true, json: async () => ({ access_token: "access-proof", refresh_token: "refresh-proof" }) };
  };
  assert.deepEqual(await oauth.exchangeGitHubCode("code", state, "https://id.example.com"), {
    providerId: "github", clientId: "test-client", refreshToken: "refresh-proof",
  });
  global.fetch = async () => ({ ok: true, json: async () => ({ error: "bad_verification_code" }) });
  await assert.rejects(oauth.exchangeGitHubCode("code", state, "https://id.example.com"));
});

function callbackHarness(state, options = {}) {
  const calls = [];
  const sdk = {
    LoginWithExternalIdentity: async args => {
      calls.push(["login", args]);
      if (options.loginError) throw options.loginError;
      return { loginWithExternalIdentity: { auid: "1", id: "native-token" } };
    },
    LinkExternalIdentity: async args => calls.push(["link", args]),
  };
  const callback = loadTs("src/app/auth/github/callback/route.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "cookie" }), delete: () => calls.push(["delete"]) }) },
    "next/server": { NextResponse: { redirect: url => url } },
    "@/lib/auth-redirect": { resolveAuthenticatedRedirect: () => "/account" },
    "@/lib/oauth-provider": {
      loginWithOAuthIdentity: async (authentication, permissions) => {
        const result = await sdk.LoginWithExternalIdentity({ authentication, permissions });
        return { auid: result.loginWithExternalIdentity.auid, tokenId: result.loginWithExternalIdentity.id };
      },
      linkOAuthIdentity: async (session, authentication) => sdk.LinkExternalIdentity({ auid: session.auid, authentication }),
    },
    "@/lib/github-oauth": {
      GITHUB_OAUTH_COOKIE: "cookie", decodeGitHubState: () => state,
      exchangeGitHubCode: async () => { calls.push(["exchange"]); return { refreshToken: "proof" }; },
    },
    "@/lib/graphql-errors": { getPrimaryDomainError: error => error },
    "@/lib/last-auth-method-server": { setLastAuthMethod: async method => calls.push(["method", method]) },
    "@/lib/oauth/adapter": { SESSION_PERMISSIONS: ["session-permission"] },
    "@/lib/session-access": {
      getValidSession: async () => options.session,
      addAccountToSession: async session => calls.push(["session", session]),
    },
  });
  return { calls, run: query => callback.GET({ url: "https://id.example.com/auth/github/callback", nextUrl: new URL(`https://id.example.com/auth/github/callback?${query}`) }) };
}

test("callback rejects mismatched state, cancellation and missing codes before exchange", async () => {
  for (const query of ["state=wrong&code=code", "state=valid&error=access_denied", "state=valid"]) {
    const h = callbackHarness({ state: "valid" });
    assert.equal((await h.run(query)).pathname, "/login");
    assert.deepEqual(h.calls, [["delete"]]);
  }
});

test("callback issues an Axus session and remembers GitHub after successful login", async () => {
  const h = callbackHarness({ state: "valid" });
  assert.equal((await h.run("state=valid&code=code")).pathname, "/account");
  assert.deepEqual(h.calls.find(([kind]) => kind === "session"), ["session", { auid: "1", tokenId: "native-token", consentedClients: [] }]);
  assert.deepEqual(h.calls.find(([kind]) => kind === "method"), ["method", "github"]);
});

test("linking requires the original authenticated account", async () => {
  const rejected = callbackHarness({ state: "valid", linkAuid: "1" }, { session: { auid: "2", tokenId: "other" } });
  assert.equal((await rejected.run("state=valid&code=code")).searchParams.get("github"), "failed");
  assert.deepEqual(rejected.calls, [["delete"]]);
  const accepted = callbackHarness({ state: "valid", linkAuid: "1" }, { session: { auid: "1", tokenId: "token" } });
  assert.equal((await accepted.run("state=valid&code=code")).searchParams.get("github"), "linked");
  assert.equal(accepted.calls.some(([kind]) => kind === "link"), true);
  assert.equal(accepted.calls.some(([kind]) => kind === "session"), false);
});

test("unlinked accounts keep their continuation and do not acquire a session", async () => {
  const h = callbackHarness({ state: "valid", next: "/authorize?client_id=example" }, { loginError: { code: "INVALID_EXTERNAL_IDENTITY" } });
  const result = await h.run("state=valid&code=code");
  assert.equal(result.searchParams.get("auth_error"), "github_not_linked");
  assert.equal(result.searchParams.get("next"), "/authorize?client_id=example");
  assert.equal(h.calls.some(([kind]) => kind === "session"), false);
});


test("GitHub profile maps avatar, handle, name and public email", async t => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async (url, options) => {
    assert.equal(url, "https://api.github.com/user");
    assert.equal(options.headers.Authorization, "Bearer profile-token");
    assert.equal(options.cache, "no-store");
    return { ok: true, json: async () => ({ login: "octocat", name: "Octo Cat", email: "octo@example.com", avatar_url: "https://avatars.githubusercontent.com/u/1" }) };
  };
  assert.deepEqual(await oauth.fetchGitHubProfile("profile-token"), {
    username: "octocat", name: "Octo Cat", email: "octo@example.com", picture: "https://avatars.githubusercontent.com/u/1",
  });
  global.fetch = async () => ({ ok: true, json: async () => ({ login: "octocat", name: null, email: null, avatar_url: "avatar" }) });
  const profile = await oauth.fetchGitHubProfile("profile-token");
  assert.equal(profile.username, "octocat");
  assert.equal(profile.email, undefined);
  assert.equal(profile.name, undefined);
  global.fetch = async () => ({ ok: false });
  assert.equal(await oauth.fetchGitHubProfile("revoked-token"), null);
  global.fetch = async () => { throw new Error("timeout"); };
  assert.equal(await oauth.fetchGitHubProfile("profile-token"), null);
});
