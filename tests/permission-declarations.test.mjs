import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { ClientError } from 'graphql-request';
import { buildSchema, parse, validate } from 'graphql';
const require = createRequire(import.meta.url);
function loadTs(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), loaded, loaded.exports);
  return loaded.exports;
}
const input = loadTs('src/lib/permission-declaration-input.ts');
const errors = loadTs('src/lib/graphql-errors.ts', { 'server-only': {}, 'graphql-request': { ClientError } });
const own = { id: '11111111-1111-4111-8111-111111111111', context: '1', name: 'posts', version: 1 };
function setup(overrides = {}, session = { auid: '1', tokenId: 'private' }) {
  const calls = [];
  const sdk = Object.fromEntries(Object.entries({
    PermissionDeclarations: async () => ({ permissionDeclarations: [own] }),
    PublishPermissionDeclaration: async () => ({ publishPermissionDeclaration: { ...own, version: 2 } }),
    NotifyValidationChanged: async () => ({ notifyValidationChanged: true }), ...overrides,
  }).map(([name, fn]) => [name, async (args) => { calls.push({ name, args }); return fn(args); }]));
  const { declarationAction } = loadTs('src/app/actions/permission-declarations.ts', {
    '@/lib/auth-graphql': { getAuthSdkForSession: () => sdk }, '@/lib/session-access': { getValidSession: async () => session },
    '@/lib/graphql-errors': errors, '@/lib/permission-declaration-input': input,
  });
  return { action: declarationAction, calls };
}

test('complete declarations retain all six types and every supported constraint/metadata field', () => {
  for (const type of ['STRING', 'INTEGER', 'LONG', 'DOUBLE', 'BOOLEAN', 'AUID']) {
    const value = { name: 'example', template: 'item.{value}.read', params: [{ name: 'value', type, allowWildcard: true, allowedValues: ['9223372036854775807'], regex: '.*', minLength: 1, maxLength: 100, minNumber: -1, maxNumber: 2, label: 'Value', description: 'A value', icon: 'key', hint: 'Enter one' }], validatorUrl: 'https://app.example.com/validate', combinationInvariantJs: 'function(bindings) { return true; }', title: 'Read {value}', description: 'Example', icon: 'key', order: -1 };
    assert.deepEqual(input.parseDeclarationJson(JSON.stringify(value)).declaration, value);
  }
});

test('publisher rejects malformed JSON, unknown fields, unmatched definitions and invalid constraints', () => {
  for (const json of ['{', JSON.stringify({ ...input.declarationExample, unexpected: true }), JSON.stringify({ ...input.declarationExample, params: [] }), JSON.stringify({ ...input.declarationExample, template: 'section.*.posts.create' }), JSON.stringify({ ...input.declarationExample, params: [{ name: 'section', type: 'BIGINT' }] }), JSON.stringify({ ...input.declarationExample, params: [{ name: 'section', minNumber: 5, maxNumber: 1 }] }), JSON.stringify({ ...input.declarationExample, order: 1.5 }), JSON.stringify({ ...input.declarationExample, order: 2147483648 })]) {
    assert.ok(input.parseDeclarationJson(json).error);
  }
});

test('publishing always uses the active account as owner and preserves the complete input', async () => {
  const { action, calls } = setup();
  const result = await action({ kind: 'publish', json: JSON.stringify(input.declarationExample), ownerAuid: 'untrusted' });
  assert.equal(result.published.version, 2);
  assert.deepEqual(calls[0].args, { ownerAuid: '1', declaration: input.declarationExample });
});

test('invalid publishing inputs do not call the engine mutation', async () => {
  const { action, calls } = setup();
  assert.ok((await action({ kind: 'publish', json: '{}' })).error);
  assert.equal(calls.length, 0);
});

test('cache invalidation verifies declaration ownership before mutating', async () => {
  const { action, calls } = setup();
  assert.ok((await action({ kind: 'invalidate', declarationId: '22222222-2222-4222-8222-222222222222' })).error);
  assert.equal(calls.filter((c) => c.name === 'NotifyValidationChanged').length, 0);
  assert.deepEqual(calls[0].args, { contextAuid: '1' });
  assert.equal((await action({ kind: 'invalidate', declarationId: own.id })).invalidated, true);
});

test('publishing requires a session and keeps authorization errors readable', async () => {
  const noSession = setup({}, null);
  assert.match((await noSession.action({ kind: 'list' })).error, /Sign in/);
  assert.equal(noSession.calls.length, 0);
  const fail = new ClientError({ errors: [{ message: 'internal details', extensions: { code: 'NOT_AUTHORIZED' } }] }, { query: 'mutation' });
  const blocked = setup({ PublishPermissionDeclaration: async () => { throw fail; } });
  assert.match((await blocked.action({ kind: 'publish', json: JSON.stringify(input.declarationExample) })).error, /permission/);
});

test('documentation GraphQL examples validate against the authoritative snapshot', () => {
  const examples = loadTs('src/lib/permission-doc-examples.ts');
  const schema = buildSchema(fs.readFileSync(new URL('../schema_prod.graphql', import.meta.url), 'utf8'));
  for (const [name, value] of Object.entries(examples)) if (name !== 'permissionApiSignatures') assert.deepEqual(validate(schema, parse(value)), [], name);
});

test('all new declaration errors work without groupCode and are not mistaken for invalid sessions', () => {
  for (const code of ['UNDECLARED_PERMISSION', 'INVALID_PERMISSION_BINDINGS', 'PERMISSION_INVARIANT_VIOLATED', 'PERMISSION_DYNAMIC_REJECTED', 'PERMISSION_VALIDATOR_UNAVAILABLE', 'INVALID_DECLARATION_TEMPLATE', 'DECLARATION_DUPLICATE', 'INVALID_PARAM_DEF']) {
    const fail = new ClientError({ errors: [{ message: 'internal details', extensions: { code } }] }, { query: 'mutation' });
    assert.ok(!errors.permissionErrorMessage(fail).includes('internal details'));
    assert.equal(errors.isAuthError(fail), false);
    assert.equal(errors.isTokenInvalidError(fail), false);
    assert.equal(errors.isPermissionValidationError(fail), code !== 'PERMISSION_VALIDATOR_UNAVAILABLE');
  }
});
