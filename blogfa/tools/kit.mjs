#!/usr/bin/env node
/* آینده‌نگار · install and publishing kit.
   Writes kit.html at the package root: one page with a copy button for everything that has to be pasted into
   Blogfa (the template in full, lite and three-part form, the About page, and each post's title, category, tags
   and HTML body), plus a checklist that is kept only in the browser that opens the page.
     node tools/kit.mjs                    → kit.html, a complete document to open from the package folder
     node tools/kit.mjs --fragment <file>  → the same page without <!doctype>, <html>, <head> and <body>,
                                             for a host that adds its own document skeleton
   Run it after tools/build.mjs so the template text is the current build. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fi = process.argv.indexOf('--fragment');
if (fi > -1 && !process.argv[fi + 1]) { console.error('usage: node tools/kit.mjs [--fragment <out.html>]'); process.exit(1); }
const FRAGMENT = fi > -1 ? path.resolve(process.argv[fi + 1]) : '';

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const two = n => fa(String(n).padStart(2, '0'));
const kb = s => fa(Math.max(1, Math.round(Buffer.byteLength(s, 'utf8') / 1024))) + ' کیلوبایت';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const words = html => (html.replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;

for (const f of ['dist/template.html', 'dist/template-lite.html', 'dist/split/1-main-and-posts.html', 'dist/split-lite/1-main-and-posts.html']) {
  if (!fs.existsSync(path.join(ROOT, f))) { console.error(`${f} is missing. Run: node tools/build.mjs`); process.exit(1); }
}

function source(rel) {
  const raw = read(rel), m = raw.match(/^<!--([\s\S]*?)-->\s*/), meta = {};
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^\s*([a-z_]+)\s*:\s*(.*)$/i); if (k) meta[k[1].toLowerCase()] = k[2].trim(); }
  return { meta, body: (m ? raw.slice(m[0].length) : raw).trim() + '\n' };
}

/* ---------- what gets copied ---------- */
const BLOG = {
  user: 'ayandehnegar',
  title: 'آینده‌نگار',
  author: 'امیرحسین همتی',
  desc: 'روایت انسان، ایده و فناوری: ده روایت مستند از آینده، از هوش مصنوعی تا زندگی روی مریخ، هر کدام با یک آزمایشگاه تعاملی.',
  about: 'امیرحسین همتی، هنرجوی پایه‌ی دوازدهم رشته‌ی شبکه و نرم‌افزار رایانه؛ طراح، مدیر و نویسنده‌ی آینده‌نگار.',
  posts: '10'
};
const split = dir => ({ 1: read(dir + '1-main-and-posts.html'), 2: read(dir + '2-archive.html'), 3: read(dir + '3-pages.html') });
const posts = fs.readdirSync(path.join(ROOT, 'posts')).filter(f => /^\d\d-[\w-]+\.html$/.test(f)).sort().map(f => {
  const { meta, body } = source('posts/' + f), tags = (meta.tags || '').split(/\s*[،,]\s*/).filter(Boolean);
  return { n: parseInt(f, 10), title: meta.title || f, cat: meta.category || '', tags, tagsAll: tags.join('، '), body };
});
const about = source('pages/about.html');
const DATA = {
  tpl: { full: read('dist/template.html'), lite: read('dist/template-lite.html') },
  split: { full: split('dist/split/'), lite: split('dist/split-lite/') },
  blog: BLOG,
  page: { title: about.meta.title || 'درباره‌ی آینده‌نگار', slug: 'about', body: about.body },
  posts
};
// '<' is escaped so nothing inside the data (the template holds many </script> tags) can end the script block
const json = JSON.stringify(DATA).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/* ---------- markup helpers ---------- */
const mark = (read('src/partials/logo.html').match(/<svg[\s\S]*?<\/svg>/) || [''])[0].replace(/@ID@/g, 'Kit');
const copyBtn = (key, label, text = 'کپی') => `<button type="button" class="btn" data-copy="${key}" data-label="${esc(label)}">${esc(text)}</button>`;
const field = (k, v, key, label, opts = {}) => `<div class="field${opts.cls ? ' ' + opts.cls : ''}"><div class="field-k">${k}</div><div class="field-v${opts.vcls ? ' ' + opts.vcls : ''}">${v}</div>${key ? copyBtn(key, label, opts.btn) : '<span></span>'}</div>`;
const tick = (id, text) => `<label class="tick" for="${id}"><input type="checkbox" id="${id}" data-step><span>${text}</span></label>`;
const docs = [
  ['01-install-guide', 'راهنمای نصب گام‌به‌گام، با عیب‌یابی'],
  ['02-settings-guide', 'تنظیمات پیشنهادی وبلاگ'],
  ['03-publishing-guide', 'راهنمای انتشار مقاله‌ها و نوشتن مقاله‌ی تازه'],
  ['04-sources-report', 'گزارش پژوهش و منابع'],
  ['05-decision-log', 'ثبت تصمیم‌ها'],
  ['06-qa-report', 'گزارش آزمون کیفیت'],
  ['07-traceability-matrix', 'ماتریس ردیابی نیازمندی‌ها'],
  ['08-final-report', 'گزارش نهایی']
];
const docLink = (slug, label) => `<li><a href="docs/html/${slug}.html">${label}</a></li>`;

