import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createQaServer, renderQa } from '../scripts/qa.mjs';

const documents = {
  user: await readFile(new URL('../docs/user-auth-qa.md', import.meta.url), 'utf8'),
  admin: await readFile(new URL('../docs/admin-qa.md', import.meta.url), 'utf8'),
};
const counts = { user: 263, admin: 232 };
const pages = Object.fromEntries(Object.entries(documents).map(([audience, markdown]) => [audience, renderQa(markdown, audience)]));

test('Both checklists render all cases in order, cover all pages, and exclude connection outage cases', () => {
  for (const audience of ['user', 'admin']) {
    const markdown = documents[audience];
    const html = pages[audience];
    const sourceIds = [...markdown.matchAll(/^\| 미실행 \| ([A-Z]+-\d{2,3}) \|/gm)].map((match) => match[1]);
    const renderedIds = [...html.matchAll(/data-qa-id="([A-Z]+-\d{2,3})"/g)].map((match) => match[1]);
    assert.equal(sourceIds.length, counts[audience]);
    assert.deepEqual(renderedIds, sourceIds);
    assert.equal(new Set(sourceIds).size, sourceIds.length);
    assert.doesNotMatch(html, /type="checkbox"[^>]*\bchecked\b/);
    assert.doesNotMatch(markdown, /^\| 미실행 \|.*(?:offline|오프라인|요청 차단|서버 중지|No throttling)/im);
    assert.ok(html.includes('href="/qa/' + audience + '" aria-current="page"'));
    assert.match(html, /최종 배포 전 QA 제거/);
    assert.match(html, /연동 후/);
  }
  const userSections = [...documents.user.matchAll(/^## \d+\. ([^—]+) —/gm)].map((match) => match[1].trim());
  assert.deepEqual(userSections.slice(0, 8), [
    '회원가입', '로그인', '로그아웃', '이메일 찾기', '비밀번호 찾기', '비밀번호 재설정', '정보 수정', '회원탈퇴',
  ]);
  for (const route of ['/map', '/mileage', '/mileage/apply', '/mileage/pending', '/mileage/rejected', '/term', '/privacy', '/collection', '/marketing']) {
    assert.ok(documents.user.includes('— ' + route), route);
  }
  for (const route of ['/login', '/dashboard', '/drivers', '/infrastructure', '/infrastructure/new', '/infrastructure/edit/:id',
    '/receipts', '/settlements', '/settlements/new', '/settlements/edit/:id', '/erd']) {
    assert.ok(documents.admin.includes('— ' + route), route);
  }
  const malicious = renderQa(documents.user + '\n<img src=x onerror=alert(1)> [unsafe](javascript:alert(1))');
  assert.match(malicious, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(malicious, /href="javascript:/);
  assert.throws(() => renderQa(documents.user.replace('SU-02', 'SU-01')), /ID/);
  assert.throws(() => renderQa(documents.user, '__proto__'), /QA/);
  assert.throws(() => renderQa('| 결과 | ID | 절차 | 결과 |\n|---|---|---|---|\n| 미실행 | C-01 | 누락 |'), /표 형식/);
});

test('Checks are isolated by audience, persist across tabs, and roll back failed writes', () => {
  const stored = new Map([['hpluseco:developer-qa:C-01', '1']]);
  let failWrites = false;
  let failReads = false;
  const storage = {
    getItem(key) { if (failReads) throw new Error('Storage blocked'); return stored.get(key) ?? null; },
    setItem(key, value) { if (failWrites) throw new Error('Storage blocked'); stored.set(key, value); },
    removeItem(key) { if (failWrites) throw new Error('Storage blocked'); stored.delete(key); },
  };
  function loadPage(audience = 'user') {
    const alerts = [];
    const events = {};
    // Deliberately reuse IDs across audiences to exercise storage isolation.
    const inputs = ['C-01', 'SU-01'].map((id) => {
      const input = { dataset: { qaId: id }, checked: false, completed: false };
      input.closest = () => ({ classList: { toggle: (_name, checked) => { input.completed = checked; } } });
      input.addEventListener = (_name, callback) => { input.change = callback; };
      return input;
    });
    runInNewContext(pages[audience].match(/<script>([\s\S]+)<\/script>/)[1], {
      document: { querySelectorAll: () => inputs },
      window: { localStorage: storage, alert: (message) => alerts.push(message), addEventListener: (name, callback) => { events[name] = callback; } },
    });
    return { inputs, alerts, events };
  }
  const first = loadPage();
  assert.equal(first.inputs[0].checked, false, 'Old account-only passes must not apply to revised cases');
  first.inputs[0].checked = true;
  first.inputs[0].change();
  assert.equal(first.inputs[0].completed, true);
  const reloaded = loadPage();
  const admin = loadPage('admin');
  assert.equal(reloaded.inputs[0].checked, true);
  assert.equal(admin.inputs[0].checked, false);
  admin.inputs[0].checked = true;
  admin.inputs[0].change();
  reloaded.inputs[1].checked = true;
  reloaded.inputs[1].change();
  first.events.storage({ key: 'hpluseco:developer-qa:v2:user:SU-01' });
  assert.equal(first.inputs[1].completed, true);
  admin.events.storage({ key: 'hpluseco:developer-qa:v2:user:SU-01' });
  assert.equal(admin.inputs[1].completed, false);
  first.inputs[0].checked = false;
  first.inputs[0].change();
  assert.equal(loadPage().inputs[0].completed, false);
  assert.equal(loadPage('admin').inputs[0].completed, true);
  reloaded.events.pageshow({ persisted: true });
  assert.equal(reloaded.inputs[0].checked, false);
  failWrites = true;
  reloaded.inputs[1].checked = false;
  reloaded.inputs[1].change();
  assert.equal(reloaded.inputs[1].checked, true);
  assert.equal(reloaded.inputs[1].completed, true);
  assert.equal(reloaded.alerts.length, 1);
  failReads = true;
  assert.equal(loadPage().alerts.length, 1);
});

test('QA routing serves separate documents, redirects old entry points, and restricts access', async () => {
  const server = createQaServer();
  const respond = (overrides = {}) => new Promise((resolve) => {
    const result = { status: 200, headers: {} };
    const response = {
      setHeader(name, value) { result.headers[name] = value; },
      writeHead(status, headers = {}) { result.status = status; Object.assign(result.headers, headers); return this; },
      end(body) { result.body = body; resolve(result); },
    };
    server.emit('request', {
      method: 'GET', url: '/qa/user', headers: { host: '127.0.0.1:4001' },
      socket: { localAddress: '127.0.0.1', localPort: 4001 }, ...overrides,
    }, response);
  });
  for (const audience of ['user', 'admin']) {
    const page = await respond({ url: '/qa/' + audience });
    assert.equal(page.status, 200);
    assert.equal(page.headers['Cache-Control'], 'no-store');
    assert.equal(page.body.match(/<input\b[^>]*type="checkbox"/g).length, counts[audience]);
    assert.match(page.body, audience === 'user' ? /<h1>유저 QA<\/h1>/ : /<h1>어드민 QA<\/h1>/);
    assert.equal((await respond({ method: 'HEAD', url: '/qa/' + audience })).body, undefined);
    assert.equal((await respond({ url: '/qa/' + audience + '/' })).status, 200);
  }
  for (const url of ['/', '/qa', '/qa/']) {
    const redirect = await respond({ url });
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.Location, '/qa/user');
  }
  for (const url of ['/.env', '/qa/other', '/qa/__proto__', '/docs/admin-qa.md', '/qa/../../.env']) {
    assert.equal((await respond({ url })).status, 404);
  }
  assert.equal((await respond({ method: 'POST' })).status, 405);
  assert.equal((await respond({ headers: { host: 'outside.example' } })).status, 403);
  assert.equal((await respond({ socket: { localAddress: '192.0.2.1', localPort: 4001 } })).status, 403);
});

test('The loopback server exposes both QA pages without exposing other files or mutations', async (t) => {
  const server = createQaServer().listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, 'listening');
  const { address, port } = server.address();
  assert.equal(address, '127.0.0.1');
  const url = 'http://127.0.0.1:' + port;
  const root = await fetch(url, { redirect: 'manual' });
  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), '/qa/user');
  for (const audience of ['user', 'admin']) {
    const page = await fetch(url + '/qa/' + audience);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('cache-control'), 'no-store');
    assert.equal((await page.text()).match(/<input\b[^>]*type="checkbox"/g).length, counts[audience]);
    const head = await fetch(url + '/qa/' + audience, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  }
  assert.equal((await fetch(url + '/.env')).status, 404);
  assert.equal((await fetch(url + '/qa/user', { method: 'POST' })).status, 405);
  const foreignHostStatus = await new Promise((resolve, reject) => {
    const req = request(url, { headers: { Host: 'outside.example' } }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
  assert.equal(foreignHostStatus, 403);
});
