import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

test('legacy legal links redirect to the corresponding local document', () => {
  const html = readFileSync(new URL('../public/legal.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  for (const [hash, expected] of [
    ['#terms', '/term'],
    ['#privacy', '/privacy'],
    ['#collection', '/collection'],
    ['#marketing', '/marketing'],
    ['', '/term'],
    ['#unknown', '/term'],
    ['#__proto__', '/term'],
    ['#https://example.com', '/term'],
  ]) {
    const redirects = [];
    runInNewContext(script, {
      window: { location: { hash, replace: (path) => redirects.push(path) } },
    });
    assert.deepEqual(redirects, [expected], hash);
  }
});

test('native legal links stay in the app stack', () => {
  const link = readFileSync(
    new URL('../components/auth/LegalDocumentLink.tsx', import.meta.url),
    'utf8',
  );
  const layout = readFileSync(
    new URL('../app/_layout.tsx', import.meta.url),
    'utf8',
  );
  const publicRoutes = layout.slice(
    0,
    layout.indexOf("<Stack.Protected guard={state.status === 'signedOut'}>"),
  );

  assert.doesNotMatch(link, /EXPO_PUBLIC_SITE_URL|new URL\(|showAuthErrorAlert/);
  assert.match(link, /if \(Platform\.OS === 'web'\) \{[\s\S]*?target="_blank"/);
  assert.match(link, /<Link href=\{path as Href\} push style=\{linkStyle\}>/);
  assert.doesNotMatch(publicRoutes, /<Stack\.Protected guard=\{Platform\.OS === 'web'\}>/);

  for (const name of ['term', 'privacy', 'collection', 'marketing']) {
    assert.match(publicRoutes, new RegExp(`<Stack\\.Screen\\s+name="${name}"`));
  }
});
