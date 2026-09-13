import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  AuthApiError,
  changePhone,
  confirmPhoneChangeVerification,
  confirmPhoneVerification,
  findEmail,
  getApiUrl,
  getCurrentUser,
  getCurrentUserWithCookie,
  getProfile,
  getSignupCompanies,
  login,
  loginWithCookie,
  logout,
  requestPasswordResetEmail,
  requestMyPasswordResetEmail,
  resetPassword,
  validatePasswordReset,
  sendPhoneVerification,
  sendPhoneChangeVerification,
  signup,
  withdraw,
  updateProfile,
} from '../utils/authApi.ts';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const originalWebUrl = process.env.EXPO_PUBLIC_WEB_API_URL;
const originalPlatform = process.env.EXPO_OS;
const expiresAt = '2099-01-01T00:00:00.000Z';
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  if (originalWebUrl === undefined) delete process.env.EXPO_PUBLIC_WEB_API_URL;
  else process.env.EXPO_PUBLIC_WEB_API_URL = originalWebUrl;
  if (originalPlatform === undefined) delete process.env.EXPO_OS;
  else process.env.EXPO_OS = originalPlatform;
});

test('profile and phone changes use authenticated contracts without leaking form fields', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  const profile = { email: 'driver@example.test', name: '기사', phone: '010-1234-5678', marketingConsent: false };
  for (const session of [{ token: 'native-token' }, { credentials: 'include' }]) {
    const requests = [];
    globalThis.fetch = async (url, options) => {
      assert.equal(options.credentials, session.credentials ?? 'omit');
      assert.equal(options.headers.Authorization, session.token ? `Bearer ${session.token}` : undefined);
      requests.push({ path: new URL(url).pathname, method: options.method, body: options.body && JSON.parse(options.body) });
      if (url.endsWith('/users/me')) return Response.json(profile);
      if (url.endsWith('/verifications')) return Response.json({ verificationId: 'id/with space', expiresAt }, { status: 201 });
      if (url.endsWith('/confirm')) return Response.json({ verificationProof: 'proof', expiresAt });
      if (url.endsWith('/password-reset-emails')) return Response.json({ email: profile.email });
      return new Response(null, { status: 204 });
    };
    assert.deepEqual(await getProfile(session), profile);
    assert.deepEqual(await updateProfile({ ...profile, name: ' 기사 ', verificationCode: '012345' }, session), profile);
    const sent = await sendPhoneChangeVerification(profile.phone, session);
    const verified = await confirmPhoneChangeVerification(sent.verificationId, '012345', session);
    const input = { ...profile, verificationProof: verified.verificationProof, verificationCode: '012345' };
    await changePhone(input, session);
    assert.deepEqual(await requestMyPasswordResetEmail(input, session), { email: profile.email });
    assert.deepEqual(requests, [
      { path: '/api/v1/users/me', method: 'GET', body: undefined },
      { path: '/api/v1/users/me', method: 'PATCH', body: { name: '기사', marketingConsent: false } },
      { path: '/api/v1/auth/phone-change/verifications', method: 'POST', body: { phone: profile.phone } },
      { path: '/api/v1/auth/phone-change/verifications/id%2Fwith%20space/confirm', method: 'POST', body: { code: '012345' } },
      { path: '/api/v1/auth/change-phone', method: 'POST', body: { phone: profile.phone, verificationProof: 'proof' } },
      { path: '/api/v1/auth/me/password-reset-emails', method: 'POST', body: { phone: profile.phone, verificationProof: 'proof' } },
    ]);
  }
  globalThis.fetch = async () => Response.json({ ...profile, marketingConsent: 'false' });
  await assert.rejects(getProfile({ token: 'token' }), { code: 'INVALID_RESPONSE' });
  globalThis.fetch = async () => Response.json({ success: true });
  await assert.rejects(changePhone({ phone: profile.phone, verificationProof: 'proof' }, {}), { code: 'INVALID_RESPONSE' });
  await assert.rejects(requestMyPasswordResetEmail({ phone: profile.phone, verificationProof: 'proof' }, {}), { code: 'INVALID_RESPONSE' });
});

