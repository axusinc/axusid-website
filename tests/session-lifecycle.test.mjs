import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

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

function setup(initialAccounts, activeAuid = initialAccounts[0]?.auid, failSet = false) {
  const events = [];
  let cookie = initialAccounts.length ? JSON.stringify({ activeAuid, accounts: initialAccounts }) : undefined;
  const cookieStore = {
    get: () => cookie === undefined ? undefined : { value: cookie },
    set: (_name, value) => {
      if (failSet) throw new Error("cookie write failed");
      cookie = value || undefined;
      events.push(["cookie", cookie]);
    },
  };
  const session = loadTs("src/lib/session-access.ts", {
    "server-only": {},
    "next/headers": { cookies: async () => cookieStore },
    "@/lib/session": {
      SESSION_COOKIE: "session",
      clearSessionCookieOptions: {},
      sessionCookieOptions: {},
      getMultiSession: async (value) => value ? JSON.parse(value) : null,
      serializeMultiSession: async (value) => JSON.stringify(value),
      serializeSession: async (value) => JSON.stringify({ activeAuid: value.auid, accounts: [value] }),
    },
    "@/lib/oauth/adapter": { revokeWithBackend: async (token) => { events.push(["revoke", token]); } },
    "@/lib/oauth/grants": { revokeGrantsForSession: async (auid, token) => { events.push(["grants", auid, token]); } },
  });
  return { session, events, read: () => cookie ? JSON.parse(cookie) : null };
}

test("replacing a login persists the new token before retiring the old token and its grants", async () => {
  const old = { auid: "1", tokenId: "old", consentedClients: [] };
  const other = { auid: "2", tokenId: "other", consentedClients: [] };
  const h = setup([old, other]);
  await h.session.addAccountToSession({ ...old, tokenId: "new" });
  assert.deepEqual(h.read().accounts.map((account) => account.tokenId), ["new", "other"]);
  assert.deepEqual(h.events.map(([kind]) => kind), ["cookie", "grants", "revoke"]);
  assert.deepEqual(h.events[1], ["grants", "1", "old"]);
  assert.deepEqual(h.events[2], ["revoke", "old"]);
});

test("updating session metadata does not revoke the same native token", async () => {
  const account = { auid: "1", tokenId: "same", consentedClients: [] };
  const h = setup([account]);
  await h.session.addAccountToSession({ ...account, consentedClients: ["app"] });
  assert.deepEqual(h.events.map(([kind]) => kind), ["cookie"]);
});

test("signing out removes only the selected account and retires its dependent grants", async () => {
  const h = setup([
    { auid: "1", tokenId: "one", consentedClients: [] },
    { auid: "2", tokenId: "two", consentedClients: [] },
  ]);
  await h.session.removeAccountFromSession("1");
  assert.equal(h.read().activeAuid, "2");
  assert.deepEqual(h.events.slice(1), [["grants", "1", "one"], ["revoke", "one"]]);
});

test("a failed cookie write does not falsely complete login or revoke the previous token", async () => {
  const h = setup([{ auid: "1", tokenId: "old", consentedClients: [] }], "1", true);
  await assert.rejects(h.session.addAccountToSession({ auid: "1", tokenId: "new", consentedClients: [] }), /cookie write failed/);
  assert.equal(h.read().accounts[0].tokenId, "old");
  assert.deepEqual(h.events, []);
});

test("avatar URL changes with updatedAt so browsers request replacements", () => {
  const previous = process.env.AUTH_GRAPHQL_ENDPOINT;
  process.env.AUTH_GRAPHQL_ENDPOINT = "https://engine.test/graphql";
  try {
    const { avatarImageUrl } = loadTs("src/lib/avatar-server.ts", { "server-only": {} });
    const first = avatarImageUrl("v 1", "2026-09-24T10:00:00Z");
    const second = avatarImageUrl("v 1", "2026-09-24T10:01:00Z");
    assert.notEqual(first, second);
    assert.ok(first.startsWith("https://engine.test/v1/variations/v%201/avatar?v="));
  } finally {
    if (previous === undefined) delete process.env.AUTH_GRAPHQL_ENDPOINT;
    else process.env.AUTH_GRAPHQL_ENDPOINT = previous;
  }
});
