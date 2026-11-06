#!/usr/bin/env node
/* آینده‌نگار · build
   Assembles the three Blogfa templates (main/posts, archive, separate pages) from src/, minifies the CSS and JS,
   refuses output that Blogfa could misread or block, and writes paste-ready files plus a size report to dist/.

   node tools/build.mjs            → dist/
   Variants:
     cdn, cdn-lite   the templates to install. Only markup stays in the template (about 25 KB per part); the
                     minified CSS and JS are files in dist/cdn/ that jsDelivr serves from this public repo, pinned
                     to the commit named in cdn.json and checked with Subresource Integrity (src/js/loader.js).
                     Blogfa refused the inlined parts below as too large («حجم قالب بسیار بالا است»).
     full, lite      the same templates with the CSS and JS inlined (about 250 to 310 KB per part). Blogfa does not
                     accept parts this large, so these are only the base of the local preview and its tests.
   "lite" leaves out the WebGL globe and its geodata.

   CDN workflow: build, commit dist/cdn/ and push, put that commit's full hash in cdn.json as "ref", build again.
   The cdn templates are written only when the ref holds every asset byte for byte. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { minify as terser } from 'terser';
import { minify as csso } from 'csso';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const rd = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const wr = (rel, s) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); return f; };

/* ---------- module sets ---------- */
// 09-reader: the reader's settings from «ابزار خواننده» (themes, text size, focus mode), in every template so a
// saved choice shows from the first paint; the toolkit's own stylesheet carries it too, for older templates
const CSS_ALL = ['01-base', '02-chrome', '03-home', '04-post', '05-labs', '06-dialogs', '07-responsive', '08-sky', '09-reader'];
const CSS_SETS = {
  post: CSS_ALL,
  page: ['01-base', '02-chrome', '03-home', '04-post', '06-dialogs', '07-responsive', '08-sky', '09-reader'],
  archive: ['01-base', '02-chrome', '03-home', '04-post', '06-dialogs', '07-responsive', '08-sky', '09-reader']
};
const LABS = ['_ui', 'ai', 'iot', 'city', 'security', 'brain', 'space', 'arch', 'algo', 'energy', 'idea'];
const JS_MODS = {
  core: ['js/core.js'], sky: ['js/sky.js'], sound: ['js/sound.js'], covers: ['js/covers.js'], charts: ['js/charts.js'], present: ['js/present.js'], pages: ['js/pages.js'],
  globe: ['js/data-geo.js', 'js/globe.js'], labs: LABS.map(l => `js/labs/${l}.js`), archive: ['js/archive.js'], pagebody: ['js/pagebody.js']
};
// pagebody (tidying after Blogfa's page editor) sits in the page bundle only, so changing it changes part 3 alone;
// present («ارائه در کلاس») only in the post bundle, the one that shows single articles
const MODS = {
  full: { post: ['core', 'sky', 'sound', 'covers', 'charts', 'present', 'pages', 'globe', 'labs'], page: ['core', 'sky', 'sound', 'charts', 'pages', 'pagebody'], archive: ['core', 'sky', 'sound', 'archive'] },
  lite: { post: ['core', 'sky', 'sound', 'covers', 'charts', 'present', 'pages', 'labs'], page: ['core', 'sky', 'sound', 'charts', 'pages', 'pagebody'], archive: ['core', 'sky', 'sound', 'archive'] }
};
const VARIANTS = {
  full: { mods: 'full', cdn: false }, lite: { mods: 'lite', cdn: false },
  cdn: { mods: 'full', cdn: true }, 'cdn-lite': { mods: 'lite', cdn: true }
};

