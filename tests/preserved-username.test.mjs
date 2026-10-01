import test from 'node:test';
import assert from 'node:assert/strict';

function buildCreateAccountHref({
  redirectUri,
  next,
  addAccount,
  username,
}) {
  const params = new URLSearchParams();
  if (redirectUri) params.set("redirect_uri", redirectUri);
  if (next) params.set("next", next);
  if (addAccount) params.set("add_account", "true");
  if (username) params.set("username", username);
  const query = params.toString();
  return query ? `/register?${query}` : "/register";
}

function buildLoginHref({
  redirectUri,
  next,
  addAccount,
  username,
}) {
  const params = new URLSearchParams();
  if (redirectUri) params.set("redirect_uri", redirectUri);
  if (next) params.set("next", next);
  if (addAccount) params.set("add_account", "true");
  if (username) params.set("username", username);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

test('Login -> Register preserves half-entered username on identifier step', () => {
  const credentialStep = 'identifier';
  const username = 'half_typed';
  const trimmed = username.trim().replace(/^@/, '');

  const href = buildCreateAccountHref({
    redirectUri: '/oauth/authorize',
    next: '/account',
    addAccount: false,
    username: credentialStep === 'identifier' ? trimmed || undefined : undefined,
  });

  const url = new URL(href, 'http://localhost');
  assert.equal(url.pathname, '/register');
  assert.equal(url.searchParams.get('username'), 'half_typed');
  assert.equal(url.searchParams.get('redirect_uri'), '/oauth/authorize');
  assert.equal(url.searchParams.get('next'), '/account');
});

test('Login -> Register removes leading @ from preserved username', () => {
  const credentialStep = 'identifier';
  const username = '@at_user';
  const trimmed = username.trim().replace(/^@/, '');

  const href = buildCreateAccountHref({
    username: credentialStep === 'identifier' ? trimmed || undefined : undefined,
  });

  const url = new URL(href, 'http://localhost');
  assert.equal(url.pathname, '/register');
  assert.equal(url.searchParams.get('username'), 'at_user');
});

test('Login -> Register does not preserve username if user passed first page (password step)', () => {
  const credentialStep = 'password';
  const username = 'verified_user';
  const trimmed = username.trim().replace(/^@/, '');

  const href = buildCreateAccountHref({
    redirectUri: '/oauth/authorize',
    username: credentialStep === 'identifier' ? trimmed || undefined : undefined,
  });

  const url = new URL(href, 'http://localhost');
  assert.equal(url.pathname, '/register');
  assert.equal(url.searchParams.get('username'), null);
  assert.equal(url.searchParams.get('redirect_uri'), '/oauth/authorize');
});

test('Login account picker does not preserve username', () => {
  const href = buildCreateAccountHref({
    addAccount: true,
  });

  const url = new URL(href, 'http://localhost');
  assert.equal(url.pathname, '/register');
  assert.equal(url.searchParams.get('username'), null);
  assert.equal(url.searchParams.get('add_account'), 'true');
});

test('Register -> Login preserves half-entered username on identity stage', () => {
  const stage = 'identity';
  const customUsername = 'partial_user';
  const normalized = customUsername.trim().replace(/^@/, '');

  const href = buildLoginHref({
    redirectUri: '/oauth/authorize',
    next: '/account',
    addAccount: true,
    username: stage === 'identity' ? normalized || undefined : undefined,
  });

  const url = new URL(href, 'http://localhost');
  assert.equal(url.pathname, '/login');
  assert.equal(url.searchParams.get('username'), 'partial_user');
  assert.equal(url.searchParams.get('redirect_uri'), '/oauth/authorize');
  assert.equal(url.searchParams.get('next'), '/account');
  assert.equal(url.searchParams.get('add_account'), 'true');
});

test('Register -> Login does not preserve username if user passed first page (security stage)', () => {
  const stage = 'security';
  const customUsername = 'valid_user_123';
  const normalized = customUsername.trim().replace(/^@/, '');

  const href = buildLoginHref({
    redirectUri: '/oauth/authorize',
    addAccount: false,
    username: stage === 'identity' ? normalized || undefined : undefined,
  });

  const url = new URL(href, 'http://localhost');
  assert.equal(url.pathname, '/login');
  assert.equal(url.searchParams.get('username'), null);
  assert.equal(url.searchParams.get('redirect_uri'), '/oauth/authorize');
});

test('Register availability checking properly differentiates available, taken, and short usernames', async () => {
  async function computeAvailability(usernameParam, suggestedUsername, checkMock) {
    let initialAvailability;
    if (usernameParam) {
      if (usernameParam.length >= 4) {
        try {
          const check = await checkMock(usernameParam);
          if (check.available) {
            initialAvailability = { username: usernameParam, status: 'available' };
          } else {
            initialAvailability = {
              username: usernameParam,
              status: check.reason === 'taken' ? 'taken' : 'error',
              message: check.error || 'That username is taken.',
            };
          }
        } catch {
          initialAvailability = { username: usernameParam, status: 'idle' };
        }
      } else {
        initialAvailability = { username: usernameParam, status: 'idle' };
      }
    } else if (suggestedUsername) {
      initialAvailability = { username: suggestedUsername, status: 'available' };
    }
    return initialAvailability;
  }

  // 1. Available username with >= 4 characters
  const available = await computeAvailability('fresh_name', undefined, async () => ({
    available: true,
  }));
  assert.deepEqual(available, { username: 'fresh_name', status: 'available' });

  // 2. Taken username with >= 4 characters
  const taken = await computeAvailability('existing_name', undefined, async () => ({
    available: false,
    reason: 'taken',
    error: 'That username is already in use. Try another one.',
  }));
  assert.deepEqual(taken, {
    username: 'existing_name',
    status: 'taken',
    message: 'That username is already in use. Try another one.',
  });

  // 3. Short half-entered username (< 4 characters) starts as idle
  const short = await computeAvailability('al', undefined, async () => {
    throw new Error('Should not be called for short username');
  });
  assert.deepEqual(short, { username: 'al', status: 'idle' });

  // 4. Preserved username takes precedence over suggestedUsername
  const precedence = await computeAvailability('user_choice', 'suggested_choice', async () => ({
    available: true,
  }));
  assert.deepEqual(precedence, { username: 'user_choice', status: 'available' });

  // 5. Fallback to suggested username when no usernameParam provided
  const suggested = await computeAvailability(undefined, 'oauth_suggested', async () => ({
    available: true,
  }));
  assert.deepEqual(suggested, { username: 'oauth_suggested', status: 'available' });
});
