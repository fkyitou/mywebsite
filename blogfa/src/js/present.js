/* آینده‌نگار · «ارائه در کلاس»: shows one article on a projector.
   One wide column with bigger type, no header and no table of contents, and a small bar for moving through the
   article. Each step goes about one screen forward or back and stops at every section heading, so nothing is
   skipped: PageDown, Space or ← forward; PageUp or → back (the arrows follow the bar's right-to-left buttons);
   Home goes back to the title. Opened from the article's table of contents or with P; Esc or P leaves.
   Full screen is asked for and is optional (an iPhone has none). Blogfa's ad bar is left as it is: the step bar
   sits above it (--an-ad, set by core.js). */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement, AN = W.AN;
  if (!AN || !AN.$) return;
  var el = AN.el, esc = AN.esc;
  var ICON = { prev: 'M5 12h14m-6-6 6 6-6 6', next: 'M19 12H5m6-6-6 6 6 6', sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', x: 'M6 6l12 12M18 6 6 18' };
  var svg = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; };

  AN.present = function (o) {
    var hs = o.hs || [], body = o.body;
    if (!body || !hs.length) return;
    var on = false, bar = null, at = null, cur = -2, anchor = 0, fsT = 0;
    var btn = el('button', 'an-btn an-btn-ghost an-btn-sm', 'ارائه در کلاس');
    btn.type = 'button'; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-keyshortcuts', 'P');
    if (o.tools) o.tools.appendChild(btn);
    btn.addEventListener('click', function () { toggle(true); });

    // where each step may stop: the top of the page (the banner is the title slide), the article, each heading
    function stops() {
      var pad = 20, list = [0, body.getBoundingClientRect().top + W.scrollY - pad];
      hs.forEach(function (h) { list.push(h.getBoundingClientRect().top + W.scrollY - pad); });
      return list.map(function (y) { return Math.max(0, Math.round(y)); });
    }
    function go(y, now) { W.scrollTo({ top: Math.max(0, y), behavior: now || AN.rm ? 'auto' : 'smooth' }); }
    function step(dir) {
      var y = W.scrollY, room = Math.round(W.innerHeight * 0.8), s = stops();
      if (dir > 0) { var n = s.filter(function (t) { return t > y + 4; })[0]; go(n != null && n - y <= room ? n : y + room); }
      else { var p = s.filter(function (t) { return t < y - 4; }).pop(); go(p != null && y - p <= room ? p : y - room); }
    }
    // the section in view: the last heading above the upper third of the screen (-1 before the first one)
    function section() {
      var lim = W.innerHeight * 0.34, i = -1;
      hs.forEach(function (h, k) { if (h.getBoundingClientRect().top <= lim) i = k; });
      return i;
    }
    function show() {
      if (!on || !at) return;
      var i = section(); if (i === cur) return; cur = i;
      at.innerHTML = i < 0 ? '<b>' + esc(o.title || '') + '</b>' : '<b>' + AN.fa(i + 1) + ' از ' + AN.fa(hs.length) + '</b> ' + esc(hs[i].textContent);
    }
    function build() {
      // A labelled region, so the bar is a landmark a screen reader can jump to (and, at the end of <body>, not
      // content outside every landmark). Not a toolbar: a toolbar promises that the arrow keys move between its
      // buttons, and here they turn the page, also right after one of these buttons was clicked.
      bar = el('div', 'an-present-bar');
      bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'ارائه در کلاس'); bar.hidden = true;
      bar.innerHTML = '<button type="button" class="an-ico-btn" data-p="prev" aria-label="قبلی">' + svg(ICON.prev) + '</button>' +
        '<span class="an-present-at" aria-live="polite"></span>' +
        '<button type="button" class="an-ico-btn" data-p="next" aria-label="بعدی">' + svg(ICON.next) + '</button>' +
        '<button type="button" class="an-ico-btn" data-p="v" aria-label="نسخه‌ی روز یا شب (B)">' + svg(ICON.sun) + '</button>' +
        '<button type="button" class="an-ico-btn" data-p="x" aria-label="خروج از ارائه (Esc)">' + svg(ICON.x) + '</button>';
      D.body.appendChild(bar); at = bar.querySelector('.an-present-at');
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var k = b.getAttribute('data-p');
        if (k === 'prev') step(-1); else if (k === 'next') step(1);
        else if (k === 'v') AN.setV(AN.v === 'a' ? 'b' : 'a');
        else if (k === 'x') toggle(false);
      });
      var t = false;
      W.addEventListener('scroll', function () { if (on && !t) { t = true; requestAnimationFrame(function () { t = false; show(); }); } }, { passive: true });
    }
    // keep the same place in view when the type size changes (entering, leaving, full screen on or off):
    // anchor is an index into stops(), 0 the top of the page, 2 + i heading i
    function keep() { go(stops()[anchor], true); }
    function toggle(v) {
      if (v === on) return;
      var i = section(); anchor = i < 0 ? 0 : i + 2; // before the first heading: from the title (the banner)
      on = v; H.classList.toggle('an-present', on); btn.setAttribute('aria-pressed', String(on));
      if (!bar) build();
      bar.hidden = !on; cur = -2;
      keep();
      if (on) {
        show(); fsT = Date.now();
        if (H.requestFullscreen && !D.fullscreenElement) { try { H.requestFullscreen().catch(function () {}); } catch (e) { /* refused */ } }
        // a touch screen has no PageDown: it gets the bar's buttons, and the projector tip stays with the keyboard one
        var touch = !!(W.matchMedia && W.matchMedia('(hover: none) and (pointer: coarse)').matches);
        AN.toast(touch ? 'ارائه در کلاس: دکمه‌های پایین صفحه جلو و عقب می‌برند.' :
          'ارائه در کلاس: PageDown جلو، PageUp عقب، Esc خروج' + (AN.v === 'a' ? '؛ روی ویدئوپروژکتور نسخه‌ی روز (B) خواناتر است' : ''));
      } else if (D.fullscreenElement && D.exitFullscreen) { try { D.exitFullscreen().catch(function () {}); } catch (e) { /* not ours */ } }
    }
    D.addEventListener('fullscreenchange', function () {
      if (!on) return;
      if (!D.fullscreenElement) toggle(false); // Esc in full screen belongs to the browser: leaving it leaves the mode
      else if (Date.now() - fsT < 3000) setTimeout(keep, 120);
    });
    // capture: runs before core.js closes a dialog on Esc, so that Esc closes the dialog and nothing more
    D.addEventListener('keydown', function (e) {
      var t = e.target || {}, tag = (t.tagName || '').toLowerCase(), k = e.key;
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      if (D.querySelector('.an-dlg.on')) return;
      if (k === 'p' || k === 'P' || k === 'ح') { e.preventDefault(); toggle(!on); return; }
      if (!on) return;
      var onCtl = tag === 'button' || tag === 'a', inLab = t.closest && t.closest('.an-lab');
      if (k === 'Escape') toggle(false);
      else if (k === 'PageDown' || (k === ' ' && !e.shiftKey && !onCtl) || (k === 'ArrowLeft' && !inLab)) { e.preventDefault(); step(1); }
      else if (k === 'PageUp' || (k === ' ' && e.shiftKey && !onCtl) || (k === 'ArrowRight' && !inLab)) { e.preventDefault(); step(-1); }
      else if (k === 'Home' && !inLab) { e.preventDefault(); go(0); }
    }, true);
  };
})();