/* ---------- CDN delivery ---------- */
// The largest part Blogfa accepted so far is a 105 KB template; 253 KB and 309 KB were refused. 60 KB leaves room.
const PART_BUDGET = 60 * 1024;
const git = (...a) => execFileSync('git', a, { cwd: ROOT, maxBuffer: 64 << 20 });
const REPO_ROOT = git('rev-parse', '--show-toplevel').toString().trim();
const CDN_DIR = path.relative(REPO_ROOT, path.join(DIST, 'cdn')).split(path.sep).join('/');
const CDN = JSON.parse(rd('cdn.json'));
if (!/^[\w.-]+\/[\w.-]+$/.test(CDN.repo || '')) throw new Error('cdn.json: "repo" must be "owner/name"');
const REF = /^[0-9a-f]{40}$/.test(CDN.ref || '') ? CDN.ref : '';
// In order: jsDelivr (its main address, then two of its CDN networks by name), then raw.githack's CDN.
const mirrorsAt = ref => [
  `https://cdn.jsdelivr.net/gh/${CDN.repo}@${ref}/${CDN_DIR}/`,
  `https://fastly.jsdelivr.net/gh/${CDN.repo}@${ref}/${CDN_DIR}/`,
  `https://gcore.jsdelivr.net/gh/${CDN.repo}@${ref}/${CDN_DIR}/`,
  `https://rawcdn.githack.com/${CDN.repo}/${ref}/${CDN_DIR}/`
];
const MIRRORS = REF ? mirrorsAt(REF) : [];
const assets = new Map();   // file name → bytes, written to dist/cdn/
function asset(base, ext, code) {
  const buf = Buffer.isBuffer(code) ? code : Buffer.from(code, 'utf8');
  const file = `${base}.${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10)}.${ext}`;
  assets.set(file, buf);
  return { file, sri: 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64'), bytes: buf.length };
}
// Does the commit in cdn.json hold every asset byte for byte, and is it on a remote branch jsDelivr can read?
function verifyRef() {
  const missing = [];
  if (!REF) return { ok: false, missing: [...assets.keys()], pushed: false, why: 'cdn.json has no full commit hash in "ref"' };
  for (const [file, buf] of assets) {
    let got = null;
    try { got = git('show', `${REF}:${CDN_DIR}/${file}`); } catch (e) { /* not in that commit */ }
    if (!got || !got.equals(buf)) missing.push(file);
  }
  let pushed = false;
  try { pushed = git('branch', '-r', '--contains', REF).toString().trim().length > 0; } catch (e) { /* unknown commit */ }
  return { ok: !missing.length, missing, pushed, why: missing.length ? `commit ${REF.slice(0, 12)} lacks ${missing.length} asset(s)` : '' };
}

/* ---------- web font ---------- */
// Vazirmatn in three subsets (src/fonts/fonts.json). The files go to dist/cdn/ and every stylesheet starts with their
// @font-face rules, with addresses relative to the stylesheet: the font comes from the same pinned commit and the
// same mirror as the CSS, so it needs no server of its own and no stylesheet that holds back the first paint.
// The CDN templates preload the arabic subset. The inline templates (local preview only) do not: a preload with
// crossorigin from a file:// page is refused, while the @font-face request itself loads.
const FONT = JSON.parse(rd('src', 'fonts', 'fonts.json'));
const FONT_FILES = FONT.faces.map(f => ({ ...f, a: asset(f.file.replace(/\.woff2$/, ''), 'woff2', fs.readFileSync(path.join(ROOT, 'src', 'fonts', f.file))) }));
const FONT_CSS = FONT_FILES.map(f => `@font-face{font-family:"${FONT.family}";font-style:normal;font-weight:${FONT.weight};font-display:swap;src:url(${f.a.file}) format("woff2");unicode-range:${f.range}}`).join('');
const FONT_PRELOAD = FONT_FILES.filter(f => f.preload);

/* ---------- share picture ---------- */
// What a messenger or a social site shows when someone sends a link to the blog: assets/social/blog.jpg, the
// 1200×630 card tools/assets.mjs draws (name, slogan and the creator's credit). It goes to dist/cdn like the fonts
// and every template names it at the pinned jsDelivr address, in the inline variants too, so a CDN template stays
// its inline twin. A link preview reads only the meta tags of the page's own HTML, and Blogfa's tags cannot name a
// post's picture in <head>, so every page shares this one card.
const SHARE = asset('an-share', 'jpg', fs.readFileSync(path.join(ROOT, 'assets', 'social', 'blog.jpg')));
const SHARE_URL = mirrorsAt(REF || 'REF-NOT-SET')[0] + SHARE.file;
const OG_IMAGE = [
  `<meta property="og:image" content="${SHARE_URL}">`,
  '<meta property="og:image:type" content="image/jpeg">',
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta property="og:image:alt" content="آینده‌نگار، روایت انسان، ایده و فناوری. طراحی، مدیریت و نویسندگی: امیرحسین همتی">',
  `<meta name="twitter:image" content="${SHARE_URL}">`
].join('\n');

/* ---------- Blogfa safety: patterns that must never reach the template ---------- */
// Blogfa tags look like <-Name-> and blocks like <BlogX>/<BLOGFA>; a stray "<-" or "<Blog" inside JS/CSS could be
// parsed as one. Blogfa also blocks redirect / popup / obfuscation style code (faq.blogfa.com/post/3).
const FORBIDDEN_IN_CODE = [
  [/<-/, '"<-" (looks like a Blogfa tag opener)'], [/->/, '"->" (looks like a Blogfa tag closer)'],
  [/<\/script/i, '"</script" inside a script'], [/<!--/, '"<!--" inside code'],
  [/<\/?blog/i, '"<Blog…" or "<blog:" (looks like a Blogfa block)'],
  [/\beval\s*\(/, 'eval()'], [/document\.write/, 'document.write'], [/window\.open\s*\(/, 'window.open()'],
  [/\batob\s*\(/, 'atob()'], [/new\s+Function\s*\(/, 'new Function()'],
  [/location\s*\.\s*(href|replace|assign)\s*(=|\()/, 'scripted navigation (location.href=/replace/assign)'],
  [/(^|[^.\w])location\s*=(?!=)/, 'scripted navigation (location=)']
];
function guard(name, code) {
  const bad = FORBIDDEN_IN_CODE.filter(([re]) => re.test(code));
  if (bad.length) {
    const lines = bad.map(([re, why]) => { const m = re.exec(code); const i = m ? m.index : 0; return `  - ${why}: …${code.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, ' ')}…`; });
    throw new Error(`Blogfa-unsafe output in ${name}:\n${lines.join('\n')}`);
  }
}

/* ---------- minifiers ---------- */
const js = (files, name) => jsSource(files.map(f => rd('src', f)).join('\n;\n'), name);
async function jsSource(src, name) {
  const out = await terser(src, {
    ecma: 2015, compress: { passes: 2, pure_getters: false, unsafe: false, keep_infinity: true }, mangle: true,
    format: { comments: false, ascii_only: false, semicolons: true }
  });
  let code = out.code;
  // Terser can join "a<-b" style sequences; a space keeps the meaning and avoids Blogfa tag syntax.
  code = code.replace(/<-/g, '< -').replace(/--(?=>)/g, '-- ');
  guard(name, code);
  return code;
}
function css(names, name) {
  const src = names.map(n => rd('src', 'css', n + '.css')).join('\n');
  let code = csso(src, { restructure: false, comments: false }).css;
  guard(name, code);
  return code;
}

/* ---------- partials ---------- */
const P = n => rd('src', 'partials', n + '.html').replace(/\s+$/, '');
let logoN = 0;
const logo = () => P('logo').replace(/@ID@/g, String(++logoN));

function fill(tpl, map) {
  // replace /*@NAME@*/ placeholders repeatedly so partials can contain placeholders too
  for (let guardN = 0; guardN < 6 && /\/\*@[A-Z_]+@\*\//.test(tpl); guardN++) {
    tpl = tpl.replace(/\/\*@([A-Z_]+)@\*\//g, (m, k) => {
      if (!(k in map)) throw new Error('Unknown placeholder ' + m);
      const v = map[k]; return typeof v === 'function' ? v() : v;
    });
  }
  if (/\/\*@[A-Z_]+@\*\//.test(tpl)) throw new Error('Unresolved placeholders remain');
  return tpl;
}

/* ---------- categories for the archive and page templates ---------- */
// Blogfa fills its category list only in the main template, so the other two carry the categories as plain links.
// Blogfa numbers categories in the order they are made; the kit makes them in the order the posts first use them,
// which gave /category/1 … /category/7 on the live blog (checked 2026-11-05). core.js prefers the list a visitor's
// browser saved from a main-template page, so a renamed category shows correctly there.
function catsStatic() {
  const dir = path.join(ROOT, 'posts');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^\d\d-[\w-]+\.html$/.test(f)).sort() : [];
  const names = [];
  for (const f of files) {
    const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/^<!--[\s\S]*?^category:\s*(.+)$/m);
    for (const n of (m ? m[1] : '').split(/[،,]/).map(x => x.trim()).filter(Boolean)) if (!names.includes(n)) names.push(n);
  }
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<ul hidden id="an-cats" data-static>${names.map((n, i) => `<li><a href="/category/${i + 1}">${esc(n)}</a></li>`).join('')}</ul>`;
}

/* ---------- facts for the home "numbers" band, read from the real posts ---------- */
function postFacts() {
  const dir = path.join(ROOT, 'posts');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^\d\d-[\w-]+\.html$/.test(f)).sort() : [];
  let labs = 0, sources = 0, minutes = 0;
  for (const f of files) {
    const s = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^<!--[\s\S]*?-->/, '');
    if (/class="an-lab\b/.test(s)) labs++;
    const srcBlock = s.match(/class="an-sources"[\s\S]*?<\/ol>/);
    if (srcBlock) sources += (srcBlock[0].match(/<li\b/g) || []).length;
    const text = s.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
    minutes += Math.max(1, Math.round((text.match(/\S+/g) || []).length / 200));
  }
  return { posts: files.length, labs, sources, minutes };
}
const faNum = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

/* ---------- assemble ---------- */
async function build(variant) {
  const { mods, cdn } = VARIANTS[variant], V = MODS[mods];
  logoN = 0;
  const early = await js(['js/early.js'], 'early.js');
  const facts = postFacts();
  let homeBottom = P('home_bottom');
  if (facts.posts) {
    for (const k of Object.keys(facts)) homeBottom = homeBottom.replace(new RegExp(`(<b data-count="${k}">)[^<]*(</b>)`), `$1${faNum(facts[k])}$2`);
  }
  const parts = {};
  const source = rd('src', 'template.html');
  const sections = {};
  for (const [tag, key] of [['PostTemplate', 'post'], ['ArchiveTemplate', 'archive'], ['PageTemplate', 'page']]) {
    const m = source.match(new RegExp(`<blog:${tag}>([\\s\\S]*?)</blog:${tag}>`));
    if (!m) throw new Error('Missing ' + tag);
    const cssCode = FONT_CSS + css(CSS_SETS[key], `${key} css`);
    const jsCode = await js(V[key].flatMap(k => JS_MODS[k]), `${key} js (${V[key].join('+')})`);
    const map = {
      HEAD: () => P('head'), OG_IMAGE, FONT: '', EARLY_JS: early, STYLE: `<style>${cssCode}</style>`,
      CHROME_TOP: () => P('chrome_top'), LOGO: logo, HERO: () => P('hero'), HOME_TOP: () => P('home_top'),
      HOME_BOTTOM: homeBottom, AUTHOR_BOX: () => P('author_box'), FOOT_BOTTOM: () => P('foot_bottom'),
      CREATOR: () => P('creator'), BODY_END: `<script>${jsCode}</script>`, CATS_STATIC: catsStatic
    };
    if (cdn) {
      // the same CSS and JS as files; the stylesheet says it is UTF-8 in case a mirror sends no charset
      const cssA = asset(key === 'post' ? 'an-full' : 'an-base', 'css', (/[^\x00-\x7f]/.test(cssCode) ? '@charset "UTF-8";' : '') + cssCode);
      const jsA = asset(key === 'post' ? (mods === 'lite' ? 'an-post-lite' : 'an-post') : 'an-' + key, 'js', jsCode);
      const M = mirrorsAt(REF || 'REF-NOT-SET');
      // the names and hashes go into the loader's source before minifying, so terser sees real constants
      const loader = await jsSource(rd('src', 'js', 'loader.js')
        .replace("'@MIRRORS@'", JSON.stringify(M)).replace("'@CSSFILE@'", JSON.stringify([cssA.file, cssA.sri]))
        .replace("'@JSFILE@'", JSON.stringify([jsA.file, jsA.sri])), `${key} loader`);
      map.EARLY_JS = early + loader;
      map.FONT = FONT_PRELOAD.map(f => `<link rel="preload" href="${M[0]}${f.a.file}" as="font" type="font/woff2" crossorigin id="an-font">`).join('');
      map.STYLE = `<link rel="stylesheet" id="an-css" href="${M[0]}${cssA.file}" integrity="${cssA.sri}" crossorigin="anonymous">`;
      // id "an-script", not "an-main": that id belongs to <main> (the skip link's target)
      map.BODY_END = `<script src="${M[0]}${jsA.file}" id="an-script" integrity="${jsA.sri}" crossorigin="anonymous"></script>`;
      parts[key] = { cssFile: cssA.file, jsFile: jsA.file };
    }
    let html = fill(m[1], map);
    if (mods === 'lite' && key === 'post') html = html.replace('<div class="an-globe" id="an-globe" aria-hidden="true"></div>', '<div class="an-globe an-globe-static" id="an-globe" aria-hidden="true"></div>');
    html = html.replace(/^\s*\n/, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    sections[key] = html.trim() + '\n';
    parts[key] = { ...parts[key], css: cssCode.length, js: jsCode.length, html: Buffer.byteLength(sections[key]) };
    if (cdn && parts[key].html > PART_BUDGET) throw new Error(`${variant} ${key} part is ${parts[key].html} bytes, over the ${PART_BUDGET}-byte budget`);
  }
  // required credit must survive in every template
  for (const [k, s] of Object.entries(sections)) {
    if (!s.includes('طراحی، مدیریت و نویسندگی')) throw new Error(`credit missing from ${k} template`);
  }
  const all = `<blog:PostTemplate>\n${sections.post}</blog:PostTemplate>\n<blog:ArchiveTemplate>\n${sections.archive}</blog:ArchiveTemplate>\n<blog:PageTemplate>\n${sections.page}</blog:PageTemplate>\n`;
  const suffix = variant === 'full' ? '' : '-' + variant;
  const out = { [`template${suffix}.html`]: all, [`split${suffix}/1-main-and-posts.html`]: sections.post, [`split${suffix}/2-archive.html`]: sections.archive, [`split${suffix}/3-pages.html`]: sections.page };
  return { variant, cdn, bytes: Buffer.byteLength(all), parts, facts, out };
}

/* ---------- «ابزار خواننده»: the code for Blogfa's custom-code box (src/addons/) ---------- */
// The box («کدها و جاوا اسکریپت‌های اختصاصی کاربر») is printed by <-BlogCustomHtml-> in the footer of each template.
// What the owner pastes there is dist/box.html: a few lines that load the toolkit's stylesheet and script from the
// same pinned commit as the template, with the same backup addresses and Subresource Integrity. The QR encoder is
// a third file the script fetches only when a reader opens the QR window. dist/box-local.html is the same code
// for the local previews (files next to the page, no integrity check: a file:// page cannot use crossorigin).
const QR_BANNER = '/*! qrcode-generator 2.0.4 | Copyright (c) 2009 Kazuhiko Arase | MIT License | "QR Code" is a registered trademark of DENSO WAVE INCORPORATED */\n';
function postWords() {
  // every glossary term, and the first three key points of each article, for the quiz's wrong choices
  const dir = path.join(ROOT, 'posts');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^\d\d-[\w-]+\.html$/.test(f)).sort() : [];
  const ent = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
  const txt = h => h.replace(/<[^>]+>/g, '').replace(/&(nbsp|amp|lt|gt|quot|#39);/g, m => ent[m]).replace(/\s+/g, ' ').trim();
  const terms = [], keys = [];
  for (const f of files) {
    const topic = f.replace(/^\d\d-/, '').replace(/\.html$/, '');
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of s.matchAll(/<abbr\b[^>]*>([\s\S]*?)<\/abbr>/g)) { const t = txt(m[1]); if (t && !terms.includes(t)) terms.push(t); }
    const k = s.match(/<div class="an-keys">([\s\S]*?)<\/div>/);
    if (k) for (const li of [...k[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].slice(0, 3)) keys.push([topic, txt(li[1])]);
  }
  return { terms, keys };
}
async function addons() {
  const qrSrc = fs.readFileSync(path.join(ROOT, 'node_modules', 'qrcode-generator', 'dist', 'qrcode.js'), 'utf8');
  // the library's UMD tail looks for define/module/exports; inside this wrapper it finds none and stays private
  const qrCode = QR_BANNER + await jsSource(`(function(){var define,module,exports;\n${qrSrc}\n;qrcode.stringToBytes=qrcode.stringToBytesFuncs['UTF-8'];window.AN_QR=qrcode;})();`, 'qr encoder');
  guard('qr encoder', qrCode);
  const qrA = asset('an-qr', 'js', qrCode);
  const words = postWords();
  const cssCode = csso(rd('src', 'css', '09-reader.css') + '\n' + rd('src', 'addons', 'addons.css'), { restructure: false, comments: false }).css;
  guard('toolkit css', cssCode);
  const cssA = asset('an-addons', 'css', (/[^\x00-\x7f]/.test(cssCode) ? '@charset "UTF-8";' : '') + cssCode);
  const jsCode = await jsSource(rd('src', 'addons', 'addons.js').replace("'@QR@'", JSON.stringify([qrA.file, qrA.sri]))
    .replace("'@TERMS@'", JSON.stringify(words.terms)).replace("'@KEYS@'", JSON.stringify(words.keys)), 'toolkit js');
  const jsA = asset('an-addons', 'js', jsCode);
  const loader = async (M, sri) => jsSource(rd('src', 'addons', 'box.js').replace("'@MIRRORS@'", JSON.stringify(M))
    .replace("'@CSSFILE@'", JSON.stringify([cssA.file, cssA.sri])).replace("'@JSFILE@'", JSON.stringify([jsA.file, jsA.sri])).replace("'@SRI@'", sri ? '1' : '0'), 'box loader');
  // Only /* */ comments in the box: if a newline were ever lost on the way, a // comment would swallow the code after it
  const box = code => [
    '<script>',
    '/* آینده‌نگار · «ابزار خواننده» (کیت ۸): پوسته‌ها، اندازه‌ی متن، خط‌کش خواندن، حالت تمرکز، شنیدن متن، نشان‌ها، گذرنامه‌ی آینده، خودآزمایی، ارجاع و کد QR.',
    '   طراحی، مدیریت و نویسندگی: امیرحسین همتی. بدون پاپ‌آپ، بدون انتقال صفحه، بدون دست زدن به تبلیغات بلاگفا و بدون فرستادن هیچ داده‌ای.',
    '   برای خاموش کردن یک ابزار، 1 جلوی نامش را 0 کنید: tools دکمه‌ی نوار بالا، passport گذرنامه، quiz خودآزمایی، listen شنیدن، ruler خط‌کش،',
    '   focus حالت تمرکز، marks نشان‌ها، cite ارجاع، qr کد QR، resume ادامه‌ی خواندن. */',
    'window.AN_X_OPT = { tools: 1, passport: 1, quiz: 1, listen: 1, ruler: 1, focus: 1, marks: 1, cite: 1, qr: 1, resume: 1 };',
    '</script>',
    `<script>${code}</script>`, ''
  ].join('\n');
  const M = mirrorsAt(REF || 'REF-NOT-SET');
  return {
    files: { css: cssA, js: jsA, qr: qrA }, words: { terms: words.terms.length, keys: words.keys.length },
    box: box(await loader(M, true)), boxLocal: box(await loader(['./'], false))
  };
}

const t0 = Date.now();
fs.rmSync(DIST, { recursive: true, force: true });
const reports = [];
for (const v of Object.keys(VARIANTS)) reports.push(await build(v));
const addon = await addons();
for (const [file, buf] of assets) wr('cdn/' + file, buf);
const ref = verifyRef();
// --unverified writes the cdn templates anyway, for the offline tests (they serve dist/cdn/ themselves); such
// templates must not be installed, and tools/check.mjs fails while build-report.json says the ref is not verified
const UNVERIFIED = process.argv.includes('--unverified');
for (const r of reports) if (!r.cdn || ref.ok || UNVERIFIED) for (const [rel, s] of Object.entries(r.out)) wr(rel, s);
// the box code names the pinned commit like the CDN templates, so it is written under the same condition
if (ref.ok || UNVERIFIED) wr('box.html', addon.box);
wr('box-local.html', addon.boxLocal);
const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log('\nآینده‌نگار · build OK in ' + (Date.now() - t0) + ' ms');
for (const r of reports) {
  console.log(`\n${r.variant.toUpperCase()}  template${r.variant === 'full' ? '' : '-' + r.variant}.html  ${kb(r.bytes)}${r.cdn && !ref.ok ? (UNVERIFIED ? '  (UNVERIFIED: for offline tests only)' : '  (NOT WRITTEN, see below)') : ''}`);
  for (const [k, p] of Object.entries(r.parts)) console.log(`  ${k.padEnd(8)} html ${kb(p.html).padStart(9)}   (css ${kb(p.css)}, js ${kb(p.js)})${p.jsFile ? '   → ' + p.cssFile + ', ' + p.jsFile : ''}`);
}
console.log(`\nTOOLKIT  box.html ${kb(Buffer.byteLength(addon.box))}${ref.ok ? '' : UNVERIFIED ? '  (UNVERIFIED: for offline tests only)' : '  (NOT WRITTEN, see below)'}   → ${addon.files.css.file} ${kb(addon.files.css.bytes)}, ${addon.files.js.file} ${kb(addon.files.js.bytes)}, ${addon.files.qr.file} ${kb(addon.files.qr.bytes)} (on demand); quiz pool: ${addon.words.terms} terms, ${addon.words.keys} key points`);
console.log(`\ndist/cdn: ${assets.size} files, ${kb([...assets.values()].reduce((a, b) => a + b.length, 0))}`);
if (ref.ok) console.log(`cdn ref ${REF}: holds every asset${ref.pushed ? ', and is on a remote branch' : '. WARNING: no remote branch contains it yet; push before installing'}`);
else console.log(`cdn templates ${UNVERIFIED ? 'written UNVERIFIED (offline tests only, do not install)' : 'NOT written'}: ${ref.why}.\n  Commit dist/cdn/, push, set "ref" in cdn.json to that commit's full hash, and run the build again.`);
const f = reports[0].facts;
console.log(`\nposts: ${f.posts}  labs: ${f.labs}  sources: ${f.sources}  reading minutes: ${f.minutes}`);
const files = [...assets].map(([file, buf]) => ({ file, bytes: buf.length, sri: 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64') }));
wr('build-report.json', JSON.stringify({
  builtAt: new Date().toISOString(),
  cdn: { repo: CDN.repo, ref: REF, dir: CDN_DIR, ok: ref.ok, pushed: ref.pushed, missing: ref.missing, unverifiedTemplates: !ref.ok && UNVERIFIED, mirrors: MIRRORS, files },
  reports: reports.map(({ out, ...r }) => r),
  addons: { css: addon.files.css.file, js: addon.files.js.file, qr: addon.files.qr.file, box: Buffer.byteLength(addon.box), boxWritten: ref.ok || UNVERIFIED, words: addon.words }
}, null, 2));