const postCards = posts.map((p, i) => `
<li class="post" id="post-${p.n}">
  <div class="post-head">
    <span class="post-n" aria-hidden="true">${two(p.n)}</span>
    <div class="post-t"><h3>${esc(p.title)}</h3><span class="chip">${esc(p.cat)}</span></div>
    ${tick('p' + p.n, 'منتشر شد')}
  </div>
  <div class="rows">
    ${field('عنوان', esc(p.title), `posts.${i}.title`, `عنوان مقاله‌ی ${fa(p.n)}`)}
    ${field('متن مقاله', `کد HTML، ${kb(p.body)}، حدود ${fa(words(p.body))} واژه`, `posts.${i}.body`, `متن مقاله‌ی ${fa(p.n)}`, { vcls: 'muted', btn: 'کپی متن' })}
    ${field('موضوع', esc(p.cat), `posts.${i}.cat`, `موضوع مقاله‌ی ${fa(p.n)}`)}
    ${field('برچسب‌ها', p.tags.map((t, j) => `<button type="button" class="tag" data-copy="posts.${i}.tags.${j}" data-label="برچسب ${esc(t)}">${esc(t)}</button>`).join(''), `posts.${i}.tagsAll`, `برچسب‌های مقاله‌ی ${fa(p.n)}`, { vcls: 'tags', btn: 'کپی همه' })}
  </div>
</li>`).join('');

