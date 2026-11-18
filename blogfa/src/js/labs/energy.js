/* Lab · Clean energy: a 24-hour grid for a small city. Add solar, wind and batteries and watch gas, emissions and wasted energy change. */
(function () {
  'use strict';
  var W = window, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, PI = Math.PI, N = 96, DT = 0.25;
  // lifecycle emissions, gCO2-eq per kWh (= t per GWh): IPCC AR5 WGIII Annex III medians
  var EF = { gas: 490, solar: 48, wind: 11 };
  function g(h, m, s) { return Math.exp(-0.5 * Math.pow((h - m) / s, 2)); }
  function run(o) {
    var r = { t: [], D: 0, gas: 0, sol: 0, win: 0, cur: 0, peak: 0, max: 0 }, soc = o.bat * 0.5, P = o.bat / 4, eta = 0.95;
    var rise = o.sum ? 5.3 : 7.2, set = o.sum ? 19.7 : 17.0, clear = o.sum ? 1 : 0.72;
    for (var i = 0; i < N; i++) {
      var h = (i + 0.5) * DT;
      var D = 70 + 12 * g(h, 8, 1.6) + 26 * g(h, 20, 2.2) - 14 * g(h, 4, 2.5) + (o.sum ? 24 * g(h, 15, 3) : 8 * g(h, 18.5, 1.5));
      var sol = h > rise && h < set ? o.sol * 0.85 * clear * Math.pow(Math.sin(PI * (h - rise) / (set - rise)), 1.3) : 0;
      var cf = Math.max(0.05, Math.min(0.9, 0.36 + 0.14 * Math.cos(2 * PI * (h - 3) / 24) + 0.07 * Math.sin(2 * PI * h / 6.5 + 1.3)));
      var win = o.win * cf, ren = sol + win, srv = Math.min(D, ren), net = D - ren, ch = 0, dis = 0, cur = 0, gas = 0;
      if (net < 0) { ch = Math.min(-net, P, (o.bat - soc) / (eta * DT)); soc += ch * eta * DT; cur = -net - ch; }
      else { dis = Math.min(net, P, soc * eta / DT); soc -= dis / eta * DT; gas = net - dis; }
      r.t.push({ h: h, D: D, s: ren ? srv * sol / ren : 0, w: ren ? srv * win / ren : 0, b: dis, gas: gas, ch: ch, cur: cur, soc: o.bat ? soc / o.bat : 0 });
      r.D += D * DT; r.gas += gas * DT; r.sol += sol * DT; r.win += win * DT; r.cur += cur * DT; r.peak = Math.max(r.peak, gas); r.max = Math.max(r.max, D, ren);
    }
    r.co2 = (r.gas * EF.gas + r.sol * EF.solar + r.win * EF.wind) / 1000; // MWh × g/kWh = kg… /1000 → tonnes
    r.base = r.D * EF.gas / 1000;
    return r;
  }

  AN.labs = AN.labs || {};
  AN.labs.energy = {
    title: 'یک روز شبکه‌ی برق شهر را خودت مدیریت کن',
    sub: 'شهر کوچک ما به‌طور میانگین حدود ۸۰ مگاوات برق می‌خواهد. خورشید، باد و باتری اضافه کن و ببین نیروگاه گازی چه‌قدر کنار می‌رود.',
    mount: function (root) {
      var S = ui.stage(root, { label: 'نمودار ۲۴ ساعته‌ی تولید و مصرف برق' });
      var B = ui.body(root), C = ui.row(B), o = { sol: 60, win: 40, bat: 0, sum: true }, res = null;
      var sg = ui.seg(C, 'فصل', [[true, 'تابستان'], [false, 'زمستان']], true, function (v) { o.sum = v; upd(); });
      var r1 = ui.range(C, { label: 'ظرفیت خورشیدی (مگاوات)', min: 0, max: 250, step: 10, value: o.sol, on: function (v) { o.sol = v; upd(); } });
      var r2 = ui.range(C, { label: 'ظرفیت بادی (مگاوات)', min: 0, max: 250, step: 10, value: o.win, on: function (v) { o.win = v; upd(); } });
      var r3 = ui.range(C, { label: 'باتری (مگاوات‌ساعت، ۴ ساعته)', min: 0, max: 600, step: 25, value: o.bat, on: function (v) { o.bat = v; upd(); } });
      function preset(s, w, b) { o.sol = s; o.win = w; o.bat = b; r1.set(s, true); r2.set(w, true); r3.set(b, true); upd(); }
      ui.btns(B, [['بیشتر شبکه‌های امروز', function () { preset(20, 20, 0); }], ['خورشید زیاد، بدون باتری', function () { preset(200, 20, 0); }], ['خورشید + باد + باتری', function () { preset(180, 110, 500); }, true]]);
      var st = ui.stats(B, [['c', 'سهم برق پاک از مصرف روز'], ['e', 'انتشار کربن در این روز'], ['x', 'برق هدررفته (بیش از نیاز)'], ['p', 'بیشینه‌ی نیاز به نیروگاه گازی']]);
      ui.note(B, 'انتشار کربن «چرخه‌ی عمر» حساب شده: ساخت، بهره‌برداری و برچیدن نیروگاه. میانه‌ی برآورد گزارش IPCC برای هر کیلووات‌ساعت: گاز (سیکل ترکیبی) ۴۹۰ گرم، خورشیدی ۴۸، بادی ۱۱ (برای مقایسه: زغال‌سنگ ۸۲۰ و هسته‌ای ۱۲). منحنی مصرف، تابش و باد ساده‌سازی شده‌اند؛ هدف دیدن الگوهاست، مثل «منحنی اردکی» که با خورشید زیاد ظاهر می‌شود.');
      function upd() { res = run(o); draw(); var cl = 1 - res.gas / res.D;
        st.set('c', AN.fa(cl * 100) + '٪', cl > 0.7 ? 'good' : cl > 0.35 ? 'warn' : 'bad');
        st.set('e', AN.fa(res.co2, 0) + ' تن CO₂', res.co2 < res.base * 0.4 ? 'good' : res.co2 < res.base * 0.75 ? 'warn' : 'bad');
        st.set('x', AN.fa(res.cur, 0) + ' مگاوات‌ساعت', res.cur > res.D * 0.1 ? 'bad' : res.cur > 0 ? 'warn' : 'good');
        st.set('p', AN.fa(res.peak, 0) + ' مگاوات');
      }
      function draw() {
        var c = S.ctx, w = S.w, h = S.h, k = S.k; if (!w || !res) return;
        var pl = 44 * k, pr = 40 * k, pt = 18 * k, pb = 30 * k, cw = w - pl - pr, ch = h - pt - pb, top = Math.max(160, Math.ceil(res.max / 40) * 40 + 20);
        function X(hh) { return pl + hh / 24 * cw; } function Y(v) { return pt + ch - v / top * ch; }
        c.fillStyle = '#060A15'; c.fillRect(0, 0, w, h);
        c.font = '600 ' + (10.5 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = k; c.fillStyle = 'rgba(237,242,250,.55)';
        for (var v = 0; v <= top; v += 40) { c.beginPath(); c.moveTo(pl, Y(v)); c.lineTo(w - pr, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(AN.fa(v), pl - 6 * k, Y(v) + 4 * k); }
        c.textAlign = 'center'; for (var hh = 0; hh <= 24; hh += 3) c.fillText(AN.faDigits((hh < 10 ? '0' : '') + hh) + ':۰۰', X(hh), h - 9 * k);
        var layers = [['w', 'rgba(83,224,224,.85)'], ['s', 'rgba(255,214,107,.9)'], ['b', 'rgba(182,164,255,.9)'], ['gas', 'rgba(255,138,107,.75)']];
        var acc = res.t.map(function () { return 0; });
        layers.forEach(function (L) {
          c.beginPath();
          res.t.forEach(function (p, i) { var x = X(i * DT), y = Y(acc[i] + p[L[0]]); i ? c.lineTo(x, y) : c.moveTo(x, y); c.lineTo(X((i + 1) * DT), y); });
          for (var i = res.t.length - 1; i >= 0; i--) { c.lineTo(X((i + 1) * DT), Y(acc[i])); c.lineTo(X(i * DT), Y(acc[i])); }
          c.closePath(); c.fillStyle = L[1]; c.fill();
          res.t.forEach(function (p, i) { acc[i] += p[L[0]]; });
        });
        // surplus above demand: battery charging, then wasted
        res.t.forEach(function (p, i) {
          var x0 = X(i * DT), x1 = X((i + 1) * DT);
          if (p.ch > 0) { c.fillStyle = 'rgba(182,164,255,.35)'; c.fillRect(x0, Y(p.D + p.ch), x1 - x0, Y(p.D) - Y(p.D + p.ch)); }
          if (p.cur > 0) { c.fillStyle = 'rgba(255,90,90,.35)'; c.fillRect(x0, Y(p.D + p.ch + p.cur), x1 - x0, Y(p.D + p.ch) - Y(p.D + p.ch + p.cur)); }
        });
        c.strokeStyle = '#FFFFFF'; c.lineWidth = 2.2 * k; c.beginPath(); res.t.forEach(function (p, i) { var x = X(p.h), y = Y(p.D); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
        if (o.bat) { c.strokeStyle = 'rgba(182,164,255,.95)'; c.setLineDash([4 * k, 3 * k]); c.lineWidth = 1.5 * k; c.beginPath(); res.t.forEach(function (p, i) { var x = X(p.h), y = pt + ch - p.soc * ch; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]); c.textAlign = 'left'; c.fillStyle = 'rgba(182,164,255,.95)'; c.fillText('شارژ باتری', w - pr + 4 * k, pt + 10 * k); }
        var lg = [['مصرف شهر', '#FFFFFF'], ['باد', '#53E0E0'], ['خورشید', '#FFD66B'], ['باتری', '#B6A4FF'], ['گاز', '#FF8A6B'], ['هدررفته', '#FF5A5A']], lx = w - pr - 4 * k;
        c.textAlign = 'right'; c.font = '700 ' + (10.5 * k) + 'px Vazirmatn, Tahoma, sans-serif';
        lg.forEach(function (l) { c.fillStyle = l[1]; c.fillRect(lx - 8 * k, pt + 2 * k, 8 * k, 8 * k); c.fillStyle = 'rgba(237,242,250,.85)'; c.fillText(l[0], lx - 12 * k, pt + 10 * k); lx -= c.measureText(l[0]).width + 26 * k; });
      }
      S.onResize(draw); upd(); sg.set(true);
    }
  };
})();
