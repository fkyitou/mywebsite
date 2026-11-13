/* آینده‌نگار · «نگار», the blog's guide: its card and the walk through the page.
   The reader's toolkit (src/addons/addons.js) draws the figure in the corner and fetches this file the first time
   a reader presses it or G, from the same pinned commit and with Subresource Integrity. What the card says comes
   from the page itself, the blog's own list of articles, what this browser already keeps for the toolkit and the
   visitor's clock; nothing is made up and nothing is sent anywhere. It keeps only which suggestion and which tip
   came last, in the toolkit's own storage ('an-x-guide'). The card is a small non-modal window beside the figure;
   the walk dims the page around one part at a time and stays below Blogfa's ad bar. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;

  W.AN_GUIDE = function (C) {
    var AN = C.AN, $ = AN.$, $$ = AN.$$, esc = C.esc, fa = C.fa, OPT = C.OPT, btn = C.btn;
    var card = null, msg = null, open = false, tour = null;

    function gs() { var g = C.get('an-x-guide', {}); return g && typeof g === 'object' ? g : {}; }
    function gput(k, v) { var g = gs(); g[k] = v; C.put('an-x-guide', g); }
    // only addresses that open a web page (no javascript: or data: from a stored list)
    function safe(u) { try { var x = new URL(u, location.href); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; } }
    function topicName(k) { var t = AN.TOPICS && AN.TOPICS[k]; return t ? t.n : ''; }
    function sayVersion(v) { return v === 'a' ? '«شب» (A)' : '«روز» (B)'; }

    /* ---------- what to say ---------- */
    var PHASE = { night: 'شب', sunrise: 'طلوع', morning: 'صبح', noon: 'نیمروز', afternoon: 'بعدازظهر', sunset: 'غروب' };
    var CONS = { winter: 'شکارچی (Orion)', spring: 'شیر (Leo)', summer: 'ماکیان (Cygnus)', autumn: 'ذات‌الکرسی (Cassiopeia)' };
    function phaseName(s) { return s.phase === 'twilight' ? (s.am ? 'گرگ‌ومیش صبح' : 'گرگ‌ومیش غروب') : PHASE[s.phase] || ''; }
    function moonName(a) {
      return a < 0.03 || a > 0.97 ? 'ماه نو' : a < 0.22 ? 'هلال نو' : a < 0.28 ? 'تربیع اول' : a < 0.47 ? 'رو به بدر' :
        a < 0.53 ? 'ماه کامل (بدر)' : a < 0.72 ? 'پس از بدر' : a < 0.78 ? 'تربیع دوم' : 'هلال پایانی';
    }
    // the sky by the visitor's own clock, whatever version is on screen
    function skyNow() { return AN.live && AN.clock ? AN.live.at(AN.clock()) : null; }
    function hello() {
      var s = skyNow(), p, h = new Date().getHours();
      p = s ? s.phase : h < 5 || h > 19 ? 'night' : h < 11 ? 'morning' : h < 14 ? 'noon' : 'afternoon';
      if (p === 'twilight') p = s.am ? 'morning' : 'afternoon';
      return p === 'night' ? 'شبتان پرستاره!' : p === 'sunrise' || p === 'morning' ? 'صبح بخیر!' : p === 'noon' ? 'ظهر بخیر!' : 'عصر بخیر!';
    }
    function pageLine() {
      var p = C.post, pg = C.page, t;
      if (p) {
        t = topicName(p.topic);
        var rd = C.read(), mine = rd && rd[p.topic] && rd[p.topic].u === C.path(C.here);
        return (t ? 'این روایت درباره‌ی «' + esc(t) + '» است و' : 'این روایت') + ' حدود ' + fa(p.min || 1) + ' دقیقه خواندن می‌برد.' + (mine ? ' پیش‌تر تا پایانش را خوانده‌اید.' : '');
      }
      if (pg === 'home') return 'این‌جا صفحه‌ی نخست است؛ می‌توانید از قلمروها شروع کنید یا از تازه‌ترین روایت‌ها.';
      if (pg === 'archive' || pg === 'titles') return 'این‌جا فهرست روایت‌های وبلاگ است؛ هر کدام را بزنید تا باز شود.';
      if (pg === 'list') return 'این‌جا روایت‌های یک قلمرو یا یک برچسب کنار هم آمده‌اند.';
      var h1 = $('h1'); t = h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : '';
      if (t.length > 70) t = t.slice(0, 68) + '…';
      return t ? 'این صفحه‌ی «' + esc(t) + '» است.' : 'این یکی از صفحه‌های وبلاگ است.';
    }
    // the header button's rule (js/core.js): every press changes the screen
    function versionText() {
      if (!AN.live) return 'دکمه‌ی نسخه در نوار بالا میان ' + sayVersion('a') + ' و ' + sayVersion('b') + ' جابه‌جا می‌شود. میان‌بر: B';
      if (AN.live.mode() === 'auto') return 'نسخه‌ی وبلاگ با ساعت دستگاه شما عوض می‌شود: روزها ' + sayVersion('b') + ' و شب‌ها ' + sayVersion('a') + '. با دکمه‌ی نسخه، نسخه‌ی دیگر را نگه دارید. میان‌بر: B';
      var back = AN.autoV && AN.v !== AN.autoV();
      return 'نسخه‌ی ' + sayVersion(AN.v) + ' را خودتان نگه داشته‌اید. ' + (back ? 'یک بار زدن دکمه‌ی نسخه آن را دوباره به ساعت دستگاه می‌سپارد.' : 'دکمه‌ی نسخه، نسخه‌ی دیگر را نشان می‌دهد.');
    }
    function afterText() {
      var p = [];
      if (OPT.passport) p.push('مهر «گذرنامه‌ی آینده»');
      var q = $('.an-x-quiz-slot'); if (OPT.quiz && q && q.children.length) p.push('یک خودآزمایی کوتاه');
      if (OPT.cite) p.push('ارجاع به روایت');
      if (OPT.qr) p.push('کد QR');
      p.push('نسخه‌ی چاپی');
      return 'پایان روایت این‌جاست: ' + p.join('، ') + '.' + (C.tools ? ' «ابزار خواننده» (کلید R) هم همیشه در دسترس است.' : '');
    }
    function tips() {
      var T = ['کلید ? فهرست همه‌ی میان‌برهای صفحه‌کلید را باز می‌کند.',
        'Ctrl+K یا / جست‌وجو را باز می‌کند؛ با پیکان‌ها میان نتیجه‌ها بروید و با Enter بازش کنید.',
        'کلید T شما را به بالای صفحه برمی‌گرداند.',
        'روی رایانه، در صفحه‌ی هر روایت، کلید P حالت «ارائه در کلاس» را روشن می‌کند.'];
      if (OPT.focus) T.push('در صفحه‌ی هر روایت، کلید F حالت تمرکز را روشن می‌کند و فقط متن می‌ماند.');
      if (OPT.qr) T.push('کلید Q کد QR همین صفحه را می‌سازد تا آن را روی گوشی باز کنید.');
      if (OPT.passport) T.push('هر روایت را تا پایان بخوانید تا مهرش در «گذرنامه‌ی آینده» بخورد؛ گذرنامه در «ابزار خواننده» است.');
      if (OPT.quiz) T.push('پایین روایت‌ها یک خودآزمایی کوتاه از واژه‌ها و نکته‌های همان روایت پیدا می‌کنید.');
      if (AN.live) T.push('رنگ آسمان پس‌زمینه با ساعت دستگاه شما عوض می‌شود و ماهش تقریباً همان شکلی را دارد که امشب در آسمان دارد.');
      T.push('آزمایشگاه‌های زنده‌ی روایت‌ها در مرورگر خود شما اجرا می‌شوند و چیزی به جایی فرستاده نمی‌شود.');
      T.push('یک رمز پنهان: روی صفحه‌کلید <span dir="ltr" class="an-g-seq">↑ ↑ ↓ ↓ ← → ← → B A</span> را بزنید.');
      T.push('کلید G (روی صفحه‌کلید فارسی «ل») هر وقت بخواهید مرا صدا می‌زند.');
      return T;
    }

    /* ---------- the walk through the page ---------- */
    function vis(e) {
      if (!e || e.closest('[hidden]')) return false;
      var r = e.getBoundingClientRect(), cs = W.getComputedStyle(e);
      return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0;
    }
    // the header's parts on every page but an article (there the bar slides away while reading), then the page's own
    // parts in the order they come
    function steps() {
      var top = [], body = [];
      function add(list, sel, t, x) { var e = $(sel); if (vis(e)) list.push({ el: e, t: t, x: x }); }
      if (!C.post) {
        add(top, '#an-nav', 'منوی اصلی', 'صفحه‌ی نخست، قلمروها، بایگانی و صفحه‌ی «درباره» از همین منو باز می‌شوند.');
        add(top, '[data-an="menu"]', 'منو', 'روی صفحه‌ی کوچک، پیوندهای اصلی وبلاگ پشت این دکمه‌اند.');
        add(top, '[data-an="search"]', 'جست‌وجو', 'میان همه‌ی روایت‌ها جست‌وجو کنید. میان‌بر: Ctrl+K یا /');
        add(top, '[data-an="ab"]', 'شب و روز', versionText());
        add(top, '[data-an="sound"]', 'صدا', 'صدای وبلاگ تا خودتان روشنش نکنید خاموش می‌ماند. میان‌بر: M');
        add(top, '.an-x-btn', 'ابزار خواننده', 'پوسته، اندازه‌ی متن، خط‌کش خواندن، نشان‌ها و گذرنامه‌ی آینده. میان‌بر: R');
      }
      if (C.page === 'home') {
        add(body, '#an-realms', 'قلمروها', 'هر قلمرو یکی از دسته‌های وبلاگ است؛ بزنید تا روایت‌هایش را ببینید.');
        add(body, '#an-cards', 'تازه‌ترین روایت‌ها', 'هر کارت یک روایت است؛ بزنید تا باز شود.' + (OPT.passport ? ' روایت‌هایی که تا پایان خوانده‌اید نشان «خوانده‌شده» می‌گیرند.' : ''));
      }
      if (C.post) {
        add(body, '.an-keys', keysTitle() || 'جمع‌بندی روایت', 'جمع‌بندی همین روایت در چند خط؛ برای مرور سریع، یا یادآوری پس از خواندن.');
        add(body, '.an-toc', 'فهرست مطالب', 'با آن به هر بخش بروید؛ حلقه‌ی کنارش نشان می‌دهد چه اندازه از روایت را خوانده‌اید.');
        add(body, '.an-lab', 'آزمایشگاه زنده', 'ایده‌ی روایت را خودتان امتحان کنید؛ همه‌چیز در مرورگر خود شما اجرا می‌شود.');
        add(body, '.an-x-after', 'پس از خواندن', afterText());
        add(body, '.an-related', 'روایت‌های پیشنهادی', 'برای ادامه‌ی سفر: اول روایت‌های نزدیک به همین موضوع، بعد بقیه.');
      }
      // the order of the page itself: the table of contents is sticky, so where it is on screen depends on the scroll
      body.sort(function (a, b) { return a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1; });
      return top.concat(body);
    }
    // Bring a part into view. Labs and charts above it are built as they come near the screen and can make the page
    // longer while it scrolls, so a smooth scroll can stop short: once the page is still, the part is checked and,
    // if it is still off the screen, put in place at once.
    function bring(e, block) {
      e.scrollIntoView({ block: block, behavior: AN.rm ? 'auto' : 'smooth' });
      var y = -1, n = 0, fix = 0;
      (function check() {
        setTimeout(function () {
          var sy = W.scrollY || 0;
          if (sy !== y && ++n < 16) { y = sy; check(); return; }
          place();
          var r = e.getBoundingClientRect();
          if ((r.top < 0 || r.top > W.innerHeight * 0.75) && fix++ < 2) { e.scrollIntoView({ block: block, behavior: 'auto' }); y = -1; n = 0; place(); check(); }
        }, 250);
      })();
    }
    function startTour() {
      var S = steps();
      if (!S.length) { say('<p>در این صفحه چیزی برای گشت نیست.</p>'); return; }
      hide(true);
      var spot = AN.el('div', 'an-g-spot'), tip = AN.el('div', 'an-g-tip');
      spot.setAttribute('aria-hidden', 'true');
      tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-modal', 'false'); tip.setAttribute('aria-labelledby', 'an-g-tip-h');
      tip.innerHTML = '<div class="an-g-tip-txt" aria-live="polite"><p class="an-g-n"></p><h2 id="an-g-tip-h"></h2><p class="an-g-x"></p></div>' +
        '<div class="an-g-tip-nav"><button type="button" class="an-btn an-btn-ghost an-btn-sm" data-t="prev">قبلی</button><button type="button" class="an-btn an-btn-primary an-btn-sm" data-t="next">بعدی</button><button type="button" class="an-link-btn" data-t="end">پایان گشت</button></div>';
      D.body.appendChild(spot); D.body.appendChild(tip);
      tour = { S: S, i: 0, spot: spot, tip: tip, raf: 0, t: 0 };
      tip.addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]'); if (!b || !tour) return;
        var k = b.getAttribute('data-t');
        if (k === 'next') go(tour.i + 1); else if (k === 'prev') go(tour.i - 1); else endTour();
      });
      W.addEventListener('scroll', place, { passive: true }); W.addEventListener('resize', place, { passive: true });
      // a lab or a chart built while the walk is on moves the parts below it without any scroll: follow the page's size
      if (W.ResizeObserver) { tour.ro = new W.ResizeObserver(place); tour.ro.observe(D.body); }
      D.addEventListener('pointerdown', outside, true); D.addEventListener('keydown', tourKeys, true);
      btn.setAttribute('aria-expanded', 'true');
      go(0);
    }
    function go(i) {
      var t = tour; if (!t) return;
      if (i >= t.S.length) { endTour(); return; }
      t.i = i = Math.max(0, i);
      var s = t.S[i], prev = $('[data-t="prev"]', t.tip), next = $('[data-t="next"]', t.tip);
      $('.an-g-n', t.tip).textContent = 'گام ' + fa(i + 1) + ' از ' + fa(t.S.length);
      $('#an-g-tip-h', t.tip).textContent = s.t;
      $('.an-g-x', t.tip).textContent = s.x;
      prev.disabled = i === 0; next.textContent = i === t.S.length - 1 ? 'پایان' : 'بعدی';
      // the header stays where it is; anything else is brought into view first
      var r = s.el.getBoundingClientRect();
      if (!s.el.closest('#an-bar') && (r.top < 72 || r.bottom > W.innerHeight - 24)) bring(s.el, r.height > W.innerHeight * 0.6 ? 'start' : 'center');
      place();
      clearTimeout(t.t); t.t = setTimeout(place, 500);
      (prev.disabled || D.activeElement !== prev ? next : prev).focus({ preventScroll: true });
    }
    function place() {
      var t = tour; if (!t || t.raf) return;
      t.raf = requestAnimationFrame(function () {
        t.raf = 0; if (tour !== t) return;
        var s = t.S[t.i], r = s.el.getBoundingClientRect(), vw = H.clientWidth, vh = W.innerHeight, pad = 6, st = t.spot.style;
        var ad = parseFloat(W.getComputedStyle(H).getPropertyValue('--an-ad')) || 0, room = vh - ad;
        var top = Math.max(r.top - pad, 4), bot = Math.min(r.bottom + pad, room - 4), left = Math.max(r.left - pad, 4), right = Math.min(r.right + pad, vw - 4);
        if (bot - top < 8 || right - left < 8) st.opacity = '0';
        else { st.opacity = ''; st.top = top + 'px'; st.left = left + 'px'; st.width = (right - left) + 'px'; st.height = (bot - top) + 'px'; }
        // the note goes below the part, else above it, else at the foot of the screen (above the ad bar)
        var tw = t.tip.offsetWidth, th = t.tip.offsetHeight, gap = 12;
        var y = bot + gap + th <= room - 8 ? bot + gap : top - gap - th >= 8 ? top - gap - th : room - th - 12;
        var x = Math.min(Math.max((left + right) / 2 - tw / 2, 12), vw - tw - 12);
        t.tip.style.top = Math.max(8, y) + 'px'; t.tip.style.left = Math.max(8, x) + 'px';
      });
    }
    // a mouse press anywhere else ends the walk; on a touch screen it may just be a scroll, so the walk stays
    function outside(e) { if (tour && e.pointerType === 'mouse' && !tour.tip.contains(e.target) && !btn.contains(e.target)) endTour(true); }
    function tourKeys(e) {
      if (!tour) return;
      var k = e.key, inTip = tour.tip.contains(D.activeElement);
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); endTour(); }
      // a right-to-left page: the left arrow goes forward
      else if (k === 'ArrowLeft' && inTip) { e.preventDefault(); go(tour.i + 1); }
      else if (k === 'ArrowRight' && inTip) { e.preventDefault(); go(tour.i - 1); }
    }
    function endTour(quiet) {
      var t = tour; if (!t) return;
      tour = null;
      if (t.raf) cancelAnimationFrame(t.raf);
      clearTimeout(t.t);
      W.removeEventListener('scroll', place); W.removeEventListener('resize', place);
      if (t.ro) t.ro.disconnect();
      D.removeEventListener('pointerdown', outside, true); D.removeEventListener('keydown', tourKeys, true);
      t.spot.remove(); t.tip.remove();
      btn.setAttribute('aria-expanded', 'false');
      if (!quiet && !btn.hidden) btn.focus({ preventScroll: true });
    }

    /* ---------- the card's answers ---------- */
    function say(html, focusSel) {
      msg.innerHTML = html;
      if (focusSel) { var f = $(focusSel, msg); if (f) f.focus({ preventScroll: true }); }
    }
    // the post's own summary box (.an-keys): its title differs from post to post (key points, a checklist, steps, numbers)
    function keysBox() { return $('.an-keys', (C.post && C.post.el) || D); }
    function keysTitle() { var k = keysBox(), t = k && $('.an-box-t', k); return t ? t.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) : ''; }
    function gist() {
      var k = keysBox(), all = k ? $$('li', k).map(function (x) { return x.textContent.replace(/\s+/g, ' ').trim(); }).filter(Boolean) : [];
      if (!all.length) { say('<p>این روایت جعبه‌ی جمع‌بندی ندارد.</p>'); return; }
      var li = all.slice(0, 3), more = all.length - li.length, t = keysTitle();
      say('<p>' + (t ? 'از جعبه‌ی «' + esc(t) + '» در همین روایت:' : 'از جعبه‌ی جمع‌بندی همین روایت:') + '</p><ol class="an-g-list">' +
        li.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
        (more > 0 ? '<p class="an-g-sub">و ' + fa(more) + ' مورد دیگر در خود جعبه.</p>' : '') +
        '<p><button type="button" class="an-link-btn" data-g="keys">رفتن به این جعبه</button></p>');
    }
    function toKeys() {
      var k = keysBox(); if (!k) return;
      hide(true);
      k.setAttribute('tabindex', '-1');
      bring(k, 'center');
      k.focus({ preventScroll: true });
    }
    // the stories this browser can open from here: the blog's own list, without this page
    function pool() {
      var me = C.path(C.here);
      return (C.idx || []).filter(function (q) { return q && q.title && safe(q.url) && C.path(q.url) !== me; });
    }
    function pick(again) {
      var all = pool();
      if (!all.length) { say('<p>فهرست روایت‌ها این‌جا در دسترس نیست؛ از صفحه‌ی نخست دوباره بپرسید.</p>'); return; }
      var rd = C.read(), last = gs().p, un = rd ? all.filter(function (q) { return !rd[q.topic]; }) : [];
      var from = (un.length ? un : all).filter(function (q) { return safe(q.url) !== last; });
      if (!from.length) from = un.length ? un : all;
      var q = from[Math.floor(Math.random() * from.length)], u = safe(q.url), t = topicName(q.topic);
      gput('p', u);
      var why = t ? 'درباره‌ی «' + esc(t) + '»' : '';
      if (rd) why = un.length ? (why ? why + '؛ ' : '') + 'هنوز تا پایانش نخوانده‌اید.' : 'همه‌ی روایت‌ها را تا پایان خوانده‌اید؛ این یکی را دوباره ورق بزنید.';
      else if (why) why += '.';
      say('<p>پیشنهاد من: <a href="' + esc(u) + '">' + esc(q.title) + '</a></p>' + (why ? '<p class="an-g-sub">' + why + '</p>' : '') +
        '<p><button type="button" class="an-link-btn" data-g="pick">یکی دیگر</button></p>', again ? '[data-g="pick"]' : '');
    }
    function sky() {
      var tone = H.getAttribute('data-an-tone'), off = H.getAttribute('data-an-sky') === 'off', now = skyNow();
      if (!now) { say('<p>آسمان زنده در این قالب نیست.</p>'); return; }
      var shown = tone || off ? null : AN.live.state(), m = now.moon, nm = m.age < 0.03 || m.age > 0.97;
      var head = tone ? 'با پوسته‌ی «' + (tone === 'paper' ? 'کاغذی' : 'پرتضاد') + '» آسمان پس‌زمینه کنار می‌رود تا فقط متن بماند.'
        : off ? 'آسمان پویای پس‌زمینه را در «ابزار خواننده» خاموش کرده‌اید.'
        : shown ? 'اکنون آسمان پس‌زمینه «' + phaseName(shown) + '» را نشان می‌دهد.' : '';
      var lines = [
        'ماه: ' + moonName(m.age) + '، حدود ' + fa(Math.round(m.lit * 100)) + '٪ روشن' + (nm ? '؛ این روزها دیده نمی‌شود.' : m.alt > 0 ? '؛ اکنون بالای افق است.' : '؛ اکنون زیر افق است.'),
        'صورت فلکی این فصل: ' + (CONS[now.season] || '') + '؛ شب‌ها در پس‌زمینه کشیده می‌شود.',
        versionText()
      ];
      say((head ? '<p>' + head + '</p>' : '') + '<ul class="an-g-list">' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
        '<p class="an-g-sub">این آسمان تقریبی است و فقط از ساعت و تاریخ دستگاه شما ساخته می‌شود؛ مکان شما پرسیده نمی‌شود.</p>');
    }
    function tip(again) {
      var T = tips(), i = (+gs().s || 0) % T.length;
      gput('s', i + 1);
      say('<p><b>راز ' + fa(i + 1) + ' از ' + fa(T.length) + ':</b> ' + T[i] + '</p><p><button type="button" class="an-link-btn" data-g="tip">راز بعدی</button></p>', again ? '[data-g="tip"]' : '');
    }

    /* ---------- the card ---------- */
    function acts() {
      var a = [];
      function b(k, t) { a.push('<button type="button" class="an-g-act" data-g="' + k + '">' + t + '</button>'); }
      if (steps().length > 1) b('tour', 'گشت کوتاه در این صفحه');
      var kb = C.post && keysBox();
      if (kb && $('li', kb)) b('gist', 'جمع‌بندی این روایت');
      if (pool().length) b('pick', 'یک روایت برایم انتخاب کن');
      if (skyNow()) b('sky', 'آسمان همین لحظه');
      b('tip', 'یک راز از وبلاگ');
      if (C.tools) b('tools', 'ابزار خواننده');
      return a.join('');
    }
    function build() {
      if (card) return;
      var about = $('#an-nav a[data-nav="about"]'), au = (about && safe(about.getAttribute('href'))) || '/page/about';
      card = AN.el('div', 'an-g-card');
      card.id = 'an-g-card'; card.hidden = true;
      card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'false'); card.setAttribute('aria-labelledby', 'an-g-h');
      card.innerHTML = '<div class="an-g-head"><span class="an-g-mini" aria-hidden="true">' + C.fig('an-gm-') + '</span><div><h2 id="an-g-h">نگار</h2><p>راهنمای «آینده‌نگار»</p></div>' +
        '<button type="button" class="an-g-close" data-g="close" aria-label="بستن کارت نگار">✕</button></div>' +
        '<div class="an-g-msg" aria-live="polite"></div><div class="an-g-acts" role="group" aria-label="از نگار بپرسید">' + acts() + '</div>' +
        '<div class="an-g-foot"><a href="' + esc(au) + '">درباره‌ی وبلاگ و سازنده</a>' + (C.tools ? '<button type="button" class="an-link-btn" data-g="hide">پنهان کردن نگار</button>' : '') + '</div>';
      msg = $('.an-g-msg', card);
      card.addEventListener('click', onCard);
      D.body.appendChild(card);
      btn.setAttribute('aria-controls', 'an-g-card');
    }
    function onCard(e) {
      var b = e.target.closest('[data-g]'); if (!b) return;
      var k = b.getAttribute('data-g'), again = msg.contains(b);
      if (k === 'close') hide();
      else if (k === 'tour') startTour();
      else if (k === 'gist') gist();
      else if (k === 'keys') toKeys();
      else if (k === 'pick') pick(again);
      else if (k === 'sky') sky();
      else if (k === 'tip') tip(again);
      else if (k === 'tools') { hide(true); C.tools(); }
      else if (k === 'hide') { C.hide(); AN.toast('نگار پنهان شد. از «ابزار خواننده» (R)، بخش «حرکت و جلوه‌ها»، دوباره روشنش کنید.'); }
    }
    function show() {
      build(); if (open) return;
      endTour(true);
      say('<p><b>' + hello() + '</b> من «نگار» هستم، راهنمای کوچک این وبلاگ.</p><p>' + pageLine() + '</p>');
      card.hidden = false; open = true;
      btn.setAttribute('aria-expanded', 'true'); btn.classList.add('open');
      requestAnimationFrame(function () { if (open) card.classList.add('on'); });
      var f = $('.an-g-act', card) || $('.an-g-close', card); if (f) f.focus({ preventScroll: true });
      D.addEventListener('keydown', cardKeys, true); D.addEventListener('pointerdown', cardOut, true);
    }
    function hide(quiet) {
      if (!open) return;
      open = false;
      card.classList.remove('on'); card.hidden = true;
      btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('open');
      D.removeEventListener('keydown', cardKeys, true); D.removeEventListener('pointerdown', cardOut, true);
      if (!quiet && !btn.hidden) btn.focus({ preventScroll: true });
    }
    // Escape closes the card unless one of the template's windows is open above it
    function cardKeys(e) { if (e.key === 'Escape' && open && !$('.an-dlg.on')) { e.preventDefault(); e.stopPropagation(); hide(); } }
    function cardOut(e) { if (open && !card.contains(e.target) && !btn.contains(e.target)) hide(true); }
    function toggle() { if (tour) endTour(); else if (open) hide(); else show(); }

    return {
      toggle: toggle, open: show, tour: startTour,
      close: function (quiet) { endTour(quiet); hide(quiet); },
      busy: function () { return open || !!tour; }
    };
  };
})();
