import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function loadTs(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), loaded, loaded.exports);
  return loaded.exports;
}
const scopes = loadTs('src/lib/oauth/scopes.ts');
function grantsModule(overrides = {}) {
  return loadTs('src/lib/oauth/grants.ts', {
    'server-only': {}, '@/lib/crypto/secret-box': { encryptJson: async (value) => value, decryptJson: async (value) => value }, '@/lib/db': {}, '@/lib/db/schema': { oauthGrants: {} },
    '@/lib/oauth/audit': { recordOAuthEvent: async () => {} }, '@/lib/oauth/adapter': {}, '@/lib/oauth/scopes': scopes,
    '@/lib/oauth/pkce': { sha256Base64Url: async () => 'session-hash' }, '@/lib/oauth/permission-scopes': { describeConsentPermissions: async () => [] }, ...overrides,
  });
}

test('scope coverage cannot use prefix or parameter wildcards to skip consent', () => {
  const grants = grantsModule();
  for (const [granted, requested] of [['section.*.posts.create', 'section.news.posts.delete'], ['section.*.posts.create', 'section.news.posts.create'], ['identity.1.*', 'identity.1.password.change'], ['*', 'openid'], ['*', 'profile'], ['*', 'identity.1.username.write']]) {
    assert.equal(grants.grantCoversScopes({ scopes: [granted] }, [requested]), false, `${granted} / ${requested}`);
  }
  assert.equal(grants.grantCoversScopes({ scopes: ['openid', '*'] }, ['openid', '*']), true);
  assert.equal(grants.grantCoversScopes({ scopes: ['axus:5:read.posts'] }, ['axus:6:read.posts']), false);
});

test('scope syntax preserves nested AUIDs and parameter wildcards while rejecting malformed scope tokens', () => {
  for (const key of ['*', 'identity.1,2.username.write', 'section.*.posts.create', 'record.9223372036854775807.read', 'ratio.125e-2.read']) assert.equal(scopes.isValidPermissionKey(key), true, key);
  for (const key of ['', 'identity..read', 'section.{section}.read', 'scope with spaces', 'bad\nkey']) assert.equal(scopes.isValidPermissionKey(key), false, key);
  assert.deepEqual(scopes.partitionScopes(['openid', '*']), { oidcScopes: ['openid'], axusPermissions: ['*'] });
});

test('consent uses engine descriptions in system context and treats bare * as a token scope', async () => {
  const calls = [];
  const permissionScopes = loadTs('src/lib/oauth/permission-scopes.ts', {
    'server-only': {}, '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
    '@/lib/oauth/scopes': scopes,
    '@/lib/auth-graphql': { getAuthSdk: (token) => { assert.equal(token, 'session-token'); return { DescribePermission: async (args) => { calls.push(args); return { describePermission: { title: 'Create posts', description: 'In the news section' } }; } }; } },
  });
  const result = await permissionScopes.describeConsentPermissions('session-token', ['identity.1.username.write', '*']);
  assert.equal(result[0].label, 'Create posts');
  assert.match(result[1].label, /All AXUS ID permissions/);
  assert.deepEqual(calls, [{ contextAuid: '4', permission: 'identity.1.username.write' }]);
});

test('contextual scopes use the named app declaration and keep same keys separate', async () => {
  const calls = [];
  const permissionScopes = loadTs('src/lib/oauth/permission-scopes.ts', {
    'server-only': {}, '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
    '@/lib/oauth/scopes': scopes,
    '@/lib/auth-graphql': { getAuthSdk: () => ({ DescribePermission: async (args) => {
      calls.push(args);
      return { describePermission: { title: `Read from ${args.contextAuid}`, description: '' } };
    } }) },
  });
  const requested = ['read.posts', 'axus:5:read.posts', 'axus:6:read.posts'];
  const described = await permissionScopes.describeConsentPermissions('session-token', requested);
  assert.deepEqual(calls, requested.map((_, index) => ({ contextAuid: ['4', '5', '6'][index], permission: 'read.posts' })));
  assert.deepEqual(described.map(({ key, label }) => [key, label]), [
    ['read.posts', 'Read from 4'], ['axus:5:read.posts', 'Read from 5'], ['axus:6:read.posts', 'Read from 6'],
  ]);
  await assert.rejects(permissionScopes.describeConsentPermissions('session-token', ['*', 'axus:5:*']), /only one context/);
});

