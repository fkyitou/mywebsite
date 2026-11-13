// Builds the paste-ready Blogfa code (one line, no newline characters) and the
// offline single-file version from src/bmc.src.html.
//   BMC_ESBUILD  optional path to an esbuild package (default: "esbuild")
//   BMC_FONT     optional path to a Vazirmatn .woff2 to embed in the offline file
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const esbuild = require(process.env.BMC_ESBUILD || 'esbuild');
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, 'src/bmc.src.html'), 'utf8');

const css = src.match(/<style id="bmc-css">([\s\S]*?)<\/style>/)[1];
const js = src.match(/<script id="bmc-js">([\s\S]*?)<\/script>/)[1];
const html = src.slice(src.indexOf('</style>') + 8, src.indexOf('<script id="bmc-js">'));
const oneLine = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean).join('');

const jsMin = (await esbuild.transform(js, {
  minify: true, charset: 'utf8', target: 'es2017', legalComments: 'none',
})).code.trim();

// Blogfa's page editor turns every newline into <br>, and a literal </script
// or <!-- inside the script would end it early, so both are build errors.
if (/<\/script|<!--/i.test(jsMin)) throw new Error('script contains </script or <!--');
if (/<\/style/i.test(css)) throw new Error('css contains </style');

const head = '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
const body = `<style id="bmc-css">${oneLine(css)}</style>${oneLine(html)}<script id="bmc-js">${jsMin}</script>`;
const blogfa = head + body;
if (/[\r\n]/.test(blogfa)) throw new Error('output must be a single line');

let font = '';
if (process.env.BMC_FONT) {
  const b64 = fs.readFileSync(process.env.BMC_FONT).toString('base64');
  font = `<style>@font-face{font-family:Vazirmatn;src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:100 900;font-display:swap}</style>`;
}
const offline = `${head}<title>بوم مدل کسب‌وکار | آینده‌نگار</title>${font}${body}`;

fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
fs.writeFileSync(path.join(here, 'dist/bmc-blogfa.html'), blogfa);
fs.writeFileSync(path.join(here, 'dist/bmc-offline.html'), offline);
console.log('bmc-blogfa.html', Buffer.byteLength(blogfa), 'bytes;', 'bmc-offline.html', Buffer.byteLength(offline), 'bytes');
