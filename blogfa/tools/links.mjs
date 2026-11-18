/* ==========================================================================
   آینده‌نگار · links — broken-link test.
   Internal: every link of every preview page, read from the live page after its scripts ran (the table of
   contents, cards, search and footer are built by JS). A link must lead to a preview file that exists, to an
   anchor that exists on its page, or to a Blogfa address of a known shape whose target exists (a post id,
   a category id, the archive, the about page, a comments page of an existing post).
   External: every http(s) address, fetched with curl (HEAD, then GET when HEAD is refused). 404/410 count as
   broken; 401/403/429 mean the site turned away an automated check and are listed, not counted as broken; no
   answer at all means this machine could not reach the site (for example a network that only allows some
   hosts) and is listed as "not checked".

   node tools/links.mjs              internal only
   node tools/links.mjs --external   internal + external     → quality/links.json, exit 1 on a broken link
   ========================================================================== */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = path.join(ROOT, 'preview');
const EXTERNAL = process.argv.includes('--external');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '', 'playwright'))); }

const files = fs.readdirSync(PREVIEW).filter(f => f.endsWith('.html')).sort();
const posts = new Set(files.filter(f => /^post-\d+\.html$/.test(f)).map(f => f.match(/\d+/)[0]));
const cats = new Set(files.filter(f => /^cat-\d+\.html$/.test(f)).map(f => f.match(/\d+/)[0]));
const ids = new Map(); // file → Set of ids (filled from the live pages)
const links = []; // { from, href }

const browser = await chromium.launch();
for (const f of files) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(PREVIEW, f), { waitUntil: 'load' });
  await page.waitForTimeout(f === 'index.html' ? 900 : 350);
  const r = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('[id], a[name]')].map(e => e.id || e.getAttribute('name')),
    hrefs: [...document.querySelectorAll('a[href], link[href], img[src], iframe[src], script[src]')].map(e => e.getAttribute('href') || e.getAttribute('src'))
  }));
  ids.set(f, new Set(r.ids));
  for (const h of r.hrefs) links.push({ from: f, href: h });
  await ctx.close();
}
await browser.close();

/* ---------- internal ---------- */
const broken = [], external = new Map(); let internal = 0;
const blogfa = (h) => { // Blogfa-shaped absolute paths, as the live blog will have them
  let m;
  if ((m = /^\/post\/(\d+)\/?$/.exec(h))) return posts.has(m[1]) || 'no post ' + m[1];
  if ((m = /^\/category\/(\d+)\/?$/.exec(h))) return cats.has(m[1]) || 'no category ' + m[1];
  if ((m = /^\/comments\/\?.*postid=(\d+)/.exec(h))) return posts.has(m[1]) || 'comments for missing post ' + m[1];
  if (/^\/(archive|posts\/?|page\/about|rss|tag\/[^/]+|\d{4}\/\d{2})\/?$/.test(h)) return true;
  // the header link to the business-model page the owner has yet to make; core.js hides it while
  // /page/bmc answers 404 (behaviour.mjs tests that), so it is never a dead link for a reader
  if (/^\/page\/bmc\/?$/.test(h)) return true;
  return 'unknown Blogfa path';
};
for (const { from, href } of links) {
  if (!href || /^(data:|mailto:|tel:|javascript:)/i.test(href)) continue;
  if (/^https?:\/\//i.test(href)) { if (!external.has(href)) external.set(href, new Set()); external.get(href).add(from); continue; }
  if (href === '#rss') continue; // the preview's stand-in for Blogfa's RSS address
  internal++;
  // links the scripts build from a.href arrive resolved (file:///…/preview/cat-4.html); on Blogfa they are the blog's own addresses
  if (/^file:\/\//i.test(href)) {
    const u = new URL(href), p = decodeURIComponent(u.pathname), hash = decodeURIComponent(u.hash.slice(1));
    const rel = path.relative(PREVIEW, p);
    if (rel.startsWith('..') || !fs.existsSync(p)) { broken.push({ from, href, why: 'file not found' }); continue; }
    if (hash && ids.has(rel) && !ids.get(rel).has(hash)) broken.push({ from, href, why: 'anchor not found on ' + rel });
    continue;
  }
  if (href.startsWith('#')) { const id = decodeURIComponent(href.slice(1)); if (id && !ids.get(from).has(id)) broken.push({ from, href, why: 'no element with this id on the page' }); continue; }
  if (href.startsWith('/')) { const ok = blogfa(href); if (ok !== true) broken.push({ from, href, why: ok }); continue; }
  const [file, hash] = href.split('#'), target = decodeURIComponent(file.split('?')[0]);
  if (!fs.existsSync(path.join(PREVIEW, target))) { broken.push({ from, href, why: 'file not found' }); continue; }
  if (hash && ids.has(target) && !ids.get(target).has(decodeURIComponent(hash))) broken.push({ from, href, why: 'anchor not found on ' + target });
}

/* ---------- external ---------- */
const ext = [];
if (EXTERNAL) {
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 link-check';
  const probe = (u, head) => { try { return execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-L', '--max-time', '25', '-A', UA, ...(head ? ['-I'] : []), u], { encoding: 'utf8' }).trim(); } catch (e) { return (e.stdout || '').toString().trim() || '000'; } };
  for (const [u, from] of external) {
    let code = probe(u, true);
    if (!/^[23]/.test(code)) code = probe(u, false);
    const status = /^[23]/.test(code) ? 'ok' : /^(404|410)$/.test(code) ? 'broken' : /^(401|403|405|429|503)$/.test(code) ? 'refused automated check' : code === '000' ? 'not checked (no network route)' : 'error';
    ext.push({ url: u, code, status, pages: [...from].slice(0, 3) });
    if (status === 'broken' || status === 'error') broken.push({ from: [...from][0], href: u, why: 'HTTP ' + code });
  }
}

const out = { generated: new Date().toISOString(), pages: files.length, internalLinks: internal, externalLinks: external.size, externalChecked: EXTERNAL, broken, external: ext };
fs.mkdirSync(path.join(ROOT, 'quality'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'quality/links.json'), JSON.stringify(out, null, 1));
console.log(`${files.length} pages · ${internal} internal links checked · ${external.size} distinct external addresses${EXTERNAL ? '' : ' (not fetched; add --external)'}`);
if (EXTERNAL) { const by = {}; ext.forEach(e => { by[e.status] = (by[e.status] || 0) + 1; }); console.log('external:', JSON.stringify(by)); }
for (const b of broken.slice(0, 40)) console.log(`  ✗ ${b.from} → ${b.href}  (${b.why})`);
console.log(broken.length ? `\n${broken.length} broken link(s)` : '\nno broken links');
process.exit(broken.length ? 1 : 0);
