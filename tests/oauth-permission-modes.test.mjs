import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { ClientError } from 'graphql-request';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function loadTs(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith('@/') ? {} : require(name), loaded, loaded.exports);
  return loaded.exports;
}
const scopes = loadTs('src/lib/oauth/scopes.ts');
const constants = loadTs('src/lib/oauth/constants.ts', { '@/lib/oauth/scopes': scopes });
const requests = loadTs('src/lib/oauth/requested-scopes.ts', { '@/lib/oauth/scopes': scopes, '@/lib/oauth/constants': constants });
const schemas = loadTs('src/lib/oauth/schemas.ts');
const graphqlErrors = loadTs('src/lib/graphql-errors.ts', { 'server-only': {}, 'graphql-request': { ClientError } });
const query = {
  response_type: 'code', client_id: '5', redirect_uri: 'https://client.example/callback',
  scope: 'openid app:5:posts.read', optional_scope: 'email app:5:posts.write', conditional_scope: 'app:5:posts.moderate',
  code_challenge: 'a'.repeat(43), code_challenge_method: 'S256', state: 'state', nonce: 'nonce',
};
const requested = requests.parseRequestedScopes(query, '4');
const available = (missing = []) => requested.map((r) => ({ ...r, available: !missing.includes(r.scope) }));

test('scope lists preserve defaults, deduplicate within a mode, and reject ambiguous or invalid modes', () => {
  assert.deepEqual(requests.parseRequestedScopes({}, '4'), [{ scope: 'openid', mode: 'required' }]);
  assert.deepEqual(requests.parseRequestedScopes({ optional_scope: 'email email', conditional_scope: ' ' }, '4'), [
    { scope: 'openid', mode: 'required' }, { scope: 'email', mode: 'optional' },
  ]);
  for (const input of [
    { optional_scope: 'openid' }, { scope: 'email', conditional_scope: 'email' },
    { scope: '*', optional_scope: 'app:5:*' }, { optional_scope: 'app:05:read' },
    { scope: 'app:5:read', conditional_scope: 'app:5:read' },
  ]) assert.throws(() => requests.parseRequestedScopes(input, '4'), /Scope|scope|context|permission/);
  assert.equal(schemas.authorizeQuerySchema.parse(query).optional_scope, query.optional_scope);
});

test('optional choices can be disabled; held conditional permissions cannot be omitted', () => {
  assert.deepEqual(requests.selectGrantedScopes(available(), []), ['openid', 'app:5:posts.read', 'app:5:posts.moderate']);
  assert.deepEqual(requests.selectGrantedScopes(available(), ['email', 'app:5:posts.write']), requested.map(({ scope }) => scope));
  assert.throws(() => requests.selectGrantedScopes(available(), ['app:6:posts.write']), /unrequested/);
  assert.throws(() => requests.selectGrantedScopes(available(), ['app:5:posts.moderate']), /unrequested/);
});

test('unavailable optional and conditional permissions are omitted even if submitted by the browser', () => {
  assert.deepEqual(requests.selectGrantedScopes(available(['app:5:posts.write', 'app:5:posts.moderate']), ['app:5:posts.write']), ['openid', 'app:5:posts.read']);
  assert.throws(() => requests.selectGrantedScopes(available(['app:5:posts.read']), []), requests.MissingRequiredPermissionsError);
});

test('availability checks account and permission context and propagates check failures', async () => {
  const calls = [];
  const failure = new Error('Permission service unavailable');
  const subject = loadTs('src/lib/oauth/scope-availability.ts', {
    'server-only': {}, '@/lib/oauth/scopes': scopes, '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
    '@/lib/auth-graphql': { getAuthSdk: (token) => { assert.equal(token, 'session'); return {
      EffectivePermission: async (args) => { calls.push(args); if (args.permission === 'fail') throw failure; return { checkPermission: { allowed: args.permission !== 'posts.write' } }; },
    }; } },
  });
  const result = await subject.resolveScopeAvailability('session', '1', [
    { scope: 'openid', mode: 'required' }, { scope: 'app:5:*', mode: 'optional' },
    { scope: 'identity.1.username.write', mode: 'required' }, { scope: 'app:5:posts.write', mode: 'conditional' },
  ]);
  assert.deepEqual(result.map(({ available }) => available), [true, true, true, false]);
  assert.deepEqual(calls, [
    { auid: '1', permission: 'identity.1.username.write', permissionContext: '4' },
    { auid: '1', permission: 'posts.write', permissionContext: '5' },
  ]);
  await assert.rejects(subject.resolveScopeAvailability('session', '1', [{ scope: 'fail', mode: 'conditional' }]), failure);
});

