/* آینده‌نگار · «ابزار خواننده» (the reader's toolkit)
   Loaded by the code in Blogfa's «کدها و جاوا اسکریپت‌های اختصاصی کاربر» box (src/addons/box.js), after the template's
   own script. It adds what a reader can set and keep:
     · theme: night (A), day (B), paper, high contrast; text size, line spacing, column width, easy-reading spacing;
       motion, the moving sky and the soft change between pages
     · on an article: bookmark, listen (the browser's own Persian voice, only when it has one), reading ruler,
       focus mode, citation, QR code, print, «continue where you stopped», a stamp in the «future passport» for each
       story read to the end, and a word quiz built from the article's own glossary
   Everything stays in this browser (localStorage) and nothing is sent anywhere. Blogfa forbids popups, redirects,
   ad changes and earning code in that box; the toolkit has none of them. It works only with the Ayandeh-Negar
   template (window.AN); with any other template it stays silent. Keys: R toolkit, F focus mode, Q QR code. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;
  if (W.AN_XT) return;
  W.AN_XT = 1;
  // filled in by tools/build.mjs: the QR encoder file [name, SRI], every glossary term of the ten articles, and
  // the first key points of each article as [topic, text]
  var X = W.AN_X || {}, QR = '@QR@', TERMS = '@TERMS@', KEYS = '@KEYS@';
  // what the blog owner switched off in the box (window.AN_X_OPT): 0 turns a tool off
  var OPT = { tools: 1, passport: 1, quiz: 1, listen: 1, ruler: 1, focus: 1, marks: 1, cite: 1, qr: 1, resume: 1 };
  var own = W.AN_X_OPT || X.opt || {};
  for (var key in OPT) if (Object.prototype.hasOwnProperty.call(own, key)) OPT[key] = own[key] ? 1 : 0;

  var tries = 0;
  (function wait() {
    var A = W.AN;
    if (A && A.ok && A.dialog && A.openDlg) { try { start(A); } catch (e) { if (W.console) console.warn('[آینده‌نگار · ابزار خواننده]', e); } return; }
    if (++tries < 150) setTimeout(wait, 100);
  })();

  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function attr(n, v) { if (v == null) H.removeAttribute(n); else H.setAttribute(n, v); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function path(u) { try { return new URL(u, location.href).pathname.replace(/\/+$/, '') || '/'; } catch (e) { return String(u); } }

  function start(AN) {
    var $ = AN.$, $$ = AN.$$, el = AN.el, esc = AN.esc, fa = AN.fa;
    var STORE = ['an-x', 'an-x-read', 'an-x-quiz', 'an-x-marks', 'an-x-pos', 'an-x-idx'];
    var osRM = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var FS = [0.9, 1, 1.12, 1.25, 1.4];
    var THEMES = [['a', 'شب', 'نسخه‌ی A'], ['b', 'روز', 'نسخه‌ی B'], ['paper', 'کاغذی', 'گرم و آرام'], ['contrast', 'پرتضاد', 'سیاه و سفید']];
    var I = {
      tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h8M16 7h4M4 17h3M11 17h9"/><circle cx="14" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
      mark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/></svg>',
      listen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
      ruler: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18M3 15h18"/><path d="M3 4h18M3 20h18" opacity=".35"/></svg>',
      focus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/><circle cx="12" cy="12" r="2.5"/></svg>',
      cite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7H6a1 1 0 0 0-1 1v4h4v5H5M19 7h-4a1 1 0 0 0-1 1v4h4v5h-4"/></svg>',
      qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/></svg>',
      print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/></svg>',
      present: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/></svg>',
      seal: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/></svg>',
      // media controls keep their usual left-to-right shapes in a right-to-left page
      play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
      pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5.5" width="3.8" height="13" rx="1"/><rect x="13.7" y="5.5" width="3.8" height="13" rx="1"/></svg>',
      next: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6v12l8.5-6zM16 6h2.6v12H16z"/></svg>'
    };

    /* ---------- the reader's settings ---------- */
    var ruler = { on: false, el: null, y: 0 }; // methods below, in «reading ruler»; apply() reads .on from the start
    var P = get('an-x', {});
    if (!P || typeof P !== 'object') P = {};
    // an address with ?v=a or ?v=b shows the version it names (js/early.js); a saved theme waits until the reader
    // picks one in the panel
    var forced = /[?&]v=(a|b)\b/i.test(location.search);
    function clean() {
      P.tone = P.tone === 'paper' || P.tone === 'contrast' ? P.tone : '';
      P.fs = FS.indexOf(+P.fs) > -1 ? +P.fs : 1;
      P.lh = P.lh === 2 || P.lh === 3 ? P.lh : 1;
      P.w = P.w === 1 || P.w === 3 ? P.w : 2;
      P.ease = P.ease ? 1 : 0; P.focus = P.focus ? 1 : 0; P.ruler = P.ruler ? 1 : 0;
      P.motion = P.motion === 0 ? 0 : 1; P.sky = P.sky === 0 ? 0 : 1; P.vt = P.vt === 0 ? 0 : 1;
    }
    clean();
    // nothing is kept while every setting is at its default, so «پاک کردن همه‌ی داده‌های من» leaves the storage empty
    function save() { if (P.tone || P.fs !== 1 || P.lh !== 1 || P.w !== 2 || P.ease || P.focus || P.ruler || !P.motion || !P.sky || !P.vt) put('an-x', P); else drop('an-x'); }
    // the same values js/early.js reads before the first paint; an older template leaves them to this call
    function apply() {
      attr('data-an-tone', P.tone && !forced ? P.tone : null);
      if (P.fs !== 1) H.style.setProperty('--an-fs', String(P.fs)); else H.style.removeProperty('--an-fs');
      attr('data-an-lh', P.lh > 1 ? String(P.lh) : null);
      attr('data-an-w', P.w !== 2 ? String(P.w) : null);
      attr('data-an-ease', P.ease ? '' : null);
      attr('data-an-sky', P.sky ? null : 'off');
      attr('data-an-focus', P.focus && OPT.focus ? '' : null);
      AN.rm = osRM || !P.motion;
      attr('data-motion', AN.rm ? 'reduce' : null);
      if (AN.sky && AN.sky.refresh) AN.sky.refresh();
      if (ruler.on) ruler.size();
    }
    // A or B from the template's own switch (button, B key) ends the paper and high-contrast themes
    var setV0 = AN.setV;
    AN.setV = function (v, o) {
      o = o || {};
      var up = o.update;
      o.update = function () { if (P.tone) { P.tone = ''; save(); attr('data-an-tone', null); } if (up) up(); sync(); };
      if (!AN.swap) o.update(); // a template before kit 8 has no animated switch and ignores o
      return setV0.call(AN, v, o);
    };
    function theme(name, from) {
      var v = name === 'b' || name === 'paper' ? 'b' : 'a', tone = name === 'paper' || name === 'contrast' ? name : '';
      function go() { forced = false; P.tone = tone; save(); attr('data-an-tone', tone || null); setV0.call(AN, v, { now: 1 }); sync(); }
      if (AN.swap) AN.swap(go, from); else go();
    }
    function themeNow() { return (!forced && P.tone) || AN.v; }
    // a template before kit 8 does not apply the saved theme before the first paint; it is applied here instead
    if (P.tone && !forced && (H.getAttribute('data-an-tone') !== P.tone || AN.v !== (P.tone === 'paper' ? 'b' : 'a'))) { attr('data-an-tone', P.tone); setV0.call(AN, P.tone === 'paper' ? 'b' : 'a', { now: 1 }); }
    apply();

    /* ---------- what this page is ---------- */
    var art = AN.page === 'post' ? $('#an-feed > .an-post') : null, post = null;
    if (art && AN.readPost) post = AN.readPost(art);
    var body = art && art.querySelector('.an-post-body');
    var here = location.href.split('#')[0].split('?')[0];
    // the list of articles is in the footer of the main template only; it is kept for the archive and About pages
    var idx = AN.index ? AN.index() : [];
    if (idx.length) put('an-x-idx', idx.map(function (q) { return { u: q.url, t: q.title, k: q.topic, id: q.id }; }));
    else idx = (get('an-x-idx', []) || []).map(function (q) { return { url: q.u, title: q.t, topic: q.k, id: q.id }; });
    function byTopic() { var m = {}; idx.forEach(function (q) { if (q.topic && !m[q.topic]) m[q.topic] = q; }); return m; }
    // the passport has one cell for each story the blog really has (from the list of articles) or the reader has
    // already finished; with no list at hand it falls back to every known topic
    function pkeys() { var m = byTopic(), rd = get('an-x-read', {}), all = Object.keys(AN.TOPICS), k = all.filter(function (x) { return m[x] || rd[x]; }); return k.length ? k : all; }
    function pread(rd) { return pkeys().filter(function (x) { return rd[x]; }).length; }

    /* ---------- the panel ---------- */
    var dlg = null, btn = null;
    function sec(t, html, cls) { return '<section class="an-x-sec' + (cls ? ' ' + cls : '') + '"><h3>' + t + '</h3>' + html + '</section>'; }
    function sw(k, label, sub, dis) { return '<label class="an-x-sw"><input type="checkbox" data-p="' + k + '"' + (dis ? ' disabled' : '') + '><span>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span><i aria-hidden="true"></i></label>'; }
    function seg(k, legend, opts) { return '<fieldset class="an-x-seg"><legend>' + legend + '</legend><div>' + opts.map(function (o) { return '<label><input type="radio" name="an-x-' + k + '" value="' + o[0] + '" data-p="' + k + '"><span>' + o[1] + '</span></label>'; }).join('') + '</div></fieldset>'; }
    // cls: the template's own small button classes, for the rows beside the table of contents and below the article
    function act(k, icon, label, pressed, cls) { return '<button type="button" class="an-x-act' + (cls ? ' ' + cls : '') + '" data-x="' + k + '"' + (pressed ? ' aria-pressed="false"' : '') + '>' + I[icon] + '<span>' + label + '</span></button>'; }
    var SM = 'an-btn an-btn-ghost an-btn-sm';
    function actions() {
      var a = '';
      if (post) {
        if (OPT.marks) a += act('mark', 'mark', 'نشان کردن', 1);
        if (OPT.listen) a += '<span class="an-x-listen-slot"' + (voice ? '' : ' hidden') + '>' + act('listen', 'listen', 'بشنوید', 1) + '</span>';
        if (OPT.ruler) a += act('ruler', 'ruler', 'خط‌کش خواندن', 1);
        if (OPT.focus) a += act('focus', 'focus', 'حالت تمرکز', 1);
        if ($('[aria-keyshortcuts="P"]')) a += act('present', 'present', 'ارائه در کلاس');
        if (OPT.cite) a += act('cite', 'cite', 'ارجاع به این مقاله');
      } else if (OPT.ruler) a += act('ruler', 'ruler', 'خط‌کش خواندن', 1);
      if (OPT.qr) a += act('qr', 'qr', 'کد QR این صفحه');
      a += act('print', 'print', 'نسخه‌ی چاپی');
      return '<div class="an-x-acts">' + a + '</div>';
    }
    function panel() {
      if (dlg) return dlg;
      var html = '<div class="an-dlg-head">' + I.tools + '<h2 id="an-x-h">ابزار خواننده</h2><button type="button" class="an-dlg-x" aria-label="بستن">✕</button></div>' +
        '<div class="an-dlg-body an-x-body">' +
        sec('پوسته', '<div class="an-x-themes" role="radiogroup" aria-label="پوسته">' + THEMES.map(function (t) {
          return '<label class="an-x-th an-x-th-' + t[0] + '"><input type="radio" name="an-x-theme" value="' + t[0] + '"><span class="an-x-th-sw" aria-hidden="true"><i></i><i></i><i></i></span><b>' + t[1] + '</b><small>' + t[2] + '</small></label>';
        }).join('') + '</div>') +
        sec('متن مقاله', '<div class="an-x-size" role="group" aria-labelledby="an-x-fs-l"><span id="an-x-fs-l">اندازه‌ی متن</span><button type="button" class="an-x-step" data-x="fs-" aria-label="متن کوچک‌تر">−</button><output id="an-x-fs" aria-live="polite"></output><button type="button" class="an-x-step" data-x="fs+" aria-label="متن بزرگ‌تر">+</button></div>' +
          seg('lh', 'فاصله‌ی سطرها', [[1, 'عادی'], [2, 'باز'], [3, 'بازتر']]) + seg('w', 'پهنای ستون', [[1, 'باریک'], [2, 'عادی'], [3, 'پهن']]) +
          sw('ease', 'فاصله‌گذاری آسان‌خوان', 'فاصله‌ی بیشتر میان واژه‌ها و بندها؛ برای خوانش راحت‌تر')) +
        sec('حرکت و جلوه‌ها', sw('motion', 'جلوه‌های حرکتی', osRM ? 'دستگاه شما «حرکت کمتر» را خواسته است؛ همین رعایت می‌شود.' : 'خاموشش کنید تا صفحه آرام و بی‌حرکت بماند.', osRM) +
          sw('sky', 'آسمان پویای پس‌زمینه') + sw('vt', 'گذار نرم میان صفحه‌ها', 'در مرورگرهایی که پشتیبانی می‌کنند') + ($('[data-an="sound"]') ? sw('snd', 'صدای وبلاگ', 'همان دکمه‌ی صدا در نوار بالا (M)') : '')) +
        sec(post ? 'این مقاله' : 'این صفحه', actions()) +
        (OPT.passport ? sec('گذرنامه‌ی آینده', '<div class="an-x-pp"></div>', 'an-x-sec-pp') : '') +
        (OPT.marks ? sec('نشان‌شده‌ها', '<div class="an-x-marks"></div>') : '') +
        '</div><div class="an-dlg-foot an-x-foot"><p>این تنظیم‌ها، نشان‌ها و مهرها فقط در همین مرورگر می‌مانند و به هیچ‌جا فرستاده نمی‌شوند.</p><p><button type="button" class="an-link-btn" data-x="reset">بازگرداندن تنظیم‌های نمایش</button> · <button type="button" class="an-link-btn" data-x="wipe">پاک کردن همه‌ی داده‌های من</button></p></div>';
      dlg = AN.dialog('an-x', html, 'an-x-drawer');
      dlg.setAttribute('aria-labelledby', 'an-x-h');
      dlg.addEventListener('change', onChange);
      dlg.addEventListener('click', onClick);
      return dlg;
    }
    function sync() {
      if (!dlg) return;
      $$('input[name="an-x-theme"]', dlg).forEach(function (r) { r.checked = r.value === themeNow(); });
      var o = $('#an-x-fs', dlg); if (o) o.textContent = fa(Math.round(P.fs * 100)) + '٪';
      $$('[data-x="fs-"]', dlg).forEach(function (b) { b.disabled = P.fs <= FS[0]; });
      $$('[data-x="fs+"]', dlg).forEach(function (b) { b.disabled = P.fs >= FS[FS.length - 1]; });
      $$('input[data-p]', dlg).forEach(function (i) {
        var k = i.getAttribute('data-p');
        if (i.type === 'radio') i.checked = String(P[k]) === i.value;
        else if (k === 'snd') { var s = $('[data-an="sound"]'); i.checked = !!s && s.getAttribute('aria-pressed') === 'true'; }
        else if (k === 'motion') i.checked = !AN.rm;
        else i.checked = !!P[k];
      });
      pressed('ruler', ruler.on); pressed('focus', !!P.focus); pressed('mark', isMarked()); pressed('listen', say.on);
      var pp = $('.an-x-pp', dlg); if (pp) pp.innerHTML = passport();
      var mk = $('.an-x-marks', dlg); if (mk) mk.innerHTML = marksList();
    }
    function pressed(k, on) { $$('[data-x="' + k + '"]').forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    // a bar at the bottom of the screen (continue reading, listening) lifts the template's toast above it
    function bars() { H.classList.toggle('an-x-bar', !!$('.an-x-resume.on, .an-x-player.on')); }
    function openPanel(from) { var d = panel(); sync(); AN.openDlg(d, '.an-dlg-x'); if (from) d._from = from; }
    function onChange(e) {
      var i = e.target, k = i.getAttribute('data-p');
      if (i.name === 'an-x-theme') { theme(i.value, i.closest('label')); return; }
      if (!k) return;
      if (k === 'snd') { var s = $('[data-an="sound"]'); if (s && (s.getAttribute('aria-pressed') === 'true') !== i.checked) s.click(); return; }
      if (i.type === 'radio') P[k] = +i.value;
      else P[k] = i.checked ? 1 : 0;
      save(); apply(); sync();
    }
    function onClick(e) {
      var b = e.target.closest && e.target.closest('[data-x]'); if (!b) return;
      var k = b.getAttribute('data-x');
      if (k === 'fs-' || k === 'fs+') { var n = FS.indexOf(P.fs) + (k === 'fs+' ? 1 : -1); if (n >= 0 && n < FS.length) { P.fs = FS[n]; save(); apply(); sync(); } }
      else if (k === 'reset') { var keep = { focus: P.focus, ruler: P.ruler }; P = keep; clean(); save(); apply(); if (themeNow() !== 'a' || AN.v !== 'a') theme('a', b); sync(); AN.toast('تنظیم‌های نمایش به حالت نخست برگشت.'); }
      else if (k === 'wipe') { STORE.forEach(drop); P = {}; clean(); apply(); ruler.set(false); theme('a', b); badges(); sync(); AN.toast('همه‌ی داده‌های ابزار خواننده از این مرورگر پاک شد.'); }
      else if (k === 'unmark') { toggleMark(b.getAttribute('data-u')); }
      else run(k, b);
    }
    function run(k, b) {
      if (k === 'mark') toggleMark();
      else if (k === 'listen') say.toggle();
      else if (k === 'ruler') ruler.set(!ruler.on);
      else if (k === 'focus') setFocus(!P.focus);
      else if (k === 'present') { var p = $('[aria-keyshortcuts="P"]'); if (p) { AN.closeDlg(); setTimeout(function () { p.click(); }, 60); } }
      else if (k === 'cite') citeDlg();
      else if (k === 'qr') qrDlg();
      else if (k === 'print') { AN.closeDlg(); setTimeout(function () { W.print(); }, 150); }
    }
    function setFocus(on) {
      if (!post) return;
      P.focus = on ? 1 : 0; save(); apply(); sync();
      AN.toast(on ? 'حالت تمرکز: فقط متن مقاله. برای بیرون آمدن دوباره F را بزنید.' : 'حالت تمرکز خاموش شد.');
    }

    /* ---------- header button and keys ---------- */
    var tools = $('#an-bar .an-tools');
    if (OPT.tools && tools) {
      btn = el('button', 'an-ico-btn an-x-btn', I.tools);
      btn.type = 'button'; btn.title = 'ابزار خواننده';
      btn.setAttribute('aria-label', 'ابزار خواننده (R)'); btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-keyshortcuts', 'R');
      tools.insertBefore(btn, tools.firstChild);
      btn.addEventListener('click', function () { openPanel(btn); });
    }
    var kl = $('#an-keys .an-keys-list');
    if (kl) kl.insertAdjacentHTML('beforeend', (OPT.tools ? '<dt><kbd>R</kbd></dt><dd>ابزار خواننده: پوسته، اندازه‌ی متن، خط‌کش، گذرنامه و نشان‌ها</dd>' : '') +
      (OPT.focus ? '<dt><kbd>F</kbd></dt><dd>حالت تمرکز، در صفحه‌ی هر مقاله</dd>' : '') + (OPT.qr ? '<dt><kbd>Q</kbd></dt><dd>کد QR همین صفحه، برای باز کردنش روی گوشی</dd>' : ''));
    D.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target || {}, tag = (t.tagName || '').toLowerCase(), k = e.key;
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) return;
      var open = $('.an-dlg.on');
      if (k === 'r' || k === 'R' || k === 'ق') {
        if (!OPT.tools || (open && open !== dlg)) return;
        e.preventDefault(); if (open) AN.closeDlg(); else openPanel(btn);
      } else if (open) return;
      else if ((k === 'f' || k === 'F' || k === 'ب') && post && OPT.focus) { e.preventDefault(); setFocus(!P.focus); }
      else if ((k === 'q' || k === 'Q' || k === 'ض') && OPT.qr) { e.preventDefault(); qrDlg(); }
    });

    /* ---------- bookmarks ---------- */
    function marks() { var m = get('an-x-marks', []); return Array.isArray(m) ? m.filter(function (x) { return x && x.u && x.t; }) : []; }
    function isMarked(u) { u = u || (post && path(here)); return !!u && marks().some(function (x) { return x.u === u; }); }
    function toggleMark(u) {
      var m = marks(), mine = !u;
      u = u || (post && path(here)); if (!u) return;
      var had = m.some(function (x) { return x.u === u; });
      if (had) m = m.filter(function (x) { return x.u !== u; });
      else if (post) m.unshift({ u: u, h: here, t: post.title, k: post.topic, at: Date.now() });
      put('an-x-marks', m.slice(0, 60)); sync(); badges();
      if (mine || !had) AN.toast(had ? 'از نشان‌شده‌ها برداشته شد.' : 'نشان شد؛ در «ابزار خواننده» (R) پیدایش می‌کنید.');
    }
    function marksList() {
      var m = marks();
      if (!m.length) return '<p class="an-x-empty">هنوز مقاله‌ای را نشان نکرده‌اید. در صفحه‌ی هر مقاله، «نشان کردن» آن را این‌جا نگه می‌دارد.</p>';
      return '<ul class="an-x-mlist">' + m.map(function (x) {
        var t = AN.TOPICS[x.k];
        return '<li style="--rc:' + AN.color(t ? t.c : 'default') + '"><a href="' + esc(x.h || x.u) + '"><i></i>' + esc(x.t) + '</a><button type="button" class="an-x-un" data-x="unmark" data-u="' + esc(x.u) + '" aria-label="برداشتن نشان «' + esc(x.t) + '»">✕</button></li>';
      }).join('') + '</ul>';
    }

    /* ---------- the future passport: one stamp for each story read to its end ---------- */
    function passport() {
      var read = get('an-x-read', {}), quiz = get('an-x-quiz', {}), map = byTopic(), keys = pkeys(), n = 0;
      var cells = keys.map(function (k) {
        var t = AN.TOPICS[k], r = read[k], q = quiz[k], u = (r && r.h) || (map[k] && map[k].url) || '', full = q && q.full;
        if (r) n++;
        var inner = '<span class="an-x-st-i">' + AN.icon(t.i) + '</span><span class="an-x-st-n">' + esc(t.n) + '</span>' + (full ? '<span class="an-x-star" aria-hidden="true">★</span>' : '');
        var lbl = t.n + '، ' + (r ? 'تا پایان خوانده شد' : 'هنوز خوانده نشده') + (full ? '، خودآزمایی کامل' : '');
        var a = 'class="an-x-st' + (r ? ' on' : '') + '" style="--rc:' + AN.color(t.c) + '" title="' + esc(lbl) + '"';
        return u ? '<a ' + a + ' href="' + esc(u) + '" aria-label="' + esc(lbl) + '">' + inner + '</a>' : '<span ' + a + ' role="img" aria-label="' + esc(lbl) + '">' + inner + '</span>';
      });
      return '<p class="an-x-pp-sum"><span class="an-x-ring" style="--p:' + (n / keys.length).toFixed(3) + '" aria-hidden="true"></span><span><b>' + fa(n) + ' از ' + fa(keys.length) + '</b> روایت تا پایان خوانده شده است.<small>هر مقاله را تا آخر بخوانید تا مهرش بخورد؛ خودآزمایی کامل یک ستاره کنارش می‌گذارد.</small></span></p><div class="an-x-stamps">' + cells.join('') + '</div>';
    }
    function badges() {
      var read = get('an-x-read', {}), done = {}, mk = {};
      Object.keys(read).forEach(function (k) { if (read[k] && read[k].u) done[read[k].u] = 1; });
      marks().forEach(function (x) { mk[x.u] = 1; });
      $$('a.an-card').forEach(function (a) {
        var u = path(a.href), cov = a.querySelector('.an-cover') || a, b = a.querySelector('.an-x-badges');
        var h = (done[u] ? '<span class="an-x-badge">' + I.seal + 'خوانده‌شده</span>' : '') + (mk[u] ? '<span class="an-x-badge an-x-badge-m">' + I.mark + 'نشان‌شده</span>' : '');
        if (!h) { if (b) b.remove(); return; }
        if (!b) { b = el('span', 'an-x-badges'); cov.appendChild(b); }
        b.innerHTML = h;
      });
    }
    if (OPT.passport || OPT.marks) badges();

    function sealHTML(stamped, n) {
      var t = AN.TOPICS[post.topic] || { n: '' };
      return stamped ? '<span class="an-x-seal-i on" aria-hidden="true">' + AN.icon(t.i || 'def') + '</span><p><b>مهر «' + esc(t.n) + '» در گذرنامه‌ی آینده‌ی شما خورد.</b> ' + fa(n) + ' از ' + fa(pkeys().length) + ' روایت را تا پایان خوانده‌اید.</p>'
        : '<span class="an-x-seal-i" aria-hidden="true">' + AN.icon(t.i || 'def') + '</span><p><b>گذرنامه‌ی آینده:</b> وقتی این روایت را تا پایان بخوانید، مهر «' + esc(t.n) + '» در گذرنامه‌تان می‌خورد.</p>';
    }
    function track() {
      var seal = $('#an-x-seal'), read = get('an-x-read', {}), t0 = Date.now(), done = !!read[post.topic], tick = false;
      if (seal) seal.innerHTML = sealHTML(done, pread(read));
      if (done) return;
      var end = el('span', 'an-x-end'); end.setAttribute('aria-hidden', 'true'); body.appendChild(end);
      function check() {
        tick = false; if (done) return;
        var r = end.getBoundingClientRect();
        if (r.top < W.innerHeight * 0.92 && Date.now() - t0 > 2500) {
          done = true; W.removeEventListener('scroll', onS);
          var rd = get('an-x-read', {});
          rd[post.topic] = { id: post.id, u: path(here), h: here, t: post.title, at: Date.now() }; put('an-x-read', rd);
          var n = pread(rd);
          if (seal) { seal.innerHTML = sealHTML(true, n); seal.classList.add('stamp'); }
          AN.toast('مهر «' + AN.TOPICS[post.topic].n + '» خورد: ' + fa(n) + ' از ' + fa(pkeys().length) + ' روایت در گذرنامه‌ی آینده.');
          if (n === pkeys().length) confetti();
          sync();
        }
      }
      function onS() { if (!tick) { tick = true; requestAnimationFrame(check); } }
      W.addEventListener('scroll', onS, { passive: true });
      setTimeout(check, 2600);
    }

    /* ---------- self-check quiz, built from the article itself ---------- */
    // Three kinds of question, all from what the article says:
    //  · glossary: pages.js turns each <abbr title> into a term with its definition in data-tip, and the reader
    //    picks the term for a definition. Wrong choices are the article's other terms first, then terms of the
    //    other nine articles (built in by tools/build.mjs), so every choice is a real word of the blog.
    //  · the «باور نادرست» box: is the quoted belief true or false? The answer quotes the article's reply.
    //  · key points: which of four sentences did this article make? The other three are key points of others.
    function sentences(s, max) {
      var parts = String(s).replace(/\s+/g, ' ').trim().match(/[^.!؟?]+[.!؟?]+(?:\s|$)|[^.!؟?]+$/g) || [], out = '';
      for (var i = 0; i < parts.length; i++) { if (out && (out + parts[i]).length > max) break; out += parts[i]; }
      return out.trim();
    }
    function quiz(slot) {
      var seen = {}, terms = [];
      $$('abbr[data-tip]', body).forEach(function (a) {
        var t = a.textContent.trim(), d = a.getAttribute('data-tip') || '', n = AN.norm(t);
        if (t && d && !seen[n]) { seen[n] = 1; terms.push({ t: t, d: d }); }
      });
      var own = terms.map(function (x) { return x.t; });
      var far = (Array.isArray(TERMS) ? TERMS : []).filter(function (t) { return typeof t === 'string' && !seen[AN.norm(t)]; });
      function termQ(x) {
        var near = shuffle(own.filter(function (t) { return t !== x.t; })).slice(0, 2), wrong = near.concat(shuffle(far).slice(0, 3 - near.length));
        return { k: 't', q: x.d.split(x.t).join('…'), a: x.t, o: shuffle([x.t].concat(wrong)) };
      }
      var myth = body.querySelector('.an-myth'), mq = null;
      if (myth) {
        var mp = $$('p', myth).filter(function (p) { return !p.classList.contains('an-box-t'); })[0];
        var mm = mp && /^«([^»]{8,260})»\s*([\s\S]*)$/.exec(mp.textContent.replace(/\s+/g, ' ').trim());
        if (mm) mq = { k: 'm', lead: 'درست یا نادرست؟', q: '«' + mm[1] + '»', a: 'نادرست', o: ['درست', 'نادرست'], why: sentences(mm[2], 230) };
      }
      var mine = $$('.an-keys li', body).map(function (li) { return li.textContent.replace(/\s+/g, ' ').trim(); }).filter(function (s) { return s.length > 12 && s.length < 220; });
      var others = (Array.isArray(KEYS) ? KEYS : []).filter(function (x) { return x && x[0] !== post.topic && typeof x[1] === 'string'; }).map(function (x) { return x[1]; });
      function keyQ(s) { return { k: 'k', q: 'کدام جمله را همین روایت گفته بود؟', a: s, o: shuffle([s].concat(shuffle(others).slice(0, 3))) }; }
      function pick() {
        var out = shuffle(terms).slice(0, 3).map(termQ).filter(function (q) { return q.o.length > 1; }), ks = shuffle(mine);
        if (mq) out.splice(Math.min(1, out.length), 0, mq);
        for (var i = 0; i < ks.length && out.length < 5 && others.length >= 3; i++) out.push(keyQ(ks[i]));
        return out;
      }
      if (pick().length < 2) return;
      var box = el('div', 'an-x-quiz'), cur = [];
      slot.appendChild(box);
      function build() {
        cur = pick();
        box.innerHTML = '<p class="an-eyebrow">خودآزمایی</p><h2 id="an-x-quiz-h">این روایت را چقدر به خاطر دارید؟</h2><p class="an-x-quiz-sub">' + fa(cur.length) + ' پرسش از همین مقاله: واژه‌ها، یک باور رایج و نکته‌های کلیدی. پاسخ‌ها فقط در همین مرورگر می‌مانند.</p>' +
          '<form class="an-x-qform" aria-labelledby="an-x-quiz-h">' + cur.map(function (q, i) {
            return '<fieldset class="an-x-q an-x-q-' + q.k + '" data-i="' + i + '"><legend><span class="an-x-qn">' + fa(i + 1) + '</span>' + (q.lead ? '<b>' + esc(q.lead) + '</b> ' : '') + esc(q.q) + '</legend><div class="an-x-opts">' + q.o.map(function (o) {
              return '<label><input type="radio" name="an-x-q' + i + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>';
            }).join('') + '</div><p class="an-x-fb" aria-live="polite"></p></fieldset>';
          }).join('') + '<div class="an-x-qfoot"><button type="submit" class="an-btn an-btn-primary an-btn-sm">بررسی پاسخ‌ها</button><p class="an-x-score" role="status" aria-live="polite"></p></div></form>';
        box.querySelector('form').addEventListener('submit', check);
      }
      function check(e) {
        e.preventDefault();
        var form = e.target, fs = $$('.an-x-q', form), ok = 0;
        fs.forEach(function (f) {
          var q = cur[+f.getAttribute('data-i')], a = q.a, c = f.querySelector('input:checked'), fb = f.querySelector('.an-x-fb'), right = !!c && c.value === a;
          $$('label', f).forEach(function (l) { var v = l.querySelector('input').value; l.classList.toggle('ok', v === a); l.classList.toggle('no', !!c && c.value === v && v !== a); });
          if (right) ok++;
          f.className = 'an-x-q an-x-q-' + q.k + (right ? ' ok' : ' no');
          if (q.k === 'm') fb.textContent = (right ? 'درست تشخیص دادید؛ این باور نادرست است. ' : 'این باور نادرست است. ') + (q.why || '');
          else fb.textContent = right ? 'درست است.' : (c ? 'نه؛ ' : 'بی‌پاسخ ماند؛ ') + 'پاسخ درست: «' + a + '»';
        });
        var all = ok === fs.length, st = get('an-x-quiz', {}), best = st[post.topic] || {};
        st[post.topic] = { s: Math.max(ok, best.s || 0), n: fs.length, full: all || !!best.full }; put('an-x-quiz', st);
        var out = form.querySelector('.an-x-score');
        out.textContent = fa(ok) + ' از ' + fa(fs.length) + ' درست. ' + (all ? 'عالی! یک ستاره کنار مهر این روایت در گذرنامه نشست.' : 'پاسخ‌ها در متن همین مقاله‌اند (روی هر واژه‌ی نقطه‌چین بزنید تا تعریفش را ببینید). دوباره امتحان کنید.');
        var sb = form.querySelector('[type="submit"]'); sb.textContent = 'پرسش‌های تازه';
        sb.type = 'button'; sb.onclick = function () { build(); var h = $('#an-x-quiz-h'); if (h) { h.tabIndex = -1; h.focus(); } };
        if (all) confetti(out);
        sync();
      }
      build();
    }

    /* ---------- continue where you stopped ---------- */
    function resume() {
      var hs = $$('h2', body), all = get('an-x-pos', {}), id = post.id || path(here), saved = all && all[id], tick = false, last = 0;
      function where() {
        var line = W.innerHeight * 0.3, cur = -1;
        hs.forEach(function (h, i) { if (h.getBoundingClientRect().top <= line) cur = i; });
        var br = body.getBoundingClientRect(), f = (line - br.top) / Math.max(1, br.height);
        return { i: cur, d: cur > -1 ? Math.round(line - hs[cur].getBoundingClientRect().top) : 0, f: Math.max(0, Math.min(1, f)) };
      }
      function keep() {
        tick = false; var now = Date.now(); if (now - last < 1200) return; last = now;
        var p = where(), a = get('an-x-pos', {}) || {};
        if (p.f > 0.06 && p.f < 0.95) a[id] = { i: p.i, d: p.d, f: +p.f.toFixed(3), at: now }; else delete a[id];
        var ks = Object.keys(a); if (ks.length > 30) ks.sort(function (x, y) { return a[x].at - a[y].at; }).slice(0, ks.length - 30).forEach(function (k) { delete a[k]; });
        put('an-x-pos', a);
      }
      W.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(keep); } }, { passive: true });
      if (!saved || !(saved.f > 0.06 && saved.f < 0.95) || location.hash.length > 1 || (W.scrollY || 0) > 200) return;
      var h = hs[saved.i], name = h ? h.textContent.trim() : '';
      var bar = el('div', 'an-x-resume'); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'ادامه‌ی خواندن');
      bar.innerHTML = '<p>دفعه‌ی پیش تا ' + (name ? 'بخش «' + esc(name) + '»' : fa(Math.round(saved.f * 100)) + '٪ این مقاله') + ' خوانده بودید.</p><button type="button" class="an-btn an-btn-primary an-btn-sm" data-r="go">ادامه از همان‌جا</button><button type="button" class="an-x-close" data-r="x" aria-label="بستن">✕</button>';
      D.body.appendChild(bar);
      requestAnimationFrame(function () { bar.classList.add('on'); bars(); });
      var y0 = W.scrollY || 0;
      function close() { bar.classList.remove('on'); bars(); W.removeEventListener('scroll', far); setTimeout(function () { bar.remove(); }, 400); }
      function far() { if (Math.abs((W.scrollY || 0) - y0) > 700) close(); }
      W.addEventListener('scroll', far, { passive: true });
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-r]'); if (!b) return;
        if (b.getAttribute('data-r') === 'go') {
          var top = h ? h.getBoundingClientRect().top + W.scrollY - W.innerHeight * 0.3 + saved.d : body.getBoundingClientRect().top + W.scrollY + saved.f * body.offsetHeight - W.innerHeight * 0.3;
          W.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
          if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
        }
        close();
      });
    }

    /* ---------- listen: the browser's own Persian voice, when it has one ---------- */
    var synth = W.speechSynthesis;
    var say = { on: false, paused: false, items: [], at: 0, token: 0, bar: null, toggle: function () { if (say.on) say.stop(); else say.start(); } };
    // Only a voice the device itself speaks with (localService): an online voice would send the article's text to
    // the voice's provider, and the toolkit sends nothing anywhere. With no such Persian voice the button stays hidden.
    function findVoice() { try { var vs = synth.getVoices() || []; for (var i = 0; i < vs.length; i++) if (/^fa([-_]|$)/i.test(vs[i].lang || '') && vs[i].localService !== false) return vs[i]; } catch (e) {} return null; }
    function listenInit() {
      if (!synth || !W.SpeechSynthesisUtterance) return;
      function found() { voice = findVoice(); if (voice) $$('.an-x-listen-slot').forEach(function (s) { s.hidden = false; }); }
      found();
      if (!voice && synth.addEventListener) synth.addEventListener('voiceschanged', found);
      W.addEventListener('pagehide', function () { if (say.on) say.stop(); });
    }
    say.start = function () {
      if (!voice || !body) return;
      var list = $$('h2, h3, p, li, blockquote', body).filter(function (e) { return !e.closest('.an-lab, table, figure, .an-sources, .an-x-after') && !e.querySelector('p, li') && e.textContent.trim().length > 1; });
      if (!list.length) return;
      var from = 0; for (var i = 0; i < list.length; i++) if (list[i].getBoundingClientRect().bottom > 80) { from = i; break; }
      say.items = list; say.at = from; say.on = true; say.paused = false;
      if (!say.bar) {
        say.bar = el('div', 'an-x-player'); say.bar.setAttribute('role', 'region'); say.bar.setAttribute('aria-label', 'خواندن با صدا');
        say.bar.innerHTML = '<button type="button" data-s="pp" class="an-x-pbtn" aria-label="مکث">' + I.pause + '</button><button type="button" data-s="next" class="an-x-pbtn" aria-label="بند بعدی">' + I.next + '</button><span class="an-x-pt" aria-live="polite"></span><button type="button" data-s="stop" class="an-x-close" aria-label="پایان خواندن">✕</button>';
        say.bar.addEventListener('click', function (e) {
          var b = e.target.closest('[data-s]'); if (!b) return; var k = b.getAttribute('data-s');
          if (k === 'stop') say.stop();
          else if (k === 'next') { say.at++; say.play(); }
          else if (say.paused) { synth.resume(); say.paused = false; b.innerHTML = I.pause; b.setAttribute('aria-label', 'مکث'); }
          else { synth.pause(); say.paused = true; b.innerHTML = I.play; b.setAttribute('aria-label', 'ادامه'); }
        });
        D.body.appendChild(say.bar);
      }
      say.bar.hidden = false; requestAnimationFrame(function () { say.bar.classList.add('on'); bars(); });
      pressed('listen', true); say.play();
    };
    say.play = function () {
      var tok = ++say.token;
      try { synth.cancel(); } catch (e) {}
      $$('.an-x-say').forEach(function (e) { e.classList.remove('an-x-say'); });
      if (say.at >= say.items.length) { say.stop(); AN.toast('خواندن مقاله تمام شد.'); return; }
      var e = say.items[say.at], parts = e.textContent.replace(/\s+/g, ' ').trim().replace(/([.!؟?؛])\s+/g, '$1\n').split('\n'), n = 0;
      e.classList.add('an-x-say');
      var r = e.getBoundingClientRect();
      if (r.top < 70 || r.bottom > W.innerHeight - 90) e.scrollIntoView({ block: 'center', behavior: AN.rm ? 'auto' : 'smooth' });
      var pt = say.bar && say.bar.querySelector('.an-x-pt'); if (pt) pt.textContent = 'خواندن بند ' + fa(say.at + 1) + ' از ' + fa(say.items.length);
      var pp = say.bar && say.bar.querySelector('[data-s="pp"]'); if (pp) { pp.innerHTML = I.pause; pp.setAttribute('aria-label', 'مکث'); } say.paused = false;
      (function one() {
        if (tok !== say.token) return;
        if (n >= parts.length) { say.at++; say.play(); return; }
        var u = new W.SpeechSynthesisUtterance(parts[n++]);
        u.lang = voice.lang || 'fa-IR'; u.voice = voice; u.rate = 1;
        u.addEventListener('end', function () { if (tok === say.token) one(); });
        u.addEventListener('error', function () { if (tok === say.token) one(); });
        synth.speak(u);
      })();
    };
    say.stop = function () {
      say.token++; say.on = false;
      try { synth.cancel(); } catch (e) {}
      $$('.an-x-say').forEach(function (e) { e.classList.remove('an-x-say'); });
      if (say.bar) { say.bar.classList.remove('on'); say.bar.hidden = true; }
      pressed('listen', false); bars();
    };

    /* ---------- reading ruler ---------- */
    ruler.size = function () { if (!ruler.el) return; var b = body || $('.an-post-body') || D.body, lh = parseFloat(W.getComputedStyle(b).lineHeight) || 36; ruler.el.style.setProperty('--h', Math.round(lh * 2.3) + 'px'); };
    ruler.move = function (y) { ruler.y = y; if (ruler.el) ruler.el.style.setProperty('--y', Math.round(y) + 'px'); };
    function pm(e) { if (e.pointerType !== 'touch') ruler.move(e.clientY); }
    ruler.set = function (on) {
      ruler.on = !!on; P.ruler = on ? 1 : 0; save();
      if (on && !ruler.el) { ruler.el = el('div', 'an-x-ruler', '<i></i><i></i>'); ruler.el.setAttribute('aria-hidden', 'true'); D.body.appendChild(ruler.el); }
      if (ruler.el) ruler.el.hidden = !on;
      if (on) { ruler.size(); ruler.move(ruler.y || W.innerHeight * 0.42); D.addEventListener('pointermove', pm, { passive: true }); }
      else D.removeEventListener('pointermove', pm);
      pressed('ruler', on);
    };
    if (P.ruler && OPT.ruler) ruler.set(true);

    /* ---------- citation ---------- */
    function citeDlg() {
      if (!post) return;
      var m = /(\d+|[۰-۹]+)\s+(\S+)\s+(\d{4}|[۰-۹]{4})/.exec(post.date || ''), when = m ? AN.faDigits(m[3]) + '، ' + AN.faDigits(m[1]) + ' ' + m[2] : 'بی‌تاریخ';
      var apa = 'همتی، امیرحسین. (' + when + '). ' + post.title + '. آینده‌نگار. ' + here;
      var d = AN.dialog('an-x-cite', '<div class="an-dlg-head"><h2 id="an-x-cite-h">ارجاع به این مقاله</h2><button type="button" class="an-dlg-x" aria-label="بستن">✕</button></div><div class="an-dlg-body an-x-pad"><p class="an-x-note">برای فهرست منابع پژوهش یا تحقیق کلاسی، به شیوه‌ی APA:</p><textarea class="an-x-cite-t" rows="4" readonly aria-label="متن ارجاع"></textarea><div class="an-x-row"><button type="button" class="an-btn an-btn-primary an-btn-sm" data-c="copy">کپی ارجاع</button></div></div>', 'an-x-small');
      d.setAttribute('aria-labelledby', 'an-x-cite-h');
      var ta = d.querySelector('textarea'); ta.value = apa;
      if (!d._wired) {
        d._wired = 1;
        d.addEventListener('click', function (e) { if (e.target.closest('[data-c="copy"]')) copy(ta.value, 'ارجاع کپی شد.', ta); });
      }
      AN.openDlg(d, '[data-c="copy"]');
    }
    function copy(text, ok, ta) {
      function manual() { if (ta) { ta.focus(); ta.select(); } AN.toast('متن انتخاب شد؛ با Ctrl+C کپی‌اش کنید.'); }
      if (navigator.clipboard && W.isSecureContext) navigator.clipboard.writeText(text).then(function () { AN.toast(ok); }, manual); else manual();
    }

    /* ---------- QR code of this page ---------- */
    // The encoder (qrcode-generator, MIT, Kazuhiko Arase) is a second file, fetched only when this window opens,
    // from the same address as this script and checked with Subresource Integrity like the others.
    function loadQR(cb) {
      if (W.AN_QR) { cb(); return; }
      var bases = [], i = 0;
      [X.base].concat(X.mirrors || []).forEach(function (b) { if (typeof b === 'string' && bases.indexOf(b) < 0) bases.push(b); });
      (function next() {
        if (i >= bases.length || !Array.isArray(QR)) { cb(new Error('qr')); return; }
        var s = D.createElement('script'); s.src = bases[i++] + QR[0];
        if (X.sri) { s.integrity = QR[1]; s.crossOrigin = 'anonymous'; }
        s.addEventListener('load', function () { cb(W.AN_QR ? null : new Error('qr')); });
        s.addEventListener('error', function () { s.remove(); next(); });
        D.head.appendChild(s);
      })();
    }
    function qrSVG(text) {
      var q = W.AN_QR(0, 'M'); q.addData(text, 'Byte'); q.make();
      var n = q.getModuleCount(), d = '', s = n + 8;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + c + ' ' + r + 'h1v1h-1z';
      // fill and stroke set here: the template's line-icon rule (svg:not([fill]), css/01-base.css) would stroke every module
      return '<svg viewBox="-4 -4 ' + s + ' ' + s + '" fill="#000" stroke="none" shape-rendering="crispEdges" aria-hidden="true"><rect x="-4" y="-4" width="' + s + '" height="' + s + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
    }
    function qrDlg() {
      if (!OPT.qr) return;
      var d = AN.dialog('an-x-qr', '<div class="an-dlg-head"><h2 id="an-x-qr-h">کد QR این صفحه</h2><button type="button" class="an-dlg-x" aria-label="بستن">✕</button></div><div class="an-dlg-body an-x-pad an-x-qr-body"><div class="an-x-qr-img" role="img" aria-label="کد QR پیوند این صفحه"><span class="an-x-note">در حال ساختن کد…</span></div><p class="an-x-qr-u" dir="ltr"></p><p class="an-x-note">دوربین گوشی را رو به این کد بگیرید تا همین صفحه روی گوشی باز شود. سر کلاس، «بزرگ‌تر» آن را برای پرده‌ی نمایش بزرگ می‌کند.</p><div class="an-x-row"><button type="button" class="an-btn an-btn-ghost an-btn-sm" data-q="big" aria-pressed="false">بزرگ‌تر</button><button type="button" class="an-btn an-btn-ghost an-btn-sm" data-q="copy">کپی پیوند</button></div></div>', 'an-x-qr-dlg');
      d.setAttribute('aria-labelledby', 'an-x-qr-h');
      var img = d.querySelector('.an-x-qr-img'), u = d.querySelector('.an-x-qr-u');
      try { u.textContent = decodeURI(here); } catch (e) { u.textContent = here; }
      if (!d._wired) {
        d._wired = 1;
        d.addEventListener('click', function (e) {
          var b = e.target.closest('[data-q]'); if (!b) return;
          if (b.getAttribute('data-q') === 'copy') copy(here, 'پیوند صفحه کپی شد.');
          else { var on = !d.classList.contains('big'); d.classList.toggle('big', on); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'کوچک‌تر' : 'بزرگ‌تر'; }
        });
        d.onclose = function () { d.classList.remove('big'); var b = d.querySelector('[data-q="big"]'); if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = 'بزرگ‌تر'; } };
      }
      AN.openDlg(d, '.an-dlg-x');
      if (img.getAttribute('data-for') === here) return;
      loadQR(function (err) {
        if (err) { img.innerHTML = '<span class="an-x-note">کد QR ساخته نشد: فایلش از اینترنت نرسید. پیوند زیر را می‌توانید کپی کنید.</span>'; return; }
        try { img.innerHTML = qrSVG(here); img.setAttribute('data-for', here); } catch (e) { img.innerHTML = '<span class="an-x-note">این پیوند برای کد QR بیش از اندازه بلند است.</span>'; }
      });
    }

    /* ---------- a little celebration (never with reduced motion) ---------- */
    function confetti(from) {
      if (AN.rm || !W.requestAnimationFrame) return;
      var c = el('canvas', 'an-x-confetti'), x = c.getContext && c.getContext('2d'); if (!x) return;
      c.setAttribute('aria-hidden', 'true'); D.body.appendChild(c);
      var w = c.width = W.innerWidth, h = c.height = W.innerHeight, r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: w / 2, top: h / 2, width: 0 };
      var cs = W.getComputedStyle(H), cols = ['--accent', '--primary', '--cyan', '--c-mind', '--c-energy', '--c-idea'].map(function (v) { return cs.getPropertyValue(v).trim() || '#FFB36B'; });
      var ps = [], t0 = 0;
      for (var i = 0; i < 140; i++) ps.push({ x: r.left + r.width / 2, y: r.top, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4, s: 4 + Math.random() * 5, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length] });
      (function f(t) {
        if (!t0) t0 = t; var k = (t - t0) / 1600;
        x.clearRect(0, 0, w, h);
        ps.forEach(function (p) { p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.globalAlpha = Math.max(0, 1 - k); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
        if (k < 1) requestAnimationFrame(f); else c.remove();
      })(performance.now());
    }

    /* ---------- the article ---------- */
    // Set up last: it calls into the listening, ruler and quiz code above, whose variables must hold their values.
    var after = null, voice = null;
    if (post && body) {
      // tools that sit beside the table of contents
      var tt = $('.an-toc-tools');
      if (tt) {
        var extra = (OPT.marks ? act('mark', 'mark', 'نشان کردن', 1, SM) : '') + (OPT.listen ? '<span class="an-x-listen-slot" hidden>' + act('listen', 'listen', 'بشنوید', 1, SM) + '</span>' : '') + (OPT.qr ? act('qr', 'qr', 'کد QR', 0, SM) : '');
        if (extra) { tt.insertAdjacentHTML('beforeend', extra); tt.classList.add('an-x-tt'); tt.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-x]'); if (b) run(b.getAttribute('data-x'), b); }); }
      }
      // after the article: the passport stamp, the quiz and the tools, below the first screen so nothing moves
      after = el('section', 'an-x-after');
      after.setAttribute('aria-label', 'پس از خواندن');
      after.innerHTML = (OPT.passport ? '<div class="an-x-seal" id="an-x-seal"></div>' : '') + '<div class="an-x-quiz-slot"></div>' +
        '<div class="an-x-acts-end">' + (OPT.marks ? act('mark', 'mark', 'نشان کردن', 1, SM) : '') + (OPT.cite ? act('cite', 'cite', 'ارجاع به این مقاله', 0, SM) : '') + (OPT.qr ? act('qr', 'qr', 'کد QR', 0, SM) : '') + act('print', 'print', 'نسخه‌ی چاپی', 0, SM) + '</div>';
      body.parentNode.insertBefore(after, body.nextSibling);
      after.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-x]'); if (b && !b.closest('.an-x-quiz')) run(b.getAttribute('data-x'), b); });
      if (OPT.passport) track();
      if (OPT.quiz) quiz(after.querySelector('.an-x-quiz-slot'));
      if (OPT.resume) resume();
      if (OPT.listen) listenInit();
      sync(); pressed('mark', isMarked());
    }

    H.classList.add('an-x-on');
    AN.x = { v: 8, open: openPanel, theme: theme, opt: OPT };
  }
})();
