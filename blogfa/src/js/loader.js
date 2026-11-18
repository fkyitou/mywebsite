/* آینده‌نگار · loader, used only by the CDN build (tools/build.mjs, «cdn» variants).
   Blogfa refuses a template part as large as the inlined CSS and JS, so the CDN templates keep only the markup and
   take the same minified stylesheet and script from jsDelivr, pinned to one commit and checked with Subresource
   Integrity. The template loads both with ordinary tags. When one of them fails (blocked address, network error,
   or bytes that fail the integrity check), the same file is requested from the next address in the list. The file
   names and hashes are kept here too, so a backup request is still checked even if an editor dropped an attribute
   from a tag. Runs in <head>, before the two tags. */
(function (d, w) {
  var AN = w.AN, M = '@MIRRORS@', F = { css: '@CSSFILE@', js: '@JSFILE@' }, began = {};
  AN.wait = 0; AN.fail = 0; AN.via = { css: 0, js: 0 };
  function add(kind, i) {
    if (i >= M.length) { AN.fail++; return; }
    var css = kind === 'css', e = d.createElement(css ? 'link' : 'script');
    e.anBackup = 1; e.integrity = F[kind][1]; e.crossOrigin = 'anonymous';
    if (css) { e.rel = 'stylesheet'; e.href = M[i] + F[kind][0]; } else { e.async = false; e.src = M[i] + F[kind][0]; }
    AN.wait++;
    e.addEventListener('load', function () { AN.wait--; AN.via[kind] = i; });
    e.addEventListener('error', function () { AN.wait--; if (e.parentNode) e.parentNode.removeChild(e); add(kind, i + 1); });
    (css ? d.head : d.body || d.head).appendChild(e);
  }
  function backup(kind, i) { if (!began[kind]) { began[kind] = 1; add(kind, i); } }
  function tagFor(kind) {
    var all = d.querySelectorAll(kind === 'css' ? 'link[href]' : 'script[src]'), n = F[kind][0];
    for (var j = 0; j < all.length; j++) { var u = all[j][kind === 'css' ? 'href' : 'src']; if (!all[j].anBackup && u.slice(-n.length) === n) return all[j]; }
    return null;
  }
  // A failed <link> or <script> does not bubble its error event, but a listener on window in the capture phase
  // sees it, also for the tags further down the template that have not been parsed yet.
  w.addEventListener('error', function (e) {
    var t = e.target, u = t && (t.href || t.src);
    if (!t || t.anBackup || typeof u !== 'string') return;
    var k = u.slice(-F.css[0].length) === F.css[0] ? 'css' : u.slice(-F.js[0].length) === F.js[0] ? 'js' : '';
    if (!k) return;
    if (t.parentNode) t.parentNode.removeChild(t);
    backup(k, 1);
  }, true);
  // Second line, once the page is parsed: a tag that an editor removed, or a script that arrived but never ran.
  d.addEventListener('DOMContentLoaded', function () {
    if (!tagFor('css')) backup('css', 0);
    if (typeof AN.ready !== 'function') backup('js', tagFor('js') ? 1 : 0);
  });
})(document, window);
