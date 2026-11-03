#!/usr/bin/env node
/* آینده‌نگار · checks
   1) static checks on dist/: Blogfa tags and blocks, forbidden code, the creator credit, sizes
   2) browser checks on the emulated blog (needs Playwright + Chromium): every page on desktop and mobile —
      console errors, horizontal overflow, labs mount, charts draw, both colour versions — with screenshots.

   node tools/check.mjs                 static + browser (if Playwright is available)
   node tools/check.mjs --static        static only
   node tools/check.mjs --preview DIR   browser checks on another preview folder (default: preview/)
   node tools/check.mjs --shots DIR     where screenshots go (default: quality/screenshots) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const PREVIEW = path.resolve(ROOT, arg('preview', 'preview'));
const SHOTS = path.resolve(ROOT, arg('shots', 'quality/screenshots'));
const results = []; let failed = 0;
const ok = (name, pass, info = '') => { results.push({ name, pass, info }); if (!pass) failed++; console.log(`${pass ? '✓' : '✗'} ${name}${info ? '  — ' + info : ''}`); };

/* ---------- static ---------- */
// Tag and block names documented at blogfa.com/help/Show.aspx?id=template
const TAGS = new Set(('BlogId BlogUrl BlogXmlLink BlogAuthor BlogEmail BlogDescription BlogTitle BlogAndPostTitle BlogArchiveLink BlogTimeZone BlogCustomHtml BlogMetaDescription AutoPageTitle ' +
  'PostTitle PostContent PostDate PostTime PostId PostLink PostAuthor PostAuthorId PostAuthorEmail PostAuthorLink PostCategory PostCategoryId ' +
  'TagName TagLink TagCount CategoryName CategoryLink CategoryId ArchiveTitle ArchiveLink LinkUrl LinkTitle LinkDescription AuthorName AuthorLink ' +
  'BlogPhotoLink BlogAbout BlogProfileLink BlogPreviousPageLink BlogNextPageLink BlogAndPageTitle BlogPageTitle BlogPageLink BlogPageId BlogPageContent').split(' '));
const BLOCKS = new Set(('BLOGFA BlogComment BlogExtendedPost BlogPostTagsBlock BlogPostTags BlogPostCategoriesBlock BlogPostCategories BlogArchiveBlock BlogArchive ' +
  'BlogLinksBlock BlogLinks BlogLinkDumpBlock BlogLinkDump BlogCategoriesBlock BlogCategories BlogTagsBlock BlogTags BlogAuthorsBlock BlogAuthors ' +
  'BlogPreviousItemsBlock BlogPreviousItems BlogProfile BlogPhoto BlogProfileLinkBlock BlogEmailBlock BlogNextAndPreviousBlock BlogPreviousPageBlock BlogNextPageBlock').split(' '));
