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
  w.AN = { page: t, v: v, rm: rm, t0: Date.now() };
  // Self-check: if the end of the template never ran (e.g. Blogfa saved it cut short), say so instead of failing silently.
  w.addEventListener('load', function () {
    setTimeout(function () {
      if (w.AN.ok || !d.body) return;
      var b = d.createElement('div');
      b.setAttribute('role', 'alert');
      b.style.cssText = 'position:relative;z-index:99;margin:0;padding:12px 16px;background:#FFB36B;color:#1A0E04;font:600 14px/1.8 Tahoma,sans-serif;text-align:center';
      b.textContent = 'بخشی از امکانات این صفحه بارگذاری نشد. اگر مدیر وبلاگ هستید، بخش «عیب‌یابی» راهنمای نصب قالب را ببینید.';
      d.body.insertBefore(b, d.body.firstChild);
    }, 2500);
  });
})(document, window);
