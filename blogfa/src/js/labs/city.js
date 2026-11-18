/* Lab · Smart city: one intersection, two signal controllers. Fixed-time plans vs. sensor-driven (actuated) control. */
(function () {
  'use strict';
  var W = window, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, TAU = Math.PI * 2;
  var VF = 12.5, ACC = 2.6, GAP = 7.2, SPAWN = 150, YEL = 3, ALLRED = 1.5, REACT = 0.9;
  function rng(a) { a = a >>> 0 || 1; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // approaches: 0 north→south, 1 south→north, 2 west→east, 3 east→west; phase 0 serves 0/1, phase 1 serves 2/3
  function Sim(o) {
    this.o = o; this.R = rng(o.seed || 7); this.t = 0; this.lanes = [[], [], [], []]; this.next = [0, 0, 0, 0]; this.pend = [[], [], [], []];
    this.phase = 0; this.state = 'g'; this.tState = 0; this.done = 0; this.delay = 0; this.cars = 0;
    for (var i = 0; i < 4; i++) this.next[i] = this.gap(i);
  }
  Sim.prototype.rate = function (i) { return (i < 2 ? this.o.ns : this.o.ew) / 3600; };
  Sim.prototype.gap = function (i) { return -Math.log(1 - this.R()) / Math.max(1e-6, this.rate(i)); };
  Sim.prototype.green = function (i) { return this.state === 'g' && (i < 2 ? 0 : 1) === this.phase; };
  Sim.prototype.yellow = function (i) { return this.state === 'y' && (i < 2 ? 0 : 1) === this.phase; };
  Sim.prototype.demand = function (ph, near) { var n = 0; for (var i = ph * 2; i < ph * 2 + 2; i++) this.lanes[i].forEach(function (c) { if (c.x > 0 && c.x < near) n++; }); return n; };
  Sim.prototype.ctrl = function (dt) {
    var o = this.o; this.tState += dt;
    if (this.state === 'g') {
      var other = 1 - this.phase, sw = false;
      if (o.mode === 'fixed') sw = this.tState >= o.green;
      else {
        var mine = this.demand(this.phase, 45), theirs = this.demand(other, 120);
        if (this.tState >= 7) { if (theirs > 0 && (mine === 0 || this.tState >= 45)) sw = true; }
      }
      if (sw) { this.state = 'y'; this.tState = 0; }
    } else if (this.state === 'y' && this.tState >= YEL) { this.state = 'r'; this.tState = 0; }
    else if (this.state === 'r' && this.tState >= ALLRED) { this.state = 'g'; this.tState = 0; this.phase = 1 - this.phase; }
  };
  Sim.prototype.step = function (dt) {
    this.t += dt; this.ctrl(dt);
    for (var i = 0; i < 4; i++) {
      var L = this.lanes[i];
      while (this.t >= this.next[i]) { this.pend[i].push(this.next[i]); this.next[i] += this.gap(i); }
      var tail = L[L.length - 1]; if (this.pend[i].length && (!tail || tail.x < SPAWN - GAP)) L.push({ x: SPAWN, v: VF, t0: this.pend[i].shift(), wait: 0, hue: (this.R() * 6) | 0 });
      var go = this.green(i), yel = this.yellow(i);
      for (var j = 0; j < L.length; j++) {
        var c = L[j], lead = L[j - 1], lim = -1e9;
        if (lead) lim = lead.x + GAP;
        if (c.x > 0 && !go && !(yel && c.x < 4)) lim = Math.max(lim, 0);
        if (c.v === 0) { if (c.x - lim > 0.6) { c.wait += dt; if (c.wait < REACT) continue; } else { c.wait = 0; continue; } }
        c.v = Math.min(VF, c.v + ACC * dt);
        var nx = c.x - c.v * dt;
        if (nx <= lim) { nx = lim; c.v = 0; c.wait = 0; }
        if (c.x > 0 && nx <= 0) { this.done++; this.delay += Math.max(0, (this.t - c.t0) - SPAWN / VF); }
        c.x = nx;
      }
      while (L.length && L[0].x < -60) L.shift();
    }
  };
  Sim.prototype.queue = function () { var n = 0; this.lanes.forEach(function (L) { L.forEach(function (c) { if (c.v === 0 && c.x >= 0) n++; }); }); return n; };

  AN.labs = AN.labs || {};
  AN.labs.city = {
    title: 'چراغ راهنمای ثابت یا هوشمند؟',
    sub: 'یک چهارراه زنده با خودروهایی که تصادفی از راه می‌رسند. حجم ترافیک را تغییر بده و دو روش کنترل چراغ را مقایسه کن.',
    mount: function (root) {
      var S = ui.stage(root, { label: 'شبیه‌سازی زنده‌ی چهارراه' });
      var B = ui.body(root), C = ui.row(B), o = { mode: 'fixed', ns: 600, ew: 250, green: 30, seed: 11 }, speed = 3, sim = new Sim(o);
      function restart() { sim = new Sim(o); }
      ui.seg(C, 'روش کنترل چراغ', [['fixed', 'زمان‌بندی ثابت'], ['smart', 'هوشمند با حسگر']], o.mode, function (v) { o.mode = v; restart(); });
      ui.range(C, { label: 'ترافیک شمال–جنوب (خودرو در ساعت)', min: 100, max: 900, step: 50, value: o.ns, on: function (v) { o.ns = v; } });
      ui.range(C, { label: 'ترافیک شرق–غرب (خودرو در ساعت)', min: 100, max: 900, step: 50, value: o.ew, on: function (v) { o.ew = v; } });
      ui.range(C, { label: 'سبز ثابت برای هر جهت (ثانیه)', min: 10, max: 60, value: o.green, on: function (v) { o.green = v; } });
      ui.range(C, { label: 'سرعت شبیه‌سازی', min: 1, max: 8, value: speed, fmt: function (v) { return '×' + AN.fa(v); }, on: function (v) { speed = v; } });
      var st = ui.stats(B, [['d', 'میانگین تأخیر هر خودرو'], ['q', 'خودروهای ایستاده در صف'], ['n', 'خودروهای عبورکرده'], ['clk', 'زمان شبیه‌سازی']]);
      var cmpBox = AN.el('div', 'an-bars'); ui.btns(B, [['مقایسه‌ی یک ساعت کامل با همین ترافیک', compare, true], ['از نو', restart]]); B.appendChild(cmpBox);
      ui.note(B, 'روش هوشمند همان منطق «کنترل تحریک‌شونده» است: حسگرهای زیر آسفالت یا دوربین‌ها می‌بینند خودرویی منتظر است یا نه و سبز را کوتاه یا بلند می‌کنند (کمینه ۷ و بیشینه ۴۵ ثانیه). خودروها با مدل ساده‌ی تعقیب خودرو حرکت می‌کنند؛ عددها برای مقایسه‌ی دو روش‌اند، نه پیش‌بینی یک خیابان واقعی.');
      function compare() {
        var res = ['fixed', 'smart'].map(function (m) { var s = new Sim({ mode: m, ns: o.ns, ew: o.ew, green: o.green, seed: 99 }); for (var i = 0; i < 14400; i++) s.step(0.25); return s.done ? s.delay / s.done : 0; });
        var mx = Math.max(res[0], res[1], 1);
        cmpBox.innerHTML = [['زمان‌بندی ثابت', res[0], 'var(--warn)'], ['هوشمند با حسگر', res[1], 'var(--ok)']].map(function (r) { return '<div class="an-bar-row"><span>' + r[0] + '</span><span class="an-meter"><i style="--w:' + (r[1] / mx * 100).toFixed(1) + '%;--mc:' + r[2] + '"></i></span><b>' + AN.fa(r[1], 1) + ' ثانیه</b></div>'; }).join('') +
          '<p class="an-lab-note">در یک ساعت شبیه‌سازی‌شده با ترافیک یکسان، میانگین تأخیر هر خودرو در روش هوشمند ' + (res[1] < res[0] ? AN.fa((1 - res[1] / res[0]) * 100) + '٪ کمتر بود.' : 'کمتر نبود؛ وقتی هر دو جهت شلوغ‌اند، دو روش به هم نزدیک می‌شوند.') + '</p>';
      }
      var fr = 0, COL = ['#FFB36B', '#8FB6FF', '#E89BFF', '#7FE3A0', '#F2F5FA', '#FF8A6B'];
      function draw() {
        var c = S.ctx, w = S.w, h = S.h, k = S.k; if (!w) return;
        var cx = w / 2, cy = h / 2, ppm = (h / 2) / 62, half = 7 * ppm, lane = 1.75 * ppm;
        c.fillStyle = '#070B16'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#0B1220'; for (var b = 0; b < 4; b++) { var sx = b % 2 ? 1 : -1, sy = b < 2 ? -1 : 1; c.fillRect(sx > 0 ? cx + half + 6 * ppm : 0, sy > 0 ? cy + half + 6 * ppm : 0, sx > 0 ? w : cx - half - 6 * ppm, sy > 0 ? h : cy - half - 6 * ppm); }
        c.fillStyle = '#141C2E'; c.fillRect(cx - half, 0, half * 2, h); c.fillRect(0, cy - half, w, half * 2);
        c.strokeStyle = 'rgba(255,214,107,.55)'; c.lineWidth = 1.2 * k; c.setLineDash([3 * ppm, 3 * ppm]);
        c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, cy - half); c.moveTo(cx, cy + half); c.lineTo(cx, h); c.moveTo(0, cy); c.lineTo(cx - half, cy); c.moveTo(cx + half, cy); c.lineTo(w, cy); c.stroke(); c.setLineDash([]);
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2.5 * k; c.beginPath();
        c.moveTo(cx - half, cy - half); c.lineTo(cx, cy - half); c.moveTo(cx, cy + half); c.lineTo(cx + half, cy + half); c.moveTo(cx - half, cy); c.lineTo(cx - half, cy + half); c.moveTo(cx + half, cy - half); c.lineTo(cx + half, cy); c.stroke();
        // lanes: [x,y of stop line, direction unit vector]
        var A = [[cx - lane, cy - half, 0, 1], [cx + lane, cy + half, 0, -1], [cx - half, cy + lane, 1, 0], [cx + half, cy - lane, -1, 0]];
        for (var i = 0; i < 4; i++) {
          var a = A[i];
          sim.lanes[i].forEach(function (car) {
            var d = car.x * ppm, x = a[0] - a[2] * d, y = a[1] - a[3] * d, L = 4.4 * ppm, Wd = 1.9 * ppm;
            c.save(); c.translate(x, y); c.rotate(Math.atan2(a[3], a[2]));
            c.fillStyle = 'rgba(255,240,200,.18)'; c.beginPath(); c.moveTo(0, -Wd / 2); c.lineTo(L * 1.6, -Wd * 1.2); c.lineTo(L * 1.6, Wd * 1.2); c.lineTo(0, Wd / 2); c.fill();
            c.fillStyle = COL[car.hue]; c.beginPath(); c.moveTo(-L, -Wd / 2); c.lineTo(-L * 0.12, -Wd / 2); c.quadraticCurveTo(0, -Wd / 2, 0, 0); c.quadraticCurveTo(0, Wd / 2, -L * 0.12, Wd / 2); c.lineTo(-L, Wd / 2); c.closePath(); c.fill();
            c.fillStyle = 'rgba(10,14,25,.65)'; c.fillRect(-L * 0.62, -Wd * 0.36, L * 0.38, Wd * 0.72);
            if (car.v === 0) { c.fillStyle = '#FF4D4D'; c.fillRect(-L - ppm * 0.15, -Wd / 2, ppm * 0.3, Wd * 0.3); c.fillRect(-L - ppm * 0.15, Wd * 0.2, ppm * 0.3, Wd * 0.3); }
            c.restore();
          });
          var g = sim.green(i), yl = sim.yellow(i), lx = a[0] - a[2] * 1.6 * ppm - a[3] * 3.2 * ppm, ly = a[1] - a[3] * 1.6 * ppm + a[2] * 3.2 * ppm;
          c.fillStyle = '#05070D'; c.beginPath(); c.arc(lx, ly, ppm * 1.25, 0, TAU); c.fill();
          var col = g ? '#5FD49A' : yl ? '#FFC861' : '#FF5A5A'; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 12 * k; c.beginPath(); c.arc(lx, ly, ppm * 0.8, 0, TAU); c.fill(); c.shadowBlur = 0;
        }
        c.fillStyle = 'rgba(237,242,250,.85)'; c.font = '700 ' + (12 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.textAlign = 'right';
        c.fillText(o.mode === 'fixed' ? 'زمان‌بندی ثابت' : 'هوشمند: سبز به‌اندازه‌ی نیاز', w - 12 * k, 22 * k);
      }
      ui.loop(root, function (dt) {
        var n = Math.round(speed * 4); for (var i = 0; i < n; i++) sim.step(dt * speed / n);
        draw();
        if (++fr % 10 === 0) { var avg = sim.done ? sim.delay / sim.done : 0; st.set('d', AN.fa(avg, 1) + ' ثانیه', avg < 15 ? 'good' : avg < 35 ? 'warn' : 'bad'); st.set('q', AN.fa(sim.queue())); st.set('n', AN.fa(sim.done)); var m = Math.floor(sim.t / 60), s = Math.floor(sim.t % 60); st.set('clk', AN.faDigits(m + ':' + (s < 10 ? '0' : '') + s)); }
      });
    }
  };
})();
