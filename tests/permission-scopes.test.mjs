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
    '@/lib/auth-graphql': { getAuthSdk: (token) => { assert.equal(token, 'session-token'); return { DescribePermission: async (args) => { calls.push(args); return { describePermission: { title: 'Create posts', description: 'In the news section' } }; } }; } },
  });
  const result = await permissionScopes.describeConsentPermissions('session-token', ['identity.1.username.write', '*']);
  assert.equal(result[0].label, 'Create posts');
  assert.match(result[1].label, /All AXUS ID permissions/);
  assert.deepEqual(calls, [{ contextAuid: '4', permission: 'identity.1.username.write' }]);
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
