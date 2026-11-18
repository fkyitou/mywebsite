/* Lab · AI: train a real two-hidden-layer neural network in the browser and watch its decision boundary form. */
(function () {
  'use strict';
  var W = window, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, PI = Math.PI, TAU = PI * 2, XR = 1.6, YR = 0.9;
  function rng(a) { a = a >>> 0 || 1; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function gen(kind, N, noise, R) {
    var pts = [], i, x, y, c;
    function gauss() { return Math.sqrt(-2 * Math.log(R() + 1e-9)) * Math.cos(TAU * R()); }
    for (i = 0; i < N; i++) {
      c = i % 2;
      if (kind === 'circle') { var r = c ? R() * 0.45 : 0.62 + R() * 0.24, a = R() * TAU; x = r * Math.cos(a) * 1.25; y = r * Math.sin(a); }
      else if (kind === 'xor') { x = (0.1 + R() * 1.35) * (R() < 0.5 ? -1 : 1); y = (0.08 + R() * 0.72) * (R() < 0.5 ? -1 : 1); c = (x > 0) === (y > 0) ? 1 : 0; }
      else if (kind === 'moons') { var t = R() * PI; if (c) { x = Math.cos(t) - 0.5; y = Math.sin(t) - 0.25; } else { x = 0.5 - Math.cos(t); y = 0.25 - Math.sin(t); } x *= 0.95; y *= 0.95; }
      else { var s = 0.1 + (i >> 1) / (N / 2) * 0.9, an = s * 3.1 * PI + c * PI; x = s * Math.cos(an) * 1.45; y = s * Math.sin(an) * 0.86; }
      x += gauss() * noise; y += gauss() * noise;
      pts.push({ x: Math.max(-XR, Math.min(XR, x)), y: Math.max(-YR, Math.min(YR, y)), c: c });
    }
    return pts;
  }

  function Net(H, R) {
    var L = [], n = 0;
    [[2, H], [H, H], [H, 1]].forEach(function (l) { L.push({ w: n, b: n + l[0] * l[1], i: l[0], o: l[1] }); n += l[0] * l[1] + l[1]; });
    var p = new Float64Array(n);
    L.forEach(function (o) { var lim = Math.sqrt(6 / (o.i + o.o)); for (var k = 0; k < o.i * o.o; k++) p[o.w + k] = (R() * 2 - 1) * lim; });
    this.L = L; this.p = p; this.n = n; this.H = H; this.t = 0;
    this.m = new Float64Array(n); this.v = new Float64Array(n); this.g = new Float64Array(n);
    this.acts = [new Float64Array(2), new Float64Array(H), new Float64Array(H), new Float64Array(1)];
    this.dl = [new Float64Array(2), new Float64Array(H), new Float64Array(H), new Float64Array(1)];
  }
  Net.prototype.fwd = function (x, y) {
    var A = this.acts, p = this.p, L = this.L; A[0][0] = x; A[0][1] = y;
    for (var l = 0; l < 3; l++) {
      var o = L[l], ai = A[l], ao = A[l + 1];
      for (var j = 0; j < o.o; j++) { var s = p[o.b + j], base = o.w + j * o.i; for (var i = 0; i < o.i; i++) s += p[base + i] * ai[i]; ao[j] = l === 2 ? 1 / (1 + Math.exp(-s)) : Math.tanh(s); }
    }
    return A[3][0];
  };
  Net.prototype.step = function (data, lr) {
    var g = this.g, p = this.p, L = this.L, A = this.acts, Dl = this.dl, N = data.length, loss = 0, ok = 0, d, l, i, j;
    g.fill(0);
    for (d = 0; d < N; d++) {
      var pt = data[d], out = this.fwd(pt.x, pt.y), t = pt.c;
      loss -= t * Math.log(out + 1e-9) + (1 - t) * Math.log(1 - out + 1e-9);
      if ((out > 0.5) === (t === 1)) ok++;
      Dl[3][0] = out - t;
      for (l = 2; l >= 0; l--) {
        var o = L[l], ai = A[l], dout = Dl[l + 1], din = Dl[l];
        for (i = 0; i < o.i; i++) din[i] = 0;
        for (j = 0; j < o.o; j++) { var dj = dout[j], base = o.w + j * o.i; g[o.b + j] += dj; for (i = 0; i < o.i; i++) { g[base + i] += dj * ai[i]; din[i] += dj * p[base + i]; } }
        if (l > 0) for (i = 0; i < o.i; i++) din[i] *= 1 - ai[i] * ai[i];
      }
    }
    this.t++;
    var b1 = 0.9, b2 = 0.999, c1 = 1 - Math.pow(b1, this.t), c2 = 1 - Math.pow(b2, this.t);
    for (var k = 0; k < this.n; k++) { var gk = g[k] / N; this.m[k] = b1 * this.m[k] + (1 - b1) * gk; this.v[k] = b2 * this.v[k] + (1 - b2) * gk * gk; p[k] -= lr * (this.m[k] / c1) / (Math.sqrt(this.v[k] / c2) + 1e-8); }
    return { loss: loss / N, acc: ok / N };
  };

  // marching squares: which cell edges the 0.5 contour crosses (T=0, R=1, B=2, L=3)
  var MS = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]], [[3, 0]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];

  AN.labs = AN.labs || {};
  AN.labs.ai = {
    title: 'یک شبکه‌ی عصبی واقعی را خودت آموزش بده',
    sub: 'شبکه‌ای با دو لایه‌ی پنهان همین حالا در مرورگرت آموزش می‌بیند. تماشا کن چطور از روی نمونه‌ها مرز تصمیم را یاد می‌گیرد.',
    mount: function (root) {
      var S = ui.stage(root, { hint: 'برای افزودن نقطه روی صفحه بزن', label: 'نمایش زنده‌ی مرز تصمیم شبکه‌ی عصبی' });
      var B = ui.body(root), C = ui.row(B), R = rng(20261103), kind = 'circle', noise = 0.08, H = 8, lr = 0.03, newC = 1;
      var data, net, run = false, epoch = 0, last = { loss: NaN, acc: NaN }, dirty = true, grid = null, gw = 96, gh = 54;
      var off = document.createElement('canvas'); off.width = gw; off.height = gh; var octx = off.getContext('2d'), img = octx.createImageData(gw, gh);
      function reset(keepData) { if (!keepData) data = gen(kind, 220, noise, R); net = new Net(H, R); epoch = 0; last = { loss: NaN, acc: NaN }; dirty = true; stats(); }
      ui.seg(C, 'داده‌ها', [['circle', 'دایره'], ['xor', 'XOR'], ['moons', 'دو هلال'], ['spiral', 'مارپیچ (چالش)']], kind, function (v) { kind = v; reset(); });
      ui.range(C, { label: 'نورون در هر لایه‌ی پنهان', min: 2, max: 16, value: H, on: function (v) { H = v; reset(true); } });
      ui.range(C, { label: 'نرخ یادگیری', min: 3, max: 100, value: 30, fmt: function (v) { return AN.fa(v / 1000, 3); }, on: function (v) { lr = v / 1000; } });
      ui.range(C, { label: 'نویز داده‌ها', min: 0, max: 30, value: 8, fmt: function (v) { return AN.fa(v / 100, 2); }, on: function (v) { noise = v / 100; reset(); } });
      var seg2 = ui.seg(C, 'رنگ نقطه‌ی تازه', [[1, 'نارنجی'], [0, 'آبی']], newC, function (v) { newC = v; });
      var bt = ui.btns(B, [['▶ شروع آموزش', toggle, true], ['یک دوره', function () { if (!run) { tick(1); draw(); } }], ['شبکه‌ی تازه', function () { reset(true); }], ['داده‌ی تازه', function () { reset(); }]]);
      var st = ui.stats(B, [['ep', 'دوره‌های آموزش'], ['loss', 'خطا (آنتروپی متقاطع)'], ['acc', 'دقت روی نمونه‌ها'], ['par', 'تعداد پارامترها']]);
      ui.note(B, 'این شبکه فقط چند صد «وزن» دارد و با الگوریتم پس‌انتشار خطا و بهینه‌ساز Adam آموزش می‌بیند؛ همان ایده‌ای که در مدل‌های بزرگ هم به کار می‌رود. برای مقایسه، مدل زبانی GPT-3 در سال ۲۰۲۰ حدود ۱۷۵ میلیارد پارامتر داشت. همه‌چیز در مرورگر خودت اجرا می‌شود و هیچ داده‌ای جایی فرستاده نمی‌شود.');
      function toggle() { run = !run; bt[0].textContent = run ? '❚❚ توقف' : '▶ ادامه‌ی آموزش'; bt[0].setAttribute('aria-pressed', String(run)); }
      function stats() {
        st.set('ep', AN.fa(epoch)); st.set('loss', isNaN(last.loss) ? '—' : AN.fa(last.loss, 3));
        st.set('acc', isNaN(last.acc) ? '—' : AN.fa(last.acc * 100, 1) + '٪', last.acc > 0.95 ? 'good' : last.acc > 0.8 ? 'warn' : '');
        st.set('par', AN.fa(net ? net.n : 0));
      }
      function tick(n) { for (var i = 0; i < n; i++) { last = net.step(data, lr); epoch++; } dirty = true; }
      function px(x) { return (x + XR) / (2 * XR) * S.w; } function py(y) { return (1 - (y + YR) / (2 * YR)) * S.h; }
      function draw() {
        if (!S.w) return; var c = S.ctx, i, j, k = S.k;
        if (!grid || grid.length !== gw * gh) grid = new Float32Array(gw * gh);
        var d = img.data;
        for (j = 0; j < gh; j++) for (i = 0; i < gw; i++) {
          var x = -XR + (i + 0.5) / gw * 2 * XR, y = YR - (j + 0.5) / gh * 2 * YR, p = net.fwd(x, y), q = (j * gw + i) * 4, conf = Math.abs(p - 0.5) * 2;
          grid[j * gw + i] = p;
          d[q] = 58 + (255 - 58) * p; d[q + 1] = 111 + (160 - 111) * p; d[q + 2] = 216 + (76 - 216) * p; d[q + 3] = 40 + conf * 120;
        }
        octx.putImageData(img, 0, 0);
        c.fillStyle = '#060A15'; c.fillRect(0, 0, S.w, S.h);
        c.imageSmoothingEnabled = true; c.drawImage(off, 0, 0, S.w, S.h);
        c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = k;
        for (i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(px(i * 0.5), 0); c.lineTo(px(i * 0.5), S.h); c.stroke(); }
        for (i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(0, py(i * 0.5)); c.lineTo(S.w, py(i * 0.5)); c.stroke(); }
        // decision boundary (p = 0.5) by marching squares
        var sx = S.w / gw, sy = S.h / gh; c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 2.2 * k; c.beginPath();
        for (j = 0; j < gh - 1; j++) for (i = 0; i < gw - 1; i++) {
          var v0 = grid[j * gw + i], v1 = grid[j * gw + i + 1], v2 = grid[(j + 1) * gw + i + 1], v3 = grid[(j + 1) * gw + i];
          var idx = (v0 > 0.5 ? 8 : 0) | (v1 > 0.5 ? 4 : 0) | (v2 > 0.5 ? 2 : 0) | (v3 > 0.5 ? 1 : 0), segs = MS[idx];
          for (var s = 0; s < segs.length; s++) for (var e = 0; e < 2; e++) {
            var ed = segs[s][e], ex, ey;
            if (ed === 0) { ex = i + (0.5 - v0) / (v1 - v0); ey = j; } else if (ed === 1) { ex = i + 1; ey = j + (0.5 - v1) / (v2 - v1); }
            else if (ed === 2) { ex = i + (0.5 - v3) / (v2 - v3); ey = j + 1; } else { ex = i; ey = j + (0.5 - v0) / (v3 - v0); }
            ex = (ex + 0.5) * sx; ey = (ey + 0.5) * sy; e ? c.lineTo(ex, ey) : c.moveTo(ex, ey);
          }
        }
        c.stroke();
        var r = Math.max(3.2 * k, S.w / 190);
        data.forEach(function (p) {
          var X = px(p.x), Y = py(p.y), pr = net.fwd(p.x, p.y), wrong = (pr > 0.5) !== (p.c === 1);
          c.beginPath(); c.arc(X, Y, r, 0, TAU); c.fillStyle = p.c ? '#FFA45C' : '#5B9BFF'; c.fill(); c.lineWidth = 1.3 * k; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke();
          if (wrong && epoch > 0) { c.beginPath(); c.arc(X, Y, r * 2, 0, TAU); c.strokeStyle = 'rgba(255,90,90,.9)'; c.lineWidth = 1.5 * k; c.stroke(); }
        });
        dirty = false;
      }
      S.onResize(function () { dirty = true; });
      S.cv.addEventListener('pointerdown', function (e) {
        var q = S.pos(e), x = q.x / S.w * 2 * XR - XR, y = YR - q.y / S.h * 2 * YR;
        data.push({ x: x, y: y, c: newC }); dirty = true; if (!run) draw();
      });
      var fr = 0;
      ui.loop(root, function () { if (run) tick(4); if (dirty) draw(); if (++fr % 8 === 0) stats(); });
      reset(); seg2.set(newC);
    }
  };
})();