test('contextual scope syntax requires a canonical app AUID and valid permission key', () => {
  assert.deepEqual(scopes.parsePermissionScope('axus:5,7:section.*.posts.create'), {
    scope: 'axus:5,7:section.*.posts.create', key: 'section.*.posts.create', contextAuid: '5,7',
  });
  for (const scope of ['axus:05:read.posts', 'axus:foo:read.posts', 'axus:5:', 'axus:5:bad..key']) {
    assert.throws(() => scopes.parsePermissionScope(scope), /permission scope|permission context/);
  }
  assert.doesNotThrow(() => scopes.validatePermissionScopeCombination(['*', 'axus:4:*'], '4'));
  assert.throws(() => scopes.validatePermissionScopeCombination(['*', 'axus:5:*'], '4'), /only one context/);
});

test('mixed-context authorization grants one token with exact permissions in each context', async () => {
  const calls = [];
  const sdk = {
    LoginWithToken: async (args) => { calls.push(['login', args]); return { loginWithToken: { id: 'token-id.secret' } }; },
    ApplyPermissionBatch: async (args) => { calls.push(['batch', args]); return { applyPermissionBatch: {} }; },
  };
  const adapter = loadTs('src/lib/oauth/adapter.ts', {
    '@/lib/auth-graphql': { getAuthSdk: () => sdk },
    '@/lib/native-token-id': { publicTokenId: (bearer) => bearer.split('.')[0] },
    '@/lib/oauth/scopes': scopes,
    '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
  });
  const bearer = await adapter.issueAuthorizationToken({
    sessionTokenId: 'session', userAuid: '1',
    permissions: ['read.posts', 'axus:5:write.posts', 'axus:6:read.posts'],
  });
  assert.equal(bearer, 'token-id.secret');
  assert.deepEqual(calls, [
    ['login', { auid: '1', permissions: ['read.posts'], permissionContext: '4' }],
    ['batch', { delegations: [
      { granterAuid: '1', permissionContext: '5', permission: 'write.posts', granteeTokenId: 'token-id' },
      { granterAuid: '1', permissionContext: '6', permission: 'read.posts', granteeTokenId: 'token-id' },
    ], revocations: [] }],
  ]);
});

test('failed cross-context delegation revokes the incomplete native token', async () => {
  const calls = [];
  const failure = new Error('Delegation failed');
  const adapter = loadTs('src/lib/oauth/adapter.ts', {
    '@/lib/auth-graphql': { getAuthSdk: (bearer) => bearer === 'token-id.secret'
      ? { RevokeToken: async () => { calls.push('revoke'); return { revokeToken: true }; } }
      : {
          LoginWithToken: async () => ({ loginWithToken: { id: 'token-id.secret' } }),
          ApplyPermissionBatch: async () => { throw failure; },
        } },
    '@/lib/native-token-id': { publicTokenId: (bearer) => bearer.split('.')[0] },
    '@/lib/oauth/scopes': scopes,
    '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
  });
  await assert.rejects(adapter.issueAuthorizationToken({
    sessionTokenId: 'session', userAuid: '1', permissions: ['read.posts', 'axus:5:write.posts'],
  }), failure);
  assert.deepEqual(calls, ['revoke']);
});

