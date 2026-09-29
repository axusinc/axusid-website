import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { buildSchema, parse, validate } from 'graphql';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tokenId = '11111111-1111-4111-8111-111111111111';
const session = { auid: '1', tokenId: 'session-bearer' };

function loadAction(sdk, currentSession = session) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/app/actions/tokens.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  const mocks = {
    '@/lib/auth-graphql': { getAuthSdkForSession: (value) => { assert.equal(value, currentSession); return sdk; } },
    '@/lib/graphql-errors': { formatGraphqlError: () => 'Request failed.' },
    '@/lib/session-access': { getValidSession: async () => currentSession, removeAccountFromSession: sdk.removeAccountFromSession ?? (async () => {}) },
    '@/lib/oauth/grants': { listGrantsForUser: async () => [], revokeGrant: async () => {}, revokeGrantsForSessionHash: async () => {}, ...sdk.grants },
    '@/lib/login-tokens': { trackLoginToken: async () => {}, listLoginTokenIds: async () => [], getLoginTokenHash: async () => null, forgetLoginTokenId: async () => {}, ...sdk.loginTokens },
    '@/lib/native-token-id': { publicTokenId: (bearer) => bearer.includes('.') ? bearer.split('.')[0] : null },
    '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
    '@/lib/user-profile': { resolveUserDisplayInfo: sdk.resolveUserDisplayInfo ?? (async () => { throw new Error('Profile unavailable'); }) },
  };
  new Function('require', 'module', 'exports', source)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), loaded, loaded.exports,
  );
  return loaded.exports.tokenAction;
}

test('account token operations validate against the engine schema snapshot', () => {
  const schema = buildSchema(fs.readFileSync(path.join(root, 'schema_prod.graphql'), 'utf8'));
  const documents = ['src/graphql/operations/tokens.graphql', 'src/graphql/operations/auth.graphql'];
  for (const file of documents) assert.deepEqual(validate(schema, parse(fs.readFileSync(path.join(root, file), 'utf8'))), []);
});

test('creation delegates selected permissions through the existing login mutation and returns the bearer once', async () => {
  let variables;
  const action = loadAction({ LoginWithToken: async (args) => {
    variables = args;
    return { loginWithToken: { id: `${tokenId}.secret` } };
  } });
  const result = await action({ kind: 'create', title: 'Build server', icon: 'server', permissions: ['identity.1.username.write'], permissionContext: '4', auid: 'other' });
  assert.deepEqual(variables, { auid: '1', permissions: ['identity.1.username.write'], permissionContext: '4', title: 'Build server', icon: 'server' });
  assert.equal(result.bearer, `${tokenId}.secret`);
  assert.equal(result.tokens, undefined);
});

test('empty permissions and missing sessions cannot create tokens', async () => {
  const calls = [];
  const sdk = { LoginWithToken: async (args) => { calls.push(args); return { loginWithToken: { id: 'bearer' } }; } };
  assert.ok((await loadAction(sdk)({ kind: 'create', title: 'Empty', icon: 'key', permissions: [], permissionContext: '4' })).error);
  assert.ok((await loadAction(sdk, null)({ kind: 'create', title: 'Empty', icon: 'key', permissions: ['*'], permissionContext: '4' })).error);
  assert.equal(calls.length, 0);
});

test('account token management uses the active session account and a public token id', async () => {
  const calls = [];
  const action = loadAction({
    AccountTokens: async (args) => { calls.push(['list', args]); return { accountTokens: [{ tokenId, title: null, icon: null, current: false, permissions: [] }] }; },
    ChangeAccountTokenPresentation: async (args) => { calls.push(['update', args]); return { changeAccountTokenPresentation: { tokenId, title: args.title, icon: args.icon } }; },
    RevokeAccountToken: async (args) => { calls.push(['revoke', args]); return { revokeAccountToken: true }; },
  });
  assert.equal((await action({ kind: 'list' })).tokens[0].tokenId, tokenId);
  assert.equal((await action({ kind: 'update', tokenId, title: 'Laptop', icon: 'laptop' })).updated.title, 'Laptop');
  assert.equal((await action({ kind: 'revoke', tokenId })).revoked, true);
  assert.deepEqual(calls, [
    ['list', { auid: '1' }],
    ['update', { auid: '1', tokenId, title: 'Laptop', icon: 'laptop' }],
    ['revoke', { auid: '1', tokenId }],
  ]);
});

