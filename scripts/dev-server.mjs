#!/usr/bin/env node
/*
 * Local preview server for perceptra-site.
 *
 * Runs the same build as Vercel (`npm run build` -> public/) and serves public/
 * with Vercel-like routing: cleanUrls (/en -> en.html, *.html -> 308 to the clean
 * URL), no trailing slash, custom 404.html. Rebuilds automatically when a source
 * file changes. No dependencies.
 *
 *   node scripts/dev-server.mjs [--port 4182] [--root <site dir>] [--no-build]
 */
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join, extname, resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const ROOT = resolve(opt('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const PORT = Number(opt('--port', process.env.PORT || 4182));
const BUILD = !args.includes('--no-build');
const PUBLIC = join(ROOT, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};

let lastBuild = 0;
let buildError = null;

async function newestSourceMtime() {
  let newest = 0;
  async function scan(dir, depth) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (['public', 'node_modules', '.git', 'scripts'].includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (depth < 3) await scan(p, depth + 1); continue; }
      newest = Math.max(newest, (await stat(p)).mtimeMs);
    }
  }
  await scan(ROOT, 0);
  return newest;
}

async function buildIfStale() {
  if (!BUILD) return;
  if ((await newestSourceMtime()) <= lastBuild) return;
  lastBuild = Date.now();
  try {
    execSync('npm run build --silent', { cwd: ROOT, stdio: 'pipe' });
    buildError = null;
    console.log(`[dev-server] rebuilt ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    buildError = String(err.stderr || err.message);
    console.error('[dev-server] build failed\n' + buildError);
  }
}

async function fileAt(p) {
  try {
    const s = await stat(p);
    return s.isFile() ? p : null;
  } catch {
    return null;
  }
}

async function send(res, status, file) {
  const body = await readFile(file);
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('.html')) await buildIfStale();

    if (path.length > 1 && path.endsWith('/')) {
      res.writeHead(308, { Location: path.slice(0, -1) + url.search });
      return res.end();
    }
    if (path.endsWith('.html')) {
      const clean = path === '/index.html' ? '/' : path.replace(/(\/index)?\.html$/, '');
      res.writeHead(308, { Location: clean + url.search });
      return res.end();
    }

    const target = normalize(join(PUBLIC, path));
    if (!target.startsWith(PUBLIC)) { res.writeHead(400); return res.end(); }

    if (!extname(path)) await buildIfStale();
    if (buildError) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Build failed:\n\n' + buildError);
    }

    const hit =
      (path === '/' && (await fileAt(join(PUBLIC, 'index.html')))) ||
      (await fileAt(target)) ||
      (await fileAt(target + '.html')) ||
      (await fileAt(join(target, 'index.html')));
    if (hit) return send(res, 200, hit);

    const notFound = await fileAt(join(PUBLIC, '404.html'));
    if (notFound) return send(res, 404, notFound);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404: NOT_FOUND');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(err.stack || err));
  }
}).listen(PORT, async () => {
  await buildIfStale();
  console.log(`[dev-server] ${ROOT} -> http://localhost:${PORT}`);
});
