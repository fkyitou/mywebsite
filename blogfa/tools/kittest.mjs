/* آینده‌نگار · kittest — behaviour tests of the install kit (kit.html) in a real browser (Chromium via Playwright).
   Every copy button must put exactly the right text on the clipboard (the three template parts in both versions, the
   combined templates, the seven category names, the About page and each post), every template part offered must fit
   the 60 KB budget (the kit offers the CDN build only), the version notice and the jsDelivr test link must be there
   and point at a real file of the pinned commit, «کپی همه» must join at most four tags
   with the ASCII comma Blogfa splits on, ticks and the version choice must survive a reload, axe must find no WCAG A/AA
   violation, and the page must not scroll sideways at phone width. The clipboard is replaced by a recorder, so the
   test reads exactly what a click would have copied.
     node tools/kit.mjs && node tools/kittest.mjs        (needs Playwright, like tools/check.mjs) */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '', 'playwright'))); }
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const num = t => +String(t).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\D/g, '');
const CDN = JSON.parse(read('dist/build-report.json')).cdn || {};
const body = f => { const s = read(f); const i = s.indexOf('-->'); return s.slice(i + 3).trim() + '\n'; };
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) pass++; else fail++; console.log((cond ? '✓ ' : '✗ ') + name + (cond || !info ? '' : '  — ' + info)); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__copied.push(t); return Promise.resolve(); } }, configurable: true });
  });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(ROOT, 'kit.html'));
  const last = () => p.evaluate(() => window.__copied[window.__copied.length - 1]);
  const click = async sel => { await p.click(sel); await p.waitForTimeout(30); return last(); };
  ok('no JS or console errors on load', errs.length === 0, errs.join(' | '));
  ok('16 steps to tick', (await p.$$('input[data-step]')).length === 16);
  const parts = [[1, '1-main-and-posts.html'], [2, '2-archive.html'], [3, '3-pages.html']];
  const version = (await p.textContent('#kit-version')) || '';
  ok('version notice names kit 4 and says only step 2 is redone', /نسخه‌ی ۴ کیت/.test(version) && /فقط گام ۲ را دوباره انجام دهید/.test(version), version.slice(0, 80));
  const sizes = await p.evaluate(() => { const K = JSON.parse(document.getElementById('kit-data').textContent); return ['full', 'lite'].flatMap(v => [1, 2, 3].map(n => new Blob([K.split[v][n]]).size)); });
  ok('every template part offered fits the 60 KB budget', sizes.every(n => n > 0 && n <= 60 * 1024), sizes.join(','));
  for (const [part, file] of parts) ok(`full part ${part} copies dist/split-cdn/${file}`, (await click(`[data-copy="split"][data-part="${part}"]`)) === read('dist/split-cdn/' + file));
  const sizeFull = await p.textContent('[data-size-part="1"]');
  await p.click('label:has(input[name="split-v"][value="lite"])');
  for (const [part, file] of parts) ok(`lite part ${part} copies dist/split-cdn-lite/${file}`, (await click(`[data-copy="split"][data-part="${part}"]`)) === read('dist/split-cdn-lite/' + file));
  const sizeLite = await p.textContent('[data-size-part="1"]');
  ok('size beside part 1 is shown for both choices and within 60 KB', num(sizeFull) > 0 && num(sizeFull) <= 60 && num(sizeLite) > 0 && num(sizeLite) <= 60, sizeFull + ' / ' + sizeLite);
  const probe = await p.getAttribute('#trouble a[href*="jsdelivr"]', 'href');
  const pm = String(probe).match(new RegExp(`^https://cdn\\.jsdelivr\\.net/gh/${CDN.repo}@${CDN.ref}/${CDN.dir}/(an-base\\.\\w+\\.css)$`));
  ok('troubleshooting test link is a stylesheet of the pinned commit', !!pm && fs.existsSync(path.join(ROOT, 'dist', 'cdn', pm[1])), probe);
  await p.click('details.alt:not(#trouble) summary');
  ok('combined full copies dist/template-cdn.html', (await click('[data-copy="tpl.full"]')) === read('dist/template-cdn.html'));
  ok('combined lite copies dist/template-cdn-lite.html', (await click('[data-copy="tpl.lite"]')) === read('dist/template-cdn-lite.html'));
  ok('category 1 copies its exact name', (await click('[data-copy="cats.0"]')) === 'هوش مصنوعی و داده');
  ok('category 7 copies its exact name', (await click('[data-copy="cats.6"]')) === 'ایده و خلاقیت');
  ok('about page slug copies "about"', (await click('[data-copy="page.slug"]')) === 'about');
  ok('about page body copies pages/about.html without the meta comment', (await click('[data-copy="page.body"]')) === body('pages/about.html'));
  ok('post 1 body copies posts/01-ai.html body', (await click('[data-copy="posts.0.body"]')) === body('posts/01-ai.html'));
  ok('post 10 body copies posts/10-idea.html body', (await click('[data-copy="posts.9.body"]')) === body('posts/10-idea.html'));
  const t9 = await click('[data-copy="posts.8.tagsAll"]');
  ok('post 9 "copy all" tags: four, ASCII comma', t9 === 'انرژی پاک,خورشید,باد,شبکه‌ی برق', t9);
  const counts = await p.evaluate(() => JSON.parse(document.getElementById('kit-data').textContent).posts.map(x => x.tags.length));
  ok('every post has one to four tags', counts.every(n => n >= 1 && n <= 4), counts.join(','));
  ok('single tag copies on its own', (await click('[data-copy="posts.0.tags.0"]')) === 'هوش مصنوعی');
  for (const id of ['s-blog', 's-cats', 'p1']) await p.click(`label[for="${id}"]`);
  const prog = (await p.textContent('#prog-t')).trim();
  ok('progress counts ticks', prog === '۳ از ۱۶ گام', prog);
  await p.reload(); await p.waitForTimeout(100);
  ok('ticks survive a reload', (await p.isChecked('#s-cats')) && (await p.isChecked('#p1')) && (await p.textContent('#prog-t')).trim() === '۳ از ۱۶ گام');
  ok('lite choice survives a reload', await p.isChecked('input[name="split-v"][value="lite"]'));
  await p.addScriptTag({ path: path.join(ROOT, 'node_modules/axe-core/axe.min.js') });
  const ax = await p.evaluate(async () => {
    const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] });
    return r.violations.map(v => v.id + '×' + v.nodes.length);
  });
  ok('axe: no violations (desktop)', ax.length === 0, ax.join(', '));
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto('file://' + path.join(ROOT, 'kit.html'));
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('no horizontal scroll at 390px', over <= 0, 'overflow ' + over + 'px');
  console.log(`\n${pass}/${pass + fail} kit checks passed`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
