/* آینده‌نگار · core: utilities, topics, header, A/B versions, search palette, shortcuts, live sky panel.
   No external libraries. Every feature is optional: if something fails, the page stays a readable blog. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement, AN = W.AN || (W.AN = { page: 'list', v: 'a', rm: false });
  var $ = function (s, r) { return (r || D).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  AN.$ = $; AN.$$ = $$;
  AN.fa = function (n, d) { return Number(n).toLocaleString('fa-IR', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d || 0 }); };
  AN.faDigits = function (s) { return String(s).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'[c]; }); };
  AN.norm = function (s) { return String(s || '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ً-ْٰـ]/g, '').replace(/[‌‏‎]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); };
  AN.el = function (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  AN.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  AN.store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  AN.fine = !!(W.matchMedia && W.matchMedia('(hover: hover) and (pointer: fine)').matches);
  var toastT;
  // a longer message stays longer: about 60 ms a character, never under 2.6 s
  AN.toast = function (msg) { var t = $('#an-toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, Math.max(2600, String(msg).length * 60)); };

  /* ---------- topics & realms ---------- */
  var IC = {
    ai: '<path d="M9 4h6M12 4v3"/><rect x="5" y="7" width="14" height="12" rx="4"/><circle cx="9.5" cy="12.5" r="1.3"/><circle cx="14.5" cy="12.5" r="1.3"/><path d="M9.5 16h5M3 12h2M19 12h2"/>',
    net: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><circle cx="12" cy="13" r="2.4"/><path d="M12 7.2v3.4M10.2 14.4 6.7 16.6M13.8 14.4l3.5 2.2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5"/>',
    city: '<path d="M3 21h18M5 21V10l5-3v14M10 21V4l6 3v14M16 21v-9l3 1.5V21"/><path d="M7 13h1M7 16h1M12.5 9h1M12.5 12h1M12.5 15h1"/>',
    mind: '<path d="M9 4.5a3.5 3.5 0 0 0-3.4 4.3A3.5 3.5 0 0 0 5 15a3.5 3.5 0 0 0 4 4.5V4.5z"/><path d="M15 4.5a3.5 3.5 0 0 1 3.4 4.3A3.5 3.5 0 0 1 19 15a3.5 3.5 0 0 1-4 4.5V4.5z"/><path d="M9 9h2M13 13h2M9 15h2"/>',
    space: '<circle cx="12" cy="12" r="5"/><path d="M3.5 15.5c-1.8 2.6 4.3 2.4 9.6-.7s8.9-7.7 7.1-10.3c-.8-1.1-3-1-5.6 0"/>',
    energy: '<path d="M13 2 5 13.5h6L10 22l9-12h-6.5z"/>',
    idea: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    algo: '<path d="M4 6h7M4 12h11M4 18h5"/><path d="m17 15 3 3-3 3M20 18h-6"/>',
    arch: '<path d="M4 21h16M7 21V9.5L12 4l5 5.5V21"/><path d="M10 21v-5h4v5M9.5 11h5"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9.4 5 2.6-5 2.6z"/><path d="M3 9h2.4M3 15h2.4M18.6 9H21M18.6 15H21"/>',
    def: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    cmt: '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"/>'
  };
  AN.icon = function (k, extra) { return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (extra || '') + '>' + (IC[k] || IC.def) + '</svg>'; };
  // Article topics: key → realm colour, icon and the words that identify the article by its title.
  AN.TOPICS = {
    ai: { n: 'هوش مصنوعی', c: 'ai', i: 'ai', k: ['هوش مصنوعی', 'هوش‌مصنوعی'] },
    iot: { n: 'اینترنت اشیا', c: 'net', i: 'net', k: ['اینترنت اشیا', 'اینترنت‌اشیا'] },
    city: { n: 'شهرهای هوشمند', c: 'city', i: 'city', k: ['شهرهای هوشمند', 'شهر هوشمند'] },
    security: { n: 'امنیت دیجیتال', c: 'net', i: 'lock', k: ['امنیت دیجیتال', 'امنیت', 'هویت'] },
    brain: { n: 'مغز و یادگیری', c: 'mind', i: 'mind', k: ['مغز', 'یادمی‌گیرند', 'یاد می‌گیرند'] },
    space: { n: 'زندگی در فضا', c: 'space', i: 'space', k: ['اکتشافات فضایی', 'سیاره', 'مریخ', 'فضا'] },
    arch: { n: 'معماری آینده', c: 'city', i: 'arch', k: ['معماری'] },
    algo: { n: 'الگوریتم‌ها', c: 'ai', i: 'algo', k: ['الگوریتم'] },
    energy: { n: 'انرژی پاک', c: 'energy', i: 'energy', k: ['انرژی'] },
    idea: { n: 'از ایده تا اختراع', c: 'idea', i: 'idea', k: ['اختراع', 'ایده'] },
    // w: a narrower topic inside a wider one; its words are asked first, so «هوش مصنوعی ویدیوساز» is this article and not the AI one
    video: { n: 'ویدیوسازهای هوشمند', c: 'ai', i: 'video', k: ['ویدیوساز', 'ویدیو', 'ویدئو'], w: 1 }
  };
  var REALMS = [['ai', ['هوش', 'داده', 'الگوریتم']], ['net', ['شبکه', 'امنیت', 'اینترنت']], ['city', ['شهر', 'معماری']], ['mind', ['ذهن', 'مغز', 'یادگیری']], ['space', ['فضا', 'کیهان', 'کشف']], ['energy', ['انرژی', 'زمین', 'محیط']], ['idea', ['ایده', 'خلاق', 'اختراع', 'نوآوری']]];
  var RICON = { ai: 'ai', net: 'net', city: 'city', mind: 'mind', space: 'space', energy: 'energy', idea: 'idea' };
  AN.realmOf = function (name) { var n = AN.norm(name); for (var i = 0; i < REALMS.length; i++) for (var j = 0; j < REALMS[i][1].length; j++) if (n.indexOf(AN.norm(REALMS[i][1][j])) > -1) return REALMS[i][0]; return 'default'; };
  AN.realmIcon = function (r) { return RICON[r] || 'def'; };
  AN.topicOf = function (title, cat, el) {
    // an explicit marker wins, then the article's own lab (links to other articles carry other topics, so they are ignored)
    if (el) {
      var mk = el.querySelector('[class*="an-topic-"]'), mm = mk && /\ban-topic-([a-z]+)/.exec(mk.className); if (mm && AN.TOPICS[mm[1]]) return mm[1];
      var lb = el.querySelector('.an-lab'), ml = lb && /\ban-lab-([a-z]+)/.exec(lb.className); if (ml && AN.TOPICS[ml[1]]) return ml[1];
    }
    var t = AN.norm(title), keys = Object.keys(AN.TOPICS);
    var asked = keys.filter(function (x) { return AN.TOPICS[x].w; }).concat(keys.filter(function (x) { return !AN.TOPICS[x].w; }));
    for (var i = 0; i < asked.length; i++) { var ks = AN.TOPICS[asked[i]].k; for (var j = 0; j < ks.length; j++) if (t.indexOf(AN.norm(ks[j])) > -1) return asked[i]; }
    var r = AN.realmOf(cat || ''); for (var k = 0; k < keys.length; k++) if (AN.TOPICS[keys[k]].c === r) return keys[k];
    return 'ai';
  };
  AN.color = function (realm) { return 'var(--c-' + (realm || 'default') + ')'; };

  /* ---------- index of posts (footer list, present on every Blogfa page) ---------- */
  AN.index = function () {
    if (AN._idx) return AN._idx;
    AN._idx = $$('#an-index a').map(function (a, i) { var t = a.textContent.trim(); return { id: a.getAttribute('data-id') || '', url: a.href, title: t, date: a.getAttribute('data-date') || '', topic: AN.topicOf(t), i: i }; });
    return AN._idx;
  };
  // The main template lists the categories from Blogfa (#an-cats); the archive and page templates carry a copy made
  // when the template was built (data-static). A list read from Blogfa is saved in the browser and shown on those two
  // pages instead, so a category renamed later still shows its new name there.
  AN.cats = function () {
    var box = $('#an-cats'), list = $$('#an-cats a').map(function (a) { return { name: a.textContent.trim(), url: a.href }; });
    if (box && !box.hasAttribute('data-static')) { if (list.length) AN.store.set('an-cats', JSON.stringify(list)); }
    else { try { var saved = JSON.parse(AN.store.get('an-cats') || 'null'); if (saved && saved.length) list = saved; } catch (e) {} }
    return list.filter(function (c) { return c && c.name && c.url && !/^\s*javascript:/i.test(c.url); })
      .map(function (c) { return { name: String(c.name), url: String(c.url), realm: AN.realmOf(String(c.name)) }; });
  };

  /* ---------- what Blogfa fills differently from its documentation ---------- */
  // Blogfa leaves <-PostCategory-> unfilled (seen on the live blog, 2026-11-05), while it does fill the
  // BlogPostCategories block. Each post takes its category name and number from that block. The time Blogfa
  // writes in Latin digits, with no leading zero on the minutes ("6:1" for 6:01), is shown as ۶:۰۱.
  function postFix() {
    $$('article.an-post').forEach(function (a) {
      var c = a.querySelector('.an-post-cats a'), chip = a.querySelector('.an-cat'), name = c ? c.textContent.trim() : '';
      if (name) { a.setAttribute('data-cat', name); a.setAttribute('data-catid', c.getAttribute('data-catid') || ''); }
      if (chip) { if (name) chip.textContent = name; else chip.hidden = true; }
      $$('.an-post-by', a).forEach(function (b) {
        var w = D.createTreeWalker(b, 4, null), n;
        while ((n = w.nextNode())) if (/\d/.test(n.nodeValue)) n.nodeValue = AN.faDigits(n.nodeValue.replace(/(\d):(\d)(?!\d)/g, '$1:0$2'));
      });
    });
  }

  // Blogfa's tag cloud can keep an earlier spelling of a tag: on the live blog post 4's tag «هش» was listed with
  // 48 kashidas (2026-11-05), and its tag page matches both spellings. A kashida only stretches a word, so tag names
  // are shown without it, and a name the cloud already shows is not shown twice.
  AN.untatweel = function (s) { return String(s).replace(/ـ+/g, ''); };
  function tagFix() {
    var seen = {};
    $$('#an-tagcloud a, .an-tags a').forEach(function (a) {
      var t = a.textContent, u = AN.untatweel(t), li = a.parentNode;
      if (u !== t) a.textContent = u;
      if (!li || li.tagName !== 'LI') return;
      var k = AN.norm(u);
      if (seen[k]) li.hidden = true; else seen[k] = 1;
    });
    if (/\/tag\//i.test(location.pathname) && /ـ/.test(D.title)) D.title = AN.untatweel(D.title);
  }

  // Blogfa adds a fixed ad bar along the bottom of every page. The page keeps that much room under its footer
  // (--an-ad), so the last lines and the back-to-top button stay clear of it; the ad itself stays as Blogfa shows it.
  function adRoom() {
    function find() {
      var k = D.body ? D.body.children : [];
      for (var i = 0; i < k.length; i++) {
        var e = k[i]; if (e.className || e.tagName !== 'DIV') continue;
        var cs = W.getComputedStyle(e); if (cs.position === 'fixed' && cs.bottom === '0px' && cs.display !== 'none' && cs.visibility !== 'hidden') return e;
      }
      return null;
    }
    var last = -1;
    function upd() { var e = find(), h = e ? Math.round(e.getBoundingClientRect().height) : 0; if (h > 240) h = 0; if (h !== last) { last = h; H.style.setProperty('--an-ad', h + 'px'); } }
    upd(); var n = 0, iv = setInterval(function () { upd(); if (++n > 15) clearInterval(iv); }, 1500);
    W.addEventListener('resize', upd); W.addEventListener('load', upd);
    D.addEventListener('click', function () { setTimeout(upd, 400); }, true);
  }

  /* ---------- header ---------- */
  function header() {
    var bar = $('#an-bar'), last = 0, ticking = false, prog = $('#an-progress');
    function onScroll() {
      var y = W.scrollY || 0;
      if (bar) { bar.classList.toggle('solid', y > 24 || AN.page !== 'home'); bar.classList.toggle('away', AN.page === 'post' && y > 420 && y > last && !D.body.classList.contains('an-menu-open')); }
      if (prog) { var h = D.documentElement.scrollHeight - W.innerHeight; prog.style.setProperty('--p', h > 0 ? Math.min(1, y / h) : 0); }
      last = y; ticking = false;
    }
    W.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    var nav = $('#an-nav'), mb = $('[data-an="menu"]');
    if (mb && nav) mb.addEventListener('click', function () { var o = !nav.classList.contains('open'); nav.classList.toggle('open', o); mb.setAttribute('aria-expanded', o); D.body.classList.toggle('an-menu-open', o); });
    $$('#an-nav > a').forEach(function (a) {
      var k = a.getAttribute('data-nav');
      if ((k === 'home' && AN.page === 'home') || (k === 'archive' && AN.page === 'archive') || (k === 'titles' && AN.page === 'titles') || (k === 'about' && /\/page\/about/i.test(location.pathname))) a.setAttribute('aria-current', 'page');
    });
    // realms dropdown
    var dd = $('#an-dd'), menu = $('#an-dd-menu'), btn = dd && dd.querySelector('.an-dd-btn'), cats = AN.cats();
    if (menu) menu.innerHTML = cats.length ? cats.map(function (c) { return '<a href="' + AN.esc(c.url) + '" style="--rc:' + AN.color(c.realm) + '"><i></i>' + AN.esc(c.name) + '</a>'; }).join('') : '<p class="an-dd-empty">دسته‌ها پس از ساخت در بلاگفا اینجا می‌آیند.</p>';
    if (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); var o = !dd.classList.contains('open'); dd.classList.toggle('open', o); btn.setAttribute('aria-expanded', o); });
      D.addEventListener('click', function (e) { if (!dd.contains(e.target)) { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
    }
  }

  /* ---------- A/B versions ---------- */
  // A change of theme opens as a circle from the button that asked for it (View Transitions API: Chrome 111+,
  // Safari 18+). Without the API, with reduced motion or in a hidden tab, the change is made at once.
  AN.swap = function (fn, from) {
    if (!D.startViewTransition || AN.rm || D.hidden) { fn(); return; }
    var r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : null, vw = W.innerWidth, vh = W.innerHeight;
    var x = r && r.width ? r.left + r.width / 2 : vw / 2, y = r && r.height ? r.top + r.height / 2 : 0;
    var end = Math.ceil(Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y))), t;
    H.classList.add('an-swap');
    function done() { H.classList.remove('an-swap'); }
    try { t = D.startViewTransition(fn); } catch (e) { done(); fn(); return; }
    t.ready.then(function () {
      H.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' });
    }, function () {});
    t.finished.then(done, done);
  };
  // o.from: the element the circle opens from; o.now: no animation; o.update: more changes made in the same frame.
  // AN.v changes at once, so code that reads it right after the call sees the new version.
  AN.setV = function (v, o) {
    o = o || {}; AN.v = v; if (!o.auto) AN.vm = 'man';
    function upd() {
      if (o.update) o.update();
      // o.auto: the clock changed the version (js/live.js); anything else is the visitor's own choice and is kept
      if (!o.auto) { AN.vm = 'man'; AN.store.set('an-vm', 'man'); AN.store.set('an-v', v); }
      AN.v = v; H.setAttribute('data-vm', AN.vm || 'man'); H.setAttribute('data-v', v);
      vLabel();
      var tone = H.getAttribute('data-an-tone'), m = $('meta[name="theme-color"]');
      if (m) m.setAttribute('content', tone === 'paper' ? '#F5EEDC' : tone === 'contrast' ? '#000000' : v === 'b' ? '#F6F8FB' : '#04060D');
      if (AN.onV) AN.onV(v);
    }
    if (o.now) upd(); else AN.swap(upd, o.from || $('#an-bar .an-ab-btn'));
  };
  // the version's letter wherever it is written, and the header button's name for a screen reader
  function vLabel() {
    var auto = AN.vm === 'auto', name = AN.v === 'a' ? 'A شب' : 'B روز';
    $$('.an-v-label').forEach(function (e) { e.textContent = AN.v.toUpperCase() + (auto ? ' (خودکار)' : ''); });
    $$('.an-ab-btn').forEach(function (b) { b.setAttribute('aria-label', 'تغییر نسخه‌ی وبلاگ: اکنون ' + name + (auto ? '، خودکار با ساعت دستگاه' : '')); });
  }
  AN.vLabel = vLabel;
  // what the visitor's clock asks for now: «روز» while the sun is up (js/early.js)
  AN.autoV = function () { return AN.sunAlt && AN.sunAlt(AN.clock()) > -4 ? 'b' : 'a'; };
  // «خودکار»: the version is handed back to the clock. o.from: the element the change opens from.
  AN.setAuto = function (o) {
    AN.vm = 'auto'; AN.store.set('an-vm', 'auto'); AN.store.set('an-v', '');
    var av = AN.autoV();
    if (av !== AN.v) AN.setV(av, { from: o && o.from, now: o && o.now, auto: true });
    else { H.setAttribute('data-vm', 'auto'); vLabel(); if (AN.live) AN.live.state(); }
  };
  function versions() {
    vLabel();
    // Every press changes what is on screen. While the clock is in charge («خودکار») a press picks the other version
    // and keeps it; a press on a kept version that differs from the clock's hands the choice back to the clock; a
    // kept version that happens to match the clock gives way to the other one.
    $$('[data-an="ab"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = AN.v === 'a' ? 'b' : 'a';
        if (AN.sunAlt && AN.vm !== 'auto' && AN.v !== AN.autoV()) {
          AN.setAuto({ from: b });
          AN.toast('حالت خودکار: اکنون نسخه‌ی ' + (n === 'a' ? 'A «شب»' : 'B «روز»') + '، با ساعت دستگاه شما');
        } else {
          AN.setV(n, { from: b }); AN.toast(n === 'a' ? 'نسخه‌ی A «شب» فعال شد' : 'نسخه‌ی B «روز» فعال شد');
        }
      });
    });
  }

  /* ---------- reveal, pointer light, magnetic buttons, tilt ---------- */
  AN.reveal = function (root) {
    var els = $$('.an-rv:not(.in)', root);
    if (!('IntersectionObserver' in W) || AN.rm) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    if (!AN._io) AN._io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); AN._io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { AN._io.observe(e); });
  };
  function pointerFx() {
    if (!AN.fine) return;
    D.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('.an-card,.an-pillar,.an-realm,.an-creator-card');
      if (t) { var r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
    }, { passive: true });
    if (AN.rm) return;
    D.addEventListener('pointermove', function (e) {
      var m = e.target.closest && e.target.closest('.an-magnet');
      $$('.an-magnet.mg').forEach(function (b) { if (b !== m) { b.classList.remove('mg'); b.style.transform = ''; } });
      if (m) { var r = m.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) * 0.18, y = (e.clientY - r.top - r.height / 2) * 0.28; m.classList.add('mg'); m.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; }
      var tl = e.target.closest && e.target.closest('.an-realm');
      $$('.an-realm.tl').forEach(function (b) { if (b !== tl) { b.classList.remove('tl'); b.style.transform = ''; } });
      if (tl) { var q = tl.getBoundingClientRect(), rx = ((e.clientY - q.top) / q.height - 0.5) * -6, ry = ((e.clientX - q.left) / q.width - 0.5) * 8; tl.classList.add('tl'); tl.style.transform = 'perspective(800px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-3px)'; }
    }, { passive: true });
  }

  /* ---------- dialogs ---------- */
  var openDlg = null, lastFocus = null;
  AN.dialog = function (id, html, cls) {
    var d = $('#' + id);
    if (!d) { d = AN.el('div', 'an-dlg ' + (cls || '')); d.id = id; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.innerHTML = '<div class="an-dlg-box">' + html + '</div>'; D.body.appendChild(d); d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('.an-dlg-x')) AN.closeDlg(); }); }
    return d;
  };
  AN.openDlg = function (d, focusSel) { if (openDlg) AN.closeDlg(); lastFocus = D.activeElement; openDlg = d; d.classList.add('on'); D.body.style.overflow = 'hidden'; var f = focusSel ? d.querySelector(focusSel) : d.querySelector('input,button,a'); if (f) setTimeout(function () { f.focus(); }, 30); };
  AN.closeDlg = function () { if (!openDlg) return; openDlg.classList.remove('on'); D.body.style.overflow = ''; if (openDlg.onclose) openDlg.onclose(); openDlg = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  D.addEventListener('keydown', function (e) {
    if (!openDlg || e.key !== 'Tab') return;
    var f = $$('a[href],button,input,iframe,[tabindex]:not([tabindex="-1"])', openDlg).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return; var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && D.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && D.activeElement === z) { e.preventDefault(); a.focus(); }
  });

  /* ---------- search palette ---------- */
  function search() {
    var html = '<div class="an-dlg-head"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" placeholder="جست‌وجو در مقاله‌ها، قلمروها و بخش‌ها…" aria-label="عبارت جست‌وجو" autocomplete="off"><button type="button" class="an-dlg-x" aria-label="بستن">✕</button></div><div class="an-dlg-body"><ul class="an-sres" role="listbox"></ul></div><div class="an-dlg-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> جابه‌جایی</span><span><kbd>Enter</kbd> باز کردن</span><span><kbd>Esc</kbd> بستن</span></div>';
    var d = AN.dialog('an-search', html), inp = d.querySelector('input'), ul = d.querySelector('.an-sres'), sel = 0, items = [];
    function data() {
      var out = AN.index().map(function (p) { var t = AN.TOPICS[p.topic]; return { t: p.title, s: 'مقاله · ' + (t ? t.n : ''), u: p.url, c: t ? t.c : 'default' }; });
      AN.cats().forEach(function (c) { out.push({ t: c.name, s: 'قلمرو', u: c.url, c: c.realm }); });
      $$('.an-post-body h2[id]').forEach(function (h) { out.push({ t: h.textContent, s: 'بخشی از همین مقاله', u: '#' + h.id, c: 'default' }); });
      out.push({ t: 'درباره‌ی آینده‌نگار و سازنده', s: 'صفحه', u: '/page/about', c: 'idea' }, { t: 'آرشیو زمانی', s: 'صفحه', u: '/archive', c: 'default' });
      return out;
    }
    function render() {
      var q = AN.norm(inp.value), all = data();
      items = q ? all.filter(function (x) { return q.split(' ').every(function (w) { return AN.norm(x.t + ' ' + x.s).indexOf(w) > -1; }); }) : all.slice(0, 12);
      sel = 0;
      ul.innerHTML = items.length ? items.slice(0, 30).map(function (x, i) {
        var t = AN.esc(x.t); if (q) q.split(' ').forEach(function (w) { if (w.length > 1) t = t.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'g'), '<mark>$1</mark>'); });
        return '<li><a href="' + AN.esc(x.u) + '" role="option" style="--rc:' + AN.color(x.c) + '"' + (i === 0 ? ' class="on"' : '') + '><i></i><span>' + t + '</span><small>' + AN.esc(x.s) + '</small></a></li>';
      }).join('') : '<li><p class="an-sempty">چیزی پیدا نشد. واژه‌ی کوتاه‌تری را امتحان کن.</p></li>';
    }
    function move(k) { var as = $$('a', ul); if (!as.length) return; as[sel] && as[sel].classList.remove('on'); sel = (sel + k + as.length) % as.length; as[sel].classList.add('on'); as[sel].scrollIntoView({ block: 'nearest' }); }
    inp.addEventListener('input', render);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { var a = $$('a', ul)[sel]; if (a) { e.preventDefault(); AN.closeDlg(); a.click(); } }
    });
    ul.addEventListener('click', function (e) { if (e.target.closest('a')) AN.closeDlg(); });
    AN.openSearch = function () { inp.value = ''; render(); AN.openDlg(d, 'input'); };
    $$('[data-an="search"]').forEach(function (b) { b.addEventListener('click', AN.openSearch); });
  }
  function keysDlg() {
    var html = '<div class="an-dlg-head"><h2>میان‌برهای صفحه‌کلید</h2><button type="button" class="an-dlg-x" aria-label="بستن">✕</button></div><div class="an-dlg-body"><dl class="an-keys-list"><dt><kbd>Ctrl</kbd> + <kbd>K</kbd> یا <kbd>/</kbd></dt><dd>جست‌وجو در مقاله‌ها</dd><dt><kbd>B</kbd></dt><dd>تغییر نسخه‌ی وبلاگ (A شب / B روز)</dd><dt><kbd>T</kbd></dt><dd>بازگشت به بالای صفحه</dd><dt><kbd>M</kbd></dt><dd>روشن یا خاموش کردن صدا</dd><dt><kbd>P</kbd></dt><dd>ارائه در کلاس، در صفحه‌ی هر مقاله (جلو: PageDown یا Space، عقب: PageUp)</dd><dt><kbd>?</kbd></dt><dd>نمایش همین راهنما</dd><dt><kbd>Esc</kbd></dt><dd>بستن پنجره‌ها</dd></dl></div>';
    var d = AN.dialog('an-keys', html);
    AN.openKeys = function () { AN.openDlg(d, '.an-dlg-x'); };
    $$('[data-an="keys"]').forEach(function (b) { b.addEventListener('click', AN.openKeys); });
  }
  function shortcuts() {
    var seq = [], konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    D.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === 'ک')) { e.preventDefault(); if (AN.openSearch) AN.openSearch(); return; }
      if (e.key === 'Escape') { AN.closeDlg(); var n = $('#an-nav'); if (n && n.classList.contains('open')) $('[data-an="menu"]').click(); return; }
      seq.push(e.keyCode); seq = seq.slice(-10);
      if (seq.join() === konami.join()) AN.toast('رمز پنهان پیدا شد: آینده را آدم‌های کنجکاو می‌سازند. — امیرحسین همتی');
      if (typing || e.ctrlKey || e.metaKey || e.altKey || openDlg) return;
      if (e.key === '/') { e.preventDefault(); if (AN.openSearch) AN.openSearch(); }
      else if (e.key === '?') { if (AN.openKeys) AN.openKeys(); }
      else if (e.key === 'b' || e.key === 'B' || e.key === 'ذ') { AN.setV(AN.v === 'a' ? 'b' : 'a'); AN.toast(AN.v === 'a' ? 'نسخه‌ی A «شب»' : 'نسخه‌ی B «روز»'); }
      else if (e.key === 't' || e.key === 'T' || e.key === 'ف') { W.scrollTo({ top: 0, behavior: AN.rm ? 'auto' : 'smooth' }); }
    });
  }

  /* ---------- live sky panel (computed in the browser, no network) ---------- */
  // Keplerian elements for 1800–2050 from JPL "Approximate Positions of the Planets" (Standish):
  // a, ȧ, e, ė, I, İ, L, L̇, ϖ, ϖ̇, Ω, Ω̇ (AU, degrees, per Julian century).
  var EMB = [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0];
  var MARS = [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343];
  AN.helio = function (el, jd) {
    var R = Math.PI / 180, T = (jd - 2451545) / 36525, a = el[0] + el[1] * T, e = el[2] + el[3] * T, I = (el[4] + el[5] * T) * R;
    var L = el[6] + el[7] * T, wp = el[8] + el[9] * T, O = el[10] + el[11] * T, w = (wp - O) * R, M = ((L - wp) % 360 + 540) % 360 - 180, Om = O * R;
    M *= R; var E = M + e * Math.sin(M);
    for (var i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    var xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E), cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I);
    return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp, (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp, sw * sI * xp + cw * sI * yp];
  };
  AN.EMB = EMB; AN.MARS = MARS;
  AN.jd = function (ms) { return ms / 86400000 + 2440587.5; };
  AN.marsDist = function (ms) { var j = AN.jd(ms), e = AN.helio(EMB, j), m = AN.helio(MARS, j); return Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]); };
  // Mars Coordinated Time, NASA GISS Mars24 algorithm (Allison & McEwen 2000); TT−UTC = 69.184 s since 2017.
  AN.msd = function (ms) { return (AN.jd(ms) + 69.184 / 86400 - 2405522.0028779) / 1.0274912517; };
  function live() {
    var hero = $('#an-hero'); if (!hero || AN.page !== 'home') return;
    var t0 = Date.now(), sun = $('#an-l-sun'), orb = $('#an-l-orbit'), mars = $('#an-l-mars'), mtc = $('#an-l-mtc'), clock = $('#an-clock'), fmt = null;
    try { fmt = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch (e) {}
    function upd() {
      var now = Date.now(), s = (now - t0) / 1000;
      if (sun) sun.textContent = AN.fa(173.6 * s);         // 1361 W/m² × π(6371 km)² ≈ 173.6 PW → 173.6 PJ each second
      if (orb) orb.textContent = AN.fa(29.78 * s);         // mean orbital speed of Earth, km/s (NASA Earth fact sheet)
      if (mars) mars.textContent = AN.fa(AN.marsDist(now) * 149597870.7 / 299792.458 / 60, 1);
      if (mtc) { var h = (AN.msd(now) * 24) % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60); mtc.textContent = AN.faDigits((hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm); }
      if (clock && fmt) clock.textContent = fmt.format(new Date(now));
    }
    upd(); var iv = setInterval(upd, 1000);
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { clearInterval(iv); if (es[0].isIntersecting) { upd(); iv = setInterval(upd, 1000); } }).observe(hero);
  }

  /* ---------- the custom-code box («کدها و جاوا اسکریپت‌های اختصاصی کاربر») ---------- */
  // Blogfa prints the box in the footer of each template. css/09-reader.css hides it while it holds only code
  // (scripts, styles) or nothing; this does the same where :has() is missing, keeps the box hidden if a template
  // ever shows the tag's own name unfilled, and shows it again for anything a reader is meant to see.
  function customBox() {
    $$('.an-custom').forEach(function (c) {
      var seen = false;
      for (var n = c.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1 && !/^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/.test(n.nodeName)) seen = true;
        else if (n.nodeType === 3 && n.nodeValue.trim() && n.nodeValue.indexOf('BlogCustomHtml') < 0) seen = true;
      }
      if (seen) c.classList.add('an-custom-on'); else c.hidden = true;
    });
  }

  /* ---------- back-to-top button with reading ring ---------- */
  function fab() {
    var b = AN.el('button', 'an-fab', '<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16" pathLength="100"/></svg><svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>');
    b.type = 'button'; b.setAttribute('aria-label', 'بازگشت به بالای صفحه'); D.body.appendChild(b);
    b.addEventListener('click', function () { W.scrollTo({ top: 0, behavior: AN.rm ? 'auto' : 'smooth' }); });
    W.addEventListener('scroll', function () { var y = W.scrollY, h = D.documentElement.scrollHeight - W.innerHeight; b.classList.toggle('on', y > 900); b.style.setProperty('--p', h > 0 ? Math.min(1, y / h) : 0); }, { passive: true });
  }

  // After the page has been parsed (the CDN build's backup script arrives late), wait one task so the rest of the
  // bundle, which defines AN.pages and the labs, has run before the page is set up.
  // Then wait for the stylesheet as well. In the CDN build it can land after this script: when its first address
  // fails, js/loader.js asks a backup address, and that tag no longer holds the script back. Setting the page up
  // before it would measure an unstyled page and draw the article covers, the banner and the globe at the wrong
  // size (stretched once the styles arrive). --bg is set on :root by the stylesheet; after ten seconds without it
  // the page is set up anyway.
  function styled() { try { return !!W.getComputedStyle(H).getPropertyValue('--bg').trim(); } catch (e) { return true; } }
  AN.ready = function (fn) {
    var n = 0;
    function go() { if (styled() || n++ >= 100) fn(); else setTimeout(go, 100); }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
  };
  AN.ready(function () {
    var steps = [postFix, tagFix, adRoom, header, versions, search, keysDlg, shortcuts, pointerFx, live, fab, customBox];
    steps.forEach(function (f) { try { f(); } catch (e) { if (W.console) console.warn('[آینده‌نگار]', f.name, e); } });
    try { if (AN.pages) AN.pages(); } catch (e) { if (W.console) console.warn('[آینده‌نگار] pages', e); }
    AN.reveal(); H.classList.add('an-ready'); AN.ok = true;
    $$('.an-year').forEach(function (y) { try { y.textContent = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date()).replace(/[^۰-۹]/g, ''); } catch (e) {} });
  });
})();
