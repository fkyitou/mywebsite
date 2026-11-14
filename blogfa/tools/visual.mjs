#!/usr/bin/env node
/* ==========================================================================
   آینده‌نگار · visual — visual regression test.
   Takes the same screenshots every time (reduced motion, so nothing is mid-animation; the clock frozen, so the
   live panel shows the same numbers; the sky's stars are seeded) and compares each with the stored baseline.
   A screenshot is compared as a grid of 48×27 cells, each the mean colour of its pixels: a cell whose colour
   moved by more than 14 (of 255) on average counts as changed. That catches what a person would call a
   regression (a block moved, vanished, changed colour or size) and ignores film grain and anti-aliasing.
   The baseline is small (quality/visual-baseline.json, a few KB per shot) so it can live in git; the full
   screenshots and a diff image with changed cells outlined go to quality/screenshots/visual/ (not in git).
     node tools/visual.mjs            compare with the baseline  → exit 1 if a shot changed by more than 2 %
     node tools/visual.mjs --update   write a new baseline from the current build
   Run tools/build.mjs and tools/preview.mjs first. Chromium only.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = path.join(ROOT, 'preview'), OUT = path.join(ROOT, 'quality/screenshots/visual'), BASE = path.join(ROOT, 'quality/visual-baseline.json');
const UPDATE = process.argv.includes('--update');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '', 'playwright'))); }

const GW = 48, GH = 27, CELL_DIFF = 14, MAX_CHANGED = 0.02;
const DESK = { width: 1366, height: 768 }, PHONE = { width: 390, height: 844 };
// name, page, version, viewport, where (0 = top, 0.45 = scrolled to 45 % of the page)
const SHOTS = [
  ['home-a-top', 'index.html', 'a', DESK, 0],
  ['home-a-mid', 'index.html', 'a', DESK, 0.45],
  ['home-b-top', 'index.html', 'b', DESK, 0],
  ['post6-a-top', 'post-6.html', 'a', DESK, 0],
  ['post6-a-chart', 'post-6.html', 'a', DESK, 0.4],
  ['post6-b-top', 'post-6.html', 'b', DESK, 0],
  ['archive-a', 'archive.html', 'a', DESK, 0],
  ['about-a', 'page-about.html', 'a', DESK, 0],
  ['phone-home-a', 'index.html', 'a', PHONE, 0],
  ['phone-post1-a', 'post-1.html', 'a', PHONE, 0]
];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tool = await (await browser.newContext()).newPage(); // decodes PNGs and draws diff images on a canvas
const grid = async png => tool.evaluate(async ([b64, GW, GH]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = GW; c.height = GH; const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, GW, GH); // box-filtered mean per cell
  const d = x.getImageData(0, 0, GW, GH).data, out = [];
  for (let i = 0; i < d.length; i += 4) out.push(d[i], d[i + 1], d[i + 2]);
  return out;
}, [png.toString('base64'), GW, GH]);
const diffImage = async (png, changed) => Buffer.from((await tool.evaluate(async ([b64, changed, GW, GH]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const cw = img.width / GW, ch = img.height / GH; x.strokeStyle = '#ff2d55'; x.lineWidth = 3;
  for (const k of changed) x.strokeRect((k % GW) * cw + 1.5, Math.floor(k / GW) * ch + 1.5, cw - 3, ch - 3);
  return c.toDataURL('image/png');
}, [png.toString('base64'), changed, GW, GH])).split(',')[1], 'base64');

const base = UPDATE || !fs.existsSync(BASE) ? { shots: {} } : JSON.parse(fs.readFileSync(BASE, 'utf8'));
const next = { generated: new Date().toISOString(), grid: [GW, GH], cellDiff: CELL_DIFF, shots: {} };
fs.mkdirSync(OUT, { recursive: true });
let failed = 0;
for (const [name, file, v, viewport, where] of SHOTS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport === PHONE, hasTouch: viewport === PHONE, locale: 'fa-IR', reducedMotion: 'reduce' });
  await ctx.addInitScript(v => {
    try { localStorage.setItem('an-v', v); } catch (e) {}
    const T = Date.UTC(2026, 10, 4, 8, 30, 0), D = Date; // 13 آبان ۱۴۰۵، ۱۲:۰۰ تهران
    globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } };
  }, v);
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(PREVIEW, file), { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; });
  if (where) await page.evaluate(w => scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * w)), where);
  await page.waitForTimeout(1500); // covers, charts and the globe draw once they are near the screen
  const png = await page.screenshot();
  await ctx.close();
  fs.writeFileSync(path.join(OUT, name + '.png'), png);
  const g = await grid(png);
  next.shots[name] = Buffer.from(g).toString('base64');
  const old = base.shots[name];
  if (UPDATE || !old) { console.log(`• ${name}  baseline ${UPDATE ? 'written' : 'missing, written'}`); continue; }
  const o = Buffer.from(old, 'base64'), changed = [];
  for (let k = 0; k < GW * GH; k++) { const dd = (Math.abs(g[k * 3] - o[k * 3]) + Math.abs(g[k * 3 + 1] - o[k * 3 + 1]) + Math.abs(g[k * 3 + 2] - o[k * 3 + 2])) / 3; if (dd > CELL_DIFF) changed.push(k); }
  const share = changed.length / (GW * GH), pass = share <= MAX_CHANGED;
  if (!pass) failed++;
  if (changed.length) fs.writeFileSync(path.join(OUT, name + '.diff.png'), await diffImage(png, changed));
  console.log(`${pass ? '✓' : '✗'} ${name}  ${(share * 100).toFixed(1)} % of the screen changed${changed.length ? `  → quality/screenshots/visual/${name}.diff.png` : ''}`);
}
await browser.close();
if (UPDATE || !fs.existsSync(BASE)) { fs.writeFileSync(BASE, JSON.stringify(next, null, 1)); console.log('\nbaseline → quality/visual-baseline.json'); }
else if (Object.keys(base.shots).length !== SHOTS.length) { fs.writeFileSync(BASE, JSON.stringify({ ...base, shots: { ...next.shots, ...base.shots } }, null, 1)); }
console.log(failed ? `\n${failed} shot(s) changed beyond ${MAX_CHANGED * 100} %` : '\nno visual regressions');
process.exit(failed ? 1 : 0);