function responseModule(overrides = {}) {
  return loadTs('src/lib/oauth/authorization-response.ts', {
    'server-only': {}, '@/lib/oauth/scopes': scopes, '@/lib/oauth/requested-scopes': requests,
    '@/lib/graphql-errors': graphqlErrors, ...overrides,
  });
}

test('authorization binds only approved scopes to the grant and PKCE code', async () => {
  let grantInput, codeInput;
  const subject = responseModule({
    '@/lib/oauth/grants': { grantAuthorization: async (input) => { grantInput = input; return { id: 'grant' }; } },
    '@/lib/oauth/pkce': { generateOpaqueCode: async () => 'auth-code' },
    '@/lib/oauth/auth-code-store': { AUTH_CODE_TTL_MS: 60000, saveAuthorizationCode: async (input) => { codeInput = input; } },
  });
  const granted = requests.selectGrantedScopes(available(['app:5:posts.moderate']), ['email']);
  const url = new URL(await subject.createAuthorizationResponse({ query, clientAuid: '5', userAuid: '1', sessionTokenId: 'session', scopes: granted }));
  assert.deepEqual(grantInput.scopes, ['openid', 'app:5:posts.read', 'email']);
  assert.deepEqual(grantInput.axusPermissions, ['app:5:posts.read']);
  assert.deepEqual(codeInput.scopes, grantInput.scopes);
  assert.equal(codeInput.codeChallenge, query.code_challenge);
  assert.equal(codeInput.nonce, 'nonce');
  assert.equal(url.searchParams.get('state'), 'state');
  assert.equal(url.searchParams.get('code'), 'auth-code');
});

test('missing permissions and engine denials use access_denied; outages remain errors', () => {
  const { authorizationErrorCode } = responseModule();
  assert.equal(authorizationErrorCode(new requests.MissingRequiredPermissionsError(['app:5:read'])), 'access_denied');
  for (const [code, expected] of [['NOT_AUTHORIZED', 'access_denied'], ['GRANT_APPROVAL_DENIED', 'access_denied'], ['UNDECLARED_PERMISSION', 'invalid_scope'], ['PERMISSION_VALIDATOR_UNAVAILABLE', 'server_error'], ['RATE_LIMITED', 'server_error']]) {
    assert.equal(authorizationErrorCode(new ClientError({ errors: [{ message: code, extensions: { code } }] }, { query: '' })), expected);
  }
});

function flowModules({ missing = [], grantScopes = [], checkFailure, currentAuid = '1' } = {}) {
  const issued = [];
  const redirect = (url) => { throw Object.assign(new Error('redirect'), { url }); };
  const session = { auid: currentAuid, tokenId: 'session' };
  const mocks = {
    'next/navigation': { redirect }, 'next/link': () => null,
    '@/lib/oauth/clients': { ...constants, ...scopes, getOAuthClient: async () => ({ auid: '5', redirectUris: [query.redirect_uri] }) },
    '@/lib/oauth/grants': { findActiveGrant: async () => grantScopes.length ? { scopes: grantScopes } : undefined, grantCoversScopes: (grant, scopes) => scopes.every((s) => grant.scopes.includes(s)) },
    '@/lib/oauth/schemas': schemas, '@/lib/oauth/requested-scopes': requests,
    '@/lib/oauth/scope-availability': { resolveScopeAvailability: async (_token, _auid, scopes) => {
      if (checkFailure) throw checkFailure;
      return scopes.map((r) => ({ ...r, available: !missing.includes(r.scope) }));
    } },
    '@/lib/oauth/authorization-response': { authorizationErrorCode: responseModule().authorizationErrorCode, createAuthorizationResponse: async (args) => { issued.push(args); return `${query.redirect_uri}?code=code&state=state`; } },
    '@/lib/permission-config': { getSystemPermissionContext: () => '4' },
    '@/lib/session-access': { getValidSession: async () => session, getValidMultiSession: async () => ({ accounts: [session] }) },
    '@/lib/graphql-errors': graphqlErrors, '@/components/ui/button': { buttonVariants: () => '' },
    '@/lib/auth-graphql': { getAuthSdk: () => ({}), getAuthSdkForSession: () => ({}) },
    '@/lib/user-profile': {
      fetchAccountsDisplayInfo: async () => [{ auid: currentAuid, displayName: 'Test User', isActive: true }],
      resolveUserDisplayInfo: async () => ({ displayName: 'Test App', username: 'test-app' }),
    },
    '@/lib/oauth/scopes': scopes,
    '@/lib/oauth/permission-scopes': { describeConsentPermissions: async (_token, permissions) => permissions.map((key) => ({ key, label: 'Read posts', description: 'Read posts in the app.', contextLabel: '', contextAuid: '5' })) },
    './consent-form': { ConsentForm: () => null },
  };
  return {
    issued,
    page: loadTs('src/app/authorize/page.tsx', mocks).default,
    action: loadTs('src/app/actions/auth.ts', mocks).consentAction,
    consentPage: loadTs('src/app/consent/page.tsx', mocks).default,
  };
}
async function redirected(promise) {
  try { await promise; assert.fail('Expected a redirect'); } catch (error) { if (!error.url) throw error; return new URL(error.url, 'https://id.example'); }
}
function consentData(selected = []) {
  const form = new FormData();
  form.set('redirect_uri', `/authorize?${new URLSearchParams(query)}`);
  form.set('consent_auid', '1');
  selected.forEach((scope) => form.append('optional_scope', scope));
  return form;
}

