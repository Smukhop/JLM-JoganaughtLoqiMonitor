import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4200);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' }).end();
      return;
    }
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const abs = join(ROOT, normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!abs.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const info = await stat(abs).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    const body = await readFile(abs);
    res.writeHead(200, {
      'content-type': MIME[extname(abs)] || 'application/octet-stream',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    res.writeHead(500).end(String(error));
  }
});

server.once('error', error => {
  console.error(`Loqi local server failed: ${error.message}`);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`Loqi Omniverse is running at http://${HOST}:${PORT}`);
});
