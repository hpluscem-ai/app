import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import ts from 'typescript';
import * as api from '../utils/authApi.ts';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const server = 'http://localhost:8080';
const stored = JSON.stringify({ server, token: 'test-native-session' });
const key = 'hpluseco.auth.session';

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

// Run the actual session modules with an in-memory stand-in for the native keychain.
function sessionModule(platform = 'native') {
  process.env.EXPO_PUBLIC_API_URL = server;
  delete process.env.EXPO_PUBLIC_WEB_API_URL;
  process.env.EXPO_OS = platform === 'web' ? 'web' : 'ios';
  const storage = new Map([[key, stored]]);
  const secureStore = {
    getItemAsync: async (name) => storage.get(name) ?? null,
    setItemAsync: async (name, value) => { storage.set(name, value); },
    deleteItemAsync: async (name) => { storage.delete(name); },
  };
  const source = new URL(`../utils/authSession${platform === 'web' ? '.web' : ''}.ts`, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(source, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)((name) => {
    if (name === './authApi') return api;
    assert.equal(name, 'expo-secure-store');
    assert.equal(platform, 'native');
    return secureStore;
  }, exports);
  return { ...exports, storage, secureStore };
}

test('authenticated profile requests select platform credentials and preserve retryable sessions', async () => {
  const profile = { email: 'driver@example.test', name: '기사', phone: '010-1234-5678', marketingConsent: false };
  for (const platform of ['native', 'web']) {
    const session = sessionModule(platform);
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.headers.Authorization, platform === 'native' ? 'Bearer test-native-session' : undefined);
      assert.equal(options.credentials, platform === 'web' ? 'include' : 'omit');
      return Response.json(profile);
    };
    assert.deepEqual(await session.requestWithSession(api.getProfile), profile);
    for (const [status, code] of [[500, 'INTERNAL_SERVER_ERROR'], [403, 'WEB_ORIGIN_NOT_ALLOWED'], [401, 'INVALID_SESSION']]) {
      globalThis.fetch = async () => Response.json({ code, message: '서버 안내' }, { status });
      await assert.rejects(session.requestWithSession(api.getProfile), { code });
      assert.equal(session.storage.has(key), platform === 'web' || status !== 401);
    }
  }
  const session = sessionModule();
  session.storage.set(key, JSON.stringify({ server: 'https://other.example', token: 'private' }));
  globalThis.fetch = async () => assert.fail('must not send credentials to another server');
  await assert.rejects(session.requestWithSession(api.getProfile), { code: 'INVALID_SESSION' });
});

test('an expired in-flight request does not remove a newer native session', async () => {
  const session = sessionModule();
  let finish;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  const pending = assert.rejects(session.requestWithSession(api.getProfile), { code: 'INVALID_SESSION' });
  await new Promise((resolve) => setImmediate(resolve));
  const next = JSON.stringify({ server, token: 'new-session' });
  session.storage.set(key, next);
  finish(Response.json({ code: 'INVALID_SESSION', message: '만료' }, { status: 401 }));
  await pending;
  assert.equal(session.storage.get(key), next);
});

test('native logout and withdrawal clear storage only after the server confirms completion', async () => {
  for (const action of ['signOutSession', 'withdrawSession']) {
    const session = sessionModule();
    let finish;
    globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
    const pending = session[action]();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(session.storage.get(key), stored);
    finish(new Response(null, { status: 204 }));
    await pending;
    assert.equal(session.storage.has(key), false);
  }
});

test('native actions retain retryable sessions but remove server-rejected sessions', async () => {
  for (const action of ['signOutSession', 'withdrawSession']) {
    for (const [status, code, remains] of [
      [401, 'INVALID_SESSION', false],
      [500, 'INTERNAL_SERVER_ERROR', true],
      [403, 'WEB_ORIGIN_NOT_ALLOWED', true],
    ]) {
      const session = sessionModule();
      globalThis.fetch = async () => Response.json({ code, message: '서버 안내' }, { status });
      await assert.rejects(session[action](), { code });
      assert.equal(session.storage.has(key), remains);
    }
    const session = sessionModule();
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(session[action](), { code: 'NETWORK_ERROR' });
    assert.equal(session.storage.get(key), stored);
    globalThis.fetch = async () => Response.json({ success: true });
    await assert.rejects(session[action](), { code: 'INVALID_RESPONSE' });
    assert.equal(session.storage.get(key), stored);
  }
});

test('native actions never transmit a missing, corrupt, or different-server credential', async () => {
  for (const action of ['signOutSession', 'withdrawSession']) {
    for (const value of [undefined, '{broken', JSON.stringify({ server: 'https://other.example', token: 'private' })]) {
      const session = sessionModule();
      if (value === undefined) session.storage.delete(key);
      else session.storage.set(key, value);
      globalThis.fetch = async () => assert.fail('must not send credentials');
      await assert.rejects(session[action](), { code: 'INVALID_SESSION', status: 401 });
      if (value?.includes('other.example')) assert.equal(session.storage.get(key), value);
    }
  }
});

test('native cleanup failures identify a revoked session instead of pretending storage was cleared', async () => {
  const session = sessionModule();
  globalThis.fetch = async () => new Response(null, { status: 204 });
  session.secureStore.deleteItemAsync = async () => { throw new Error('keychain unavailable'); };
  await assert.rejects(session.withdrawSession(), { code: 'SESSION_CLEAR_FAILED' });
  assert.equal(session.storage.get(key), stored);
});

test('native restoration still validates the stored token and removes an expired session', async () => {
  const session = sessionModule();
  const user = { id: 'driver', name: '기사', email: 'driver@example.test', logisticsCompanyId: 'company' };
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-native-session');
    return Response.json(user);
  };
  assert.deepEqual(await session.restoreSession(), user);
  globalThis.fetch = async () => Response.json({ code: 'INVALID_SESSION', message: '만료' }, { status: 401 });
  assert.equal(await session.restoreSession(), null);
  assert.equal(session.storage.has(key), false);
});

test('web account actions use only the cookie transport and propagate failures', async () => {
  const session = sessionModule('web');
  for (const action of ['signOutSession', 'withdrawSession']) {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.credentials, 'include');
      assert.equal(options.headers.Authorization, undefined);
      return new Response(null, { status: 204 });
    };
    await session[action]();
    globalThis.fetch = async () => Response.json({ code: 'INVALID_SESSION', message: '만료' }, { status: 401 });
    await assert.rejects(session[action](), { code: 'INVALID_SESSION' });
  }
});
