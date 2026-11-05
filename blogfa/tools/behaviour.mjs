/* ==========================================================================
   آینده‌نگار · behaviour — what the live blog showed on 2026-11-05, checked on the preview served over HTTP.
   1. «همه‌ی مقاله‌ها» (archive page) reads Blogfa's own /posts/ list and shows every article in the blog's design;
      opened from disk, where it cannot read the list, it keeps the link to Blogfa's plain list.
   2. Blogfa leaves <-PostCategory-> unfilled: every post still shows its category, taken from the categories
      block, and a category page is titled with its category.
   3. The time Blogfa writes in Latin digits is shown in Persian digits.
   4. The realm menu lists the categories on the archive and About pages too (Blogfa fills BlogCategories only
      in the main template).
   5. Blogfa's fixed ad bar: the page keeps room under its footer and lifts the back-to-top button above it,
      and the ad itself stays as Blogfa shows it.

   node tools/behaviour.mjs          → preview/,     quality/behaviour-results.json, exit 1 on any failure
   node tools/behaviour.mjs --cdn    → preview-cdn/ (CDN addresses answered from dist/cdn/), quality/behaviour-cdn-results.json
   ========================================================================== */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { routeCdn } from './cdnroute.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CDN = process.argv.includes('--cdn');
// --preview=<folder> tests another preview folder (default preview/, or preview-cdn/ with --cdn)
const PV = (process.argv.find(a => a.startsWith('--preview=')) || '').slice(10);
const PREVIEW = path.resolve(ROOT, PV || (CDN ? 'preview-cdn' : 'preview'));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '', 'playwright'))); }

const results = []; let failed = 0;
const ok = (group, name, pass, info = '') => { results.push({ group, name, pass, info }); if (!pass) failed++; console.log(`${pass ? '✓' : '✗'} [${group}] ${name}${info ? '  — ' + info : ''}`); };
const posts = fs.readdirSync(PREVIEW).filter(f => /^post-\d+\.html$/.test(f)).length;
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

// a plain static server on 127.0.0.1, only for this test: a page opened from disk cannot fetch another file
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };
// Blogfa's page editor turned each line break of the pasted About page into <br>, each blank line into two empty
// paragraphs, and added <br>&nbsp;<p></p> at the end (live About page, 2026-11-05). page-about-live.html is the
// preview's About page with its body changed the same way.
const editorize = body => body.replace(/^\s+|\s+$/g, '').replace(/\n[ \t]*\n\s*/g, '<p></p><p></p>').replace(/\n/g, '<br>') + '<br>&nbsp;<p></p>';
const LIVE_ABOUT = 'page-about-live.html';
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  if (rel === LIVE_ABOUT) {
    const html = fs.readFileSync(path.join(PREVIEW, 'page-about.html'), 'utf8').replace(/(<div class="an-post-body">)([\s\S]*?)(<\/div>\s*<\/article>)/, (m, a, b, c) => a + editorize(b) + c);
    res.writeHead(200, { 'Content-Type': TYPES['.html'] }); res.end(html); return;
  }
  const file = path.join(PREVIEW, rel);
  if (!file.startsWith(PREVIEW + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
async function open(url, viewport = { width: 1366, height: 900 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'fa-IR' });
  if (CDN) await routeCdn(ctx);
  const page = await ctx.newPage(), errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.AN && window.AN.ok, null, { timeout: 15000 }).catch(() => {});
  return { ctx, page, errors };
}