const STEPS = 5 + posts.length; // blog, template, settings, about and final review, plus one tick per post
const CSS = `
/* Layout: one reading column of install steps in the order Blogfa asks for them; every value to paste sits on a row
   with its copy button, under a sticky bar that counts finished steps. Tokens follow the blog: night first, day second. */
:root {
  color-scheme: dark;
  --bg: #04060D; --surface: #0B1222; --surface-2: #111A2F; --line: #1C2741; --line-2: #27355A;
  --text: #EDF2FA; --muted: #9AA8C0; --cyan: #53E0E0; --accent: #FFB36B; --on-accent: #1A0E04; --ok: #5FD49A; --focus: #FFC27A;
  --font: "Vazirmatn", "Vazir", Tahoma, "Segoe UI", system-ui, sans-serif;
  --mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --r-s: 10px; --r-m: 16px; --wrap: 880px;
}
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) {
  color-scheme: light;
  --bg: #F6F8FB; --surface: #FFFFFF; --surface-2: #F0F4F9; --line: #D8DFEA; --line-2: #C9D3E1;
  --text: #0B1426; --muted: #4A5872; --cyan: #0A7070; --accent: #B4530F; --on-accent: #FFFFFF; --ok: #1C7C4F; --focus: #1F5FD1;
} }
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #F6F8FB; --surface: #FFFFFF; --surface-2: #F0F4F9; --line: #D8DFEA; --line-2: #C9D3E1;
  --text: #0B1426; --muted: #4A5872; --cyan: #0A7070; --accent: #B4530F; --on-accent: #FFFFFF; --ok: #1C7C4F; --focus: #1F5FD1;
}
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 16px; line-height: 1.9; direction: rtl; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--surface); }
#kit { direction: rtl; }
a { color: var(--cyan); text-underline-offset: .25em; }
h1, h2, h3 { line-height: 1.4; text-wrap: balance; margin: 0; }
p { margin: 0; }
.wrap { max-width: var(--wrap); margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.bar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--surface); border-bottom: 1px solid var(--line); }
.bar-in { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 10px; }
.brand { display: flex; align-items: center; gap: 10px; color: var(--text); text-decoration: none; font-weight: 800; }
.brand svg { width: 32px; height: 32px; color: var(--text); flex: none; }
.prog { display: flex; align-items: center; gap: 12px; font-size: .875rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.prog-bar { width: clamp(80px, 22vw, 200px); height: 6px; border-radius: 99px; background: var(--line); overflow: hidden; }
.prog-bar i { display: block; height: 100%; width: 0; background: var(--cyan); border-radius: inherit; transition: width .3s ease; }
.intro { padding-block: 40px 24px; display: grid; gap: 14px; }
.intro .eyebrow { color: var(--accent); font-weight: 700; font-size: .875rem; letter-spacing: .02em; }
.intro h1 { font-size: clamp(1.75rem, 1.2rem + 2.4vw, 2.6rem); font-weight: 900; }
.intro p { color: var(--muted); max-width: 62ch; }
.intro .credit { color: var(--text); font-weight: 700; }
.status { list-style: none; margin: 8px 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.st { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--surface); min-width: 0; }
.st b { display: block; }
.st small { display: block; color: var(--muted); font-size: .8125rem; line-height: 1.7; }
.st .dot { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line-2); margin-top: 3px; display: grid; place-items: center; font-size: 13px; font-weight: 900; color: transparent; }
.st.on { border-color: var(--ok); }
.st.on .dot { background: var(--ok); border-color: var(--ok); color: var(--bg); }
.note { font-size: .875rem; color: var(--muted); }
.step { padding-block: 28px; border-top: 1px solid var(--line); display: grid; gap: 16px; }
.step-h { display: flex; gap: 14px; align-items: baseline; }
.step-n { flex: none; font-weight: 900; color: var(--accent); font-variant-numeric: tabular-nums; font-size: 1.1rem; }
.step h2 { font-size: clamp(1.25rem, 1.05rem + .9vw, 1.6rem); font-weight: 800; }
.step ol, .step ul { margin: 0; padding-inline-start: 1.4em; display: grid; gap: 6px; }
.step ol { list-style-type: persian; }
.path { font-weight: 700; color: var(--text); }
kbd { font-family: var(--mono); font-size: .8em; padding: 1px 6px; border: 1px solid var(--line-2); border-bottom-width: 2px; border-radius: 6px; background: var(--surface-2); }
code { font-family: var(--mono); font-size: .9em; padding: 1px 6px; border-radius: 6px; background: var(--surface-2); direction: ltr; unicode-bidi: isolate; }
.rows { display: grid; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--surface); overflow: hidden; }
.field { display: grid; grid-template-columns: 9.5rem minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 14px; }
.field + .field { border-top: 1px solid var(--line); }
.field-k { color: var(--muted); font-size: .875rem; }
.field-v { min-width: 0; overflow-wrap: anywhere; font-weight: 600; }
.field-v.muted { color: var(--muted); font-weight: 400; font-size: .875rem; }
.field-v.ltr { direction: ltr; text-align: right; font-family: var(--mono); font-weight: 500; }
.field-v.plain { font-weight: 400; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.btn, .tag { font: inherit; cursor: pointer; border-radius: var(--r-s); transition: background .15s ease, border-color .15s ease; }
.btn { border: 1px solid var(--line-2); background: var(--surface-2); color: var(--text); font-weight: 700; font-size: .875rem; padding: 6px 14px; white-space: nowrap; }
.btn:hover { border-color: var(--cyan); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.btn.primary:hover { filter: brightness(1.06); }
.tag { border: 1px dashed var(--line-2); background: transparent; color: var(--text); font-size: .8125rem; padding: 2px 10px; }
.tag:hover { border-style: solid; border-color: var(--cyan); }
.opts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.opt { display: grid; gap: 10px; align-content: start; padding: 16px; border: 1px solid var(--line); border-radius: var(--r-m); background: var(--surface); min-width: 0; }
.opt.rec { border-color: var(--accent); }
.opt h3 { font-size: 1.05rem; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.opt p { color: var(--muted); font-size: .9rem; }
.badge { font-size: .75rem; font-weight: 800; padding: 1px 8px; border-radius: 99px; background: var(--accent); color: var(--on-accent); }
.size { font-size: .8125rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.opt .btn { justify-self: start; }
details.alt { border: 1px solid var(--line); border-radius: var(--r-m); background: var(--surface); }
details.alt > summary { cursor: pointer; padding: 12px 16px; font-weight: 700; }
details.alt[open] > summary { border-bottom: 1px solid var(--line); }
.alt-body { padding: 14px 16px; display: grid; gap: 12px; }
.alt-body .rows { border-radius: var(--r-s); }
.seg { display: inline-flex; border: 1px solid var(--line-2); border-radius: var(--r-s); overflow: hidden; width: max-content; }
.seg label { padding: 4px 14px; cursor: pointer; font-size: .875rem; }
.seg input { position: absolute; opacity: 0; pointer-events: none; }
.seg label:has(input:checked) { background: var(--surface-2); color: var(--cyan); font-weight: 700; }
.seg label:has(input:focus-visible) { outline: 2px solid var(--focus); outline-offset: -2px; }
.tick { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 700; width: fit-content; }
.tick input { width: 20px; height: 20px; accent-color: var(--ok); margin: 0; flex: none; }
.posts { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.post { display: grid; gap: 10px; }
.post-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.post-n { flex: none; width: 2.6rem; height: 2.6rem; border-radius: 12px; display: grid; place-items: center; font-weight: 900; background: var(--surface-2); border: 1px solid var(--line); font-variant-numeric: tabular-nums; }
.post-t { flex: 1 1 16rem; min-width: 0; display: flex; gap: 8px 10px; align-items: center; flex-wrap: wrap; }
.post-t h3 { font-size: 1.05rem; font-weight: 800; }
.chip { font-size: .75rem; padding: 1px 10px; border-radius: 99px; border: 1px solid var(--line-2); color: var(--muted); white-space: nowrap; }
.post.done .post-n { background: var(--ok); color: var(--bg); border-color: var(--ok); }
.post.done .rows { opacity: .62; }
.warn { padding: 12px 16px; border-radius: var(--r-m); border: 1px solid var(--line-2); background: var(--surface-2); font-size: .9rem; }
.docs { columns: 2 16rem; column-gap: 24px; }
.foot { padding-block: 28px 56px; border-top: 1px solid var(--line); color: var(--muted); font-size: .875rem; display: grid; gap: 10px; }
.reset { background: none; border: 0; padding: 0; color: var(--muted); text-decoration: underline; cursor: pointer; font: inherit; width: fit-content; }
.toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(18px + env(safe-area-inset-bottom, 0px)); z-index: 20; max-width: min(92vw, 560px); padding: 10px 18px; border-radius: 12px; background: var(--text); color: var(--bg); font-weight: 700; font-size: .9rem; box-shadow: 0 12px 30px -12px rgba(0, 0, 0, .5); }
dialog { width: min(92vw, 760px); border: 1px solid var(--line-2); border-radius: var(--r-m); background: var(--surface); color: var(--text); padding: 18px; }
dialog::backdrop { background: rgba(0, 0, 0, .55); }
dialog form { display: grid; gap: 12px; }
dialog textarea { width: 100%; height: 50vh; font-family: var(--mono); font-size: 12px; direction: ltr; background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: var(--r-s); padding: 10px; }
@media (max-width: 720px) {
  .status, .opts { grid-template-columns: minmax(0, 1fr); }
  .field { grid-template-columns: minmax(0, 1fr) auto; }
  .field-k { grid-column: 1 / -1; margin-bottom: -6px; }
  .bar-in .brand span { display: none; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

const JS = `
(function () {
  'use strict';
  var D = document, K = JSON.parse(D.getElementById('kit-data').textContent), KEY = 'an-kit-1';
  var st = (function () { try { var v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked: the ticks last until the page closes */ } }
  function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, K); }
  var fa = function (n) { return String(n).replace(/\\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };

  var toastEl = D.getElementById('toast'), timer;
  function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(timer); timer = setTimeout(function () { toastEl.hidden = true; }, 3200); }
  function oldCopy(text) {
    var ta = D.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    D.body.appendChild(ta); ta.select(); var ok = false; try { ok = D.execCommand('copy'); } catch (e) { ok = false; } D.body.removeChild(ta); return ok;
  }
  var dlg = D.getElementById('manual'), dlgText = D.getElementById('manual-text');
  function manual(text, label) {
    D.getElementById('manual-title').textContent = label;
    dlgText.value = text;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    dlgText.focus(); dlgText.select();
  }
  D.getElementById('manual-close').addEventListener('click', function () { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); });
  function copy(text, label) {
    var done = function () { toast('«' + label + '» کپی شد. حالا در بلاگفا جای‌گذاری کنید.'); };
    var fallback = function () { if (oldCopy(text)) done(); else manual(text, label); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  function variant() { var r = D.querySelector('input[name="split-v"]:checked'); return r ? r.value : 'full'; }
  D.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]'); if (!b) return;
    var key = b.getAttribute('data-copy');
    if (key === 'split') key = 'split.' + variant() + '.' + b.getAttribute('data-part');
    var text = get(key); if (typeof text !== 'string') return;
    copy(text, b.getAttribute('data-label') || b.textContent.trim());
  });

  // split variant: remembered, and the sizes beside the three parts follow it
  var sizes = { full: {}, lite: {} };
  ['full', 'lite'].forEach(function (v) { [1, 2, 3].forEach(function (p) { sizes[v][p] = fa(Math.max(1, Math.round(new Blob([K.split[v][p]]).size / 1024))) + ' کیلوبایت'; }); });
  function showSizes() { var v = variant(); [].forEach.call(D.querySelectorAll('[data-size-part]'), function (s) { s.textContent = sizes[v][s.getAttribute('data-size-part')]; }); }
  [].forEach.call(D.querySelectorAll('input[name="split-v"]'), function (r) {
    if (st.splitV && r.value === st.splitV) r.checked = true;
    r.addEventListener('change', function () { st.splitV = variant(); save(); showSizes(); });
  });
  showSizes();

  // checklist
  var boxes = [].slice.call(D.querySelectorAll('input[data-step]'));
  var progT = D.getElementById('prog-t'), progI = D.getElementById('prog-i');
  function on(id) { var c = D.getElementById(id); return !!(c && c.checked); }
  function update() {
    var n = boxes.filter(function (c) { return c.checked; }).length;
    progT.textContent = fa(n) + ' از ' + fa(boxes.length) + ' گام';
    progI.style.width = (100 * n / boxes.length) + '%';
    boxes.forEach(function (c) { var p = c.closest('.post'); if (p) p.classList.toggle('done', c.checked); });
    var postsDone = boxes.filter(function (c) { return /^p\\d+$/.test(c.id); }).every(function (c) { return c.checked; });
    D.getElementById('st-2').classList.toggle('on', on('s-tpl'));
    D.getElementById('st-3').classList.toggle('on', on('s-tpl') && postsDone && on('s-final'));
  }
  boxes.forEach(function (c) { c.checked = !!st[c.id]; c.addEventListener('change', function () { st[c.id] = c.checked; save(); update(); }); });
  update();

  var reset = D.getElementById('reset'), armed = 0;
  reset.addEventListener('click', function () {
    if (!armed) { armed = setTimeout(function () { armed = 0; reset.textContent = 'پاک کردن همه‌ی تیک‌ها'; }, 4000); reset.textContent = 'برای پاک شدن تیک‌ها دوباره بزنید'; return; }
    clearTimeout(armed); armed = 0; reset.textContent = 'پاک کردن همه‌ی تیک‌ها';
    boxes.forEach(function (c) { c.checked = false; st[c.id] = false; }); save(); update(); toast('همه‌ی تیک‌ها پاک شد.');
  });
})();
`;

const body = `
<div id="kit" dir="rtl" lang="fa">
<header class="bar"><div class="bar-in wrap">
  <a class="brand" href="#top">${mark}<span>آینده‌نگار</span></a>
  <div class="prog"><span id="prog-t" aria-live="polite">۰ از ${fa(STEPS)} گام</span><span class="prog-bar" aria-hidden="true"><i id="prog-i"></i></span></div>
