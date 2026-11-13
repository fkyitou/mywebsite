/* Lab · AI video generators: pick a model, a resolution and a length, and see how many clips it takes, how many seconds have to be made, how many frames come out and what it costs.
   Every price and clip rule was read on the official pages on 2026-11-12 (sources 1 to 7 of the article). Nothing is generated here: the picture is drawn by hand. */
(function () {
  'use strict';
  var W = window, D = document, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, PI = Math.PI, STEPS = 8;
  // label and the standard landscape frame of each resolution
  var RES = [['720p', 1280, 720], ['1080p', 1920, 1080], ['4K', 3840, 2160]];
  /* c: US cents per second of output at [720p, 1080p, 4K]; null where the model has no such output or the official page gives no figure.
     Veo: API price per second, with audio. Omni: 12 USD per million output tokens (0.0012 cent each) × tokens per second.
     Gen-4.5 and Ray3.2: plan price ÷ plan credits × credits spent, the way the article's chart works them out. */
  var MODELS = [
    { n: 'Veo 3.1 Lite', veo: 1, fps: 24, c: [5, 8, null] },
    { n: 'Veo 3.1 Fast', veo: 1, fps: 24, c: [10, 12, 30] },
    { n: 'Veo 3.1', veo: 1, fps: 24, c: [40, 40, 60] },
    { n: 'Omni 1.2 Flash', fps: 24, max: 15, up: 1, c: [5792 * 0.0012, 8688 * 0.0012, 17376 * 0.0012] },
    { n: 'Runway Gen-4.5', fps: 24, max: 10, cr: 12, plan: [625, 15, 'Standard'], c: [28.8, null, null] },
    { n: 'Luma Ray3.2', fps: 0, fix: 5, crClip: 100, plan: [10000, 30, 'Plus'], c: [6, null, null] }
  ];
  /* How a video of T seconds is put together from clips the model can really make. */
  function plan(m, r, T) {
    var a = [], n, i, sum = 0, base, credits;
    if (m.veo) {
      // 8-second clips; only 720p may also be 4 or 6 seconds, so only there the last clips can shrink to fit
      n = Math.ceil(T / 8); sum = n * 8; for (i = 0; i < n; i++) a.push(8);
      if (r === 0) for (i = n - 1; i >= 0; i--) while (a[i] > 4 && sum - 2 >= T) { a[i] -= 2; sum -= 2; }
    } else if (m.fix) { n = Math.ceil(T / m.fix); sum = n * m.fix; for (i = 0; i < n; i++) a.push(m.fix); }
    else { n = Math.ceil(T / m.max); base = Math.floor(T / n); sum = T; for (i = 0; i < n; i++) a.push(base + (i < T - base * n ? 1 : 0)); }
    credits = m.cr ? sum * m.cr : m.crClip ? n * m.crClip : 0;
    return { a: a, made: sum, extra: sum - T, credits: credits, cost: m.plan ? credits * m.plan[1] * 100 / m.plan[0] : sum * m.c[r] };
  }

  function rnd(s) { return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function col(a, b, t) { return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')'; }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  /* The prompt of the article's first paragraph, drawn by hand: sunrise over a future city, seen from the air.
     p runs 0 → 1 through the video. Every clip has its own seed, as a model starts every clip from fresh noise, so the skyline changes at a cut.
     Each layer has its own generator: towers scroll in at the edge, and a shared one would reshuffle everything behind them. */
  function scene(c, x, y, w, h, p, seed) {
    var Rf = rnd(seed * 3 + 1), Rn = rnd(seed * 3 + 2), Rc = rnd(seed * 3 + 3), hz = y + h * 0.64, g, i, bx, bw, bh, X0, Y0, BW, kind, wy, wx;
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    g = c.createLinearGradient(0, y, 0, hz);
    g.addColorStop(0, col([10, 14, 44], [52, 96, 170], p)); g.addColorStop(0.62, col([72, 36, 96], [236, 150, 110], p)); g.addColorStop(1, col([226, 96, 62], [255, 214, 150], p));
    c.fillStyle = g; c.fillRect(x, y, w, hz - y);
    var sx = x + w * (0.6 - 0.05 * p), sy = hz + h * (0.02 - 0.34 * p), sr = h * 0.075;
    g = c.createRadialGradient(sx, sy, 0, sx, sy, sr * 5); g.addColorStop(0, 'rgba(255,238,180,.9)'); g.addColorStop(0.2, 'rgba(255,190,110,.5)'); g.addColorStop(1, 'rgba(255,150,90,0)');
    c.fillStyle = g; c.fillRect(x, y, w, hz - y);
    c.fillStyle = '#FFF4CC'; c.beginPath(); c.arc(sx, sy, sr, 0, 2 * PI); c.fill();
    // the ground, with avenues running to the vanishing point under the sun
    g = c.createLinearGradient(0, hz, 0, y + h); g.addColorStop(0, col([58, 30, 70], [150, 96, 110], p)); g.addColorStop(1, col([8, 10, 26], [26, 30, 60], p));
    c.fillStyle = g; c.fillRect(x, hz, w, y + h - hz);
    c.strokeStyle = 'rgba(255,196,130,' + (0.34 - 0.14 * p) + ')'; c.lineWidth = Math.max(1, h * 0.006);
    for (i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(sx, hz); c.lineTo(sx + i * w * 0.22 - p * w * 0.08, y + h); c.stroke(); }
    // far skyline on the horizon, then the near towers; the near layer drifts faster, like a camera gliding over the city
    c.fillStyle = col([44, 30, 84], [112, 96, 150], p);
    for (bx = -0.05 - 0.04 * p; bx < 1.05; bx += bw + 0.008) { bw = 0.03 + Rf() * 0.045; bh = 0.05 + Rf() * 0.16; c.fillRect(x + bx * w, hz - bh * h, bw * w, bh * h + 1); }
    for (bx = -0.12 - 0.12 * p; bx < 1.1; bx += bw + 0.03 + Rn() * 0.05) {
      bw = 0.06 + Rn() * 0.06; bh = 0.2 + Rn() * 0.3; kind = Rn(); X0 = x + bx * w; BW = bw * w; Y0 = hz + h * 0.12 - bh * h;
      c.fillStyle = col([16, 16, 44], [40, 44, 86], p); c.beginPath();
      if (kind < 0.35) { c.moveTo(X0, y + h); c.lineTo(X0, Y0 + BW * 0.45); c.lineTo(X0 + BW, Y0); c.lineTo(X0 + BW, y + h); }
      else if (kind < 0.7) { c.rect(X0, Y0, BW, y + h - Y0); c.rect(X0 + BW * 0.46, Y0 - h * 0.09, BW * 0.08, h * 0.09); }
      else { c.rect(X0, Y0, BW, y + h - Y0); c.rect(X0 + BW * 0.22, Y0 - h * 0.05, BW * 0.56, h * 0.05); }
      c.fill();
      // windows: lit before dawn, fading as the sun climbs
      c.fillStyle = 'rgba(255,214,140,' + (0.82 - 0.55 * p) + ')';
      for (wy = Y0 + BW * 0.6; wy < y + h - h * 0.03; wy += h * 0.045) for (wx = 0; wx < 3; wx++) if (Rn() < 0.55) c.fillRect(X0 + BW * (0.16 + wx * 0.27), wy, BW * 0.15, h * 0.018);
    }
    // three flying craft
    for (i = 0; i < 3; i++) {
      var fx = x + w * ((Rc() + p * (0.25 + Rc() * 0.3)) % 1), fy = y + h * (0.12 + Rc() * 0.3), fl = w * 0.05;
      c.strokeStyle = 'rgba(160,235,255,.7)'; c.lineWidth = Math.max(1, h * 0.008); c.beginPath(); c.moveTo(fx - fl, fy + fl * 0.12); c.lineTo(fx, fy); c.stroke();
      c.fillStyle = '#EAFBFF'; c.beginPath(); c.arc(fx, fy, Math.max(1, h * 0.011), 0, 2 * PI); c.fill();
    }
    c.restore();
  }

  AN.labs = AN.labs || {};
  AN.labs.video = {
    title: 'ویدیوی خودت را قیمت بزن',
    sub: 'پرامپت همان جمله‌ی اول مقاله است: طلوع خورشید روی شهری در آینده، از بالا. مدل، وضوح و طول ویدیو را عوض کن و ببین چند کلیپ می‌خواهد، چند ثانیه باید ساخته شود و چقدر تمام می‌شود.',
    // the plan for model number `model` (0 to 5), resolution 0 to 2 and T seconds: the tests walk every length through it
    plan: function (model, res, T) { return plan(MODELS[model], res, T); },
    mount: function (root) {
      var S = ui.stage(root, { ratio: root.getBoundingClientRect().width < 560 ? '15 / 16' : '16 / 9', label: 'نمای ویدیو، اندازه‌ی قاب و خط زمان کلیپ‌ها' });
      var B = ui.body(root), C = ui.row(B), o = { m: 0, r: 0, T: 30 }, P = null, pf = 0.4, playing = false, dn = -1, dnT = 0;
      var nzc = D.createElement('canvas'), fresh = true; nzc.width = 96; nzc.height = 54;
      ui.seg(C, 'مدل', MODELS.map(function (m, i) { return [i, m.n]; }), 0, function (v) { o.m = v; upd(); });
      var sgR = ui.seg(C, 'وضوح تصویر', RES.map(function (x, i) { return [i, x[0]]; }), 0, function (v) { o.r = v; upd(); }), rb = sgR.el.querySelectorAll('button');
      ui.range(C, { label: 'طول ویدیو', min: 4, max: 120, step: 1, value: o.T, fmt: function (v) { return AN.fa(v) + ' ثانیه'; }, on: function (v) { o.T = v; upd(); } });
      var bt = ui.btns(B, [['پخش ویدیو', play, true], ['از نویز تا تصویر', denoise]]);
      var st = ui.stats(B, [['cost', 'هزینه‌ی این ویدیو'], ['per', 'قیمت هر ثانیه'], ['clips', 'تعداد کلیپ'], ['sec', 'ثانیه‌ای که باید ساخته شود'], ['fr', 'فریم‌هایی که مدل می‌سازد'], ['cr', 'اعتبار اشتراک ماهانه']]);
      ui.note(B, 'قیمت‌ها و قاعده‌ها در ۲۱ آبان ۱۴۰۵ (۱۲ نوامبر ۲۰۲۶) از صفحه‌های رسمی خوانده شده‌اند (منابع ۱ تا ۷ همین مقاله) و فقط برای تمرین حساب‌وکتاب‌اند، نه پیش‌فاکتور خرید. Veo در 1080p و 4K فقط کلیپ ۸ ثانیه‌ای می‌سازد و در 720p کلیپ ۴، ۶ یا ۸ ثانیه‌ای؛ قابلیت «ادامه دادن» این‌جا حساب نشده است. برای Runway و Luma هزینه از روی اشتراک ماهانه درآمده است: قیمت طرح، تقسیم بر اعتبار طرح، ضرب در اعتباری که این ویدیو می‌برد. برای Luma کلیپ ۵ ثانیه‌ای 720p حساب شده که ارزان‌ترین حالت است و نرخ فریمش را در صفحه‌های رسمی پیدا نکردیم. قیمت 1080p و 4K در Gemini Omni Flash برای خروجی بزرگ‌نمایی‌شده است. صحنه و نمایش «از نویز تا تصویر» نمادین‌اند و این‌جا هیچ مدلی اجرا نمی‌شود. هر کلیپ جدا ساخته می‌شود، برای همین در محل برش، صحنه کمی عوض می‌شود.');

      function clipAt(t) { var i = 0, acc = 0; while (i < P.a.length - 1 && t >= acc + P.a[i]) { acc += P.a[i]; i++; } return { i: i, start: acc }; }
      function wall() { return Math.max(5, Math.min(12, o.T / 4)); } // seconds the whole video takes to play here
      function upd() {
        var m = MODELS[o.m], i;
        if (m.c[o.r] == null) { o.r = m.c[1] == null ? 0 : 1; sgR.set(o.r); }
        for (i = 0; i < 3; i++) rb[i].disabled = m.c[i] == null;
        P = plan(m, o.r, o.T);
        st.set('cost', (m.plan ? 'حدود ' : '') + AN.fa(P.cost / 100, 2) + ' دلار');
        st.set('per', (m.plan ? 'حدود ' : '') + Number(m.c[o.r]).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' سنت');
        st.set('clips', AN.fa(P.a.length) + ' کلیپ');
        st.set('sec', AN.fa(P.made) + ' ثانیه', P.extra ? 'warn' : 'good');
        st.set('fr', m.fps ? AN.fa(P.made * m.fps) + ' فریم' : 'اعلام نشده');
        st.set('cr', m.plan ? AN.fa(P.credits) + ' از ' + AN.fa(m.plan[0]) : 'لازم نیست', m.plan && P.credits > m.plan[0] ? 'bad' : '');
        S.cv.setAttribute('aria-label', m.n + '، ' + RES[o.r][0] + '، ویدیوی ' + AN.fa(o.T) + ' ثانیه‌ای: ' + AN.fa(P.a.length) + ' کلیپ به طول ' + P.a.map(function (x) { return AN.fa(x); }).join('، ') + ' ثانیه.' + (P.extra ? ' ' + AN.fa(P.made) + ' ثانیه ساخته می‌شود و ' + AN.fa(P.extra) + ' ثانیه‌ی آخر دور ریخته می‌شود.' : ''));
        draw();
      }
      function play() {
        dn = -1; bt[1].textContent = 'از نویز تا تصویر';
        if (AN.rm) { // no motion wanted: every press shows the first frame of the next clip
          var t = pf * o.T, acc = 0, nx = 0, i;
          for (i = 0; i < P.a.length && !nx; i++) { acc += P.a[i]; if (acc > t + 1e-6 && acc < o.T) nx = acc; }
          pf = nx / o.T; playing = false; bt[0].textContent = 'کلیپ بعدی'; draw(); return;
        }
        playing = !playing; if (playing) pf = 0;
        bt[0].textContent = playing ? 'توقف' : 'پخش ویدیو'; draw();
      }
      function denoise() {
        playing = false; bt[0].textContent = 'پخش ویدیو'; fresh = true; dnT = 0;
        if (AN.rm) { dn = dn < 0 ? 0 : dn + 1; if (dn >= STEPS) dn = -1; bt[1].textContent = dn < 0 ? 'از نویز تا تصویر' : 'گام بعد'; } // one step per press
        else dn = 0;
        draw();
      }
      function noise(c, x, y, w, h, a) {
        if (fresh) { var g = nzc.getContext('2d'), im = g.createImageData(96, 54), d = im.data, i; for (i = 0; i < d.length; i += 4) { d[i] = Math.random() * 255; d[i + 1] = Math.random() * 255; d[i + 2] = Math.random() * 255; d[i + 3] = 255; } g.putImageData(im, 0, 0); fresh = false; }
        c.save(); c.globalAlpha = a; c.imageSmoothingEnabled = false; c.drawImage(nzc, x, y, w, h); c.restore();
      }
      function chip(c, k, x, y, s, al) {
        var bw = c.measureText(s).width + 16 * k, bx = al === 'right' ? x - bw : al === 'center' ? x - bw / 2 : x;
        c.fillStyle = 'rgba(4,6,13,.7)'; rr(c, bx, y, bw, 21 * k, 10.5 * k); c.fill();
        c.fillStyle = 'rgba(237,242,250,.94)'; c.textAlign = 'center'; c.fillText(s, bx + bw / 2, y + 14.5 * k);
      }
      function draw() {
        var c = S.ctx, w = S.w, h = S.h, k = S.k; if (!w || !P) return;
        var m = MODELS[o.m], pad = 12 * k, gap = 14 * k, slim = w / k < 560, tlH = Math.min(44 * k, h * 0.14), tlBlock = tlH + 46 * k, szH = slim ? 60 * k + gap : 0;
        // wide: the frame on the left with the three frame sizes beside it; slim (a phone): the frame across the canvas and the sizes in a row under it
        var vw = slim ? Math.min(w - 2 * pad, (h - 2 * pad - tlBlock - szH) * 16 / 9) : Math.min((w - 2 * pad - gap) * 0.62, (h - 2 * pad - tlBlock) * 16 / 9), vh = vw * 9 / 16;
        var vx = slim ? (w - vw) / 2 : pad, vy = pad + Math.max(0, (h - 2 * pad - tlBlock - szH - vh) / 2);
        var t = pf * o.T, at = clipAt(Math.min(t, o.T - 1e-6)), noisy = dn >= 0 && dn < STEPS, na = noisy ? Math.pow(1 - dn / STEPS, 0.8) : 0, i;
        c.fillStyle = '#060A15'; c.fillRect(0, 0, w, h);
        c.font = '600 ' + (10.5 * k) + 'px Vazirmatn, Tahoma, sans-serif';
        // the frame under the playhead
        scene(c, vx, vy, vw, vh, pf, at.i + 1);
        if (noisy) noise(c, vx, vy, vw, vh, na);
        c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = k; c.strokeRect(vx + k / 2, vy + k / 2, vw - k, vh - k);
        chip(c, k, vx + 8 * k, vy + 8 * k, m.n + ' · ' + RES[o.r][0], 'left');
        if (noisy) chip(c, k, vx + vw / 2, vy + vh - 29 * k, 'گام ' + AN.fa(dn + 1) + ' از ' + AN.fa(STEPS) + ': نویز کمتر، تصویر بیشتر', 'center');
        else {
          chip(c, k, vx + vw - 8 * k, vy + vh - 29 * k, m.fps ? 'فریم ' + AN.fa(Math.min(o.T * m.fps, Math.floor(t * m.fps) + 1)) + ' از ' + AN.fa(o.T * m.fps) : 'ثانیه‌ی ' + AN.fa(Math.min(o.T, Math.floor(t) + 1)) + ' از ' + AN.fa(o.T), 'right');
          if (at.i && (t - at.start) / o.T * wall() < 0.7) chip(c, k, vx + vw / 2, vy + 8 * k, 'برش: کلیپ ' + AN.fa(at.i + 1), 'center');
        }
        // the three frame sizes, drawn to scale: nested beside the frame, or side by side under it on a phone
        var R = RES[o.r], lines = [AN.faDigits(R[1] + ' × ' + R[2]), AN.fa(R[1] * R[2] / 1e6, 1) + ' میلیون پیکسل در هر فریم'], bw4, bh4, bx, by, lx, ly, rx;
        if (m.up && o.r) lines.push('با بزرگ‌نمایی');
        if (slim) { bh4 = 46 * k; bw4 = bh4 * 16 / 9; bx = vx; by = vy + vh + gap + 12 * k; lx = vx + vw; ly = by + bh4 / 2 - (lines.length - 1) * 8.5 * k + 2 * k; if (c.measureText(lines[1]).width > vw - bw4 * 11 / 6 - 28 * k) lines[1] = lines[1].replace(' در هر فریم', ''); }
        else { var px = vx + vw + gap, pw = w - pad - px, th = (lines.length * 17 + 8) * k; bw4 = Math.min(pw, (vh - th) * 16 / 9); bh4 = bw4 * 9 / 16; bx = px + (pw - bw4) / 2; by = vy + Math.max(0, (vh - bh4 - th) / 2); lx = px + pw / 2; ly = by + bh4 + 20 * k; }
        for (i = 2, rx = bx + (slim ? bw4 * 5 / 6 + 16 * k : 0); i >= 0; i--) {
          var f = RES[i][1] / 3840, rw = bw4 * f, rh = bh4 * f, ry = by + bh4 - rh, on = i === o.r, ok = m.c[i] != null;
          if (on) { c.fillStyle = 'rgba(255,179,107,.22)'; c.fillRect(rx, ry, rw, rh); }
          c.setLineDash(ok ? [] : [3 * k, 3 * k]); c.lineWidth = (on ? 2 : 1) * k; c.strokeStyle = on ? '#FFB36B' : ok ? 'rgba(237,242,250,.45)' : 'rgba(237,242,250,.22)';
          c.strokeRect(rx + c.lineWidth / 2, ry + c.lineWidth / 2, rw - c.lineWidth, rh - c.lineWidth); c.setLineDash([]);
          c.font = '700 ' + (9.5 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.fillStyle = on ? '#FFD9B0' : ok ? 'rgba(237,242,250,.7)' : 'rgba(237,242,250,.35)';
          if (slim) { c.textAlign = 'center'; c.fillText(RES[i][0], rx + rw / 2, ry - 5 * k); if (i) rx -= bw4 * RES[i - 1][1] / 3840 + 8 * k; }
          else { c.textAlign = 'right'; c.fillText(RES[i][0], rx + rw - 4 * k, ry + 12 * k); }
        }
        c.font = '600 ' + (10.5 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.textAlign = slim ? 'right' : 'center';
        lines.forEach(function (s, j) { c.fillStyle = j ? 'rgba(237,242,250,.6)' : 'rgba(237,242,250,.9)'; c.fillText(s, lx, ly + j * 17 * k); });
        // the timeline: one block per clip, the unused tail hatched
        var tx = pad, tw = w - 2 * pad, ty = vy + vh + szH + 26 * k, sc = tw / P.made, x = tx;
        c.textAlign = 'right'; c.fillStyle = 'rgba(237,242,250,.6)'; c.fillText(noisy ? 'همه‌ی فریم‌های یک کلیپ با هم از نویز بیرون می‌آیند' : 'خط زمان: هر تکه یک کلیپ است', tx + tw, ty - 12 * k);
        P.a.forEach(function (len, j) {
          var bw = len * sc, tone = j % 2 ? '182,164,255' : '83,224,224', lab = bw > 78 * k ? 'کلیپ ' + AN.fa(j + 1) + ': ' + AN.fa(len) + ' ثانیه' : bw > 26 * k ? AN.fa(len) + ' ث' : '';
          c.fillStyle = 'rgba(' + tone + ',.2)'; rr(c, x + k, ty, bw - 2 * k, tlH, 5 * k); c.fill();
          if (noisy && j === at.i) noise(c, x + k, ty, bw - 2 * k, tlH, na);
          c.strokeStyle = 'rgba(' + tone + ',.85)'; c.lineWidth = k; rr(c, x + k, ty, bw - 2 * k, tlH, 5 * k); c.stroke();
          if (lab && !(noisy && j === at.i)) { c.fillStyle = 'rgba(237,242,250,.92)'; c.textAlign = 'center'; c.fillText(lab, x + bw / 2, ty + tlH / 2 + 4 * k); }
          x += bw;
        });
        if (P.extra) {
          var ex = tx + o.T * sc, q;
          c.save(); c.beginPath(); c.rect(ex, ty, tx + tw - ex, tlH); c.clip(); c.fillStyle = 'rgba(255,90,90,.3)'; c.fillRect(ex, ty, tx + tw - ex, tlH);
          c.strokeStyle = 'rgba(255,120,120,.75)'; c.lineWidth = k; c.beginPath(); for (q = ex - tlH; q < tx + tw; q += 6 * k) { c.moveTo(q, ty + tlH); c.lineTo(q + tlH, ty); } c.stroke(); c.restore();
        }
        var phx = tx + t * sc;
        c.strokeStyle = '#FFB36B'; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(phx, ty - 3 * k); c.lineTo(phx, ty + tlH + 4 * k); c.stroke();
        c.fillStyle = '#FFB36B'; c.beginPath(); c.arc(phx, ty - 3 * k, 3.5 * k, 0, 2 * PI); c.fill();
        c.textAlign = 'left'; c.fillStyle = 'rgba(237,242,250,.6)'; c.fillText(AN.fa(0), tx, ty + tlH + 17 * k);
        c.textAlign = 'right'; c.fillStyle = P.extra ? '#FF9A9A' : 'rgba(237,242,250,.6)';
        c.fillText(P.extra ? AN.fa(P.made) + ' ثانیه ساخته می‌شود، ' + AN.fa(P.extra) + ' ثانیه‌ی آخر دور ریخته می‌شود' : AN.fa(P.made) + ' ثانیه', tx + tw, ty + tlH + 17 * k);
      }
      ui.loop(root, function (dt) {
        if (playing) { pf += dt / wall(); if (pf >= 1) { pf = 1; playing = false; bt[0].textContent = 'پخش ویدیو'; } draw(); }
        else if (dn >= 0 && !AN.rm) { dnT += dt; if (dnT > 0.45) { dnT = 0; fresh = true; dn++; if (dn >= STEPS) dn = -1; draw(); } }
      });
      S.onResize(draw); upd();
    }
  };
})();
