/* ==========================================================================
   آینده‌نگار · toolkit — browser tests of «ابزار خواننده», the code for Blogfa's custom-code box (src/addons/).
   The preview pages hold the box the way Blogfa fills <-BlogCustomHtml->, and are served over http on 127.0.0.1
   (the toolkit keeps its data in localStorage, as on the real blog). In Chromium, with a fresh profile each time:
   1. Article, desktop: the toolkit starts and its bar button comes first; the box takes no room; the panel opens as
      a dialog with four themes; «کاغذی» and «پرتضاد» set the version, the browser bar colour and the saved choice;
      text size; Escape; the template's A/B switch ends an extra theme; keys R and F; reading aloud (with a stub
      on-device Persian voice, since the container has none); marking; the reading ruler; the QR code decodes to
      the page address (as SVG and as the pixels on screen, with jsQR); the APA citation; the quiz (scored, each
      answer explained, result saved, new questions); the passport stamp after reading to the end; «continue
      reading»; badges on the home page cards; «پاک کردن همه‌ی داده‌های من» removes everything; no console error.
   2. A saved paper theme is on <html> before the first paint (js/early.js), on the archive and About pages too,
      and an address with ?v=a still shows version A.
   3. A box that shows the bare tag text (a template that left it unfilled) stays hidden.
   4. Phone 390×844: the panel is a full-width bottom sheet; no sideways scrolling.
   5. «Reduce motion»: the motion switch is off and cannot be turned on.

   node tools/toolkit.mjs        on preview/ (dist/box-local.html, files next to the pages) → quality/toolkit-results.json,
                                 screenshots in quality/screenshots/toolkit/, exit 1 on any failure
   node tools/toolkit.mjs --cdn  on preview-cdn/ (dist/box.html, exactly what the owner pastes), the jsDelivr
                                 addresses answered from dist/cdn/ by tools/cdnroute.mjs → quality/toolkit-cdn-results.json
   ========================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { routeCdn } from './cdnroute.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CDN = process.argv.includes('--cdn');
const DIR = path.join(ROOT, CDN ? 'preview-cdn' : 'preview');
const SHOTS = CDN ? null : path.join(ROOT, 'quality', 'screenshots', 'toolkit');
const JSQR = path.join(ROOT, 'node_modules', 'jsqr', 'dist', 'jsQR.js');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '', 'playwright'))); }
if (!fs.existsSync(path.join(DIR, 'post-1.html'))) { console.error(`${path.relative(ROOT, DIR)}/ is missing: run node tools/preview.mjs${CDN ? ' --template dist/template-cdn.html --out preview-cdn' : ''} first`); process.exit(1); }
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const snap = (page, name) => SHOTS ? page.screenshot({ path: path.join(SHOTS, name) }) : null;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(DIR, u === '/' ? 'index.html' : u);
  if (!f.startsWith(DIR + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const results = []; let G = 'article';
const ok = (name, pass, info = '') => { results.push({ group: G, name, pass: !!pass, info }); console.log(`${pass ? '✓' : '✗'} [${G}] ${name}${info ? '  — ' + info : ''}`); };
const browser = await chromium.launch();

async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, deviceScaleFactor: 1, locale: 'fa-IR', reducedMotion: opts.rm ? 'reduce' : 'no-preference', hasTouch: !!opts.touch, isMobile: !!opts.mobile });
  if (CDN) await routeCdn(ctx);
  if (opts.tts) await ctx.addInitScript(() => {
    const spoken = []; window.__spoken = spoken;
    const fake = {
      getVoices: () => [{ lang: 'fa-IR', name: 'Test Persian', localService: true, default: false, voiceURI: 'test' }, { lang: 'fa-IR', name: 'Online', localService: false, default: false, voiceURI: 'online' }],
      speak: u => { spoken.push(u.text); setTimeout(() => u.dispatchEvent(new Event('end')), 30); },
      cancel: () => {}, pause: () => {}, resume: () => {}, addEventListener: () => {}, speaking: false, paused: false, pending: false
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    // a real utterance refuses a voice object that is not a SpeechSynthesisVoice, so the stub brings its own
    class U extends EventTarget { constructor(t) { super(); this.text = t; this.lang = ''; this.voice = null; this.rate = 1; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
  return { ctx, page, errors };
}
const ready = page => page.waitForFunction(() => document.documentElement.classList.contains('an-x-on'), null, { timeout: 15000 });

try {
  /* 1. post page, desktop */
  {
    G = 'article';
    const { ctx, page, errors } = await fresh({ tts: true });
    await page.goto(BASE + 'post-1.html', { waitUntil: 'load' });
    await ready(page);
    ok('post: toolkit loaded (html.an-x-on, AN.x.v=9)', await page.evaluate(() => window.AN.x && window.AN.x.v === 9));
    ok('post: header button first in the tools', await page.evaluate(() => { const t = document.querySelector('#an-bar .an-tools'); return !!t && t.firstElementChild.classList.contains('an-x-btn'); }));
    ok('post: custom box takes no room', await page.evaluate(() => { const c = document.querySelector('.an-custom'); return !!c && getComputedStyle(c).display === 'none'; }));
    ok('post: keys list has R/F/Q', await page.evaluate(() => /ابزار خواننده/.test((document.querySelector('#an-keys .an-keys-list') || {}).textContent || '')));
    // panel
    await page.click('#an-bar .an-x-btn');
    await page.waitForSelector('#an-x.on');
    await page.waitForTimeout(450);
    await snap(page, '01-panel-desktop.png');
    ok('panel: opens as dialog with 4 themes', await page.evaluate(() => document.querySelectorAll('#an-x input[name="an-x-theme"]').length === 4));
    ok('panel: focus moved into the dialog', await page.evaluate(() => !!document.activeElement.closest('#an-x')));
    // paper theme
    await page.click('#an-x .an-x-th-paper');
    await page.waitForTimeout(800);
    const paper = await page.evaluate(() => ({ tone: document.documentElement.getAttribute('data-an-tone'), v: document.documentElement.getAttribute('data-v'), tc: document.querySelector('meta[name="theme-color"]').content, bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(), saved: JSON.parse(localStorage.getItem('an-x')).tone }));
    ok('theme paper: tone, version B, theme-color, saved', paper.tone === 'paper' && paper.v === 'b' && paper.tc === '#F5EEDC' && /F5EEDC/i.test(paper.bg) && paper.saved === 'paper', JSON.stringify(paper));
    await page.click('#an-x .an-x-th-contrast');
    await page.waitForTimeout(800);
    const con = await page.evaluate(() => ({ tone: document.documentElement.getAttribute('data-an-tone'), v: document.documentElement.getAttribute('data-v'), tc: document.querySelector('meta[name="theme-color"]').content, sky: getComputedStyle(document.querySelector('.an-sky') || document.body).display }));
    ok('theme contrast: tone, version A, black theme-color, sky hidden', con.tone === 'contrast' && con.v === 'a' && con.tc === '#000000' && con.sky === 'none', JSON.stringify(con));
    // font size
    await page.click('#an-x [data-x="fs+"]');
    await page.click('#an-x [data-x="fs+"]');
    const fs1 = await page.evaluate(() => ({ v: document.documentElement.style.getPropertyValue('--an-fs'), out: document.querySelector('#an-x-fs').textContent, px: getComputedStyle(document.querySelector('.an-post-body')).fontSize }));
    ok('text size: two steps up = 125%', fs1.v === '1.25' && /۱۲۵/.test(fs1.out), JSON.stringify(fs1));
    await snap(page, '02-panel-contrast.png');
    // A/B button ends the extra theme
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    ok('Escape closes the panel', await page.evaluate(() => !document.querySelector('#an-x.on')));
    await page.click('#an-bar .an-ab-btn');
    await page.waitForTimeout(800);
    const ab = await page.evaluate(() => ({ tone: document.documentElement.getAttribute('data-an-tone'), v: document.documentElement.getAttribute('data-v'), saved: JSON.parse(localStorage.getItem('an-x')).tone }));
    ok('template A/B switch ends the contrast theme', !ab.tone && ab.v === 'b' && !ab.saved, JSON.stringify(ab));
    // R key toggles
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    ok('R opens the panel', await page.evaluate(() => !!document.querySelector('#an-x.on')));
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    ok('R closes it again', await page.evaluate(() => !document.querySelector('#an-x.on')));
    // focus mode
    await page.keyboard.press('f');
    await page.waitForTimeout(300);
    const foc = await page.evaluate(() => ({ attr: document.documentElement.hasAttribute('data-an-focus'), toc: getComputedStyle(document.querySelector('.an-toc') || document.body).display }));
    ok('F: focus mode on, contents hidden', foc.attr && foc.toc === 'none', JSON.stringify(foc));
    await snap(page, '03-focus.png');
    await page.keyboard.press('f');
    await page.waitForTimeout(200);
    ok('F again: focus mode off', await page.evaluate(() => !document.documentElement.hasAttribute('data-an-focus')));
    // listen (stub voice)
    ok('listen: button shown for an on-device Persian voice', await page.evaluate(() => [...document.querySelectorAll('.an-x-listen-slot')].some(s => !s.hidden)));
    await page.click('.an-toc-tools [data-x="listen"]');
    await page.waitForTimeout(500);
    const ls = await page.evaluate(() => ({ bar: !!document.querySelector('.an-x-player.on'), said: (window.__spoken || []).length, hl: !!document.querySelector('.an-x-say') }));
    ok('listen: player bar, sentences spoken, paragraph highlighted', ls.bar && ls.said > 0 && ls.hl, JSON.stringify(ls));
    await page.click('.an-x-player [data-s="stop"]');
    await page.waitForTimeout(200);
    ok('listen: stop hides the player', await page.evaluate(() => !document.querySelector('.an-x-player.on')));
    // mark
    await page.click('.an-toc-tools [data-x="mark"]');
    const mk = await page.evaluate(() => JSON.parse(localStorage.getItem('an-x-marks') || '[]'));
    ok('mark: saved with title', mk.length === 1 && !!mk[0].t, JSON.stringify(mk[0] || {}));
    // ruler
    await page.evaluate(() => window.AN.x.open());
    await page.click('#an-x [data-x="ruler"]');
    await page.keyboard.press('Escape');
    await page.mouse.move(600, 500);
    await page.waitForTimeout(200);
    const ru = await page.evaluate(() => { const r = document.querySelector('.an-x-ruler'); return r && { hidden: r.hidden, y: r.style.getPropertyValue('--y'), h: r.style.getPropertyValue('--h') }; });
    ok('ruler: on, follows the pointer', ru && !ru.hidden && ru.y === '500px' && !!ru.h, JSON.stringify(ru));
    await snap(page, '04-ruler.png');
    await page.evaluate(() => { window.AN.x.open(); document.querySelector('#an-x [data-x="ruler"]').click(); window.AN.closeDlg(); });
    // QR
    await page.keyboard.press('q');
    await page.waitForSelector('#an-x-qr.on .an-x-qr-img svg', { timeout: 10000 });
    await page.addScriptTag({ path: JSQR });
    const qr = await page.evaluate(async () => {
      const svg = document.querySelector('#an-x-qr .an-x-qr-img svg').outerHTML.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" ');
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 400, 400);
      const d = x.getImageData(0, 0, 400, 400), r = window.jsQR(d.data, 400, 400);
      return { got: r && r.data, want: location.href.split('#')[0].split('?')[0] };
    });
    ok('QR: decodes to this page address', qr.got === qr.want, JSON.stringify(qr));
    // and the pixels on screen, as a phone camera would see them (page styles applied)
    const shot = (await page.locator('#an-x-qr .an-x-qr-img').screenshot()).toString('base64');
    const qr2 = await page.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const r = window.jsQR(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
      return r && r.data;
    }, shot);
    ok('QR: the code as drawn on screen decodes too', qr2 === qr.want, String(qr2));
    await snap(page, '05-qr.png');
    await page.keyboard.press('Escape');
    // cite
    await page.evaluate(() => document.querySelector('.an-x-after [data-x="cite"]').click());
    await page.waitForSelector('#an-x-cite.on');
    const [cite, href] = await page.evaluate(() => [document.querySelector('#an-x-cite textarea').value, location.href.split('#')[0]]);
    ok('cite: APA text with author, blog and address', /^همتی، امیرحسین\. \(/.test(cite) && /آینده‌نگار\./.test(cite) && cite.includes(href), cite);
    await page.keyboard.press('Escape');
    // quiz
    const qz = await page.evaluate(() => ({ n: document.querySelectorAll('.an-x-quiz .an-x-q').length, kinds: [...document.querySelectorAll('.an-x-quiz .an-x-q')].map(f => f.className.replace(/an-x-q /, '').trim()) }));
    ok('quiz: 2 to 5 questions after the article', qz.n >= 2 && qz.n <= 5, JSON.stringify(qz));
    await page.evaluate(() => document.querySelector('.an-x-quiz').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    await snap(page, '06-quiz.png');
    // the right answers are not readable from outside the toolkit, so each question gets its first option
    await page.evaluate(() => document.querySelectorAll('.an-x-quiz .an-x-q').forEach(f => f.querySelector('input').click()));
    await page.click('.an-x-quiz [type="submit"]');
    const res = await page.evaluate(() => ({ score: document.querySelector('.an-x-score').textContent, fb: [...document.querySelectorAll('.an-x-fb')].every(p => p.textContent.length > 3), saved: JSON.parse(localStorage.getItem('an-x-quiz') || '{}'), ok: document.querySelectorAll('.an-x-q label.ok').length }));
    ok('quiz: scored, feedback on each, result saved, right answer marked', /از/.test(res.score) && res.fb && Object.keys(res.saved).length === 1 && res.ok === qz.n, JSON.stringify(res));
    await snap(page, '07-quiz-checked.png');
    await page.click('.an-x-quiz .an-x-qfoot button');
    ok('quiz: «new questions» rebuilds the form', await page.evaluate(() => !document.querySelector('.an-x-q.ok, .an-x-q.no') && document.querySelectorAll('.an-x-q').length >= 2));
    // passport stamp: scroll to the end and wait
    await page.evaluate(() => window.scrollTo(0, document.querySelector('.an-x-end').getBoundingClientRect().top + scrollY - 200));
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollBy(0, 5));
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ read: JSON.parse(localStorage.getItem('an-x-read') || '{}'), seal: document.querySelector('#an-x-seal').className }));
    ok('passport: stamp after reading to the end', Object.keys(st.read).length === 1 && /stamp/.test(st.seal), JSON.stringify(st));
    // position saved for «continue reading»
    await page.evaluate(() => { const b = document.querySelector('.an-post-body'); window.scrollTo(0, b.getBoundingClientRect().top + scrollY + b.offsetHeight * 0.4); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollBy(0, 30));
    await page.waitForTimeout(400);
    const pos = await page.evaluate(() => JSON.parse(localStorage.getItem('an-x-pos') || '{}'));
    ok('resume: reading position saved', Object.keys(pos).length === 1, JSON.stringify(pos));
    await page.goto(BASE + 'post-1.html', { waitUntil: 'load' });
    await ready(page);
    await page.waitForTimeout(500);
    ok('resume: bar offered on the next visit', await page.evaluate(() => !!document.querySelector('.an-x-resume.on')));
    await snap(page, '08-resume.png');
    await page.click('.an-x-resume [data-r="go"]');
    await page.waitForTimeout(400);
    ok('resume: «continue» scrolls down the article', await page.evaluate(() => scrollY > 800));
    // the panel reflects the saved read + mark
    await page.evaluate(() => window.AN.x.open());
    const pp = await page.evaluate(() => ({ on: document.querySelectorAll('#an-x .an-x-st.on').length, marks: document.querySelectorAll('#an-x .an-x-mlist li').length }));
    ok('panel: passport shows 1 stamp, 1 mark', pp.on === 1 && pp.marks === 1, JSON.stringify(pp));
    await page.keyboard.press('Escape');
    // home page badges
    // the first article is on the home page only while the blog has no more posts than fit there; after that its
    // card is on the page of its category
    let cardPage = 'index.html';
    for (const f of ['index.html', 'cat-1.html', 'cat-2.html', 'cat-3.html', 'cat-4.html', 'cat-5.html', 'cat-6.html', 'cat-7.html']) {
      await page.goto(BASE + f, { waitUntil: 'load' });
      await ready(page);
      if (await page.evaluate(() => !!document.querySelector('a.an-card[href*="post-1.html"]'))) { cardPage = f; break; }
    }
    ok('home: read and marked badges on the card (' + cardPage + ')', await page.evaluate(() => document.querySelectorAll('.an-x-badge').length >= 2));
    await snap(page, '09-home-badges.png');
    // wipe
    await page.evaluate(() => window.AN.x.open());
    await page.click('#an-x [data-x="wipe"]');
    await page.waitForTimeout(700);
    const wiped = await page.evaluate(() => ['an-x', 'an-x-read', 'an-x-quiz', 'an-x-marks', 'an-x-pos'].map(k => localStorage.getItem(k)));
    ok('wipe: all toolkit data removed', wiped.every(v => v === null || v === '{}' ), JSON.stringify(wiped));
    ok('post/home: no console errors', errors.length === 0, errors.slice(0, 6).join(' | '));
    await ctx.close();
  }
  /* 2. paper theme before first paint, archive and About */
  {
    G = 'pages';
    const { ctx, page, errors } = await fresh();
    await page.goto(BASE + 'archive.html', { waitUntil: 'load' });
    await page.evaluate(() => localStorage.setItem('an-x', JSON.stringify({ tone: 'paper', fs: 1.12 })));
    await page.goto(BASE + 'archive.html', { waitUntil: 'commit' });
    const early = await page.evaluate(() => ({ tone: document.documentElement.getAttribute('data-an-tone'), v: document.documentElement.getAttribute('data-v') }));
    ok('early.js: saved paper theme set before the first paint', early.tone === 'paper' && early.v === 'b', JSON.stringify(early));
    await ready(page);
    ok('archive: toolkit button present', await page.evaluate(() => !!document.querySelector('#an-bar .an-x-btn')));
    ok('archive: custom box takes no room', await page.evaluate(() => [...document.querySelectorAll('.an-custom')].every(c => getComputedStyle(c).display === 'none')));
    await snap(page, '10-archive-paper.png');
    await page.goto(BASE + 'page-about.html', { waitUntil: 'load' });
    await ready(page);
    ok('about: toolkit button, box hidden, paper theme kept', await page.evaluate(() => !!document.querySelector('#an-bar .an-x-btn') && getComputedStyle(document.querySelector('.an-custom')).display === 'none' && document.documentElement.getAttribute('data-an-tone') === 'paper'));
    await page.goto(BASE + 'post-2.html?v=a', { waitUntil: 'load' });
    await ready(page);
    ok('?v=a shows version A over the saved paper theme', await page.evaluate(() => !document.documentElement.getAttribute('data-an-tone') && document.documentElement.getAttribute('data-v') === 'a'));
    ok('archive/about: no console errors', errors.length === 0, errors.slice(0, 6).join(' | '));
    await ctx.close();
  }
  /* 3. a box showing the bare tag (if a template ever leaves it unfilled) */
  {
    G = 'tag';
    const { ctx, page } = await fresh();
    await page.route(/page-about\.html$/, async r => { const res = await r.fetch(); let b = await res.text(); b = b.replace(/<div class="an-custom">[\s\S]*?<\/script>\s*<\/div>/, '<div class="an-custom">&lt;-BlogCustomHtml-&gt;</div>'); r.fulfill({ response: res, body: b }); });
    await page.goto(BASE + 'page-about.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.AN && window.AN.ok);
    ok('unfilled tag text stays hidden', await page.evaluate(() => { const c = document.querySelector('.an-custom'); return /BlogCustomHtml/.test(c.textContent) && getComputedStyle(c).display === 'none'; }));
    await ctx.close();
  }
  /* 4. mobile */
  {
    G = 'phone';
    const { ctx, page, errors } = await fresh({ viewport: { width: 390, height: 844 }, touch: true, mobile: true });
    await page.goto(BASE + 'post-3.html', { waitUntil: 'load' });
    await ready(page);
    await page.click('#an-bar .an-x-btn');
    await page.waitForSelector('#an-x.on');
    await page.waitForTimeout(500);
    const sheet = await page.evaluate(() => { const b = document.querySelector('#an-x .an-dlg-box').getBoundingClientRect(); return { w: Math.round(b.width), bottom: Math.round(b.bottom), h: Math.round(b.height), vh: innerHeight, sw: document.documentElement.scrollWidth }; });
    ok('mobile: panel is a full-width bottom sheet, no sideways scroll', sheet.w >= 380 && sheet.bottom <= sheet.vh && sheet.sw <= 390, JSON.stringify(sheet));
    await snap(page, '11-panel-mobile.png');
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await snap(page, '12-mobile-end.png');
    ok('mobile: no sideways scroll at the end of the article', await page.evaluate(() => document.documentElement.scrollWidth <= 390));
    ok('mobile: no console errors', errors.length === 0, errors.slice(0, 6).join(' | '));
    await ctx.close();
  }
  /* 5. reduced motion */
  {
    G = 'motion';
    const { ctx, page } = await fresh({ rm: true });
    await page.goto(BASE + 'post-4.html', { waitUntil: 'load' });
    await ready(page);
    ok('reduced motion: AN.rm stays true and the motion switch is disabled', await page.evaluate(() => { window.AN.x.open(); const i = document.querySelector('#an-x input[data-p="motion"]'); return window.AN.rm === true && i.disabled && !i.checked; }));
    await ctx.close();
  }
} catch (e) {
  G = 'run'; ok('script ran to the end', false, String(e && e.stack || e).slice(0, 600));
} finally {
  await browser.close();
  server.close();
}
const failed = results.filter(r => !r.pass).length;
fs.writeFileSync(path.join(ROOT, 'quality', CDN ? 'toolkit-cdn-results.json' : 'toolkit-results.json'), JSON.stringify({ generated: new Date().toISOString(), browser: 'Chromium (Playwright)', box: CDN ? 'dist/box.html' : 'dist/box-local.html', passed: results.length - failed, failed, results }, null, 1));
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