</div></header>

<main class="wrap" id="top">
<section class="intro" aria-labelledby="kit-h">
  <p class="eyebrow">آینده‌نگار · روایت انسان، ایده و فناوری</p>
  <h1 id="kit-h">کیت نصب و انتشار</h1>
  <p>هر چیزی که باید در بلاگفا جای‌گذاری شود، این‌جا با یک دکمه‌ی کپی آمده است: قالب، صفحه‌ی «درباره» و ده مقاله. گام‌ها را به همین ترتیب انجام دهید و هر کدام را که تمام شد تیک بزنید.</p>
  <p class="credit">طراحی، مدیریت و نویسندگی: امیرحسین همتی</p>
  <ol class="status" aria-label="وضعیت کار">
    <li class="st on" id="st-1"><span class="dot" aria-hidden="true">✓</span><div><b>فایل آماده</b><small>قالب، ۱۰ مقاله، صفحه‌ی درباره، تصویرها و راهنماها ساخته و با آزمون خودکار بررسی شده‌اند.</small></div></li>
    <li class="st" id="st-2"><span class="dot" aria-hidden="true">✓</span><div><b>قالب نصب‌شده</b><small>با تیک گام ۲ روشن می‌شود: قالب در بلاگفا ذخیره شده و صفحه‌ی اول با ظاهر آینده‌نگار باز می‌شود.</small></div></li>
    <li class="st" id="st-3"><span class="dot" aria-hidden="true">✓</span><div><b>وبلاگ منتشرشده و آنلاین</b><small>با تیک هر ۱۰ مقاله و بازبینی نهایی روشن می‌شود: همه می‌توانند وبلاگ را در اینترنت ببینند.</small></div></li>
  </ol>
  <p class="note">این صفحه به بلاگفا وصل نیست و نمی‌تواند نصب یا انتشار را خودش بررسی کند؛ وضعیت‌ها را تیک‌های شما روشن می‌کنند و فقط در همین مرورگر می‌مانند. پیش از شروع می‌توانید <a href="preview/index.html">پیش‌نمایش وبلاگ</a> را ببینید که با شبیه‌ساز بلاگفا ساخته شده است.</p>
