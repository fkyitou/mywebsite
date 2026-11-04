#!/usr/bin/env node
/* آینده‌نگار · build
   Assembles the three Blogfa templates (main/posts, archive, separate pages) from src/, inlines
   minified CSS and JS, refuses output that Blogfa could misread or block, and writes paste-ready
   files plus a size report to dist/.

   node tools/build.mjs            → dist/
   Variants: "full" (everything, the default install) and "lite" (no WebGL globe or geodata;
   a fallback in case Blogfa rejects a template this large — its size limit is not documented). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify as terser } from 'terser';
import { minify as csso } from 'csso';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const rd = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const wr = (rel, s) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); return f; };

/* ---------- module sets ---------- */
const CSS_ALL = ['01-base', '02-chrome', '03-home', '04-post', '05-labs', '06-dialogs', '07-responsive', '08-sky'];
const CSS_SETS = {
  post: CSS_ALL,
  page: ['01-base', '02-chrome', '03-home', '04-post', '06-dialogs', '07-responsive', '08-sky'],
  archive: ['01-base', '02-chrome', '03-home', '04-post', '06-dialogs', '07-responsive', '08-sky']
};
const LABS = ['_ui', 'ai', 'iot', 'city', 'security', 'brain', 'space', 'arch', 'algo', 'energy', 'idea'];
const JS_MODS = {
  core: ['js/core.js'], sky: ['js/sky.js'], sound: ['js/sound.js'], covers: ['js/covers.js'], charts: ['js/charts.js'], pages: ['js/pages.js'],
  globe: ['js/data-geo.js', 'js/globe.js'], labs: LABS.map(l => `js/labs/${l}.js`)
};
const VARIANTS = {
  full: { post: ['core', 'sky', 'sound', 'covers', 'charts', 'pages', 'globe', 'labs'], page: ['core', 'sky', 'sound', 'charts', 'pages'], archive: ['core', 'sky', 'sound'] },
  lite: { post: ['core', 'sky', 'sound', 'covers', 'charts', 'pages', 'labs'], page: ['core', 'sky', 'sound', 'charts', 'pages'], archive: ['core', 'sky', 'sound'] }
};

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
async function js(files, name) {
  const src = files.map(f => rd('src', f)).join('\n;\n');
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
  const V = VARIANTS[variant];
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
    const cssCode = css(CSS_SETS[key], `${key} css`);
    const jsCode = await js(V[key].flatMap(k => JS_MODS[k]), `${key} js (${V[key].join('+')})`);
    const map = {
      HEAD: () => P('head'), EARLY_JS: early, CSS: cssCode,
      CHROME_TOP: () => P('chrome_top'), LOGO: logo, HERO: () => P('hero'), HOME_TOP: () => P('home_top'),
      HOME_BOTTOM: homeBottom, AUTHOR_BOX: () => P('author_box'), FOOT_BOTTOM: () => P('foot_bottom'),
      CREATOR: () => P('creator'), BODY_END: `<script>${jsCode}</script>`
    };
    let html = fill(m[1], map);
    if (variant === 'lite' && key === 'post') html = html.replace('<div class="an-globe" id="an-globe" aria-hidden="true"></div>', '<div class="an-globe an-globe-static" id="an-globe" aria-hidden="true"></div>');
    html = html.replace(/^\s*\n/, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    sections[key] = html.trim() + '\n';
    parts[key] = { css: cssCode.length, js: jsCode.length, html: Buffer.byteLength(sections[key]) };
  }
  // required credit must survive in every template
  for (const [k, s] of Object.entries(sections)) {
    if (!s.includes('طراحی، مدیریت و نویسندگی')) throw new Error(`credit missing from ${k} template`);
  }
  const all = `<blog:PostTemplate>\n${sections.post}</blog:PostTemplate>\n<blog:ArchiveTemplate>\n${sections.archive}</blog:ArchiveTemplate>\n<blog:PageTemplate>\n${sections.page}</blog:PageTemplate>\n`;
  const suffix = variant === 'full' ? '' : '-' + variant;
  wr(`template${suffix}.html`, all);
  wr(`split${suffix}/1-main-and-posts.html`, sections.post);
  wr(`split${suffix}/2-archive.html`, sections.archive);
  wr(`split${suffix}/3-pages.html`, sections.page);
  return { variant, bytes: Buffer.byteLength(all), parts, facts };
}

const t0 = Date.now();
fs.rmSync(DIST, { recursive: true, force: true });
const reports = [];
for (const v of Object.keys(VARIANTS)) reports.push(await build(v));
const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log('\nآینده‌نگار · build OK in ' + (Date.now() - t0) + ' ms');
for (const r of reports) {
  console.log(`\n${r.variant.toUpperCase()}  template${r.variant === 'full' ? '' : '-' + r.variant}.html  ${kb(r.bytes)}`);
  for (const [k, p] of Object.entries(r.parts)) console.log(`  ${k.padEnd(8)} html ${kb(p.html).padStart(9)}   (css ${kb(p.css)}, js ${kb(p.js)})`);
}
const f = reports[0].facts;
console.log(`\nposts: ${f.posts}  labs: ${f.labs}  sources: ${f.sources}  reading minutes: ${f.minutes}`);
wr('build-report.json', JSON.stringify({ builtAt: new Date().toISOString(), reports }, null, 2));
