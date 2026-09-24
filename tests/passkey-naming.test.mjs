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

const naming = loadTs('src/lib/passkey-naming.ts');

test('suggests iCloud Keychain on Apple platforms', () => {
  assert.equal(
    naming.getSuggestedPasskeyName({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }),
    'iCloud Keychain',
  );
  assert.equal(
    naming.getSuggestedPasskeyName({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', platform: 'MacIntel' }),
    'iCloud Keychain',
  );
  assert.equal(
    naming.getSuggestedPasskeyName({ userAgentDataPlatform: 'macOS', userAgent: 'Mozilla/5.0 Chrome/120' }),
    'iCloud Keychain',
  );
});

test('suggests Windows Hello on Windows', () => {
  assert.equal(
    naming.getSuggestedPasskeyName({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', platform: 'Win32' }),
    'Windows Hello',
  );
  assert.equal(
    naming.getSuggestedPasskeyName({ userAgentDataPlatform: 'Windows' }),
    'Windows Hello',
  );
});

test('suggests Google Password Manager on Android, ChromeOS, and Chrome on Linux', () => {
  assert.equal(
    naming.getSuggestedPasskeyName({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' }),
    'Google Password Manager',
  );
  assert.equal(
    naming.getSuggestedPasskeyName({ userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', platform: 'Linux x86_64' }),
    'Google Password Manager',
  );
  assert.equal(
    naming.getSuggestedPasskeyName({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', platform: 'Linux x86_64' }),
    'Google Password Manager',
  );
});

test('falls back to My passkey for unknown platforms', () => {
  assert.equal(naming.getSuggestedPasskeyName({}), 'My passkey');
  assert.equal(
    naming.getSuggestedPasskeyName({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0', platform: 'Linux x86_64' }),
    'My passkey',
  );
});

test('ensureUniquePasskeyName dedupes case-insensitively', () => {
  assert.equal(naming.ensureUniquePasskeyName('iCloud Keychain', []), 'iCloud Keychain');
  assert.equal(
    naming.ensureUniquePasskeyName('iCloud Keychain', ['iCloud Keychain']),
    'iCloud Keychain 2',
  );
  assert.equal(
    naming.ensureUniquePasskeyName('iCloud Keychain', ['icloud keychain', 'iCloud Keychain 2']),
    'iCloud Keychain 3',
  );
  assert.equal(naming.ensureUniquePasskeyName('  ', ['a']), 'My passkey');
});
