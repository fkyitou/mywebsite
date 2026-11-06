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
   6. The About page after Blogfa's page editor has no extra line breaks.
   7. CDN build only: when the stylesheet's first address fails and a backup answers seconds later, the page is set
      up once the styles are in, so the banner, the cards and the globe are drawn at their real size, not stretched.
   8. Blogfa's own spellings: a tag the cloud lists with a run of kashidas shows plainly and once, the minutes of a
      post's time keep two digits, and a month of the archive is titled with its month.
   9. Kit 7: the web font comes from the blog's own files (no Google Fonts), no «·» sits next to a Persian digit,
      the byline's dots never open a line, the chart's reference label keeps clear of the values, and
      «ارائه در کلاس» (presentation mode) steps through an article heading by heading and leaves cleanly.

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
  // a tag page at its Blogfa address (/tag/<name>) is the preview's flat tag file, so the page sees a Blogfa path
  // the inline stylesheet names the font files relative to the page, and the preview's custom-code box
  // (dist/box-local.html) names the toolkit's files the same way, so a page under /tag/ asks for /tag/<file>;
  // they sit next to the flat pages (on Blogfa all of them come from jsDelivr instead)
  const file = path.join(PREVIEW, /^tag\//.test(rel) ? (/\.(woff2|css|js)$/.test(rel) ? path.basename(rel) : 'tag-' + encodeURIComponent(rel.slice(4)).replace(/%/g, '') + '.html') : rel);
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
      times: [...document.querySelectorAll('.an-post-by')].map(b => (/ساعت\s*([۰-۹]+:[۰-۹]+)/.exec(b.textContent) || [])[1] || ''),
      title: (document.querySelector('.an-page-title') || {}).textContent || '',
      firstCat: ((document.querySelector('article.an-post .an-post-cats a') || {}).textContent || '').trim()
    };
  });
  ok('posts', `${f}: every post carries its category`, c.n > 0 && c.cats === c.n, `${c.cats} of ${c.n}`);
  ok('posts', `${f}: no Blogfa tag shows as raw text`, !c.raw);
  ok('posts', `${f}: the time is in Persian digits`, c.latin === 0, `${c.latin} with Latin digits`);
  ok('posts', `${f}: the minutes of the time have two digits`, c.times.length === c.n && c.times.every(t => /^[۰-۹]{1,2}:[۰-۹]{2}$/.test(t)), c.times.join(' '));
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

/* ---------- 8. Blogfa's own spellings: tag cloud, tag and month pages ---------- */
// On the live blog the tag cloud listed post 4's tag «هش» with 48 kashidas (2026-11-05); the preview does the same.
{
  const errs = [];
  let { ctx, page, errors } = await open(BASE + 'index.html');
  const t = await page.evaluate(() => {
    const shown = [...document.querySelectorAll('#an-tagcloud li')].filter(li => !li.hidden).map(li => li.querySelector('a'));
    const names = shown.map(a => a.textContent.trim()), key = s => s.replace(/[\u0640\u200c\s]/g, '');
    const hash = shown.find(a => a.textContent.trim() === 'هش');
    return { n: names.length, kashida: names.filter(x => /\u0640/.test(x)).length, dupes: names.length - new Set(names.map(key)).size, href: hash ? hash.getAttribute('href') : '' };
  });
  ok('spelling', 'tag cloud: names show without kashida', t.n > 0 && t.kashida === 0, `${t.kashida} of ${t.n} with kashida`);
  ok('spelling', 'tag cloud: each tag is named once', t.dupes === 0, `${t.dupes} repeated`);
  ok('spelling', 'tag cloud: the stretched tag keeps the address Blogfa gave it', /(%D9%80|D980){48}/i.test(t.href), t.href.slice(0, 40) + '…');
  errs.push(...errors); await ctx.close();
  ({ ctx, page, errors } = await open(BASE + 'month-1405-08.html'));
  const m = await page.evaluate(() => (document.querySelector('.an-page-title') || {}).textContent || '');
  ok('spelling', 'month page is titled with its month', m.trim() === 'آبان ۱۴۰۵', `«${m.trim()}»`);
  errs.push(...errors); await ctx.close();
  ({ ctx, page, errors } = await open(BASE + 'tag/' + encodeURIComponent('هش' + '\u0640'.repeat(48))));
  const g = await page.evaluate(() => ({ h: ((document.querySelector('.an-page-title') || {}).textContent || '').trim(), title: document.title, posts: document.querySelectorAll('#an-feed > .an-post').length }));
  ok('spelling', 'tag page at its Blogfa address: titled without kashida', g.posts > 0 && g.h === 'برچسب: هش' && !/\u0640/.test(g.title), `«${g.h}», ${g.posts} post(s), title «${g.title.slice(0, 30)}»`);
  errs.push(...errors); await ctx.close();
  ok('spelling', 'no console error', errs.length === 0, errs.slice(0, 2).join(' | '));
}

