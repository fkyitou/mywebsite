#!/usr/bin/env node
/* آینده‌نگار · Blogfa emulator
   Renders dist/template*.html the way Blogfa does — <-Tags->, <BLOGFA> loop, Blog… blocks, the injected
   BlogComments array — with the real posts in posts/ and pages/, so the template can be tested in a browser
   before anything is pasted into Blogfa.

   node tools/preview.mjs                         → preview/   (flat files; open preview/index.html)
   node tools/preview.mjs --mode root --out q     → q/post/1/index.html … (Blogfa-like URLs for a local server)
   options: --template dist/template-lite.html  --posts <dir>  --ads (adds a mock ad bar to test layout) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const MODE = arg('mode', 'flat');
const OUT = path.resolve(ROOT, arg('out', MODE === 'flat' ? 'preview' : 'preview-root'));
const TPL = path.resolve(ROOT, arg('template', 'dist/template.html'));
const POSTS = path.resolve(ROOT, arg('posts', 'posts'));
const PAGES = path.resolve(ROOT, arg('pages', 'pages'));
const ADS = !!arg('ads', false);

const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- source files ---------- */
function front(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^<!--([\s\S]*?)-->\s*/);
  const meta = {};
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^\s*([a-z_]+)\s*:\s*(.*)$/i); if (k) meta[k[1].toLowerCase()] = k[2].trim(); }
  return { meta, body: m ? raw.slice(m[0].length) : raw };
}
const tpl = fs.readFileSync(TPL, 'utf8');
const pick = tag => { const m = tpl.match(new RegExp(`<blog:${tag}>([\\s\\S]*?)</blog:${tag}>`)); if (!m) throw new Error('template has no ' + tag); return m[1]; };
const T = { post: pick('PostTemplate'), archive: pick('ArchiveTemplate'), page: pick('PageTemplate') };

const postFiles = fs.existsSync(POSTS) ? fs.readdirSync(POSTS).filter(f => /^\d\d-[\w-]+\.html$/.test(f)).sort() : [];
const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const DAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const cats = [], tags = new Map();
// posts are numbered in publishing order: 01 is published first, so Blogfa shows 10 on top
const posts = postFiles.map((f, i) => {
  const { meta, body } = front(path.join(POSTS, f));
  const id = i + 1;
  const catNames = (meta.category || '').split(/[،,]/).map(s => s.trim()).filter(Boolean);
  const pc = catNames.map(n => { let c = cats.find(x => x.name === n); if (!c) { c = { id: cats.length + 1, name: n, count: 0 }; cats.push(c); } c.count++; return c; });
  const pt = (meta.tags || '').split(/[،,]/).map(s => s.trim()).filter(Boolean);
  pt.forEach(t => tags.set(t, (tags.get(t) || 0) + 1));
  const [main, extended] = body.split(/<!--\s*more\s*-->/);
  const day = 4 + i; // 1405/08/04 … : one post a day
  const wd = DAYS[(1 + i) % 7];
  return { id, file: f, title: meta.title || f, cats: pc, tags: pt, main, extended: extended || '', comments: meta.comments !== 'off',
    // the live blog writes the time in Latin digits ("5:49", seen 2026-11-05); the template turns them Persian
    date: `${wd} ${fa(day)} آبان ${fa(1405)}`, time: `${9 + (i % 9)}:${(i * 7) % 60 < 10 ? '0' : ''}${(i * 7) % 60}`, ncmt: [3, 0, 7, 1, 0, 12, 2, 0, 5, 4][i % 10] };
}).reverse(); // newest first, like Blogfa
const pages = fs.existsSync(PAGES) ? fs.readdirSync(PAGES).filter(f => f.endsWith('.html')).map(f => { const { meta, body } = front(path.join(PAGES, f)); return { slug: f.replace(/\.html$/, ''), id: 1, title: meta.title || f, body }; }) : [];

/* ---------- URLs ---------- */
const U = MODE === 'flat'
  ? { home: 'index.html', post: id => `post-${id}.html`, cat: id => `cat-${id}.html`, tag: t => `tag-${encodeURIComponent(t).replace(/%/g, '')}.html`, archive: 'archive.html', titles: 'posts.html', page: s => `page-${s}.html`, comments: 'comments.html', month: 'month-1405-08.html', rss: '#rss' }
  : { home: '/', post: id => `/post/${id}`, cat: id => `/category/${id}`, tag: t => `/tag/${encodeURIComponent(t)}`, archive: '/archive', titles: '/posts/', page: s => `/page/${s}`, comments: '/comments/', month: '/1405/08', rss: '/rss' };
