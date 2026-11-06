/* آینده‌نگار · early boot: runs in <head> before first paint so the right layout shows without a flash. */
(function (d, w) {
  var h = d.documentElement, p = location.pathname, q = location.search, t;
  h.className = h.className.replace('an-nojs', 'an-js');
  if (w.AN_PAGE) t = w.AN_PAGE;
  else if (/^\/post\//i.test(p)) t = 'post';
  else if (/^\/page\//i.test(p)) t = 'page';
  else if (/^\/archive/i.test(p)) t = 'archive';
  else if (/^\/posts/i.test(p)) t = 'titles';
  else if ((p === '/' || p === '' || /^\/index\.html?$/i.test(p)) && !/[?&]p=([2-9]|\d\d)/.test(q)) t = 'home';
  else t = 'list';
  h.setAttribute('data-page', t);
  var v = 'a', m = null, X = null;
  try {
    m = q.match(/[?&]v=(a|b)\b/i);
    if (m) { v = m[1].toLowerCase(); localStorage.setItem('an-v', v); }
    else v = localStorage.getItem('an-v') || 'a';
    X = JSON.parse(localStorage.getItem('an-x') || 'null');
  } catch (e) {}
  // The reader's own settings from «ابزار خواننده» (the toolkit in Blogfa's custom-code box, src/addons/), put on
  // <html> before the first paint so a chosen theme or text size never flashes. Each value is checked against the
  // few it may take; css/09-reader.css does the rest. A ?v= address still shows the version it names.
  if (!X || typeof X !== 'object') X = {};
  if ((X.tone === 'paper' || X.tone === 'contrast') && !m) { h.setAttribute('data-an-tone', X.tone); v = X.tone === 'paper' ? 'b' : 'a'; }
  if (X.fs >= 0.85 && X.fs <= 1.5 && X.fs !== 1) h.style.setProperty('--an-fs', String(X.fs));
  if (X.lh === 2 || X.lh === 3) h.setAttribute('data-an-lh', String(X.lh));
  if (X.w === 1 || X.w === 3) h.setAttribute('data-an-w', String(X.w));
  if (X.ease === 1) h.setAttribute('data-an-ease', '');
  if (X.sky === 0) h.setAttribute('data-an-sky', 'off');
  if (X.focus === 1) h.setAttribute('data-an-focus', '');
  h.setAttribute('data-v', v);
  var rm = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) || X.motion === 0;
  if (rm) h.setAttribute('data-motion', 'reduce');
  // The soft change between pages and themes (CSS View Transitions): going from page to page of the blog cross-fades
  // in browsers that support it (others just load the page). A change of theme (AN.swap in core.js) opens as a circle
  // instead, so the default fade is off for it. These rules are added here, before the first paint, and not kept in
  // the stylesheet: the W3C Nu checker that validates every page does not know them yet (vnu 26.11) and reports them
  // as errors. On the new page the transition is skipped when motion is off, the reader turned it off in the toolkit,
  // or the device has no graphics chip.
  var vt = d.createElement('style');
  vt.textContent = '@media (prefers-reduced-motion: no-preference){@view-transition{navigation:auto}}' +
    'html.an-swap::view-transition-old(root),html.an-swap::view-transition-new(root){animation:none;mix-blend-mode:normal}';
  d.head.appendChild(vt);
  w.addEventListener('pagereveal', function (e) { if (e.viewTransition && (rm || X.vt === 0 || gpu === 'soft')) e.viewTransition.skipTransition(); });
  // software rendering (no hardware GPU): probed once per session by sky.js, known here from the second page on
  var gpu = '';
  try { gpu = sessionStorage.getItem('an-gpu') || ''; } catch (e) {}
  if (gpu === 'soft') h.setAttribute('data-gpu', 'soft');
  w.AN = { page: t, v: v, rm: rm, gpu: gpu, t0: Date.now() };
  // Self-check: if the end of the template never ran (e.g. Blogfa saved it cut short), or the CDN build could not get
  // its stylesheet or script from any address, say so instead of failing silently.
  w.addEventListener('load', function () {
    var n = 0;
    function check() {
      var A = w.AN;
      if ((A.ok && !A.fail) || !d.body) return;
      // a file still on its way from a backup address (CDN build): give it up to ten more seconds
      if (A.wait > 0 && n++ < 20) { setTimeout(check, 500); return; }
      var b = d.createElement('div');
      b.setAttribute('role', 'alert');
      b.style.cssText = 'position:relative;z-index:99;margin:0;padding:12px 16px;background:#FFB36B;color:#1A0E04;font:600 14px/1.8 Tahoma,sans-serif;text-align:center';
      b.textContent = 'بخشی از امکانات این صفحه بارگذاری نشد. اگر مدیر وبلاگ هستید، بخش «عیب‌یابی» راهنمای نصب قالب را ببینید.';
      d.body.insertBefore(b, d.body.firstChild);
    }
    setTimeout(check, 2500);
  });
})(document, window);
