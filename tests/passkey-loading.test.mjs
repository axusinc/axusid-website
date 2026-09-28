import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientError } from "graphql-request";

const require = createRequire(import.meta.url);
function loadTs(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", source)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}
const graphqlErrors = loadTs("src/lib/graphql-errors.ts", { "server-only": {} });
function backendError(code) {
  return new ClientError({ status: 200, errors: [{ message: "private backend details", extensions: { code, groupCode: "FORBIDDEN" } }] }, { query: "query Passkeys" });
}
function setup(response) {
  return loadTs("src/lib/passkey-graphql.ts", {
    "server-only": {},
    "@/lib/graphql-errors": graphqlErrors,
    "@/lib/auth-graphql": { getAuthSdk: (token) => {
      assert.equal(token, "test-session-token");
      return { Passkeys: async (variables) => {
        assert.deepEqual(variables, { auid: "1" });
        if (response instanceof Error) throw response;
        return { passkeys: response };
      } };
    } },
  }).getUserPasskeys;
}

test("passkey loading preserves credential metadata and distinguishes a successful empty list", async () => {
  const expected = { id: "credential-1", credentialId: "credential-1", name: "Laptop", transports: ["internal"], backupEligible: true, backedUp: false, createdAt: "2026-09-27T00:00:00Z", lastUsedAt: null };
  const credential = { ...expected, auid: "1" };
  const loaded = await setup([credential])("1", "test-session-token");
  assert.deepEqual(loaded, { passkeys: [expected] });
  assert.deepEqual(await setup([])("1", "test-session-token"), { passkeys: [] });
});

test("permission denials and undeclared MFA permissions are errors rather than empty passkey lists", async () => {
  for (const code of ["NOT_AUTHORIZED", "UNDECLARED_PERMISSION"]) {
    const result = await setup(backendError(code))("1", "test-session-token");
    assert.equal(result.passkeys, undefined);
    assert.ok(result.error);
    assert.ok(!result.error.includes("private backend details"));
  }
});

test("a passkey service outage returns a retryable error", async () => {
  const result = await setup(new Error("private connection details"))("1", "test-session-token");
  assert.equal(result.passkeys, undefined);
  assert.equal(result.error, "We couldn’t load your passkeys. Please try again.");
});

test("invalid passkey session tokens still propagate to account session recovery", async () => {
  for (const code of ["TOKEN_INVALID", "TOKEN_REQUIRED"]) {
    const error = backendError(code);
    await assert.rejects(setup(error)("1", "test-session-token"), (caught) => caught === error);
  }
});

const container = ({ children }) => React.createElement("div", null, children);
const { PasskeySection } = loadTs("src/app/account/passkey-section.tsx", {
  "@/components/ui/badge": { Badge: container },
  "@/components/ui/button": { Button: ({ children }) => React.createElement("button", null, children), buttonVariants: () => "button" },
  "@/components/ui/card": { Card: container, CardHeader: ({ title, badge, action }) => React.createElement("header", null, title, badge, action) },
  "@/components/ui/confirm-button": { ConfirmButton: container },
  "@/components/ui/form-message": { FormError: ({ children }) => React.createElement("p", { role: "alert" }, children), FormSuccess: container },
  "@/components/ui/input": {},
  "@/lib/webauthn": {},
  "@/app/actions/passkey": {},
  "@/lib/passkey-naming": { DEFAULT_PASSKEY_NAME: "Passkey" },
  "@/lib/utils": { cn: (...classes) => classes.join(" "), formatDate: (date) => date },
});

test("unavailable passkeys show an error and retry without claiming there are no credentials", () => {
  const html = renderToStaticMarkup(React.createElement(PasskeySection, { passkeyLoadError: "Your session cannot read passkeys." }));
  assert.match(html, /Your session cannot read passkeys/);
  assert.match(html, /Unavailable/);
  assert.match(html, /href="\/account\?section=security"/);
  assert.match(html, /Try again/);
  assert.doesNotMatch(html, /You haven’t added a passkey yet/);
  assert.doesNotMatch(html, /Add passkey/);
});

test("a successful empty passkey list still offers enrollment", () => {
  const html = renderToStaticMarkup(React.createElement(PasskeySection, { initialPasskeys: [] }));
  assert.match(html, /You haven’t added a passkey yet/);
  assert.match(html, /Add passkey/);
  assert.doesNotMatch(html, /Unavailable/);
});
