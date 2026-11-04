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
  var v = 'a';
  try {
    var m = q.match(/[?&]v=(a|b)\b/i);
    if (m) { v = m[1].toLowerCase(); localStorage.setItem('an-v', v); }
    else v = localStorage.getItem('an-v') || 'a';
  } catch (e) {}
  h.setAttribute('data-v', v);
  var rm = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (rm) h.setAttribute('data-motion', 'reduce');
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
