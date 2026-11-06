/* Lab · Future architecture: a parametric tower. Twist, taper and plan shape change the form, the floor area and the facade. */
(function () {
  'use strict';
  var W = window, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, PI = Math.PI, TAU = PI * 2, FH = 4, R0 = 24;
  var PLANS = {
    sq: { n: 'مربع', k: 4, r: function () { return 1; } },
    hex: { n: 'شش‌ضلعی', k: 6, r: function () { return 1; } },
    tri: { n: 'مثلث گرد', k: 36, r: function (a) { return 0.9 + 0.1 * Math.cos(3 * a); } },
    cir: { n: 'دایره', k: 32, r: function () { return 1; } }
  };
  function ring(plan, scale, rot) { var P = PLANS[plan], pts = []; for (var j = 0; j < P.k; j++) { var a = rot + j / P.k * TAU + (P.k === 4 ? PI / 4 : 0), r = R0 * scale * P.r(a - rot); pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return pts; }
  function area(p) { var s = 0; for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function perim(p) { var s = 0; for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; }

  AN.labs = AN.labs || {};
  AN.labs.arch = {
    title: 'برج پارامتریک خودت را طراحی کن',
    sub: 'معماری پارامتریک یعنی فرم را با چند عدد و قاعده بسازی، نه با کشیدن تک‌تک خط‌ها. پارامترها را تغییر بده؛ برج را بکش تا بچرخد.',
    mount: function (root) {
      var S = ui.stage(root, { tall: true, ratio: '4 / 3', hint: 'برای چرخاندن، بکش', label: 'مدل سه‌بعدی برج پارامتریک' });
      var B = ui.body(root), C = ui.row(B), o = { plan: 'sq', floors: 60, twist: 90, taper: 15 }, yaw = 0.5, drag = null, spin = AN.rm ? 0 : 0.18, vel = spin;
      var sp = ui.seg(C, 'شکل پلان', Object.keys(PLANS).map(function (k) { return [k, PLANS[k].n]; }), o.plan, function (v) { o.plan = v; upd(); });
      var rf = ui.range(C, { label: 'تعداد طبقه', min: 10, max: 130, value: o.floors, on: function (v) { o.floors = v; upd(); } });
      var rt = ui.range(C, { label: 'چرخش کل از پایه تا بام', min: 0, max: 180, step: 5, value: o.twist, fmt: function (v) { return AN.fa(v) + '°'; }, on: function (v) { o.twist = v; upd(); } });
      var rp = ui.range(C, { label: 'باریک شدن به سمت بالا', min: 0, max: 60, value: o.taper, fmt: function (v) { return AN.fa(v) + '٪'; }, on: function (v) { o.taper = v; upd(); } });
      function preset(p, f, t, tp) { o.plan = p; o.floors = f; o.twist = t; o.taper = tp; sp.set(p); rf.set(f, true); rt.set(t, true); rp.set(tp, true); upd(); }
      ui.btns(B, [['برج ساده‌ی جعبه‌ای', function () { preset('sq', 40, 0, 0); }], ['الهام از برج کایان (۷۵ طبقه، ۹۰°)', function () { preset('sq', 75, 90, 0); }, true], ['الهام از برج شانگهای (۱۲۰°)', function () { preset('tri', 128, 120, 45); }]]);
      var st = ui.stats(B, [['h', 'ارتفاع تقریبی'], ['pf', 'چرخش هر طبقه'], ['a', 'مساحت کل طبقات'], ['sv', 'نسبت سطح نما به حجم']]);
      ui.note(B, 'برج کایان در دبی (۳۰۷ متر، ۷۵ طبقه) از پایه تا بام ۹۰ درجه می‌چرخد و نمای برج شانگهای (۶۳۲ متر) ۱۲۰ درجه. به گزارش مهندسان سازه‌ی برج شانگهای، اصلاح فرم برج بار باد را ۲۴٪ کم کرد و سازه را سبک‌تر کرد. نسبت سطح به حجم کمتر یعنی پوسته‌ی کمتر برای هر متر مکعب فضا و معمولاً تبادل گرمایی کمتر. ارتفاع هر طبقه ۴ متر فرض شده است.');
      var model = null;
      function upd() {
        var fl = [], A = 0, F = 0, V = 0;
        for (var i = 0; i <= o.floors; i++) { var t = i / o.floors, sc = 1 - o.taper / 100 * t, p = ring(o.plan, sc, o.twist * PI / 180 * t); fl.push(p); if (i < o.floors) { var ar = area(p); A += ar; V += ar * FH; F += perim(p) * FH; } }
        model = fl;
        st.set('h', AN.fa(o.floors * FH) + ' متر'); st.set('pf', AN.fa(o.twist / o.floors, 2) + '°');
        st.set('a', AN.fa(Math.round(A / 100) * 100) + ' متر مربع'); st.set('sv', AN.fa(F / V, 3) + ' بر متر');
      }
      function draw(dt) {
        if (!drag) { yaw += vel * dt; vel += (spin - vel) * Math.min(1, dt * 0.8); }
        var c = S.ctx, w = S.w, h = S.h, k = S.k; if (!w || !model) return;
        var pitch = 0.36, cp = Math.cos(pitch), spn = Math.sin(pitch), H = o.floors * FH, s = Math.min(w * 0.36 / R0, (h * 0.8) / (H * cp + 2 * R0 * spn)), cx = w / 2, by = h * 0.9 - R0 * s * spn;
        var cy = Math.cos(yaw), sy = Math.sin(yaw);
        function P(x, z, y) { var xr = x * cy - z * sy, zr = x * sy + z * cy; return [cx + xr * s, by - y * s * cp + zr * s * spn, zr]; }
        var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0A1430'); g.addColorStop(0.75, '#1A2340'); g.addColorStop(1, '#2A1E2E'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(143,182,255,.12)'; c.lineWidth = k;
        for (var gi = -6; gi <= 6; gi++) { var a1 = P(gi * 12, -72, 0), a2 = P(gi * 12, 72, 0), b1 = P(-72, gi * 12, 0), b2 = P(72, gi * 12, 0); c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(a2[0], a2[1]); c.moveTo(b1[0], b1[1]); c.lineTo(b2[0], b2[1]); c.stroke(); }
        var sh = c.createRadialGradient(cx + 40 * s, by + 10 * s * spn, 0, cx + 40 * s, by + 10 * s * spn, R0 * s * 2.2); sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sh; c.fillRect(0, 0, w, h);
        var Lx = 0.55, Lz = 0.62, step = o.floors > 90 ? 2 : 1, n = model[0].length;
        for (var i = 0; i < o.floors; i += step) {
          var A0 = model[i], A1 = model[Math.min(o.floors, i + step)], y0 = i * FH, y1 = Math.min(o.floors, i + step) * FH, t = i / o.floors;
          for (var j = 0; j < n; j++) {
            var p0 = A0[j], p1 = A0[(j + 1) % n], q0 = A1[j], q1 = A1[(j + 1) % n];
            var nx = p1[1] - p0[1], nz = -(p1[0] - p0[0]), nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
            if (nx * sy + nz * cy <= 0) continue;
            var lit = 0.28 + 0.72 * Math.max(0, nx * Lx + nz * Lz), a = P(p0[0], p0[1], y0), b = P(p1[0], p1[1], y0), cc = P(q1[0], q1[1], y1), d = P(q0[0], q0[1], y1);
            c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.closePath();
            var r = Math.round(18 + 70 * lit + 30 * t), gg = Math.round(40 + 90 * lit + 20 * t), bb = Math.round(80 + 130 * lit);
            c.fillStyle = 'rgb(' + r + ',' + gg + ',' + bb + ')'; c.fill();
            c.strokeStyle = 'rgba(255,214,160,' + (0.1 + lit * 0.25).toFixed(2) + ')'; c.lineWidth = 0.8 * k; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
            if (PLANS[o.plan].k <= 6) { c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.stroke(); }
          }
        }
        var top = model[o.floors]; c.beginPath(); top.forEach(function (p, j) { var q = P(p[0], p[1], H); j ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.fillStyle = '#3B4F86'; c.fill(); c.strokeStyle = 'rgba(255,214,160,.7)'; c.lineWidth = 1.2 * k; c.stroke();
        var tip = P(0, 0, H), tip2 = P(0, 0, H + 14); c.strokeStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(tip2[0], tip2[1]); c.stroke();
        c.fillStyle = '#FF5A5A'; c.beginPath(); c.arc(tip2[0], tip2[1], 2.5 * k, 0, TAU); c.fill();
      }
      S.cv.addEventListener('pointerdown', function (e) { drag = { x: S.pos(e).x, y: yaw }; vel = 0; S.cv.setPointerCapture && S.cv.setPointerCapture(e.pointerId); });
      S.cv.addEventListener('pointermove', function (e) { if (!drag) return; var x = S.pos(e).x, ny = drag.y - (x - drag.x) / S.w * 4; vel = (ny - yaw) * 30; yaw = ny; });
      W.addEventListener('pointerup', function () { if (drag) { drag = null; vel = Math.max(-3, Math.min(3, vel)); } });
      upd(); ui.loop(root, function (dt) { draw(dt); });
    }
  };
})();