/* ---------- 1. all articles on the archive page ---------- */
{
  const { ctx, page, errors } = await open(BASE + 'archive.html');
  await page.waitForFunction(() => document.querySelectorAll('#an-all-list li').length > 0 || document.querySelector('.an-all-fail'), null, { timeout: 15000 }).catch(() => {});
  const a = await page.evaluate(() => {
    const items = [...document.querySelectorAll('#an-all-list li a')];
    return {
      n: items.length, ids: items.map(x => +((/post-(\d+)\.html/.exec(x.getAttribute('href')) || [])[1] || 0)),
      titled: items.filter(x => x.querySelector('.an-all-t') && x.querySelector('.an-all-t').textContent.trim()).length,
      topics: items.filter(x => x.querySelector('.an-all-c')).length, dates: items.filter(x => x.querySelector('.an-all-d')).length,
      waitHidden: document.getElementById('an-all-wait').hidden, sub: document.getElementById('an-all-sub').textContent,
      idx: window.AN && window.AN._idx ? window.AN._idx.length : 0, months: document.querySelectorAll('#an-timeline li a').length
    };
  });
  ok('archive', `lists every article (${posts})`, a.n === posts && a.titled === posts, `${a.n} items, ${a.titled} with titles`);
  ok('archive', 'newest first, each linking to its post', a.ids.every((x, i) => x > 0 && (i === 0 || x < a.ids[i - 1])), a.ids.join(' '));
  ok('archive', 'every item shows its topic and date', a.topics === posts && a.dates === posts, `${a.topics} topics, ${a.dates} dates`);
  ok('archive', 'the waiting note is gone and the count is shown', a.waitHidden && a.sub.includes(fa(posts) + ' روایت'), a.sub);
  ok('archive', 'search on this page knows the articles', a.idx === posts, `${a.idx} in the search index`);
  ok('archive', 'the month archive is still there', a.months >= 1, `${a.months} month link(s)`);
  ok('archive', 'no console error', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}
{
  const { ctx, page, errors } = await open(pathToFileURL(path.join(PREVIEW, 'archive.html')).href);
  const f = await page.evaluate(() => { const w = document.getElementById('an-all-wait'), l = w && w.querySelector('a'); return { shown: !!w && !w.hidden && w.classList.contains('an-all-fail'), href: l ? l.getAttribute('href') : '' }; });
  ok('archive', 'opened from disk: keeps the link to the plain list', f.shown && /posts(\.html|\/)$/.test(f.href), f.href);
  ok('archive', 'opened from disk: no console error', errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---------- 2 and 3. categories and time on posts ---------- */
for (const f of ['index.html', 'post-1.html', 'cat-1.html']) {
  const { ctx, page, errors } = await open(BASE + f);
  const c = await page.evaluate(() => {
    const arts = [...document.querySelectorAll('article.an-post')];
    return {
      n: arts.length,
      cats: arts.filter(a => { const c = a.querySelector('.an-post-cats a'); return c && a.getAttribute('data-cat') === c.textContent.trim(); }).length,
      chips: [...document.querySelectorAll('.an-cat')].filter(x => x.textContent.trim() && !x.hidden).length,
      raw: /<-\w+->/.test(document.body.innerHTML.replace(/<script[\s\S]*?<\/script>/g, '')),
      latin: [...document.querySelectorAll('.an-post-by')].filter(b => /[0-9]/.test(b.textContent)).length,
      title: (document.querySelector('.an-page-title') || {}).textContent || '',
      firstCat: ((document.querySelector('article.an-post .an-post-cats a') || {}).textContent || '').trim()
    };
  });
  ok('posts', `${f}: every post carries its category`, c.n > 0 && c.cats === c.n, `${c.cats} of ${c.n}`);
  ok('posts', `${f}: no Blogfa tag shows as raw text`, !c.raw);
  ok('posts', `${f}: the time is in Persian digits`, c.latin === 0, `${c.latin} with Latin digits`);
  if (f === 'cat-1.html') ok('posts', 'category page is titled with its category', !!c.firstCat && c.title.trim() === c.firstCat, `«${c.title.trim()}»`);
  if (f === 'post-1.html') {
    const chip = await page.evaluate(() => { const b = document.querySelector('.an-banner .an-chip[href]'); return b ? { t: b.textContent.trim(), h: b.getAttribute('href') } : null; });
    ok('posts', 'post banner links to its category', !!chip && !!chip.t && /cat-\d+\.html|\/category\/\d+/.test(chip.h), chip ? `«${chip.t}» → ${chip.h}` : 'no chip');
  }
  ok('posts', `${f}: no console error`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

/* ---------- 4. realm menu on the archive and About pages ---------- */
for (const f of ['archive.html', 'page-about.html']) {
  const { ctx, page } = await open(BASE + f);
  await page.click('#an-dd .an-dd-btn').catch(() => {});
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => [...document.querySelectorAll('#an-dd-menu a')].map(a => ({ t: a.textContent.trim(), h: a.getAttribute('href') })));
  ok('menu', `${f}: the realm menu lists the categories`, m.length >= 7 && m.every(x => x.t && /cat-\d+\.html|\/category\/\d+/.test(x.h)), `${m.length} links`);
  await ctx.close();
}

/* ---------- 5. room for the ad bar ---------- */
const AD = 'position: fixed; bottom: 0px; left: 0px; right: 0px; width: 728px; text-align: center; margin: 0px auto; padding: 0px; max-width: 100%; z-index: 9999;';
for (const [name, vp] of [['desktop', { width: 1366, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const { ctx, page } = await open(BASE + 'index.html', vp);
  await page.evaluate(st => { const d = document.createElement('div'); d.id = '46471336'; d.setAttribute('style', st); d.innerHTML = '<a href="#">×</a><div style="height:90px;background:#fc0"></div>'; document.body.insertBefore(d, document.body.firstChild); }, AD);
  await page.waitForTimeout(1800);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.documentElement.scrollHeight); });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const ad = document.getElementById('46471336'), adTop = ad.getBoundingClientRect().top, cs = getComputedStyle(ad);
    const foot = document.querySelector('#an-foot'), fab = document.querySelector('.an-fab');
    return {
      room: getComputedStyle(document.documentElement).getPropertyValue('--an-ad').trim(), adH: Math.round(ad.getBoundingClientRect().height),
      footBottom: Math.round(foot.getBoundingClientRect().bottom), adTop: Math.round(adTop),
      adShown: cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0',
      fab: fab ? { bottom: Math.round(fab.getBoundingClientRect().bottom), left: Math.round(fab.getBoundingClientRect().left), right: Math.round(fab.getBoundingClientRect().right) } : null,
      adBox: { left: Math.round(ad.getBoundingClientRect().left), right: Math.round(ad.getBoundingClientRect().right) }
    };
  });
  ok('ad', `${name}: the page measures the ad bar`, r.room === r.adH + 'px', `--an-ad ${r.room}, bar ${r.adH}px`);
  ok('ad', `${name}: the footer ends above the ad bar`, r.footBottom <= r.adTop + 1, `footer bottom ${r.footBottom}, bar top ${r.adTop}`);
  const overlaps = r.fab && r.fab.right > r.adBox.left && r.fab.left < r.adBox.right;
  ok('ad', `${name}: back-to-top button clear of the ad bar`, !r.fab || !overlaps || r.fab.bottom <= r.adTop + 1, r.fab ? `button bottom ${r.fab.bottom}, bar top ${r.adTop}${overlaps ? '' : ', side by side'}` : 'no button');
  ok('ad', `${name}: the ad stays as Blogfa shows it`, r.adShown);
  await ctx.close();
}

/* ---------- 6. the About page after Blogfa's page editor ---------- */
for (const [name, vp] of [['desktop', { width: 1366, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const raw = await (await fetch(BASE + LIVE_ABOUT)).text();
  const added = (raw.match(/<br>/g) || []).length;
  const clean = await open(BASE + 'page-about.html', vp), live = await open(BASE + LIVE_ABOUT, vp);
  const height = p => p.evaluate(() => Math.round(document.querySelector('.an-post-body').getBoundingClientRect().height));
  const left = await live.page.evaluate(() => {
    const b = document.querySelector('.an-post-body'), BLOCK = /^(P|H[1-6]|UL|OL|LI|DIV|FIGURE|TABLE|BLOCKQUOTE|PRE|SECTION)$/;
    const blank = n => n.nodeType === 3 && !/[^\s ]/.test(n.nodeValue);
    const near = (n, k) => { while (n && blank(n)) n = n[k]; return n; };
    const isBlock = n => !n || (n.nodeType === 1 && BLOCK.test(n.tagName));
    return {
      brs: [...b.querySelectorAll('br')].filter(br => /^(UL|OL)$/.test(br.parentNode.tagName) || (isBlock(near(br.previousSibling, 'previousSibling')) && isBlock(near(br.nextSibling, 'nextSibling')))).length,
      empty: [...b.querySelectorAll('p')].filter(p => !p.children.length && !/[^\s ]/.test(p.textContent)).length,
      nbsp: [...b.childNodes].filter(n => n.nodeType === 3 && / /.test(n.nodeValue) && blank(n)).length
    };
  });
  const [hc, hl] = [await height(clean.page), await height(live.page)];
  ok('about', `${name}: the editor's extra line breaks, empty paragraphs and &nbsp; are gone`, added > 20 && left.brs === 0 && left.empty === 0 && left.nbsp === 0, `${added} <br> added by the editor; left: ${left.brs} <br>, ${left.empty} empty <p>, ${left.nbsp} &nbsp;`);
  ok('about', `${name}: the page is as tall as the clean one`, Math.abs(hc - hl) <= 4, `clean ${hc}px, after the editor ${hl}px`);
  ok('about', `${name}: no console error`, live.errors.length === 0, live.errors.slice(0, 2).join(' | '));
  await clean.ctx.close(); await live.ctx.close();
}

await browser.close();
server.close();
fs.mkdirSync(path.join(ROOT, 'quality'), { recursive: true });
fs.writeFileSync(path.join(ROOT, CDN ? 'quality/behaviour-cdn-results.json' : 'quality/behaviour-results.json'), JSON.stringify({ generated: new Date().toISOString(), browser: 'Chromium (Playwright)', served: 'http://127.0.0.1 (test-only server)', passed: results.length - failed, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
