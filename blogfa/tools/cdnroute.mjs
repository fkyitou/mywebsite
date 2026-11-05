/* آینده‌نگار · offline CDN for the browser tests.
   The CDN templates ask jsDelivr (and its backups) for dist/cdn/ files. The container cannot reach those hosts, so
   the tests answer those requests from dist/cdn/ themselves, with the CORS header jsDelivr sends, which keeps the
   Subresource Integrity check in force. A scenario can make an address fail or send altered bytes:
     await routeCdn(context, { fail: (mirror, file) => mirror === 0 ? 'abort' : null, log })
   mirror is the address's place in the loader's list: 0 cdn.jsdelivr.net, 1 fastly, 2 gcore, 3 rawcdn.githack.com.
   A fail value is 'abort' (network error), '404', 'tamper' (one byte changed, so the integrity check fails) or null.
   delay: (mirror, file) => milliseconds holds an answer back, as a slow address would. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cdn');
export const CDN_URL = /^https:\/\/((cdn|fastly|gcore)\.jsdelivr\.net\/gh\/|rawcdn\.githack\.com\/)/;
const MIRROR = { 'cdn.jsdelivr.net': 0, 'fastly.jsdelivr.net': 1, 'gcore.jsdelivr.net': 2, 'rawcdn.githack.com': 3 };

export async function routeCdn(ctx, { fail = () => null, delay = () => 0, log = [] } = {}) {
  await ctx.route(CDN_URL, async route => {
    const u = new URL(route.request().url()), mirror = MIRROR[u.hostname], file = path.basename(u.pathname);
    const how = fail(mirror, file), wait = delay(mirror, file);
    log.push({ mirror, file, how: how || 'ok' });
    if (wait) await new Promise(r => setTimeout(r, wait));
    if (how === 'abort') return route.abort('failed');
    if (how === '404') return route.fulfill({ status: 404, body: 'not found', headers: { 'access-control-allow-origin': '*' } });
    const f = path.join(DIR, file);
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not in dist/cdn', headers: { 'access-control-allow-origin': '*' } });
    let body = fs.readFileSync(f);
    if (how === 'tamper') { body = Buffer.from(body); body[body.length - 2] ^= 1; }
    return route.fulfill({
      status: 200, body,
      headers: {
        'content-type': file.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8',
        'access-control-allow-origin': '*', 'cache-control': 'public, max-age=31536000, immutable'
      }
    });
  });
  return log;
}