test('web can use a same-site API origin without changing the native server', () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.2:8080';
  process.env.EXPO_PUBLIC_WEB_API_URL = ' http://localhost:8080/ ';
  for (const platform of ['ios', 'android', 'web']) {
    process.env.EXPO_OS = platform;
    assert.equal(getApiUrl(), platform === 'web'
      ? 'http://localhost:8080' : 'http://192.168.1.2:8080');
  }
  process.env.EXPO_PUBLIC_WEB_API_URL = 'https://user:secret@example.test';
  assert.throws(getApiUrl, { code: 'API_NOT_CONFIGURED' });
  delete process.env.EXPO_PUBLIC_WEB_API_URL;
  assert.equal(getApiUrl(), 'http://192.168.1.2:8080');
});

test('web login and restoration use cookies without exposing a bearer token', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  const user = {
    id: 'driver', email: 'driver@example.test', name: '기사',
    logisticsCompanyId: 'company',
  };
  globalThis.fetch = async (url, options) => {
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers.Authorization, undefined);
    if (url.endsWith('/auth/web/login')) {
      assert.deepEqual(JSON.parse(options.body), {
        email: user.email, password: ' Password!1 ',
      });
      return Response.json({ expiresAt });
    }
    assert.equal(url, 'http://localhost:8080/api/v1/auth/me');
    assert.equal(options.method, 'GET');
    return Response.json(user);
  };
  assert.deepEqual(await loginWithCookie({
    email: ` ${user.email} `, password: ' Password!1 ',
  }), { expiresAt });
  assert.deepEqual(await getCurrentUserWithCookie(), user);
  globalThis.fetch = async () => Response.json({ expiresAt: 'invalid' });
  await assert.rejects(loginWithCookie({ email: user.email, password: 'Password!1' }), {
    code: 'INVALID_RESPONSE',
  });
  for (const [status, code] of [[401, 'INVALID_SESSION'], [500, 'INTERNAL_SERVER_ERROR']]) {
    globalThis.fetch = async () => Response.json({ code, message: '서버 안내' }, { status });
    await assert.rejects(getCurrentUserWithCookie(), (error) =>
      error.status === status && error.code === code);
  }
});

test('login preserves the password, validates the token, and authenticates /me', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080/';
  const user = {
    id: 'driver',
    email: 'driver@example.test',
    name: '기사',
    logisticsCompanyId: 'company',
  };
  globalThis.fetch = async (url, options) => {
    assert.equal(options.credentials, 'omit');
    if (url.endsWith('/auth/login')) {
      assert.equal(url, 'http://localhost:8080/api/v1/auth/login');
      assert.deepEqual(JSON.parse(options.body), {
        email: user.email,
        password: ' Password!1 ',
      });
      assert.equal(options.headers.Authorization, undefined);
      return Response.json({ token: 'server-issued-token', expiresAt });
    }
    assert.equal(url, 'http://localhost:8080/api/v1/auth/me');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer server-issued-token');
    return Response.json(user);
  };
  const session = await login({
    email: ` ${user.email} `,
    password: ' Password!1 ',
  });
  assert.deepEqual(await getCurrentUser(session.token), user);
  globalThis.fetch = async () => Response.json({ token: '', expiresAt });
  await assert.rejects(login({ email: user.email, password: 'Password!1' }), {
    code: 'INVALID_RESPONSE',
  });
  globalThis.fetch = async () =>
    Response.json({ token: 'token', expiresAt: 'invalid' });
  await assert.rejects(login({ email: user.email, password: 'Password!1' }), {
    code: 'INVALID_RESPONSE',
  });
  globalThis.fetch = async () => Response.json({ ...user, name: null });
  await assert.rejects(getCurrentUser('token'), { code: 'INVALID_RESPONSE' });
});