test('consent POST completes with optional scopes off and conditional scopes required, with no consent loop', async () => {
  const flow = flowModules();
  const url = await redirected(flow.action(consentData([])));
  assert.equal(url.origin, 'https://client.example');
  assert.deepEqual(flow.issued[0].scopes, ['openid', 'app:5:posts.read', 'app:5:posts.moderate']);
});

test('consent POST rechecks lost permissions and rejects tampered selections without issuance', async () => {
  for (const [settings, selection, expected] of [
    [{}, ['app:6:write'], 'invalid_scope'],
    [{ checkFailure: new Error('offline') }, [], 'server_error'],
  ]) {
    const flow = flowModules(settings);
    const url = await redirected(flow.action(consentData(selection)));
    assert.equal(url.searchParams.get('error'), expected);
    assert.equal(url.searchParams.get('state'), 'state');
    assert.equal(flow.issued.length, 0);
  }
  const flow = flowModules({ missing: ['app:5:posts.write', 'app:5:posts.moderate'] });
  await redirected(flow.action(consentData(['app:5:posts.write'])));
  assert.deepEqual(flow.issued[0].scopes, ['openid', 'app:5:posts.read']);
});

test('lost mandatory access on submission shows the explanation before returning to the app', async () => {
  const flow = flowModules({ missing: ['app:5:posts.read'] });
  const url = await redirected(flow.action(consentData()));
  assert.equal(url.pathname, '/consent');
  assert.equal(url.searchParams.get('redirect_uri'), consentData().get('redirect_uri'));
  assert.equal(flow.issued.length, 0);
});

test('switching active accounts after rendering consent requires a new review', async () => {
  const flow = flowModules({ currentAuid: '2' });
  assert.equal((await redirected(flow.action(consentData()))).pathname, '/consent');
  assert.equal(flow.issued.length, 0);
});

test('previous consent never bypasses missing mandatory access, including prompt=none', async () => {
  const flow = flowModules({ grantScopes: requested.map(({ scope }) => scope), missing: ['app:5:posts.read'] });
  for (const prompt of ['', 'none']) {
    const url = await redirected(flow.page({ searchParams: Promise.resolve({ ...query, prompt }) }));
    if (prompt === 'none') {
      assert.equal(url.origin, 'https://client.example');
      assert.equal(url.searchParams.get('error'), 'access_denied');
      assert.equal(url.searchParams.get('state'), 'state');
      assert.equal(url.searchParams.has('code'), false);
    } else {
      assert.equal(url.pathname, '/consent');
      assert.equal(new URL(url.searchParams.get('redirect_uri'), url).searchParams.get('state'), 'state');
    }
    assert.equal(flow.issued.length, 0);
  }
});

test('missing-access screen offers a validated error callback and describes only missing mandatory scopes', async () => {
  const flow = flowModules({ missing: ['app:5:posts.read', 'app:5:posts.write'] });
  const screen = await flow.consentPage({ searchParams: Promise.resolve({ redirect_uri: consentData().get('redirect_uri') }) });
  const callback = new URL(screen.props.missingPermissionReturnUri);
  assert.equal(callback.origin, 'https://client.example');
  assert.equal(callback.searchParams.get('error'), 'access_denied');
  assert.equal(callback.searchParams.get('state'), 'state');
  assert.equal(callback.searchParams.has('code'), false);
  assert.match(callback.searchParams.get('error_description'), /app:5:posts.read/);
  assert.doesNotMatch(callback.searchParams.get('error_description'), /posts.write/);
  assert.deepEqual(screen.props.permissions.map(({ key }) => key), ['app:5:posts.read']);
  assert.equal(flow.issued.length, 0);
});