const fileFor = url => MODE === 'flat' ? url : (url === '/' ? 'index.html' : url.replace(/^\//, '').replace(/\/?$/, '/index.html'));

const BLOG = {
  BlogId: 'ayandehnegar', BlogTitle: 'آینده‌نگار', BlogAuthor: 'امیرحسین همتی', BlogUrl: U.home, BlogXmlLink: U.rss,
  BlogDescription: 'روایت انسان، ایده و فناوری؛ مجله‌ای آنلاین درباره‌ی فناوری‌هایی که فردای ما را می‌سازند.',
  BlogMetaDescription: 'آینده‌نگار: روایت انسان، ایده و فناوری. مقاله‌های مستند با آزمایشگاه‌های تعاملی درباره‌ی هوش مصنوعی، اینترنت اشیا، شهر هوشمند، امنیت، مغز، فضا، معماری، الگوریتم‌ها، انرژی پاک و اختراع.',
  BlogArchiveLink: U.archive, BlogAbout: 'آینده‌نگار، پروژه‌ی کارگاهی درس تجارت الکترونیک و امنیت شبکه.', BlogPhotoLink: '', BlogEmail: '', BlogProfileLink: '#', BlogCustomHtml: '', BlogTimeZone: '+03:30'
};
const allTags = [...tags].map(([name, count]) => ({ TagName: name, TagLink: U.tag(name), TagCount: fa(count) }));
const postCtx = p => ({
  PostId: String(p.id), PostTitle: p.title, PostContent: p.main, PostDate: p.date, PostTime: p.time, PostLink: U.post(p.id),
  // The live blog leaves these two tags as they are (seen 2026-11-05), so the preview does too: a template that
  // still used them would show the raw tag here, as it would on Blogfa.
  PostAuthor: BLOG.BlogAuthor, PostAuthorId: '1', PostAuthorEmail: '', PostAuthorLink: '#', PostCategory: '<-PostCategory->',
  PostCategoryId: '<-PostCategoryId->', _post: p
});

/* ---------- the template engine ---------- */
const BLOCKS = {
  BLOGFA: { loop: c => c._feed.map(postCtx) },
  BlogPreviousItems: { loop: (c, a) => posts.slice(0, Math.min(30, +a.items || 10)).map(postCtx) },
  BlogCategories: { loop: () => cats.map(x => ({ CategoryName: x.name, CategoryLink: U.cat(x.id), CategoryId: String(x.id), CategoryCount: fa(x.count) })) },
  BlogTags: { loop: () => allTags },
  BlogArchive: { loop: () => posts.length ? [{ ArchiveTitle: 'آبان ۱۴۰۵', ArchiveLink: U.month }] : [] },
  BlogLinks: { loop: () => [] }, BlogLinkDump: { loop: () => [] }, BlogAuthors: { loop: () => [] },
  BlogPostCategories: { loop: (c, a) => c._post.cats.map(x => ({ CategoryName: x.name, CategoryLink: U.cat(x.id), CategoryId: String(x.id) })), sep: true },
  BlogPostTags: { loop: (c, a) => c._post.tags.map(t => ({ TagName: t, TagLink: U.tag(t) })), sep: true },
  BlogComment: { when: c => c._post && c._post.comments },
  BlogExtendedPost: { when: c => c._post && !!c._post.extended && !c._single },
  BlogPostCategoriesBlock: { when: c => c._post && c._post.cats.length > 0 },
  BlogPostTagsBlock: { when: c => c._post && c._post.tags.length > 0 },
  BlogNextAndPreviousBlock: { when: c => !!(c._prev || c._next) }, BlogPreviousPageBlock: { when: c => !!c._prev }, BlogNextPageBlock: { when: c => !!c._next },
  BlogProfile: { when: () => !!BLOG.BlogAbout }, BlogPhoto: { when: () => !!BLOG.BlogPhotoLink },
  BlogProfileLinkBlock: { when: () => false }, BlogEmailBlock: { when: () => !!BLOG.BlogEmail },
  BlogPreviousItemsBlock: { when: () => posts.length > 0 }, BlogCategoriesBlock: { when: () => cats.length > 0 }, BlogTagsBlock: { when: () => allTags.length > 0 },
  BlogArchiveBlock: { when: () => posts.length > 0 }, BlogLinksBlock: { when: () => false }, BlogLinkDumpBlock: { when: () => false }, BlogAuthorsBlock: { when: () => false }
};
const unknown = new Set();
function render(src, ctx) {
  let out = '', i = 0;
  const open = /<(BLOGFA|Blog[A-Za-z]+)((?:\s+[a-z]+="[^"]*")*)\s*>/g;
  for (;;) {
    open.lastIndex = i;
    const m = open.exec(src);
    if (!m) { out += src.slice(i); break; }
    const name = m[1], def = BLOCKS[name];
    if (!def) { unknown.add('<' + name + '>'); out += src.slice(i, open.lastIndex); i = open.lastIndex; continue; }
    const close = src.indexOf(`</${name}>`, open.lastIndex);
    if (close < 0) throw new Error('unclosed <' + name + '>');
    out += src.slice(i, m.index);
    const inner = src.slice(open.lastIndex, close), attrs = {};
    m[2].replace(/([a-z]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; });
    if (def.loop) {
      const items = def.loop(ctx, attrs).map(it => render(inner, Object.assign(Object.create(ctx), it, it._post ? { _post: it._post } : {})));
      out += items.join(def.sep ? (attrs.separator || '') : '');
    } else if (def.when(ctx)) out += render(inner, ctx);
    i = close + name.length + 3;
  }
  return out.replace(/<-([A-Za-z]+)->/g, (all, k) => { if (k in ctx) return ctx[k]; unknown.add(all); return ''; });
}

/* ---------- page assembly ---------- */
const PAGE_FOR = { post: 'post', home: 'home', list: 'list', titles: 'titles' };
function finish(html, kind, extraHead) {
  const cmts = `<script type="text/javascript">\nBlogComments=[${posts.map(p => `${p.id},${p.ncmt}`).join(',')}];\n</script>`;
  // Blogfa puts BlogComments at the very top of <head>
  html = html.replace(/(<head>\s*(<meta http-equiv="Content-Type"[^>]*>)?)/i, `$1${cmts}`);
  if (MODE === 'flat') {
    const hint = PAGE_FOR[kind] ? `<script>window.AN_PAGE=${JSON.stringify(PAGE_FOR[kind])};</script>` : '';
    html = html.replace(/(<head>)/i, `$1${hint}`)
      .replace(/href="\/posts\/"/g, `href="${U.titles}"`).replace(/href="\/page\/about"/g, `href="${U.page('about')}"`)
      .replace(/href="\/category\/(\d+)"/g, (m, id) => `href="${U.cat(id)}"`);
    const shim = `<script>/* preview only: map Blogfa paths to the flat preview files */document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="/"]');if(!a)return;var h=a.getAttribute('href'),m;if(/^\\/page\\/about/.test(h))a.setAttribute('href','${U.page('about')}');else if(/^\\/archive/.test(h))a.setAttribute('href','${U.archive}');else if(/^\\/posts\\//.test(h))a.setAttribute('href','${U.titles}');else if((m=/^\\/comments\\/\\?.*postid=(\\d+)/.exec(h)))a.setAttribute('href','${U.comments}?postid='+m[1]);},true);document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('iframe').forEach(function(f){var s=f.getAttribute('src')||'';if(/^\\/comments\\//.test(s))f.setAttribute('src','${U.comments}');});});</script>`;
    html = html.replace(/<\/body>/i, shim + '</body>');
  }
  // the same shape as the ad bar on the live blog (2026-11-05): first child of <body>, no class, fixed to the bottom
  if (ADS) html = html.replace(/<body([^>]*)>/i, '<body$1><div id="46471336" style="position: fixed; bottom: 0px; left: 0px; right: 0px; width: 728px; text-align: center; margin: 0px auto; padding: 0px; max-width: 100%; z-index: 9999;"><div style="height:90px;background:#ffe9a8;color:#333;font:13px Tahoma;display:flex;align-items:center;justify-content:center;border-top:1px solid #d9c27a">نمونه‌ی تبلیغ تزریقی بلاگفا (فقط برای آزمون چیدمان)</div></div>');
  return html.replace(/^\s+/, '');
}
function emit(url, html) { const f = path.join(OUT, fileFor(url)); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); }

const base = Object.assign(Object.create(null), BLOG);
const ctxFor = (extra) => Object.assign(Object.create(base), extra);
fs.rmSync(OUT, { recursive: true, force: true });

// home: Blogfa shows N posts per page; the guide asks for 10
const PER = 10;
emit(U.home, finish(render(T.post, ctxFor({ _feed: posts.slice(0, PER), _next: posts.length > PER ? 'x' : '', BlogNextPageLink: '#older', BlogAndPostTitle: BLOG.BlogTitle, AutoPageTitle: BLOG.BlogTitle })), 'home'));
// single posts
for (const p of posts) emit(U.post(p.id), finish(render(T.post, ctxFor({ _feed: [Object.assign({}, p, { main: p.main + (p.extended || '') })], _single: true, BlogAndPostTitle: `${BLOG.BlogTitle} - ${p.title}`, AutoPageTitle: p.title })), 'post'));
// categories and tags
for (const c of cats) emit(U.cat(c.id), finish(render(T.post, ctxFor({ _feed: posts.filter(p => p.cats.includes(c)), BlogAndPostTitle: `${BLOG.BlogTitle} - ${c.name}`, AutoPageTitle: c.name })), 'list'));
for (const t of allTags) emit(t.TagLink, finish(render(T.post, ctxFor({ _feed: posts.filter(p => p.tags.includes(t.TagName)), BlogAndPostTitle: `${BLOG.BlogTitle} - ${t.TagName}`, AutoPageTitle: t.TagName })), 'list'));
// /posts/ is a page of Blogfa's own that no template reaches (seen 2026-11-05): a plain list of links and dates.
// The archive page reads it and shows it in the blog's design, so the preview carries the same plain page.
emit(U.titles, `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>${BLOG.BlogTitle} - فهرست مطالب</title><style>body{font:12px Tahoma;margin:0;background:#fff;color:#222}#titlebox{padding:10px;border-bottom:1px solid #ddd}#result{padding:10px;line-height:2}.d{color:#888}.pagination a{margin:0 4px}</style></head><body><div id="titlebox"><a href="${U.home}">${BLOG.BlogTitle}</a> - فهرست مطالب</div><div id="result">${posts.map(p => `<a href="${U.post(p.id)}">${p.title}</a> - <span class="d">${p.date}</span><br>`).join('\n')}</div><div class="pagination"></div><p>Powered by BLOGFA.COM</p></body></html>`);
emit(U.month, finish(render(T.post, ctxFor({ _feed: posts, BlogAndPostTitle: `${BLOG.BlogTitle} - آبان ۱۴۰۵`, AutoPageTitle: 'آبان ۱۴۰۵' })), 'list'));
// archive and separate pages
emit(U.archive, finish(render(T.archive, ctxFor({})), 'archive'));
for (const pg of pages) emit(U.page(pg.slug), finish(render(T.page, ctxFor({ BlogPageTitle: pg.title, BlogPageContent: pg.body, BlogPageId: String(pg.id), BlogAndPageTitle: `${BLOG.BlogTitle} - ${pg.title}`, BlogPageLink: U.page(pg.slug) })), 'page'));
// a stand-in for Blogfa's comments page
const cm = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>نظرات</title><style>body{margin:0;font:15px/1.9 Tahoma,sans-serif;background:#f4f4f4;color:#222}main{max-width:560px;margin:0 auto;padding:16px}label{display:block;margin-top:10px}input,textarea{width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;font:inherit}textarea{min-height:120px}button{margin-top:12px;padding:8px 18px}p.n{background:#fff8d6;border:1px solid #e8d48a;padding:8px 12px;border-radius:6px}</style></head><body><main><p class="n">پیش‌نمایش محلی: در وبلاگ واقعی، این قاب صفحه‌ی نظرات خود بلاگفا را نشان می‌دهد.</p><h1>نظر شما</h1><label>نام شما:<input></label><label>آدرس وب‌سایت یا وبلاگ:<input dir="ltr"></label><label>ایمیل:<input dir="ltr"></label><label>متن نظر:<textarea placeholder="نظر خود را اینجا بنویسید ..."></textarea></label><button type="button">ثبت نظر</button></main></body></html>`;
const cmFile = path.join(OUT, MODE === 'flat' ? U.comments : 'comments/index.html');
fs.mkdirSync(path.dirname(cmFile), { recursive: true }); fs.writeFileSync(cmFile, cm);

console.log(`preview (${MODE}) → ${path.relative(ROOT, OUT)}/  ·  ${posts.length} posts, ${cats.length} categories, ${allTags.length} tags, ${pages.length} pages  ·  template ${path.relative(ROOT, TPL)}`);
if (unknown.size) console.log('note: tags/blocks the emulator does not know (left empty):', [...unknown].join(' '));
