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

test("ending a session retires only its app grants plus grants from before parent tracking", async () => {
  const rows = [
    { id: "current", userAuid: "1", parentSessionTokenHash: "hash:current", revokedAt: null, tokenId: "app-current" },
    { id: "other-session", userAuid: "1", parentSessionTokenHash: "hash:other", revokedAt: null, tokenId: "app-other" },
    { id: "legacy", userAuid: "1", parentSessionTokenHash: null, revokedAt: null, tokenId: "app-legacy" },
    { id: "other-user", userAuid: "2", parentSessionTokenHash: "hash:current", revokedAt: null, tokenId: "app-user-2" },
  ];
  const revoked = [];
  const eq = (column, value) => (row) => row[column] === value;
  const isNull = (column) => (row) => row[column] == null;
  const and = (...predicates) => (row) => predicates.filter(Boolean).every((predicate) => predicate(row));
  const or = (...predicates) => (row) => predicates.filter(Boolean).some((predicate) => predicate(row));
  const db = {
    select: (projection) => ({ from: () => ({ where: async (predicate) => rows.filter(predicate).map((row) =>
      Object.fromEntries(Object.entries(projection).map(([key, column]) => [key, row[column]]))) }) }),
    update: () => ({ set: (values) => ({ where: (predicate) => ({ returning: async () => {
      const matched = rows.filter(predicate);
      matched.forEach((row) => Object.assign(row, values));
      return matched;
    } }) }) }),
  };
  const columns = Object.fromEntries(Object.keys(rows[0]).map((key) => [key, key]));
  const grants = loadTs("src/lib/oauth/grants.ts", {
    "server-only": {},
    "drizzle-orm": { eq, isNull, and, or, desc: () => {} },
    "@/lib/crypto/secret-box": { decryptJson: async (value) => value, encryptJson: async (value) => value },
    "@/lib/db": { getDb: () => db },
    "@/lib/db/schema": { oauthGrants: columns },
    "@/lib/oauth/audit": { recordOAuthEvent: async () => {} },
    "@/lib/oauth/adapter": { revokeWithBackend: async (token) => revoked.push(token) },
    "@/lib/oauth/scopes": { permissionImplies: () => false },
    "@/lib/oauth/pkce": { sha256Base64Url: async (token) => `hash:${token}` },
  });

  await grants.revokeGrantsForSession("1", "current");
  assert.deepEqual(rows.filter((row) => row.revokedAt).map((row) => row.id).sort(), ["current", "legacy"]);
  assert.deepEqual(revoked.sort(), ["app-current", "app-legacy"]);
});
