/* آینده‌نگار · music — tests of «رادیو آینده» (src/addons/music.js and its buttons in src/addons/addons.js).
   1. The score: each of the five stations is rendered for 48 seconds into an OfflineAudioContext with the same code the
      page plays. Each must make sound in every eight-bar section, never clip, hold no NaN, sit in a sane loudness
      range, and render the same samples again from the same seed (so a piece number means one piece).
   2. In the browser, on the preview (or on preview-cdn with --cdn, through the jsDelivr stand-in): no audio context
      exists before a press and nothing plays by itself; the buttons (top bar, home page, toolkit, key U); play, pause,
      next, a station by hand, «همراه آسمان»; the dock when the window closes; the settings after a reload; the film
      pauses the radio; AN.x.music for other code; phones (no sideways scroll, the bar button hidden); reduced
      motion; axe on the open window; no errors.
   node tools/music.mjs [--cdn]  → quality/music-results.json (or music-cdn-results.json) */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { routeCdn } from './cdnroute.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CDN = process.argv.includes('--cdn');
const DIR = path.join(ROOT, CDN ? 'preview-cdn' : 'preview');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '', 'playwright'))); }
let AXE = '';
try { AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); } catch (e) { AXE = ''; }
if (!fs.existsSync(path.join(DIR, 'index.html'))) { console.error(`${path.relative(ROOT, DIR)}/ is missing: run node tools/preview.mjs first`); process.exit(1); }
const MUSIC_SRC = fs.readFileSync(path.join(ROOT, 'src', 'addons', 'music.js'), 'utf8');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u === '/page/bmc') { res.writeHead(200, { 'content-type': TYPES['.html'] }); res.end('<!doctype html><title>bmc</title>'); return; }
  const f = path.join(DIR, u === '/' ? 'index.html' : u);
  if (!f.startsWith(DIR + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const results = []; let G = 'score';
const ok = (name, pass, info = '') => { results.push({ group: G, name, pass: !!pass, info }); console.log(`${pass ? '✓' : '✗'} [${G}] ${name}${info ? '  — ' + info : ''}`); };
const browser = await chromium.launch();

/* ---------- 1. the score ---------- */
if (!CDN) {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><title>score</title>');
  await page.addScriptTag({ content: MUSIC_SRC });
  const st = await page.evaluate(() => window.AN_MUSIC.ST.map(s => ({ id: s.id, name: s.name, bpm: s.bpm })));
  ok('five stations', st.length === 5, st.map(s => s.id).join(', '));
  for (let i = 0; i < st.length; i++) {
    const r = await page.evaluate(async ([i, seed]) => {
      const SR = 32000, secs = 48, ctx = new OfflineAudioContext(2, SR * secs, SR);
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
      comp.connect(ctx.destination);
      const g = ctx.createGain(); g.gain.value = 0.49; g.connect(comp); // the default volume, 0.7 squared
      window.AN_MUSIC.render(ctx, g, i, seed, secs - 2);
      const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1);
      let peak = 0, nan = 0, sum = 0;
      for (let k = 0; k < L.length; k++) { const a = L[k], b = R[k]; if (a !== a || b !== b) { nan++; continue; } peak = Math.max(peak, Math.abs(a), Math.abs(b)); sum += a * a + b * b; }
      // loudness per section: sections are 8 bars long
      const bar = 60 / window.AN_MUSIC.ST[i].bpm * 4, sec = Math.floor(8 * bar * SR), parts = [];
      for (let s = 0; s * sec < L.length - SR; s++) { let e = 0, n = 0; for (let k = s * sec; k < Math.min(L.length, (s + 1) * sec); k += 4) { e += L[k] * L[k]; n++; } parts.push(10 * Math.log10(e / n + 1e-12)); }
      let h = 0; for (let k = SR; k < SR + 4000; k++) h = (h * 31 + Math.round(L[k] * 1e5)) | 0;
      return { peak, nan, rms: 10 * Math.log10(sum / (2 * L.length) + 1e-12), parts, h };
    }, [i, 4242]);
    // the same seed renders the same piece (within the reverb's tiny run-to-run rounding); another seed, another piece
    const take = (seed) => page.evaluate(async ([i, seed]) => {
      const SR = 32000, ctx = new OfflineAudioContext(2, SR * 6, SR);
      window.AN_MUSIC.render(ctx, ctx.destination, i, seed, 5);
      const L = (await ctx.startRendering()).getChannelData(0), out = [];
      for (let k = SR; k < SR * 5; k += 64) out.push(L[k]);
      return out;
    }, [i, seed]);
    const a1 = await take(4242), a2 = await take(4242), b1 = await take(977);
    const diff = (x, y) => x.reduce((m, v, k) => m + Math.abs(v - y[k]), 0) / x.length;
    const same = diff(a1, a2), other = diff(a1, b1);
    const name = `${st[i].id} (${st[i].bpm} BPM)`;
    ok(`${name}: no NaN and no clipping`, r.nan === 0 && r.peak < 0.99, `peak ${r.peak.toFixed(3)}`);
    ok(`${name}: loudness in range`, r.rms > -40 && r.rms < -10, `${r.rms.toFixed(1)} dBFS RMS`);
    ok(`${name}: sound in every section`, r.parts.length >= 1 && r.parts.every(p => p > -60), r.parts.map(p => p.toFixed(0)).join(' / ') + ' dB');
    ok(`${name}: one seed, one piece; another seed, another piece`, same < 1e-3 && other > same * 5 && other > 1e-3, `same ${same.toExponential(1)}, other ${other.toExponential(1)}`);
  }
  await page.close();
}

/* ---------- 2. in the browser ---------- */
async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, deviceScaleFactor: 1, locale: 'fa-IR', timezoneId: opts.now ? 'UTC' : undefined, reducedMotion: opts.rm ? 'reduce' : 'no-preference', hasTouch: !!opts.touch, isMobile: !!opts.mobile });
  if (CDN) await routeCdn(ctx);
  if (opts.now) await ctx.addInitScript(n => { window.AN_NOW = n; }, opts.now);
  // count every audio context the page makes, and when
  await ctx.addInitScript(() => {
    window.__ac = 0;
    for (const k of ['AudioContext', 'webkitAudioContext']) {
      const A = window[k]; if (!A) continue;
      window[k] = class extends A { constructor(...a) { super(...a); window.__ac++; } };
    }
  });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/GL Driver|GPU stall/.test(m.text())) page.errs.push(m.text()); });
  return { ctx, page };
}
const ready = page => page.waitForFunction(() => window.AN && window.AN.x && window.AN.x.v >= 10, null, { timeout: 15000 });
const playing = page => page.evaluate(() => !!(window.AN.x.music && window.AN.x.music.playing()));

