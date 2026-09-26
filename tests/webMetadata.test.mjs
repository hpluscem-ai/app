import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { getWebMetadata, webPageNames } from '../constants/webMetadata.ts';

test('OG titles use page names and never include tokens or personal query data', () => {
  for (const path of ['/', '/mileage', '/mileage/']) {
    assert.equal(getWebMetadata(path).title, '하얀100');
  }
  assert.deepEqual(getWebMetadata('/reset-password/?token=private#fragment'), {
    title: '하얀100 | 비밀번호 재설정',
    url: 'https://www.hayan100.kr/reset-password',
  });
  assert.equal(getWebMetadata('/mileage/rejected?id=private').title, '하얀100 | 반려 · 사유보기');
  assert.deepEqual(getWebMetadata('/missing?token=private'), getWebMetadata('/'));
});

test('export supplies crawler-readable OG for every route without changing the app shell', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hayan100-og-test-'));
  try {
    const template = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
    await writeFile(join(directory, 'index.html'), template);
    execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/export-web-metadata.mjs', directory]);
    for (const route of Object.keys(webPageNames)) {
      const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
      const html = await readFile(join(directory, file), 'utf8');
      const {title, url} = getWebMetadata(route);
      assert.ok(html.includes(`<title>${title}</title>`));
      assert.ok(html.includes(`property="og:title" content="${title}"`));
      assert.ok(html.includes(`property="og:url" content="${url}"`));
      assert.equal((html.match(/property="og:title"/g) || []).length, 1);
      assert.ok(html.includes('property="og:description" content="지정된 소속 기사님을 위한 전용 서비스입니다. 주유소 조회, 마일리지 신청 및 처리 내역을 확인할 수 있습니다."'));
      assert.equal(html.slice(html.indexOf('<body>')), template.slice(template.indexOf('<body>')));
      assert.equal(html.includes('name="robots" content="noindex, nofollow"'), ['/term', '/privacy', '/collection', '/marketing'].includes(route));
    }
  } finally {
    await rm(directory, {recursive:true, force:true});
  }
});