</section>

<section class="step" aria-labelledby="h1">
  <div class="step-h"><span class="step-n">۱</span><h2 id="h1">ساخت وبلاگ در بلاگفا</h2></div>
  <p>در <a href="https://blogfa.com/">blogfa.com</a> فرم ساخت وبلاگ تازه را باز کنید. این مقدارها را می‌توانید کپی کنید:</p>
  <div class="rows">
    ${field('نام کاربری', esc(BLOG.user), 'blog.user', 'نام کاربری پیشنهادی', { vcls: 'ltr' })}
    ${field('', 'فقط حروف انگلیسی و عدد. نشانی وبلاگ از آن ساخته می‌شود، مثل <code>ayandehnegar.blogfa.com</code>. اگر این نام گرفته شده بود، یک عدد به آخرش اضافه کنید.', '', '', { vcls: 'plain muted' })}
    ${field('عنوان وبلاگ', esc(BLOG.title), 'blog.title', 'عنوان وبلاگ')}
    ${field('نام نویسنده', esc(BLOG.author), 'blog.author', 'نام نویسنده')}
    ${field('توضیح وبلاگ', esc(BLOG.desc), 'blog.desc', 'توضیح وبلاگ', { vcls: 'plain' })}
  </div>
  <p class="warn">رمز عبور، ایمیل و کد امنیتی را فقط خودتان در سایت بلاگفا وارد کنید و برای هیچ‌کس، از جمله دستیار هوش مصنوعی، نفرستید.</p>
  ${tick('s-blog', 'وبلاگ ساخته شد و وارد پنل مدیریت شدم.')}
