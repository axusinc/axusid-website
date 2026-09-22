import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const loadDependency = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadTs(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : loadDependency(name),
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}

const lastAuthMethod = loadTs('src/lib/last-auth-method.ts');

test('isValidAuthMethod accurately validates authentication methods', () => {
  assert.equal(lastAuthMethod.isValidAuthMethod('password'), true);
  assert.equal(lastAuthMethod.isValidAuthMethod('google'), true);
  assert.equal(lastAuthMethod.isValidAuthMethod('passkey'), true);
  assert.equal(lastAuthMethod.isValidAuthMethod('saml'), false);
  assert.equal(lastAuthMethod.isValidAuthMethod('github'), true);
  assert.equal(lastAuthMethod.isValidAuthMethod(''), false);
  assert.equal(lastAuthMethod.isValidAuthMethod(null), false);
  assert.equal(lastAuthMethod.isValidAuthMethod(undefined), false);
  assert.equal(lastAuthMethod.isValidAuthMethod(123), false);
});

test('constants and cookie configuration match expected defaults', () => {
  assert.equal(lastAuthMethod.LAST_AUTH_METHOD_COOKIE, 'axus_last_auth_method');
  assert.equal(lastAuthMethod.LAST_AUTH_METHOD_STORAGE_KEY, 'axus_last_auth_method');
  assert.equal(lastAuthMethod.lastAuthMethodCookieOptions.path, '/');
  assert.equal(lastAuthMethod.lastAuthMethodCookieOptions.sameSite, 'lax');
  assert.equal(lastAuthMethod.lastAuthMethodCookieOptions.httpOnly, false);
  assert.equal(lastAuthMethod.lastAuthMethodCookieOptions.maxAge, 365 * 24 * 60 * 60);
});

test('server getLastAuthMethod and setLastAuthMethod interact with cookies correctly', async () => {
  const mockCookiesStore = new Map();
  const mockNextHeaders = {
    cookies: async () => ({
      get: (name) => {
        const val = mockCookiesStore.get(name);
        return val ? { name, value: val } : undefined;
      },
      set: (name, value) => {
        mockCookiesStore.set(name, value);
      },
    }),
  };

  const serverModule = loadTs('src/lib/last-auth-method-server.ts', {
    'server-only': {},
    'next/headers': mockNextHeaders,
    '@/lib/last-auth-method': lastAuthMethod,
  });

  // Initially unset
  assert.equal(await serverModule.getLastAuthMethod(), null);

  // Set to password
  await serverModule.setLastAuthMethod('password');
  assert.equal(await serverModule.getLastAuthMethod(), 'password');

  // Update to google
  await serverModule.setLastAuthMethod('google');
  assert.equal(await serverModule.getLastAuthMethod(), 'google');

  // Update to passkey
  await serverModule.setLastAuthMethod('passkey');
  assert.equal(await serverModule.getLastAuthMethod(), 'passkey');
});

test('client getClientLastAuthMethod, setClientLastAuthMethod, and subscribeLastAuthMethod work with browser globals', () => {
  const storage = new Map();
  const listeners = new Map();

  globalThis.window = {
    location: { protocol: 'https:' },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, val) => storage.set(key, String(val)),
    },
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent: (event) => {
      listeners.get(event.type)?.forEach((fn) => fn(event));
    },
  };
  globalThis.Event = class Event {
    constructor(type) { this.type = type; }
  };
  globalThis.document = {
    cookie: '',
  };

  try {
    let notifiedCount = 0;
    const unsubscribe = lastAuthMethod.subscribeLastAuthMethod(() => {
      notifiedCount++;
    });

    assert.equal(lastAuthMethod.getClientLastAuthMethod(), null);

    lastAuthMethod.setClientLastAuthMethod('google');
    assert.equal(lastAuthMethod.getClientLastAuthMethod(), 'google');
    assert.equal(notifiedCount, 1);
    assert.match(globalThis.document.cookie, /axus_last_auth_method=google/);

    lastAuthMethod.setClientLastAuthMethod('passkey');
    assert.equal(lastAuthMethod.getClientLastAuthMethod(), 'passkey');
    assert.equal(notifiedCount, 2);

    unsubscribe();
    lastAuthMethod.setClientLastAuthMethod('password');
    assert.equal(notifiedCount, 2); // Unsubscribed, should not increment
    assert.equal(lastAuthMethod.getClientLastAuthMethod(), 'password');
  } finally {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.Event;
  }
});
