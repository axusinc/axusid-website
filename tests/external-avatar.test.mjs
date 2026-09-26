import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadTs(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", source)(
    name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), loadedModule, loadedModule.exports,
  );
  return loadedModule.exports;
}

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

function loadModule({ sdk, sharpImpl } = {}) {
  const sdkCalls = [];
  const sharpCalls = [];
  const authCalls = [];
  const fakeSdk = sdk ?? {
    DefaultVariation: async args => { sdkCalls.push(["DefaultVariation", args]); return { defaultVariation: { variationId: "var-1" } }; },
    Avatar: async args => { sdkCalls.push(["Avatar", args]); return { avatar: null }; },
    RequestAvatarUpload: async args => {
      sdkCalls.push(["RequestAvatarUpload", args]);
      return { requestAvatarUpload: { uploadUrl: "https://upload.test/key", objectKey: "key-1", contentType: args.contentType, sizeBytes: args.sizeBytes } };
    },
    ConfirmAvatarUpload: async args => { sdkCalls.push(["ConfirmAvatarUpload", args]); return {}; },
  };
  const fakeSharp = sharpImpl ?? (source => {
    sharpCalls.push(source);
    return {
      rotate: () => ({
        resize: (px, py, opts) => {
          sharpCalls.push(["resize", px, py, opts]);
          return { jpeg: jpegOpts => ({ toBuffer: async () => { sharpCalls.push(["jpeg", jpegOpts]); return Buffer.alloc(1024); } }) };
        },
      }),
    };
  });
  const mod = loadTs("src/lib/external-avatar.ts", {
    "server-only": {},
    "sharp": { default: fakeSharp },
    "@/lib/auth-graphql": { getAuthSdk: token => { authCalls.push(token); return fakeSdk; } },
    "@/lib/avatar": { MAX_AVATAR_SIZE_BYTES },
  });
  return { mod, sdkCalls, sharpCalls, authCalls };
}

function mockFetch(handler) {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => { calls.push([url, options]); return handler(url, options); };
  return { calls, restore: () => { global.fetch = originalFetch; } };
}

const picture = "https://lh3.googleusercontent.com/a/photo=s96-c";
const sourceImage = () => ({
  ok: true,
  headers: { get: () => null },
  arrayBuffer: async () => Buffer.alloc(2048),
});

test("Google picture URLs request a larger crop", () => {
  const { mod } = loadModule();
  assert.equal(
    mod.normalizeGooglePictureUrl("https://lh3.googleusercontent.com/a/photo=s96-c"),
    "https://lh3.googleusercontent.com/a/photo=s512-c",
  );
  assert.equal(
    mod.normalizeGooglePictureUrl("https://lh3.googleusercontent.com/a/photo=s96"),
    "https://lh3.googleusercontent.com/a/photo=s512-c",
  );
  assert.equal(
    mod.normalizeGooglePictureUrl("https://example.test/photo?sz=50"),
    "https://example.test/photo?sz=512",
  );
  assert.equal(
    mod.normalizeGooglePictureUrl("https://example.test/photo.jpg"),
    "https://example.test/photo.jpg",
  );
  assert.equal(mod.normalizeGooglePictureUrl("http://example.test/photo.jpg"), undefined);
  assert.equal(mod.normalizeGooglePictureUrl("not a url"), undefined);
  assert.equal(mod.normalizeGooglePictureUrl(undefined), undefined);
});

test("GitHub avatar URLs request a larger raster", () => {
  const { mod } = loadModule();
  const normalized = new URL(mod.normalizeGitHubAvatarUrl("https://avatars.githubusercontent.com/u/1?v=4"));
  assert.equal(normalized.searchParams.get("s"), "512");
  assert.equal(normalized.searchParams.get("v"), "4");
  assert.equal(mod.normalizeGitHubAvatarUrl("http://avatars.githubusercontent.com/u/1"), undefined);
  assert.equal(mod.normalizeGitHubAvatarUrl(undefined), undefined);
});

