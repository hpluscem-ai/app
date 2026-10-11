import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import { legalDocuments } from '../constants/legalDocuments.ts';

const source = ts.transpileModule(readFileSync(new URL('../components/LegalDocumentPage.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

for (const platform of ['ios', 'android', 'web']) {
  test(`${platform}: all legal documents render; crawler metadata stays web-only`, () => {
    const imports = {
      'react/jsx-runtime': jsxRuntime,
      'expo-router/head': { __esModule: true, default: ({ children }) => {
        assert.equal(platform, 'web', 'Native documents must not require Handoff metadata');
        return children;
      } },
      'react-native': {
        Platform: { OS: platform },
        StyleSheet: { create: (value) => value },
        View: ({ children }) => createElement('div', null, children),
        Text: ({ children }) => createElement('p', null, children),
      },
      '../constants/legalDocuments': { legalDocuments },
      '../constants/theme': { colors: {}, typography: {} },
      './AppScreen': { AppScreen: ({ children }) => createElement('main', null, children) },
    };
    const exports = {};
    new Function('require', 'exports', source)((name) => {
      assert.ok(name in imports, `Unexpected import ${name}`);
      return imports[name];
    }, exports);

    for (const [document, { title, blocks }] of Object.entries(legalDocuments)) {
      const html = renderToStaticMarkup(createElement(exports.LegalDocumentPage, { document }));
      assert.ok(html.includes(title));
      assert.ok(html.includes(blocks[0][1]));
      assert.equal(html.includes('name="robots" content="noindex, nofollow"'), platform === 'web');
    }
  });
}

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
