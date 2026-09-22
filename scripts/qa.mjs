import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const pages = {
  user: { title: '유저 QA', documentUrl: new URL('../docs/user-auth-qa.md', import.meta.url) },
  admin: { title: '어드민 QA', documentUrl: new URL('../docs/admin-qa.md', import.meta.url) },
};
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

// Only the headings, tables, lists and inline markup used by the QA document.
function inline(text) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part) => {
    if (part.startsWith('`') && part.endsWith('`')) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    if (part.startsWith('**') && part.endsWith('**')) return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if (link) return `<a href="${escapeHtml(link[2])}" target="_blank" rel="noopener noreferrer">${escapeHtml(link[1])}</a>`;
    return escapeHtml(part);
  }).join('');
}

function initializeChecklist(audience) {
  // Revised cases must not inherit passes from the old account-only checklist.
  const prefix = `hpluseco:developer-qa:v2:${audience}:`;
  const inputs = [...document.querySelectorAll('input[data-qa-id]')];
  const reflect = (input) => input.closest('tr').classList.toggle('completed', input.checked);
  const restore = () => {
    try {
      for (const input of inputs) {
        input.checked = window.localStorage.getItem(prefix + input.dataset.qaId) === '1';
        reflect(input);
      }
    } catch {
      window.alert('저장된 QA 체크 결과를 읽지 못했습니다. 브라우저의 저장소 설정을 확인한 뒤 새로고침해 주세요.');
    }
  };
  restore();
  for (const input of inputs) {
    input.addEventListener('change', () => {
      try {
        if (input.checked) window.localStorage.setItem(prefix + input.dataset.qaId, '1');
        else window.localStorage.removeItem(prefix + input.dataset.qaId);
      } catch {
        input.checked = !input.checked;
        window.alert('체크 결과를 저장하지 못해 이전 상태로 되돌렸습니다. 브라우저의 저장소 설정을 확인해 주세요.');
      }
      reflect(input);
    });
  }
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key.startsWith(prefix)) restore();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) restore();
  });
}

