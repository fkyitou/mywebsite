/* آینده‌نگار · generative cover art. Every cover is drawn in the browser at the screen's pixel density,
   so it stays sharp on any display and costs no image downloads. Same topic + seed = same picture. */
(function () {
  'use strict';
  var W = window, D = document, AN = W.AN = W.AN || {};
  var PI = Math.PI, TAU = PI * 2, sin = Math.sin, cos = Math.cos, max = Math.max, min = Math.min;
  var PAL = {
    ai: ['#8FB6FF', '#B79BFF', '#53E0E0'], iot: ['#53E0E0', '#5B9BFF', '#FFB36B'], city: ['#FFB36B', '#5B9BFF', '#FFE2B8'],
    security: ['#53E0E0', '#7FE3A0', '#5B9BFF'], brain: ['#E89BFF', '#9B7BFF', '#53E0E0'], space: ['#FF8A6B', '#FFB36B', '#8FB6FF'],
    arch: ['#FFB36B', '#FFE2B8', '#8FB6FF'], algo: ['#8FB6FF', '#FF7EB6', '#FFD66B'], energy: ['#7FE3A0', '#FFD66B', '#53E0E0'],
    idea: ['#FFD66B', '#FF9F5A', '#E89BFF'], video: ['#FF8FA3', '#FFC46B', '#7FD8FF'], def: ['#9AA8C0', '#5B9BFF', '#FFB36B']
  };
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(a) { a = (a >>> 0) || 1; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + (+a).toFixed(3) + ')'; }
  function glow(c, x, y, r, col, a) { if (r <= 0) return; var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(0.4, rgba(col, a * 0.32)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  function dot(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, max(r, 0.2), 0, TAU); c.fillStyle = fill; c.fill(); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function add(c, on) { c.globalCompositeOperation = on ? 'lighter' : 'source-over'; }

  var M = {};

  /* neural network: layers of neurons, weighted connections, one bright activation path */
  M.ai = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, L = [4, 7, 9, 7, 3], net = [], i, j, q;
    var gw = u * 1.55, sp = u * 0.105;
    // perspective floor
    c.save(); c.globalAlpha = 0.5;
    for (i = 0; i <= 14; i++) { var t = i / 14, y = F.y + u * 0.5 + Math.pow(t, 1.8) * u * 0.5; c.strokeStyle = rgba(P[0], 0.12 * (1 - t * 0.6)); c.lineWidth = lw * 0.8; c.beginPath(); c.moveTo(F.x - u * 1.6, y); c.lineTo(F.x + u * 1.6, y); c.stroke(); }
    for (i = -10; i <= 10; i++) { c.strokeStyle = rgba(P[0], 0.08); c.beginPath(); c.moveTo(F.x + i * u * 0.05, F.y + u * 0.5); c.lineTo(F.x + i * u * 0.16, F.y + u * 1.05); c.stroke(); }
    c.restore();
    for (i = 0; i < L.length; i++) {
      var col = [], x = F.x - gw / 2 + gw * i / (L.length - 1);
      for (j = 0; j < L[i]; j++) col.push({ x: x + (R() - 0.5) * u * 0.02, y: F.y + (j - (L[i] - 1) / 2) * sp, a: R() });
      net.push(col);
    }
    var path = net.map(function (col) { return (R() * col.length) | 0; });
    for (i = 0; i < net.length - 1; i++) for (j = 0; j < net[i].length; j++) for (q = 0; q < net[i + 1].length; q++) {
      var A = net[i][j], B = net[i + 1][q], wgt = R() * 2 - 1, mx = (A.x + B.x) / 2;
      c.strokeStyle = rgba(wgt > 0 ? P[0] : P[1], 0.04 + Math.abs(wgt) * 0.2); c.lineWidth = lw * (0.5 + Math.abs(wgt) * 1.2);
      c.beginPath(); c.moveTo(A.x, A.y); c.bezierCurveTo(mx, A.y, mx, B.y, B.x, B.y); c.stroke();
    }
    add(c, true);
    for (i = 0; i < net.length - 1; i++) {
      var a = net[i][path[i]], b = net[i + 1][path[i + 1]], m = (a.x + b.x) / 2, g = c.createLinearGradient(a.x, 0, b.x, 0);
      g.addColorStop(0, rgba(P[2], 0.9)); g.addColorStop(1, rgba(P[0], 0.9));
      for (q = 3; q >= 1; q--) { c.strokeStyle = q === 1 ? g : rgba(P[2], 0.06 * q); c.lineWidth = lw * (q === 1 ? 2.2 : q * 5); c.beginPath(); c.moveTo(a.x, a.y); c.bezierCurveTo(m, a.y, m, b.y, b.x, b.y); c.stroke(); }
      for (q = 0; q < 3; q++) { var tt = (q + R()) / 3, it = 1 - tt, px = it * it * it * a.x + 3 * it * it * tt * m + 3 * it * tt * tt * m + tt * tt * tt * b.x, py = it * it * it * a.y + 3 * it * it * tt * a.y + 3 * it * tt * tt * b.y + tt * tt * tt * b.y; glow(c, px, py, u * 0.03, '#FFFFFF', 0.7); }
    }
    add(c, false);
    net.forEach(function (col, li) {
      col.forEach(function (n, ni) {
        var on = path[li] === ni, r = u * (on ? 0.024 : 0.017);
        if (on) { add(c, true); glow(c, n.x, n.y, u * 0.11, P[2], 0.55); add(c, false); }
        dot(c, n.x, n.y, r * 1.25, '#070B18');
        c.lineWidth = lw * 1.3; c.strokeStyle = rgba(on ? '#FFFFFF' : P[0], on ? 0.95 : 0.35 + n.a * 0.5); c.beginPath(); c.arc(n.x, n.y, r, 0, TAU); c.stroke();
        dot(c, n.x, n.y, r * (on ? 0.62 : 0.25 + n.a * 0.3), on ? '#FFFFFF' : rgba(P[n.a > 0.6 ? 2 : 0], 0.85));
      });
    });
  };

  /* smart home: blueprint, hub with radio waves, devices, packets, one device at risk */
  M.iot = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, i, x0 = F.x - u * 0.85, y0 = F.y - u * 0.24, hw = u * 1.7, hh = u * 0.74;
    c.save(); c.strokeStyle = rgba(P[1], 0.07); c.lineWidth = lw * 0.6;
    for (i = 0; i <= 34; i++) { c.beginPath(); c.moveTo(x0 + hw * i / 34, y0); c.lineTo(x0 + hw * i / 34, y0 + hh); c.stroke(); }
    for (i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(x0, y0 + hh * i / 16); c.lineTo(x0 + hw, y0 + hh * i / 16); c.stroke(); }
    c.strokeStyle = rgba(P[1], 0.55); c.lineWidth = lw * 2; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x0, y0 + hh); c.lineTo(x0, y0); c.lineTo(x0 + hw / 2, y0 - u * 0.26); c.lineTo(x0 + hw, y0); c.lineTo(x0 + hw, y0 + hh); c.closePath(); c.stroke();
    c.lineWidth = lw * 1.2; c.strokeStyle = rgba(P[1], 0.35);
    [[0.36, 0, 0.36, 0.58], [0.64, 0.42, 0.64, 1], [0, 0.5, 0.22, 0.5], [0.78, 0.42, 1, 0.42]].forEach(function (s) { c.beginPath(); c.moveTo(x0 + hw * s[0], y0 + hh * s[1]); c.lineTo(x0 + hw * s[2], y0 + hh * s[3]); c.stroke(); });
    c.restore();
    var hub = { x: F.x, y: F.y + u * 0.1 }, dev = [[-0.62, -0.04, 'bulb'], [-0.6, 0.32, 'lock'], [-0.22, 0.36, 'plug'], [0.3, -0.08, 'temp'], [0.6, 0.32, 'cam'], [0.58, -0.1, 'spk']];
    var risk = 4;
    add(c, true);
    for (i = 1; i <= 5; i++) { c.strokeStyle = rgba(P[0], 0.32 / i); c.lineWidth = lw * 1.6; c.beginPath(); c.arc(hub.x, hub.y, u * 0.09 * i, PI * 1.12, PI * 1.88); c.stroke(); c.beginPath(); c.arc(hub.x, hub.y, u * 0.09 * i, PI * 0.12, PI * 0.88); c.stroke(); }
    glow(c, hub.x, hub.y, u * 0.34, P[0], 0.4);
    add(c, false);
    dev.forEach(function (d, k) {
      var x = F.x + d[0] * u, y = F.y + d[1] * u, cx = (x + hub.x) / 2, cy = min(y, hub.y) - u * 0.12, bad = k === risk, col = bad ? '#FF6B5A' : P[0];
      c.setLineDash([lw * 4, lw * 4]); c.strokeStyle = rgba(col, bad ? 0.55 : 0.4); c.lineWidth = lw * 1.2; c.beginPath(); c.moveTo(hub.x, hub.y); c.quadraticCurveTo(cx, cy, x, y); c.stroke(); c.setLineDash([]);
      add(c, true);
      for (var p = 0; p < 2; p++) { var t = 0.2 + R() * 0.6, it = 1 - t, px = it * it * hub.x + 2 * it * t * cx + t * t * x, py = it * it * hub.y + 2 * it * t * cy + t * t * y; glow(c, px, py, u * 0.035, bad ? '#FF6B5A' : P[2], 0.8); dot(c, px, py, lw * 1.6, '#FFFFFF'); }
      if (bad) for (p = 1; p <= 3; p++) { c.strokeStyle = rgba('#FF6B5A', 0.5 / p); c.lineWidth = lw * 1.4; c.beginPath(); c.arc(x, y, u * (0.07 + p * 0.035), 0, TAU); c.stroke(); }
      glow(c, x, y, u * 0.12, col, 0.3); add(c, false);
      var s = u * 0.055; rr(c, x - s, y - s, s * 2, s * 2, s * 0.45); c.fillStyle = '#0A1226'; c.fill(); c.lineWidth = lw * 1.5; c.strokeStyle = rgba(col, 0.9); c.stroke();
      glyph(c, d[2], x, y, s * 0.62, rgba(bad ? '#FFB3AA' : '#E6F6FF', 0.95), lw * 1.4);
    });
    var hs = u * 0.075; rr(c, hub.x - hs * 1.3, hub.y - hs * 0.55, hs * 2.6, hs * 1.1, hs * 0.3); c.fillStyle = '#0B1630'; c.fill(); c.lineWidth = lw * 1.8; c.strokeStyle = rgba(P[0], 1); c.stroke();
    for (i = 0; i < 4; i++) dot(c, hub.x - hs * 0.75 + i * hs * 0.5, hub.y, lw * 1.8, i < 3 ? '#7FE3A0' : '#FFB36B');
    c.strokeStyle = rgba(P[0], 1); c.lineWidth = lw * 1.6; c.beginPath(); c.moveTo(hub.x - hs * 0.9, hub.y - hs * 0.55); c.lineTo(hub.x - hs * 1.1, hub.y - hs * 1.3); c.moveTo(hub.x + hs * 0.9, hub.y - hs * 0.55); c.lineTo(hub.x + hs * 1.1, hub.y - hs * 1.3); c.stroke();
  };
  function glyph(c, k, x, y, s, col, lw) {
    c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
    if (k === 'bulb') { c.arc(x, y - s * 0.2, s * 0.55, PI * 0.8, PI * 2.2); c.lineTo(x + s * 0.25, y + s * 0.55); c.lineTo(x - s * 0.25, y + s * 0.55); c.closePath(); c.moveTo(x - s * 0.22, y + s * 0.85); c.lineTo(x + s * 0.22, y + s * 0.85); }
    else if (k === 'lock') { c.rect(x - s * 0.55, y - s * 0.1, s * 1.1, s * 0.85); c.moveTo(x - s * 0.32, y - s * 0.1); c.arc(x, y - s * 0.32, s * 0.32, PI, 0); c.lineTo(x + s * 0.32, y - s * 0.1); }
    else if (k === 'plug') { c.moveTo(x - s * 0.3, y - s * 0.75); c.lineTo(x - s * 0.3, y - s * 0.3); c.moveTo(x + s * 0.3, y - s * 0.75); c.lineTo(x + s * 0.3, y - s * 0.3); c.moveTo(x - s * 0.6, y - s * 0.3); c.lineTo(x + s * 0.6, y - s * 0.3); c.lineTo(x + s * 0.4, y + s * 0.25); c.lineTo(x, y + s * 0.4); c.lineTo(x - s * 0.4, y + s * 0.25); c.closePath(); c.moveTo(x, y + s * 0.4); c.lineTo(x, y + s * 0.85); }
    else if (k === 'temp') { c.arc(x, y + s * 0.45, s * 0.32, PI * 1.7, PI * 1.3); c.lineTo(x - s * 0.16, y - s * 0.7); c.arc(x, y - s * 0.7, s * 0.16, PI, 0); c.closePath(); c.moveTo(x, y + s * 0.4); c.lineTo(x, y - s * 0.3); }
    else if (k === 'cam') { c.rect(x - s * 0.75, y - s * 0.45, s * 1.05, s * 0.9); c.moveTo(x + s * 0.3, y - s * 0.1); c.lineTo(x + s * 0.8, y - s * 0.4); c.lineTo(x + s * 0.8, y + s * 0.4); c.lineTo(x + s * 0.3, y + s * 0.1); c.moveTo(x - s * 0.22 + s * 0.2, y); c.arc(x - s * 0.22, y, s * 0.2, 0, TAU); }
    else { c.rect(x - s * 0.5, y - s * 0.8, s, s * 1.6); c.moveTo(x + s * 0.25, y + s * 0.25); c.arc(x, y + s * 0.25, s * 0.25, 0, TAU); c.moveTo(x + s * 0.12, y - s * 0.45); c.arc(x, y - s * 0.45, s * 0.12, 0, TAU); }
    c.stroke(); c.restore();
  }

  /* smart city: isometric blocks with lit windows, glowing roads, light trails and signals */
  M.city = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, N = 9, tw = u * 0.18, th = tw * 0.5, ox = F.x, oy = F.y - u * 0.36, i, j;
    function iso(a, b) { return { x: ox + (a - b) * tw / 2, y: oy + (a + b) * th / 2 }; }
    function road(a) { return a === 2 || a === 6; }
    var cells = [];
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) cells.push([i, j]);
    cells.sort(function (A, B) { return (A[0] + A[1]) - (B[0] + B[1]); });
    cells.forEach(function (cl) {
      var a = cl[0], b = cl[1], p0 = iso(a, b), p1 = iso(a + 1, b), p2 = iso(a + 1, b + 1), p3 = iso(a, b + 1);
      c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); c.closePath();
      if (road(a) || road(b)) {
        c.fillStyle = '#0B1328'; c.fill();
        add(c, true); c.lineWidth = lw * 1.2;
        if (road(a) && !road(b)) { var m0 = iso(a + 0.5, b), m1 = iso(a + 0.5, b + 1); c.strokeStyle = rgba(P[0], 0.5); c.setLineDash([lw * 3, lw * 3]); c.beginPath(); c.moveTo(m0.x, m0.y); c.lineTo(m1.x, m1.y); c.stroke(); c.setLineDash([]); if (R() < 0.6) streak(c, m0, m1, R, lw); }
        if (road(b) && !road(a)) { var n0 = iso(a, b + 0.5), n1 = iso(a + 1, b + 0.5); c.strokeStyle = rgba(P[0], 0.5); c.setLineDash([lw * 3, lw * 3]); c.beginPath(); c.moveTo(n0.x, n0.y); c.lineTo(n1.x, n1.y); c.stroke(); c.setLineDash([]); if (R() < 0.6) streak(c, n0, n1, R, lw); }
        if (road(a) && road(b)) { var ce = iso(a + 0.5, b + 0.5), g = R() < 0.5 ? '#7FE3A0' : '#FF6B5A'; glow(c, ce.x, ce.y, tw * 0.6, g, 0.7); dot(c, ce.x, ce.y, lw * 2.2, '#FFFFFF'); }
        add(c, false); return;
      }
      var d = Math.hypot(a - N / 2 + 0.5, b - N / 2 + 0.5), hgt = th * (0.8 + R() * 1.6 + max(0, 3.5 - d) * (0.8 + R() * 0.8)), inset = 0.12;
      var q0 = iso(a + inset, b + inset), q1 = iso(a + 1 - inset, b + inset), q2 = iso(a + 1 - inset, b + 1 - inset), q3 = iso(a + inset, b + 1 - inset);
      c.fillStyle = '#0A1022'; c.fill();
      // left face (q3 -> q2), right face (q2 -> q1)
      face(c, q3, q2, hgt, '#0E1834', R, P, lw, tw);
      face(c, q2, q1, hgt, '#13203F', R, P, lw, tw);
      c.beginPath(); c.moveTo(q0.x, q0.y - hgt); c.lineTo(q1.x, q1.y - hgt); c.lineTo(q2.x, q2.y - hgt); c.lineTo(q3.x, q3.y - hgt); c.closePath();
      var tg = c.createLinearGradient(q0.x, q0.y - hgt, q2.x, q2.y - hgt); tg.addColorStop(0, '#22335E'); tg.addColorStop(1, '#16244A'); c.fillStyle = tg; c.fill();
      c.strokeStyle = rgba(P[0], 0.55); c.lineWidth = lw; c.stroke();
      if (hgt > th * 6 && R() < 0.5) { add(c, true); var top = iso(a + 0.5, b + 0.5); glow(c, top.x, top.y - hgt - lw * 6, tw * 0.3, '#FF6B5A', 0.8); add(c, false); }
    });
  };
  function face(c, A, B, h, fill, R, P, lw, tw) {
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(B.x, B.y - h); c.lineTo(A.x, A.y - h); c.closePath(); c.fillStyle = fill; c.fill();
    c.strokeStyle = rgba(P[1], 0.22); c.lineWidth = lw * 0.8; c.stroke();
    var cols = 4, rows = max(2, Math.floor(h / (tw * 0.16))), i, j;
    add(c, true);
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      if (R() < 0.45) continue;
      var t0 = (i + 0.25) / cols, t1 = (i + 0.75) / cols, y0 = (j + 0.3) / rows * h, y1 = (j + 0.7) / rows * h, warm = R() < 0.7;
      c.fillStyle = rgba(warm ? '#FFC98A' : '#9CC8FF', 0.25 + R() * 0.55);
      c.beginPath(); c.moveTo(A.x + (B.x - A.x) * t0, A.y + (B.y - A.y) * t0 - h + y0); c.lineTo(A.x + (B.x - A.x) * t1, A.y + (B.y - A.y) * t1 - h + y0);
      c.lineTo(A.x + (B.x - A.x) * t1, A.y + (B.y - A.y) * t1 - h + y1); c.lineTo(A.x + (B.x - A.x) * t0, A.y + (B.y - A.y) * t0 - h + y1); c.closePath(); c.fill();
    }
    add(c, false);
  }
  function streak(c, A, B, R, lw) {
    var t = R() * 0.6, l = 0.25 + R() * 0.3, g = c.createLinearGradient(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, A.x + (B.x - A.x) * (t + l), A.y + (B.y - A.y) * (t + l)), red = R() < 0.5;
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, red ? 'rgba(255,90,80,.95)' : 'rgba(255,240,210,.95)');
    c.strokeStyle = g; c.lineWidth = lw * 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t); c.lineTo(A.x + (B.x - A.x) * (t + l), A.y + (B.y - A.y) * (t + l)); c.stroke();
  }

  /* digital security: padlock built from a hex lattice, a time-code dial, falling bit streams */
  M.security = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, i, x, y;
    c.save(); c.globalAlpha = 0.9;
    for (i = 0; i < 26; i++) {
      x = F.x + (R() - 0.5) * u * 3; var y0 = F.y - u * (0.4 + R() * 0.7), n = 6 + (R() * 12 | 0);
      for (var j = 0; j < n; j++) { y = y0 + j * u * 0.05; c.fillStyle = rgba(j === n - 1 ? '#FFFFFF' : P[1], (j / n) * 0.35); c.fillRect(x, y, lw * 1.4, u * (R() < 0.5 ? 0.012 : 0.03)); }
    }
    c.restore();
    var cx = F.x, cy = F.y + u * 0.02, rd = u * 0.5, segs = 30, lit = 18 + (R() * 9 | 0);
    c.lineWidth = lw; c.strokeStyle = rgba(P[0], 0.25); c.beginPath(); c.arc(cx, cy, rd * 1.12, 0, TAU); c.stroke();
    for (i = 0; i < 60; i++) { var a = i / 60 * TAU - PI / 2, l = i % 5 ? 0.03 : 0.06; c.strokeStyle = rgba(P[0], i % 5 ? 0.25 : 0.6); c.beginPath(); c.moveTo(cx + cos(a) * rd * 1.12, cy + sin(a) * rd * 1.12); c.lineTo(cx + cos(a) * rd * (1.12 - l), cy + sin(a) * rd * (1.12 - l)); c.stroke(); }
    add(c, true); c.lineCap = 'butt';
    for (i = 0; i < segs; i++) { var a0 = i / segs * TAU - PI / 2 + 0.02, a1 = (i + 1) / segs * TAU - PI / 2 - 0.02, on = i < lit; c.strokeStyle = on ? rgba(i > lit - 4 ? P[1] : P[0], 0.85) : rgba(P[0], 0.1); c.lineWidth = lw * 4; c.beginPath(); c.arc(cx, cy, rd, a0, a1); c.stroke(); }
    glow(c, cx, cy, rd * 1.3, P[0], 0.18); add(c, false);
    var bw = u * 0.46, bh = u * 0.38, bx = cx - bw / 2, by = cy - bh * 0.28, sr = bw * 0.3;
    c.lineCap = 'round'; c.strokeStyle = rgba(P[0], 0.95); c.lineWidth = u * 0.045; c.beginPath(); c.moveTo(cx - sr, by + 2); c.lineTo(cx - sr, by - bh * 0.32); c.arc(cx, by - bh * 0.32, sr, PI, 0); c.lineTo(cx + sr, by + 2); c.stroke();
    c.strokeStyle = '#06101E'; c.lineWidth = u * 0.016; c.stroke();
    rr(c, bx, by, bw, bh, u * 0.05); c.fillStyle = '#081426'; c.fill();
    c.save(); rr(c, bx, by, bw, bh, u * 0.05); c.clip();
    var hr = u * 0.028, hx = hr * Math.sqrt(3), hy = hr * 1.5, r2, q;
    for (r2 = 0; r2 * hy < bh + hr * 2; r2++) for (q = -1; q * hx < bw + hx; q++) {
      var px = bx + q * hx + (r2 % 2 ? hx / 2 : 0), py = by + r2 * hy, v = R();
      c.beginPath(); for (var k = 0; k < 6; k++) { var an = PI / 6 + k * PI / 3; c.lineTo(px + cos(an) * hr * 0.92, py + sin(an) * hr * 0.92); } c.closePath();
      c.fillStyle = rgba(v > 0.86 ? P[1] : P[0], v > 0.86 ? 0.55 : v * 0.16); c.fill(); c.strokeStyle = rgba(P[0], 0.28); c.lineWidth = lw * 0.7; c.stroke();
    }
    var gg = c.createLinearGradient(bx, by, bx + bw, by + bh); gg.addColorStop(0, 'rgba(255,255,255,.10)'); gg.addColorStop(0.5, 'rgba(255,255,255,0)'); c.fillStyle = gg; c.fillRect(bx, by, bw, bh);
    c.restore();
    rr(c, bx, by, bw, bh, u * 0.05); c.strokeStyle = rgba(P[0], 0.95); c.lineWidth = lw * 2.2; c.stroke();
    add(c, true); glow(c, cx, by + bh * 0.45, u * 0.12, P[1], 0.6); add(c, false);
    dot(c, cx, by + bh * 0.4, u * 0.038, '#02060E'); c.beginPath(); c.moveTo(cx - u * 0.016, by + bh * 0.42); c.lineTo(cx + u * 0.016, by + bh * 0.42); c.lineTo(cx + u * 0.026, by + bh * 0.72); c.lineTo(cx - u * 0.026, by + bh * 0.72); c.closePath(); c.fill();
    c.strokeStyle = rgba(P[1], 0.9); c.lineWidth = lw * 1.3; c.beginPath(); c.arc(cx, by + bh * 0.4, u * 0.038, 0, TAU); c.stroke();
  };

  /* learning brain: a neuron with branching dendrites, myelinated axon, synaptic sparks, forgetting curves */
  M.brain = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, i;
    c.save(); c.lineWidth = lw * 1.4;
    for (var s = 0; s < 3; s++) {
      c.strokeStyle = rgba(P[2], 0.22 - s * 0.05); c.beginPath(); var x = F.x - u * 1.5, base = F.y + u * (0.62 + s * 0.08), lvl = 1, step = u * (0.42 + s * 0.12);
      c.moveTo(x, base - u * 0.32);
      while (x < F.x + u * 1.6) { for (var t = 0; t <= 1; t += 0.05) c.lineTo(x + t * step, base - u * 0.32 * Math.exp(-t * 2.2 / lvl)); x += step; lvl *= 1.7; c.lineTo(x, base - u * 0.32); }
      c.stroke();
    }
    c.restore();
    function branch(x, y, ang, len, w, depth, col) {
      var ex = x + cos(ang) * len, ey = y + sin(ang) * len, mx = (x + ex) / 2 + (R() - 0.5) * len * 0.5, my = (y + ey) / 2 + (R() - 0.5) * len * 0.5;
      c.strokeStyle = col; c.lineWidth = max(w, lw * 0.5); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
      if (depth <= 0) { add(c, true); glow(c, ex, ey, u * 0.03, P[2], 0.6); add(c, false); return; }
      var n = R() < 0.7 ? 2 : 3;
      for (var k = 0; k < n; k++) branch(ex, ey, ang + (R() - 0.5) * 1.3, len * (0.62 + R() * 0.2), w * 0.66, depth - 1, col);
    }
    function neuron(x, y, sc, alpha, axonAng) {
      c.save(); c.globalAlpha = alpha; c.lineCap = 'round';
      var g = c.createLinearGradient(x - u * sc * 0.6, y - u * sc * 0.6, x + u * sc * 0.6, y + u * sc * 0.6); g.addColorStop(0, P[0]); g.addColorStop(1, P[1]);
      for (var k = 0; k < 7; k++) { var a = k / 7 * TAU + R() * 0.5; if (Math.abs(((a - axonAng + PI * 3) % TAU) - PI) < 0.5) continue; branch(x, y, a, u * sc * (0.17 + R() * 0.07), u * sc * 0.032, 3, g); }
      var ax = x, ay = y, ang = axonAng, segs = 9;
      for (k = 0; k < segs; k++) {
        var nx = ax + cos(ang) * u * sc * 0.11, ny = ay + sin(ang) * u * sc * 0.11;
        c.strokeStyle = rgba(P[0], 0.9); c.lineWidth = u * sc * 0.012; c.beginPath(); c.moveTo(ax, ay); c.lineTo(nx, ny); c.stroke();
        if (k > 0 && k < segs - 1) { c.save(); c.translate((ax + nx) / 2, (ay + ny) / 2); c.rotate(ang); rr(c, -u * sc * 0.042, -u * sc * 0.016, u * sc * 0.084, u * sc * 0.032, u * sc * 0.015); c.fillStyle = rgba(P[1], 0.75); c.fill(); c.restore(); }
        ax = nx; ay = ny; ang += (R() - 0.5) * 0.35;
      }
      for (k = 0; k < 4; k++) branch(ax, ay, ang + (R() - 0.5) * 1.6, u * sc * 0.1, u * sc * 0.012, 1, rgba(P[2], 0.9));
      add(c, true); glow(c, x, y, u * sc * 0.36, P[0], 0.45); add(c, false);
      var sg = c.createRadialGradient(x - u * sc * 0.02, y - u * sc * 0.02, 0, x, y, u * sc * 0.065); sg.addColorStop(0, '#FFFFFF'); sg.addColorStop(0.35, P[0]); sg.addColorStop(1, P[1]);
      dot(c, x, y, u * sc * 0.065, sg); c.restore();
    }
    neuron(F.x + u * 0.75, F.y - u * 0.35, 0.55, 0.35, PI * 0.8);
    neuron(F.x - u * 0.85, F.y + u * 0.25, 0.5, 0.3, -PI * 0.2);
    neuron(F.x, F.y - u * 0.02, 1, 1, PI * 0.15 + R() * 0.3);
    add(c, true); for (i = 0; i < 40; i++) glow(c, F.x + (R() - 0.5) * u * 2.4, F.y + (R() - 0.5) * u * 1.2, u * 0.012 * (1 + R() * 2), R() < 0.5 ? P[0] : P[2], 0.6); add(c, false);
  };

  /* another planet: lit Mars with craters and ice cap, orbits around the Sun, a transfer arc and a spacecraft */
  M.space = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, i;
    var sx = F.x + u * 0.85, sy = F.y - u * 0.42;
    add(c, true); glow(c, sx, sy, u * 0.9, '#FFB36B', 0.35); glow(c, sx, sy, u * 0.18, '#FFF2D6', 0.95); add(c, false);
    dot(c, sx, sy, u * 0.04, '#FFF8EC');
    c.save(); c.translate(sx, sy); c.rotate(-0.22);
    var a1 = u * 0.62, a2 = u * 0.95, e1 = 0.32;
    c.lineWidth = lw * 1.1; c.strokeStyle = rgba(P[2], 0.45); c.beginPath(); c.ellipse(0, 0, a1, a1 * e1, 0, 0, TAU); c.stroke();
    c.strokeStyle = rgba(P[0], 0.45); c.beginPath(); c.ellipse(0, 0, a2, a2 * e1, 0, 0, TAU); c.stroke();
    var ea = PI * 0.78, ma = ea + PI;
    c.setLineDash([lw * 5, lw * 4]); c.strokeStyle = rgba('#FFFFFF', 0.7); c.lineWidth = lw * 1.4;
    var ta = (a1 + a2) / 2, tc = (a2 - a1) / 2; c.beginPath();
    for (i = 0; i <= 60; i++) { var th2 = ea + i / 60 * PI, rx = cos(th2) * ta - cos(ea) * tc, ry = sin(th2) * ta * e1; c.lineTo(rx, ry); }
    c.stroke(); c.setLineDash([]);
    var ex = cos(ea) * a1, ey = sin(ea) * a1 * e1, mx = cos(ma) * a2, my = sin(ma) * a2 * e1;
    add(c, true); glow(c, ex, ey, u * 0.07, '#5B9BFF', 0.9); glow(c, mx, my, u * 0.06, P[0], 0.8); add(c, false);
    dot(c, ex, ey, u * 0.016, '#9CC8FF'); dot(c, mx, my, u * 0.013, P[0]);
    var ct = ea + PI * 0.42, crx = cos(ct) * ta - cos(ea) * tc, cry = sin(ct) * ta * e1;
    add(c, true); glow(c, crx, cry, u * 0.05, '#FFFFFF', 0.9); add(c, false);
    c.restore();
    var px = F.x - u * 0.3, py = F.y + u * 0.14, pr = u * 0.42, ld = Math.atan2(sy - py, sx - px);
    add(c, true); glow(c, px, py, pr * 1.45, '#FF7A4E', 0.22); add(c, false);
    c.save(); c.beginPath(); c.arc(px, py, pr, 0, TAU); c.clip();
    var g = c.createRadialGradient(px + cos(ld) * pr * 0.45, py + sin(ld) * pr * 0.45, pr * 0.05, px, py, pr * 1.05);
    g.addColorStop(0, '#F7A273'); g.addColorStop(0.45, '#C65A32'); g.addColorStop(0.85, '#5E2412'); g.addColorStop(1, '#2A0E06'); c.fillStyle = g; c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    for (i = 0; i < 9; i++) { var by = py - pr + (i + R()) / 9 * pr * 2; c.fillStyle = rgba(i % 2 ? '#7A2E16' : '#E58A5C', 0.1 + R() * 0.12); c.beginPath(); c.ellipse(px + (R() - 0.5) * pr * 0.4, by, pr * (0.6 + R() * 0.6), pr * (0.04 + R() * 0.06), (R() - 0.5) * 0.3, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(70,18,8,.35)'; c.beginPath(); c.ellipse(px - pr * 0.1, py + pr * 0.05, pr * 0.55, pr * 0.07, -0.08, 0, TAU); c.fill();
    for (i = 0; i < 38; i++) {
      var ca = R() * TAU, cd = Math.sqrt(R()) * pr * 0.95, cx2 = px + cos(ca) * cd, cy2 = py + sin(ca) * cd, cr = pr * (0.008 + R() * R() * 0.06), fs = Math.sqrt(max(0.05, 1 - (cd / pr) * (cd / pr)));
      c.fillStyle = 'rgba(40,10,4,.24)'; c.beginPath(); c.ellipse(cx2, cy2, cr, cr * fs, ca, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,190,150,.22)'; c.lineWidth = max(lw * 0.6, cr * 0.18); c.beginPath(); c.ellipse(cx2 + cos(ld) * cr * 0.15, cy2 + sin(ld) * cr * 0.15, cr, cr * fs, ca, ld - 1.2, ld + 1.2); c.stroke();
    }
    var cap = c.createRadialGradient(px, py - pr * 0.92, 0, px, py - pr * 0.92, pr * 0.32); cap.addColorStop(0, 'rgba(255,250,245,.95)'); cap.addColorStop(0.6, 'rgba(255,240,230,.55)'); cap.addColorStop(1, 'rgba(255,240,230,0)');
    c.fillStyle = cap; c.fillRect(px - pr, py - pr * 1.3, pr * 2, pr * 0.8);
    var sh = c.createLinearGradient(px + cos(ld) * pr, py + sin(ld) * pr, px - cos(ld) * pr, py - sin(ld) * pr); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.55, 'rgba(0,0,0,.18)'); sh.addColorStop(1, 'rgba(2,2,8,.9)'); c.fillStyle = sh; c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    c.restore();
    add(c, true); c.lineWidth = pr * 0.035; c.strokeStyle = 'rgba(255,150,110,.55)'; c.beginPath(); c.arc(px, py, pr * 1.01, ld - 1.3, ld + 1.3); c.stroke(); add(c, false);
  };

  /* future architecture: a parametric tower whose floor plates twist as they rise */
  M.arch = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, i, k, n = 26, base = F.y + u * 0.47, top = F.y - u * 0.4, tw = (0.9 + R() * 0.6) * PI / n;
    c.save(); c.globalAlpha = 0.85;
    for (i = 0; i < 14; i++) { var bx = F.x + (i - 7) * u * 0.22 + (R() - 0.5) * u * 0.1, bh = u * (0.12 + R() * 0.32), bw = u * (0.08 + R() * 0.12); c.fillStyle = '#0D1838'; c.fillRect(bx, base - bh, bw, bh); c.fillStyle = rgba(P[2], 0.18); c.fillRect(bx, base - bh, bw, lw); }
    c.restore();
    var gg = c.createLinearGradient(0, base, 0, base + u * 0.45); gg.addColorStop(0, rgba(P[0], 0.18)); gg.addColorStop(1, rgba(P[0], 0)); c.fillStyle = gg; c.fillRect(F.x - u * 1.8, base, u * 3.6, u * 0.45);
    c.strokeStyle = rgba(P[0], 0.12); c.lineWidth = lw * 0.7;
    for (i = 0; i < 9; i++) { var yy = base + Math.pow(i / 8, 1.6) * u * 0.42; c.beginPath(); c.moveTo(F.x - u * 1.8, yy); c.lineTo(F.x + u * 1.8, yy); c.stroke(); }
    var floors = [];
    for (i = 0; i <= n; i++) {
      var t = i / n, y = base + (top - base) * t, hs = u * (0.2 - 0.06 * t + 0.03 * sin(t * PI)), ang = i * tw, pts = [];
      for (k = 0; k < 8; k++) { var a = ang + k * PI / 4 + PI / 8, rad = hs * (k % 2 ? 0.93 : 1.08); pts.push({ x: F.x + cos(a) * rad, y: y + sin(a) * rad * 0.3, z: sin(a) }); }
      floors.push(pts);
    }
    add(c, true); glow(c, F.x, F.y, u * 0.75, P[0], 0.2); add(c, false);
    for (i = 0; i < floors.length; i++) {
      var f = floors[i], tt = i / n;
      c.beginPath(); f.forEach(function (p, j) { j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }); c.closePath();
      c.fillStyle = rgba('#0D1733', 0.78); c.fill();
      c.strokeStyle = rgba(i % 5 === 0 ? P[1] : P[0], 0.45 + tt * 0.4); c.lineWidth = lw * (i % 5 === 0 ? 1.6 : 1); c.stroke();
      if (i > 0) {
        var g2 = floors[i - 1];
        for (k = 0; k < 8; k++) if (f[k].z > -0.2) { c.strokeStyle = rgba(P[1], 0.18 + f[k].z * 0.25); c.lineWidth = lw * 0.8; c.beginPath(); c.moveTo(g2[k].x, g2[k].y); c.lineTo(f[k].x, f[k].y); c.stroke(); }
        add(c, true);
        for (k = 0; k < 8; k++) if (f[k].z > 0 && R() < 0.55) { var k2 = (k + 1) % 8, m = 0.2 + R() * 0.6; c.strokeStyle = rgba(R() < 0.75 ? '#FFC98A' : '#9CC8FF', 0.35 + R() * 0.5); c.lineWidth = lw * 1.6; c.beginPath(); c.moveTo(f[k].x + (f[k2].x - f[k].x) * m, f[k].y + (f[k2].y - f[k].y) * m - lw * 2); c.lineTo(f[k].x + (f[k2].x - f[k].x) * (m + 0.15), f[k].y + (f[k2].y - f[k].y) * (m + 0.15) - lw * 2); c.stroke(); }
        add(c, false);
      }
    }
    add(c, true); var tp = floors[n]; glow(c, F.x, tp[0].y - u * 0.02, u * 0.14, P[1], 0.7); add(c, false);
    c.strokeStyle = rgba(P[1], 0.9); c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(F.x, top - u * 0.02); c.lineTo(F.x, top - u * 0.16); c.stroke(); dot(c, F.x, top - u * 0.16, lw * 2.4, '#FF6B5A');
  };

  /* algorithms and feeds: a crowd of posts flows through a ranking lens into an ordered feed */
  M.algo = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, i, lens = { x: F.x - u * 0.14, y: F.y }, pts = [];
    for (i = 0; i < 170; i++) { var a = R() * TAU, d = Math.sqrt(R()) * u * 0.42; pts.push({ x: F.x - u * 0.9 + cos(a) * d * 1.1, y: F.y + sin(a) * d, r: u * (0.006 + R() * 0.012), col: P[(R() * 3) | 0], s: R() }); }
    pts.forEach(function (p) {
      if (p.s < 0.25) { var g = c.createLinearGradient(p.x, p.y, lens.x, lens.y); g.addColorStop(0, rgba(p.col, 0.0)); g.addColorStop(1, rgba(p.col, 0.45)); c.strokeStyle = g; c.lineWidth = lw * 0.9; c.beginPath(); c.moveTo(p.x, p.y); c.bezierCurveTo(p.x + u * 0.25, p.y, lens.x - u * 0.25, lens.y + (p.y - lens.y) * 0.2, lens.x, lens.y); c.stroke(); }
      dot(c, p.x, p.y, p.r, rgba(p.col, 0.35 + p.s * 0.5));
    });
    add(c, true); glow(c, lens.x, lens.y, u * 0.26, P[1], 0.55);
    for (i = 0; i < 3; i++) { c.strokeStyle = rgba(i === 1 ? P[1] : P[0], 0.7 - i * 0.18); c.lineWidth = lw * (2.4 - i * 0.6); c.beginPath(); c.arc(lens.x, lens.y, u * (0.1 + i * 0.035), 0, TAU); c.stroke(); }
    add(c, false); dot(c, lens.x, lens.y, u * 0.04, '#FFFFFF');
    var cx = F.x + u * 0.24, cw = u * 0.6, chh = u * 0.15, gap = u * 0.035, y0 = F.y - (5 * chh + 4 * gap) / 2;
    for (i = 0; i < 5; i++) {
      var y = y0 + i * (chh + gap), sc = 1 - i * 0.18, col = P[i % 3], g2 = c.createLinearGradient(lens.x, lens.y, cx, y + chh / 2);
      g2.addColorStop(0, rgba(P[1], 0.6)); g2.addColorStop(1, rgba(col, 0.1)); c.strokeStyle = g2; c.lineWidth = lw * 1.2; c.beginPath(); c.moveTo(lens.x, lens.y); c.bezierCurveTo(lens.x + u * 0.2, lens.y, cx - u * 0.2, y + chh / 2, cx, y + chh / 2); c.stroke();
      rr(c, cx, y, cw, chh, u * 0.03); c.fillStyle = i === 0 ? '#122248' : '#0C1630'; c.fill(); c.strokeStyle = rgba(col, i === 0 ? 0.95 : 0.4); c.lineWidth = lw * (i === 0 ? 1.8 : 1); c.stroke();
      dot(c, cx + u * 0.07, y + chh / 2, u * 0.035, rgba(col, 0.9));
      c.fillStyle = 'rgba(230,240,255,.55)'; rr(c, cx + u * 0.13, y + chh * 0.28, cw * (0.45 + R() * 0.25), chh * 0.16, chh * 0.08); c.fill();
      c.fillStyle = 'rgba(230,240,255,.25)'; rr(c, cx + u * 0.13, y + chh * 0.56, cw * (0.3 + R() * 0.2), chh * 0.14, chh * 0.07); c.fill();
      c.fillStyle = rgba(col, 0.9); rr(c, cx + cw - u * 0.03 - cw * 0.16 * sc, y + chh * 0.4, cw * 0.16 * sc, chh * 0.2, chh * 0.1); c.fill();
      if (i === 0) { add(c, true); glow(c, cx + cw / 2, y + chh / 2, cw * 0.6, col, 0.18); add(c, false); }
    }
  };

  /* clean energy: sunrise, wind turbines on the horizon, perspective solar field, the daily power curve */
  M.energy = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, i, j, hz = F.y + u * 0.12, sx = F.x + u * 0.45, sy = hz - u * 0.18;
    var sky = c.createLinearGradient(0, hz - u, 0, hz); sky.addColorStop(0, 'rgba(0,0,0,0)'); sky.addColorStop(1, rgba(P[1], 0.16)); c.fillStyle = sky; c.fillRect(0, hz - u, F.w, u);
    add(c, true); glow(c, sx, sy, u * 0.95, '#FFB36B', 0.3); glow(c, sx, sy, u * 0.3, P[1], 0.75);
    for (i = 0; i < 24; i++) { var a = PI + i / 23 * PI, l = u * (0.3 + (i % 2) * 0.12); c.strokeStyle = rgba(P[1], 0.16); c.lineWidth = lw * 1.2; c.beginPath(); c.moveTo(sx + cos(a) * u * 0.2, sy + sin(a) * u * 0.2); c.lineTo(sx + cos(a) * (u * 0.2 + l), sy + sin(a) * (u * 0.2 + l)); c.stroke(); }
    add(c, false);
    var sun = c.createRadialGradient(sx, sy, 0, sx, sy, u * 0.16); sun.addColorStop(0, '#FFFBEA'); sun.addColorStop(0.6, '#FFE08A'); sun.addColorStop(1, '#FFB36B');
    c.save(); c.beginPath(); c.rect(0, 0, F.w, hz); c.clip(); dot(c, sx, sy, u * 0.16, sun); c.restore();
    c.strokeStyle = rgba(P[1], 0.5); c.lineWidth = lw; c.beginPath(); c.moveTo(0, hz); c.lineTo(F.w, hz); c.stroke();
    c.save(); add(c, true); c.lineWidth = lw * 2; c.strokeStyle = rgba(P[0], 0.85); c.beginPath();
    for (i = 0; i <= 80; i++) { var t = i / 80, x = F.x - u * 1.3 + t * u * 2.6, y = hz - u * 0.06 - Math.exp(-Math.pow((t - 0.55) / 0.17, 2)) * u * 0.42; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.restore();
    [[-0.8, 0.34], [-0.55, 0.46], [-0.3, 0.3]].forEach(function (tb) {
      var x = F.x + tb[0] * u, ht = u * tb[1], hy = hz - ht, bl = ht * 0.48, rot = R() * TAU;
      c.fillStyle = '#DCE6F7'; c.beginPath(); c.moveTo(x - ht * 0.018, hz); c.lineTo(x + ht * 0.018, hz); c.lineTo(x + ht * 0.008, hy); c.lineTo(x - ht * 0.008, hy); c.closePath(); c.fill();
      for (var b = 0; b < 3; b++) { var ba = rot + b * TAU / 3; c.save(); c.translate(x, hy); c.rotate(ba); c.beginPath(); c.moveTo(0, -ht * 0.012); c.quadraticCurveTo(bl * 0.4, -ht * 0.035, bl, 0); c.quadraticCurveTo(bl * 0.4, ht * 0.012, 0, ht * 0.012); c.closePath(); c.fillStyle = 'rgba(232,240,252,.95)'; c.fill(); c.restore(); }
      dot(c, x, hy, ht * 0.022, '#FFFFFF'); add(c, true); glow(c, x, hy, ht * 0.08, '#FF6B5A', 0.5); add(c, false);
    });
    var rows = 4, cols = 7;
    for (j = rows - 1; j >= 0; j--) for (i = 0; i < cols; i++) {
      var d0 = 0.1 + j * 0.17, d1 = d0 + 0.13, y0 = hz + u * (0.04 + Math.pow(d0, 1.3) * 0.5), y1 = hz + u * (0.04 + Math.pow(d1, 1.3) * 0.5), sp0 = 0.5 + d0 * 1.6, sp1 = 0.5 + d1 * 1.6;
      var xl0 = F.x + (i - cols / 2) * u * 0.16 * sp0 + u * 0.15, xr0 = xl0 + u * 0.14 * sp0, xl1 = F.x + (i - cols / 2) * u * 0.16 * sp1 + u * 0.15, xr1 = xl1 + u * 0.14 * sp1;
      c.beginPath(); c.moveTo(xl0, y0); c.lineTo(xr0, y0); c.lineTo(xr1, y1); c.lineTo(xl1, y1); c.closePath();
      var pg = c.createLinearGradient(xl0, y0, xr1, y1); pg.addColorStop(0, '#1C3F7A'); pg.addColorStop(0.5, '#0D2550'); pg.addColorStop(1, '#081631'); c.fillStyle = pg; c.fill();
      c.strokeStyle = rgba(P[2], 0.6); c.lineWidth = lw; c.stroke();
      c.strokeStyle = rgba(P[2], 0.22); c.lineWidth = lw * 0.6;
      for (var q = 1; q < 4; q++) { var tq = q / 4; c.beginPath(); c.moveTo(xl0 + (xr0 - xl0) * tq, y0); c.lineTo(xl1 + (xr1 - xl1) * tq, y1); c.stroke(); }
      for (q = 1; q < 3; q++) { var tv = q / 3, ya = y0 + (y1 - y0) * tv; c.beginPath(); c.moveTo(xl0 + (xl1 - xl0) * tv, ya); c.lineTo(xr0 + (xr1 - xr0) * tv, ya); c.stroke(); }
      add(c, true); var hl = c.createLinearGradient(xl0, y0, xr1, y1); hl.addColorStop(0.3, 'rgba(255,220,160,0)'); hl.addColorStop(0.5, 'rgba(255,220,160,' + (0.08 + R() * 0.12).toFixed(3) + ')'); hl.addColorStop(0.7, 'rgba(255,220,160,0)'); c.fillStyle = hl; c.beginPath(); c.moveTo(xl0, y0); c.lineTo(xr0, y0); c.lineTo(xr1, y1); c.lineTo(xl1, y1); c.closePath(); c.fill(); add(c, false);
    }
  };

  /* from idea to invention: a glowing bulb whose filament feeds a nine-step readiness staircase */
  M.idea = function (F) {
    var c = F.c, u = F.u, R = F.R, P = F.P, lw = F.lw, i, bx = F.x - u * 0.42, by = F.y - u * 0.14, br = u * 0.28;
    var sx = F.x - u * 0.02, sb = F.y + u * 0.5, sw = u * 0.095, lit = 6 + (R() * 3 | 0);
    for (i = 0; i < 9; i++) {
      var hgt = u * (0.1 + i * 0.095), x = sx + i * sw * 1.02, on = i < lit;
      var g = c.createLinearGradient(0, sb - hgt, 0, sb); g.addColorStop(0, on ? rgba(i === lit - 1 ? P[0] : P[1], 0.9) : 'rgba(120,140,180,.18)'); g.addColorStop(1, on ? rgba(P[1], 0.12) : 'rgba(120,140,180,.04)');
      rr(c, x, sb - hgt, sw * 0.86, hgt, u * 0.018); c.fillStyle = g; c.fill(); c.strokeStyle = on ? rgba(P[0], 0.7) : 'rgba(150,170,210,.25)'; c.lineWidth = lw; c.stroke();
      dot(c, x + sw * 0.43, sb - hgt - u * 0.03, u * 0.009, on ? '#FFFFFF' : 'rgba(200,210,235,.35)');
    }
    add(c, true); c.setLineDash([lw * 4, lw * 3]); c.strokeStyle = rgba(P[0], 0.75); c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(bx, by + br * 1.6);
    c.bezierCurveTo(bx + u * 0.05, sb + u * 0.05, sx - u * 0.05, sb - u * 0.1, sx + sw * 0.43, sb - u * 0.15);
    for (i = 1; i < lit; i++) c.lineTo(sx + i * sw * 1.02 + sw * 0.43, sb - u * (0.1 + i * 0.095) - u * 0.03);
    c.stroke(); c.setLineDash([]);
    glow(c, bx, by, br * 2.6, P[0], 0.35); glow(c, bx, by, br * 0.9, '#FFF1C2', 0.6);
    for (i = 0; i < 16; i++) { var a = i / 16 * TAU, r0 = br * 1.25, r1 = br * (1.55 + (i % 2) * 0.25); c.strokeStyle = rgba(P[0], 0.45); c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(bx + cos(a) * r0, by + sin(a) * r0); c.lineTo(bx + cos(a) * r1, by + sin(a) * r1); c.stroke(); }
    add(c, false);
    var glass = c.createRadialGradient(bx - br * 0.3, by - br * 0.35, br * 0.1, bx, by, br * 1.1); glass.addColorStop(0, 'rgba(255,248,220,.38)'); glass.addColorStop(0.7, 'rgba(255,214,107,.10)'); glass.addColorStop(1, 'rgba(255,214,107,.04)');
    c.beginPath(); c.arc(bx, by, br, PI * 0.78, PI * 2.22); c.bezierCurveTo(bx + br * 0.55, by + br * 0.95, bx + br * 0.38, by + br * 1.05, bx + br * 0.38, by + br * 1.32); c.lineTo(bx - br * 0.38, by + br * 1.32); c.bezierCurveTo(bx - br * 0.38, by + br * 1.05, bx - br * 0.55, by + br * 0.95, bx + cos(PI * 0.78) * br, by + sin(PI * 0.78) * br); c.closePath();
    c.fillStyle = glass; c.fill(); c.strokeStyle = rgba(P[0], 0.95); c.lineWidth = lw * 2.4; c.stroke();
    add(c, true); c.strokeStyle = '#FFF6D8'; c.lineWidth = lw * 1.8; c.beginPath(); c.moveTo(bx - br * 0.18, by + br * 1.3); c.lineTo(bx - br * 0.2, by + br * 0.2);
    for (i = 0; i <= 40; i++) { var t = i / 40; c.lineTo(bx - br * 0.2 + t * br * 0.4, by + br * 0.2 - sin(t * PI * 8) * br * 0.08 - sin(t * PI) * br * 0.12); }
    c.lineTo(bx + br * 0.18, by + br * 1.3); c.stroke(); glow(c, bx, by + br * 0.1, br * 0.5, '#FFFFFF', 0.55); add(c, false);
    for (i = 0; i < 4; i++) { var yb = by + br * (1.36 + i * 0.13); rr(c, bx - br * 0.36, yb, br * 0.72, br * 0.1, br * 0.05); c.fillStyle = i % 2 ? '#8E98AE' : '#C9D1E2'; c.fill(); }
    add(c, true); for (i = 0; i < 26; i++) { var ra = R() * TAU, rd = br * (1.4 + R() * 1.8); glow(c, bx + cos(ra) * rd, by + sin(ra) * rd, u * 0.012 * (1 + R() * 2), R() < 0.5 ? P[0] : P[2], 0.7); } add(c, false);
  };

  /* AI video: the five frames of one clip come out of the noise together, above the timeline of clips */
  M.video = function (F) {
    var c = F.c, R = F.R, P = F.P, lw = F.lw, i, j, hts = [];
    // beside the title (the wide banner) the scene is a little smaller and further from it, and the play badge goes to the far
    // corner of the last frame, so the bright frame and the badge stay clear of the first line of a long title
    var wide = F.b === 1, u = F.u * (wide ? 0.9 : 1), ox = F.x - (wide ? F.u * 0.23 : 0), oy = F.y - (wide ? F.u * 0.04 : 0);
    for (j = 0; j < 12; j++) hts.push(0.2 + R() * 0.36);
    for (i = 0; i < 5; i++) {
      var t = i / 4, fw = u * (0.5 + t * 0.42), fh = fw * 9 / 16, sh = t * fw * 0.05;
      c.save(); c.translate(ox - u * 0.66 + t * u, oy - u * 0.15 + (1 - t) * u * 0.06); c.rotate(-0.1 + t * 0.06); c.translate(-fw / 2, -fh / 2);
      c.save(); rr(c, 0, 0, fw, fh, u * 0.02); c.clip();
      c.fillStyle = '#080C1E'; c.fillRect(0, 0, fw, fh);
      // the picture, clearer in every later frame: dawn sky, sun, skyline (the same towers in all five, moved a little)
      c.globalAlpha = t * t;
      var sky = c.createLinearGradient(0, 0, 0, fh * 0.7); sky.addColorStop(0, '#16235C'); sky.addColorStop(0.62, rgba(P[0], 0.95)); sky.addColorStop(1, P[1]); c.fillStyle = sky; c.fillRect(0, 0, fw, fh * 0.7);
      c.fillStyle = '#2A1B44'; c.fillRect(0, fh * 0.7, fw, fh * 0.3);
      add(c, true); glow(c, fw * 0.6, fh * 0.52, fh * 0.6, '#FFE9B0', 0.55); add(c, false); dot(c, fw * 0.6, fh * 0.52, fh * 0.12, '#FFF6D6');
      c.fillStyle = '#11122E'; for (j = 0; j < 12; j++) c.fillRect(fw * (j / 11) - fw * 0.06 - sh, fh * (1 - hts[j]), fw * 0.07, fh * hts[j]);
      c.fillStyle = 'rgba(255,214,140,.85)'; for (j = 0; j < 12; j++) c.fillRect(fw * (j / 11) - fw * 0.04 - sh, fh * (1 - hts[j]) + fh * 0.06, fw * 0.03, fh * 0.03);
      c.globalAlpha = 1;
      // the noise every frame starts from
      for (j = 0; j < 320 * (1 - t) * (1 - t) + 6; j++) { var s = fw * (0.014 + R() * 0.016); c.fillStyle = rgba(P[(R() * 3) | 0], 0.2 + R() * 0.65); c.fillRect(R() * fw, R() * fh, s, s); }
      c.restore();
      rr(c, 0, 0, fw, fh, u * 0.02); c.strokeStyle = rgba(P[2], 0.3 + t * 0.65); c.lineWidth = lw * (1 + t * 1.2); c.stroke();
      if (i === 4) { var bx = wide ? 0 : fw; add(c, true); glow(c, bx, fh, u * 0.2, P[1], 0.5); add(c, false); dot(c, bx, fh, u * 0.075, 'rgba(4,6,13,.82)'); c.strokeStyle = P[1]; c.lineWidth = lw * 2; c.stroke(); c.beginPath(); c.moveTo(bx - u * 0.024, fh - u * 0.036); c.lineTo(bx + u * 0.04, fh); c.lineTo(bx - u * 0.024, fh + u * 0.036); c.closePath(); c.fillStyle = '#FFFFFF'; c.fill(); }
      c.restore();
    }
    // the timeline: four clips, the last one shorter, and a playhead
    var x0 = ox - u * 0.9, y0 = oy + u * 0.34, th = u * 0.07, lens = [0.46, 0.46, 0.46, 0.3], x = x0;
    for (i = 0; i < 4; i++) { var bw = u * lens[i]; rr(c, x, y0, bw - u * 0.014, th, u * 0.016); c.fillStyle = rgba(P[i % 2 ? 0 : 2], 0.16); c.fill(); c.strokeStyle = rgba(P[i % 2 ? 0 : 2], 0.8); c.lineWidth = lw; c.stroke(); for (j = 1; j < 8 * lens[i] / 0.46; j++) { c.strokeStyle = rgba(P[i % 2 ? 0 : 2], 0.3); c.beginPath(); c.moveTo(x + j * u * 0.0575, y0 + th * 0.62); c.lineTo(x + j * u * 0.0575, y0 + th); c.stroke(); } x += bw; }
    var px = x0 + u * 1.06; add(c, true); glow(c, px, y0 + th / 2, u * 0.16, P[1], 0.55); add(c, false);
    c.strokeStyle = P[1]; c.lineWidth = lw * 2.2; c.beginPath(); c.moveTo(px, y0 - u * 0.035); c.lineTo(px, y0 + th + u * 0.035); c.stroke(); dot(c, px, y0 - u * 0.035, u * 0.016, '#FFF1C2');
  };

  M.def = function (F) { var c = F.c, u = F.u; add(c, true); for (var i = 1; i < 8; i++) { c.strokeStyle = rgba(F.P[i % 3], 0.5 / i); c.lineWidth = F.lw * 1.4; c.beginPath(); c.ellipse(F.x, F.y, u * 0.12 * i, u * 0.05 * i, -0.3, 0, TAU); c.stroke(); } glow(c, F.x, F.y, u * 0.4, F.P[0], 0.5); add(c, false); };

  var grain = null;
  function finish(F) {
    var c = F.c, w = F.w, h = F.h;
    var v = c.createRadialGradient(F.x, F.y, min(w, h) * 0.25, w / 2, h / 2, max(w, h) * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(1,2,6,.62)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
    if (!grain) { grain = D.createElement('canvas'); grain.width = grain.height = 128; var g = grain.getContext('2d'), id = g.createImageData(128, 128), d = id.data, r = rng(77); for (var i = 0; i < d.length; i += 4) { var n = r() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = n; d[i + 3] = 14; } g.putImageData(id, 0, 0); }
    c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(0, 0, w, h);
  }

  /* draw(canvas, topic, seed, {banner, area, w, h, dpr}) */
  AN.cover = function (cv, topic, seed, o) {
    o = o || {};
    var r = cv.getBoundingClientRect(), cw = o.w || r.width || cv.clientWidth || 640, ch = o.h || r.height || cv.clientHeight || 400;
    var dpr = o.dpr || min(W.devicePixelRatio || 1, o.banner ? 2 : 2.5), w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    if (w > 3840) { h = Math.round(h * 3840 / w); w = 3840; dpr = w / cw; }
    if (w < 2 || h < 2) return;
    cv.width = w; cv.height = h;
    var c = cv.getContext('2d'); if (!c) return;
    var key = PAL[topic] ? topic : 'def', R = rng(hash(key + ':' + seed)), fx = w / 2, fy = h / 2, u = min(w / 1.9, h * 0.9);
    var wide = o.banner && w > h * 1.25;
    if (wide) { fx = w * 0.3; fy = h * 0.42; u = min(w * 0.34, h * 0.62); }
    else if (o.banner) {
      fx = w / 2; fy = h * 0.32; u = min(w * 0.46, h * 0.36);
      // o.area = [top, bottom] in CSS pixels: the free band between the top bar and the text. A long title leaves a low band,
      // so the scene is centred in it and scaled to it (never below a size that still reads) instead of sitting behind the text.
      if (o.area) { var a0 = o.area[0] * dpr, band = max(0, o.area[1] * dpr - a0); fy = a0 + band / 2 + 8 * dpr; u = max(w * 0.3, min(w * 0.46, band * 0.95)); }
    }
    var F = { c: c, w: w, h: h, x: fx, y: fy, u: u, R: R, P: PAL[key], k: dpr, lw: max(dpr * 0.75, u * 0.0032), b: wide ? 1 : o.banner ? 2 : 0 };
    var g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#070B1C'); g.addColorStop(1, '#02040A'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    glow(c, fx, fy, u * 1.15, F.P[0], 0.2); glow(c, fx + u * 0.7, fy - u * 0.45, u * 0.95, F.P[1], 0.12);
    var n = Math.round(w * h / (o.banner ? 3000 : 2000));
    for (var i = 0; i < n; i++) { var a = R() * R() * 0.8, s = (R() < 0.04 ? 1.6 : 0.8) * dpr; c.fillStyle = 'rgba(220,232,255,' + a.toFixed(3) + ')'; c.fillRect(R() * w, R() * h, s, s); }
    c.lineCap = 'round'; c.lineJoin = 'round';
    try { M[key](F); } catch (e) { if (W.console) console.warn('[cover]', key, e); }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.setLineDash([]);
    finish(F);
    cv.setAttribute('data-drawn', key);
    // a 2D canvas whose GPU context was reset (driver update, sleep, a crashed GPU process) comes back empty
    if (!cv._anRestore) { cv._anRestore = 1; cv.addEventListener('contextrestored', function () { AN.cover(cv, topic, seed, o); }); }
  };
  AN.coverTopics = Object.keys(PAL).filter(function (k) { return k !== 'def'; });
  AN.glyph = glyph; AN.coverPalette = PAL;
})();