test('consent page rejects unregistered callbacks and malformed requests, and never renders silent requests', async () => {
  for (const changes of [{ redirect_uri: 'https://attacker.example/callback' }, { code_challenge: '' }, { prompt: 'none' }]) {
    const redirectUri = `/authorize?${new URLSearchParams({ ...query, ...changes })}`;
    const flow = flowModules({ missing: ['app:5:posts.read'] });
    const url = await redirected(flow.consentPage({ searchParams: Promise.resolve({ redirect_uri: redirectUri }) }));
    assert.equal(`${url.pathname}${url.search}`, changes.prompt === 'none' ? redirectUri : '/');
    assert.equal(flow.issued.length, 0);
  }
});

test('silent authorization omits unavailable extras and requires consent for newly held conditional access', async () => {
  const minimalGrant = ['openid', 'app:5:posts.read', 'email'];
  const flow = flowModules({ grantScopes: minimalGrant, missing: ['app:5:posts.write', 'app:5:posts.moderate'] });
  await redirected(flow.page({ searchParams: Promise.resolve({ ...query, prompt: 'none' }) }));
  assert.deepEqual(flow.issued[0].scopes, minimalGrant);
  const changed = flowModules({ grantScopes: minimalGrant, missing: ['app:5:posts.write'] });
  assert.equal((await redirected(changed.page({ searchParams: Promise.resolve({ ...query, prompt: 'none' }) }))).searchParams.get('error'), 'consent_required');
  assert.equal(changed.issued.length, 0);
});

test('declined optional scopes require a fresh review and client flags cannot bypass consent', async () => {
  const flow = flowModules({ grantScopes: ['openid', 'app:5:posts.read', 'app:5:posts.moderate'] });
  assert.equal((await redirected(flow.page({ searchParams: Promise.resolve({ ...query, prompt: 'none' }) }))).searchParams.get('error'), 'consent_required');
  assert.equal((await redirected(flow.page({ searchParams: Promise.resolve({ ...query, prompt_consent: 'done' }) }))).pathname, '/consent');
  assert.equal(flow.issued.length, 0);
  const approved = flowModules({ grantScopes: requested.map(({ scope }) => scope) });
  assert.equal((await redirected(approved.page({ searchParams: Promise.resolve({ ...query, prompt: 'consent', prompt_consent: 'done' }) }))).pathname, '/consent');
  assert.equal(approved.issued.length, 0);
});

test('consent submission still enforces the registered callback and PKCE', async () => {
  for (const changes of [{ redirect_uri: 'https://attacker.example/callback' }, { code_challenge: '' }]) {
    const form = consentData();
    form.set('redirect_uri', `/authorize?${new URLSearchParams({ ...query, ...changes })}`);
    const flow = flowModules();
    assert.equal((await redirected(flow.action(form))).pathname, '/');
    assert.equal(flow.issued.length, 0);
  }
});

test('token responses report full approved scope set on issuance and refresh', async () => {
  const grant = { id: 'grant', userAuid: '1', scopes: ['openid', 'email'], tokenId: null, clientAuid: '5' };
  const subject = loadTs('src/lib/oauth/token-response.ts', {
    'server-only': {}, '@/lib/oauth/scopes': scopes,
    '@/lib/oauth/access-token': { issueAccessToken: async () => ({ token: 'access', expiresInSeconds: 100 }) },
    '@/lib/oauth/audit': { recordOAuthEvent: async () => {} }, '@/lib/oauth/claims': { buildOidcClaims: async () => ({}) },
    '@/lib/oauth/grants': { touchGrant: async () => {} }, '@/lib/oauth/jwt': { signIdToken: async () => 'id-token' },
    '@/lib/oauth/refresh-token': { redeemRefreshToken: async () => ({ grant, refreshToken: 'rotated' }) },
  });
  const client = { auid: '5' };
  const result = await subject.issueTokenResponse({ client, grant, scopes: grant.scopes });
  assert.equal(result.scope, 'openid email');
  assert.equal(result.axus_access_token, undefined);
  assert.equal((await subject.refreshTokenResponse({ client, refreshToken: 'refresh' })).scope, 'openid email');
});

