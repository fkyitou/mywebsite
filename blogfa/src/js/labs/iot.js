/* Lab · IoT: a smart home under an automated botnet scan. Change passwords, updates and network isolation, then replay the attack. */
(function () {
  'use strict';
  var W = window, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, el = AN.el, esc = AN.esc, TAU = Math.PI * 2;
  var DEV = [
    { k: 'cam', n: 'دوربین امنیتی', x: 0.2, y: 0.42 }, { k: 'bulb', n: 'لامپ هوشمند', x: 0.36, y: 0.7 },
    { k: 'temp', n: 'دماسنج هوشمند', x: 0.52, y: 0.42 }, { k: 'spk', n: 'بلندگوی هوشمند', x: 0.68, y: 0.72 },
    { k: 'plug', n: 'پریز هوشمند', x: 0.84, y: 0.44 }, { k: 'lock', n: 'قفل در', x: 0.2, y: 0.78 }
  ];
  var PC = [{ n: 'لپ‌تاپ', x: 0.62, y: 0.55 }, { n: 'گوشی', x: 0.8, y: 0.8 }];
  var PW = [['def', 'رمز کارخانه'], ['weak', 'رمز ضعیف'], ['strong', 'رمز قوی و یکتا']];

  AN.labs = AN.labs || {};
  AN.labs.iot = {
    title: 'خانه‌ی هوشمندت در برابر یک بات‌نت',
    sub: 'رمز و به‌روزرسانی هر دستگاه را تنظیم کن و حمله‌ی خودکار را اجرا کن. همه‌چیز شبیه‌سازی است و هیچ اتصال واقعی برقرار نمی‌شود.',
    mount: function (root) {
      var S = ui.stage(root, { label: 'نقشه‌ی خانه‌ی هوشمند و مسیر حمله‌ی شبیه‌سازی‌شده' });
      var B = ui.body(root), st = DEV.map(function () { return { pw: 'def', up: false, bad: 0, how: '' }; }), seg = false, phase = -1, T = 0, flood = [];
      var list = el('div', 'an-iot-list'); B.appendChild(list);
      DEV.forEach(function (d, i) {
        var row = el('div', 'an-iot-row');
        row.innerHTML = '<span class="an-iot-n"></span><span class="an-seg" role="group"></span><label class="an-iot-up"><input type="checkbox"> به‌روز</label>';
        row.querySelector('.an-iot-n').innerHTML = AN.icon('net') + esc(d.n);
        var g = row.querySelector('.an-seg');
        PW.forEach(function (p) { var b = el('button', '', esc(p[1])); b.type = 'button'; b.setAttribute('aria-pressed', String(st[i].pw === p[0])); b.addEventListener('click', function () { st[i].pw = p[0]; [].forEach.call(g.children, function (x, j) { x.setAttribute('aria-pressed', String(PW[j][0] === p[0])); }); resetRun(); }); g.appendChild(b); });
        g.setAttribute('aria-label', 'رمز ' + d.n);
        var cb = row.querySelector('input'); cb.addEventListener('change', function () { st[i].up = cb.checked; resetRun(); });
        d.row = row; d.cb = cb; d.g = g; list.appendChild(row);
      });
      var C = ui.row(B);
      var segTg = ui.seg(C, 'شبکه‌ی جدا برای اشیای هوشمند', [[false, 'خاموش'], [true, 'روشن']], false, function (v) { seg = v; resetRun(); });
      var bt = ui.btns(B, [['⚡ اجرای حمله‌ی شبیه‌سازی‌شده', start, true], ['همه با تنظیمات کارخانه', function () { preset(false); }], ['خانه‌ی امن', function () { preset(true); }]]);
      var out = ui.stats(B, [['inf', 'دستگاه‌های آلوده'], ['pc', 'لپ‌تاپ و گوشی'], ['score', 'امتیاز امنیت خانه']]);
      var log = ui.note(B, 'دکمه‌ی «اجرای حمله» را بزن تا ببینی یک اسکنر خودکار، مثل بات‌نت میرای در سال ۲۰۱۶، چطور دستگاه‌ها را یکی‌یکی امتحان می‌کند.');
      function preset(safe) {
        DEV.forEach(function (d, i) { st[i].pw = safe ? 'strong' : 'def'; st[i].up = safe; d.cb.checked = safe; [].forEach.call(d.g.children, function (x, j) { x.setAttribute('aria-pressed', String(PW[j][0] === st[i].pw)); }); });
        seg = safe; segTg.set(safe); resetRun();
      }
      function resetRun() { phase = -1; T = 0; flood = []; st.forEach(function (s) { s.bad = 0; s.how = ''; }); summary(false); }
      function start() { resetRun(); phase = 0; T = 0; log.innerHTML = 'اسکنر در حال جست‌وجوی دستگاه‌های در دسترس است…'; }
      // decide the outcome of each wave; deterministic so the lesson is clear
      function wave(n) {
        st.forEach(function (s) {
          if (s.bad) return;
          if (n === 1 && s.pw === 'def') { s.bad = 1; s.how = 'ورود با رمز کارخانه'; }
          if (n === 2 && s.pw === 'weak') { s.bad = 2; s.how = 'حدس رمز با فهرست رمزهای رایج'; }
          if (n === 3 && !s.up) { s.bad = 3; s.how = 'سوءاستفاده از آسیب‌پذیری وصله‌نشده'; }
        });
      }
      function summary(done) {
        var n = st.filter(function (s) { return s.bad; }).length, pcBad = done && n > 0 && !seg;
        var score = 100 - n * 12 - (seg ? 0 : 10) - (pcBad ? 18 : 0);
        out.set('inf', AN.fa(n) + ' از ' + AN.fa(DEV.length), n ? 'bad' : 'good');
        out.set('pc', done ? (pcBad ? 'در خطر' : 'امن ماند') : '—', done ? (pcBad ? 'bad' : 'good') : '');
        out.set('score', AN.fa(Math.max(0, score)) + ' از ۱۰۰', score >= 80 ? 'good' : score >= 50 ? 'warn' : 'bad');
        DEV.forEach(function (d, i) { d.row.classList.toggle('bad', !!st[i].bad); d.row.title = st[i].how; });
        if (done) {
          var lines = st.map(function (s, i) { return s.bad ? '• ' + DEV[i].n + ': ' + s.how : null; }).filter(Boolean);
          log.innerHTML = n ? 'نتیجه: ' + AN.fa(n) + ' دستگاه به بات‌نت پیوستند و حالا برای حمله‌ی منع سرویس به یک سایت دیگر ترافیک می‌فرستند.<br>' + lines.join('<br>') + (pcBad ? '<br>چون شبکه‌ی جدا خاموش است، مهاجم از دستگاه آلوده به سمت لپ‌تاپ و گوشی هم حرکت کرد.' : seg ? '<br>شبکه‌ی جدا مانع رسیدن مهاجم به لپ‌تاپ و گوشی شد.' : '') : 'هیچ دستگاهی آلوده نشد: رمز یکتا، به‌روزرسانی و شبکه‌ی جدا، سه قفل اصلی خانه‌ی هوشمندند.';
        }
      }
      function draw(dt) {
        if (!S.w) return; var c = S.ctx, w = S.w, h = S.h, k = S.k, i;
        if (phase >= 0) {
          T += dt;
          if (phase === 0 && T > 1.2) { phase = 1; wave(1); summary(false); }
          else if (phase === 1 && T > 3) { phase = 2; wave(2); summary(false); }
          else if (phase === 2 && T > 4.8) { phase = 3; wave(3); summary(false); }
          else if (phase === 3 && T > 6.2) { phase = 4; summary(true); }
        }
        c.fillStyle = '#060A15'; c.fillRect(0, 0, w, h);
        var x0 = w * 0.08, y0 = h * 0.3, x1 = w * 0.94, y1 = h * 0.94;
        c.strokeStyle = 'rgba(91,155,255,.08)'; c.lineWidth = k;
        for (i = 0; i < 40; i++) { c.beginPath(); c.moveTo(x0 + (x1 - x0) * i / 40, y0); c.lineTo(x0 + (x1 - x0) * i / 40, y1); c.stroke(); }
        c.strokeStyle = 'rgba(91,155,255,.6)'; c.lineWidth = 2 * k; c.beginPath(); c.moveTo(x0, y1); c.lineTo(x0, y0); c.lineTo((x0 + x1) / 2, h * 0.17); c.lineTo(x1, y0); c.lineTo(x1, y1); c.closePath(); c.stroke();
        if (seg) { c.setLineDash([6 * k, 5 * k]); c.strokeStyle = 'rgba(127,227,160,.8)'; c.beginPath(); c.moveTo(w * 0.56, y0 + 6 * k); c.lineTo(w * 0.56, y1 - 6 * k); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(127,227,160,.9)'; c.font = '600 ' + (11 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.textAlign = 'center'; c.fillText('دیوار جداکننده', w * 0.56, y0 - 6 * k); }
        var hub = { x: w * 0.5, y: h * 0.56 }, net = { x: w * 0.5, y: h * 0.07 };
        // internet cloud and attacker
        c.fillStyle = phase >= 0 ? 'rgba(255,107,90,.18)' : 'rgba(150,170,210,.12)';
        [[-0.05, 0], [0, -0.025], [0.05, 0], [0.025, 0.02], [-0.025, 0.02]].forEach(function (o) { c.beginPath(); c.arc(net.x + o[0] * w, net.y + o[1] * w, 0.032 * w, 0, TAU); c.fill(); });
        c.fillStyle = 'rgba(237,242,250,.85)'; c.font = '700 ' + (12 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.textAlign = 'center'; c.fillText(phase >= 0 ? 'اسکنر خودکار در اینترنت' : 'اینترنت', net.x, net.y + 4 * k);
        c.strokeStyle = 'rgba(83,224,224,.5)'; c.lineWidth = 1.5 * k; c.beginPath(); c.moveTo(hub.x, hub.y); c.lineTo(net.x, net.y + 0.05 * w); c.stroke();
        function link(a, b, col) { c.strokeStyle = col; c.lineWidth = 1.2 * k; c.setLineDash([4 * k, 4 * k]); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.setLineDash([]); }
        DEV.forEach(function (d, j) { link(hub, { x: d.x * w, y: d.y * h }, st[j].bad ? 'rgba(255,107,90,.6)' : 'rgba(83,224,224,.35)'); });
        PC.forEach(function (p) { link(hub, { x: p.x * w, y: p.y * h }, 'rgba(143,182,255,.35)'); });
        // probes travelling from the internet to each device
        if (phase >= 0 && phase < 4) DEV.forEach(function (d, j) {
          var t = (T * 0.9 + j * 0.17) % 1, a = net, b = { x: d.x * w, y: d.y * h }, mx = hub.x, my = hub.y, u = 1 - t;
          var px = t < 0.5 ? a.x + (mx - a.x) * t * 2 : mx + (b.x - mx) * (t - 0.5) * 2, py = t < 0.5 ? a.y + 0.05 * w + (my - a.y - 0.05 * w) * t * 2 : my + (b.y - my) * (t - 0.5) * 2;
          c.beginPath(); c.arc(px, py, 3.2 * k, 0, TAU); c.fillStyle = 'rgba(255,107,90,' + (0.4 + u * 0.6).toFixed(2) + ')'; c.fill();
        });
        // botnet flood: infected devices push traffic out to a victim
        if (phase === 4) {
          if (flood.length < 60 && Math.random() < 0.6) st.forEach(function (s, j) { if (s.bad && Math.random() < 0.3) flood.push({ x: DEV[j].x * w, y: DEV[j].y * h, t: 0 }); });
          flood = flood.filter(function (f) { f.t += dt * 0.7; return f.t < 1; });
          flood.forEach(function (f) { var t = f.t, x = f.x + (hub.x - f.x) * Math.min(1, t * 2), y = f.y + (hub.y - f.y) * Math.min(1, t * 2); if (t > 0.5) { x = hub.x + (w * 0.92 - hub.x) * (t - 0.5) * 2; y = hub.y + (h * 0.06 - hub.y) * (t - 0.5) * 2; } c.fillStyle = 'rgba(255,90,80,.9)'; c.fillRect(x - 2 * k, y - 2 * k, 4 * k, 4 * k); });
          c.fillStyle = 'rgba(255,107,90,.95)'; c.font = '700 ' + (11 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.textAlign = 'end'; if (st.some(function (s) { return s.bad; })) c.fillText('هدف حمله‌ی منع سرویس ←', w * 0.97, h * 0.05);
        }
        // hub
        var hs = 0.03 * w; c.fillStyle = '#0B1630'; c.strokeStyle = '#53E0E0'; c.lineWidth = 2 * k; c.beginPath(); c.roundRect ? c.roundRect(hub.x - hs * 1.3, hub.y - hs * 0.5, hs * 2.6, hs, hs * 0.3) : c.rect(hub.x - hs * 1.3, hub.y - hs * 0.5, hs * 2.6, hs); c.fill(); c.stroke();
        c.fillStyle = 'rgba(237,242,250,.8)'; c.font = '600 ' + (10.5 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.textAlign = 'center'; c.fillText('مودم/روتر', hub.x, hub.y + hs * 1.15);
        DEV.forEach(function (d, j) {
          var x = d.x * w, y = d.y * h, s = 0.024 * w, bad = st[j].bad, col = bad ? '#FF6B5A' : '#53E0E0';
          if (bad) { var pulse = (T * 1.5) % 1; c.beginPath(); c.arc(x, y, s * (1.4 + pulse * 1.4), 0, TAU); c.strokeStyle = 'rgba(255,107,90,' + (0.6 * (1 - pulse)).toFixed(2) + ')'; c.lineWidth = 2 * k; c.stroke(); }
          c.beginPath(); c.arc(x, y, s * 1.15, 0, TAU); c.fillStyle = '#0A1226'; c.fill(); c.strokeStyle = col; c.lineWidth = 2 * k; c.stroke();
          if (AN.glyph) AN.glyph(c, d.k, x, y, s * 0.62, bad ? '#FFB3AA' : '#E6F6FF', 1.6 * k);
          c.fillStyle = 'rgba(237,242,250,.75)'; c.font = '600 ' + (10 * k) + 'px Vazirmatn, Tahoma, sans-serif'; c.fillText(d.n, x, y + s * 2.1);
        });
        PC.forEach(function (p) {
          var x = p.x * w, y = p.y * h, s = 0.022 * w, bad = phase === 4 && !seg && st.some(function (q) { return q.bad; });
          c.fillStyle = '#0A1226'; c.strokeStyle = bad ? '#FF6B5A' : '#8FB6FF'; c.lineWidth = 2 * k; c.beginPath(); c.rect(x - s, y - s * 0.7, s * 2, s * 1.4); c.fill(); c.stroke();
          c.fillStyle = 'rgba(237,242,250,.75)'; c.fillText(p.n, x, y + s * 1.9);
        });
      }
      ui.loop(root, draw);
      summary(false);
    }
  };
})();
