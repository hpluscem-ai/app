import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import ts from 'typescript';
import * as auth from '../utils/authApi.ts';

const api = {};
new Function('require', 'exports', ts.transpileModule(readFileSync(new URL('../utils/mileageApi.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)((name) => { assert.equal(name, './authApi'); return auth; }, api);
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
afterEach(() => { globalThis.fetch = originalFetch; process.env = { ...originalEnv }; });
const id = '11111111-1111-4111-8111-111111111111';
const item = { id, status: 'pending', submittedAt: '2026-09-22T00:00:00.000Z', decidedAt: null, mileageAmount: null, finalAmount: null, rejectionReason: null };
const detail = { ...item, photoMode: 'separate', submissionVersion: 'a'.repeat(64), photos: { receipt: `/api/v1/mileage/applications/${id}/photos/receipt`, meter: `/api/v1/mileage/applications/${id}/photos/meter` } };

test('summary uses the existing JSON contract and cookie or Bearer credentials, including a real zero', async () => {
  assert.equal(typeof api.getMileageSummary, 'function');
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  for (const session of [{ token: 'test' }, { credentials: 'include' }]) {
    for (const accumulatedMileage of [0, 74910, Number.MAX_SAFE_INTEGER]) {
      globalThis.fetch = async (url, options) => {
        assert.equal(url, 'http://localhost:8080/api/v1/mileage/summary');
        assert.equal(options.method, 'GET');
        assert.equal(options.headers.Authorization, session.token ? 'Bearer test' : undefined);
        assert.equal(options.credentials, session.credentials ?? 'omit');
        return Response.json({ accumulatedMileage });
      };
      assert.deepEqual(await api.getMileageSummary(session), { accumulatedMileage });
    }
  }
});

test('summary rejects invalid amounts and preserves API or network errors', async () => {
  assert.equal(typeof api.getMileageSummary, 'function');
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  for (const invalid of [null, [], {}, { accumulatedMileage: null }, { accumulatedMileage: '0' },
    { accumulatedMileage: -1 }, { accumulatedMileage: 0.5 }, { accumulatedMileage: Number.MAX_SAFE_INTEGER + 1 }]) {
    globalThis.fetch = async () => Response.json(invalid);
    await assert.rejects(api.getMileageSummary({}), { code: 'INVALID_RESPONSE' });
  }
  globalThis.fetch = async () => Response.json({ accumulatedMileage: 1 }, { status: 201 });
  await assert.rejects(api.getMileageSummary({}), { code: 'INVALID_RESPONSE' });
  for (const [status, code] of [[401, 'INVALID_SESSION'], [500, 'INTERNAL_SERVER_ERROR']]) {
    globalThis.fetch = async () => Response.json({ code, message: '조회 실패' }, { status });
    await assert.rejects(api.getMileageSummary({}), { status, code });
  }
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(api.getMileageSummary({}), { code: 'NETWORK_ERROR' });
});

test('calendar ranges include the selected last local day, clamp month ends and reject invalid dates', () => {
  const filter = { period: 'oneMonth', sort: 'latest', startDate: '', endDate: '' };
  const range = api.mileageQuery(filter, new Date(2026, 2, 31, 15));
  assert.equal(new Date(range.createdFrom).getDate(), 28);
  assert.equal(new Date(range.createdFrom).getMonth(), 1);
  assert.equal(new Date(range.createdBefore).getDate(), 1);
  assert.equal(new Date(range.createdBefore).getHours(), 0);
  assert.equal(range.order, 'desc');
  const custom = api.mileageQuery({ ...filter, period: 'custom', startDate: '2024. 02. 29', endDate: '2024. 03. 01', sort: 'oldest' });
  assert.equal(new Date(custom.createdBefore).getDate(), 2);
  assert.equal(custom.order, 'asc');
  for (const [startDate, endDate] of [['2026. 02. 29', '2026. 03. 01'], ['2026. 03. 02', '2026. 03. 01'], ['', '2026. 03. 01']]) {
    assert.throws(() => api.mileageQuery({ ...filter, period: 'custom', startDate, endDate }), { code: 'INVALID_DATE_RANGE' });
  }
});

test('list/detail preserve null, validate responses and use cookie or Bearer credentials', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  for (const session of [{ token: 'test' }, { credentials: 'include' }]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, session.token ? 'Bearer test' : undefined);
      assert.equal(options.credentials, session.credentials ?? 'omit');
      assert.equal(options.redirect, 'error');
      return Response.json(url.includes('?') ? { items: [item], nextCursor: 'next' } : detail);
    };
    assert.deepEqual(await api.getMileageApplications({ order: 'desc' }, session), { items: [item], nextCursor: 'next' });
    assert.deepEqual(await api.getMileageApplication(id, session), detail);
  }
  for (const invalid of [null, { items: [], nextCursor: 0 }, { items: [{ ...item, mileageAmount: -1 }], nextCursor: null }, { items: [{ ...item, status: 'settled' }], nextCursor: null }]) {
    globalThis.fetch = async () => Response.json(invalid);
    await assert.rejects(api.getMileageApplications({}, {}), { code: 'INVALID_RESPONSE' });
  }
  globalThis.fetch = async () => Response.json({ ...detail, photos: { ...detail.photos, receipt: 'https://external.test/photo' } });
  await assert.rejects(api.getMileageApplication(id, {}), { code: 'INVALID_RESPONSE' });
});

test('multipart retries preserve key and bytes, omit Content-Type, and require HTTP 201', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  const submission = { key: id, receipt: { file: new Blob(['receipt']), name: 'receipt.jpg' }, meter: { file: new Blob(['meter']), name: 'meter.jpg' } };
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], undefined);
    assert.equal(options.body.get('idempotencyKey'), id);
    assert.equal(await options.body.get('receipt').text(), 'receipt');
    assert.equal(await options.body.get('meter').text(), 'meter');
    if (calls === 1) throw new Error('connection interrupted');
    return Response.json(detail, { status: 201 });
  };
  await assert.rejects(api.createMileageApplication(submission, {}), { code: 'NETWORK_ERROR' });
  assert.deepEqual(await api.createMileageApplication(submission, {}), detail);
  globalThis.fetch = async () => Response.json(detail);
  await assert.rejects(api.createMileageApplication(submission, {}), { code: 'INVALID_RESPONSE' });
});