function consentFormModule() {
  const empty = () => null;
  return loadTs('src/app/consent/consent-form.tsx', {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) }, '@/app/actions/auth': { consentAction: empty, denyConsentAction: empty },
    '@/components/app-request-card': { AppRequestCard: empty },
    '@/components/auth-shell': { AuthShell: ({ children, title, description }) => React.createElement('main', null, React.createElement('h1', null, title), React.createElement('p', null, description), children) },
    '@/components/ui/profile-avatar': { ProfileAvatar: empty }, '@/components/ui/identity-label': { IdentityLabel: empty },
    '@/components/account-avatar': { AccountAvatar: empty }, '@/components/permission-icon': { PermissionIcon: empty },
    '@/components/ui/button': { Button: ({ children, ...props }) => { delete props.loading; delete props.variant; return React.createElement('button', props, children); }, buttonVariants: () => '' },
    '@/lib/design': {}, '@/lib/utils': { cn: (...args) => args.filter(Boolean).join(' ') }, '@/lib/oauth/scopes': scopes,
  });
}

test('consent UI associates available optional checkboxes with the approval form and locks unavailable access', () => {
  const { ConsentForm } = consentFormModule();
  const choices = available(['app:5:posts.write']);
  const html = renderToStaticMarkup(React.createElement(ConsentForm, {
    applicationUser: null, redirectUri: '/authorize', currentAuid: '1', oidcScopes: ['openid', 'email'], scopeChoices: choices,
    permissions: choices.filter(({ scope }) => scope.startsWith('app:')).map(({ scope, mode, available }) => ({ key: scope, label: scope, description: '', contextLabel: '', mode, available })),
  }));
  const formId = html.match(/<form id="([^"]+)"/)[1];
  const checkboxes = [...html.matchAll(/<input[^>]+type="checkbox"[^>]*>/g)].map(([input]) => input);
  assert.equal(checkboxes.length, 2); // email and optional write, never required/conditional
  assert.ok(checkboxes.every((input) => input.includes(`form="${formId}"`) && input.includes('name="optional_scope"')));
  assert.match(checkboxes[0], /checked=""/);
  assert.match(checkboxes[1], /disabled=""/);
  assert.doesNotMatch(checkboxes[1], /checked=""/);
  assert.match(html, /Required because you have this permission/);
  assert.match(html, /<button[^>]*>Allow/);
  assert.match(html, /name="consent_auid" value="1"/);
  const nativeOnly = renderToStaticMarkup(React.createElement(ConsentForm, { applicationUser: null, redirectUri: '/authorize', scopeChoices: [{ scope: 'app:5:posts.read', mode: 'required', available: true }], permissions: [] }));
  assert.doesNotMatch(nativeOnly, /Your AXUS ID identifier|Your name and username/);
});

test('missing-access UI shows recovery actions instead of approval and preserves the OAuth transaction on account switching', () => {
  const { ConsentForm } = consentFormModule();
  const choices = available(['app:5:posts.read', 'app:5:posts.write']);
  const returnUri = `${query.redirect_uri}?error=access_denied&state=state`;
  const html = renderToStaticMarkup(React.createElement(ConsentForm, {
    applicationUser: { displayName: 'Test App' },
    redirectUri: `/authorize?${new URLSearchParams({ ...query, account_selected: 'true' })}`,
    missingPermissionReturnUri: returnUri, oidcScopes: ['openid', 'email'], scopeChoices: choices,
    permissions: choices.filter(({ scope }) => scope.startsWith('app:')).map(({ scope, mode, available }) => ({ key: scope, label: scope === 'app:5:posts.read' ? 'Read posts' : scope, description: '', contextLabel: '', mode, available })),
  }));
  assert.match(html, /This account needs more access/);
  assert.match(html, /Missing permissions/);
  assert.match(html, /Read posts/);
  assert.match(html, /Switch account/);
  assert.match(html, /Return to Test App/);
  assert.match(html, /error=access_denied&amp;state=state/);
  assert.doesNotMatch(html, /<form|type="checkbox"|>Allow|Your AXUS ID identifier/);
  assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /posts.write|posts.moderate/);
  const switchHref = html.match(/<a[^>]+href="([^"]+)"[^>]*>Switch account/)[1].replaceAll('&amp;', '&');
  const switchUrl = new URL(switchHref, 'https://id.example');
  assert.equal(switchUrl.pathname, '/login');
  assert.equal(switchUrl.searchParams.get('select_account'), 'true');
  const request = new URL(switchUrl.searchParams.get('redirect_uri'), switchUrl);
  assert.equal(request.searchParams.has('account_selected'), false);
  for (const [key, value] of Object.entries(query)) assert.equal(request.searchParams.get(key), value);
});
