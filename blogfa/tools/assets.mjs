#!/usr/bin/env node
/* آینده‌نگار · image pack.
   Renders, in headless Chromium, with the same generative cover code the template uses (src/js/covers.js)
   and the Vazirmatn font from node_modules:
     assets/logo/    logo-mark.svg, logo-512.png, logo-wide.png
     assets/covers/  one 1600×1000 cover per post (JPEG), to put at the top of a post if wanted
     assets/social/  one 1200×630 card per post plus blog.jpg, for sharing links on social apps
   Usage:  NODE_PATH=$(npm root -g) node tools/assets.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets');
const require = createRequire(import.meta.url);
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { console.error('Playwright not found. Run: NODE_PATH=$(npm root -g) node tools/assets.mjs'); process.exit(1); }

const CREDIT = 'طراحی، مدیریت و نویسندگی: امیرحسین همتی';
const BLOG = { title: 'آینده‌نگار', slogan: 'روایت انسان، ایده و فناوری', en: 'AYANDEH·NEGAR' };

function front(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^<!--([\s\S]*?)-->\s*/);
  const meta = {};
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^\s*([a-z_]+)\s*:\s*(.*)$/i); if (k) meta[k[1].toLowerCase()] = k[2].trim(); }
  return meta;
}
const posts = fs.readdirSync(path.join(ROOT, 'posts')).filter(f => /^\d\d-[\w-]+\.html$/.test(f)).sort().map(f => {
  const meta = front(path.join(ROOT, 'posts', f));
  return { slug: f.replace(/\.html$/, ''), n: parseInt(f, 10), topic: f.slice(3, -5), title: meta.title || f, category: meta.category || '' };
});

