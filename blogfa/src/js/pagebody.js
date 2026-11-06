/* آینده‌نگار · tidy what Blogfa's page editor adds to a separate page (seen on the live About page, 2026-11-05).
   The editor puts a line break after headings, paragraphs and lists and between list items, two empty paragraphs
   before each heading, and a lone &nbsp; at the end. The template's CSS hides most of these; this removes the rest:
   a line break standing between two blocks, paragraphs holding only spaces, and the stray &nbsp;. A line break
   with text on either side stays, because the writer typed it. */
(function () {
  'use strict';
  var W = window, AN = W.AN;
  if (!AN || !AN.$$ || AN.page !== 'page') return;
  var BLOCK = /^(P|H[1-6]|UL|OL|LI|DIV|FIGURE|TABLE|BLOCKQUOTE|PRE|SECTION|DETAILS|HR|ASIDE)$/;
  function blank(n) { return n.nodeType === 8 || (n.nodeType === 3 && !/[^\s ]/.test(n.nodeValue)); }
  function near(n, k) { while (n && blank(n)) n = n[k]; return n; }
  function block(n) { return !n || (n.nodeType === 1 && BLOCK.test(n.tagName)); }
  function tidy(body) {
    AN.$$('br', body).forEach(function (br) {
      var up = br.parentNode;
      if (/^(UL|OL)$/.test(up.tagName) || (block(near(br.previousSibling, 'previousSibling')) && block(near(br.nextSibling, 'nextSibling')))) up.removeChild(br);
    });
    AN.$$('p', body).forEach(function (p) { if (!p.children.length && !/[^\s ]/.test(p.textContent)) p.parentNode.removeChild(p); });
    Array.prototype.slice.call(body.childNodes).forEach(function (n) { if (n.nodeType === 3 && blank(n) && / /.test(n.nodeValue)) body.removeChild(n); });
  }
  AN.ready(function () { AN.$$('.an-post-body').forEach(tidy); });
})();