const FORBIDDEN = [[/\beval\s*\(/, 'eval('], [/document\.write/, 'document.write'], [/window\.open\s*\(/, 'window.open('], [/\batob\s*\(/, 'atob('], [/new\s+Function\s*\(/, 'new Function('],
  [/location\s*\.\s*(href|replace|assign)\s*(=|\()/, 'scripted navigation'], [/(^|[^.\w])location\s*=(?!=)/, 'location='], [/<-/, '"<-" in code'], [/<\/?blog/i, '"<Blog" in code']];

function staticChecks(file) {
  const name = path.basename(file);
  if (!fs.existsSync(file)) return ok(`${name} exists`, false, 'run: node tools/build.mjs');
  const s = fs.readFileSync(file, 'utf8');
  const holders = ['PostTemplate', 'ArchiveTemplate', 'PageTemplate'].map(t => ({ t, m: s.match(new RegExp(`<blog:${t}>([\\s\\S]*?)</blog:${t}>`)) }));
  ok(`${name}: three template holders`, holders.every(h => h.m));
  for (const { t, m } of holders) {
    if (!m) continue;
    const body = m[1];
    const tags = [...body.matchAll(/<-([A-Za-z]+)->/g)].map(x => x[1]);
    const badTags = [...new Set(tags.filter(x => !TAGS.has(x)))];
    ok(`${name} ${t}: only documented <-tags->`, !badTags.length, badTags.join(' '));
    const opens = [...body.matchAll(/<(BLOGFA|Blog[A-Za-z]+)(\s[^>]*)?>/g)].map(x => x[1]);
    const badBlocks = [...new Set(opens.filter(x => !BLOCKS.has(x)))];
    ok(`${name} ${t}: only documented blocks`, !badBlocks.length, badBlocks.join(' '));
    const unbalanced = [...new Set(opens)].filter(b => (body.match(new RegExp(`<${b}[\\s>]`, 'g')) || []).length !== (body.match(new RegExp(`</${b}>`, 'g')) || []).length);
    ok(`${name} ${t}: blocks balanced`, !unbalanced.length, unbalanced.join(' '));
    const code = [...body.matchAll(/<script[^>]*>([\s\S]*?)<\/script>|<style[^>]*>([\s\S]*?)<\/style>/g)].map(x => x[1] || x[2] || '').join('\n');
    const hits = FORBIDDEN.filter(([re]) => re.test(code)).map(x => x[1]);
    ok(`${name} ${t}: no code Blogfa blocks or misreads`, !hits.length, hits.join(', '));
    const credit = (body.match(/طراحی، مدیریت و نویسندگی/g) || []).length;
    ok(`${name} ${t}: creator credit present`, credit >= 1, credit + '×');
    ok(`${name} ${t}: no external scripts`, !/<script[^>]+src=/i.test(body));
    ok(`${name} ${t}: html lang/dir`, /<html lang="fa" dir="rtl"/.test(body));
  }
  ok(`${name}: size`, true, (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB');
}
for (const f of ['template.html', 'template-lite.html']) staticChecks(path.join(ROOT, 'dist', f));

/* ---------- browser ---------- */
async function browserChecks() {
  let chromium;
  try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch (e) { console.log('· Playwright not found; browser checks skipped'); return; }
  if (!fs.existsSync(path.join(PREVIEW, 'index.html'))) { ok('preview exists', false, 'run: node tools/preview.mjs'); return; }
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const files = fs.readdirSync(PREVIEW).filter(f => /^(index|post-\d+|cat-\d+|posts|archive|page-[\w-]+)\.html$/.test(f))
    .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b, 'en', { numeric: true })));
  const VIEWS = [['desktop', { width: 1440, height: 900 }, false], ['mobile', { width: 390, height: 844 }, true]];
  for (const [vn, vp, mobile] of VIEWS) {
    for (const v of ['a', 'b']) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: 'fa-IR' });
      await ctx.addInitScript(ver => { try { localStorage.setItem('an-v', ver); } catch (e) {} }, v);
      for (const f of files) {
        if (v === 'b' && !/^(index|post-1|page-about|archive)\.html$/.test(f)) continue; // version B: a representative sample
        const page = await ctx.newPage(), errs = [];
        page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        page.on('pageerror', e => errs.push(String(e)));
        await page.goto(pathToFileURL(path.join(PREVIEW, f)).href, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        // walk down the page so lazy covers, charts and labs mount
        await page.evaluate(async () => { document.documentElement.style.scrollBehavior = 'auto'; const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 50)); document.documentElement.style.scrollBehavior = ''; });
        await page.waitForTimeout(600);
        const info = await page.evaluate(() => {
          const lab = document.documentElement.getAttribute('data-page') === 'post' ? document.querySelector('.an-lab') : null;
          return {
            ok: !!(window.AN && window.AN.ok), page: document.documentElement.getAttribute('data-page'),
            overflow: document.documentElement.scrollWidth - innerWidth,
            lab: lab ? { on: lab.classList.contains('on'), kids: lab.querySelectorAll('.an-lab-root *').length, failed: /اجرا نشد/.test(lab.textContent) } : null,
            charts: document.querySelectorAll('figure.an-fig svg').length, tables: document.querySelectorAll('table.an-data').length,
            cards: document.querySelectorAll('.an-card').length, toc: document.querySelectorAll('.an-toc li').length,
            credit: /طراحی، مدیریت و نویسندگی/.test(document.body.innerText), broken: !!document.querySelector('[role=alert]')
          };
        });
        const tag = `${vn}/${v} ${f}`;
        const problems = [];
        if (!info.ok) problems.push('boot did not finish');
        if (info.overflow > 1) problems.push(`horizontal overflow ${info.overflow}px`);
        if (info.lab && (!info.lab.on || info.lab.kids < 5 || info.lab.failed)) problems.push('lab did not mount');
        if (info.tables && info.charts < 1 && info.page !== 'home' && info.page !== 'titles' && info.page !== 'list') problems.push('chart missing');
        if (!info.credit) problems.push('credit not visible');
        if (errs.length) problems.push(errs.length + ' console error(s): ' + errs.slice(0, 2).join(' | ').slice(0, 200));
        ok(tag, !problems.length, problems.join('; ') || `${info.page}${info.cards ? ', ' + info.cards + ' cards' : ''}${info.lab ? ', lab ok' : ''}${info.charts ? ', ' + info.charts + ' chart' : ''}`);
        if (/^(index|post-\d+|page-about|archive|posts)\.html$/.test(f)) {
          await page.screenshot({ path: path.join(SHOTS, `${vn}-${v}-${f.replace('.html', '')}.png`), fullPage: false });
          if (/^post-\d+\.html$/.test(f)) {
            const has = await page.$('.an-lab.on');
            if (has) { await has.scrollIntoViewIfNeeded(); await page.waitForTimeout(900); await has.screenshot({ path: path.join(SHOTS, `${vn}-${v}-${f.replace('.html', '')}-lab.png`) }); }
          }
        }
        await page.close();
      }
      await ctx.close();
    }
  }
  await browser.close();
}
if (!arg('static', false)) await browserChecks();
fs.mkdirSync(path.join(ROOT, 'quality'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'quality', 'check-results.json'), JSON.stringify({ at: new Date().toISOString(), failed, results }, null, 2));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