// the logo mark exactly as the template draws it, with a fixed ink colour instead of currentColor
const logoHtml = fs.readFileSync(path.join(ROOT, 'src/partials/logo.html'), 'utf8');
const markSvg = (logoHtml.match(/<svg[\s\S]*?<\/svg>/) || [''])[0].replace(/@ID@/g, '').replace(/currentColor/g, '#F4F1EA');
const markInner = markSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="512" height="512"><rect width="40" height="40" rx="10" fill="#04060D"/><g transform="translate(4 4)">${markInner}</g></svg>`;

const font = w => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'node_modules/vazirmatn/fonts/webfonts', `Vazirmatn-${w}.woff2`)).toString('base64');
const harness = `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><style>
@font-face{font-family:Vaz;src:url(${font('Regular')}) format("woff2");font-weight:400}
@font-face{font-family:Vaz;src:url(${font('Bold')}) format("woff2");font-weight:700}
@font-face{font-family:Vaz;src:url(${font('Black')}) format("woff2");font-weight:900}
body{margin:0;background:#000;font-family:Vaz}</style><body>
<script>${fs.readFileSync(path.join(ROOT, 'src/js/covers.js'), 'utf8')}</script>
<script>
var TILE = ${JSON.stringify(tileSvg)};
function img(src) { return new Promise(function (ok, no) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = no; i.src = src; }); }
function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function wrap(c, text, maxW) {
  var words = text.split(' '), lines = [], cur = '';
  for (var i = 0; i < words.length; i++) { var t = cur ? cur + ' ' + words[i] : words[i]; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function rtl(c, size, weight, color) { c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'alphabetic'; c.font = weight + ' ' + size + 'px Vaz'; c.fillStyle = color; }
async function fontsReady() { await Promise.all(['400', '700', '900'].map(function (w) { return document.fonts.load(w + ' 40px Vaz', 'آینده‌نگار'); })); }
window.cover = async function (topic, seed, w, h) { var cv = canvas(w, h); AN.cover(cv, topic, seed, { w: w, h: h, dpr: 1 }); return cv.toDataURL('image/jpeg', 0.9); };
window.social = async function (o) {
  await fontsReady();
  var W = 1200, H = 630, cv = canvas(W, H), c = cv.getContext('2d'), P = AN.coverPalette[o.topic] || AN.coverPalette.def;
  AN.cover(cv, o.topic, o.seed, { w: W, h: H, dpr: 1, banner: true });
  var g = c.createLinearGradient(W, 0, W * 0.3, 0); g.addColorStop(0, 'rgba(3,5,12,.92)'); g.addColorStop(0.55, 'rgba(3,5,12,.72)'); g.addColorStop(1, 'rgba(3,5,12,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  var x = W - 72, tile = await img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(TILE));
  if (o.big) c.drawImage(tile, x - 72, 58, 72, 72);
  else {
    c.drawImage(tile, x - 56, 58, 56, 56);
    rtl(c, 30, 900, '#F4F1EA'); c.fillText(${JSON.stringify(BLOG.title)}, x - 72, 88);
    rtl(c, 18, 400, 'rgba(244,241,234,.66)'); c.fillText(${JSON.stringify(BLOG.slogan)}, x - 72, 114);
  }
  var y = o.big ? 300 : 236;
  if (o.kicker) { rtl(c, 24, 700, P[0]); c.fillText(o.kicker, x, y); y += 28; }
  rtl(c, o.big ? 88 : 54, 900, '#FFFFFF');
  var lines = wrap(c, o.title, o.big ? 640 : 690).slice(0, 3), lh = o.big ? 112 : 78;
  for (var i = 0; i < lines.length; i++) { y += lh; c.fillText(lines[i], x, y); }
  if (o.sub) { rtl(c, 28, 400, 'rgba(244,241,234,.8)'); y += 58; c.fillText(o.sub, x, y); }
  c.fillStyle = P[0]; c.fillRect(x - 64, H - 92, 64, 4);
  rtl(c, 20, 700, 'rgba(244,241,234,.85)'); c.fillText(${JSON.stringify(CREDIT)}, x, H - 52);
  return cv.toDataURL('image/jpeg', 0.9);
};
window.logo = async function () { var cv = canvas(512, 512), c = cv.getContext('2d'); c.drawImage(await img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(TILE)), 0, 0, 512, 512); return cv.toDataURL('image/png'); };
window.wide = async function () {
  await fontsReady();
  var W = 1200, H = 400, cv = canvas(W, H), c = cv.getContext('2d');
  c.fillStyle = '#04060D'; c.fillRect(0, 0, W, H);
  c.drawImage(await img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(TILE)), W - 96 - 200, 100, 200, 200);
  var x = W - 96 - 240;
  rtl(c, 104, 900, '#F4F1EA'); c.fillText(${JSON.stringify(BLOG.title)}, x, 222);
  rtl(c, 30, 400, 'rgba(244,241,234,.7)'); c.fillText(${JSON.stringify(BLOG.slogan)}, x, 278);
  c.direction = 'ltr'; c.textAlign = 'right'; c.font = '700 22px Vaz'; c.fillStyle = '#53E0E0'; c.fillText(${JSON.stringify(BLOG.en)}, x, 318);
  return cv.toDataURL('image/png');
};
window.ready = true;
</script></body></html>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'an-assets-'));
const page0 = path.join(tmp, 'harness.html');
fs.writeFileSync(page0, harness);
const save = (rel, dataUrl) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(dataUrl.split(',')[1], 'base64')); return f; };

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(page0).href);
  await page.waitForFunction(() => window.ready && window.AN && window.AN.cover);
  fs.mkdirSync(path.join(OUT, 'logo'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'logo/logo-mark.svg'), tileSvg + '\n');
  const out = [path.join(OUT, 'logo/logo-mark.svg')];
  out.push(save('logo/logo-512.png', await page.evaluate(() => window.logo())));
  out.push(save('logo/logo-wide.png', await page.evaluate(() => window.wide())));
  for (const p of posts) {
    out.push(save(`covers/${p.slug}.jpg`, await page.evaluate(a => window.cover(a.topic, a.n, 1600, 1000), p)));
    out.push(save(`social/${p.slug}.jpg`, await page.evaluate(a => window.social({ topic: a.topic, seed: a.n, title: a.title, kicker: a.category }), p)));
  }
  out.push(save('social/blog.jpg', await page.evaluate(b => window.social({ topic: 'space', seed: 7, title: b.title, sub: b.slogan, kicker: 'مجله‌ای آنلاین درباره‌ی فردا', big: true }), BLOG)));
  for (const f of out) console.log(path.relative(ROOT, f).padEnd(34), (fs.statSync(f).size / 1024).toFixed(0).padStart(5), 'KB');
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