/* ---------- 9. kit 7: font, separators, byline, chart label, presentation mode ---------- */
{
  const errs = [];
  for (const [name, vp] of [['desktop', { width: 1366, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'fa-IR' });
    if (CDN) await routeCdn(ctx);
    const page = await ctx.newPage(), asked = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
    page.on('request', r => asked.push(r.url()));
    await page.goto(BASE + 'post-1.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.AN && window.AN.ok, null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(async () => { document.querySelector('.an-fig').scrollIntoView(); await document.fonts.ready; });
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const loaded = [...document.fonts].filter(f => f.family.replace(/"/g, '') === 'Vazirmatn' && f.status === 'loaded').length;
      const toc = ((document.querySelector('.an-toc-h small') || {}).textContent || '');
      const list = document.querySelector('.an-by-list').getBoundingClientRect(), spans = [...document.querySelectorAll('.an-by-in > span')];
      // each item's dot sits 10px inside its right (inline-start) edge; it should show only between items on one line
      const dots = spans.map((s, i) => {
        const b = s.getBoundingClientRect(), right = b.right - 10, left = right - 4, shown = left >= list.left - 0.5 && right <= list.right + 0.5;
        const first = !spans.some((o, j) => j !== i && Math.abs(o.getBoundingClientRect().top - b.top) < 4 && o.getBoundingClientRect().left > b.left);
        return { shown, first };
      });
      const svg = document.querySelector('.an-fig svg'), ref = svg && svg.querySelector('.an-ch-reft');
      const box = e => e.getBBox(), hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      const rb = ref ? box(ref) : null, vals = svg ? [...svg.querySelectorAll('.an-ch-val, .an-ch-dot')] : [];
      const lab = document.querySelector('.an-toc-tools a[href="#an-lab"]');
      return {
        loaded, toc, dotTrouble: dots.filter(d => d.shown === d.first).length, dotsN: dots.length,
        refHits: rb ? vals.filter(v => hit(rb, box(v))).length : -1, refDir: ref ? ref.getAttribute('direction') : '',
        labBefore: lab ? getComputedStyle(lab, '::before').content : 'no link'
      };
    });
    ok('kit7', `${name}: Vazirmatn comes from the blog's own files, nothing from Google Fonts`, r.loaded >= 1 && !asked.some(u => /fonts\.(googleapis|gstatic)\.com/.test(u)) && asked.some(u => /vazirmatn-arabic\.\w+\.woff2$/.test(u)), `${r.loaded} face(s) loaded`);
    ok('kit7', `${name}: table of contents says «… بخش، … دقیقه», no «·» next to a digit`, /^[۰-۹]+ بخش، [۰-۹]+ دقیقه$/.test(r.toc), `«${r.toc}»`);
    ok('kit7', `${name}: byline dots only between items on a line`, r.dotsN === 4 && r.dotTrouble === 0, `${r.dotTrouble} misplaced of ${r.dotsN}`);
    ok('kit7', `${name}: chart reference label clear of values and points, right to left`, r.refHits === 0 && r.refDir === 'rtl', `${r.refHits} overlap(s)`);
    ok('kit7', `${name}: «برو به آزمایشگاه» carries no stray section number`, r.labBefore === 'none' || r.labBefore === 'normal', r.labBefore);
    await ctx.close();
  }
  // the home page's cover numbers: a thin rule, not «·»; a space stays in the text (the flex layout drops it on
  // screen) so that a screen reader, a copy or a text-only reader does not run the number into the topic's name
  {
    const { ctx, page, errors } = await open(BASE + 'index.html');
    const c = await page.evaluate(() => [...document.querySelectorAll('.an-cover-n')].map(e => e.textContent));
    ok('kit7', 'home: card numbers stand apart from the topic without «·»', c.length >= 10 && c.every(t => /^[۰-۹]{2} \S/.test(t) && !/·/.test(t)), `${c.length} cards, first «${c[0]}»`);
    errs.push(...errors); await ctx.close();
  }
  // «ارائه در کلاس» on a projector-sized window, with a Blogfa ad bar in place
  {
    // reduced motion: each step then jumps instead of gliding, so the positions can be read right after a key
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, locale: 'fa-IR', reducedMotion: 'reduce' });
    if (CDN) await routeCdn(ctx);
    const page = await ctx.newPage(), errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
    await page.goto(BASE + 'post-1.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.AN && window.AN.ok, null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; const d = document.createElement('div'); d.setAttribute('style', 'position: fixed; bottom: 0px; left: 0px; right: 0px; width: 728px; margin: 0px auto; max-width: 100%; z-index: 9999;'); d.innerHTML = '<div style="height:90px;background:#fc0"></div>'; document.body.insertBefore(d, document.body.firstChild); window.dispatchEvent(new Event('resize')); });
    await page.waitForTimeout(400);
    await page.click('.an-toc-tools button[aria-keyshortcuts="P"]');
    await page.waitForTimeout(300);
    const st = () => page.evaluate(() => {
      const H = document.documentElement, bar = document.querySelector('.an-present-bar'), body = document.querySelector('.an-post-body');
      const vis = e => !!e && getComputedStyle(e).display !== 'none' && !e.hidden;
      return { on: H.classList.contains('an-present'), bar: vis(bar), barBottom: bar ? Math.round(bar.getBoundingClientRect().bottom) : 0, header: vis(document.querySelector('.an-bar')), toc: vis(document.querySelector('.an-toc')),
        fs: parseFloat(getComputedStyle(body).fontSize), y: Math.round(scrollY), heads: [...body.querySelectorAll('h2')].map(h => Math.round(h.getBoundingClientRect().top)), at: (document.querySelector('.an-present-at') || {}).textContent || '' };
    });
    const a = await st();
    ok('kit7', 'presentation: on, step bar shown, header and table of contents put away, type at least 24px', a.on && a.bar && !a.header && !a.toc && a.fs >= 24, `type ${a.fs}px`);
    ok('kit7', 'presentation: step bar sits above the ad bar', a.barBottom <= 720 - 90, `step bar bottom ${a.barBottom}, ad top 630`);
    // step forward to the end: every heading must come to the top once
    const met = new Set(); let last = -1, steps = 0;
    while (steps < 80) {
      await page.keyboard.press('PageDown'); await page.waitForTimeout(60); steps++;
      const s = await st(); s.heads.forEach((t, i) => { if (Math.abs(t - 20) <= 3) met.add(i); });
      if (s.y === last) break; last = s.y;
    }
    ok('kit7', 'presentation: PageDown stops at every section heading', met.size === a.heads.length, `${met.size} of ${a.heads.length} headings, ${steps} steps`);
    await page.keyboard.press('Home'); await page.waitForTimeout(100);
    ok('kit7', 'presentation: Home goes back to the title', (await st()).y === 0);
    await page.keyboard.press('Control+k'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const d = await st(), dlg = await page.evaluate(() => !!document.querySelector('.an-dlg.on'));
    ok('kit7', 'presentation: Esc in the search window closes only the window', d.on && !dlg);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const e = await st();
    ok('kit7', 'presentation: Esc leaves, and the article is as before', !e.on && !e.bar && e.header && e.toc && e.fs < 24, `type ${e.fs}px`);
    await page.keyboard.press('p'); await page.waitForTimeout(200);
    ok('kit7', 'presentation: P turns it on again', (await st()).on);
    errs.push(...errors); await ctx.close();
  }
  ok('kit7', 'no console error', errs.length === 0, errs.slice(0, 2).join(' | '));
}

/* ---------- 7. a stylesheet that arrives late (CDN build) ---------- */
// The template's own <link> holds the script back until the styles are in. A backup <link> added by the loader
// does not, so when cdn.jsdelivr.net fails the script can run on an unstyled page. Here the first address fails
// and fastly answers 2.5 s later; every canvas must still match the box it is shown in.
if (CDN) {
  for (const [name, vp] of [['desktop', { width: 1366, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    for (const file of ['post-6.html', 'index.html']) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'fa-IR' }), log = [];
      await routeCdn(ctx, { fail: (m, f) => m === 0 && f.endsWith('.css') ? 'abort' : null, delay: (m, f) => m === 1 && f.endsWith('.css') ? 2500 : 0, log });
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      await page.goto(BASE + file, { waitUntil: 'load' });
      await page.waitForFunction(() => window.AN && window.AN.ok, null, { timeout: 20000 }).catch(() => {});
      // walk down the page so the lazy covers are drawn, then back to the top
      await page.evaluate(async () => {
        document.documentElement.style.scrollBehavior = 'auto';
        for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.7) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
        scrollTo(0, 0);
      });
      await page.waitForTimeout(1500);
      const r = await page.evaluate(() => {
        const fit = c => { const b = c.getBoundingClientRect(); return { w: c.width, h: c.height, bw: Math.round(b.width), bh: Math.round(b.height), ok: b.width > 0 && b.height > 0 && Math.abs(c.width / c.height - b.width / b.height) <= 0.02 * (b.width / b.height) }; };
        const pick = s => [...document.querySelectorAll(s)].filter(c => c.getAttribute('data-drawn') || c.classList.contains('an-globe-gl')).map(fit);
        return { banner: pick('.an-banner-art canvas'), cards: pick('.an-cover canvas'), globe: pick('.an-globe-gl'), alert: !!document.querySelector('body > [role="alert"]'), ok: !!(window.AN && AN.ok), via: window.AN && AN.via };
      });
      const backup = log.some(l => l.mirror === 1 && l.file.endsWith('.css') && l.how === 'ok');
      const all = [...r.banner, ...r.cards, ...r.globe], bad = all.filter(c => !c.ok);
      const what = file === 'index.html' ? `globe ${r.globe.length}, cards ${r.cards.length}` : `banner ${r.banner.length}, cards ${r.cards.length}`;
      ok('late-css', `${name} ${file}: styles from the backup address, page set up, no warning`, backup && r.ok && !r.alert && errors.length === 0, `backup ${backup}, ready ${r.ok}, warning ${r.alert}${errors.length ? ', ' + errors[0] : ''}`);
      ok('late-css', `${name} ${file}: every canvas drawn at the shape of its box`, all.length > 0 && bad.length === 0 && (file !== 'post-6.html' || r.banner.length === 1) && (file !== 'index.html' || r.globe.length >= 1), `${what}; ${bad.length ? 'stretched: ' + bad.map(c => `${c.w}×${c.h} in ${c.bw}×${c.bh}`).join(', ') : 'all match'}`);
      await ctx.close();
    }
  }
}

await browser.close();
server.close();
fs.mkdirSync(path.join(ROOT, 'quality'), { recursive: true });
fs.writeFileSync(path.join(ROOT, CDN ? 'quality/behaviour-cdn-results.json' : 'quality/behaviour-results.json'), JSON.stringify({ generated: new Date().toISOString(), browser: 'Chromium (Playwright)', served: 'http://127.0.0.1 (test-only server)', passed: results.length - failed, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
