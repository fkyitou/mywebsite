/* آینده‌نگار · page builders: home (realms, cards, numbers), lists, and the single-article experience
   (banner, table of contents, glossary tips, charts, share, author, prev/next, related, comments, lab). */
(function () {
  'use strict';
  var W = window, D = document, AN = W.AN;
  if (!AN || !AN.$) return;
  var $ = AN.$, $$ = AN.$$, el = AN.el, esc = AN.esc;
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>';

  /* ---------- reading posts out of Blogfa's markup ---------- */
  function readPost(a) {
    var body = a.querySelector('.an-post-body'), tl = a.querySelector('.an-post-title a') || a.querySelector('.an-post-title');
    var title = tl ? tl.textContent.trim() : '', cat = (a.getAttribute('data-cat') || '').trim();
    var text = body ? body.textContent : '', words = (text.match(/\S+/g) || []).length;
    var lead = body && (body.querySelector('.an-lead') || body.querySelector('p'));
    var ex = lead ? lead.textContent.trim() : text.trim().slice(0, 220);
    if (ex.length > 200) ex = ex.slice(0, 196).replace(/\s+\S*$/, '') + '…';
    var topic = AN.topicOf(title, cat, body), t = AN.TOPICS[topic];
    return {
      el: a, id: a.getAttribute('data-id') || '', url: a.getAttribute('data-link') || (tl && tl.href) || '#', title: title, cat: cat,
      date: a.getAttribute('data-date') || '', words: words, min: Math.max(1, Math.round(words / 200)), ex: ex, topic: topic,
      realm: cat ? AN.realmOf(cat) : (t ? t.c : 'default'), lab: !!(body && body.querySelector('.an-lab')),
      sources: body ? $$('.an-sources li', body).length : 0
    };
  }
  AN.readPost = readPost;

  /* ---------- comments: Blogfa injects BlogComments=[postId, count, …] at the top of <head> ---------- */
  function cmtCount(id) { var a = W.BlogComments; if (!a || !a.length) return -1; for (var i = 0; i + 1 < a.length; i += 2) if (String(a[i]) === String(id)) return +a[i + 1] || 0; return -1; }
  function cmtUrl(id) { var b = D.body.getAttribute('data-blog') || ''; return b && id ? '/comments/?blogid=' + encodeURIComponent(b) + '&postid=' + encodeURIComponent(id) : ''; }
  AN.cmtCount = cmtCount; AN.cmtUrl = cmtUrl;
  function fillCmt(root) {
    $$('.an-cmt[data-comment-for]', root).forEach(function (s) {
      var id = s.getAttribute('data-comment-for'), n = cmtCount(id), u = cmtUrl(id); if (!u) return;
      s.innerHTML = '<a href="' + esc(u) + '">' + (n > 0 ? AN.fa(n) + ' نظر' : 'نظر بدهید') + '</a>';
    });
  }

  /* ---------- covers (generative art per topic, drawn when visible) ---------- */
  var coverIO = null;
  function lazyCover(cv, topic, seed) {
    function draw() { if (AN.cover) AN.cover(cv, topic, seed); }
    if (!('IntersectionObserver' in W)) return draw();
    if (!coverIO) coverIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { coverIO.unobserve(e.target); e.target._draw(); } }); }, { rootMargin: '200px' });
    cv._draw = draw; coverIO.observe(cv);
  }
  AN.lazyCover = lazyCover;

  // «دوشنبه ۱۱ آبان ۱۴۰۵» → «۱۱ آبان ۱۴۰۵» (Blogfa's date string starts with the weekday)
  function shortDate(d) { return String(d).replace(/^\s*(?:یک|دو|سه|چهار|پنج)?\s*\u200c?\s*شنبه\s+|^\s*جمعه\s+/, ''); }
  // hl: heading level of the card title; h3 under a section heading, h2 straight under the page h1
  function card(p, i, feat, hl) {
    hl = hl || 'h3';
    var a = el('a', 'an-card an-rv' + (feat ? ' an-feat' : '')), t = AN.TOPICS[p.topic];
    a.href = p.url; a.style.setProperty('--rc', AN.color(p.realm)); a.style.setProperty('--d', (Math.min(i, 6) * 0.06) + 's');
    a.innerHTML = '<div class="an-cover"><canvas width="640" height="400" aria-hidden="true"></canvas><span class="an-cover-n">' + AN.faDigits(String(i + 1).padStart(2, '0')) + ' · ' + esc(t ? t.n : '') + '</span>' + (p.lab ? '<span class="an-cover-lab"><i></i>آزمایشگاه زنده</span>' : '') + '</div>' +
      '<div class="an-card-in">' + (feat ? '<span class="an-feat-badge">تازه‌ترین روایت</span>' : '') +
      // meta stays on one line in a three-column grid: the weekday is dropped (full date in the tooltip) and the
      // reading time is an icon + minutes; the comment count moves down beside «بخوانید»
      '<div class="an-card-meta">' + (p.cat ? '<span class="an-chip">' + esc(p.cat) + '</span>' : '') + (p.date ? '<span title="' + esc(p.date) + '">' + esc(shortDate(p.date)) + '</span>' : '') + (p.min ? '<span class="an-card-min">' + AN.icon('def') + AN.fa(p.min) + ' دقیقه<span class="an-sr"> خواندن</span></span>' : '') + '</div>' +
      '<' + hl + ' class="an-card-t">' + esc(p.title) + '</' + hl + '>' + (p.ex ? '<p class="an-card-ex">' + esc(p.ex) + '</p>' : '') +
      '<span class="an-card-foot"><span class="an-card-go">بخوانید' + ARROW + '</span>' + (cmtCount(p.id) > 0 ? '<span class="an-card-cmt">' + AN.icon('cmt') + AN.fa(cmtCount(p.id)) + ' نظر</span>' : '') + '</span></div>';
    lazyCover(a.querySelector('canvas'), p.topic, p.id || i);
    return a;
  }
  AN.card = card;

  /* ---------- home ---------- */
  function home() {
    var posts = $$('#an-feed > .an-post').map(readPost), box = $('#an-cards');
    if (box && posts.length) {
      posts.forEach(function (p, i) { box.appendChild(card(p, i, i === 0)); });
    }
    // realms from Blogfa categories, with how many of the posts on this page belong to each
    var realms = $('#an-realms'), cats = AN.cats();
    if (realms && cats.length) {
      realms.innerHTML = cats.map(function (c, i) {
        var n = posts.filter(function (p) { return AN.norm(p.cat) === AN.norm(c.name); }).length;
        return '<a class="an-realm an-rv" href="' + esc(c.url) + '" style="--rc:' + AN.color(c.realm) + ';--d:' + (i * 0.05) + 's"><span class="an-realm-ico">' + AN.icon(AN.realmIcon(c.realm)) + '</span><span class="an-realm-txt"><b>' + esc(c.name) + '</b><small>' + (n ? AN.fa(n) + ' مقاله در صفحه‌ی اول' : 'ورود به قلمرو') + '</small></span><span class="an-realm-go">' + ARROW + '</span></a>';
      }).join('');
    }
    // numbers band: computed from the posts on the page
    if (posts.length) {
      var labs = posts.filter(function (p) { return p.lab; }).length, src = posts.reduce(function (s, p) { return s + p.sources; }, 0), min = posts.reduce(function (s, p) { return s + p.min; }, 0);
      var vals = { posts: posts.length, labs: labs, sources: src, minutes: min };
      $$('.an-numbers [data-count]').forEach(function (b) {
        var k = b.getAttribute('data-count'), v = vals[k] || 0; b.textContent = AN.fa(v);
        if (!v) b.parentNode.style.display = 'none';
        else if (!AN.rm && 'IntersectionObserver' in W) {
          b.textContent = '۰';
          var io = new IntersectionObserver(function (es) { if (!es[0].isIntersecting) return; io.disconnect(); var t0 = performance.now(); (function f(t) { var q = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - q, 3); b.textContent = AN.fa(Math.round(v * e)); if (q < 1) requestAnimationFrame(f); })(t0); });
          io.observe(b);
        }
      });
    }
    $$('.an-numbers .an-num').forEach(function (n, i) { n.classList.add('an-rv'); n.style.setProperty('--d', (i * 0.07) + 's'); });
  }

  /* ---------- category / tag / older-page lists ---------- */
  function list() {
    var posts = $$('#an-feed > .an-post').map(readPost), feed = $('#an-feed'), head = $('#an-page-head');
    if (!posts.length || !feed) return;
    var cat = posts[0].cat, same = posts.every(function (p) { return p.cat === cat; }), path = decodeURIComponent(location.pathname);
    var title = /\/tag\//i.test(path) ? 'برچسب: ' + path.split('/').filter(Boolean).pop().replace(/[-_]/g, ' ') : (/\/category\//i.test(path) && same ? cat : 'نوشته‌ها');
    if (head) {
      var realm = AN.realmOf(title);
      head.style.setProperty('--rc', AN.color(realm));
      head.innerHTML = '<p class="an-eyebrow">' + (/\/category\//i.test(path) ? 'قلمرو' : 'آرشیو نوشته‌ها') + '</p><h1 class="an-page-title">' + esc(title) + '</h1><p class="an-page-sub">' + AN.fa(posts.length) + ' روایت در این صفحه. روی هر کارت بزن تا مقاله و آزمایشگاه زنده‌اش باز شود.</p>';
    }
    var grid = el('div', 'an-list-cards');
    posts.forEach(function (p, i) { grid.appendChild(card(p, i, false, 'h2')); });
    feed.insertBefore(grid, feed.firstChild);
  }

  /* ---------- the post page ---------- */
  function post() {
    var art = $('#an-feed > .an-post'); if (!art) return;
    var p = readPost(art), body = art.querySelector('.an-post-body'), foot = art.querySelector('.an-post-foot'), t = AN.TOPICS[p.topic];
    var main = $('#an-main'), feed = $('#an-feed');
    D.documentElement.style.setProperty('--rc', AN.color(p.realm));
    // banner
    var ban = el('section', 'an-banner');
    ban.innerHTML = '<div class="an-banner-art"><canvas aria-hidden="true"></canvas></div><div class="an-banner-in">' +
      '<div class="an-post-meta">' + (p.cat ? '<a class="an-chip" href="' + esc((art.querySelector('.an-post-cats a') || {}).href || '#') + '">' + esc(p.cat) + '</a>' : '') + (t ? '<span>' + esc(t.n) + '</span>' : '') + (p.lab ? '<span class="an-chip" style="--rc:#5FD49A">آزمایشگاه زنده دارد</span>' : '') + '</div>' +
      '<h1 class="an-post-title">' + esc(p.title) + '</h1>' +
      '<div class="an-banner-by"><span class="an-mono" aria-hidden="true">ا.ه</span><span>نوشته‌ی <b>امیرحسین همتی</b></span><span>' + esc(p.date) + '</span><span>' + AN.fa(p.min) + ' دقیقه خواندن</span><span>' + AN.fa(p.words) + ' واژه</span></div></div>';
    main.insertBefore(ban, feed); D.documentElement.classList.add('an-banner-on'); // same task: the band in 04-post.css gives way to the banner without a shift
    var bcv = ban.querySelector('canvas');
    function drawBanner() { if (AN.cover) AN.cover(bcv, p.topic, p.id || 1, { banner: true }); }
    drawBanner(); var rz; W.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(drawBanner, 250); });
    var rt = art.querySelector('.an-rt'); if (rt) rt.textContent = AN.fa(p.min) + ' دقیقه';
    // layout: article + toc
    var wrap = el('div', 'an-article'); art.appendChild(wrap); wrap.appendChild(body); if (foot) wrap.appendChild(foot);
    var hs = $$('h2', body), toc = null;
    hs.forEach(function (h, i) { if (!h.id) h.id = 'an-s' + (i + 1); });
    if (hs.length > 1) {
      toc = el('nav', 'an-toc'); toc.setAttribute('aria-label', 'فهرست این مقاله');
      toc.innerHTML = '<p class="an-toc-h" role="button" tabindex="0" aria-expanded="false"><svg class="an-toc-ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="bg" cx="20" cy="20" r="16" pathLength="100"/><circle class="fg" cx="20" cy="20" r="16" pathLength="100"/></svg><span>در این مقاله<small>' + AN.fa(hs.length) + ' بخش · ' + AN.fa(p.min) + ' دقیقه</small></span></p><ol>' +
        hs.map(function (h) { return '<li><a href="#' + h.id + '">' + esc(h.textContent) + '</a></li>'; }).join('') + '</ol>' +
        '<div class="an-toc-tools"><button type="button" class="an-btn an-btn-ghost an-btn-sm" data-an="copy">کپی پیوند</button>' + (p.lab ? '<a class="an-btn an-btn-ghost an-btn-sm" href="#an-lab">برو به آزمایشگاه</a>' : '') + '</div>';
      wrap.insertBefore(toc, body);
      var th = toc.querySelector('.an-toc-h');
      function tt() { var o = !toc.classList.contains('open'); toc.classList.toggle('open', o); th.setAttribute('aria-expanded', o); }
      th.addEventListener('click', tt); th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tt(); } });
      var links = $$('a', toc), ticking = false;
      function spy() {
        ticking = false; var y = W.scrollY + 140, cur = 0;
        hs.forEach(function (h, i) { if (h.getBoundingClientRect().top + W.scrollY <= y) cur = i; });
        links.forEach(function (l, i) { l.classList.toggle('on', i === cur); });
        var r = body.getBoundingClientRect(), prog = Math.min(1, Math.max(0, (W.innerHeight * 0.4 - r.top) / Math.max(1, r.height)));
        toc.style.setProperty('--p', prog.toFixed(3));
      }
      W.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true }); spy();
    }
    // heading anchors
    hs.forEach(function (h) { h.classList.add('an-rv'); });
    // glossary tooltips
    // The floating tip is visual only; each term points to its own hidden definition, so screen readers
    // get the right description even before (or without) the tip being shown.
    var tip = el('div', 'an-tip'); tip.setAttribute('aria-hidden', 'true'); tip.id = 'an-tip'; D.body.appendChild(tip);
    var defs = el('div', 'an-tip-defs'); defs.hidden = true; D.body.appendChild(defs);
    $$('abbr[title]', body).forEach(function (ab, i) {
      var def = el('span'); def.id = 'an-tip-d' + i; def.textContent = ab.title; defs.appendChild(def);
      ab.setAttribute('data-tip', ab.title); ab.removeAttribute('title'); ab.tabIndex = 0; ab.setAttribute('aria-describedby', def.id);
      function show() { tip.innerHTML = '<b>' + esc(ab.textContent) + '</b>' + esc(ab.getAttribute('data-tip')); var r = ab.getBoundingClientRect(); tip.classList.add('on'); var tw = tip.offsetWidth, x = Math.min(W.innerWidth - tw - 12, Math.max(12, r.left + r.width / 2 - tw / 2)), y = r.bottom + W.scrollY + 10; tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
      function hide() { tip.classList.remove('on'); }
      ab.addEventListener('mouseenter', show); ab.addEventListener('focus', show); ab.addEventListener('mouseleave', hide); ab.addEventListener('blur', hide);
      ab.addEventListener('click', function (e) { e.preventDefault(); tip.classList.contains('on') ? hide() : show(); });
    });
    // evidence badges get an accessible description
    var EV = { 4: 'سطح شاهد: مشاهده و اندازه‌گیری‌شده', 3: 'سطح شاهد: نظریه‌ی پذیرفته', 2: 'سطح شاهد: فرضیه', 1: 'سطح شاهد: گمانه‌زنی' };
    $$('.an-ev', body).forEach(function (e) { var m = /an-ev-(\d)/.exec(e.className); if (m) e.title = EV[m[1]]; });
    // cross references to other articles: <a class="an-xref" data-topic="security">…</a>
    var idx = AN.index();
    $$('a.an-xref', body).forEach(function (x) { var k = x.getAttribute('data-topic') || (/\ban-to-([a-z]+)\b/.exec(x.className) || [])[1], hit = idx.filter(function (q) { return q.topic === k; })[0]; if (hit) x.href = hit.url; else { var s = el('span', 'an-xref-off', x.innerHTML); x.parentNode.replaceChild(s, x); } });
    // charts from data tables
    if (AN.charts) AN.charts(body);
    // share
    var url = String(document.URL).split('#')[0], ut = encodeURIComponent(p.title), uu = encodeURIComponent(url);
    var share = el('div', 'an-share');
    share.innerHTML = '<b>اشتراک‌گذاری:</b>' +
      '<a href="https://t.me/share/url?url=' + uu + '&text=' + ut + '" target="_blank" rel="noopener">تلگرام</a>' +
      '<a href="https://wa.me/?text=' + ut + '%20' + uu + '" target="_blank" rel="noopener">واتس‌اپ</a>' +
      '<a href="https://twitter.com/intent/tweet?url=' + uu + '&text=' + ut + '" target="_blank" rel="noopener">ایکس</a>' +
      '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + uu + '" target="_blank" rel="noopener">لینکدین</a>' +
      '<button type="button" data-an="copy">کپی پیوند</button>' + (navigator.share ? '<button type="button" data-an="native">بیشتر…</button>' : '');
    if (foot) foot.insertBefore(share, foot.firstChild); else wrap.appendChild(share);
    $$('[data-an="copy"]').forEach(function (b) { b.addEventListener('click', function () { var ok = function () { AN.toast('پیوند مقاله کپی شد'); }; if (navigator.clipboard && W.isSecureContext) navigator.clipboard.writeText(url).then(ok, function () { prompt('پیوند را کپی کن:', url); }); else prompt('پیوند را کپی کن:', url); }); });
    var nat = share.querySelector('[data-an="native"]'); if (nat) nat.addEventListener('click', function () { navigator.share({ title: p.title, url: url }).catch(function () {}); });
    // comments: the count goes into span[data-comment-for] (from window.BlogComments); we open its page inside a dialog (falls back to the normal link)
    // comments: only when Blogfa renders the comment block for this post (comments switched on)
    var cu = art.querySelector('.an-cmt') ? cmtUrl(p.id) : '', cn = cmtCount(p.id);
    fillCmt(art);
    if (cu) {
      var talk = el('div', 'an-talk');
      talk.innerHTML = '<p>نظرت درباره‌ی این روایت چیست؟ پرسش، نقد یا ایده‌ات را بنویس.' + (cn > 0 ? ' تا الان <b>' + AN.fa(cn) + ' نظر</b> ثبت شده است.' : '') + '</p><a class="an-btn an-btn-primary an-btn-sm" href="' + esc(cu) + '" data-an="cmt">نوشتن و خواندن نظرها</a>';
      if (foot) foot.appendChild(talk);
    }
    function openCmt(e) {
      if (!cu) return; e.preventDefault();
      var d = AN.dialog('an-cmt', '<div class="an-dlg-head"><h2>نظرها</h2><a class="an-btn an-btn-ghost an-btn-sm" href="' + esc(cu) + '" target="_blank" rel="noopener">باز کردن در صفحه‌ی جدید</a><button type="button" class="an-dlg-x" aria-label="بستن">✕</button></div><iframe class="an-cmt-frame" title="نظرهای این مقاله" loading="lazy"></iframe>', 'an-dlg-cmt');
      var f = d.querySelector('iframe');
      if (f && !f.getAttribute('src')) {
        // If the comments page refuses to be framed, the frame lands on an error page we cannot read;
        // swap the blank frame for a message and a link instead of leaving an empty white box.
        f.addEventListener('load', function () {
          var href = null, ok = false;
          try { href = f.contentWindow.location.href; } catch (e) {}
          if (href === 'about:blank') return;
          try { var doc = f.contentDocument; ok = !!(doc && doc.body && doc.body.childElementCount); } catch (e) {}
          if (!ok && f.parentNode) {
            var m = el('p', 'an-cmt-off', 'صفحه‌ی نظرها داخل این پنجره باز نشد. <a href="' + esc(cu) + '" target="_blank" rel="noopener">نظرها را در صفحه‌ی جدید باز کنید</a>.');
            f.parentNode.replaceChild(m, f);
          }
        });
        f.src = cu;
      }
      AN.openDlg(d, '.an-dlg-x');
    }
    $$('[data-an="cmt"]').forEach(function (a) { a.addEventListener('click', openCmt); });
    D.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('.an-cmt a'); if (a && cu) openCmt(e); });
    // prev / next (footer index is newest-first)
    var pos = -1; idx.forEach(function (q, i) { if (q.id && q.id === p.id) pos = i; });
    if (pos < 0) idx.forEach(function (q, i) { if (AN.norm(q.title) === AN.norm(p.title)) pos = i; });
    var pn = el('nav', 'an-pn'); pn.setAttribute('aria-label', 'مقاله‌های قبلی و بعدی');
    var older = pos > -1 ? idx[pos + 1] : null, newer = pos > 0 ? idx[pos - 1] : null;
    pn.innerHTML = (older ? '<a href="' + esc(older.url) + '" rel="prev"><small>→ روایت قبلی</small>' + esc(older.title) + '</a>' : '<span></span>') + (newer ? '<a href="' + esc(newer.url) + '" rel="next"><small>روایت بعدی ←</small>' + esc(newer.title) + '</a>' : '');
    if (older || newer) (foot || wrap).appendChild(pn);
    // related: same realm first, then neighbours
    var mine = AN.TOPICS[p.topic] ? AN.TOPICS[p.topic].c : '';
    var rel = idx.filter(function (q) { return q !== idx[pos] && AN.norm(q.title) !== AN.norm(p.title); }).sort(function (a, b) { var sa = (AN.TOPICS[a.topic] || {}).c === mine ? 0 : 1, sb = (AN.TOPICS[b.topic] || {}).c === mine ? 0 : 1; return sa - sb || Math.abs(a.i - pos) - Math.abs(b.i - pos); }).slice(0, 3);
    if (rel.length) {
      var rs = el('section', 'an-related'); rs.setAttribute('aria-labelledby', 'an-rel-h');
      rs.innerHTML = '<p class="an-eyebrow">ادامه‌ی سفر</p><h2 id="an-rel-h">روایت‌های پیشنهادی</h2><div class="an-related-grid"></div>';
      var g = rs.querySelector('.an-related-grid');
      rel.forEach(function (q, i) { var tt2 = AN.TOPICS[q.topic]; g.appendChild(card({ url: q.url, title: q.title, cat: tt2 ? tt2.n : '', date: q.date, min: 0, ex: '', topic: q.topic, realm: tt2 ? tt2.c : 'default', lab: false, id: q.id }, i, false)); });
      $$('.an-card-meta span', g).forEach(function (s) { if (/دقیقه/.test(s.textContent)) s.remove(); });
      art.parentNode.insertBefore(rs, art.nextSibling);
    }
    // lab
    var lab = body.querySelector('.an-lab');
    if (lab) { lab.id = 'an-lab'; AN.mountLab(lab, p.topic); }
  }

  /* ---------- labs: registered by labs/*.js, mounted when near the viewport ---------- */
  AN.labs = AN.labs || {};
  AN.mountLab = function (box, topic) {
    var m = /an-lab-([a-z]+)/.exec(box.className), key = (m && m[1]) || box.getAttribute('data-lab') || topic;
    var def = AN.labs[key]; if (!def) return;
    function go() {
      if (box.classList.contains('on')) return; box.classList.add('on');
      var t = AN.TOPICS[key]; box.style.setProperty('--rc', AN.color(t ? t.c : 'default'));
      var head = el('div', 'an-lab-head', '<span class="an-lab-badge"><i></i>آزمایشگاه زنده</span><div><h3>' + esc(def.title) + '</h3><p>' + esc(def.sub || '') + '</p></div>');
      box.appendChild(head);
      var root = el('div', 'an-lab-root'); box.appendChild(root);
      try { def.mount(root, { rm: AN.rm, fa: AN.fa }); } catch (e) { root.innerHTML = '<p class="an-lab-note">این آزمایشگاه در مرورگر شما اجرا نشد. نسخه‌ی تازه‌تر مرورگر را امتحان کنید.</p>'; if (W.console) console.warn('[lab ' + key + ']', e); }
    }
    if (!('IntersectionObserver' in W) || (location.hash.length > 1 && location.hash !== '#an-lab')) return go();
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '400px' }); io.observe(box);
    waitingLabs.push(function () { io.disconnect(); go(); });
  };
  // An in-page jump (table of contents, a heading link) is aimed before it starts. A lab mounted on the way
  // grows by its whole height (about 1000 px), pushes the heading down, and the reader lands inside the lab.
  // So a jump first builds the labs still waiting, and the browser then scrolls to where the heading really is.
  var waitingLabs = [];
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1 && waitingLabs.length) waitingLabs.splice(0).forEach(function (f) { f(); });
  }, true);

  AN.pages = function () {
    fillCmt(D);
    if (AN.page === 'home') home();
    else if (AN.page === 'post') post();
    else if (AN.page === 'list' || AN.page === 'titles') list();
    else if (AN.page === 'page') { if (AN.charts) AN.charts($('.an-post-body') || D.body); }
  };
})();