export function renderQa(markdown, audience = 'user') {
  if (!Object.hasOwn(pages, audience)) throw new Error('알 수 없는 QA 구분입니다.');
  const { title } = pages[audience];
  const lines = markdown.split(/\r?\n/);
  const content = [];
  const ids = new Set();
  let section = '';
  let sectionCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('# ')) continue;
    if (line.startsWith('## ')) {
      if (section) content.push('</section>');
      section = line.slice(3);
      content.push(`<section aria-labelledby="section-${++sectionCount}"><h2 id="section-${sectionCount}">${inline(section)}</h2>`);
    } else if (line.startsWith('|')) {
      const rows = [];
      do {
        rows.push(lines[i].trim().slice(1, -1).split('|').map((cell) => cell.trim()));
        i++;
      } while (i < lines.length && lines[i].trim().startsWith('|'));
      i--;
      // Completion lives in the checklist, not the document's duplicate manual summary.
      if (section === '결과 기록') continue;
      const [headers, separator, ...body] = rows;
      if (!separator?.every((cell) => /^:?-+:?$/.test(cell)) || body.some((row) => row.length !== headers.length)) {
        throw new Error('QA 문서의 표 형식을 확인해 주세요.');
      }
      const isQa = headers[0] === '결과' && headers[1] === 'ID';
      const titles = isQa ? ['완료', 'ID', '실행 절차', '예상 결과'] : headers;
      const renderedRows = body.map((cells) => {
        if (!isQa) return `<tr>${cells.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`;
        const id = cells[1];
        if (!/^[A-Z]+-\d{2,3}$/.test(id) || ids.has(id)) throw new Error('QA 사례 ID가 잘못되었거나 중복됩니다.');
        ids.add(id);
        const kind = cells.length === 5 ? `<small>${inline(cells[2])}</small>` : '';
        return `<tr><td><input type="checkbox" data-qa-id="${id}" aria-label="${id} 완료"></td><th scope="row">${id}${kind}</th><td>${inline(cells.at(-2))}</td><td>${inline(cells.at(-1))}</td></tr>`;
      });
      content.push(`<div class="table-wrap"><table${isQa ? ' class="qa-table"' : ''}><thead><tr>${titles.map((title) => `<th scope="col">${inline(title)}</th>`).join('')}</tr></thead><tbody>${renderedRows.join('')}</tbody></table></div>`);
    } else if (line.startsWith('- ')) {
      const items = [];
      do {
        items.push(`<li>${inline(lines[i].trim().slice(2))}</li>`);
        i++;
      } while (i < lines.length && lines[i].trim().startsWith('- '));
      i--;
      content.push(`<ul>${items.join('')}</ul>`);
    } else {
      const paragraph = line.replace('직접 확인한 뒤 `통과 / 실패 / 보류`로 바꾼다.', '실제로 통과한 항목만 체크한다. 실패·보류는 체크하지 않고 별도로 기록한다.');
      content.push(`<p>${inline(paragraph)}</p>`);
    }
  }
  if (section) content.push('</section>');
  if (ids.size === 0) throw new Error('QA 사례를 찾지 못했습니다.');
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title} · 개발자 QA</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; color: #262c3a; background: #fff; font: 16px/1.6 system-ui, sans-serif; }
    main { display: flex; flex-direction: column; gap: 20px; padding: 28px; }
    nav { display: flex; gap: 20px; }
    section { display: flex; flex-direction: column; gap: 16px; }
    h1, h2, p, ul { margin: 0; }
    h1 { font-size: 24px; }
    h2 { margin-top: 12px; font-size: 20px; }
    li + li { margin-top: 8px; }
    a { color: inherit; text-decoration: none; }
    code { font: inherit; overflow-wrap: anywhere; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; border: 1px solid #e9ecf2; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
    thead { background: #f6f7fa; }
    .qa-table { table-layout: fixed; }
    .qa-table th:first-child { width: 44px; }
    .qa-table th:nth-child(2) { width: 76px; }
    .qa-table td:first-child { text-align: center; }
    .qa-table tbody th { font-weight: 400; }
    small { display: block; font-size: 14px; }
    input[type="checkbox"] { width: 18px; height: 18px; margin: 3px 0 0; }
    tr.completed > :not(:first-child), tr.completed small { text-decoration: line-through; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <nav aria-label="QA 구분">
      <a href="/qa/user"${audience === 'user' ? ' aria-current="page"' : ''}>유저 QA</a>
      <a href="/qa/admin"${audience === 'admin' ? ' aria-current="page"' : ''}>어드민 QA</a>
    </nav>
    <p>완료한 항목을 체크하면 취소선이 표시됩니다. 체크 결과는 현재 브라우저에 저장되며, 체크를 해제하면 원래 표시로 돌아갑니다.</p>
    <noscript>체크 결과 저장에는 JavaScript가 필요합니다.</noscript>
    ${content.join('\n')}
  </main>
  <script>${initializeChecklist.toString()}; initializeChecklist('${audience}');</script>
</body>
</html>`;
}

export function createQaServer() {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const address = request.socket.localAddress;
    const expectedHost = `127.0.0.1:${request.socket.localPort}`;
    if (address !== '127.0.0.1' || request.headers.host !== expectedHost) {
      response.writeHead(403).end('Local access only');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    if (request.url === '/' || request.url === '/qa' || request.url === '/qa/') {
      response.writeHead(302, { Location: '/qa/user' }).end();
      return;
    }
    const audience = /^\/qa\/(user|admin)\/?$/.exec(request.url)?.[1];
    if (!audience) {
      response.writeHead(404).end();
      return;
    }
    try {
      const html = renderQa(await readFile(pages[audience].documentUrl, 'utf8'), audience);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : html);
    } catch (error) {
      console.error(error.message);
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('QA 문서를 읽지 못했습니다. 실행 터미널의 오류를 확인해 주세요.');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createQaServer();
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? 'QA 포트 4001이 사용 중입니다. 기존 실행을 확인해 주세요.' : error.message);
    process.exitCode = 1;
  });
  server.listen(4001, '127.0.0.1', () => console.log('유저 QA: http://127.0.0.1:4001/qa/user\n어드민 QA: http://127.0.0.1:4001/qa/admin\n종료: Ctrl+C'));
}