G = 'radio';
{
  const { ctx, page } = await fresh();
  await page.goto(BASE + 'index.html'); await ready(page); await page.waitForTimeout(1200);
  ok('nothing plays by itself: no audio context before a press', await page.evaluate(() => window.__ac === 0 && !document.documentElement.classList.contains('an-mu-on')));
  const btns = await page.evaluate(() => ({ bar: !!document.querySelector('#an-bar .an-x-mu'), hero: !!document.querySelector('.an-hero-cta .an-x-radio'), api: !!(window.AN.x.music && window.AN.x.music.toggle), key: !!document.querySelector('#an-keys dt kbd') && /U/.test(document.querySelector('#an-keys').textContent) }));
  ok('buttons: the top bar, the home page, the keys list and AN.x.music', btns.bar && btns.hero && btns.api && btns.key, JSON.stringify(btns));
  const barOrder = await page.evaluate(() => { const t = document.querySelector('#an-bar .an-tools'); return [...t.children].map(c => c.className.split(' ').find(x => /^an-(x-btn|x-mu|search-btn|snd-btn)$/.test(x)) || '').filter(Boolean).join(' '); });
  ok('the radio sits right after the toolkit button', /an-x-btn an-x-mu/.test(barOrder), barOrder);
  await page.keyboard.press('u');
  await page.waitForSelector('#an-mu.on', { timeout: 10000 });
  ok('U opens the radio window, and opening plays nothing', !(await playing(page)) && await page.evaluate(() => window.__ac === 0));
  await page.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('an-mu-play'), null, { timeout: 2000 }).catch(() => {});
  const label = await page.evaluate(() => ({ h: document.querySelector('#an-mu-h').textContent, n: document.querySelectorAll('#an-mu input[name="an-mu-st"]').length, focus: document.activeElement && document.activeElement.classList.contains('an-mu-play') }));
  ok('the window: title, five stations, focus on play', label.h === 'رادیو آینده' && label.n === 5 && label.focus, JSON.stringify(label));
  await page.click('#an-mu .an-mu-play');
  await page.waitForTimeout(1500);
  ok('play: the music starts, the button says «مکث»', await playing(page) && await page.evaluate(() => document.querySelector('#an-mu .an-mu-play').getAttribute('aria-label') === 'مکث' && document.documentElement.classList.contains('an-mu-on')));
  const ev = await page.evaluate(() => new Promise(r => { window.addEventListener('an-music', e => r(e.detail), { once: true }); document.querySelector('#an-mu .an-mu-play').click(); }));
  ok('pause, with the an-music event for other code', ev && ev.playing === false && !(await playing(page)), JSON.stringify(ev));
  await page.click('#an-mu .an-mu-play'); await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.AN.x.music.station().id);
  await page.click('#an-mu [data-m="next"]'); await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({ id: window.AN.x.music.station().id, name: document.querySelector('#an-mu .an-mu-name').textContent, auto: document.querySelector('#an-mu .an-mu-a').checked, still: window.AN.x.music.playing() }));
  ok('next station, by hand: «همراه آسمان» turns off and the music goes on', after.id !== before && after.name && !after.auto && after.still, `${before} → ${after.id}`);
  await page.click('#an-mu label.an-mu-st:nth-of-type(4)'); await page.waitForTimeout(400);
  const four = await page.evaluate(() => window.AN.x.music.station().id);
  ok('a station picked from the list', four === 'sunset', four);
  await page.click('#an-mu [data-m="fresh"]'); await page.waitForTimeout(400);
  ok('«قطعه‌ی تازه» shows the new piece number', await page.evaluate(() => /قطعه‌ی شماره‌ی/.test(document.querySelector('#an-mu .an-mu-seed').textContent)));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ROOT, 'quality', 'screenshots', CDN ? 'radio-cdn.png' : 'radio.png') }).catch(() => {});
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  const dock = await page.evaluate(() => { const d = document.querySelector('.an-mu-dock'); if (!d || d.hidden) return null; const r = d.getBoundingClientRect(); return { name: d.querySelector('.an-mu-dn').textContent, b: Math.round(innerHeight - r.bottom), w: Math.round(r.width), mid: Math.round(r.left + r.width / 2 - document.documentElement.clientWidth / 2) }; });
  ok('closing the window: the music goes on in a dock at the bottom', !!dock && dock.name === 'غروب نئون' && Math.abs(dock.mid) < 10 && await playing(page), JSON.stringify(dock));
  await page.click('.an-mu-dock [data-md="play"]'); await page.waitForTimeout(300);
  ok('the dock pauses', !(await playing(page)));
  await page.click('.an-mu-dock [data-md="open"]'); await page.waitForSelector('#an-mu.on');
  ok('the dock opens the window again', true);
  await page.click('#an-mu .an-mu-play'); await page.waitForTimeout(400);
  if (AXE) {
    await page.addScriptTag({ content: AXE });
    const ax = await page.evaluate(async () => { const x = await window.axe.run(document.querySelector('#an-mu'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return x.violations.map(v => v.id + ':' + v.nodes.length); });
    ok('axe: no violations in the open window', ax.length === 0, ax.join(', '));
  }
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // the film pauses the radio
  await page.click('.an-hero-cta .an-x-teaser'); await page.waitForSelector('#an-t.on', { timeout: 10000 });
  ok('opening the film pauses the radio', !(await playing(page)));
  await page.keyboard.press('Escape');
  await page.click('.an-mu-dock [data-md="stop"]'); await page.waitForTimeout(200);
  ok('✕ on the dock stops the music and hides the dock', !(await playing(page)) && await page.evaluate(() => document.querySelector('.an-mu-dock').hidden));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('an-mu') || 'null'));
  ok('settings kept in this browser only: station, volume, sky choice', saved && saved.st === 3 && saved.auto === 0 && typeof saved.vol === 'number', JSON.stringify(saved));
  await page.reload(); await ready(page); await page.waitForTimeout(1000);
  ok('after a reload: nothing plays and no dock, until a press', !(await playing(page)) && await page.evaluate(() => window.__ac === 0 && !document.querySelector('.an-mu-dock')));
  await page.click('#an-bar .an-x-mu'); await page.waitForSelector('#an-mu.on');
  ok('after a reload the window opens on the kept station', await page.evaluate(() => document.querySelector('#an-mu input[name="an-mu-st"]:checked').value === '3'));
  ok('no errors', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await ctx.close();
}

