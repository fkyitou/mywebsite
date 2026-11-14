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
  10. Kit 9: the live sky. With no version chosen the blog shows «روز» while the sun is up for the visitor's clock
      and «شب» after dusk, with the phase of the day, a moon with its real phase and the season's constellation;
      a chosen version is kept; the approximations are measured against tools/astro.mjs.
  11. Kit 9: «نگار», the blog's guide. The figure in the corner, a hello once, the card (on a press or G) with its
      answers drawn from the page, the walk that lights one part at a time, hiding and bringing it back, the box
      option guide: 0, the light version on a phone, reduced motion, and what it keeps and asks for.
  12. Kit 9: the header menu. «بوم کسب‌وکار» hides while its page answers 404 (asked once in a visit), stays when
      the page is there or the blog does not answer; between the phone menu and a wide screen every label keeps to
      one line and the menu clears the logo and the tools.
  13. Kit 9: the introduction film. A button on the home page only; its code arrives on the first press; nothing moves
      and no sound is made before play; play, captions, seeking and closing; the same frame for the same moment.

   node tools/behaviour.mjs          → preview/,     quality/behaviour-results.json, exit 1 on any failure
   node tools/behaviour.mjs --cdn    → preview-cdn/ (CDN addresses answered from dist/cdn/), quality/behaviour-cdn-results.json
   ========================================================================== */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { routeCdn } from './cdnroute.mjs';
import { crossing, moonAge } from './astro.mjs';

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
  // the business-canvas page, as on a blog that has it: the menu's check (js/core.js) keeps its link. Group 12
  // answers this address itself to see the blog without that page.
  if (rel === 'page/bmc') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); res.end('<!doctype html><title>bmc</title>'); return; }
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
    // the numbers band counts every post of the kit, not only the ones Blogfa puts on the first page
    const nPosts = fs.readdirSync(new URL('../posts/', import.meta.url)).filter(f => /^\d+-.*\.html$/.test(f)).length;
    await page.evaluate(() => document.querySelector('.an-numbers').scrollIntoView());
    await page.waitForTimeout(2200);
    const nums = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.an-numbers [data-count]')].map(b => [b.getAttribute('data-count'), +b.textContent.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\D/g, '')])));
    ok('kit9', 'home: the numbers band counts every post of the kit', nums.posts >= nPosts && nums.labs >= nPosts && nums.sources > nums.posts && nums.minutes > nums.posts, JSON.stringify(nums) + ` for ${nPosts} post files, ${c.length} cards on the page`);
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