test('signup uses the server SMS proof and excludes form-only fields', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: options.body && JSON.parse(options.body) });
    if (url.endsWith('/logistics-companies'))
      return Response.json([{ id: 'company', businessName: '물류사' }]);
    if (url.endsWith('/phone-verifications'))
      return Response.json({ verificationId: 'verification', expiresAt });
    if (url.endsWith('/confirm'))
      return Response.json({ verificationProof: 'proof', expiresAt });
    return Response.json({ id: 'driver' }, { status: 201 });
  };
  const [company] = await getSignupCompanies();
  const sent = await sendPhoneVerification({ phone: '010-1234-5678', purpose: 'sign_up' });
  const verified = await confirmPhoneVerification(sent.verificationId, '012345', 'sign_up');
  await signup({
    email: ' driver@example.test ',
    password: 'Password!1',
    name: ' 기사 ',
    logisticsCompanyId: company.id,
    phone: '010-1234-5678',
    verificationProof: verified.verificationProof,
    serviceTerms: true,
    privacyTerms: true,
    marketingTerms: false,
    passwordConfirmation: 'must not be sent',
    verificationCode: '012345',
  });
  assert.deepEqual(requests[1].body, {
    phone: '010-1234-5678',
    purpose: 'sign_up',
  });
  assert.deepEqual(requests[2].body, { code: '012345', purpose: 'sign_up' });
  assert.deepEqual(requests[3].body, {
    email: 'driver@example.test',
    password: 'Password!1',
    name: '기사',
    logisticsCompanyId: 'company',
    phone: '010-1234-5678',
    verificationProof: 'proof',
    serviceTerms: true,
    privacyTerms: true,
    marketingTerms: false,
  });
  globalThis.fetch = async () =>
    Response.json({ verificationProof: '', expiresAt });
  await assert.rejects(confirmPhoneVerification('verification', '012345', 'sign_up'), {
    code: 'INVALID_RESPONSE',
  });
});

test('empty company results, server faults and invalid sessions remain distinct', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  globalThis.fetch = async () => Response.json([]);
  assert.deepEqual(await getSignupCompanies(), []);
  for (const [status, code] of [
    [401, 'INVALID_SESSION'],
    [500, 'INTERNAL_SERVER_ERROR'],
  ]) {
    globalThis.fetch = async () =>
      Response.json({ code, message: '서버 안내' }, { status });
    await assert.rejects(
      getCurrentUser('token'),
      (error) =>
        error instanceof AuthApiError &&
        error.status === status &&
        error.code === code,
    );
  }
  globalThis.fetch = async () => {
    throw new Error('private transport details');
  };
  await assert.rejects(
    getCurrentUser('token'),
    (error) =>
      error.code === 'NETWORK_ERROR' &&
      !error.message.includes('private transport details'),
  );
  globalThis.fetch = async () =>
    Response.json(
      {
        code: 'VALIDATION_ERROR',
        message: '입력 확인',
        fieldErrors: { email: ['invalid'] },
      },
      { status: 400 },
    );
  await assert.rejects(
    login({ email: 'email', password: 'password' }),
    (error) => error.code === 'VALIDATION_ERROR' && error.fields[0] === 'email',
  );
});

test('invalid configuration does not transmit credentials', async () => {
  globalThis.fetch = async () => {
    assert.fail('fetch must not be called');
  };
  for (const url of [
    '',
    'file:///tmp/server',
    'https://user:secret@example.test',
    'https://example.test?key=secret',
  ]) {
    process.env.EXPO_PUBLIC_API_URL = url;
    await assert.rejects(
      login({ email: 'driver@example.test', password: 'Password!1' }),
      { code: 'API_NOT_CONFIGURED' },
    );
  }
});

test('requests time out without automatically sending them again', async (context) => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  globalThis.fetch = (_url, options) =>
    new Promise((_resolve, reject) => {
      calls += 1;
      options.signal.addEventListener('abort', () =>
        reject(new Error('timeout')),
      );
    });
  const pending = assert.rejects(sendPhoneVerification({ phone: '010-1234-5678', purpose: 'sign_up' }), {
    code: 'NETWORK_ERROR',
  });
  context.mock.timers.tick(15_000);
  await pending;
  assert.equal(calls, 1);
});

