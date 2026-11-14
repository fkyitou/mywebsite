// Builds the Netemdad canvas page for Blogfa from src/:
//   dist/bmc-page.html     page body for «صفحات جداگانه»: one line, plain markup only (Blogfa refuses script/style there)
//   dist/bmc.css, bmc.js   served from jsDelivr at a pinned commit, with the font next to them
//   dist/bmc-box.html      loader for the custom-code box; needs BMC_REF=<commit that holds the dist files>
//   dist/bmc-offline.html  one self-contained file (font embedded) as a classroom backup
//   BMC_ESBUILD  optional path to an esbuild package (default: "esbuild")
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const esbuild = require(process.env.BMC_ESBUILD || 'esbuild');
const here = path.dirname(fileURLToPath(import.meta.url));
const rd = (f) => fs.readFileSync(path.join(here, 'src', f), 'utf8');
const dist = path.join(here, 'dist');
fs.mkdirSync(dist, { recursive: true });

const oneLine = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean).join('');
const page = oneLine(rd('bmc.page.html'));
// Anything the page editor may strip or refuse fails the build instead of failing in the panel.
const banned = [/<script/i, /<style/i, /\sstyle=/i, /\son[a-z]+=/i, /<svg/i, /<iframe/i, /\shref=/i, /\ssrc=/i, /javascript:/i, /<!--/];
for (const re of banned) if (re.test(page)) throw new Error('page markup contains ' + re);
if (/[\r\n]/.test(page)) throw new Error('page must be a single line');

// Blue line icons of the physical canvas, one per block, as CSS custom properties.
const ICONS = {
  1: "<circle cx='9' cy='8' r='3.2'/><path d='M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6'/><circle cx='17' cy='9' r='2.6'/><path d='M15.6 14.2c3 .3 5.4 2.5 5.4 5.8'/>",
  2: "<rect x='3' y='9' width='18' height='4' rx='1'/><path d='M5 13v8h14v-8M12 9v12M12 9C11 6 7 4 6 6.5S9 9 12 9zM12 9c1-3 5-5 6-2.5S15 9 12 9z'/>",
  3: "<path d='M2 6h11v10H2zM13 10h4l4 4v2h-8z'/><circle cx='6' cy='18' r='2'/><circle cx='17' cy='18' r='2'/>",
  4: "<path d='M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z'/>",
  5: "<path d='M9 3h6l-2 4h-2zM11 7c-5 2-7 6-7 9a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5c0-3-2-7-7-9'/><circle cx='12' cy='15' r='2.4'/>",
  6: "<path d='M3 21V11l5 3v-3l5 3v-3l5 3V4h3v17zM7 18h2M11 18h2M15 18h2'/>",
  7: "<rect x='3' y='3' width='18' height='18' rx='3'/><path d='M7 12l4 4 6-8'/>",
  8: "<path d='M7 8a4 4 0 1 0 0 8c3 0 7-8 10-8a4 4 0 1 1 0 8c-3 0-7-8-10-8z'/>",
  9: "<path d='M3 12V4h8l10 10-8 8z'/><circle cx='7.5' cy='8.5' r='1.5'/>",
};
const svg = (body) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231F4FD1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${body}</svg>`
  .replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, "'");
const iconCss = Object.entries(ICONS).map(([k, b]) => `.bmc-c${k}{--ic:url("data:image/svg+xml,${svg(b)}")}`).join('\n');

const css = (await esbuild.transform(rd('bmc.css') + '\n' + iconCss, { loader: 'css', minify: true, charset: 'utf8', legalComments: 'none' })).code.trim();
const js = (await esbuild.transform(rd('bmc.js'), { minify: true, charset: 'utf8', target: 'es2017', legalComments: 'none' })).code.trim();
if (/<\/script|<!--/i.test(js)) throw new Error('script contains </script or <!--');
if (/<\/style/i.test(css)) throw new Error('css contains </style');
const font = fs.readFileSync(path.join(here, 'src/vazirmatn-arabic.woff2'));

fs.writeFileSync(path.join(dist, 'bmc-page.html'), page);
fs.writeFileSync(path.join(dist, 'bmc.css'), css);
fs.writeFileSync(path.join(dist, 'bmc.js'), js);
fs.writeFileSync(path.join(dist, 'vazirmatn-arabic.woff2'), font);

const sri = (s) => 'sha384-' + crypto.createHash('sha384').update(s).digest('base64');
const ref = process.env.BMC_REF;
if (ref) {
  if (!/^[0-9a-f]{7,40}$/.test(ref)) throw new Error('BMC_REF must be a commit SHA');
  const repo = 'fkyitou/mywebsite';
  const bases = [`https://cdn.jsdelivr.net/gh/${repo}@${ref}/bmc/dist/`, `https://fastly.jsdelivr.net/gh/${repo}@${ref}/bmc/dist/`,
    `https://gcore.jsdelivr.net/gh/${repo}@${ref}/bmc/dist/`, `https://rawcdn.githack.com/${repo}/${ref}/bmc/dist/`];
  // Runs only on the canvas page; on failure each file falls through the mirrors in order.
  const box = `<script>!function(d,w){if(!d.getElementById("bmc")&&!/^\\/page\\/bmc(\\.aspx)?\\/?$/i.test(w.location.pathname))return;` +
    `var c=${JSON.stringify(bases)};function n(f,h,t,a){if(a>=c.length)return;var e=d.createElement(t?"link":"script");` +
    `if(t){e.rel="stylesheet";e.href=c[a]+f}else e.src=c[a]+f;e.integrity=h;e.crossOrigin="anonymous";` +
    `e.onerror=function(){e.parentNode&&e.parentNode.removeChild(e);n(f,h,t,a+1)};d.head.appendChild(e)}` +
    `n("bmc.css","${sri(css)}",1,0);n("bmc.js","${sri(js)}",0,0)}(document,window);</script>`;
  fs.writeFileSync(path.join(dist, 'bmc-box.html'), box);
  console.log('bmc-box.html', box.length, 'chars, pinned to', ref);
} else console.log('BMC_REF not set: bmc-box.html not written');

const head = '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بوم مدل کاروکسب نِت‌امداد</title>';
const offCss = css.replace('url(vazirmatn-arabic.woff2)', `url(data:font/woff2;base64,${font.toString('base64')})`);
if (offCss === css) throw new Error('font url not found in css');
const offline = `${head}<style>body{margin:0;padding:24px 16px;background:#ECF0ED}.bmc:not(.bmc-stage){max-width:1400px;margin:0 auto}</style><style>${offCss}</style></head><body>${page}<script>${js}</script></body></html>`;
fs.writeFileSync(path.join(dist, 'bmc-offline.html'), offline);
for (const f of ['bmc-page.html', 'bmc.css', 'bmc.js', 'bmc-offline.html']) console.log(f, fs.statSync(path.join(dist, f)).size, 'bytes');
