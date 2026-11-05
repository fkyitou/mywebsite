#!/usr/bin/env node
/* آینده‌نگار · accessibility check
   Runs axe-core (WCAG 2.0/2.1 A and AA rules plus axe best practices) on the preview in both versions, then checks the skip
   link, keyboard flow and reduced motion. Writes quality/a11y-results.json; exits 1 on any violation.

   node tools/preview.mjs && node tools/a11y.mjs        (needs Playwright, like tools/check.mjs)
   node tools/a11y.mjs --cdn    on preview-cdn/ (made from a CDN template), the CDN addresses answered from dist/cdn/
                                by tools/cdnroute.mjs; writes quality/a11y-cdn-results.json */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { routeCdn } from './cdnroute.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CDN = process.argv.includes('--cdn');
const PREVIEW = path.join(ROOT, CDN ? 'preview-cdn' : 'preview');
const require = createRequire(import.meta.url);
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { console.log('Playwright not found; run with NODE_PATH=$(npm root -g)'); process.exit(1); }
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
if (!fs.existsSync(path.join(PREVIEW, 'index.html'))) { console.log('Run: node tools/preview.mjs'); process.exit(1); }

const url = f => pathToFileURL(path.join(PREVIEW, f)).href;
const PAGES = ['index.html', 'post-1.html', 'post-4.html', 'post-6.html', 'post-9.html', 'page-about.html', 'archive.html', 'cat-1.html'];
const RUNS = [];
for (const v of ['a', 'b']) for (const f of PAGES) RUNS.push(['desktop', { width: 1440, height: 900 }, false, v, f]);
for (const v of ['a', 'b']) for (const f of ['index.html', 'post-1.html']) RUNS.push(['mobile', { width: 390, height: 844 }, true, v, f]);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = { at: new Date().toISOString(), axe: [], keyboard: [], motion: [] };
let problems = 0;

for (const [vn, vp, mobile, v, f] of RUNS) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, locale: 'fa-IR' });
  if (CDN) await routeCdn(ctx);
  await ctx.addInitScript(ver => { try { localStorage.setItem('an-v', ver); } catch (e) {} }, v);
  const p = await ctx.newPage();
  await p.goto(url(f), { waitUntil: 'load' }); await p.waitForTimeout(600);
  // walk down so lazy covers, charts and labs mount before the scan
  await p.evaluate(async () => { document.documentElement.style.scrollBehavior = 'auto'; const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } scrollTo(0, 0); });
  await p.waitForTimeout(500);
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async () => {
    const x = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, resultTypes: ['violations', 'incomplete'] });
    return {
      violations: x.violations.map(i => ({ id: i.id, impact: i.impact, nodes: i.nodes.map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').slice(0, 200)) })),
      incomplete: x.incomplete.map(i => ({ id: i.id, n: i.nodes.length })), passes: x.passes.length
    };
  });
  report.axe.push({ run: `${vn}/${v} ${f}`, ...r });
  problems += r.violations.length;
  console.log(`${r.violations.length ? '✗' : '✓'} ${vn}/${v} ${f}  — ${r.violations.length ? r.violations.map(i => i.id + '×' + i.nodes.length).join(', ') : 'no violations'} · ${r.passes} rules passed · needs review: ${r.incomplete.map(i => i.id + '×' + i.n).join(', ') || '—'}`);
  await ctx.close();
}

// keyboard: the first Tab shows the skip link, Enter jumps to main, Tab keeps moving (no trap)
for (const f of ['index.html', 'post-1.html']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (CDN) await routeCdn(ctx);
  const p = await ctx.newPage(); await p.goto(url(f)); await p.waitForTimeout(500);
  await p.keyboard.press('Tab'); await p.waitForTimeout(350);
  const first = await p.evaluate(() => { const a = document.activeElement, cs = getComputedStyle(a), r = a.getBoundingClientRect(); return { cls: a.className, outline: cs.outlineStyle + ' ' + cs.outlineWidth, visible: r.width > 0 && r.height > 0 && r.top >= 0 && r.top < innerHeight }; });
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  const hash = await p.evaluate(() => location.hash);
  const seen = new Set();
  for (let i = 0; i < 60; i++) { await p.keyboard.press('Tab'); seen.add(await p.evaluate(() => { const a = document.activeElement; return a ? a.tagName + '|' + (a.getAttribute('href') || a.textContent || '').trim().slice(0, 40) : ''; })); }
  const ok = first.cls === 'an-skip' && first.visible && first.outline.startsWith('solid') && hash === '#an-main' && seen.size >= 20;
  if (!ok) problems++;
  report.keyboard.push({ page: f, first, hash, distinctStops: seen.size, ok });
  console.log(`${ok ? '✓' : '✗'} keyboard ${f}  — skip link ${first.visible ? 'shown' : 'hidden'}, Enter → ${hash}, ${seen.size} distinct stops in 60 Tabs`);
  await ctx.close();
}

// reduced motion: the flag is set and no CSS animation keeps running
for (const f of ['index.html', 'post-6.html']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  if (CDN) await routeCdn(ctx);
  const p = await ctx.newPage(); await p.goto(url(f)); await p.waitForTimeout(1200);
  const m = await p.evaluate(() => ({ attr: document.documentElement.getAttribute('data-motion'), running: document.getAnimations().filter(a => a.playState === 'running').length }));
  const ok = m.attr === 'reduce' && m.running === 0;
  if (!ok) problems++;
  report.motion.push({ page: f, ...m, ok });
  console.log(`${ok ? '✓' : '✗'} reduced motion ${f}  — data-motion=${m.attr}, ${m.running} running animations`);
  await ctx.close();
}

await browser.close();
fs.mkdirSync(path.join(ROOT, 'quality'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'quality', CDN ? 'a11y-cdn-results.json' : 'a11y-results.json'), JSON.stringify(report, null, 2));
console.log(problems ? `\n${problems} problem(s)` : `\nall ${RUNS.length} axe runs clean; keyboard and reduced-motion checks passed`);
process.exit(problems ? 1 : 0);