test('an app-context wildcard is issued in its own context before concrete grants elsewhere', async () => {
  const calls = [];
  const sdk = {
    LoginWithToken: async (args) => { calls.push(['login', args]); return { loginWithToken: { id: 'token-id.secret' } }; },
    ApplyPermissionBatch: async (args) => { calls.push(['batch', args]); return { applyPermissionBatch: {} }; },
  };
  const adapter = loadTs('src/lib/oauth/adapter.ts', {
    '@/lib/auth-graphql': { getAuthSdk: () => sdk },
    '@/lib/native-token-id': { publicTokenId: (bearer) => bearer.split('.')[0] },
    '@/lib/oauth/scopes': scopes,
    '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
  });
  await adapter.issueAuthorizationToken({ sessionTokenId: 'session', userAuid: '1', permissions: ['read.posts', 'axus:5:*'] });
  assert.deepEqual(calls[0], ['login', { auid: '1', permissions: ['*'], permissionContext: '5' }]);
  assert.deepEqual(calls[1][1].delegations[0], {
    granterAuid: '1', permissionContext: '4', permission: 'read.posts', granteeTokenId: 'token-id',
  });
});

test('invalid declarations prevent consent reuse before any database mutation', async () => {
  const fail = new Error('undeclared');
  let databaseUsed = false;
  const grants = grantsModule({ '@/lib/oauth/permission-scopes': { describeConsentPermissions: async () => { throw fail; } }, '@/lib/db': { getDb: () => { databaseUsed = true; } } });
  await assert.rejects(grants.grantAuthorization({ userAuid: '1', clientAuid: '2', sessionTokenId: 'session', scopes: ['openid', 'custom.invalid'], axusPermissions: ['custom.invalid'] }), fail);
  assert.equal(databaseUsed, false);
});

test('replacement consent records exactly the scopes issued to its new token', async () => {
  const row = { id: 'grant', userAuid: '1', clientAuid: '2', scopes: ['openid', 'identity.1.username.write'], tokenId: 'old', parentSessionTokenHash: 'old-session' };
  let stored;
  let issued;
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [row] }) }) }),
    update: () => ({ set: (values) => ({ where: async () => { stored = values; } }) }),
  };
  const grants = grantsModule({
    'drizzle-orm': { and: () => {}, desc: () => {}, eq: () => {}, isNull: () => {}, or: () => {} },
    '@/lib/db': { getDb: () => db },
    '@/lib/oauth/adapter': { issueAuthorizationToken: async (args) => { issued = args.permissions; return 'new'; }, revokeWithBackend: async () => true },
  });
  const result = await grants.grantAuthorization({ userAuid: '1', clientAuid: '2', sessionTokenId: 'new-session', scopes: ['openid', 'identity.1.variation.write'], axusPermissions: ['identity.1.variation.write'] });
  assert.deepEqual(stored.scopes, ['openid', 'identity.1.variation.write']);
  assert.deepEqual(issued, ['identity.1.variation.write']);
  assert.deepEqual(result.scopes, stored.scopes);
});

test('OIDC-only consent does not mint a native token', async () => {
  let issueCalled = false;
  let storedValues;
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    insert: () => ({ values: async (values) => { storedValues = values; } }),
  };
  const grants = grantsModule({
    'drizzle-orm': { and: () => {}, desc: () => {}, eq: () => {}, isNull: () => {}, or: () => {} },
    '@/lib/db': { getDb: () => db },
    '@/lib/oauth/adapter': {
      issueAuthorizationToken: async () => {
        issueCalled = true;
        return 'new';
      },
      revokeWithBackend: async () => true,
    },
  });
  const result = await grants.grantAuthorization({
    userAuid: '1',
    clientAuid: '2',
    sessionTokenId: 'session',
    scopes: ['openid', 'profile'],
    axusPermissions: [],
  });
  assert.equal(issueCalled, false);
  assert.equal(storedValues.tokenId, null);
  assert.equal(result.tokenId, null);
  assert.deepEqual(result.scopes, ['openid', 'profile']);
});
