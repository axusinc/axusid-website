import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import sharp from "sharp";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadTs(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", source)(
    name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}

const hash = createHash("md5").update("1,2@amail.com").digest("hex");
const sha256 = createHash("sha256").update("1,2@amail.com").digest("hex");

function setup({ auid = "1,2", variation = "variation-1", avatar = { objectKey: "key", updatedAt: "v1" }, failure } = {}) {
  const calls = [];
  const mod = loadTs("src/lib/gravatar.ts", {
    "server-only": {},
    sharp: { default: sharp },
    "@/lib/avatar": { MAX_AVATAR_SIZE_BYTES: 2 * 1024 * 1024 },
    "@/lib/avatar-server": { avatarImageUrl: (id, version) => `https://engine.test/v1/variations/${id}/avatar?v=${version}` },
    "@/lib/gravatar-accounts": { findGravatarAccount: async value => {
      calls.push(["lookup", value]);
      if (failure) throw failure;
      return auid;
    } },
    "@/lib/auth-graphql": { getAuthSdk: (...args) => {
      calls.push(["sdk", args]);
      return {
        DefaultVariation: async ({ auid }) => {
          calls.push(["defaultVariation", auid]);
          return { defaultVariation: variation ? { variationId: variation } : null };
        },
        Avatar: async ({ variationId }) => {
          calls.push(["avatar", variationId]);
          return { avatar };
        },
      };
    } },
  });
  return { ...mod, calls, request: (query = "", value = hash) =>
    mod.serveGravatar(new Request(`https://avatars.test/gravatar/${value}?${query}`), value) };
}

test("MD5 and SHA-256 hashes use indexed lookups of the synthetic email", async () => {
  const calls = [];
  const table = { auid: "auid", md5: "md5", sha256: "sha256" };
  const registry = loadTs("src/lib/gravatar-accounts.ts", {
    "server-only": {},
    "@/lib/synthetic-email": loadTs("src/lib/synthetic-email.ts"),
    "drizzle-orm": { eq: (column, value) => [column, value] },
    "@/lib/db/schema": { gravatarAccounts: table },
    "@/lib/db": { getDb: () => ({
      insert: () => ({ values: value => ({ onConflictDoNothing: async () => { calls.push(["register", value]); } }) }),
      select: () => ({ from: () => ({ where: condition => ({ limit: async () => {
        calls.push(["find", condition]);
        return [{ auid: "1,2" }];
      } }) }) }),
    }) },
  });
  await registry.registerGravatarAccount("1,2");
  assert.equal(await registry.findGravatarAccount(hash), "1,2");
  assert.equal(await registry.findGravatarAccount(sha256), "1,2");
  assert.deepEqual(calls, [
    ["register", { auid: "1,2", md5: hash, sha256 }],
    ["find", ["md5", hash]],
    ["find", ["sha256", sha256]],
  ]);
});

test("OIDC claims register the same synthetic email that apps receive", async () => {
  const registrations = [];
  const claims = loadTs("src/lib/oauth/claims.ts", {
    "server-only": {},
    "@/lib/gravatar-accounts": { registerGravatarAccount: async auid => { registrations.push(auid); } },
    "@/lib/auth-graphql": { getAuthSdk: () => ({}) },
    "@/lib/user-profile": {
      ...loadTs("src/lib/synthetic-email.ts"),
      fetchUserProfileWithVariations: async () => ({ user: {}, variations: [] }),
    },
  });
  const result = await claims.buildOidcClaims("1,2", undefined, ["openid", "email"]);
  assert.equal(result.email, "1,2@amail.com");
  assert.deepEqual(registrations, ["1,2"]);
});

