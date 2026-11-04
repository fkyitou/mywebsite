/* ==========================================================================
   آینده‌نگار · validate
   HTML: the Nu Html Checker (vnu.jar, the engine behind validator.w3.org/nu), run locally on every preview page.
   CSS:  CSSTree's syntax validator on every source stylesheet (src/css/*.css).

   What this proves and what it does not:
   - The preview pages are what Blogfa should produce once it fills the template with the ten posts. Blogfa's
     own additions to a live page (its ads, counters and comment scripts) are not in them, so they are not
     validated here; a live page can only be checked after it is published.
   - The template file itself (dist/template.html) is not HTML until Blogfa replaces its <-Tags->, so it is
     checked by tools/check.mjs instead (every tag known, every block closed, nothing Blogfa blocks).
   - A CSSTree "unknown" finding is not always a mistake: it also flags vendor-prefixed properties kept on
     purpose for older Safari. Those are listed separately so nothing is hidden.

   node tools/validate.mjs           → quality/validation.json, exit 1 on any HTML error or real CSS error
   ========================================================================== */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { validate } from 'csstree-validator';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = path.join(ROOT, 'preview');
const JAR = path.join(ROOT, 'node_modules/vnu-jar/build/dist/vnu.jar');
const rel = f => path.relative(ROOT, f);

/* ---------- HTML ---------- */
const pages = fs.readdirSync(PREVIEW).filter(f => f.endsWith('.html')).sort().map(f => path.join(PREVIEW, f));
let raw = '';
try {
  raw = execFileSync('java', ['-jar', JAR, '--format', 'json', '--stdout', '--exit-zero-always', ...pages], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });
} catch (e) {
  console.error('vnu.jar could not run (Java 11+ is needed):', e.message);
  process.exit(2);
}
const msgs = (JSON.parse(raw).messages || []).map(m => ({
  file: m.url ? rel(fileURLToPath(m.url)) : '', type: m.type === 'error' || m.subType === 'fatal' ? 'error' : m.subType === 'warning' ? 'warning' : 'info',
  line: m.lastLine || 0, message: m.message, extract: (m.extract || '').replace(/\s+/g, ' ').slice(0, 160)
}));
const group = list => {
  const g = new Map();
  for (const m of list) { const k = m.type + '|' + m.message; if (!g.has(k)) g.set(k, { type: m.type, message: m.message, count: 0, files: new Set(), example: m }); const e = g.get(k); e.count++; e.files.add(m.file); }
  return [...g.values()].map(e => ({ type: e.type, message: e.message, count: e.count, pages: e.files.size, example: { file: e.example.file, line: e.example.line, extract: e.example.extract } }));
};
const html = { pages: pages.length, errors: msgs.filter(m => m.type === 'error').length, warnings: msgs.filter(m => m.type === 'warning').length, info: msgs.filter(m => m.type === 'info').length, groups: group(msgs) };

/* ---------- CSS ---------- */
// prefixed properties kept on purpose: -webkit-mask-image (Safari < 15.4), -webkit-backdrop-filter (Safari < 18),
// -webkit-text-fill-color / -webkit-background-clip (gradient text), -webkit-font-smoothing, -webkit-tap-highlight-color
const PREFIXED = /^-(webkit|moz)-/;
const css = { files: 0, errors: [], prefixed: [] };
for (const f of fs.readdirSync(path.join(ROOT, 'src/css')).filter(f => f.endsWith('.css')).sort()) {
  const file = path.join(ROOT, 'src/css', f), src = fs.readFileSync(file, 'utf8');
  css.files++;
  for (const e of validate(src, rel(file))) {
    const item = { file: rel(file), line: e.line, property: e.property || '', message: e.message, value: (e.css || '').slice(0, 120) };
    (PREFIXED.test(e.property || e.reference || '') ? css.prefixed : css.errors).push(item);
  }
}

/* ---------- report ---------- */
const out = { generated: new Date().toISOString(), validator: { html: 'vnu.jar ' + JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/vnu-jar/package.json'), 'utf8')).version, css: 'csstree-validator ' + JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/csstree-validator/package.json'), 'utf8')).version }, html, css };
fs.mkdirSync(path.join(ROOT, 'quality'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'quality/validation.json'), JSON.stringify(out, null, 1));

console.log(`HTML (${out.validator.html}): ${html.pages} pages · ${html.errors} errors · ${html.warnings} warnings · ${html.info} info`);
for (const g of html.groups.filter(g => g.type !== 'info')) console.log(`  ${g.type === 'error' ? '✗' : '!'} ${g.message}  ×${g.count} on ${g.pages} page(s) — e.g. ${g.example.file}:${g.example.line}  ${g.example.extract}`);
console.log(`CSS (${out.validator.css}): ${css.files} files · ${css.errors.length} errors · ${css.prefixed.length} intentional vendor-prefixed properties`);
for (const e of css.errors) console.log(`  ✗ ${e.file}:${e.line} ${e.property} — ${e.message}${e.value ? '  [' + e.value + ']' : ''}`);
const fail = html.errors + css.errors.length;
console.log(fail ? `\n${fail} problem(s) to fix` : '\nno HTML or CSS errors');
process.exit(fail ? 1 : 0);
