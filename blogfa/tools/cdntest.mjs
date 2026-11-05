#!/usr/bin/env node
/* آینده‌نگار · cdntest — how the CDN templates load their stylesheet and script, in Chromium (Playwright).
   Pages of the CDN preview are opened while tools/cdnroute.mjs answers the CDN addresses from dist/cdn/: once
   normally, then for each way the first addresses can fail (blocked, 404, altered bytes that Subresource Integrity
   must refuse, several addresses down, every address down), and for templates whose tags lost their integrity and
   crossorigin attributes, or were removed, in an editor. Each case checks which address served each file, that the stylesheet
   applies, that the page booted exactly once, that the post's lab mounted, that the warning bar shows only when
   nothing could be loaded, and that no script error happened. When the preview holds the reader's toolkit (the code
   for Blogfa's custom-code box, dist/box.html), its two files go through the same addresses, backups and integrity
   checks: each case also checks which address served them and that the toolkit started.
     node tools/build.mjs --unverified   (or a verified build)
     node tools/preview.mjs --template dist/template-cdn.html --out preview-cdn
     node tools/cdntest.mjs [--preview preview-cdn] */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { routeCdn } from './cdnroute.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PREVIEW = path.resolve(ROOT, arg('preview', 'preview-cdn'));
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(process.env.NODE_PATH || '', 'playwright'))); }
if (!fs.existsSync(path.join(PREVIEW, 'index.html'))) { console.error(`${path.relative(ROOT, PREVIEW)}/ is missing. Run: node tools/preview.mjs --template dist/template-cdn.html --out preview-cdn`); process.exit(1); }
if (!/<script\b[^>]*\bid="an-script"/.test(fs.readFileSync(path.join(PREVIEW, 'index.html'), 'utf8'))) { console.error('that preview was not made from a CDN template'); process.exit(1); }

let pass = 0, fail = 0;
const results = [];
const ok = (name, cond, info = '') => { results.push({ name, pass: !!cond, info }); if (cond) pass++; else fail++; console.log((cond ? '✓ ' : '✗ ') + name + (info ? '  — ' + info : '')); };

// The toolkit's own files are counted apart from the template's stylesheet and script.
const TOOLKIT = /^an-(addons|qr)\./;
const BOX = fs.readFileSync(path.join(PREVIEW, 'index.html'), 'utf8').includes('AN_X_OPT');
const ADDONS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'dist', 'build-report.json'), 'utf8')).addons || {}; } catch (e) { return {}; } })();
// the address that should serve a file: the first one the case does not make fail (a refused copy counts as failed)
const firstGood = (c, file) => { let m = 0; while (m < 4 && c.fail(m, file)) m++; return m; };

// Copies of a page whose CDN tags lost attributes, as an over-eager editor might leave them.
const STRIPPED = [];
function stripped(file, what) {
  const name = `_strip-${what}-${file}`;
  let s = fs.readFileSync(path.join(PREVIEW, file), 'utf8');
  s = s.replace(/(<(?:link|script)[^>]*\bid="an-(?:css|script)"[^>]*>)/g, tag => {
    if (what === 'tags') return '';
    let t = tag.replace(/\scrossorigin="anonymous"/, '');
    if (what === 'both') t = t.replace(/\sintegrity="[^"]*"/, '');
    return t;
  });
  fs.writeFileSync(path.join(PREVIEW, name), s);
  STRIPPED.push(name);
  return name;
}

const PAGES = ['index.html', 'post-1.html', 'archive.html', 'page-about.html'];
const abort0 = m => (m === 0 ? 'abort' : null);
const CASES = [
  { name: 'normal', fail: () => null, via: [0, 0] },
  { name: 'first address blocked', fail: abort0, via: [1, 1] },
  { name: 'first address answers 404', fail: m => (m === 0 ? '404' : null), via: [1, 1] },
  { name: 'first address sends altered bytes (integrity must refuse them)', fail: m => (m === 0 ? 'tamper' : null), via: [1, 1], sri: true },
  { name: 'two addresses down', fail: m => (m <= 1 ? 'abort' : null), via: [2, 2] },
  { name: 'three addresses down', fail: m => (m <= 2 ? 'abort' : null), via: [3, 3] },
  { name: 'only the script fails at the first address', fail: (m, f) => (m === 0 && f.endsWith('.js') ? 'abort' : null), via: [0, 1] },
  { name: 'only the stylesheet fails at the first address', fail: (m, f) => (m === 0 && f.endsWith('.css') ? 'abort' : null), via: [1, 0] },
  { name: 'every address down', fail: () => 'abort', down: true },
  { name: 'editor dropped crossorigin (integrity then refuses the first copy)', fail: () => null, via: [1, 1], page: f => stripped(f, 'cors'), sri: true },
  { name: 'editor dropped crossorigin and integrity', fail: () => null, via: [0, 0], page: f => stripped(f, 'both'), noCors: true },
  { name: 'editor removed both tags (the loader adds them back)', fail: () => null, via: [0, 0], page: f => stripped(f, 'tags') }
];

