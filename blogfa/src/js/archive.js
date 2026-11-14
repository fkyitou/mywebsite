/* آینده‌نگار · «همه‌ی مقاله‌ها» on the archive page.
   Blogfa's own /posts/ list has a fixed design that no template reaches (seen on the live blog, 2026-11-05), so the
   archive page, which the template does shape, reads that list from the same site and shows it in the blog's design.
   Without JavaScript, or if the list cannot be read, the page keeps its link to Blogfa's plain list. */
(function () {
  'use strict';
  var W = window, D = document, AN = W.AN;
  if (!AN || !AN.$ || AN.page !== 'archive') return;
  var $ = AN.$, esc = AN.esc, MAX_PAGES = 20, KEY = 'an-all-n';
  // the space held for the list (04-post.css) follows the count seen last time; only a number is kept, in this browser
  function box() { return $('#an-all'); }
  (function () { var n = 0, b = box(); try { n = parseInt(localStorage.getItem(KEY), 10) || 0; } catch (e) {} if (b && n > 0 && n < 200) b.style.setProperty('--an-all-n', n); })();
  function done() { var b = box(); if (b) b.classList.add('an-all-done'); }

  // «پنجشنبه چهاردهم آبان ۱۴۰۵» → «چهاردهم آبان ۱۴۰۵»: the list is narrow, the weekday adds little
  function shortDate(d) { return String(d).replace(/^\s*(?:یک|دو|سه|چهار|پنج)?\s*‌?\s*شنبه\s+|^\s*جمعه\s+/, ''); }

  // Blogfa's list: <a href=".../post/N">title</a> - <span class="d">date</span><br>, then page links in .pagination
  function read(html, base, posts, pages) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    Array.prototype.forEach.call(doc.querySelectorAll('a[href]'), function (a) {
      var h = a.getAttribute('href'), m = /\/post\/(\d+)|post-(\d+)\.html/.exec(h), url;
      try { url = new URL(h, base).href; } catch (e) { return; }
      if (m) {
        var id = m[1] || m[2], d = a.nextElementSibling;
        if (!posts[id]) posts[id] = { id: +id, url: url, title: a.textContent.trim(), date: d && /(^|\s)d(\s|$)/.test(d.className) ? d.textContent.trim() : '' };
      } else if (a.closest('.pagination') && pages.indexOf(url) < 0) pages.push(url);
    });
  }

  function show(list) {
    var ol = $('#an-all-list'), wait = $('#an-all-wait'), sub = $('#an-all-sub');
    if (!ol) return;
    ol.innerHTML = list.map(function (p, i) {
      var tk = AN.topicOf(p.title, '', null), t = AN.TOPICS[tk];
      return '<li style="--rc:' + AN.color(t ? t.c : 'default') + ';--d:' + (Math.min(i, 8) * 0.04) + 's"><a class="an-all-a" href="' + esc(p.url) + '">' +
        '<span class="an-all-n" aria-hidden="true">' + AN.faDigits(String(i + 1).padStart(2, '0')) + '</span>' +
        '<span class="an-all-t">' + esc(p.title) + '</span>' +
        '<span class="an-all-m">' + (t ? '<span class="an-all-c">' + esc(t.n) + '</span>' : '') + (p.date ? '<span class="an-all-d" title="' + esc(p.date) + '">' + esc(shortDate(p.date)) + '</span>' : '') + '</span>' +
        '</a></li>';
    }).join('');
    if (wait) wait.hidden = true;
    done(); try { localStorage.setItem(KEY, String(list.length)); } catch (e) {}
    if (sub) sub.textContent = AN.fa(list.length) + ' روایت، تازه‌ترین در بالا. روی هر عنوان بزن تا مقاله و آزمایشگاه زنده‌اش باز شود.';
    // the search dialog on this page searches these articles too
    AN._idx = list.map(function (p, i) { return { id: String(p.id), url: p.url, title: p.title, date: p.date, topic: AN.topicOf(p.title), i: i }; });
  }

  function fail() { done(); var w = $('#an-all-wait'); if (w) { w.classList.add('an-all-fail'); w.firstChild.nodeValue = 'فهرست مقاله‌ها این بار نیامد. '; } }

  function load() {
    // a page opened from disk (the flat preview) cannot read another file, so it keeps the plain-list link
    var src = $('#an-all-wait a[href]'); if (!src || !W.fetch || !W.DOMParser || location.protocol === 'file:') return fail();
    var first = src.href, posts = {}, pages = [first], done = 0;
    function next() {
      if (done >= pages.length || done >= MAX_PAGES) {
        var list = Object.keys(posts).map(function (k) { return posts[k]; }).sort(function (a, b) { return b.id - a.id; });
        return list.length ? show(list) : fail();
      }
      var url = pages[done++];
      return fetch(url, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (html) { read(html, url, posts, pages); return next(); });
    }
    next().catch(function (e) { if (W.console) console.warn('[آینده‌نگار] posts list', e); if (Object.keys(posts).length) { done = MAX_PAGES; next(); } else fail(); });
  }

  AN.ready(load);
})();