</section>

<section class="step" aria-labelledby="h2">
  <div class="step-h"><span class="step-n">۲</span><h2 id="h2">نصب قالب</h2></div>
  <ol>
    <li>در پنل بلاگفا به <span class="path">«تنظیمات و دیگر امکانات» ← «ویرایش قالب وبلاگ»</span> بروید. این صفحه سه زبانه دارد: «صفحات اصلی»، «آرشیو» و «صفحات جداگانه».</li>
    <li>در زبانه‌ی «صفحات اصلی» داخل کادر کد کلیک کنید، با <kbd>Ctrl</kbd>+<kbd>A</kbd> همه‌ی کد قبلی را انتخاب و پاک کنید.</li>
    <li>قالب کامل را از دکمه‌ی زیر کپی کنید، در همان کادر جای‌گذاری کنید (<kbd>Ctrl</kbd>+<kbd>V</kbd>) و ذخیره کنید. این کد هر سه قالب را با هم دارد و بلاگفا خودش آن‌ها را جدا می‌کند.</li>
    <li>صفحه‌ی اول وبلاگ را در زبانه‌ی تازه باز کنید. اگر بعد از چند ثانیه نوار «بخشی از امکانات این صفحه بارگذاری نشد» دیدید، یعنی کد کامل ذخیره نشده است؛ قالب سبک یا روش سه‌تکه را امتحان کنید.</li>
  </ol>
  <div class="opts">
    <div class="opt rec"><h3>قالب کامل <span class="badge">پیشنهادی</span></h3><p>همه‌ی امکانات، از جمله کره‌ی زمین سه‌بعدی و زنده‌ی صفحه‌ی اول.</p><span class="size">${kb(DATA.tpl.full)}</span><button type="button" class="btn primary" data-copy="tpl.full" data-label="قالب کامل">کپی قالب کامل</button></div>
    <div class="opt"><h3>قالب سبک</h3><p>همان قالب، بدون کره‌ی زمین سه‌بعدی. اگر قالب کامل ذخیره نشد یا صفحه‌ی اول روی گوشی‌های قدیمی کند بود.</p><span class="size">${kb(DATA.tpl.lite)}</span><button type="button" class="btn" data-copy="tpl.lite" data-label="قالب سبک">کپی قالب سبک</button></div>
  </div>
  <details class="alt"><summary>روش جایگزین: جای‌گذاری سه‌تکه</summary><div class="alt-body">
    <p class="note">اگر بلاگفا کد یک‌تکه را نپذیرفت، هر تکه را در زبانه‌ی خودش جای‌گذاری و جداگانه ذخیره کنید. در هر زبانه اول کد قبلی را پاک کنید.</p>
    <div class="seg" role="radiogroup" aria-label="نسخه‌ی تکه‌ها"><label><input type="radio" name="split-v" value="full" checked>کامل</label><label><input type="radio" name="split-v" value="lite">سبک</label></div>
    <div class="rows">
      ${[['1', 'زبانه‌ی «صفحات اصلی»'], ['2', 'زبانه‌ی «آرشیو»'], ['3', 'زبانه‌ی «صفحات جداگانه»']].map(([p, t]) => `<div class="field"><div class="field-k">تکه‌ی ${fa(p)}</div><div class="field-v">${t} <span class="size" data-size-part="${p}"></span></div><button type="button" class="btn" data-copy="split" data-part="${p}" data-label="تکه‌ی ${fa(p)} قالب">کپی تکه‌ی ${fa(p)}</button></div>`).join('')}
    </div>
  </div></details>
  ${tick('s-tpl', 'قالب ذخیره شد و صفحه‌ی اول وبلاگ با ظاهر آینده‌نگار باز شد.')}
