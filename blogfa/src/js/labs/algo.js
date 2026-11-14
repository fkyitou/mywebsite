/* Lab · Algorithms and feeds: you set the ranking weights; the feed reorders live. Liking posts shows how a filter bubble forms. */
(function () {
  'use strict';
  var W = window, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, el = AN.el, esc = AN.esc;
  var TP = ['علم', 'ورزش', 'سرگرمی', 'جنجالی', 'آموزش', 'دوستان'], TC = ['#8FB6FF', '#7FE3A0', '#FFD66B', '#FF7A7A', '#53E0E0', '#E89BFF'];
  var POSTS = [
    ['ویدیوی بیست‌ثانیه‌ای: گربه‌ای که پیانو می‌زند', 2, 3, 0.92, 0.05, 0.3], ['دعوای لفظی دو چهره‌ی مشهور در یک برنامه‌ی زنده', 3, 2, 0.95, 0.92, 0.2],
    ['گل دقیقه‌ی ۹۰ در بازی دیشب', 1, 1, 0.85, 0.2, 0.6], ['توضیح ساده‌ی یک پژوهش تازه درباره‌ی باتری‌های سدیمی', 0, 20, 0.35, 0.02, 0.95],
    ['عکس‌های سفر دوستت به کویر مرنجاب', 5, 6, 0.5, 0, 0.65], ['شایعه: فلان برنامه از فردا کار نمی‌کند!', 3, 4, 0.88, 0.78, 0.05],
    ['آموزش پنج‌دقیقه‌ای: ساختن رمز قوی', 4, 30, 0.4, 0.02, 0.9], ['جشن تولد هم‌کلاسی‌ات', 5, 10, 0.45, 0, 0.7],
    ['تصویر تازه‌ی تلسکوپ جیمز وب از یک سحابی', 0, 14, 0.6, 0.02, 0.95], ['چالش وایرال: چه کسی بیشتر دوام می‌آورد؟', 2, 5, 0.8, 0.3, 0.2],
    ['بحث داغ: کدام شهر بهترین غذای خیابانی را دارد؟', 3, 8, 0.76, 0.55, 0.3], ['پادکست: گفت‌وگو با یک مهندس انرژی خورشیدی', 4, 48, 0.25, 0.02, 0.85]
  ].map(function (p, i) { return { id: i, t: p[0], tp: p[1], age: p[2], eng: p[3], out: p[4], q: p[5] }; });
  var PRESETS = { eng: [20, 100, 30, 0, 0], bal: [40, 40, 60, 50, 50], edu: [20, 15, 40, 100, 70] };

  AN.labs = AN.labs || {};
  AN.labs.algo = {
    title: 'الگوریتم فید را خودت تنظیم کن',
    sub: 'دوازده پست نمونه (ساختگی) داریم. وزن هر معیار را تغییر بده و ببین چه چیزی بالای فید می‌آید. پسندیدن پست‌ها علاقه‌های تو را عوض می‌کند.',
    mount: function (root) {
      var B = ui.body(root), C = ui.row(B), wv = PRESETS.bal.slice(), interest = TP.map(function () { return 0.5; }), liked = 0;
      var names = ['تازگی پست', 'تعامل پیش‌بینی‌شده', 'شباهت به علاقه‌های من', 'کیفیت و اعتبار منبع', 'تنوع موضوعی'], rs = [];
      names.forEach(function (n, i) { rs.push(ui.range(C, { label: n, min: 0, max: 100, step: 5, value: wv[i], on: function (v) { wv[i] = v; rank(); } })); });
      function preset(k) { wv = PRESETS[k].slice(); rs.forEach(function (r, i) { r.set(wv[i], true); }); rank(); }
      ui.btns(B, [['فقط بیشترین تعامل', function () { preset('eng'); }, true], ['متعادل', function () { preset('bal'); }], ['آموزشی و معتبر', function () { preset('edu'); }], ['۲۰ بار اسکرول و پسندیدن خودکار', autoLike], ['علاقه‌ها از نو', function () { interest = TP.map(function () { return 0.5; }); liked = 0; rank(); }]]);
      var st = ui.stats(B, [['q', 'میانگین کیفیت ۵ پست اول'], ['o', 'سهم محتوای هیجانی و خشم‌برانگیز'], ['d', 'تنوع موضوع در ۵ پست اول'], ['b', 'تمرکز علاقه‌ها (حباب فیلتر)']]);
      var wrap = el('div', 'an-feed-wrap'), list = el('ol', 'an-feed-list an-list-anim'), side = el('div', 'an-bars an-feed-int');
      wrap.appendChild(list); wrap.appendChild(side); B.appendChild(wrap);
      ui.note(B, 'پست‌ها و عددهای این آزمایشگاه ساختگی‌اند و فقط سازوکار را نشان می‌دهند. پژوهش‌ها نشان داده‌اند که در شبکه‌های اجتماعی، محتوای پرهیجان و اخلاقی‌ـ‌احساسی بیشتر بازنشر می‌شود؛ وقتی الگوریتمی فقط برای «تعامل» بهینه شود، همین محتوا بالا می‌آید. پایین مقاله منابع را ببین.');
      var cards = {};
      POSTS.forEach(function (p) {
        var li = el('li', 'an-fd'); li.style.setProperty('--tc', TC[p.tp]);
        li.innerHTML = '<span class="an-fd-n"></span><div class="an-fd-b"><b>' + esc(p.t) + '</b><span class="an-fd-tags"><i>' + TP[p.tp] + '</i>' + (p.eng > 0.75 ? '<i>پرتعامل</i>' : '') + (p.out > 0.6 ? '<i class="hot">هیجانی</i>' : '') + (p.q > 0.85 ? '<i class="ok">منبع معتبر</i>' : '') + '<i>' + AN.fa(p.age) + ' ساعت پیش</i></span></div><button type="button" class="an-fd-like" aria-label="پسندیدن: ' + esc(p.t) + '">♥</button>';
        li.querySelector('button').addEventListener('click', function () { like(p); });
        cards[p.id] = li; list.appendChild(li);
      });
      function like(p) { interest = interest.map(function (v, i) { return Math.max(0.02, Math.min(1, i === p.tp ? v + 0.14 : v - 0.03)); }); liked++; rank(); }
      function autoLike() { var n = 0; (function go() { var top = order[0]; like(top); if (++n < 20) setTimeout(go, AN.rm ? 0 : 140); })(); }
      var order = POSTS.slice();
      function rank() {
        var tw = wv.reduce(function (a, b) { return a + b; }, 0) || 1, pool = POSTS.slice(), out = [], cnt = TP.map(function () { return 0; });
        while (pool.length) {
          var best = null, bs = -1e9;
          pool.forEach(function (p) {
            var s = (wv[0] * Math.exp(-p.age / 18) + wv[1] * p.eng + wv[2] * interest[p.tp] + wv[3] * p.q - wv[4] * cnt[p.tp] * 0.45) / tw;
            if (s > bs) { bs = s; best = p; }
          });
          out.push(best); cnt[best.tp]++; pool.splice(pool.indexOf(best), 1);
        }
        var first = {}; out.forEach(function (p) { first[p.id] = cards[p.id].getBoundingClientRect().top; });
        out.forEach(function (p, i) { var li = cards[p.id]; li.querySelector('.an-fd-n').textContent = AN.fa(i + 1); li.classList.toggle('top', i < 5); list.appendChild(li); });
        if (!AN.rm) out.forEach(function (p) { var li = cards[p.id], d = first[p.id] - li.getBoundingClientRect().top; if (d) { li.style.transition = 'none'; li.style.transform = 'translateY(' + d + 'px)'; li.offsetHeight; li.style.transition = ''; li.style.transform = ''; } });
        order = out;
        var top = out.slice(0, 5), q = top.reduce(function (a, p) { return a + p.q; }, 0) / 5, o = top.filter(function (p) { return p.out > 0.6; }).length / 5, d = top.map(function (p) { return p.tp; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).length;
        var sum = interest.reduce(function (a, b) { return a + b; }, 0), H = -interest.reduce(function (a, v) { var p = v / sum; return a + (p > 0 ? p * Math.log(p) : 0); }, 0) / Math.log(TP.length);
        st.set('q', AN.fa(q * 100) + ' از ۱۰۰', q > 0.7 ? 'good' : q > 0.45 ? 'warn' : 'bad');
        st.set('o', AN.fa(o * 100) + '٪', o === 0 ? 'good' : o <= 0.2 ? 'warn' : 'bad');
        st.set('d', AN.fa(d) + ' موضوع از ' + AN.fa(TP.length), d >= 4 ? 'good' : d >= 3 ? 'warn' : 'bad');
        st.set('b', AN.fa((1 - H) * 100) + '٪', H > 0.9 ? 'good' : H > 0.7 ? 'warn' : 'bad');
        side.innerHTML = '<p class="an-feed-int-h">علاقه‌هایی که الگوریتم از تو یاد گرفته' + (liked ? ' (پس از ' + AN.fa(liked) + ' پسند)' : '') + '</p>' + TP.map(function (t, i) { return '<div class="an-bar-row"><span>' + t + '</span><span class="an-meter"><i style="--w:' + (interest[i] * 100).toFixed(0) + '%;--mc:' + TC[i] + '"></i></span><b>' + AN.fa(interest[i] * 100) + '</b></div>'; }).join('');
      }
      rank();
    }
  };
})();
