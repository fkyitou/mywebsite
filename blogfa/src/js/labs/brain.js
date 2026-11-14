/* Lab · Learning brain: the forgetting curve and why spaced review beats cramming. */
(function () {
  'use strict';
  var W = window, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, DAYS = 60;
  // simplified memory model: power-law forgetting R = (1 + t / (9·S))⁻¹; S is "stability" (days until recall falls to 90%).
  // Each review raises S, and raises it more when recall had already dropped (the spacing effect / desirable difficulty).
  var S0 = 0.35;
  function R(t, S) { return 1 / (1 + t / (9 * S)); }
  function simulate(reviews) {
    var rv = reviews.slice().sort(function (a, b) { return a - b; }), S = S0, last = 0, pts = [], k = 0, i;
    for (i = 0; i <= DAYS * 8; i++) {
      var t = i / 8;
      while (k < rv.length && rv[k] <= t) { var r = R(rv[k] - last, S); S = S * (1.3 + 6 * (1 - r)); last = rv[k]; k++; }
      pts.push([t, R(t - last, S)]);
    }
    return pts;
  }
  function at(pts, d) { var i = Math.min(pts.length - 1, Math.max(0, Math.round(d * 8))); return pts[i][1]; }
  var PRE = {
    none: [], cram: [], spaced: [1, 3, 7, 14, 28], daily: []
  };

  AN.labs = AN.labs || {};
  AN.labs.brain = {
    title: 'منحنی فراموشی: مرور فشرده یا مرور با فاصله؟',
    sub: 'روی محور زمان بزن تا روز مرور بگذاری یا برداری. روز امتحان را جابه‌جا کن و ببین چه‌قدر از درس در ذهن می‌ماند.',
    mount: function (root) {
      var S = ui.stage(root, { hint: 'روی نمودار بزن تا روز مرور اضافه یا حذف شود', label: 'نمودار میزان به‌خاطرسپاری در طول ۶۰ روز' });
      var B = ui.body(root), C = ui.row(B), exam = 30, reviews = PRE.spaced.slice();
      function preset(k) {
        if (k === 'none') reviews = [];
        else if (k === 'cram') reviews = [exam - 1, exam - 0.75, exam - 0.5, exam - 0.25];
        else if (k === 'spaced') reviews = [1, 3, 7, 14, Math.max(15, exam - 2)].filter(function (d, i, a) { return d < exam && a.indexOf(d) === i; });
        else { reviews = []; for (var d = 1; d < exam; d++) reviews.push(d); }
        draw();
      }
      var sg = ui.seg(C, 'برنامه‌ی مرور', [['none', 'بدون مرور'], ['cram', 'شب امتحان (فشرده)'], ['spaced', 'با فاصله‌ی افزایشی'], ['daily', 'هر روز']], 'spaced', preset);
      ui.range(C, { label: 'روز امتحان', min: 7, max: 45, value: exam, fmt: function (v) { return 'روز ' + AN.fa(v); }, on: function (v) { exam = v; preset(sg.get()); } });
      var st = ui.stats(B, [['ex', 'یادآوری در روز امتحان'], ['late', 'یادآوری ۳۰ روز بعد از امتحان'], ['n', 'تعداد مرورها'], ['eff', 'یادآوری ماندگار به ازای هر مرور']]);
      ui.note(B, 'این نمودار با یک مدل ساده‌ی ریاضی رسم شده که دو یافته‌ی بارها تکرارشده‌ی روان‌شناسی شناختی را نشان می‌دهد: فراموشی سریع در روزهای اول (ابینگهاوس، ۱۸۸۵) و برتری مرور با فاصله بر مرور فشرده (فراتحلیل سپدا و همکاران، ۲۰۰۶). عددها برای هر فرد و هر درس فرق می‌کند؛ شکل منحنی‌ها مهم است.');
      function draw() {
        var c = S.ctx, w = S.w, h = S.h, k = S.k; if (!w) return;
        var pl = 46 * k, pr = 16 * k, pt = 22 * k, pb = 34 * k, cw = w - pl - pr, ch = h - pt - pb;
        function X(d) { return pl + d / DAYS * cw; } function Y(r) { return pt + (1 - r) * ch; }
        c.fillStyle = '#060A15'; c.fillRect(0, 0, w, h);
        c.font = '600 ' + (11 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.fillStyle = 'rgba(237,242,250,.6)'; c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = k;
        for (var i = 0; i <= 4; i++) { var y = Y(i / 4); c.beginPath(); c.moveTo(pl, y); c.lineTo(w - pr, y); c.stroke(); c.textAlign = 'right'; c.fillText(AN.fa(i * 25) + '٪', pl - 8 * k, y + 4 * k); }
        c.textAlign = 'center'; for (i = 0; i <= DAYS; i += 10) { c.fillText('روز ' + AN.fa(i), X(i), h - 10 * k); }
        // exam marker
        c.strokeStyle = 'rgba(255,200,97,.8)'; c.setLineDash([5 * k, 4 * k]); c.beginPath(); c.moveTo(X(exam), pt); c.lineTo(X(exam), pt + ch); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#FFC861'; c.fillText('امتحان', X(exam), pt - 6 * k);
        var base = simulate([]), cur = simulate(reviews);
        c.strokeStyle = 'rgba(154,168,192,.55)'; c.lineWidth = 1.6 * k; c.setLineDash([3 * k, 4 * k]); c.beginPath(); base.forEach(function (p, j) { j ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])); }); c.stroke(); c.setLineDash([]);
        var g = c.createLinearGradient(0, pt, 0, pt + ch); g.addColorStop(0, 'rgba(232,155,255,.35)'); g.addColorStop(1, 'rgba(232,155,255,0)');
        c.beginPath(); c.moveTo(X(0), Y(0)); cur.forEach(function (p) { c.lineTo(X(p[0]), Y(p[1])); }); c.lineTo(X(DAYS), Y(0)); c.closePath(); c.fillStyle = g; c.fill();
        c.strokeStyle = '#E89BFF'; c.lineWidth = 2.6 * k; c.beginPath(); cur.forEach(function (p, j) { j ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])); }); c.stroke();
        reviews.forEach(function (d) { c.fillStyle = '#53E0E0'; c.beginPath(); c.arc(X(d), Y(at(cur, d)), 4.5 * k, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(83,224,224,.35)'; c.beginPath(); c.moveTo(X(d), pt + ch); c.lineTo(X(d), Y(at(cur, d))); c.stroke(); });
        var re = at(cur, exam), rl = at(cur, Math.min(DAYS, exam + 30));
        c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(X(exam), Y(re), 5.5 * k, 0, Math.PI * 2); c.fill();
        c.textAlign = 'left'; c.fillStyle = 'rgba(237,242,250,.75)'; c.fillText('— بدون مرور', pl + 8 * k, pt + 14 * k);
        st.set('ex', AN.fa(re * 100) + '٪', re > 0.8 ? 'good' : re > 0.5 ? 'warn' : 'bad');
        st.set('late', AN.fa(rl * 100) + '٪', rl > 0.7 ? 'good' : rl > 0.4 ? 'warn' : 'bad');
        st.set('n', AN.fa(reviews.length));
        var gain = reviews.length ? (rl - at(base, Math.min(DAYS, exam + 30))) / reviews.length : 0;
        st.set('eff', reviews.length ? '+' + AN.fa(gain * 100, 1) + '٪' : '—', gain > 0.08 ? 'good' : '');
        S._geo = { X: X, pl: pl, cw: cw };
      }
      S.onResize(draw);
      S.cv.addEventListener('pointerdown', function (e) {
        var q = S.pos(e), g = S._geo; if (!g) return;
        var d = Math.round((q.x - g.pl) / g.cw * DAYS); if (d < 1 || d > DAYS) return;
        var i = reviews.indexOf(d); if (i > -1) reviews.splice(i, 1); else reviews.push(d);
        sg.set(''); draw();
      });
      draw();
    }
  };
})();