test('recovery binds SMS to its purpose and accepts only actual server results', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  const requests = [];
  const phone = '010-1234-5678';
  const email = 'driver@example.test';
  const token = 'a'.repeat(43);
  globalThis.fetch = async (url, options) => {
    assert.equal(options.credentials, 'omit');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, undefined);
    assert.ok(!url.includes(token));
    requests.push(JSON.parse(options.body));
    if (url.endsWith('/phone-verifications'))
      return Response.json({ verificationId: 'verification', expiresAt }, { status: 201 });
    if (url.endsWith('/confirm'))
      return Response.json({ verificationProof: 'proof', expiresAt });
    if (url.endsWith('/find-email'))
      return Response.json({ maskedEmail: 'dr****@example.test', phoneLastFour: '5678' });
    if (url.endsWith('/password-reset-emails'))
      return Response.json({ message: '서버 접수 안내' }, { status: 202 });
    assert.ok(url.endsWith('/reset-password') || url.endsWith('/reset-password/validate'));
    return new Response(null, { status: 204 });
  };
  for (const purpose of ['find_email', 'reset_password']) {
    const sent = await sendPhoneVerification({ phone, purpose, email: ` ${email} ` });
    await confirmPhoneVerification(sent.verificationId, '012345', purpose);
  }
  assert.deepEqual(await findEmail({ phone, verificationProof: 'proof', verificationCode: '012345' }), {
    maskedEmail: 'dr****@example.test', phoneLastFour: '5678',
  });
  assert.deepEqual(await requestPasswordResetEmail({ phone, email: ` ${email} `, verificationProof: 'proof' }), {
    message: '서버 접수 안내',
  });
  await validatePasswordReset(token);
  await resetPassword({ token, newPassword: ' NewPassword!2 ', passwordConfirmation: 'excluded' });
  assert.deepEqual(requests, [
    { phone, purpose: 'find_email' },
    { code: '012345', purpose: 'find_email' },
    { phone, purpose: 'reset_password', email },
    { code: '012345', purpose: 'reset_password' },
    { phone, verificationProof: 'proof' },
    { phone, email, verificationProof: 'proof' },
    { token },
    { token, newPassword: ' NewPassword!2 ' },
  ]);
  globalThis.fetch = async () => Response.json({ message: 'success' });
  await assert.rejects(validatePasswordReset(token), { code: 'INVALID_RESPONSE' });
  await assert.rejects(resetPassword({ token, newPassword: 'NewPassword!2' }), { code: 'INVALID_RESPONSE' });
  await assert.rejects(requestPasswordResetEmail({ phone, email, verificationProof: 'proof' }), { code: 'INVALID_RESPONSE' });
  globalThis.fetch = async () => Response.json({ maskedEmail: '', phoneLastFour: '5678' });
  await assert.rejects(findEmail({ phone, verificationProof: 'proof' }), { code: 'INVALID_RESPONSE' });
  for (const [status, code, call] of [
    [404, 'ACCOUNT_NOT_FOUND', () => findEmail({ phone, verificationProof: 'proof' })],
    [400, 'PHONE_VERIFICATION_INVALID', () => requestPasswordResetEmail({ phone, email, verificationProof: 'proof' })],
    [503, 'PASSWORD_RESET_EMAIL_NOT_CONFIGURED', () => requestPasswordResetEmail({ phone, email, verificationProof: 'proof' })],
    [502, 'PASSWORD_RESET_EMAIL_SEND_FAILED', () => requestPasswordResetEmail({ phone, email, verificationProof: 'proof' })],
    [400, 'PASSWORD_RESET_INVALID', () => resetPassword({ token, newPassword: 'NewPassword!2' })],
    [400, 'PASSWORD_RESET_INVALID', () => validatePasswordReset(token)],
    [500, 'INTERNAL_SERVER_ERROR', () => validatePasswordReset(token)],
  ]) {
    globalThis.fetch = async () => Response.json({ code, message: '서버 안내' }, { status });
    await assert.rejects(call(), (error) => error.status === status && error.code === code);
  }
});

test('logout and withdrawal require 204 and use the correct session transport', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  for (const [action, path, method] of [
    [logout, '/auth/logout', 'POST'],
    [withdraw, '/users/me', 'DELETE'],
  ]) {
    for (const [token, credentials] of [['native-token', 'omit'], [undefined, 'include']]) {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, `http://localhost:8080/api/v1${path}`);
        assert.equal(options.method, method);
        assert.equal(options.credentials, credentials);
        assert.equal(options.headers.Authorization, token ? `Bearer ${token}` : undefined);
        assert.equal(options.body, undefined);
        return new Response(null, { status: 204 });
      };
      await action(token, credentials);
    }
    globalThis.fetch = async () => Response.json({ success: true });
    await assert.rejects(action('token'), { code: 'INVALID_RESPONSE' });
    for (const [status, code] of [[401, 'INVALID_SESSION'], [500, 'INTERNAL_SERVER_ERROR']]) {
      globalThis.fetch = async () => Response.json({ code, message: '서버 안내' }, { status });
      await assert.rejects(action('token'), (error) => error.status === status && error.code === code);
    }
  }
});