test('OAuth2 application tokens are excluded from list, and cannot be renamed', async () => {
  const calls = [];
  const personalTokenId = '99999999-9999-4999-8999-999999999999';
  const grant = { id: 'grant-1', clientAuid: '2', tokenId: `${tokenId}.secret` };
  const action = loadAction({
    grants: {
      listGrantsForUser: async (auid) => { assert.equal(auid, '1'); return [grant]; },
      revokeGrant: async (id, reason) => { calls.push(['disconnect', id, reason]); },
    },
    resolveUserDisplayInfo: async (sdk, auid) => {
      assert.equal(auid, '2');
      return { displayName: 'Example App', username: 'example', firstName: null, lastName: null, avatarUrl: '/avatar.png' };
    },
    AccountTokens: async () => ({ accountTokens: [
      { tokenId, title: 'Application token', icon: 'key', current: false, permissions: [] },
      { tokenId: personalTokenId, title: 'Personal token', icon: 'server', current: false, permissions: [] },
    ] }),
    ChangeAccountTokenPresentation: async () => { calls.push(['update']); throw new Error('Should not update'); },
    RevokeAccountToken: async () => { calls.push(['revoke']); throw new Error('Should disconnect'); },
  });
  const listed = await action({ kind: 'list' });
  // Excluded from listed tokens.
  assert.equal(listed.tokens.length, 1);
  assert.equal(listed.tokens[0].tokenId, personalTokenId);
  assert.match((await action({ kind: 'update', tokenId, title: 'New title', icon: 'server' })).error, /application profile/i);
  assert.equal((await action({ kind: 'revoke', tokenId })).revoked, true);
  assert.deepEqual(calls, [['disconnect', 'grant-1', 'user']]);
});

test('browser session tokens are excluded from list, and remote sessions are forgotten after revocation', async () => {
  const remoteId = '22222222-2222-4222-8222-222222222222';
  const personalTokenId = '99999999-9999-4999-8999-999999999999';
  const events = [];
  const action = loadAction({
    loginTokens: {
      trackLoginToken: async (auid, bearer) => { events.push(['track', auid, bearer]); },
      listLoginTokenIds: async (auid) => { events.push(['list', auid]); return [remoteId]; },
      getLoginTokenHash: async (auid, id) => { events.push(['hash', auid, id]); return 'session-hash'; },
      forgetLoginTokenId: async (auid, id) => { events.push(['forget', auid, id]); },
    },
    grants: { revokeGrantsForSessionHash: async (auid, hash) => { events.push(['grants', auid, hash]); } },
    AccountTokens: async () => ({ accountTokens: [
      { tokenId, title: null, icon: null, current: true, permissions: [] },
      { tokenId: remoteId, title: null, icon: null, current: false, permissions: [] },
      { tokenId: personalTokenId, title: 'Personal token', icon: 'server', current: false, permissions: [] },
    ] }),
    ChangeAccountTokenPresentation: async () => { throw new Error('Session presentation must stay fixed'); },
    RevokeAccountToken: async ({ tokenId: id }) => { events.push(['revoke', id]); return { revokeAccountToken: true }; },
  }, { auid: '1', tokenId: `${tokenId}.current-secret` });
  const listed = await action({ kind: 'list' });
  // Current session and remote sessions are both excluded from personal tokens.
  assert.equal(listed.tokens.length, 1);
  assert.equal(listed.tokens[0].tokenId, personalTokenId);
  assert.match((await action({ kind: 'update', tokenId: remoteId, title: 'Changed', icon: 'key' })).error, /managed by AXUS ID/i);
  assert.equal((await action({ kind: 'revoke', tokenId: remoteId })).revoked, true);
  assert.deepEqual(events.slice(-4), [['hash', '1', remoteId], ['grants', '1', 'session-hash'], ['revoke', remoteId], ['forget', '1', remoteId]]);
});

test('revoking the current sign-in token clears its browser session', async () => {
  const removed = [];
  const action = loadAction({
    removeAccountFromSession: async (auid) => { removed.push(auid); },
    RevokeAccountToken: async () => { throw new Error('Should use session sign-out'); },
  }, { auid: '1', tokenId: `${tokenId}.current-secret` });
  assert.equal((await action({ kind: 'revoke', tokenId })).revoked, true);
  assert.deepEqual(removed, ['1']);
});
