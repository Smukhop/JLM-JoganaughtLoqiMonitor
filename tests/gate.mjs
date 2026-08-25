/* ═══════════════════════════════════════════════════════════════════════════
   Deploy gate.

   The app carries its own BDD harness asserting against the live
   DOM and the live engine objects rather than mocks — and publishes the result
   to window.__LOQI_TEST__. This runner boots the page in headless Chromium with
   ?test=1, waits for that object, and exits non-zero on a single failure or a
   single uncaught page error.

   Run it before every deploy: `npm test`. It is wired as `predeploy`, so
   `npm run deploy` cannot ship a red build.
   ═══════════════════════════════════════════════════════════════════════════ */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.GATE_PORT || 4321);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    /* Refuse to serve outside the project root. */
    const abs = join(ROOT, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!abs.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    const s = await stat(abs).catch(() => null);
    if (!s || !s.isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(abs)] || 'application/octet-stream' });
    res.end(await readFile(abs));
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(PORT, '127.0.0.1', resolve);
});

const CHROME = process.env.CHROME_PATH || undefined;
const browser = await chromium.launch({
  ...(CHROME ? { executablePath: CHROME } : {}),
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox'
  ]
});

const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

/* A page error is a gate failure in its own right. The rAF scheduler catches
   per-task throws so the frame survives, which means a broken subsystem can run
   for hours without a visible symptom — exactly the DRAWM defect. Fail loudly. */
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e.message).slice(0, 240)));
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  /* Font/favicon fetches are not the app's contract. */
  if (/favicon|fonts\.(googleapis|gstatic)|ERR_TUNNEL|net::ERR_/.test(t)) return;
  pageErrors.push('console: ' + t.slice(0, 240));
});

let report;
try {
  await page.goto(`http://127.0.0.1:${PORT}/?test=1`, { waitUntil: 'domcontentloaded' });
  report = await page
    .waitForFunction(() => window.__LOQI_TEST__, null, { timeout: 240000 })
    .then(h => h.jsonValue());
} catch (e) {
  console.error('GATE — harness never reported:', String(e).slice(0, 300));
  await browser.close(); server.close();
  process.exit(1);
}

const failures = (report.groups || []).flatMap(g =>
  (g.failures || []).map(f => `${g.name} › ${typeof f === 'string' ? f : f.name}`)
);

const bar = '─'.repeat(66);
console.log(bar);
console.log(`LOQI OMNIVERSE · ${report.build}  v${report.version}`);
console.log(`${report.pass}/${report.total} passed · ${report.fail} failed · ${report.ms}ms`);
for (const g of report.groups || []) {
  const mark = g.fail ? '✕' : '·';
  console.log(`  ${mark} ${g.name.padEnd(30)} ${g.pass}/${g.pass + g.fail}`);
}
if (failures.length) {
  console.log(bar);
  failures.forEach(f => console.log('  FAIL  ' + f));
}
if (pageErrors.length) {
  console.log(bar);
  pageErrors.slice(0, 12).forEach(e => console.log('  ERROR ' + e));
}
console.log(bar);

await browser.close();
server.close();

const red = report.fail > 0 || pageErrors.length > 0;
console.log(red ? 'GATE: RED — deploy blocked' : 'GATE: GREEN — safe to deploy');
process.exit(red ? 1 : 0);
