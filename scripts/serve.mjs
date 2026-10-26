// Local preview server that mimics Netlify: pretty URLs (/projects -> projects.html)
// and the /projects/:slug -> project.html rewrite from netlify.toml.
// Usage: npm run dev   then open http://localhost:8080

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../site');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function resolve(urlPath) {
  if (/^\/projects\/[^/]+\/?$/.test(urlPath)) return 'project.html';
  if (urlPath.endsWith('/')) return urlPath + 'index.html';
  if (!path.extname(urlPath)) return urlPath + '.html';
  return urlPath;
}

http
  .createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(SITE, path.normalize(resolve(urlPath)));
    if (!file.startsWith(SITE)) return res.writeHead(403).end();
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      const notFound = await fs.readFile(path.join(SITE, '404.html')).catch(() => 'Not found');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(notFound);
    }
  })
  .listen(PORT, () => console.log(`Preview: http://localhost:${PORT}`));
