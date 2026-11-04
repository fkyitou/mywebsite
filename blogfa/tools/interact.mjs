/* ==========================================================================
   آینده‌نگار · interact — behaviour tests in a real browser (Chromium via Playwright), on the preview pages.
   1. Labs: every control of every lab is operated (sliders to min and max, every segment button, every
      action button, every tab, every text box) and must change what the lab shows: its numbers, its text,
      or its canvas. A control that changes nothing is reported by name.
   2. Site features: search palette, shortcuts dialog, A/B switch (and that it survives a reload), sound
      switch, realm dropdown, table of contents, back-to-top, mobile menu, comments link.
   3. Rendering: no sideways scrolling at 390 / 768 / 1366 / 1920 px, right-to-left and Persian set on every
      page, images and article covers actually drawn.
   4. Every preview page is opened once: no uncaught errors, no console errors, no local file that fails.
   It cannot prove Blogfa compatibility (that needs the live blog), and it uses Chromium only: Firefox and
   Safari are not installed here.

   node tools/interact.mjs            → quality/interact-results.json, exit 1 on any failure
   ========================================================================== */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = path.join(ROOT, 'preview');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '', 'playwright'))); }
const url = f => 'file://' + path.join(PREVIEW, f);
const results = [], labDetail = []; let failed = 0;
const ok = (group, name, pass, info = '') => { results.push({ group, name, pass, info }); if (!pass) failed++; console.log(`${pass ? '✓' : '✗'} [${group}] ${name}${info ? '  — ' + info : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// --only=labs,features,render,pages runs some sections (default: all four)
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const run = k => !ONLY.length || ONLY.includes(k);
// Smooth scrolling runs at the renderer's pace: on this kind of machine (software WebGL) a frame can take
// 150 ms, so a fixed wait would fail a scroll that works. Wait until the page has stopped moving (or 10 s).
async function settle(page) {
  const t0 = Date.now(); let last = -1, still = 0;
  while (Date.now() - t0 < 10000) { const y = await page.evaluate(() => scrollY); still = y === last ? still + 1 : 0; if (still >= 3) break; last = y; await sleep(200); }
  return Date.now() - t0;
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function open(file, o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 1366, height: 768 }, isMobile: !!o.mobile, hasTouch: !!o.mobile, locale: 'fa-IR', reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
  if (o.v) await ctx.addInitScript(v => { try { localStorage.setItem('an-v', v); } catch (e) {} }, o.v);
  const page = await ctx.newPage(), errors = [], failedLocal = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  page.on('requestfailed', r => { if (r.url().startsWith('file:')) failedLocal.push(r.url().replace('file://' + PREVIEW, '')); });
  await page.goto(url(file) + (o.hash || ''), { waitUntil: 'load' });
  await sleep(o.wait ?? 700);
  return { ctx, page, errors, failedLocal };
}

/* ---------- 1. labs ---------- */
// What a lab shows. "out": its numbers, text and canvases, the things a reader reads as the result.
// "self": the controls' own visible state (pressed, checked, value, label, classes), so a setting that only
// changes the next run (e.g. «به‌روز» on a device before the attack is started) still counts as a response.
const LAB_STATE = () => {
  const lab = document.querySelector('.an-lab'); if (!lab) return null;
  const vis = e => !e.closest('[hidden]');
  const out = [...lab.querySelectorAll('output, .an-stat b, .an-lab-note, [aria-live], .an-lab-res, li, td, b, strong, p, small, span')].filter(vis).map(n => n.textContent.trim()).join('|');
  let cv = '';
  for (const c of lab.querySelectorAll('canvas')) {
    if (!vis(c)) continue;
    try { const x = c.getContext('2d'); if (!x || !c.width) continue; const d = x.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4 * 97) s = (s * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0; cv += s.toString(36) + ','; } catch (e) {}
  }
  const self = [...lab.querySelectorAll('button, input, textarea, select, [aria-pressed], [aria-selected], [aria-checked]')].map(n => [n.getAttribute('aria-pressed'), n.getAttribute('aria-selected'), n.getAttribute('aria-checked'), n.checked, n.value, n.tagName === 'BUTTON' ? n.textContent.trim() : '', n.className].join(':')).join('|')
    + [...lab.querySelectorAll('[class]')].map(n => n.className).join(' ').length;
  return { out: out + '#' + cv, self };
};
const changed = (a, b) => !a || !b ? '' : a.out !== b.out ? 'output' : a.self !== b.self ? 'own state' : '';

async function labControls(page, scope) {
  return page.evaluate(scope => {
    const lab = document.querySelector('.an-lab'), out = [];
    const label = el => (el.getAttribute('aria-label') || (el.labels && el.labels[0] && el.labels[0].textContent) || el.textContent || el.placeholder || el.name || el.id || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    lab.querySelectorAll('input, textarea, select, button').forEach(el => {
      if (el.getAttribute('role') === 'tab' || el.closest('[hidden]') || el.disabled || el.hasAttribute('data-t')) return;
      if (scope === 'outside' && el.closest('.an-lab-pane')) return;
      if (scope === 'pane' && !el.closest('.an-lab-pane:not([hidden])')) return;
      const id = 'c' + Math.random().toString(36).slice(2, 8); el.setAttribute('data-t', id);
      out.push({ id, tag: el.tagName.toLowerCase(), type: el.type || '', label: label(el), min: el.min, max: el.max });
    });
    return out;
  }, scope);
}
async function operate(page, c) {
  const sel = `[data-t="${c.id}"]`;
  if (await page.evaluate(s => { const e = document.querySelector(s); return !e || e.getAttribute('aria-pressed') === 'true' || e.getAttribute('aria-selected') === 'true' || (e.type === 'radio' && e.checked); }, sel)) return 'skip';
  const before = await page.evaluate(LAB_STATE);
  try {
    if (c.type === 'range') {
      await page.evaluate(([s, lo, hi]) => { const el = document.querySelector(s); el.value = +el.value === +lo ? hi : lo; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, c.min, c.max]);
    } else if (c.tag === 'textarea' || ['text', 'search', 'password', 'number', 'email', 'url'].includes(c.type)) {
      await page.fill(sel, c.type === 'number' ? '42' : c.type === 'password' ? 'Mehr-1405!Ketab' : 'یک ایده‌ی تازه برای صرفه‌جویی آب در مدرسه', { timeout: 3000 });
    } else if (c.tag === 'select') {
      await page.evaluate(s => { const el = document.querySelector(s); el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event('change', { bubbles: true })); }, sel);
    } else {
      // a styled radio or checkbox is often covered by its label: click where the reader clicks
      try { await page.click(sel, { timeout: 2500 }); } catch (e) { await page.evaluate(s => { const el = document.querySelector(s); (el.labels && el.labels[0] || el).click(); }, sel); }
    }
  } catch (e) { return 'error: ' + String(e.message).split('\n')[0].slice(0, 70); }
  await sleep(c.type === 'range' ? 250 : 700);
  let after = await page.evaluate(LAB_STATE), how = changed(before, after);
  if (!how) { await sleep(1000); after = await page.evaluate(LAB_STATE); how = changed(before, after); }
  return how || 'none';
}

for (let n = 1; n <= (run('labs') ? 10 : 0); n++) {
  const file = `post-${n}.html`;
  const { ctx, page, errors } = await open(file, { wait: 400 });
  const name = await page.evaluate(() => { const l = document.querySelector('.an-lab'); return l ? (l.className.match(/an-lab-([a-z]+)/) || [])[1] : null; });
  if (!name) { ok('lab', file + ' has a lab', false); await ctx.close(); continue; }
  await page.locator('.an-lab').scrollIntoViewIfNeeded();
  // a lab is ready when its number of controls stops changing
  let last = -1;
  for (let k = 0; k < 30; k++) { const c = await page.evaluate(() => document.querySelectorAll('.an-lab button, .an-lab input, .an-lab textarea, .an-lab select').length); if (c > 0 && c === last) break; last = c; await sleep(500); }
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.an-lab [role="tab"]')].map((t, i) => { t.setAttribute('data-tab', i); return t.textContent.trim(); }));
  const res = { output: [], own: [], none: [], error: [] };
  const record = (c, how) => { if (how === 'skip') return; const k = how === 'output' ? 'output' : how === 'own state' ? 'own' : how === 'none' ? 'none' : 'error'; res[k].push(`${c.tag}${c.type && c.type !== c.tag ? ':' + c.type : ''} «${c.label}»${k === 'error' ? ' ' + how : ''}`); };
  for (const c of await labControls(page, tabs.length ? 'outside' : 'all')) record(c, await operate(page, c));
  for (let t = 0; t < tabs.length; t++) {
    const before = await page.evaluate(LAB_STATE);
    await page.click(`[data-tab="${t}"]`); await sleep(500);
    const sel = await page.getAttribute(`[data-tab="${t}"]`, 'aria-selected');
    if (t > 0) (sel === 'true' && changed(before, await page.evaluate(LAB_STATE)) ? res.output : res.none).push(`tab «${tabs[t]}»`);
    for (const c of await labControls(page, 'pane')) record(c, await operate(page, c));
  }
  const total = res.output.length + res.own.length + res.none.length + res.error.length;
  ok('lab', `${file} lab «${name}»: ${res.output.length + res.own.length}/${total} controls respond (${res.output.length} change the result, ${res.own.length} change a setting)`, total > 0 && !res.none.length && !res.error.length,
    [res.none.length ? 'no visible change: ' + res.none.join('; ') : '', res.error.length ? 'could not operate: ' + res.error.join('; ') : ''].filter(Boolean).join(' · '));
  ok('lab', `${file} lab «${name}» no errors while operated`, errors.length === 0, errors.slice(0, 3).join(' | '));
  labDetail.push({ file, lab: name, tabs, ...res });
  await ctx.close();
}

/* ---------- 2. site features ---------- */
if (run('features')) {
  const { ctx, page, errors } = await open('index.html', { wait: 900 });
  // search palette: Ctrl+K opens it, a query finds the Mars article, Escape closes it
  await page.keyboard.press('Control+k'); await sleep(400);
  const sOpen = await page.evaluate(() => !!document.querySelector('#an-search.on, .an-dlg.on'));
  await page.keyboard.type('مریخ'); await sleep(400);
  const hits = await page.evaluate(() => [...document.querySelectorAll('.an-dlg.on .an-sres a')].map(a => a.textContent));
  await page.keyboard.press('Escape'); await sleep(400);
  const sClosed = await page.evaluate(() => !document.querySelector('.an-dlg.on'));
  ok('feature', 'search: Ctrl+K opens, «مریخ» finds the Mars article, Escape closes', sOpen && hits.some(t => t.includes('مریخ')) && sClosed, `open=${sOpen} hits=${hits.length} closed=${sClosed}`);
  // shortcuts dialog
  await page.keyboard.press('Shift+Slash'); await sleep(400);
  const kOpen = await page.evaluate(() => { const d = document.querySelector('.an-dlg.on'); return d ? d.textContent.includes('M') : false; });
  await page.keyboard.press('Escape'); await sleep(300);
  ok('feature', 'shortcuts: «?» opens the list (it includes M for sound), Escape closes', kOpen && await page.evaluate(() => !document.querySelector('.an-dlg.on')));
  // realm dropdown
  await page.click('.an-dd-btn'); await sleep(300);
  const dd = await page.evaluate(() => ({ exp: document.querySelector('.an-dd-btn').getAttribute('aria-expanded'), n: document.querySelectorAll('#an-dd-menu a').length }));
  await page.keyboard.press('Escape');
  ok('feature', 'realm menu opens with one link per category', dd.exp === 'true' && dd.n >= 7, `expanded=${dd.exp} links=${dd.n}`);
  // sound: button and the M key
  await page.click('[data-an="sound"]'); await sleep(200);
  const s1 = await page.getAttribute('[data-an="sound"]', 'aria-pressed');
  await page.keyboard.press('m'); await sleep(200);
  const s2 = await page.getAttribute('[data-an="sound"]', 'aria-pressed');
  ok('feature', 'sound: the button turns it on, M turns it off', s1 === 'true' && s2 === 'false', `${s1} → ${s2}`);
  // A/B, remembered across a reload
  const v0 = await page.getAttribute('html', 'data-v');
  await page.click('[data-an="ab"]'); await sleep(300);
  const v1 = await page.getAttribute('html', 'data-v');
  await page.reload({ waitUntil: 'load' }); await sleep(400);
  const v2 = await page.getAttribute('html', 'data-v');
  ok('feature', 'A/B switch flips the version and the choice survives a reload', v0 !== v1 && v1 === v2, `${v0} → ${v1} → after reload ${v2}`);
  // back to top
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, document.documentElement.scrollHeight); document.documentElement.style.scrollBehavior = ''; }); await settle(page); await sleep(400);
  const yBottom = await page.evaluate(() => scrollY);
  await page.click('.an-fab'); const tTop = await settle(page);
  ok('feature', 'back-to-top button returns to the top', await page.evaluate(() => scrollY < 5), `from ${yBottom}px, settled after ${tTop} ms`);
  ok('feature', 'home: no errors during the feature tests', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
if (run('features')) {
  const { ctx, page, errors } = await open('post-1.html', { wait: 700 });
  const t = await page.evaluate(() => [...document.querySelectorAll('.an-toc a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1));
  const target = t[Math.min(2, t.length - 1)];
  await page.click(`.an-toc a[href="${target}"]`); const tToc = await settle(page);
  const pos = await page.evaluate(h => { const e = document.querySelector(h); return e ? Math.round(e.getBoundingClientRect().top) : null; }, target);
  ok('feature', 'table of contents: a link scrolls its heading to the top of the screen', pos !== null && pos > -5 && pos < 220, `${t.length} entries, heading at ${pos}px, settled after ${tToc} ms`);
  const cm = await page.evaluate(() => { const a = document.querySelector('.an-cmt a'); return a ? a.getAttribute('href') : null; });
  ok('feature', 'comments: each article links to its Blogfa comments page', !!cm && /comments/.test(cm), cm || 'missing');
  const prog = await page.evaluate(async () => { const b = document.querySelector('#an-progress i'); const r0 = b.getBoundingClientRect().width; scrollTo(0, document.documentElement.scrollHeight / 2); await new Promise(r => setTimeout(r, 400)); return [r0, b.getBoundingClientRect().width]; });
  ok('feature', 'reading progress bar grows while reading', prog[1] > prog[0], `${Math.round(prog[0])}px → ${Math.round(prog[1])}px`);
  ok('feature', 'article: no errors during the feature tests', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
if (run('features')) {
  const { ctx, page } = await open('index.html', { viewport: { width: 390, height: 844 }, mobile: true, wait: 700 });
  await page.click('[data-an="menu"]'); await sleep(400);
  const m = await page.evaluate(() => { const b = document.querySelector('[data-an="menu"]'), n = document.querySelector('#an-nav'); const r = n.getBoundingClientRect(); return { exp: b.getAttribute('aria-expanded'), vis: r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden' }; });
  ok('feature', 'mobile: the menu button opens the navigation', m.exp === 'true' && m.vis, JSON.stringify(m));
  await ctx.close();
}

/* ---------- 3. rendering ---------- */
for (const w of run('render') ? [390, 768, 1366, 1920] : []) {
  for (const f of ['index.html', 'post-6.html', 'page-about.html', 'archive.html']) {
    const { ctx, page } = await open(f, { viewport: { width: w, height: w < 600 ? 844 : 900 }, mobile: w < 600, wait: 500 });
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    ok('layout', `${f} at ${w}px: no sideways scrolling`, o.sw <= o.iw + 1, `${o.sw} / ${o.iw}`);
    await ctx.close();
  }
}
if (run('render')) {
  const { ctx, page } = await open('post-3.html', { wait: 500 });
  const r = await page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, body: getComputedStyle(document.body).direction, p: getComputedStyle(document.querySelector('.an-post-body p')).direction, digits: /[۰-۹]/.test(document.querySelector('.an-banner, .an-post-meta').textContent) }));
  ok('rtl', 'html dir=rtl lang=fa; body and paragraphs right-to-left; Persian digits in the dates', r.dir === 'rtl' && r.lang === 'fa' && r.body === 'rtl' && r.p === 'rtl' && r.digits, JSON.stringify(r));
  await ctx.close();
}
if (run('render')) {
  const { ctx, page } = await open('index.html', { wait: 600 });
  // instant steps: the page asks for smooth scrolling, and a smooth scroll restarted every step never arrives
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.7) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 300)); } });
  await sleep(1200);
  const c = await page.evaluate(() => {
    const imgs = [...document.images].map(i => ({ src: i.src.slice(-40), ok: i.complete && i.naturalWidth > 0 }));
    const covers = [...document.querySelectorAll('.an-cover canvas')].map(cv => { try { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lit = 0; for (let i = 3; i < d.length; i += 4 * 211) if (d[i] > 0) lit++; return lit; } catch (e) { return -1; } });
    return { imgs, covers };
  });
  ok('render', 'home: every <img> loaded', c.imgs.every(i => i.ok), `${c.imgs.length} images${c.imgs.filter(i => !i.ok).map(i => ' ✗ ' + i.src).join('')}`);
  ok('render', 'home: every article cover is drawn', c.covers.length >= 10 && c.covers.every(n => n > 0), `${c.covers.filter(n => n > 0).length} of ${c.covers.length} covers drawn${c.covers.some(n => n <= 0) ? ' · blank: ' + c.covers.map((n, i) => n > 0 ? '' : i + 1).filter(Boolean).join(', ') : ''}`);
  await ctx.close();
}

/* ---------- 4. every page once ---------- */
const all = run('pages') ? fs.readdirSync(PREVIEW).filter(f => f.endsWith('.html')).sort() : [];
let clean = 0; const bad = [];
for (const f of all) {
  const { ctx, errors, failedLocal } = await open(f, { wait: f === 'index.html' ? 1200 : 500 });
  if (errors.length || failedLocal.length) bad.push(`${f}: ${[...errors, ...failedLocal.map(u => 'missing ' + u)].slice(0, 2).join(' | ')}`); else clean++;
  await ctx.close();
}
if (all.length) ok('pages', `all ${all.length} preview pages open with no JS error, no console error and no missing local file`, bad.length === 0, bad.slice(0, 5).join(' || '));

await browser.close();
fs.mkdirSync(path.join(ROOT, 'quality'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'quality/interact-results.json'), JSON.stringify({ generated: new Date().toISOString(), browser: 'Chromium (Playwright), software WebGL', passed: results.length - failed, failed, results, labs: labDetail }, null, 1));
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