/* ---------- 10. kit 9: the live sky (day and night from the visitor's clock) ---------- */
{
  const errs = [];
  async function openAt(file, now, o = {}) {
    const ctx = await browser.newContext({ viewport: o.viewport || { width: 1366, height: 900 }, deviceScaleFactor: 1, locale: 'fa-IR', timezoneId: o.tz || 'UTC', reducedMotion: o.rm ? 'reduce' : 'no-preference' });
    if (CDN) await routeCdn(ctx);
    // AN_NOW is the hour the page should believe; the saved choices are written once, before the first page of the context
    if (now) await ctx.addInitScript(n => { window.AN_NOW = n; }, now);
    if (o.store) await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('t-once')) { for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.setItem('t-once', '1'); } } catch (e) {} }, o.store);
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(BASE + file, { waitUntil: 'load' });
    await page.waitForFunction(() => window.AN && window.AN.ok && window.AN.live, null, { timeout: 15000 }).catch(() => {});
    return { ctx, page };
  }
  const read = page => page.evaluate(() => {
    const h = document.documentElement, q = s => document.querySelector(s), shown = e => !!e && getComputedStyle(e).display !== 'none';
    const st = window.AN.live.state(), sun = q('.an-sky-sun'), moon = q('.an-sky-moon'), svg = q('.an-sky-const svg'), ab = q('.an-ab-btn'), lab = q('.an-v-label');
    return {
      v: h.getAttribute('data-v'), vm: h.getAttribute('data-vm'), sky: h.getAttribute('data-sky'), moonlight: h.hasAttribute('data-moonlight'),
      sun: shown(sun) ? +sun.style.opacity : 0, moon: shown(moon) ? +moon.style.opacity : 0, lit: st ? st.moon.lit : -1,
      litPath: !!q('.an-sky-moon .an-moon-lit'), cons: svg ? svg.getAttribute('data-name') : '', stars: svg ? svg.querySelectorAll('circle').length : 0, lines: svg ? svg.querySelectorAll('line').length : 0,
      aria: ab ? ab.getAttribute('aria-label') : '', label: lab ? lab.textContent : '', sv: localStorage.getItem('an-v'), svm: localStorage.getItem('an-vm')
    };
  });
  const until = (page, v) => page.waitForFunction(x => document.documentElement.getAttribute('data-v') === x, v, { timeout: 6000 }).catch(() => {});
  const brief = r => `v ${r.v}, mode ${r.vm}, sky ${r.sky}, saved ${r.sv}/${r.svm}`;

  // the phase and the version for nine moments; the last two are the same hour in June and in December
  const PHASES = [['2026-11-13T22:30:00', 'a', 'night'], ['2026-11-13T06:50:00', 'b', 'sunrise'], ['2026-11-13T09:00:00', 'b', 'morning'], ['2026-11-13T12:10:00', 'b', 'noon'],
    ['2026-11-13T15:00:00', 'b', 'afternoon'], ['2026-11-13T16:45:00', 'b', 'sunset'], ['2026-11-13T17:40:00', 'a', 'twilight'], ['2026-06-21T19:25:00', 'b', 'sunset'], ['2026-12-21T19:25:00', 'a', 'night']];
  for (const [now, v, sky] of PHASES) {
    const { ctx, page } = await openAt('index.html', now);
    const r = await read(page);
    ok('kit9-sky', `${now.slice(0, 16).replace('T', ' ')}: version ${v.toUpperCase()}, phase «${sky}», nothing saved`, r.v === v && r.vm === 'auto' && r.sky === sky && !r.sv && !r.svm && (v === 'b' ? r.sun > 0 && r.moon === 0 : r.sun === 0), `${brief(r)}, sun ${r.sun}, moon ${r.moon}`);
    await ctx.close();
  }
  // the moon: full on 24 November 2026 and new on 9 November 2026 (tools/astro.mjs gives the same two dates)
  {
    const { ctx, page } = await openAt('index.html', '2026-11-24T22:00:00');
    const full = await read(page);
    ok('kit9-sky', 'full moon night: the moon is drawn lit and the moonlight wash is on', full.lit > 0.97 && full.moonlight && full.moon > 0.9 && full.litPath, `lit ${full.lit.toFixed(3)}, moonlight ${full.moonlight}, moon opacity ${full.moon}`);
    const lit9 = await page.evaluate(() => window.AN.live.at(new Date('2026-11-09T22:00:00')).moon.lit);
    ok('kit9-sky', 'new moon night: nearly nothing of the moon is lit', lit9 < 0.03, `lit ${lit9.toFixed(3)}`);
    // the page's moon age against the fuller formula, twice a month through 2026
    const stamps = []; for (let m = 0; m < 12; m++) for (const d of [1, 15]) stamps.push(Date.UTC(2026, m, d, 12));
    const ages = await page.evaluate(ts => ts.map(t => window.AN.live.at(new Date(t)).moon.age), stamps);
    const diffs = ages.map((a, i) => { const e = Math.abs(a - moonAge(new Date(stamps[i]))); return e > 0.5 ? 1 - e : e; }), worst = Math.max(...diffs);
    ok('kit9-sky', 'the moon age stays within 0.035 of a cycle (about a day) of the reference formula through 2026', worst < 0.035, `largest difference ${worst.toFixed(4)} of a cycle = ${(worst * 29.53).toFixed(2)} days, over ${stamps.length} dates`);
    // one constellation for each season
    const cons = await page.evaluate(() => [['2026-01-15T22:00:00', 'Orion'], ['2026-04-15T22:00:00', 'Leo'], ['2026-07-15T23:00:00', 'Cygnus'], ['2026-10-15T22:00:00', 'Cassiopeia']].map(([t, n]) => {
      window.AN_NOW = t; window.AN.live.state(); const s = document.querySelector('.an-sky-const svg');
      return { want: n, got: s && s.getAttribute('data-name'), stars: s ? s.querySelectorAll('circle').length : 0, lines: s ? s.querySelectorAll('line').length : 0, sky: document.documentElement.getAttribute('data-sky') };
    }));
    ok('kit9-sky', 'a constellation for each season: Orion, Leo, Cygnus, Cassiopeia', cons.every(c => c.got === c.want && c.stars >= 5 && c.lines >= 4 && c.sky === 'night'), cons.map(c => `${c.got} ${c.stars}★ ${c.lines} lines`).join(', '));
    await ctx.close();
  }
  // the hour of the change of version against the Sun's real height at Tehran (35.69°N, 51.39°E, UTC+3:30)
  {
    const { ctx, page } = await openAt('index.html', '2026-11-13T22:30:00', { tz: 'Asia/Tehran' });
    const days = []; for (let m = 0; m < 12; m++) for (const d of [1, 15]) days.push([2026, m, d]);
    const got = await page.evaluate(ds => ({
      off: [new Date(2026, 0, 1).getTimezoneOffset(), new Date(2026, 6, 1).getTimezoneOffset()],
      flips: ds.map(([y, m, d]) => { const f = (from, to, eve) => { for (let i = from; i < to; i++) if ((window.AN.sunAlt(new Date(y, m, d, 0, i)) > -4) !== eve) return i; return -1; }; return [f(0, 720, false), f(720, 1440, true)]; })
    }), days);
    if (got.off[0] !== -210 || got.off[1] !== -210) ok('kit9-sky', 'change of version against the real Sun at Tehran', true, `skipped: this browser's time zone data gives Tehran offsets ${got.off.join(' and ')} minutes, not +3:30 all year`);
    else {
      let worst = 0, sum = 0;
      days.forEach(([y, m, d], i) => {
        const t0 = Date.UTC(y, m, d) - 210 * 6e4, local = t => ((t.getTime() - t0) / 6e4);
        const mor = local(crossing(new Date(t0), new Date(t0 + 720 * 6e4), 35.6892, 51.389, -4)), eve = local(crossing(new Date(t0 + 720 * 6e4), new Date(t0 + 1439 * 6e4), 35.6892, 51.389, -4));
        for (const e of [Math.abs(got.flips[i][0] - mor), Math.abs(got.flips[i][1] - eve)]) { worst = Math.max(worst, e); sum += e; }
      });
      ok('kit9-sky', 'the version changes within 12 minutes of the Sun passing 4° below the horizon at Tehran, all year', worst < 12, `largest difference ${worst.toFixed(1)} min, mean ${(sum / (days.length * 2)).toFixed(1)} min, over ${days.length} days`);
    }
    await ctx.close();
  }
  // the header button: every press changes the page; a kept version goes back to the clock on the next press
  {
    const { ctx, page } = await openAt('index.html', '2026-11-13T22:30:00');
    const r0 = await read(page);
    await page.click('.an-ab-btn'); await until(page, 'b'); const r1 = await read(page);
    ok('kit9-sky', 'button at night, «خودکار»: first press shows B «روز» and keeps it', r0.v === 'a' && r0.vm === 'auto' && /خودکار/.test(r0.aria) && r1.v === 'b' && r1.vm === 'man' && r1.sv === 'b' && r1.svm === 'man' && r1.sky === 'morning' && /B روز/.test(r1.aria) && !/خودکار/.test(r1.aria), `${brief(r0)} → ${brief(r1)}`);
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.AN && window.AN.ok && window.AN.live).catch(() => {});
    const r2 = await read(page);
    ok('kit9-sky', 'the kept version is still there after a reload', r2.v === 'b' && r2.vm === 'man', brief(r2));
    await page.click('.an-ab-btn'); await until(page, 'a'); const r3 = await read(page);
    ok('kit9-sky', 'second press hands the choice back to the clock', r3.v === 'a' && r3.vm === 'auto' && r3.svm === 'auto' && !r3.sv && r3.sky === 'night' && /خودکار/.test(r3.label), `${brief(r3)}, footer «${r3.label}»`);
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.AN && window.AN.ok && window.AN.live).catch(() => {});
    const r4 = await read(page);
    ok('kit9-sky', '«خودکار» is still on after a reload', r4.v === 'a' && r4.vm === 'auto', brief(r4));
    await ctx.close();
  }
  {
    // a kept version that matches the clock gives way to the other one
    const { ctx, page } = await openAt('index.html', '2026-11-13T12:10:00', { store: { 'an-v': 'b', 'an-vm': 'man' } });
    const r0 = await read(page);
    await page.click('.an-ab-btn'); await until(page, 'a'); const r1 = await read(page);
    ok('kit9-sky', 'button at noon with B kept: a press shows A «شب» and keeps it', r0.v === 'b' && r0.vm === 'man' && r1.v === 'a' && r1.vm === 'man' && r1.sv === 'a' && r1.sky === 'night', `${brief(r0)} → ${brief(r1)}`);
    await ctx.close();
  }
  for (const [name, file, now, store, v, vm] of [
    ['an address with ?v=a shows A at noon and keeps it', 'index.html?v=a', '2026-11-13T12:10:00', null, 'a', 'man'],
    ['a version chosen under kit 8 (an-v alone) is kept', 'index.html', '2026-11-13T22:30:00', { 'an-v': 'b' }, 'b', 'man'],
    ['a saved value that is not a version is ignored', 'index.html', '2026-11-13T12:10:00', { 'an-v': 'x', 'an-vm': 'man' }, 'b', 'auto']]) {
    const { ctx, page } = await openAt(file, now, store ? { store } : {});
    const r = await read(page);
    ok('kit9-sky', name, r.v === v && r.vm === vm, brief(r));
    await ctx.close();
  }
  {
    // the clock moves from afternoon to dusk while the page is open
    const { ctx, page } = await openAt('post-1.html', '2026-11-13T16:45:00');
    const r0 = await read(page);
    await page.evaluate(() => { window.AN_NOW = '2026-11-13T17:40:00'; window.AN.live.state(); }); await until(page, 'a');
    const r1 = await read(page);
    ok('kit9-sky', 'the open page turns from «روز» to «شب» when the clock passes dusk, and saves nothing', r0.v === 'b' && r0.sky === 'sunset' && r1.v === 'a' && r1.vm === 'auto' && r1.sky === 'twilight' && !r1.sv && !r1.svm, `${brief(r0)} → ${brief(r1)}`);
    // looking at another hour and coming back
    const p1 = await page.evaluate(() => { window.AN.live.preview(12); const h = document.documentElement; return h.getAttribute('data-v') + '/' + h.getAttribute('data-sky') + '/' + localStorage.getItem('an-v'); });
    const p2 = await page.evaluate(() => { window.AN.live.preview(null); const h = document.documentElement; return h.getAttribute('data-v') + '/' + h.getAttribute('data-sky') + '/' + h.getAttribute('data-vm'); });
    ok('kit9-sky', 'a look at noon and back: the page follows, nothing is saved', p1 === 'b/noon/null' && p2 === 'a/twilight/auto', `${p1} → ${p2}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await openAt('index.html', '2026-11-13T22:30:00', { store: { 'an-v': 'b', 'an-vm': 'man' } });
    const p = await page.evaluate(() => { const h = document.documentElement, o = []; window.AN.live.preview(23); o.push(h.getAttribute('data-v')); window.AN.live.preview(null); o.push(h.getAttribute('data-v'), h.getAttribute('data-vm'), localStorage.getItem('an-v')); return o.join('/'); });
    ok('kit9-sky', 'a look at another hour with B kept: back to B afterwards, still kept', p === 'a/b/man/b', p);
    await ctx.close();
  }
  {
    // reading pages: the moon and the constellation keep clear of the text; on a phone they are left out there
    const { ctx, page } = await openAt('post-1.html', '2026-11-24T22:00:00');
    const g = await page.evaluate(() => {
      const box = s => { const e = document.querySelector(s); if (!e || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return [r.left, r.right]; };
      return { body: box('.an-post-body'), moon: box('.an-sky-moon'), cons: box('.an-sky-const') };
    });
    const clear = b => b && (b[1] <= g.body[0] || b[0] >= g.body[1]);
    ok('kit9-sky', 'article, desktop: the moon and the constellation sit beside the text column, not behind it', !!g.body && clear(g.moon) && clear(g.cons), `text ${g.body && g.body.map(Math.round)}, moon ${g.moon && g.moon.map(Math.round)}, constellation ${g.cons && g.cons.map(Math.round)}`);
    await ctx.close();
    const ph = await openAt('post-1.html', '2026-11-24T22:00:00', { viewport: { width: 390, height: 800 } });
    const hidden = await ph.page.evaluate(() => ['.an-sky-moon', '.an-sky-const', '.an-sky-sun'].map(s => getComputedStyle(document.querySelector(s)).display).join(' '));
    ok('kit9-sky', 'article, phone: no moon, sun or constellation behind the text', hidden === 'none none none', hidden);
    await ph.ctx.close();
  }
  {
    // reduced motion: the sky is there and nothing in it is animated
    const { ctx, page } = await openAt('index.html', '2026-11-13T16:45:00', { rm: true });
    const r = await page.evaluate(() => ({ sky: document.documentElement.getAttribute('data-sky'), t: ['.an-sky-tint', '.an-sky-sun', '.an-sky-const'].map(s => getComputedStyle(document.querySelector(s)).transitionDuration).join(' ') }));
    ok('kit9-sky', 'reduced motion: the phase is shown without any transition', r.sky === 'sunset' && /^(0s[ ,]*)+$/.test(r.t), `${r.sky}; transition ${r.t}`);
    await ctx.close();
  }
  {
    // the paper theme of the reader's toolkit has its own page colour: no sun, moon or wash on it
    const { ctx, page } = await openAt('post-1.html', '2026-11-13T12:10:00', { store: { 'an-x': JSON.stringify({ tone: 'paper' }) } });
    const r = await page.evaluate(() => ({ tone: document.documentElement.getAttribute('data-an-tone'), sky: document.documentElement.getAttribute('data-sky'), shown: ['.an-sky-tint', '.an-sky-sun', '.an-sky-moon'].map(s => getComputedStyle(document.querySelector(s)).display).join(' ') }));
    ok('kit9-sky', 'paper theme: the live sky stays out of it', r.tone === 'paper' && !r.sky && r.shown === 'none none none', `tone ${r.tone}, sky ${r.sky}, ${r.shown}`);
    await ctx.close();
  }
  // nothing is asked from the visitor and nothing is sent: the two scripts name no location or network interface
  const skySrc = fs.readFileSync(path.join(ROOT, 'src/js/live.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'src/js/early.js'), 'utf8');
  const asks = ['geolocation', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'document.cookie'].filter(w => skySrc.includes(w));
  ok('kit9-sky', 'the sky uses the clock only: no location, cookie or network call in its code', asks.length === 0, asks.join(', '));
  ok('kit9-sky', 'no console error', errs.length === 0, errs.slice(0, 2).join(' | '));
}

/* ---------- 11. kit 9: «نگار», the blog's guide (figure in src/addons/addons.js, card and walk in src/addons/guide.js) ---------- */
{
  const errs = [], asked = [];
  async function openG(file, o = {}) {
    const ctx = await browser.newContext({ viewport: o.viewport || { width: 1366, height: 900 }, deviceScaleFactor: 1, locale: 'fa-IR', timezoneId: 'UTC', reducedMotion: o.rm ? 'reduce' : 'no-preference', isMobile: !!o.mobile, hasTouch: !!o.mobile });
    if (CDN) await routeCdn(ctx);
    await ctx.addInitScript(n => { window.AN_NOW = n; }, o.now || '2026-11-13T22:30:00');
    if (o.store) await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('t-once')) { for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.setItem('t-once', '1'); } } catch (e) {} }, o.store);
    // the page as Blogfa would serve it with the owner's box changed (o.html edits the page's text)
    if (o.html) await ctx.route(u => new URL(u).pathname.endsWith('.html'), async route => { const r = await route.fetch(); await route.fulfill({ response: r, body: o.html(await r.text()) }); });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(file + ': ' + m.text()); });
    page.on('pageerror', e => errs.push(file + ': ' + String(e)));
    page.on('request', q => { if (/\/an-guide\.[0-9a-f]+\.js$/.test(q.url())) asked.push(q.url()); });
    await page.goto(BASE + file, { waitUntil: 'load' });
    await page.waitForFunction(() => window.AN && window.AN.ok && document.documentElement.classList.contains('an-x-on'), null, { timeout: 15000 }).catch(() => {});
    return { ctx, page };
  }
  const cardOn = page => page.waitForSelector('.an-g-card.on', { timeout: 10000 }).then(() => page.waitForTimeout(350)).catch(() => {});
  const msg = page => page.evaluate(() => { const m = document.querySelector('.an-g-msg'); return m ? m.textContent.replace(/\s+/g, ' ').trim() : ''; });
  const PARTS = ['#an-nav', '[data-an="menu"]', '[data-an="search"]', '[data-an="ab"]', '[data-an="sound"]', '.an-x-btn', '#an-realms', '#an-cards', '.an-keys', '.an-toc', '.an-lab', '.an-x-after', '.an-related'];
  // one step of the walk: its counter and title, how far the light is from the part it lights (the same clipping as
  // the guide: 6 px around the part, inside the screen and above the ad bar), and whether the note is on the screen
  const step = page => page.evaluate(parts => {
    const t = document.querySelector('.an-g-tip'), s = document.querySelector('.an-g-spot'); if (!t || !s) return null;
    const sp = s.getBoundingClientRect(), tr = t.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = innerHeight;
    const ad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--an-ad')) || 0, room = vh - ad;
    let off = 1e9, part = '';
    for (const q of parts) {
      const e = document.querySelector(q); if (!e) continue;
      const r = e.getBoundingClientRect(), want = [Math.max(r.top - 6, 4), Math.max(r.left - 6, 4), Math.min(r.right + 6, vw - 4), Math.min(r.bottom + 6, room - 4)];
      const d = Math.max(Math.abs(want[0] - sp.top), Math.abs(want[1] - sp.left), Math.abs(want[2] - sp.right), Math.abs(want[3] - sp.bottom));
      if (d < off) { off = d; part = q; }
    }
    return { n: t.querySelector('.an-g-n').textContent, h: t.querySelector('h2').textContent, off: Math.round(off), part,
      inside: tr.top >= 0 && tr.left >= 0 && tr.right <= vw && tr.bottom <= room, label: t.getAttribute('aria-labelledby') === 'an-g-tip-h' && t.getAttribute('role') === 'dialog' };
  }, PARTS);
  async function walk(page, max = 12) {
    const S = [];
    await page.waitForSelector('.an-g-tip', { timeout: 5000 }).catch(() => {});
    for (let i = 0; i < max; i++) {
      await page.waitForTimeout(900);
      const s = await step(page); if (!s) break; S.push(s);
      await page.click('.an-g-tip [data-t="next"]').catch(() => {});
    }
    await page.waitForTimeout(300);
    return S;
  }
  const fine = S => S.every(s => s.off <= 2 && s.inside && s.label);

  // 1. home at night, desktop: the figure, the hello, the card and its answers, the walk
  {
    const { ctx, page } = await openG('index.html');
    const keys0 = await page.evaluate(() => Object.keys(localStorage));
    const g = await page.evaluate(() => {
      const b = document.querySelector('.an-g'), f = document.querySelector('.an-fab'); if (!b) return null;
      const r = b.getBoundingClientRect(), q = f && f.getBoundingClientRect(), apart = !q || r.right <= q.left || q.right <= r.left || r.bottom <= q.top || q.bottom <= r.top;
      return { hidden: b.hidden, label: b.getAttribute('aria-label'), key: b.getAttribute('aria-keyshortcuts'), pop: b.getAttribute('aria-haspopup'), exp: b.getAttribute('aria-expanded'), apart, inside: r.left >= 0 && r.bottom <= innerHeight && r.width >= 44 && r.height >= 44, svg: b.querySelector('svg').getAttribute('aria-hidden') };
    });
    ok('kit9-guide', 'home: the figure sits in its corner, labelled with its name and key, apart from «to the top»', !!g && !g.hidden && /نگار/.test(g.label) && g.key === 'G' && g.pop === 'dialog' && g.exp === 'false' && g.apart && g.inside && g.svg === 'true', JSON.stringify(g));
    await page.waitForTimeout(1000);
    ok('kit9-guide', 'home: the card\'s code is not loaded with the page', asked.length === 0, `${asked.length} request(s)`);
    const chip = await page.waitForSelector('.an-g-chip.on', { timeout: 6000 }).then(() => page.evaluate(() => ({ t: document.querySelector('.an-g-chip').textContent, hide: document.querySelector('.an-g-chip').getAttribute('aria-hidden'), saved: JSON.parse(localStorage.getItem('an-x-guide') || '{}').hi }))).catch(() => null);
    ok('kit9-guide', 'home: a hello beside the figure a few seconds after the first page', !!chip && /نگار/.test(chip.t) && chip.hide === 'true' && chip.saved === 1, JSON.stringify(chip));
    await page.click('.an-g'); await cardOn(page);
    const c = await page.evaluate(() => {
      const d = document.querySelector('.an-g-card'), a = document.activeElement;
      return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), name: (document.getElementById(d.getAttribute('aria-labelledby')) || {}).textContent, exp: document.querySelector('.an-g').getAttribute('aria-expanded'), first: a === d.querySelector('.an-g-act'), acts: [...d.querySelectorAll('.an-g-act')].map(b => b.getAttribute('data-g')), chip: !!document.querySelector('.an-g-chip.on') };
    });
    const hello = await msg(page);
    ok('kit9-guide', 'home: a press opens the card, a dialog beside the figure, focus on its first answer', c.role === 'dialog' && c.modal === 'false' && c.name === 'نگار' && c.exp === 'true' && c.first && !c.chip && ['tour', 'pick', 'sky', 'tip', 'tools'].every(k => c.acts.includes(k)), JSON.stringify(c));
    ok('kit9-guide', 'home: the greeting follows the clock and the page (22:30, the front page)', /^شبتان پرستاره!/.test(hello) && /صفحه‌ی نخست/.test(hello), hello.slice(0, 90));
    ok('kit9-guide', 'home: the card\'s code came once, from the toolkit\'s own address', asked.length === 1 && await page.evaluate(u => { const s = [...document.scripts].find(x => /an-addons\.[0-9a-f]+\.js/.test(x.src)); return !!s && s.src.replace(/[^/]+$/, '') === u.replace(/[^/]+$/, ''); }, asked[0] || ''), asked.join(' '));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const esc = await page.evaluate(() => ({ hidden: document.querySelector('.an-g-card').hidden, focus: document.activeElement.classList.contains('an-g'), exp: document.querySelector('.an-g').getAttribute('aria-expanded') }));
    ok('kit9-guide', 'home: Escape closes the card and gives the focus back to the figure', esc.hidden && esc.focus && esc.exp === 'false', JSON.stringify(esc));
    await page.keyboard.press('g'); await cardOn(page);
    const g1 = await page.evaluate(() => !document.querySelector('.an-g-card').hidden);
    await page.keyboard.press('g'); await page.waitForTimeout(250);
    const g2 = await page.evaluate(() => document.querySelector('.an-g-card').hidden);
    // Playwright's keyboard has no Persian layout: the key event a Persian keyboard sends for the same key
    await page.evaluate(() => (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'ل', code: 'KeyG', bubbles: true, cancelable: true }))); await cardOn(page);
    const g3 = await page.evaluate(() => !document.querySelector('.an-g-card').hidden);
    ok('kit9-guide', 'home: the key G (ل on a Persian keyboard) opens and closes the card', g1 && g2 && g3, `${g1} ${g2} ${g3}`);
    await page.click('.an-g-acts [data-g="pick"]'); await page.waitForTimeout(150);
    const p1 = await page.evaluate(() => { const a = document.querySelector('.an-g-msg a'); return a ? a.getAttribute('href') : ''; });
    await page.click('.an-g-msg [data-g="pick"]'); await page.waitForTimeout(150);
    const p2 = await page.evaluate(() => { const a = document.querySelector('.an-g-msg a'); return { h: a ? a.getAttribute('href') : '', focus: document.activeElement.getAttribute('data-g') }; });
    const real = h => /post-\d+\.html$|\/post\/\d+$/.test(h);
    ok('kit9-guide', '«یک روایت برایم انتخاب کن»: a real story, and «یکی دیگر» gives another one', real(p1) && real(p2.h) && p1 !== p2.h && p2.focus === 'pick', `${p1} → ${p2.h}`);
    await page.click('.an-g-acts [data-g="sky"]'); await page.waitForTimeout(150);
    const sky = await msg(page), sk = await page.evaluate(() => ({ phase: document.documentElement.getAttribute('data-sky'), cons: (document.querySelector('.an-sky-const svg') || { getAttribute: () => '' }).getAttribute('data-name') }));
    ok('kit9-guide', '«آسمان همین لحظه»: the phase and the constellation the sky shows, and no location asked', sk.phase === 'night' && /«شب»/.test(sky) && !!sk.cons && sky.includes('(' + sk.cons + ')') && /ماه/.test(sky) && /مکان شما پرسیده نمی‌شود/.test(sky), `${sk.phase}/${sk.cons}: ${sky.slice(0, 120)}`);
    await page.click('.an-g-acts [data-g="tip"]'); await page.waitForTimeout(100);
    const t1 = await msg(page);
    await page.click('.an-g-msg [data-g="tip"]'); await page.waitForTimeout(100);
    const t2 = await msg(page);
    ok('kit9-guide', '«یک راز از وبلاگ»: the tips come in turn', /^راز ۱ از [۰-۹]+:/.test(t1) && /^راز ۲ از [۰-۹]+:/.test(t2), `${t1.slice(0, 40)} | ${t2.slice(0, 40)}`);
    await page.click('.an-g-acts [data-g="tour"]');
    const S = await walk(page);
    const end = await page.evaluate(() => ({ tip: !!document.querySelector('.an-g-tip'), spot: !!document.querySelector('.an-g-spot'), focus: document.activeElement.classList.contains('an-g') }));
    ok('kit9-guide', 'home: the walk lights each part in turn and its note stays on the screen', S.length >= 5 && fine(S) && S.every((s, i) => s.n === `گام ${fa(i + 1)} از ${fa(S.length)}`), S.map(s => `${s.h}(${s.off}px${s.inside ? '' : ', off screen'})`).join(', '));
    ok('kit9-guide', 'home: «پایان» ends the walk and gives the focus back to the figure', !end.tip && !end.spot && end.focus, JSON.stringify(end));
    await page.keyboard.press('g'); await cardOn(page);
    await page.click('.an-g-acts [data-g="tour"]'); await page.waitForTimeout(900);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const esc2 = await page.evaluate(() => ({ tip: !!document.querySelector('.an-g-tip'), focus: document.activeElement.classList.contains('an-g') }));
    ok('kit9-guide', 'home: Escape ends the walk too', !esc2.tip && esc2.focus, JSON.stringify(esc2));
    const keys1 = await page.evaluate(() => Object.keys(localStorage));
    const added = keys1.filter(k => !keys0.includes(k));
    ok('kit9-guide', 'the guide keeps only «an-x-guide» in this browser', added.length === 1 && added[0] === 'an-x-guide', added.join(', '));
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(4500);
    ok('kit9-guide', 'home: the hello is shown only once', await page.evaluate(() => !document.querySelector('.an-g-chip')));
    await ctx.close();
  }

  // 2. an article by day: what the card says about it, its summary box, the walk in page order, the colours of B
  {
    const { ctx, page } = await openG('post-1.html', { now: '2026-11-13T09:00:00' });
    await page.keyboard.press('g'); await cardOn(page);
    const m = await msg(page), col = await page.evaluate(() => ({ v: document.documentElement.getAttribute('data-v'), core: getComputedStyle(document.querySelector('.an-g')).getPropertyValue('--g-core').trim() }));
    ok('kit9-guide', 'article: the card greets by the clock, names the realm and the reading time', /^صبح بخیر!/.test(m) && /این روایت درباره‌ی «[^»]+» است/.test(m) && /دقیقه/.test(m), m.slice(0, 110));
    ok('kit9-guide', 'article: the figure takes the colours of version B by day', col.v === 'b' && col.core.toUpperCase() === '#FFB547', JSON.stringify(col));
    await page.click('.an-g-acts [data-g="gist"]'); await page.waitForTimeout(150);
    const gi = await page.evaluate(() => {
      const k = document.querySelector('.an-keys'), all = [...k.querySelectorAll('li')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
      return { want: all.slice(0, 3), more: all.length - 3, title: k.querySelector('.an-box-t').textContent.trim(), got: [...document.querySelectorAll('.an-g-msg .an-g-list li')].map(x => x.textContent), text: document.querySelector('.an-g-msg').textContent };
    });
    ok('kit9-guide', 'article: «جمع‌بندی این روایت» quotes the article\'s own summary box under its own title', JSON.stringify(gi.got) === JSON.stringify(gi.want) && gi.text.includes('«' + gi.title + '»') && (gi.more <= 0 || gi.text.includes('و ' + fa(gi.more) + ' مورد دیگر')), `«${gi.title}», ${gi.got.length} of ${gi.want.length + Math.max(gi.more, 0)}`);
    await page.click('.an-g-msg [data-g="keys"]');
    // the page may grow while it scrolls (labs are built as they come near): wait until the box has settled on the screen
    await page.waitForFunction(() => { const r = document.querySelector('.an-keys').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight * 0.75; }, null, { timeout: 8000 }).catch(() => {});
    const kf = await page.evaluate(() => ({ focus: document.activeElement.classList.contains('an-keys'), card: document.querySelector('.an-g-card').hidden, seen: (r => r.top < innerHeight && r.bottom > 0)(document.querySelector('.an-keys').getBoundingClientRect()) }));
    ok('kit9-guide', 'article: «رفتن به این جعبه» closes the card and brings the box into view with the focus', kf.focus && kf.card && kf.seen, JSON.stringify(kf));
    await page.keyboard.press('g'); await cardOn(page);
    await page.click('.an-g-acts [data-g="tour"]');
    const S = await walk(page);
    const title = await page.evaluate(() => document.querySelector('.an-keys .an-box-t').textContent.trim());
    // the order of the page itself (the table of contents is sticky, so its place on screen depends on the scroll)
    const inOrder = await page.evaluate(q => { const e = q.map(x => document.querySelector(x)); return e.every((x, i) => i === 0 || !!(e[i - 1].compareDocumentPosition(x) & 4)); }, S.map(s => s.part));
    ok('kit9-guide', 'article: the walk follows the order of the page, the summary box under its own title', S.length >= 4 && fine(S) && inOrder && S.some(s => s.part === '.an-keys' && s.h === title), S.map(s => `${s.h}(${s.off}px)`).join(', '));
    await ctx.close();
  }

  // 3. hiding the figure from its card, and the toolkit's switch that brings it back
  {
    const { ctx, page } = await openG('post-1.html');
    await page.keyboard.press('g'); await cardOn(page);
    await page.click('.an-g-card [data-g="hide"]'); await page.waitForTimeout(300);
    const h = await page.evaluate(() => ({ hidden: document.querySelector('.an-g').hidden, card: document.querySelector('.an-g-card').hidden, saved: (JSON.parse(localStorage.getItem('an-x') || '{}')).guide, toast: (document.getElementById('an-toast') || {}).textContent || '' }));
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.documentElement.classList.contains('an-x-on'), null, { timeout: 15000 }).catch(() => {});
    await page.keyboard.press('g'); await page.waitForTimeout(400);
    const h2 = await page.evaluate(() => ({ hidden: !!document.querySelector('.an-g') && document.querySelector('.an-g').hidden, card: !document.querySelector('.an-g-card.on') }));
    ok('kit9-guide', '«پنهان کردن نگار»: the figure goes, the choice is saved and kept after a reload, G stays quiet', h.hidden && h.card && h.saved === 0 && /پنهان شد/.test(h.toast) && h2.hidden && h2.card, JSON.stringify({ ...h, after: h2 }));
    await page.evaluate(() => window.AN.x.open()); await page.waitForTimeout(300);
    await page.click('#an-x input[data-p="guide"]'); await page.waitForTimeout(200);
    const back = await page.evaluate(() => ({ shown: !document.querySelector('.an-g').hidden, on: document.querySelector('#an-x input[data-p="guide"]').checked }));
    ok('kit9-guide', 'the toolkit\'s switch «نگار، راهنمای وبلاگ» brings it back', back.shown && back.on, JSON.stringify(back));
    await ctx.close();
  }

  // 4. the owner turns it off in the box (guide: 0): nothing of it is on the page and its file is never asked for
  {
    const n0 = asked.length; let swapped = 0;
    const { ctx, page } = await openG('post-1.html', { html: t => t.replace(/(AN_X_OPT\s*=\s*\{[^}]*guide:\s*)1/, (m, a) => { swapped++; return a + '0'; }) });
    await page.keyboard.press('g'); await page.waitForTimeout(500);
    await page.evaluate(() => window.AN.x.open()); await page.waitForTimeout(300);
    const off = await page.evaluate(() => ({ fig: !!document.querySelector('.an-g'), card: !!document.querySelector('.an-g-card'), sw: !!document.querySelector('#an-x input[data-p="guide"]'), key: /<kbd>G<\/kbd>/.test((document.querySelector('#an-keys .an-keys-list') || {}).innerHTML || '') }));
    ok('kit9-guide', 'box option guide: 0 leaves no figure, no switch, no key and no request', swapped === 1 && !off.fig && !off.card && !off.sw && !off.key && asked.length === n0, JSON.stringify({ swapped, ...off, requests: asked.length - n0 }));
    await ctx.close();
  }

  // 5. a phone: the light version, clear of «to the top», the card inside the screen, no hello on a narrow screen
  {
    const { ctx, page } = await openG('index.html', { viewport: { width: 390, height: 844 }, mobile: true });
    await page.waitForTimeout(4200);
    const ph = await page.evaluate(() => {
      const b = document.querySelector('.an-g'), r = b.getBoundingClientRect(), q = document.querySelector('.an-fab').getBoundingClientRect(), run = b.querySelector('.an-g-run');
      return { lite: b.classList.contains('lite'), run: getComputedStyle(run).display, apart: r.right <= q.left || q.right <= r.left || r.bottom <= q.top || q.bottom <= r.top, inside: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, chip: !!document.querySelector('.an-g-chip') };
    });
    await page.tap('.an-g'); await cardOn(page);
    const cr = await page.evaluate(() => { const r = document.querySelector('.an-g-card').getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: innerWidth, h: innerHeight, sx: document.documentElement.scrollWidth }; });
    ok('kit9-guide', 'phone: the light version (no running light), apart from «to the top», no hello on a narrow screen', ph.lite && ph.run === 'none' && ph.apart && ph.inside && !ph.chip, JSON.stringify(ph));
    ok('kit9-guide', 'phone: the card fits the screen without sideways scrolling', cr.l >= 0 && cr.r <= cr.w && cr.t >= 0 && cr.b <= cr.h && cr.sx <= cr.w, JSON.stringify(cr));
    await page.tap('.an-g-acts [data-g="tour"]');
    const S = await walk(page, 3);
    ok('kit9-guide', 'phone: the walk starts at the menu button and its note stays on the screen', S.length >= 1 && S[0].part === '[data-an="menu"]' && fine(S), S.map(s => `${s.h}(${s.off}px)`).join(', '));
    await ctx.close();
  }

  // 6. reduced motion: the figure stands still, the card and the walk come without movement
  {
    const { ctx, page } = await openG('index.html', { rm: true });
    await page.waitForTimeout(800);
    await page.click('.an-g'); await cardOn(page);
    const st = await page.evaluate(() => ({ running: document.getAnimations().filter(a => a.playState === 'running').length, card: getComputedStyle(document.querySelector('.an-g-card')).transitionDuration }));
    await page.click('.an-g-acts [data-g="tour"]'); await page.waitForTimeout(600);
    const sp = await page.evaluate(() => { const s = document.querySelector('.an-g-spot'); return s ? getComputedStyle(s).transitionDuration : 'none'; });
    ok('kit9-guide', 'reduced motion: nothing of the guide moves', st.running === 0 && /^(0s[ ,]*)+$/.test(st.card) && /^(0s[ ,]*)+$/.test(sp), `${st.running} running, card ${st.card}, spot ${sp}`);
    await ctx.close();
  }

  // nothing is sent and nothing is run from text: the guide's code names no network interface, location or eval
  const gSrc = fs.readFileSync(path.join(ROOT, 'src/addons/guide.js'), 'utf8');
  const bad = ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'geolocation', 'document.cookie', 'eval(', 'new Function', 'window.open', 'location.href =', 'location.assign', 'location.replace'].filter(w => gSrc.includes(w));
  ok('kit9-guide', 'the card\'s code sends nothing, asks no location and runs no text as code', bad.length === 0, bad.join(', '));
  ok('kit9-guide', 'no console error', errs.length === 0, errs.slice(0, 2).join(' | '));
}

/* ---------- 12. kit 9: the header menu ---------- */
{
  // «بوم کسب‌وکار» opens /page/bmc, a page the owner makes in Blogfa. Each case answers that address itself: missing
  // (404), there (200), or out of reach. The browser's own line about the failed request is expected; any other
  // console error is not.
  const errs = [];
  const visit = async answer => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, locale: 'fa-IR' });
    if (CDN) await routeCdn(ctx);
    let asked = 0;
    await ctx.route('**/page/bmc', r => { asked++; return answer === 'down' ? r.abort('connectionrefused') : r.fulfill({ status: answer, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>x</title>' }); });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/\/page\/bmc$/.test(m.location().url || '')) errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e)));
    const look = () => page.evaluate(() => { const a = document.querySelector('#an-nav > a[data-nav="bmc"]'); return { hidden: a.hidden, shown: getComputedStyle(a).display !== 'none', kept: sessionStorage.getItem('an-bmc') }; });
    const go = async f => { await page.goto(BASE + f, { waitUntil: 'load' }); await page.waitForFunction(() => window.AN && window.AN.ok, null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(500); };
    await go('index.html');
    const first = await look(), n1 = asked;
    await go('post-1.html');
    const second = await look();
    await ctx.close();
    return { first, second, n1, n2: asked - n1 };
  };
  let r = await visit(404);
  ok('kit9-menu', 'a blog without the page (404): «بوم کسب‌وکار» is hidden and the answer kept for the visit', r.first.hidden && !r.first.shown && r.first.kept === '404' && r.n1 === 1, JSON.stringify(r));
  ok('kit9-menu', 'the next page hides it at once, without asking again', r.second.hidden && r.n2 === 0, JSON.stringify(r));
  r = await visit(200);
  ok('kit9-menu', 'a blog with the page: the link stays, asked once in the visit', !r.first.hidden && r.first.shown && r.first.kept === 'ok' && !r.second.hidden && r.n1 === 1 && r.n2 === 0, JSON.stringify(r));
  r = await visit('down');
  ok('kit9-menu', 'no answer: the link stays and nothing is kept, so the next page asks again', !r.first.hidden && r.first.shown && !r.first.kept && !r.second.hidden && r.n2 === 1, JSON.stringify(r));
  ok('kit9-menu', 'no other console error', errs.length === 0, errs.slice(0, 2).join(' | '));

  // between the phone menu (860px and below) and a wide screen: one line per label, nothing overlapping
  for (const w of [861, 900, 980, 1023, 1100, 1180, 1366]) {
    const { ctx, page } = await open(BASE + 'post-1.html', { width: w, height: 700 });
    const m = await page.evaluate(() => {
      const box = s => document.querySelector(s).getBoundingClientRect();
      const items = [...document.querySelectorAll('#an-nav > a:not([hidden]), #an-nav .an-dd-btn')];
      const nav = box('#an-nav'), tools = box('.an-tools'), logo = box('.an-logo'), bar = document.querySelector('#an-bar');
      return { hs: items.map(a => Math.round(a.getBoundingClientRect().height)), clear: tools.right <= nav.left + 1 && nav.right <= logo.left + 1, over: bar.scrollWidth - bar.clientWidth, kbd: getComputedStyle(document.querySelector('.an-search-btn kbd')).display };
    });
    const one = m.hs.length >= 5 && Math.max(...m.hs) <= 46 && Math.max(...m.hs) === Math.min(...m.hs);
    ok('kit9-menu', `${w}px: every label on one line, the menu clear of the logo and the tools` + (w <= 1100 ? ', no «Ctrl K» hint' : ''), one && m.clear && m.over <= 0 && (w <= 1100 ? m.kbd === 'none' : m.kbd !== 'none'), JSON.stringify(m));
    await ctx.close();
  }
}

/* ---------- 13. kit 9: the introduction film (src/addons/teaser.js, opened by src/addons/addons.js) ---------- */
{
  const errs = [], asked = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, locale: 'fa-IR', timezoneId: 'UTC' });
  if (CDN) await routeCdn(ctx);
  await ctx.addInitScript(() => {
    window.AN_NOW = '2026-11-13T22:30:00';
    // count the audio contexts: none may exist before the play button
    const A = window.AudioContext; window.__ac = 0;
    if (A) window.AudioContext = class extends A { constructor(...a) { super(...a); window.__ac++; } };
  });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  page.on('request', q => { if (/\/an-teaser\.[0-9a-f]+\.js$/.test(q.url())) asked.push(q.url()); });
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.classList.contains('an-x-on'), null, { timeout: 15000 }).catch(() => {});
  const b = await page.evaluate(() => { const b = document.querySelector('.an-hero-cta .an-x-teaser'); return b && { t: b.textContent.trim(), pop: b.getAttribute('aria-haspopup'), type: b.type }; });
  ok('kit9-teaser', 'home: «ویدیوی معرفی» sits beside the hero\'s two buttons, and its code is not loaded with the page', !!b && /ویدیوی معرفی/.test(b.t) && /۴۰/.test(b.t) && b.pop === 'dialog' && b.type === 'button' && asked.length === 0, JSON.stringify({ b, asked: asked.length }));
  await page.click('.an-x-teaser');
  await page.waitForSelector('.an-t-dlg.on', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  const o = await page.evaluate(() => {
    const d = document.querySelector('.an-t-dlg.on'); if (!d) return null;
    return { label: d.getAttribute('aria-labelledby'), focus: document.activeElement && document.activeElement.className, big: !d.querySelector('.an-t-big').hidden,
      cv: d.querySelector('.an-t-cv').getAttribute('role'), seek: d.querySelector('.an-t-seek').value, ac: window.__ac,
      tr: d.querySelectorAll('.an-t-tr li').length, credit: /امیرحسین همتی/.test(d.querySelector('.an-t-tr').textContent) };
  });
  ok('kit9-teaser', 'the first press: the film\'s file comes once, from the toolkit\'s own address', asked.length === 1 && /\/an-teaser\.[0-9a-f]{10}\.js$/.test(asked[0]), asked.join(' '));
  ok('kit9-teaser', 'the window opens on the poster, focus on the play button, no sound yet', !!o && o.label === 'an-t-h' && /an-t-big/.test(o.focus) && o.big && o.cv === 'img' && o.seek === '0' && o.ac === 0, JSON.stringify(o));
  ok('kit9-teaser', 'a transcript of every caption, with the creator\'s credit', !!o && o.tr === 8 && o.credit, JSON.stringify(o));
  await page.waitForTimeout(1200);
  const still = await page.evaluate(() => ({ seek: document.querySelector('.an-t-seek').value, ac: window.__ac }));
  ok('kit9-teaser', 'nothing moves and nothing plays until the play button', still.seek === '0' && still.ac === 0, JSON.stringify(still));
  await page.click('.an-t-big');
  await page.waitForTimeout(1600);
  const p1 = await page.evaluate(() => ({ seek: +document.querySelector('.an-t-seek').value, big: document.querySelector('.an-t-big').hidden, btn: document.querySelector('.an-t-bar [data-t="play"]').textContent, ac: window.__ac, vt: document.querySelector('.an-t-seek').getAttribute('aria-valuetext') }));
  ok('kit9-teaser', 'play: the film runs, the button says «مکث», the music starts with it', p1.seek >= 8 && p1.seek <= 30 && p1.big && p1.btn === 'مکث' && p1.ac === 1 && /از ۴۰ ثانیه/.test(p1.vt), JSON.stringify(p1));
  await page.click('[data-t="caps"]');
  await page.waitForTimeout(400);
  const c1 = await page.evaluate(() => { const c = document.querySelector('.an-t-cap'); return { hidden: c.hidden, t: c.textContent, live: c.getAttribute('aria-live'), pressed: document.querySelector('[data-t="caps"]').getAttribute('aria-pressed') }; });
  ok('kit9-teaser', 'captions: the line on screen, read out politely', !c1.hidden && /نقطه‌ای از نور/.test(c1.t) && c1.live === 'polite' && c1.pressed === 'true', JSON.stringify(c1));
  await page.click('.an-t-bar [data-t="play"]');
  await page.evaluate(() => { const s = document.querySelector('.an-t-seek'); s.value = '352'; s.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(300);
  const s1 = await page.evaluate(() => ({ seek: document.querySelector('.an-t-seek').value, cap: document.querySelector('.an-t-cap').textContent, btn: document.querySelector('.an-t-bar [data-t="play"]').textContent }));
  ok('kit9-teaser', 'pause and seek: still at 35.2 s, the closing caption with the credit', s1.seek === '352' && /امیرحسین همتی/.test(s1.cap) && s1.btn === 'پخش', JSON.stringify(s1));
  // the same moment draws the same picture, every time
  const same = await page.evaluate(() => {
    const f = window.AN_TEASER.film, sum = t => { const c = document.createElement('canvas'); c.width = 320; c.height = 180; const x = c.getContext('2d'); f.draw(x, t, 320, 180); const d = x.getImageData(0, 0, 320, 180).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0; return h; };
    return [sum(16.4), sum(3), sum(16.4)];
  });
  ok('kit9-teaser', 'one moment, one frame: drawn twice, the same pixels', same[0] === same[2] && same[0] !== same[1], JSON.stringify(same));
  await page.click('.an-t-big');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const shut = await page.evaluate(() => ({ open: !!document.querySelector('.an-t-dlg.on'), focus: document.activeElement && document.activeElement.className, t: document.querySelector('.an-t-seek').value }));
  await page.waitForTimeout(600);
  const shut2 = await page.evaluate(() => document.querySelector('.an-t-seek').value);
  ok('kit9-teaser', 'Escape closes the window, stops the film and gives focus back to the button', !shut.open && /an-x-teaser/.test(shut.focus) && shut.t === shut2, JSON.stringify({ shut, shut2 }));
  ok('kit9-teaser', 'no console errors', errs.length === 0, errs.join(' | '));
  await ctx.close();
  // an article has no such button, and a box with teaser: 0 has none either
  const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  if (CDN) await routeCdn(ctx2);
  await ctx2.route(u => new URL(u).pathname.endsWith('.html'), async route => { const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()).replace('teaser: 1 }', 'teaser: 0 }') }); });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + 'post-1.html', { waitUntil: 'load' });
  await p2.waitForFunction(() => document.documentElement.classList.contains('an-x-on'), null, { timeout: 15000 }).catch(() => {});
  const onPost = await p2.evaluate(() => !!document.querySelector('.an-x-teaser'));
  await p2.goto(BASE + 'index.html', { waitUntil: 'load' });
  await p2.waitForFunction(() => document.documentElement.classList.contains('an-x-on'), null, { timeout: 15000 }).catch(() => {});
  const off = await p2.evaluate(() => ({ btn: !!document.querySelector('.an-x-teaser'), opt: window.AN.x && window.AN.x.opt.teaser }));
  ok('kit9-teaser', 'no button on an article; none on the home page when the box says teaser: 0', !onPost && !off.btn && off.opt === 0, JSON.stringify({ onPost, off }));
  await ctx2.close();
}

await browser.close();
server.close();
fs.mkdirSync(path.join(ROOT, 'quality'), { recursive: true });
fs.writeFileSync(path.join(ROOT, CDN ? 'quality/behaviour-cdn-results.json' : 'quality/behaviour-results.json'), JSON.stringify({ generated: new Date().toISOString(), browser: 'Chromium (Playwright)', served: 'http://127.0.0.1 (test-only server)', passed: results.length - failed, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
