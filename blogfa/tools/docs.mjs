#!/usr/bin/env node
/* آینده‌نگار · docs — renders docs/*.md to docs/html/*.html.
   The install kit (kit.html) links its «راهنماهای کامل» to docs/html/, so the guides can be read offline from the
   package folder with the same night/day look as the kit, without a Markdown viewer.
   Links between guides (02-settings-guide.md) become .html; other relative links (../dist/…) gain one ../ because
   the pages sit one folder deeper than the Markdown.
     node tools/docs.mjs   → docs/html/<name>.html for every docs/<name>.md */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'docs'), OUT = path.join(SRC, 'html');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const files = fs.readdirSync(SRC).filter(f => /^\d\d-[a-z0-9-]+\.md$/.test(f)).sort();
const titles = Object.fromEntries(files.map(f => [f, (fs.readFileSync(path.join(SRC, f), 'utf8').match(/^#\s+(.+)$/m) || [, f])[1].trim()]));

const fixHref = h => {
  if (!h || /^([a-z]+:|#|\/)/i.test(h)) return h;
  const [p, hash] = h.split('#'), tail = hash ? '#' + hash : '';
  if (/^\d\d-[a-z0-9-]+\.md$/.test(p)) return p.replace(/\.md$/, '.html') + tail;
  return '../' + p + tail;
};
marked.use({
  gfm: true,
  walkTokens(tok) { if (tok.type === 'link' || tok.type === 'image') tok.href = fixHref(tok.href); },
  renderer: {
    // headings get ids so a guide can be linked to a section; Persian text is kept, spaces become hyphens
    heading({ tokens, depth, text }) {
      const id = text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
      return `<h${depth} id="${esc(id)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    }
  },
  // tables scroll sideways on a phone instead of widening the page
  hooks: { postprocess: html => html.replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, '</table></div>') }
});

const CSS = `
:root { color-scheme: dark; --bg: #04060D; --surface: #0B1222; --surface-2: #111A2F; --line: #1C2741; --text: #EDF2FA; --muted: #9AA8C0; --link: #8FD3FF; --accent: #FFB36B;
  --font: Vazirmatn, Tahoma, "Segoe UI", sans-serif; --mono: ui-monospace, "Cascadia Code", Consolas, monospace; }
@media (prefers-color-scheme: light) { :root { color-scheme: light; --bg: #F6F8FB; --surface: #FFFFFF; --surface-2: #EEF2F8; --line: #D8E0EC; --text: #0E1626; --muted: #4A5872; --link: #0B5CAD; --accent: #A04A00; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 16px; line-height: 1.95; direction: rtl; }
.top { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--line); background: color-mix(in srgb, var(--bg) 88%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); font-size: 14px; }
.top b { font-weight: 800; margin-inline-end: auto; }
main { max-width: 860px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font-size: 1.9rem; line-height: 1.5; margin: .4em 0 .6em; }
h2 { font-size: 1.35rem; margin: 2em 0 .6em; padding-top: .6em; border-top: 1px solid var(--line); }
h3 { font-size: 1.1rem; margin: 1.6em 0 .4em; }
a { color: var(--link); text-underline-offset: 3px; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
code { font-family: var(--mono); font-size: .88em; padding: 1px 6px; border-radius: 6px; background: var(--surface-2); direction: ltr; unicode-bidi: isolate; }
pre { direction: ltr; text-align: left; overflow-x: auto; padding: 14px 16px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); line-height: 1.6; }
pre code { padding: 0; background: none; }
.tbl { overflow-x: auto; margin: 1em 0; border: 1px solid var(--line); border-radius: 10px; }
table { border-collapse: collapse; width: 100%; font-size: .93rem; }
th, td { padding: 8px 12px; border-bottom: 1px solid var(--line); text-align: right; vertical-align: top; }
th { background: var(--surface-2); font-weight: 700; }
tr:last-child td { border-bottom: 0; }
blockquote { margin: 1em 0; padding: 4px 16px; border-inline-start: 3px solid var(--accent); background: var(--surface); border-radius: 0 8px 8px 0; color: var(--muted); }
li { margin: .2em 0; }
nav.docs { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 14px; color: var(--muted); }
nav.docs ol { padding-inline-start: 1.4em; }
nav.docs [aria-current] { color: var(--text); font-weight: 700; text-decoration: none; }
`;

fs.mkdirSync(OUT, { recursive: true });
for (const f of files) {
  const md = fs.readFileSync(path.join(SRC, f), 'utf8'), slug = f.replace(/\.md$/, '');
  const body = marked.parse(md);
  const nav = files.map(g => `<li><a href="${g.replace(/\.md$/, '.html')}"${g === f ? ' aria-current="page"' : ''}>${esc(titles[g])}</a></li>`).join('');
  const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titles[f])} · آینده‌نگار</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;800&amp;display=swap">
<style>${CSS.trim()}</style>
</head>
<body>
<header class="top"><b>آینده‌نگار · راهنماها</b><a href="../../kit.html">کیت نصب</a><a href="../${f}">متن Markdown</a></header>
<main>
${body}
<nav class="docs" aria-label="همه‌ی راهنماها"><ol>${nav}</ol></nav>
</main>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, slug + '.html'), html);
}
console.log(`docs → docs/html/  ·  ${files.length} pages`);
