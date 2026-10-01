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
  assert.equal(grants.grantCoversScopes({ scopes: ['app:5:read.posts'] }, ['app:6:read.posts']), false);
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
  const requested = ['read.posts', 'app:5:read.posts', 'app:6:read.posts'];
  const described = await permissionScopes.describeConsentPermissions('session-token', requested);
  assert.deepEqual(calls, requested.map((_, index) => ({ contextAuid: ['4', '5', '6'][index], permission: 'read.posts' })));
  assert.deepEqual(described.map(({ key, label }) => [key, label]), [
    ['read.posts', 'Read from 4'], ['app:5:read.posts', 'Read from 5'], ['app:6:read.posts', 'Read from 6'],
  ]);
  await assert.rejects(permissionScopes.describeConsentPermissions('session-token', ['*', 'app:5:*']), /only one context/);
});

test('contextual scope syntax requires a canonical app AUID and valid permission key', () => {
  assert.deepEqual(scopes.parsePermissionScope('app:5,7:section.*.posts.create'), {
    scope: 'app:5,7:section.*.posts.create', key: 'section.*.posts.create', contextAuid: '5,7',
  });
  for (const scope of ['app:05:read.posts', 'app:foo:read.posts', 'app:5:', 'app:5:bad..key', 'axus:5:read.posts']) {
    assert.throws(() => scopes.parsePermissionScope(scope), /permission scope|permission context/);
  }
  assert.doesNotThrow(() => scopes.validatePermissionScopeCombination(['*', 'app:4:*'], '4'));
  assert.throws(() => scopes.validatePermissionScopeCombination(['*', 'app:5:*'], '4'), /only one context/);
});

test('primary sessions explicitly request received app contexts; OAuth cannot request that option', async () => {
  let login;
  const adapter = loadTs('src/lib/oauth/adapter.ts', {
    '@/lib/auth-graphql': { getAuthSdk: () => ({ LoginWithPassword: async (args) => {
      login = args; return { loginWithPassword: { id: 'session.secret' } };
    } }) },
    '@/lib/native-token-id': {}, '@/lib/oauth/scopes': scopes,
    '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
  });
  assert.deepEqual(adapter.SESSION_PERMISSIONS, ['*', 'app:*:*']);
  await adapter.loginWithBackend('1', 'password', adapter.SESSION_PERMISSIONS);
  assert.deepEqual(login.permissions, ['*', 'app:*:*']);
  assert.throws(() => scopes.parsePermissionScope('app:*:*'), scopes.InvalidPermissionScopeError);
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
    permissions: ['read.posts', 'app:5:write.posts', 'app:6:read.posts'],
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
    sessionTokenId: 'session', userAuid: '1', permissions: ['read.posts', 'app:5:write.posts'],
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
  await adapter.issueAuthorizationToken({ sessionTokenId: 'session', userAuid: '1', permissions: ['read.posts', 'app:5:*'] });
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

test('turning off access replaces a broader native token even in the same session', async () => {
  for (const approved of [['openid', 'app:5:posts.read'], ['openid']]) {
    const row = { id: 'grant', userAuid: '1', clientAuid: '5', scopes: ['openid', 'app:5:posts.read', 'app:5:posts.write'], tokenId: 'broad-token', parentSessionTokenHash: 'session-hash' };
    let stored;
    const issued = [];
    const revoked = [];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [row] }) }) }),
      update: () => ({ set: (values) => ({ where: async () => { stored = values; } }) }),
    };
    const grants = grantsModule({
      'drizzle-orm': { and: () => {}, desc: () => {}, eq: () => {}, isNull: () => {}, or: () => {} },
      '@/lib/db': { getDb: () => db },
      '@/lib/oauth/adapter': {
        issueAuthorizationToken: async (args) => { issued.push(args.permissions); return 'narrow-token'; },
        revokeWithBackend: async (token) => { revoked.push(token); return true; },
      },
    });
    const axusPermissions = scopes.partitionScopes(approved).axusPermissions;
    const result = await grants.grantAuthorization({ userAuid: '1', clientAuid: '5', sessionTokenId: 'same-session', scopes: approved, axusPermissions });
    assert.deepEqual(stored.scopes, approved);
    assert.deepEqual(result.scopes, approved);
    assert.equal(result.tokenId, axusPermissions.length ? 'narrow-token' : null);
    assert.deepEqual(issued, axusPermissions.length ? [axusPermissions] : []);
    assert.deepEqual(revoked, ['broad-token']);
  }
});

test('consent descriptions include declared icons, contextual app info, and context AUID', async () => {
  const permissionScopes = loadTs('src/lib/oauth/permission-scopes.ts', {
    'server-only': {}, '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
    '@/lib/oauth/scopes': scopes,
    '@/lib/auth-graphql': { getAuthSdk: () => ({ DescribePermission: async (args) => {
      return { describePermission: { title: `Action in ${args.contextAuid}`, description: 'Description', icon: 'eye' } };
    } }) },
  });
  const result = await permissionScopes.describeConsentPermissions('session-token', ['read.system', 'app:5:read.posts', 'app:6:*']);
  assert.equal(result[0].icon, 'eye');
  assert.equal(result[0].contextAuid, null);
  assert.equal(result[0].app, null);

  assert.equal(result[1].icon, 'eye');
  assert.equal(result[1].contextAuid, '5');
  assert.deepEqual(result[1].app, { id: '5', label: 'App 5', username: null, avatarUrl: null });

  assert.equal(result[2].icon, 'key');
  assert.equal(result[2].contextAuid, '6');
  assert.deepEqual(result[2].app, { id: '6', label: 'App 6', username: null, avatarUrl: null });
});