test('protected photos only use fixed own-API paths, distinguish HTTP failures and reject non-JPEG', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  for (const [status, code] of [[401, 'INVALID_SESSION'], [404, 'MILEAGE_APPLICATION_NOT_FOUND'], [503, 'PHOTO_STORAGE_UNAVAILABLE']]) {
    globalThis.fetch = async () => Response.json({ code, message: '실패' }, { status });
    await assert.rejects(api.getMileagePhoto(id, 'meter', { token: 'test' }), { status, code });
  }
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `http://localhost:8080/api/v1/mileage/applications/${id}/photos/meter`);
    assert.equal(options.headers.Authorization, 'Bearer test');
    return new Response('JPEG bytes', { headers: { 'Content-Type': 'image/jpeg' } });
  };
  assert.equal(await (await api.getMileagePhoto(id, 'meter', { token: 'test' })).text(), 'JPEG bytes');
  globalThis.fetch = async () => new Response('<html>');
  await assert.rejects(api.getMileagePhoto(id, 'receipt', {}), { code: 'INVALID_RESPONSE' });
  globalThis.fetch = async () => assert.fail('bad IDs must never reach fetch');
  await assert.rejects(api.getMileagePhoto('https://external.test', 'receipt', {}), { code: 'INVALID_APPLICATION_ID' });
});


test('resubmission sends only selected photos with a separate key/version and expects HTTP 200', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  const input = { key: id, submissionVersion: detail.submissionVersion, meter: { file: new Blob(['replacement']), name: 'meter.jpg' } };
  for (const session of [{ token: 'test' }, { credentials: 'include' }]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `http://localhost:8080/api/v1/mileage/applications/${id}/resubmit`);
      assert.equal(options.body.get('idempotencyKey'), id);
      assert.equal(options.body.get('submissionVersion'), detail.submissionVersion);
      assert.equal(options.body.has('receipt'), false);
      assert.equal(await options.body.get('meter').text(), 'replacement');
      assert.equal(options.headers['Content-Type'], undefined);
      assert.equal(options.headers.Authorization, session.token ? 'Bearer test' : undefined);
      assert.equal(options.credentials, session.credentials ?? 'omit');
      return Response.json(detail);
    };
    assert.deepEqual(await api.resubmitMileageApplication(id, input, session), detail);
  }
  globalThis.fetch = async () => Response.json(detail, { status: 201 });
  await assert.rejects(api.resubmitMileageApplication(id, input, {}), { code: 'INVALID_RESPONSE' });
  for (const submissionVersion of [undefined, '', 'A'.repeat(64), 'a'.repeat(63)]) {
    globalThis.fetch = async () => Response.json({ ...detail, submissionVersion });
    await assert.rejects(api.getMileageApplication(id, {}), { code: 'INVALID_RESPONSE' });
  }
  globalThis.fetch = async () => assert.fail('invalid submissions cannot be sent');
  await assert.rejects(api.resubmitMileageApplication(id, { ...input, meter: undefined }, {}), { code: 'PHOTO_REQUIRED' });
  await assert.rejects(api.resubmitMileageApplication(id, { ...input, submissionVersion: '' }, {}), { code: 'INVALID_SUBMISSION_VERSION' });
});


test('combined submission uploads only one file and reads its mode from the server', async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080';
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.body.get('photoMode'), 'single');
    assert.equal(options.body.get('meter'), null);
    assert.equal(await options.body.get('receipt').text(), 'combined');
    return Response.json({ ...detail, photoMode: 'single' }, { status: 201 });
  };
  const result = await api.createMileageApplication({ key: id, photoMode: 'single', receipt: { name: 'combined.jpg', file: new Blob(['combined']) } }, {});
  assert.equal(result.photoMode, 'single');
  globalThis.fetch = async () => Response.json({ ...detail, photoMode: 'invalid' });
  await assert.rejects(api.getMileageApplication(id, {}), { code: 'INVALID_RESPONSE' });
});