test("successful import uploads a processed JPEG and confirms it", async t => {
  const { mod, sdkCalls, authCalls } = loadModule();
  const net = mockFetch((url, options) => {
    if (url === picture) return sourceImage();
    if (url === "https://upload.test/key") {
      assert.equal(options.method, "PUT");
      assert.equal(options.headers["Content-Type"], "image/jpeg");
      assert.ok(options.body instanceof Blob);
      assert.equal(options.body.size, 1024);
      return { ok: true };
    }
    throw new Error(`unexpected fetch ${url}`);
  });
  t.after(net.restore);

  assert.equal(await mod.importExternalAvatar({ auid: "auid-1", tokenId: "token-1", pictureUrl: picture }), true);
  assert.deepEqual(authCalls, ["token-1"]);
  assert.deepEqual(sdkCalls[0], ["DefaultVariation", { auid: "auid-1" }]);
  assert.deepEqual(sdkCalls[1], ["Avatar", { variationId: "var-1" }]);
  const upload = sdkCalls.find(([kind]) => kind === "RequestAvatarUpload");
  assert.equal(upload[1].contentType, "image/jpeg");
  assert.equal(upload[1].sizeBytes, 1024);
  assert.deepEqual(
    sdkCalls.find(([kind]) => kind === "ConfirmAvatarUpload"),
    ["ConfirmAvatarUpload", { auid: "auid-1", variationId: "var-1", objectKey: "key-1" }],
  );
});

test("existing avatars are kept unless onlyIfEmpty is false", async t => {
  const withAvatar = {
    DefaultVariation: async () => ({ defaultVariation: { variationId: "var-1" } }),
    Avatar: async () => ({ avatar: { objectKey: "existing" } }),
    RequestAvatarUpload: async () => { throw new Error("must not upload"); },
    ConfirmAvatarUpload: async () => { throw new Error("must not confirm"); },
  };
  const { mod } = loadModule({ sdk: withAvatar });
  const net = mockFetch(() => { throw new Error("must not download"); });
  t.after(net.restore);
  assert.equal(await mod.importExternalAvatar({ auid: "a", tokenId: "t", pictureUrl: picture }), false);
  assert.equal(net.calls.length, 0);

  const sdkCalls = [];
  const recording = {
    DefaultVariation: async () => ({ defaultVariation: { variationId: "var-1" } }),
    Avatar: async args => { sdkCalls.push(["Avatar", args]); return { avatar: { objectKey: "existing" } }; },
    RequestAvatarUpload: async args => {
      sdkCalls.push(["RequestAvatarUpload", args]);
      return { requestAvatarUpload: { uploadUrl: "https://upload.test/key", objectKey: "key-1", contentType: args.contentType, sizeBytes: args.sizeBytes } };
    },
    ConfirmAvatarUpload: async args => { sdkCalls.push(["ConfirmAvatarUpload", args]); return {}; },
  };
  const forced = loadModule({ sdk: recording });
  const net2 = mockFetch(url => (url === picture ? sourceImage() : { ok: true }));
  t.after(net2.restore);
  assert.equal(await forced.mod.importExternalAvatar({ auid: "a", tokenId: "t", pictureUrl: picture, onlyIfEmpty: false }), true);
  assert.equal(sdkCalls.some(([kind]) => kind === "Avatar"), false);
  assert.equal(sdkCalls.some(([kind]) => kind === "RequestAvatarUpload"), true);
});

test("invalid picture URLs never touch the engine", async t => {
  const { mod, authCalls } = loadModule();
  const net = mockFetch(() => { throw new Error("must not fetch"); });
  t.after(net.restore);
  for (const pictureUrl of [undefined, "", "not a url", "http://example.test/photo.jpg", "ftp://example.test/photo.jpg"]) {
    assert.equal(await mod.importExternalAvatar({ auid: "a", tokenId: "t", pictureUrl }), false);
  }
  assert.equal(authCalls.length, 0);
  assert.equal(net.calls.length, 0);
});

test("undecodable images and failed uploads report false without throwing", async t => {
  const failingSharp = () => { throw new Error("unsupported"); };
  const { mod } = loadModule({ sharpImpl: failingSharp });
  const net = mockFetch(url => (url === picture ? sourceImage() : { ok: true }));
  t.after(net.restore);
  assert.equal(await mod.importExternalAvatar({ auid: "a", tokenId: "t", pictureUrl: picture }), false);

  const { mod: mod2 } = loadModule();
  const net2 = mockFetch(url => (url === picture ? sourceImage() : { ok: false }));
  t.after(net2.restore);
  assert.equal(await mod2.importExternalAvatar({ auid: "a", tokenId: "t", pictureUrl: picture }), false);
});
