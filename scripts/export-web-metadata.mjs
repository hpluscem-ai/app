import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { getWebMetadata, webPageNames } from '../constants/webMetadata.ts';

const output = process.argv[2] || 'dist';
const template = await readFile(join(output, 'index.html'), 'utf8');
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

for (const route of Object.keys(webPageNames)) {
  const { title, url } = getWebMetadata(route);
  let html = template;
  for (const [pattern, replacement] of [
    [/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`],
    [/<meta property="og:title"[^>]*\/>/, `<meta property="og:title" content="${escapeHtml(title)}" data-rh="true" />`],
    [/<meta property="og:url"[^>]*\/>/, `<meta property="og:url" content="${escapeHtml(url)}" data-rh="true" />`],
  ]) {
    if (!pattern.test(html)) throw new Error(`Missing metadata in exported HTML: ${pattern}`);
    html = html.replace(pattern, () => replacement);
  }
  // Draft legal pages keep the existing noindex policy before JavaScript runs too.
  if (['/term', '/privacy', '/collection', '/marketing'].includes(route)) {
    html = html.replace('</head>', '<meta name="robots" content="noindex, nofollow" data-rh="true" /></head>');
  }
  const file = join(output, route === '/' ? 'index.html' : `${route.slice(1)}.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}
console.log(`Exported OG metadata for ${Object.keys(webPageNames).length} routes.`);