G = 'sky';
{
  const { ctx, page } = await fresh();
  await page.goto(BASE + 'post-1.html'); await ready(page); await page.waitForTimeout(600);
  await page.evaluate(() => document.documentElement.setAttribute('data-sky', 'noon'));
  await page.evaluate(() => { const b = document.createElement('button'); b.id = 'tst'; b.textContent = 't'; b.onclick = () => window.AN.x.music.toggle(); document.body.appendChild(b); });
  await page.click('#tst'); await page.waitForFunction(() => window.AN.x.music.playing(), null, { timeout: 10000 });
  ok('AN.x.music.toggle() from another button plays, and «همراه آسمان» picks the noon station', await page.evaluate(() => window.AN.x.music.station().id) === 'noon');
  await page.evaluate(() => document.documentElement.setAttribute('data-sky', 'night'));
  await page.waitForTimeout(5000);
  ok('when the sky turns to night, the station follows at the next bar', await page.evaluate(() => window.AN.x.music.station().id) === 'night');
  const panel = await page.evaluate(() => { window.AN.x.open(); const s = [...document.querySelectorAll('#an-x .an-x-sec h3')].map(h => h.textContent); return s.includes('رادیو آینده') && !!document.querySelector('#an-x [data-x="music"]') && document.querySelector('#an-x [data-x="music-play"]').getAttribute('aria-pressed') === 'true'; });
  ok('the toolkit has a «رادیو آینده» section whose play button shows the state', panel);
  ok('no errors', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await ctx.close();
}

G = 'phone';
{
  const { ctx, page } = await fresh({ viewport: { width: 320, height: 640 }, touch: true, mobile: true });
  await page.goto(BASE + 'index.html'); await ready(page); await page.waitForTimeout(800);
  ok('320 px: the bar button is hidden, the home page button is there', await page.evaluate(() => getComputedStyle(document.querySelector('#an-bar .an-x-mu')).display === 'none' && !!document.querySelector('.an-x-radio')));
  await page.click('.an-x-radio'); await page.waitForSelector('#an-mu.on', { timeout: 10000 });
  await page.click('#an-mu .an-mu-play'); await page.waitForTimeout(500);
  const fit = await page.evaluate(() => { const b = document.querySelector('#an-mu .an-dlg-box').getBoundingClientRect(); return { sx: document.documentElement.scrollWidth - innerWidth, l: Math.round(b.left), r: Math.round(innerWidth - b.right) }; });
  ok('320 px: the window fits, no sideways scroll', fit.sx <= 0 && fit.l >= 0 && fit.r >= 0, JSON.stringify(fit));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const d = await page.evaluate(() => { const r = document.querySelector('.an-mu-dock').getBoundingClientRect(), g = document.querySelector('.an-g'), gr = g ? g.getBoundingClientRect() : null; return { l: Math.round(r.left), r: Math.round(innerWidth - r.right), sx: document.documentElement.scrollWidth - innerWidth, hitsGuide: !!gr && !(gr.right <= r.left || gr.left >= r.right || gr.bottom <= r.top || gr.top >= r.bottom) }; });
  ok('320 px: the dock stays on screen and clear of «نگار»', d.l >= 0 && d.r >= 0 && d.sx <= 0 && !d.hitsGuide, JSON.stringify(d));
  ok('no errors', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await ctx.close();
}

G = 'motion';
{
  const { ctx, page } = await fresh({ rm: true });
  await page.goto(BASE + 'index.html'); await ready(page); await page.waitForTimeout(500);
  await page.click('.an-x-radio'); await page.waitForSelector('#an-mu.on', { timeout: 10000 });
  await page.click('#an-mu .an-mu-play'); await page.waitForTimeout(400); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const a = await page.evaluate(() => [getComputedStyle(document.querySelector('.an-mu-dock')).animationName, getComputedStyle(document.querySelector('#an-bar .an-x-mu path')).animationName]);
  ok('reduced motion: the dock and the bar icon do not move', a.every(x => x === 'none'), a.join(', '));
  ok('no errors', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ---------- 3. the other kit 10 touches: shooting stars, «نگار» redrawn and dancing, the cards in depth ---------- */
const NIGHT = '2026-11-13T22:30:00', DAY = '2026-11-13T09:30:00';
// counts the meteors the page adds to the sky, from the first moment
const meteorCount = page => page.evaluate(() => { window.__met = 0; const s = document.querySelector('.an-sky'); new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => { if (n.classList && n.classList.contains('an-x-meteor')) window.__met++; }))).observe(s, { childList: true }); });

G = 'fx';
{
  const { ctx, page } = await fresh({ now: NIGHT });
  await page.goto(BASE + 'index.html'); await ready(page);
  const m = await page.waitForSelector('.an-sky > .an-x-meteor', { state: 'attached', timeout: 12000 }).then(() => page.evaluate(() => { const e = document.querySelector('.an-sky > .an-x-meteor'); return { hidden: e.getAttribute('aria-hidden'), anim: getComputedStyle(e).animationName, v: document.documentElement.dataset.v, sky: document.documentElement.dataset.sky }; })).catch(() => null);
  ok('night sky: a shooting star crosses, hidden from screen readers, moved by CSS alone', !!m && m.hidden === 'true' && m.anim === 'an-x-meteor', JSON.stringify(m));
  await page.waitForTimeout(3200);
  ok('the shooting star leaves the page when it has crossed', await page.evaluate(() => !document.querySelector('.an-x-meteor')));
  // «نگار» redrawn
  const fig = await page.evaluate(() => { const g = document.querySelector('.an-g'); return { visor: !!g.querySelector('.an-g-visor'), runs: g.querySelectorAll('.an-g-run').length, beacon: !!g.querySelector('.an-g-beacon'), eyes: g.querySelectorAll('.an-g-eyes ellipse').length, rim: getComputedStyle(g, '::before').animationName, float: getComputedStyle(g.querySelector('.an-g-float')).animationName }; });
  ok('«نگار» redrawn: visor, eyes, two orbits with running lights, beacon, a turning rim', fig.visor && fig.runs === 4 && fig.beacon && fig.eyes === 2 && fig.rim === 'an-g-spin' && fig.float === 'an-g-float', JSON.stringify(fig));
  // its card offers the radio
  await page.click('.an-g'); await page.waitForSelector('.an-g-card.on', { timeout: 10000 });
  await page.click('.an-g-acts [data-g="music"]'); await page.waitForSelector('#an-mu.on', { timeout: 10000 });
  ok('«نگار» card: «رادیو آینده» opens the radio window, and nothing plays yet', !(await playing(page)) && !(await page.evaluate(() => document.querySelector('.an-g-card.on'))));
  await page.click('#an-mu .an-mu-play'); await page.waitForTimeout(600);
  const d = await page.evaluate(() => { const g = document.querySelector('.an-g'); return { dance: g.classList.contains('dance'), beat: g.style.getPropertyValue('--g-beat'), anim: getComputedStyle(g.querySelector('.an-g-float')).animationName }; });
  ok('while the radio plays «نگار» sways, two beats a sway', d.dance && /^\d\.\d{3}s$/.test(d.beat) && d.anim === 'an-g-dance', JSON.stringify(d));
  await page.click('#an-mu .an-mu-play'); await page.waitForTimeout(300);
  ok('paused: «نگار» stands still again', await page.evaluate(() => !document.querySelector('.an-g').classList.contains('dance')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // the cards lean toward the pointer
  const card = page.locator('#an-cards .an-card').first();
  await card.scrollIntoViewIfNeeded(); const bb = await card.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.move(bb.x + bb.width * 0.9, bb.y + bb.height * 0.15, { steps: 4 }); await page.waitForTimeout(450);
  const t = await card.evaluate(c => ({ ry: c.style.getPropertyValue('--ry'), rx: c.style.getPropertyValue('--rx'), tf: getComputedStyle(c).transform }));
  ok('a home card leans toward the mouse, a few degrees', parseFloat(t.ry) > 0 && parseFloat(t.ry) <= 8 && parseFloat(t.rx) > 0 && /^matrix3d/.test(t.tf), JSON.stringify(t));
  ok('no errors', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await ctx.close();
}
{
  const a = await fresh({ now: NIGHT, rm: true }), b = await fresh({ now: DAY });
  await Promise.all([a.page.goto(BASE + 'index.html'), b.page.goto(BASE + 'index.html')]);
  await Promise.all([ready(a.page), ready(b.page)]); await Promise.all([meteorCount(a.page), meteorCount(b.page)]);
  await a.page.waitForTimeout(11000);
  const ra = await a.page.evaluate(() => ({ n: window.__met, rim: getComputedStyle(document.querySelector('.an-g'), '::before').animationName, tilt: document.documentElement.classList.contains('an-x-tilt') }));
  const rb = await b.page.evaluate(() => ({ n: window.__met, v: document.documentElement.dataset.v }));
  ok('reduced motion: no shooting stars, a still rim, no leaning cards', ra.n === 0 && ra.rim === 'none' && !ra.tilt, JSON.stringify(ra));
  ok('the day version: no shooting stars', rb.n === 0 && rb.v === 'b', JSON.stringify(rb));
  ok('no errors', a.page.errs.length + b.page.errs.length === 0, a.page.errs.concat(b.page.errs).slice(0, 3).join(' | '));
  await a.ctx.close(); await b.ctx.close();
}

await browser.close(); server.close();
const fails = results.filter(r => !r.pass).length;
fs.writeFileSync(path.join(ROOT, 'quality', CDN ? 'music-cdn-results.json' : 'music-results.json'), JSON.stringify({ at: new Date().toISOString(), cdn: CDN, passed: results.length - fails, total: results.length, results }, null, 2));
console.log(fails ? `\n${fails} of ${results.length} failed` : `\n${results.length}/${results.length} passed`);
process.exit(fails ? 1 : 0);