</section>

<section class="step" aria-labelledby="h3">
  <div class="step-h"><span class="step-n">۳</span><h2 id="h3">تنظیمات پیشنهادی</h2></div>
  <p>در بخش تنظیمات وبلاگ این‌ها را بررسی کنید. نام دقیق گزینه‌ها در پنل ممکن است کمی فرق کند.</p>
  <ul>
    <li><b>تعداد مطالب صفحه‌ی اول:</b> ۱۰ یا بیشتر، تا هر ده کارت در صفحه‌ی اول دیده شوند.</li>
    <li><b>نظرها:</b> فعال، تا خواننده‌ها زیر هر مقاله نظر بدهند.</li>
    <li><b>تصویر پروفایل (اختیاری):</b> فایل <code>assets/logo/logo-512.png</code> از همین بسته.</li>
  </ul>
  <div class="rows">${field('درباره‌ی من', esc(BLOG.about), 'blog.about', 'متن درباره‌ی من', { vcls: 'plain' })}</div>
  ${tick('s-settings', 'تنظیمات را بررسی کردم.')}
</section>

<section class="step" aria-labelledby="h4">
  <div class="step-h"><span class="step-n">۴</span><h2 id="h4">صفحه‌ی «درباره»</h2></div>
  <p>در پنل بخش «صفحات جداگانه» را باز کنید و صفحه‌ی تازه‌ای بسازید. اگر روش ساخت را پرسید، «در قالب وبلاگ» را انتخاب کنید تا صفحه ظاهر آینده‌نگار را بگیرد.</p>
  <div class="rows">
    ${field('عنوان صفحه', esc(DATA.page.title), 'page.title', 'عنوان صفحه‌ی درباره')}
    ${field('نشانی صفحه', 'about', 'page.slug', 'نشانی صفحه‌ی درباره', { vcls: 'ltr' })}
    ${field('', 'دقیقاً با حروف کوچک. پیوند پانویس قالب به <code>/page/about</code> می‌رود.', '', '', { vcls: 'plain muted' })}
    ${field('متن صفحه', `کد HTML، ${kb(DATA.page.body)}`, 'page.body', 'متن صفحه‌ی درباره', { vcls: 'muted', btn: 'کپی متن' })}
  </div>
  <p class="note">متن را در حالت کد (HTML) ویرایشگر جای‌گذاری کنید، همان‌طور که در گام بعد برای مقاله‌ها آمده است.</p>
  ${tick('s-about', 'صفحه ساخته شد و پیوند «درباره‌ی آینده‌نگار» در پانویس آن را باز می‌کند.')}
</section>

