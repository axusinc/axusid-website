import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { ClientError } from 'graphql-request';
import { buildSchema, parse, validate } from 'graphql';
const loadDependency = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadTs(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : loadDependency(name), loadedModule, loadedModule.exports,
  );
  return loadedModule.exports;
}
const presentation = loadTs('src/lib/permission-presentation.ts');
const grantId = '11111111-1111-4111-8111-111111111111';
const grant = {
  id: grantId, granteeAuid: '2', permission: 'identity.1.variation.write',
  effect: 'ALLOW', activationState: 'ACTIVE', isShadow: false,
};

function setup(overrides = {}, session = { auid: '1', tokenId: 'private-token' }) {
  const calls = [];
  const implementations = {
    MyGrants: async () => ({ grants: [{ permission: 'identity.1.*' }] }),
    MyDelegatedGrants: async () => ({ delegatedGrants: [] }),
    EffectivePermission: async ({ permission }) => ({ checkPermission: { allowed: permission !== 'identity.1.username.write' } }),
    Usernames: async () => ({ usernames: { defaultUsername: 'alex' } }),
    OwnerByUsername: async () => ({ ownerByUsername: '2' }),
    SharePermission: async () => ({ delegatePermission: grant }),
    RemoveSharedPermission: async () => ({ revokeGrant: true }),
    ...overrides,
  };
  const sdk = Object.fromEntries(Object.entries(implementations).map(([name, fn]) => [name, async (args) => {
    calls.push({ name, args }); return fn(args);
  }]));
  const { permissionAction } = loadTs('src/app/actions/permissions.ts', {
    'graphql-request': { ClientError },
    '@/lib/auth-graphql': { getAuthSdkForSession: (current) => { assert.equal(current, session); return sdk; } },
    '@/lib/session-access': { getValidSession: async () => session },
    '@/lib/permission-presentation': presentation,
  });
  return { action: permissionAction, calls };
}

test('GraphQL operations validate against the backend schema snapshot', () => {
  const schema = buildSchema(fs.readFileSync(path.join(root, 'schema_prod.graphql'), 'utf8'));
  const document = parse(fs.readFileSync(path.join(root, 'src/graphql/operations/permissions.graphql'), 'utf8'));
  assert.deepEqual(validate(schema, document), []);
});

test('listing outgoing grants is scoped to the signed-in account and resolves usernames', async () => {
  const { action, calls } = setup({ MyDelegatedGrants: async () => ({ delegatedGrants: [grant] }) });
  const result = await action({ kind: 'list', auid: 'untrusted' });
  assert.equal(result.shared[0].username, 'alex');
  assert.equal(result.shared[0].permission.label, 'Edit profile');
  assert.equal(result.shared[0].state, 'shared');
  assert.ok(calls.filter((call) => ['MyGrants', 'MyDelegatedGrants', 'EffectivePermission'].includes(call.name)).every((call) => call.args.auid === '1'));
  assert.equal(result.permissions.length, 1);
  assert.ok(result.shareOptions.some((item) => item.key === 'identity.1.variation.write'));
  assert.ok(result.shareOptions.every((item) => !item.key.includes('*') && item.available));
  assert.ok(!result.shareOptions.some((item) => item.key === 'identity.1.username.write'));
});

test('sharing accepts usernames and always delegates from the active account', async () => {
  const { action, calls } = setup();
  const result = await action({ kind: 'share', username: ' @alex ', permission: grant.permission, granterAuid: 'untrusted' });
  assert.equal(result.sharedGrant.id, grantId);
  assert.deepEqual(calls.find((call) => call.name === 'OwnerByUsername').args, { username: 'alex' });
  assert.deepEqual(calls.find((call) => call.name === 'SharePermission').args, { granterAuid: '1', granteeAuid: '2', permission: grant.permission });
});

test('repeat sharing returns the existing grant without creating duplicates', async () => {
  const { action, calls } = setup({ MyDelegatedGrants: async () => ({ delegatedGrants: [grant] }) });
  const result = await action({ kind: 'share', username: 'alex', permission: grant.permission });
  assert.equal(result.alreadyShared, true);
  assert.equal(result.sharedGrant.id, grantId);
  assert.ok(!calls.some((call) => call.name === 'SharePermission'));
});

test('unknown recipients, self-sharing and invalid input do not mutate permissions', async () => {
  for (const recipient of [null, '1']) {
    const { action, calls } = setup({ OwnerByUsername: async () => ({ ownerByUsername: recipient }) });
    assert.ok((await action({ kind: 'share', username: 'alex', permission: grant.permission })).error);
    assert.ok(!calls.some((call) => call.name === 'SharePermission'));
  }
  const { action, calls } = setup();
  assert.ok((await action({ kind: 'share', username: '@', permission: grant.permission })).error);
  assert.equal(calls.length, 0);
});

test('revoke refuses grants not delegated by the active account', async () => {
  const { action, calls } = setup();
  assert.ok((await action({ kind: 'revoke', grantId })).error);
  assert.ok(!calls.some((call) => call.name === 'RemoveSharedPermission'));
  const own = setup({ MyDelegatedGrants: async () => ({ delegatedGrants: [grant] }) });
  assert.equal((await own.action({ kind: 'revoke', grantId })).revoked, true);
});

test('paused and unknown access are not reported as shared availability', async () => {
  for (const allowed of [false, null]) {
    const { action } = setup({
      MyDelegatedGrants: async () => ({ delegatedGrants: [grant] }),
      EffectivePermission: async () => { if (allowed === null) throw new Error('offline'); return { checkPermission: { allowed } }; },
    });
    const result = await action({ kind: 'list' });
    assert.equal(result.shared[0].state, allowed === null ? 'unverified' : 'paused');
    assert.equal(result.shareOptions.length, 0);
  }
});

test('nested account IDs work internally and never appear in display labels', async () => {
  const permission = 'identity.1,2.variation.write';
  const { action, calls } = setup({}, { auid: '1,2', tokenId: 'private-token' });
  assert.ok(!(await action({ kind: 'share', username: 'alex', permission })).error);
  assert.equal(calls.find((call) => call.name === 'SharePermission').args.granterAuid, '1,2');
  assert.equal(presentation.permissionPresentation(permission).label, 'Edit profile');
});

test('authorization failures are readable and sessions are required', async () => {
  const error = new ClientError({ errors: [{ message: 'internal details', extensions: { code: 'NOT_AUTHORIZED' } }] }, { query: 'query' });
  const { action } = setup({ SharePermission: async () => { throw error; } });
  const result = await action({ kind: 'share', username: 'alex', permission: grant.permission });
  assert.match(result.error, /can’t share/);
  assert.ok(!result.error.includes('internal details'));
  const signedOut = setup({}, null);
  assert.match((await signedOut.action({ kind: 'list' })).error, /Sign in/);
  assert.equal(signedOut.calls.length, 0);
});
