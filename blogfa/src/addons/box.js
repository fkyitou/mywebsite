/* آینده‌نگار · loader for «ابزار خواننده», the code for Blogfa's «کدها و جاوا اسکریپت‌های اختصاصی کاربر» box.
   tools/build.mjs fills in the addresses and file names and writes dist/box.html, the text the owner pastes into
   that box. It loads two files from the same pinned commit as the template (jsDelivr first, then the backup
   addresses), each checked with Subresource Integrity, and only when the page runs the Ayandeh-Negar template
   (window.AN, set in <head>). Nothing else: no pop-up, no redirect, no ads touched, nothing sent anywhere. */
(function (d, w) {
  if (w.AN_XL || !w.AN || !w.AN.page) return;
  w.AN_XL = 1;
  var M = '@MIRRORS@', F = { css: '@CSSFILE@', js: '@JSFILE@' }, S = '@SRI@', X = w.AN_X = w.AN_X || {};
  X.mirrors = M; X.sri = S;
  function add(kind, i) {
    if (i >= M.length) return;
    var css = kind === 'css', e = d.createElement(css ? 'link' : 'script');
    if (S) { e.integrity = F[kind][1]; e.crossOrigin = 'anonymous'; }
    if (css) { e.rel = 'stylesheet'; e.href = M[i] + F[kind][0]; } else { e.async = true; e.src = M[i] + F[kind][0]; X.base = M[i]; }
    e.addEventListener('error', function () { if (e.parentNode) e.parentNode.removeChild(e); add(kind, i + 1); });
    d.head.appendChild(e);
  }
  add('css', 0); add('js', 0);
})(document, window);