// Messages the browser itself prints when an address fails; anything else in the console is a real error.
const EXPECTED = /Failed to load resource|net::ERR_FAILED|integrity|status of 404/i;

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    for (const c of CASES) {
      for (const base of PAGES) {
        const file = c.page ? c.page(base) : base;
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'fa-IR' });
        const log = await routeCdn(ctx, { fail: c.fail });
        const page = await ctx.newPage(), errs = [], noise = [];
        page.on('pageerror', e => errs.push('pageerror: ' + e.message));
        page.on('console', m => { if (m.type() === 'error') (EXPECTED.test(m.text()) ? noise : errs).push(m.text()); });
        await page.goto(pathToFileURL(path.join(PREVIEW, file)).href, { waitUntil: 'load' });
        if (c.down) await page.waitForSelector('[role=alert]', { timeout: 20000 }).catch(() => {});
        else await page.waitForFunction(() => window.AN && window.AN.ok, null, { timeout: 15000 }).catch(() => {});
        if (BOX && !c.down) await page.waitForFunction(() => window.AN && window.AN.x, null, { timeout: 15000 }).catch(() => {});
        if (base === 'post-1.html' && !c.down) {
          await page.evaluate(() => { const l = document.querySelector('.an-lab'); if (l) l.scrollIntoView(); });
          await page.waitForFunction(() => { const l = document.querySelector('.an-lab'); return !l || l.classList.contains('on'); }, null, { timeout: 8000 }).catch(() => {});
        }
        await page.waitForTimeout(300);
        const s = await page.evaluate(() => {
          const A = window.AN || {}, lab = document.querySelector('.an-lab');
          return {
            ok: !!A.ok, via: A.via ? [A.via.css, A.via.js] : null, fail: A.fail, wait: A.wait,
            css: getComputedStyle(document.documentElement).getPropertyValue('--font').trim().length > 0,
            ready: document.documentElement.classList.contains('an-ready'),
            fabs: document.querySelectorAll('.an-fab').length,
            lab: lab ? lab.classList.contains('on') && lab.querySelectorAll('.an-lab-root *').length > 4 : null,
            banner: !!document.querySelector('[role=alert]'),
            credit: /طراحی، مدیریت و نویسندگی/.test(document.body.innerText),
            x: !!(A.x && A.x.v)
          };
        });
        const problems = [], tpl = log.filter(r => !TOOLKIT.test(r.file));
        let toolkit = '';
        if (BOX) {
          const kit = log.filter(r => /^an-addons\./.test(r.file));
          if (c.down) {
            if (s.x) problems.push('toolkit started although no address worked');
            const tried = kit.filter(r => r.how === 'abort').length;
            if (tried !== 8) problems.push(`${tried} toolkit requests, expected 8 (two files × four addresses)`);
          } else {
            if (!s.x) problems.push('toolkit did not start');
            const want = [ADDONS.css, ADDONS.js].map(f => '0123'.slice(0, firstGood(c, f || '') + 1));
            const asked = ['.css', '.js'].map(x => kit.filter(r => r.file.endsWith(x)).map(r => r.mirror).join(''));
            if (String(asked) !== String(want)) problems.push(`toolkit addresses asked ${asked}, expected ${want}`);
            toolkit = `; toolkit css #${asked[0].slice(-1)}, js #${asked[1].slice(-1)}`;
          }
        }
        if (c.down) {
          if (s.ok) problems.push('booted although no address worked');
          if (s.fail !== 2) problems.push(`AN.fail ${s.fail}, expected 2`);
          if (!s.banner) problems.push('no warning bar');
          if (!s.credit) problems.push('credit not in the page text');
          // the preloaded font is asked for too; only the stylesheet and the script go through the loader's backups
          const tried = tpl.filter(r => r.how === 'abort' && /\.(css|js)$/.test(r.file)).length;
          if (tried !== 8) problems.push(`${tried} stylesheet and script requests, expected 8 (two files × four addresses)`);
        } else {
          if (!s.ok || !s.ready) problems.push('boot did not finish');
          if (String(s.via) !== String(c.via)) problems.push(`served by ${s.via}, expected ${c.via}`);
          if (s.fail !== 0) problems.push('AN.fail ' + s.fail);
          if (!s.css) problems.push('stylesheet not applied');
          if (s.fabs !== 1) problems.push(`booted ${s.fabs} times`);
          if (s.banner) problems.push('warning bar shown');
          if (base === 'post-1.html' && !s.lab) problems.push('lab did not mount');
          // one request per address tried: the first address, then each backup up to the one that served the file
          const asked = ['.css', '.js'].map(x => tpl.filter(r => r.file.endsWith(x)).map(r => r.mirror).join(''));
          const want = c.via.map(v => '0123'.slice(0, v + 1));
          if (String(asked) !== String(want)) problems.push(`addresses asked ${asked}, expected ${want}`);
          if (c.sri && !noise.some(t => /integrity/i.test(t))) problems.push('no integrity refusal reported');
        }
        if (errs.length) problems.push(errs.length + ' error(s): ' + errs.slice(0, 2).join(' | ').slice(0, 240));
        ok(`${c.name} · ${base}`, !problems.length, problems.join('; ') || (c.down ? 'warning bar shown, text readable' : `css from #${s.via[0]}, js from #${s.via[1]}${s.lab ? ', lab on' : ''}${toolkit}`));
        await ctx.close();
      }
    }
  } finally {
    for (const f of STRIPPED) fs.rmSync(path.join(PREVIEW, f), { force: true });
    await browser.close();
  }
  fs.mkdirSync(path.join(ROOT, 'quality'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'quality', 'cdn-results.json'), JSON.stringify({ at: new Date().toISOString(), pass, fail, results }, null, 2));
  console.log(`\n${pass}/${pass + fail} CDN loading checks passed`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
