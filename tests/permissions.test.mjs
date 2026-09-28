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
const permissionContext = loadTs('src/lib/permission-context.ts');
const graphqlErrors = loadTs('src/lib/graphql-errors.ts', {
  'server-only': {},
  'graphql-request': { ClientError },
});
const grantId = '11111111-1111-4111-8111-111111111111';
const grant = {
  id: grantId, granteeAuid: '2', permission: 'identity.1.variation.write',
  permissionContext: '4', effect: 'ALLOW', activationState: 'ACTIVE', isShadow: false,
};

function setup(overrides = {}, session = { auid: '1', tokenId: 'private-token' }) {
  const calls = [];
  const implementations = {
    MyGrants: async () => ({ grants: [{ permission: 'identity.1.variation.write', permissionContext: '4', origin: { type: 'DIRECT' } }] }),
    PermissionDeclarations: async () => ({ permissionDeclarations: ['variation.write', 'username.write', 'grants.read', 'grants.delegate'].map((suffix) => ({ id: suffix, context: '4', name: suffix, template: `identity.{auid}.${suffix}` })) }),
    DescribePermission: async ({ contextAuid, permission }) => {
      if (permission.endsWith('.*') || permission === '*') throw new ClientError({ errors: [{ message: 'undeclared', extensions: { code: 'UNDECLARED_PERMISSION' } }] }, { query: 'query' });
      const display = presentation.permissionPresentation(permission);
      return { describePermission: { key: permission, context: contextAuid, title: contextAuid === '4' ? display.label : `App ${contextAuid}: ${permission}`, description: display.description, params: [] } };
    },
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
    '@/lib/permission-context': permissionContext,
    '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
    '@/lib/graphql-errors': graphqlErrors,
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
  assert.deepEqual(calls.find((call) => call.name === 'SharePermission').args, { granterAuid: '1', granteeAuid: '2', permission: grant.permission, permissionContext: '4' });
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
  assert.match(result.error, /permission to perform/);
  assert.ok(!result.error.includes('internal details'));
  const signedOut = setup({}, null);
  assert.match((await signedOut.action({ kind: 'list' })).error, /Sign in/);
  assert.equal(signedOut.calls.length, 0);
});

test('denied permission listing offers session recovery without exposing engine details', async () => {
  const denied = new ClientError({ errors: [{ message: 'internal details', extensions: { code: 'NOT_AUTHORIZED' } }] }, { query: 'query' });
  const { action } = setup({ MyGrants: async () => { throw denied; } });
  const result = await action({ kind: 'list' });
  assert.equal(result.recoveryRequired, true);
  assert.match(result.error, /Sign in again/);
  assert.ok(!result.error.includes('internal details'));
});

test('rate limit failures return friendly error message and do not expose internals', async () => {
  const rateLimitError = new ClientError(
    { errors: [{ message: 'Too many requests. Try again later.', extensions: { code: 'RATE_LIMITED' } }] },
    { query: 'query' },
  );
  const { action } = setup({ SharePermission: async () => { throw rateLimitError; } });
  const result = await action({ kind: 'share', username: 'alex', permission: grant.permission });
  assert.equal(result.error, 'Too many requests. Please wait a moment and try again.');
});

test('received permissions identify granters and resolve usernames', async () => {
  const { action } = setup({
    MyGrants: async () => ({
      grants: [
        { permission: 'identity.1.*', origin: { type: 'DIRECT' } },
        {
          id: 'grant-2',
          granteeAuid: '1',
          permission: 'identity.2.variation.write',
          origin: { type: 'DELEGATED', delegatorAuid: '2' },
        },
      ],
    }),
    Usernames: async ({ auid }) => ({
      usernames: { defaultUsername: auid === '2' ? 'sam' : 'alex' },
    }),
  });
  const result = await action({ kind: 'list' });
  assert.equal(result.permissions.length, 2);
  const direct = result.permissions.find((p) => p.key === 'identity.1.*');
  assert.equal(direct.receivedFrom, null);
  const received = result.permissions.find((p) => p.key === 'identity.2.variation.write');
  assert.deepEqual(received.receivedFrom, { id: '2', username: 'sam' });
});

test('permission resource targets are not inferred to be delegators when origin is omitted', async () => {
  const { action } = setup({
    MyGrants: async () => ({
      grants: [
        { permission: 'identity.2.variation.write' },
      ],
    }),
    Usernames: async ({ auid }) => ({
      usernames: { defaultUsername: auid === '2' ? 'sam' : 'alex' },
    }),
  });
  const result = await action({ kind: 'list' });
  assert.equal(result.permissions.length, 1);
  assert.equal(result.permissions[0].receivedFrom, null);
});