<section class="step" aria-labelledby="h5">
  <div class="step-h"><span class="step-n">۵</span><h2 id="h5">انتشار ۱۰ مقاله</h2></div>
  <p>برای هر مقاله در پنل «ارسال مطلب جدید» را باز کنید و:</p>
  <ol>
    <li>عنوان را کپی کنید و در کادر عنوان بگذارید.</li>
    <li>ویرایشگر متن را به حالت کد ببرید (معمولاً دکمه‌ای با نام HTML یا نماد <code>&lt;&gt;</code> در نوار ابزار ویرایشگر) و متن مقاله را همان‌جا جای‌گذاری کنید. متن را در حالت عادی ویرایشگر جای‌گذاری نکنید، چون کدها به‌صورت نوشته دیده می‌شوند.</li>
    <li>موضوع را انتخاب کنید؛ اگر هنوز ساخته نشده، با همین نام بسازید.</li>
    <li>برچسب‌ها را وارد کنید. اگر بلاگفا برچسب‌ها را یکی‌یکی می‌گیرد، روی هر برچسب بزنید تا جدا کپی شود.</li>
    <li>کادر «ادامه‌ی مطلب» را خالی بگذارید و مطلب را منتشر کنید.</li>
  </ol>
  <p class="warn">مقاله‌ها را به ترتیب ۱ تا ۱۰ منتشر کنید تا پیوندهای «روایت قبلی» و «روایت بعدی» به همین ترتیب بچینند. آخرین مقاله‌ای که منتشر می‌شود کارت ویژه‌ی صفحه‌ی اول می‌شود. بعد از انتشار مقاله‌ی ۱ آن را باز کنید: باید کادر «آزمایشگاه زنده» و نمودار را ببینید. اگر فقط متن ساده یا کد خام دیدید، متن در حالت کد جای‌گذاری نشده است؛ مطلب را ویرایش کنید و دوباره در حالت کد جای‌گذاری کنید.</p>
  <ol class="posts">${postCards}
  </ol>
</section>

<section class="step" aria-labelledby="h6">
  <div class="step-h"><span class="step-n">۶</span><h2 id="h6">بازبینی نهایی</h2></div>
  <ul>
    <li>صفحه‌ی اول: پنل زنده، کره‌ی زمین (در قالب کامل)، ده کارت مقاله و بخش سازنده با نام امیرحسین همتی.</li>
    <li>یک مقاله: فهرست مطالب، نمودار، آزمایشگاه زنده، منابع، مقاله‌های پیشنهادی و دکمه‌های اشتراک.</li>
    <li>پیوند «درباره‌ی آینده‌نگار» در پانویس و صفحه‌ی بایگانی.</li>
    <li>همین صفحه‌ها روی گوشی.</li>
    <li>اگر بلاگفا تبلیغ خودش را نشان داد، عادی است؛ قالب آن را پنهان نمی‌کند، چون پنهان کردن تبلیغ خلاف قوانین بلاگفاست.</li>
  </ul>
  ${tick('s-final', 'همه را دیدم؛ وبلاگ آماده‌ی معرفی است.')}
</section>

${FRAGMENT ? '' : `<section class="step" aria-labelledby="h7">
  <div class="step-h"><h2 id="h7">راهنماهای کامل</h2></div>
  <ul class="docs">${docs.map(([s, l]) => docLink(s, l)).join('')}</ul>
</section>`}
</main>

<footer class="foot wrap">
  <p>آینده‌نگار · طراحی، مدیریت و نویسندگی: امیرحسین همتی</p>
  <p>این صفحه چیزی به جایی نمی‌فرستد. اگر دکمه‌ی کپی کار نکرد، متن در پنجره‌ای باز می‌شود تا خودتان آن را کپی کنید.</p>
  <button type="button" class="reset" id="reset">پاک کردن همه‌ی تیک‌ها</button>
</footer>

<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
<dialog id="manual" aria-labelledby="manual-title"><form method="dialog">
  <h2 id="manual-title" style="font-size:1.1rem"></h2>
  <p class="note">مرورگر اجازه‌ی کپی خودکار نداد. متن زیر انتخاب شده است: <kbd>Ctrl</kbd>+<kbd>C</kbd> بزنید (در گوشی: نگه دارید و «کپی» را بزنید).</p>
  <textarea id="manual-text" readonly aria-label="متن برای کپی"></textarea>
  <button type="button" class="btn" id="manual-close">بستن</button>
</form></dialog>
</div>
<script type="application/json" id="kit-data">${json}</script>
<script>${JS}</script>
`;

const top = `<title>کیت نصب آینده‌نگار</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800;900&amp;display=swap">
<style>${CSS}</style>`;

if (FRAGMENT) {
  fs.writeFileSync(FRAGMENT, top + '\n' + body);
  console.log(path.relative(process.cwd(), FRAGMENT), kb(top + body));
} else {
  const doc = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="author" content="امیرحسین همتی">
${top}
</head>
<body>
${body}
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, 'kit.html'), doc);
  console.log('kit.html', kb(doc));
}
