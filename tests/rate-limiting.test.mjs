import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { ClientError } from 'graphql-request';

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

const graphqlErrors = loadTs('src/lib/graphql-errors.ts', {
  'server-only': {},
  'graphql-request': { ClientError },
});

const {
  isRateLimitError,
  formatGraphqlError,
  isAuthError,
  isTokenInvalidError,
  RATE_LIMIT_MESSAGE,
} = graphqlErrors;

test('isRateLimitError identifies backend RATE_LIMITED code', () => {
  const error = new ClientError(
    { errors: [{ message: 'Too many requests. Try again later.', extensions: { code: 'RATE_LIMITED' } }] },
    { query: 'query' },
  );
  assert.equal(isRateLimitError(error), true);
});

test('isRateLimitError identifies HTTP 429 status code', () => {
  const error = new ClientError(
    { status: 429, errors: [] },
    { query: 'query' },
  );
  assert.equal(isRateLimitError(error), true);
});

test('isRateLimitError identifies too many requests in error message', () => {
  const error = new Error('Too many requests. Try again later.');
  assert.equal(isRateLimitError(error), true);

  const error2 = new Error('API rate limit exceeded');
  assert.equal(isRateLimitError(error2), true);
});

test('isRateLimitError returns false for non-rate-limit errors', () => {
  const error = new ClientError(
    { errors: [{ message: 'Invalid credentials', extensions: { code: 'INVALID_CREDENTIALS', groupCode: 'INVALID_ARGUMENT' } }] },
    { query: 'query' },
  );
  assert.equal(isRateLimitError(error), false);

  const error2 = new Error('Something else went wrong');
  assert.equal(isRateLimitError(error2), false);
});

test('formatGraphqlError returns RATE_LIMIT_MESSAGE across all contexts', () => {
  const rateLimitError = new ClientError(
    { errors: [{ message: 'Too many requests. Try again later.', extensions: { code: 'RATE_LIMITED' } }] },
    { query: 'query' },
  );

  assert.equal(formatGraphqlError(rateLimitError), RATE_LIMIT_MESSAGE);
  assert.equal(formatGraphqlError(rateLimitError, 'login'), RATE_LIMIT_MESSAGE);
  assert.equal(formatGraphqlError(rateLimitError, 'account'), RATE_LIMIT_MESSAGE);
  assert.equal(formatGraphqlError(rateLimitError, 'oauth-refresh'), RATE_LIMIT_MESSAGE);
  assert.equal(formatGraphqlError(rateLimitError, 'oauth'), RATE_LIMIT_MESSAGE);
});

test('isAuthError and isTokenInvalidError do not treat rate limit as auth failure', () => {
  const rateLimitError = new ClientError(
    { errors: [{ message: 'Too many requests. Try again later.', extensions: { code: 'RATE_LIMITED' } }] },
    { query: 'query' },
  );

  assert.equal(isAuthError(rateLimitError), false);
  assert.equal(isTokenInvalidError(rateLimitError), false);
});

test('checkUsernameAction returns friendly error when rate limited', async () => {
  const rateLimitError = new ClientError(
    { errors: [{ message: 'Too many requests. Try again later.', extensions: { code: 'RATE_LIMITED' } }] },
    { query: 'query' },
  );

  const resolveModule = loadTs('src/lib/resolve-login-identity.ts', {
    'server-only': {},
    '@/lib/auth-graphql': {
      getAuthSdk: () => ({
        OwnerByUsername: async () => {
          throw rateLimitError;
        },
      }),
    },
    '@/lib/graphql-errors': graphqlErrors,
  });

  const authActions = loadTs('src/app/actions/auth.ts', {
    'server-only': {},
    'next/headers': { cookies: () => ({}) },
    'next/navigation': { redirect: () => {} },
    'next/cache': { revalidatePath: () => {} },
    '@/lib/auth-redirect': { resolveAuthenticatedRedirect: () => '/' },
    '@/lib/auth-graphql': { getAuthSdk: () => ({}), getAuthSdkForSession: () => ({}) },
    '@/lib/graphql-errors': graphqlErrors,
    '@/lib/oauth/adapter': { SESSION_PERMISSIONS: ['*'], loginWithBackend: async () => 'token' },
    '@/lib/resolve-login-identity': resolveModule,
    '@/lib/oauth/clients': { getOAuthClient: async () => null, normalizeScopes: () => [], partitionScopes: () => ({}), validateScopes: () => [] },
    '@/lib/oauth/grants': { grantAuthorization: async () => ({}) },
    '@/lib/session-access': { addAccountToSession: async () => {}, clearAllSessions: async () => {}, getValidSession: async () => null, removeAccountFromSession: async () => true, switchActiveAccount: async () => {} },
    '@/lib/session': { SESSION_COOKIE: 'session', clearSessionCookieOptions: {}, serializeSession: () => '', sessionCookieOptions: {} },
    '@/lib/saml/saml-store': { getSamlConfigByAuid: async () => null },
    '@/lib/saml/saml-idp': { createIdentityProvider: () => ({}), createServiceProvider: () => ({}), createSamlLogoutRequest: async () => ({}) },
    '@/lib/user-profile': { formatSyntheticEmail: () => '' },
    '@/lib/google-oauth': { clearPendingGoogleRegistration: async () => {}, getGoogleClientId: () => '', getGoogleProviderId: () => '', getPendingGoogleRegistration: async () => null, setGoogleRegistrationName: async () => {} },
    '@/lib/last-auth-method-server': { setLastAuthMethod: async () => {}, getLastAuthMethod: async () => null },
  });

  const result = await authActions.checkUsernameAction('johndoe');
  assert.equal(result.exists, false);
  assert.equal(result.error, RATE_LIMIT_MESSAGE);
});
