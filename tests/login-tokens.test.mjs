import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadTs(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}

test('login token registry stores public IDs and hashes without bearer secrets', async () => {
  const calls = [];
  const table = { tokenId: 'token_id', userAuid: 'user_auid', bearerHash: 'bearer_hash' };
  const db = {
    insert: () => ({ values: (value) => ({ onConflictDoNothing: async () => { calls.push(['insert', value]); } }) }),
    select: (fields) => ({ from: () => ({ where: (condition) => {
      if (fields.bearerHash) return { limit: async () => { calls.push(['hash', condition]); return [{ bearerHash: 'digest' }]; } };
      calls.push(['list', condition]);
      return [{ tokenId: 'public-id' }];
    } }) }),
    delete: () => ({ where: async (condition) => { calls.push(['delete', condition]); } }),
  };
  const registry = loadTs('src/lib/login-tokens.ts', {
    'server-only': {},
    'drizzle-orm': { eq: (column, value) => [column, value], and: (...conditions) => conditions },
    '@/lib/db': { getDb: () => db },
    '@/lib/db/schema': { loginTokens: table },
    '@/lib/native-token-id': { publicTokenId: (bearer) => bearer.includes('.') ? bearer.split('.')[0] : null },
    '@/lib/oauth/pkce': { sha256Base64Url: async () => 'digest' },
  });
  await registry.trackLoginToken('1', 'public-id.secret');
  assert.deepEqual(await registry.listLoginTokenIds('1'), ['public-id']);
  assert.equal(await registry.getLoginTokenHash('1', 'public-id'), 'digest');
  await registry.forgetLoginToken('1', 'public-id.secret');
  await registry.trackLoginToken('1', 'opaque-without-public-id');
  assert.deepEqual(calls, [
    ['insert', { tokenId: 'public-id', userAuid: '1', bearerHash: 'digest' }],
    ['list', ['user_auid', '1']],
    ['hash', [['user_auid', '1'], ['token_id', 'public-id']]],
    ['delete', [['user_auid', '1'], ['token_id', 'public-id']]],
  ]);
  assert.equal(JSON.stringify(calls).includes('secret'), false);
});