test('identical keys in different contexts stay separate in checks, labels and sharing', async () => {
  const key = 'section.news.posts.create';
  const { action, calls } = setup({
    MyGrants: async () => ({ grants: ['10', '20'].map((permissionContext) => ({ permission: key, permissionContext, origin: { type: 'DIRECT' } })) }),
  });
  const result = await action({ kind: 'list' });
  assert.equal(result.permissions.length, 2);
  assert.deepEqual(result.permissions.map((p) => p.context), ['10', '20']);
  assert.notEqual(result.permissions[0].label, result.permissions[1].label);
  assert.ok(calls.some((c) => c.name === 'EffectivePermission' && c.args.permission === key && c.args.permissionContext === '10'));
  assert.ok(calls.some((c) => c.name === 'EffectivePermission' && c.args.permission === key && c.args.permissionContext === '20'));
});

test('duplicate detection includes context and normalizes null system grants', async () => {
  const { action, calls } = setup({ MyDelegatedGrants: async () => ({ delegatedGrants: [{ ...grant, permissionContext: '20' }] }) });
  await action({ kind: 'share', username: 'alex', permission: grant.permission, permissionContext: '10' });
  assert.equal(calls.find((c) => c.name === 'SharePermission').args.permissionContext, '10');
  const existing = setup({ MyDelegatedGrants: async () => ({ delegatedGrants: [{ ...grant, permissionContext: null }] }) });
  assert.equal((await existing.action({ kind: 'share', username: 'alex', permission: grant.permission, permissionContext: '04' })).alreadyShared, true);
});

test('preview refuses undeclared and invalid values instead of treating metadata as access', async () => {
  const fail = new ClientError({ errors: [{ message: 'private', extensions: { code: 'INVALID_PERMISSION_BINDINGS' } }] }, { query: 'query' });
  const { action, calls } = setup({ DescribePermission: async () => { throw fail; } });
  const result = await action({ kind: 'preview', permission: 'section.*.posts.create', permissionContext: '10' });
  assert.match(result.error, /values/);
  assert.ok(!calls.some((c) => c.name === 'EffectivePermission'));
});

test('dynamic search degradation never bypasses delegation validation', async () => {
  const fail = new ClientError({ errors: [{ message: 'private', extensions: { code: 'PERMISSION_VALIDATOR_UNAVAILABLE' } }] }, { query: 'mutation' });
  const { action, calls } = setup({
    SearchPermissionValues: async () => ({ searchPermissionValues: { name: 'subject', dynamic: true, degraded: true, values: [] } }),
    SharePermission: async () => { throw fail; },
  });
  const search = await action({ kind: 'search', permissionContext: '10', declarationId: grantId, param: 'subject', query: 'alex' });
  assert.equal(search.options.degraded, true);
  assert.equal(calls.find((c) => c.name === 'SearchPermissionValues').args.limit, 20);
  assert.match((await action({ kind: 'share', username: 'alex', permission: 'identity.2.videos.edit', permissionContext: '10' })).error, /No permission was granted/);
});

test('bare token wildcard cannot be delegated as a stored permission', async () => {
  const { action, calls } = setup();
  assert.match((await action({ kind: 'share', username: 'alex', permission: '*' })).error, /declared permission/);
  assert.equal(calls.length, 0);
});

test('permission tree associates declaration IDs with parameter metadata and rejects truncation', async () => {
  const declaration = { id: grantId, name: 'posts', context: '10', template: 'section.{section}.posts.create' };
  const tree = { keyPrefix: 'section', title: 'Sections', declarations: [], params: [], children: [{ keyPrefix: declaration.template, declarations: [grantId], params: [{ name: 'section', values: [{ value: 'news' }], dynamic: false, degraded: false }], children: [] }] };
  const { action } = setup({ PermissionDeclarations: async () => ({ permissionDeclarations: [declaration] }), PermissionTree: async () => ({ permissionTree: [tree] }) });
  const result = await action({ kind: 'catalog', permissionContext: '10' });
  assert.equal(result.declarations[0].group, 'Sections');
  assert.equal(result.declarations[0].params[0].values[0].value, 'news');
  tree.children[0].children.push({ keyPrefix: 'unsupported' });
  assert.ok((await action({ kind: 'catalog', permissionContext: '10' })).error);
});

test('large numeric bindings are never rounded by the frontend', () => {
  assert.equal(permissionContext.bindPermission('record.{id}.read', { id: '9223372036854775807' }), 'record.9223372036854775807.read');
  assert.equal(permissionContext.bindPermission('record.{id}.read', { id: '1.25' }), null);
});