test("malformed hashes fail before any lookup", async () => {
  const h = setup();
  for (const value of ["", "1,2@amail.com", "a".repeat(31), "g".repeat(32), "a".repeat(33), `${hash}.png`]) {
    const response = await h.request("", value);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.deepEqual(h.calls, []);
});

test("uppercase hashes and optional jpg suffixes normalize for both algorithms", async () => {
  const h = setup({ auid: null });
  await h.request("d=404", `${hash.toUpperCase()}.JPG`);
  await h.request("d=404", `${sha256.toUpperCase()}.jpg`);
  assert.deepEqual(h.calls, [["lookup", hash], ["lookup", sha256]]);
});

test("missing accounts, variations and avatars honor d=404", async () => {
  for (const state of [{ auid: null }, { variation: null }, { avatar: null }, { avatar: { objectKey: null } }]) {
    const response = await setup(state).request("default=404");
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(response.headers.get("cache-control"), "public, max-age=300");
  }
});

test("fallbacks use Gravatar's generators with forced default and normalized size", async () => {
  const response = await setup({ auid: null }).request("size=128&default=retro&rating=pg");
  assert.equal(response.status, 302);
  const url = new URL(response.headers.get("location"));
  assert.equal(url.origin, "https://www.gravatar.com");
  assert.equal(url.pathname, `/avatar/${hash}`);
  assert.equal(url.searchParams.get("s"), "128");
  assert.equal(url.searchParams.get("d"), "retro");
  assert.equal(url.searchParams.get("f"), "y");
  assert.equal(url.searchParams.get("rating"), "pg");

  const custom = "https://example.test/avatar.jpg?a=b&c=d";
  const customResponse = await setup({ auid: null }).request(new URLSearchParams({ d: custom }).toString());
  assert.equal(new URL(customResponse.headers.get("location")).searchParams.get("d"), custom);
});

test("forced defaults skip database and backend reads", async () => {
  const h = setup();
  assert.equal((await h.request("f=y&d=404")).status, 404);
  assert.equal((await h.request("forcedefault=y&default=blank")).status, 302);
  assert.deepEqual(h.calls, []);
});

test("sizes default to 80 and accept the documented limits", async () => {
  for (const [query, expected] of [
    ["", 80], ["s=1", 1], ["s=2048", 2048], ["s=0", 80], ["s=-1", 80],
    ["s=2049", 80], ["s=1.5", 80], ["s=NaN", 80], ["s=12px", 80], ["s=64&size=128", 64],
  ]) {
    const response = await setup({ auid: null }).request(query);
    assert.equal(Number(new URL(response.headers.get("location")).searchParams.get("s")), expected);
  }
});

test("real images resize to square JPEGs from the current public default variation", async t => {
  const source = await sharp({ create: { width: 100, height: 50, channels: 3, background: "#123456" } }).png().toBuffer();
  const downloads = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    downloads.push([url, options]);
    return new Response(source);
  });
  const h = setup();
  const response = await h.request("s=24&d=404");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  const image = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  assert.equal(image.width, 24);
  assert.equal(image.height, 24);
  assert.equal(image.format, "jpeg");
  assert.deepEqual(h.calls, [["lookup", hash], ["sdk", []], ["defaultVariation", "1,2"], ["avatar", "variation-1"]]);
  assert.equal(downloads[0][0], "https://engine.test/v1/variations/variation-1/avatar?v=v1");
  assert.equal(downloads[0][1].cache, "no-store");
  assert.ok(downloads[0][1].signal instanceof AbortSignal);
});

test("stale avatar metadata followed by storage 404 uses the requested default", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 404 }));
  assert.equal((await setup().request("d=404")).status, 404);
});

test("service failures and oversized or invalid images return uncached 503s", async t => {
  t.mock.method(console, "error", () => {});
  const failedLookup = await setup({ failure: new Error("database unavailable") }).request("d=404");
  assert.equal(failedLookup.status, 503);
  for (const makeResponse of [
    () => new Response(null, { status: 500 }),
    () => new Response("not an image"),
    () => new Response("", { headers: { "content-length": String(3 * 1024 * 1024) } }),
    () => new Response(Buffer.alloc(2 * 1024 * 1024 + 1)),
  ]) {
    t.mock.method(globalThis, "fetch", async () => makeResponse());
    const response = await setup().request("d=404");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("retry-after"), "30");
  }
});

test("the Next.js route awaits dynamic params and delegates to the image handler", async () => {
  const calls = [];
  const route = loadTs("src/app/gravatar/[emailHash]/route.ts", {
    "@/lib/gravatar": { serveGravatar: async (request, value) => {
      calls.push([request.url, value]);
      return new Response(null, { status: 404 });
    } },
  });
  const request = new Request(`https://avatars.test/gravatar/${hash}?d=404`);
  assert.equal((await route.GET(request, { params: Promise.resolve({ emailHash: hash }) })).status, 404);
  assert.deepEqual(calls, [[request.url, hash]]);
});
