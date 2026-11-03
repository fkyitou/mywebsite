/* Lab · Living on another planet: real Earth–Mars geometry from JPL orbital elements, a Hohmann launch game, and life on Mars in numbers. */
(function () {
  'use strict';
  var W = window, AN = W.AN; if (!AN || !AN.ui || !AN.helio) return;
  var ui = AN.ui, el = AN.el, PI = Math.PI, TAU = PI * 2, DAY = 86400000, AU = 149597870.7, C = 299792.458;
  var RE = 1.0, RM = 1.523679, AT = (RE + RM) / 2, TF = 0.5 * Math.pow(AT, 1.5) * 365.25636; // Hohmann transfer: ≈ 259 days
  var PHI0 = 180 - 360 * TF / 686.98; // Mars must lead Earth by ≈ 44° at launch
  function pos(ms) { var j = AN.jd(ms); return { e: AN.helio(AN.EMB, j), m: AN.helio(AN.MARS, j) }; }
  function lon(p) { return Math.atan2(p[1], p[0]); }
  function phase(ms) { var p = pos(ms), d = (lon(p.m) - lon(p.e)) * 180 / PI; return ((d % 360) + 540) % 360 - 180; }
  function faDate(ms) { try { return new Date(ms).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return new Date(ms).toISOString().slice(0, 10); } }
  function nextWindow(ms) { var prev = phase(ms); for (var d = 1; d < 900; d++) { var p = phase(ms + d * DAY); if (prev > PHI0 && p <= PHI0 && prev - p < 90) return ms + d * DAY; prev = p; } return null; }
  function nextClosest(ms) { var best = 1e9, bd = 0, prev = 1e9, falling = false; for (var d = 0; d < 900; d++) { var x = AN.marsDist(ms + d * DAY); if (x < prev) falling = true; else if (falling && x > prev && d > 1) return { ms: ms + (d - 1) * DAY, au: prev }; prev = x; if (x < best) { best = x; bd = d; } } return { ms: ms + bd * DAY, au: best }; }

  AN.labs = AN.labs || {};
  AN.labs.space = {
    title: 'مأموریت مریخ: از مدار زنده تا زندگی روی سیاره‌ی سرخ',
    sub: 'جای واقعی زمین و مریخ با عناصر مداری آزمایشگاه پیشرانش جت ناسا محاسبه می‌شود. زمان را جلو ببر و فضاپیما را در لحظه‌ی درست پرتاب کن.',
    mount: function (root) {
      var tabs = ui.tabs(root, ['مدار زنده و پنجره‌ی پرتاب', 'زندگی روی مریخ']), P1 = tabs.panes[0], P2 = tabs.panes[1];
      var S = ui.stage(P1, { ratio: '16 / 10', label: 'نمای بالای منظومه‌ی شمسی داخلی با جای زمین و مریخ' });
      var B = ui.body(P1), C1 = ui.row(B), now = Date.now(), off = 0, play = false, flight = null, msg = null;
      var dateR = ui.range(C1, { label: 'تاریخ', min: -800, max: 1600, value: 0, fmt: function (v) { return faDate(now + v * DAY); }, on: function (v) { off = v; flight = null; draw(); } });
      var bt = ui.btns(B, [['▶ حرکت زمان', function () { play = !play; bt[0].textContent = play ? '❚❚ توقف زمان' : '▶ حرکت زمان'; }], ['🚀 پرتاب از همین تاریخ', launch, true], ['برو به پنجره‌ی پرتاب بعدی', function () { var w = nextWindow(now + off * DAY); if (w) { off = Math.round((w - now) / DAY); dateR.set(off, true); flight = null; draw(); } }], ['امروز', function () { off = 0; dateR.set(0, true); flight = null; draw(); }]]);
      var st = ui.stats(B, [['d', 'فاصله‌ی زمین تا مریخ'], ['l', 'زمان رسیدن نور و پیام'], ['ph', 'زاویه‌ی جلوتر بودن مریخ'], ['w', 'پنجره‌ی پرتاب بعدی']]);
      msg = ui.note(B, 'برای سفر کم‌هزینه (مدار انتقال هوهمان) باید وقتی پرتاب کنی که مریخ حدود ' + AN.fa(PHI0, 0) + ' درجه از زمین جلوتر باشد؛ سفر حدود ' + AN.fa(TF, 0) + ' روز طول می‌کشد. این وضعیت تقریباً هر ۲۶ ماه یک بار تکرار می‌شود. مدل ما مدارها را ساده‌سازی می‌کند و مأموریت‌های واقعی مسیرهای کمی متفاوتی برمی‌گزینند، پس تاریخ پنجره تقریبی است.');
      var paths = null;
      function orbit(elm, period) { var a = [], j0 = AN.jd(now); for (var i = 0; i <= 240; i++) a.push(AN.helio(elm, j0 + i / 240 * period)); return a; }
      function launch() {
        var t0 = now + off * DAY, p = pos(t0), r1 = Math.hypot(p.e[0], p.e[1]), r2 = RM, a = (r1 + r2) / 2, e = (r2 - r1) / (r2 + r1);
        flight = { t0: t0, l0: lon(p.e), a: a, e: e, f: 0 };
        play = false; bt[0].textContent = '▶ حرکت زمان';
        msg.innerHTML = 'فضاپیما در ' + faDate(t0) + ' پرتاب شد و ' + AN.fa(TF, 0) + ' روز در راه است…';
      }
      function craft(f) { var M = PI * f, E = M; for (var i = 0; i < 8; i++) E -= (E - flight.e * Math.sin(E) - M) / (1 - flight.e * Math.cos(E)); var nu = 2 * Math.atan2(Math.sqrt(1 + flight.e) * Math.sin(E / 2), Math.sqrt(1 - flight.e) * Math.cos(E / 2)), r = flight.a * (1 - flight.e * Math.cos(E)); return [r * Math.cos(flight.l0 + nu), r * Math.sin(flight.l0 + nu)]; }
      var stars = null;
      function draw() {
        var c = S.ctx, w = S.w, h = S.h, k = S.k; if (!w) return;
        if (!paths) paths = { e: orbit(AN.EMB, 365.25), m: orbit(AN.MARS, 687) };
        var ms = now + off * DAY, p = pos(ms), sc = Math.min(w, h) * 0.46 / 1.67, cx = w / 2, cy = h / 2;
        function X(v) { return cx + v[0] * sc; } function Y(v) { return cy - v[1] * sc; }
        c.fillStyle = '#04060D'; c.fillRect(0, 0, w, h);
        if (!stars || stars.w !== w) { stars = { w: w, a: [] }; for (var i = 0; i < 260; i++) stars.a.push([Math.random() * w, Math.random() * h, Math.random()]); }
        stars.a.forEach(function (s) { c.fillStyle = 'rgba(220,232,255,' + (s[2] * 0.6).toFixed(2) + ')'; c.fillRect(s[0], s[1], k, k); });
        var g = c.createRadialGradient(cx, cy, 0, cx, cy, sc * 0.5); g.addColorStop(0, 'rgba(255,214,140,.6)'); g.addColorStop(1, 'rgba(255,179,107,0)'); c.fillStyle = g; c.fillRect(cx - sc, cy - sc, sc * 2, sc * 2);
        c.beginPath(); c.arc(cx, cy, 7 * k, 0, TAU); c.fillStyle = '#FFE7B0'; c.fill();
        [['e', 'rgba(91,155,255,.45)'], ['m', 'rgba(255,138,107,.45)']].forEach(function (o) { c.strokeStyle = o[1]; c.lineWidth = 1.3 * k; c.beginPath(); paths[o[0]].forEach(function (v, j) { j ? c.lineTo(X(v), Y(v)) : c.moveTo(X(v), Y(v)); }); c.stroke(); });
        // phase wedge: how far Mars leads Earth
        var le = lon(p.e), lm = lon(p.m);
        c.strokeStyle = 'rgba(255,200,97,.5)'; c.lineWidth = 1.2 * k; c.setLineDash([3 * k, 4 * k]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(X(p.e), Y(p.e)); c.moveTo(cx, cy); c.lineTo(X(p.m), Y(p.m)); c.stroke(); c.setLineDash([]);
        // Earth–Mars line and light time
        c.strokeStyle = 'rgba(83,224,224,.85)'; c.lineWidth = 1.6 * k; c.beginPath(); c.moveTo(X(p.e), Y(p.e)); c.lineTo(X(p.m), Y(p.m)); c.stroke();
        if (flight) {
          var f = Math.min(1, (ms - flight.t0) / (TF * DAY));
          c.strokeStyle = 'rgba(255,255,255,.55)'; c.setLineDash([4 * k, 4 * k]); c.lineWidth = 1.4 * k; c.beginPath();
          for (var q = 0; q <= 60; q++) { var v = craft(q / 60); q ? c.lineTo(X(v), Y(v)) : c.moveTo(X(v), Y(v)); } c.stroke(); c.setLineDash([]);
          var sp = craft(Math.max(0, f)); c.beginPath(); c.arc(X(sp), Y(sp), 4 * k, 0, TAU); c.fillStyle = '#FFFFFF'; c.shadowColor = '#FFFFFF'; c.shadowBlur = 12 * k; c.fill(); c.shadowBlur = 0;
          if (f >= 1 && !flight.done) {
            flight.done = true; var end = craft(1), miss = Math.hypot(end[0] - p.m[0], end[1] - p.m[1]) * AU / 1e6, ang = (((lm - lon(end)) * 180 / PI) % 360 + 540) % 360 - 180;
            msg.innerHTML = miss < 8 ? '🎉 رسیدی! فضاپیما در ' + faDate(ms) + ' به مدار مریخ رسید و مریخ فقط حدود ' + AN.fa(miss, 1) + ' میلیون کیلومتر دورتر بود؛ برای ورود به مدار، اصلاح مسیر کوچکی کافی است.' :
              'مریخ آن‌جا نبود: وقتی فضاپیما به مدار مریخ رسید، سیاره ' + AN.fa(Math.abs(ang), 0) + ' درجه ' + (ang > 0 ? 'جلوتر' : 'عقب‌تر') + ' بود (حدود ' + AN.fa(miss, 0) + ' میلیون کیلومتر فاصله). دکمه‌ی «برو به پنجره‌ی پرتاب بعدی» را امتحان کن.';
          }
        }
        [[p.e, '#5B9BFF', 'زمین'], [p.m, '#FF8A6B', 'مریخ']].forEach(function (o) {
          var x = X(o[0]), y = Y(o[0]), gg = c.createRadialGradient(x, y, 0, x, y, 18 * k); gg.addColorStop(0, o[1]); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(x - 18 * k, y - 18 * k, 36 * k, 36 * k);
          c.beginPath(); c.arc(x, y, 6 * k, 0, TAU); c.fillStyle = o[1]; c.fill();
          c.fillStyle = 'rgba(237,242,250,.9)'; c.font = '700 ' + (12 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.textAlign = 'center'; c.fillText(o[2], x, y - 12 * k);
        });
        var dist = Math.hypot(p.m[0] - p.e[0], p.m[1] - p.e[1], p.m[2] - p.e[2]), ph = phase(ms);
        st.set('d', AN.fa(dist * AU / 1e6, 1) + ' میلیون کیلومتر'); st.set('l', AN.fa(dist * AU / C / 60, 1) + ' دقیقه');
        st.set('ph', AN.fa(ph, 0) + ' درجه', Math.abs(ph - PHI0) < 4 ? 'good' : '');
        c.fillStyle = 'rgba(237,242,250,.7)'; c.font = '600 ' + (11 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.textAlign = 'right'; c.fillText(faDate(ms), w - 12 * k, 20 * k);
      }
      var wCache = { ms: -1, txt: '' };
      function windowStat() { var ms = now + off * DAY; if (Math.abs(ms - wCache.ms) < 15 * DAY && wCache.txt) return; var wv = nextWindow(ms), cl = nextClosest(ms); wCache = { ms: ms, txt: wv ? faDate(wv) : '—' }; st.set('w', wCache.txt); P1.setAttribute('data-closest', faDate(cl.ms)); }
      S.onResize(draw);
      ui.loop(P1, function (dt) {
        if (flight && !flight.done) { off += dt * 60; dateR.set(Math.round(off), true); }
        else if (play) { off += dt * 40; if (off > 1600) off = -800; dateR.set(Math.round(off), true); }
        if (play || (flight && !flight.done)) draw();
        windowStat();
      });
      draw(); windowStat();
      /* ---- tab 2: life on Mars (NASA Mars Fact Sheet values) ---- */
      var B2 = ui.body(P2), C2 = ui.row(B2), G = 3.71 / 9.80, mass = 60, jump = 40, age = 17;
      var out = ui.stats(B2, [['wt', 'حس وزن تو روی مریخ'], ['jp', 'ارتفاع پرش تو روی مریخ'], ['ag', 'سن تو به سال مریخی'], ['mtc', 'ساعت هماهنگ مریخ (MTC) همین حالا']]);
      ui.range(C2, { label: 'جرم بدن تو (کیلوگرم)', min: 25, max: 130, value: mass, on: function (v) { mass = v; calc(); } });
      ui.range(C2, { label: 'ارتفاع پرش تو روی زمین (سانتی‌متر)', min: 10, max: 90, value: jump, on: function (v) { jump = v; calc(); } });
      ui.range(C2, { label: 'سن تو (سال زمینی)', min: 8, max: 90, value: age, on: function (v) { age = v; calc(); } });
      var facts = el('div', 'an-facts');
      facts.innerHTML = [['گرانش سطح', '۳٫۷۱ متر بر مجذور ثانیه؛ ۳۸٪ زمین'], ['یک شبانه‌روز (سُل)', '۲۴ ساعت و ۳۹ دقیقه و ۳۵ ثانیه'], ['یک سال', '۶۸۷ روز زمینی (۶۶۹ سُل)'], ['دمای میانگین', 'حدود منفی ۶۳ درجه‌ی سلسیوس'], ['فشار هوا', 'حدود ۰٫۶٪ فشار هوای زمین'], ['نور خورشید', 'حدود ۴۳٪ نوری که به زمین می‌رسد']].map(function (f) { return '<div><small>' + f[0] + '</small><b>' + f[1] + '</b></div>'; }).join('');
      B2.insertBefore(facts, B2.firstChild);
      ui.note(B2, 'عددها از برگه‌ی اطلاعات مریخ ناسا (NSSDCA) آمده‌اند. «حس وزن» یعنی ترازو روی مریخ چه عددی نشان می‌دهد اگر برای زمین تنظیم شده باشد؛ جرم تو تغییر نمی‌کند. فرض پرش: همان سرعت جدا شدن از زمین.');
      function calc() {
        out.set('wt', 'مثل ' + AN.fa(mass * G, 1) + ' کیلوگرم روی زمین', 'good');
        out.set('jp', AN.fa(jump / G, 0) + ' سانتی‌متر');
        out.set('ag', AN.fa(age * 365.25 / 686.98, 1) + ' سال مریخی');
      }
      calc();
      ui.loop(P2, function () { if (P2.hidden) return; var h = (AN.msd(Date.now()) * 24) % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = Math.floor(((h - hh) * 60 - mm) * 60); out.set('mtc', AN.faDigits((hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss)); });
    }
  };
})();
