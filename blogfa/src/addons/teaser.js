/* آینده‌نگار · the blog's 40-second introduction film, drawn and scored in the browser.
   The reader's toolkit (src/addons/addons.js) fetches this file only when a reader presses «ویدیوی معرفی», from the
   same pinned commit and with Subresource Integrity. Nothing plays by itself: the picture and the sound start only
   with the play button, the sound can be turned off, and captions and a transcript are always there.
   The film is the same code everywhere: tools/teaser.mjs draws it frame by frame with AN_TEASER.film and renders
   the music with an OfflineAudioContext to make the MP4 of the production package, so the file and the page match.
   Every random-looking detail comes from a seeded generator, so each frame is the same on every screen.
   Six scenes: a point of light, a learning network, a talking city, Earth to Mars, sunrise, and the title card with
   the creator's credit. The music: 96 BPM, 16 bars in D minor (Dm, Bb, F, C) ending on D major. */
(function () {
  'use strict';
  var W = window, D = document;

  /* ---------- the score's and the picture's timeline ---------- */
  var DUR = 40, BEAT = 60 / 96, BAR = BEAT * 4;
  var CUTS = [0, 6.5, 13, 19.8, 26.5, 33.5, DUR];
  // what the screen says, scene by scene
  var LINES = [
    { a: 1.4, b: 6.1, t: 'هر ایده، اول نقطه‌ای از نور است.' },
    { a: 7.3, b: 12.6, t: 'ماشین‌ها از مثال‌ها یاد می‌گیرند.' },
    { a: 14.0, b: 19.3, t: 'شهرها و اشیا با هم حرف می‌زنند.' },
    { a: 20.8, b: 26.0, t: 'از زمین تا مریخ، با کنجکاوی.' },
    { a: 27.4, b: 32.8, t: 'شب و روز وبلاگ، با ساعت شما.' }
  ];
  var TITLE = 'آینده‌نگار', SLOGAN = 'روایت انسان، ایده و فناوری', CREDIT = 'طراحی، مدیریت و نویسندگی: امیرحسین همتی', URL = 'ayandehnegar.blogfa.com';
  // the captions: the lines, and what is heard where nothing is said (the film has music and sounds, no voice)
  var CAPS = [
    { a: 0, b: 1.4, t: '[زنگی آرام؛ موسیقی ملایم آغاز می‌شود]' }
  ].concat(LINES.slice(0, 4), [
    { a: 27.4, b: 31.0, t: LINES[4].t },
    { a: 31.0, b: 33.5, t: '[صدایی اوج می‌گیرد]' },
    { a: 34.0, b: 39.6, t: TITLE + '؛ ' + SLOGAN + '. ' + CREDIT + '.' }
  ]);

  /* ---------- small tools ---------- */
  // mulberry32: the same numbers for the same seed, in every browser
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function cl(x, a, b) { return x < a ? a : x > b ? b : x; }
  function sm(x) { x = cl(x, 0, 1); return x * x * (3 - 2 * x); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function mix(c1, c2, k) { return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(lerp(c1[i], c2[i], k)); }).join(',') + ')'; }
  // how much of [a, b] is on screen at t, with soft edges of f seconds
  function win(t, a, b, f) { return Math.min(sm((t - a) / f), sm((b - t) / f)); }

  /* ---------- what every scene shares ---------- */
  var R = rng(1405);
  var STARS = [];
  for (var i = 0; i < 280; i++) STARS.push({ x: R() * 1920, y: R() * 1080, r: 0.4 + R() * 1.6, p: R() * 6.28, s: 0.6 + R() * 1.8 });
  // the learning network: four layers
  var NET = [], LAY = [4, 6, 6, 3];
  LAY.forEach(function (n, l) {
    for (var k = 0; k < n; k++) NET.push({ l: l, x: 520 + l * 300, y: 540 + (k - (n - 1) / 2) * 118 });
  });
  var PULSES = [];
  for (i = 0; i < 26; i++) {
    var path = [];
    for (var l = 0; l < LAY.length; l++) {
      var opts = NET.filter(function (n) { return n.l === l; });
      path.push(opts[Math.floor(R() * opts.length)]);
    }
    PULSES.push({ p: path, o: R() * 3, v: 0.55 + R() * 0.5 });
  }
  // the city: buildings, their windows, and links between rooftops
  var CITY = [], x0 = -20;
  while (x0 < 1940) {
    var bw = 70 + R() * 110, bh = 160 + R() * 360;
    CITY.push({ x: x0, w: bw, h: bh, win: rng(Math.floor(R() * 1e9)), ant: R() < 0.35 });
    x0 += bw + 6 + R() * 18;
  }
  var LINKS = [];
  for (i = 0; i < 9; i++) {
    var b1 = CITY[Math.floor(R() * CITY.length)], b2 = CITY[Math.floor(R() * CITY.length)];
    if (Math.abs(b1.x - b2.x) < 260) { i--; continue; }
    LINKS.push({ a: b1, b: b2, d: 1.2 + i * 0.45, v: 0.35 + R() * 0.3 });
  }

  /* ---------- drawing ---------- */
  var FONT = '"Vazirmatn", "Vazir", Tahoma, sans-serif';
  function sky(c, top, bottom) {
    var g = c.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, 0, 1920, 1080);
  }
  function stars(c, t, a) {
    if (a <= 0) return;
    c.fillStyle = '#fff';
    STARS.forEach(function (s) {
      c.globalAlpha = a * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.p + t * s.s)));
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.2832); c.fill();
    });
    c.globalAlpha = 1;
  }
  function glow(c, x, y, r, col, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
  }
  function ring(c, x, y, rx, ry, tilt, k, col, w) {
    if (k <= 0) return;
    c.save(); c.translate(x, y); c.rotate(tilt);
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + 6.2832 * cl(k, 0, 1)); c.stroke();
    c.restore();
  }
  function text(c, s, x, y, size, weight, col, a, ltr) {
    if (a <= 0) return;
    c.save();
    c.globalAlpha = a; c.font = weight + ' ' + size + 'px ' + FONT;
    c.direction = ltr ? 'ltr' : 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = size * 0.35; c.shadowOffsetY = size * 0.06;
    c.fillStyle = col; c.fillText(s, x, y);
    c.restore();
  }

  // 1 · a point of light, and an orbit around it
  function s1(c, t) {
    sky(c, '#04060f', '#0a1230'); stars(c, t, 1);
    var k = sm(t / 3.2), z = 1 + t * 0.012;
    c.save(); c.translate(960, 500); c.scale(z, z);
    glow(c, 0, 0, 60 + 260 * k, '255,190,120', 0.55 * k + 0.25);
    glow(c, 0, 0, 10 + 40 * k, '255,240,220', 1);
    ring(c, 0, 0, 260, 74, -0.28, (t - 2) / 2.2, 'rgba(120,200,255,.85)', 3);
    if (t > 2) {
      var a = -Math.PI / 2 + (t - 2) * 2.4;
      c.save(); c.rotate(-0.28);
      glow(c, Math.cos(a) * 260, Math.sin(a) * 74, 26, '150,220,255', sm((t - 2.2) / 0.6));
      c.restore();
    }
    c.restore();
  }
  // 2 · a network that learns: signals run from layer to layer
  function s2(c, t) {
    sky(c, '#050816', '#101a3c'); stars(c, t, 0.35);
    c.lineWidth = 1.4;
    NET.forEach(function (a) {
      NET.forEach(function (b) {
        if (b.l !== a.l + 1) return;
        c.strokeStyle = 'rgba(120,170,255,' + (0.16 * sm((t - a.l * 0.35) / 0.8)) + ')';
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      });
    });
    var lit = {};
    PULSES.forEach(function (p, n) {
      var u = (t * p.v + p.o) % 3; if (u > 2.6 || t < 1) return;
      var seg = Math.min(2, Math.floor(u)), f = u - seg, A = p.p[seg], B = p.p[seg + 1];
      var x = lerp(A.x, B.x, f), y = lerp(A.y, B.y, f);
      glow(c, x, y, 16, n % 3 ? '120,220,255' : '255,190,120', 0.9);
      lit[NET.indexOf(f < 0.2 ? A : f > 0.8 ? B : null)] = 1;
    });
    NET.forEach(function (n, j) {
      var a = sm((t - n.l * 0.35) / 0.8);
      glow(c, n.x, n.y, lit[j] ? 46 : 30, '110,180,255', a * (lit[j] ? 0.75 : 0.35));
      c.globalAlpha = a; c.fillStyle = lit[j] ? '#fff' : '#bcd6ff';
      c.beginPath(); c.arc(n.x, n.y, 9, 0, 6.2832); c.fill(); c.globalAlpha = 1;
    });
  }
  // 3 · a city whose things talk to each other
  function s3(c, t) {
    sky(c, '#06101e', '#12304a'); stars(c, t, 0.4);
    glow(c, 1500, 260, 220, '255,225,170', 0.18);
    c.fillStyle = '#f3ead2'; c.beginPath(); c.arc(1500, 260, 44, 0, 6.2832); c.fill();
    var g = 900;
    CITY.forEach(function (b) {
      var y = g - b.h;
      c.fillStyle = '#0b1726'; c.fillRect(b.x, y, b.w, b.h);
      var w = b.win; w.s = w.s || [];
      for (var yy = y + 18, r = 0; yy < g - 16; yy += 26, r++) {
        for (var xx = b.x + 10, q = 0; xx < b.x + b.w - 14; xx += 20, q++) {
          var id = r * 16 + q, v = w.s[id];
          if (v === undefined) v = w.s[id] = w();
          if (v < 0.45) continue;
          var on = 0.5 + 0.5 * Math.sin(v * 40 + t * (v > 0.9 ? 2.2 : 0.3));
          c.fillStyle = 'rgba(255,205,120,' + (0.25 + 0.55 * on * (v - 0.4)) + ')';
          c.fillRect(xx, yy, 9, 12);
        }
      }
      if (b.ant) {
        c.strokeStyle = '#2a3e57'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(b.x + b.w / 2, y); c.lineTo(b.x + b.w / 2, y - 34); c.stroke();
        var pr = (t * 0.8 + b.x / 500) % 1;
        c.strokeStyle = 'rgba(120,230,255,' + (0.6 * (1 - pr)) + ')'; c.lineWidth = 2;
        c.beginPath(); c.arc(b.x + b.w / 2, y - 34, 6 + pr * 40, 0, 6.2832); c.stroke();
      }
    });
    c.fillStyle = '#070d16'; c.fillRect(0, g, 1920, 180);
    LINKS.forEach(function (L) {
      var k = sm((t - L.d) / 1.1); if (k <= 0) return;
      var ax = L.a.x + L.a.w / 2, ay = g - L.a.h, bx = L.b.x + L.b.w / 2, by = g - L.b.h;
      var mx = (ax + bx) / 2, my = Math.min(ay, by) - 120 - Math.abs(ax - bx) * 0.15;
      c.strokeStyle = 'rgba(120,220,255,' + (0.45 * k) + ')'; c.lineWidth = 2; c.setLineDash([6, 10]);
      c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(mx, my, bx, by); c.stroke(); c.setLineDash([]);
      var u = (t * L.v) % 1, px = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx, py = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by;
      glow(c, px, py, 18, '255,200,120', 0.95 * k);
    });
  }
  // 4 · from Earth to Mars
  function s4(c, t) {
    sky(c, '#03050c', '#0b0f22'); c.save(); c.translate(-t * 6, 0); stars(c, t, 0.9); c.restore();
    var ex = 470 - t * 8, ey = 640, mx = 1480 + t * 4, my = 400;
    glow(c, ex, ey, 300, '90,160,255', 0.35);
    var g = c.createRadialGradient(ex - 60, ey - 70, 20, ex, ey, 210);
    g.addColorStop(0, '#5fb3ff'); g.addColorStop(0.55, '#1f5fb8'); g.addColorStop(1, '#0a1c44');
    c.fillStyle = g; c.beginPath(); c.arc(ex, ey, 210, 0, 6.2832); c.fill();
    c.save(); c.beginPath(); c.arc(ex, ey, 210, 0, 6.2832); c.clip();
    c.fillStyle = 'rgba(70,160,90,.55)';
    [[-60, -40, 70, 40], [50, 50, 60, 34], [-20, 90, 80, 26], [90, -80, 40, 26]].forEach(function (q) { c.beginPath(); c.ellipse(ex + q[0] + t * 3, ey + q[1], q[2], q[3], 0.4, 0, 6.2832); c.fill(); });
    c.restore();
    glow(c, mx, my, 190, '255,120,70', 0.25);
    g = c.createRadialGradient(mx - 30, my - 34, 10, mx, my, 115);
    g.addColorStop(0, '#ffb07a'); g.addColorStop(0.6, '#c2502b'); g.addColorStop(1, '#4a1a10');
    c.fillStyle = g; c.beginPath(); c.arc(mx, my, 115, 0, 6.2832); c.fill();
    // the way between them, drawn as the craft goes
    var k = sm((t - 0.6) / 5.2), sx = ex + 150, sy = ey - 150, cx1 = 900, cy1 = 160, tx = mx - 120, ty = my + 30;
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5; c.setLineDash([2, 14]); c.lineCap = 'round';
    c.beginPath();
    for (var n = 0; n <= 60 * k; n++) {
      var u = n / 60, px = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * cx1 + u * u * tx, py = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * cy1 + u * u * ty;
      if (n) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.stroke(); c.setLineDash([]);
    var cxp = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * cx1 + k * k * tx, cyp = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * cy1 + k * k * ty;
    glow(c, cxp, cyp, 34, '255,230,190', 0.95); glow(c, cxp, cyp, 8, '255,255,255', 1);
  }
  // 5 · night turns to day over a quiet horizon
  function s5(c, t) {
    var p = sm(t / 6.2), q = sm((t - 1.2) / 5);
    var top = p < 0.5 ? mix([5, 10, 26], [42, 47, 94], p * 2) : mix([42, 47, 94], [74, 150, 220], p * 2 - 1);
    var bot = p < 0.5 ? mix([11, 20, 48], [240, 138, 93], p * 2) : mix([240, 138, 93], [190, 228, 255], p * 2 - 1);
    sky(c, top, bot); stars(c, t, 1 - p * 1.6);
    var sx = 1180, sy = lerp(990, 520, q);
    glow(c, sx, sy, 420, '255,190,110', 0.45 * q + 0.1);
    glow(c, sx, sy, 90, '255,236,190', 1);
    c.fillStyle = '#fff6e0'; c.beginPath(); c.arc(sx, sy, 56, 0, 6.2832); c.fill();
    // the moon goes down on the other side
    c.globalAlpha = 1 - p; c.fillStyle = '#dfe7ff'; c.beginPath(); c.arc(420, lerp(300, 620, p), 34, 0, 6.2832); c.fill(); c.globalAlpha = 1;
    [[0.0, 860, 70, mix([10, 18, 34], [70, 100, 120], p)], [1.7, 920, 46, mix([6, 12, 24], [44, 70, 90], p)]].forEach(function (h) {
      c.fillStyle = h[3]; c.beginPath(); c.moveTo(0, 1080);
      for (var x = 0; x <= 1920; x += 40) c.lineTo(x, h[1] - h[2] * Math.sin(x / 300 + h[0]) * 0.6 - h[2] * 0.4 * Math.sin(x / 130 + h[0] * 2));
      c.lineTo(1920, 1080); c.fill();
    });
  }
  // 6 · the title card
  function s6(c, t) {
    sky(c, '#05070f', '#0d1530'); stars(c, t + 33.5, 0.7);
    var k = sm(t / 1.2);
    glow(c, 960, 330, 260, '255,180,110', 0.35 * k);
    glow(c, 960, 330, 26, '255,240,220', k);
    ring(c, 960, 330, 170, 48, -0.28, k, 'rgba(120,200,255,.85)', 3);
    var a = -Math.PI / 2 + t * 2.4;
    c.save(); c.translate(960, 330); c.rotate(-0.28); glow(c, Math.cos(a) * 170, Math.sin(a) * 48, 20, '150,220,255', k); c.restore();
    text(c, TITLE, 960, 560, 150, 800, '#ffffff', sm((t - 0.5) / 0.7));
    text(c, SLOGAN, 960, 680, 54, 500, '#cfe0ff', sm((t - 1.1) / 0.6));
    text(c, CREDIT, 960, 800, 38, 600, '#ffd8a8', sm((t - 1.5) / 0.6));
    text(c, URL, 960, 870, 34, 500, '#9fb8e8', sm((t - 1.8) / 0.6), true);
  }
  var SCENES = [s1, s2, s3, s4, s5, s6];

  // the whole frame at film time t, on a canvas of w×h
  function draw(c, t, w, h) {
    t = cl(t, 0, DUR);
    c.setTransform(w / 1920, 0, 0, h / 1080, 0, 0);
    c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, 1920, 1080);
    for (var n = 0; n < SCENES.length; n++) {
      var a = CUTS[n], b = CUTS[n + 1];
      if (t < a - 0.01 || t > b + 0.6) continue;
      var f = n ? sm((t - a) / 0.6) : 1;
      if (f <= 0) continue;
      c.save(); c.globalAlpha = 1;
      if (f < 1) {
        // the next scene comes in over the last one through an offscreen copy
        var o = draw.buf || (draw.buf = D.createElement('canvas'));
        if (o.width !== w || o.height !== h) { o.width = w; o.height = h; }
        var oc = o.getContext('2d'); oc.setTransform(w / 1920, 0, 0, h / 1080, 0, 0);
        SCENES[n](oc, t - a);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = f; c.drawImage(o, 0, 0);
      } else SCENES[n](c, t - a);
      c.restore();
      c.setTransform(w / 1920, 0, 0, h / 1080, 0, 0);
    }
    LINES.forEach(function (L) { text(c, L.t, 960, 960, 58, 700, '#ffffff', win(t, L.a, L.b, 0.5)); });
    // in from black, out to black
    var dark = 1 - Math.min(sm(t / 0.8), sm((DUR - t) / 0.9));
    if (dark > 0) { c.globalAlpha = dark; c.fillStyle = '#000'; c.fillRect(0, 0, 1920, 1080); c.globalAlpha = 1; }
  }

  /* ---------- the music and the sounds ---------- */
  // Every note is scheduled at once on the given context: at = the context time of film time 0, from = where to
  // start (notes that began earlier and still ring start late, shortened). Returns stop() for a live player.
  function score(ac, out, at, from) {
    from = from || 0;
    var src = [], N = rng(96);
    // the mix: a gentle compressor, then a limiter that keeps the peaks a few decibels under full scale
    var master = ac.createGain(), comp = ac.createDynamicsCompressor(), lim = ac.createDynamicsCompressor(), trim = ac.createGain();
    comp.threshold.value = -22; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    lim.threshold.value = -9; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
    trim.gain.value = 1;
    master.connect(comp); comp.connect(lim); lim.connect(trim); trim.connect(out);
    function fade(x) { return Math.min(1, x / 1.0, (DUR - x) / 1.5); }
    var mg = master.gain, t0 = at + from;
    mg.setValueAtTime(Math.max(0, fade(from)) * 0.5, t0);
    if (from < 1) mg.linearRampToValueAtTime(0.5, at + 1);
    if (from < DUR - 1.5) mg.setValueAtTime(0.5, at + DUR - 1.5);
    mg.linearRampToValueAtTime(0, at + DUR);

    // a seeded hall for the reverb, and a dotted-eighth echo
    var len = Math.floor(ac.sampleRate * 2.6), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (N() * 2 - 1) * Math.pow(1 - i / len, 3); }
    var verb = ac.createConvolver(); verb.buffer = ir;
    var wet = ac.createGain(); wet.gain.value = 0.3; verb.connect(wet); wet.connect(master);
    var echo = ac.createDelay(1), fb = ac.createGain(), ew = ac.createGain();
    echo.delayTime.value = BEAT * 0.75; fb.gain.value = 0.32; ew.gain.value = 0.26;
    echo.connect(fb); fb.connect(echo); echo.connect(ew); ew.connect(master); ew.connect(verb);
    var noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), nd = noise.getChannelData(0);
    for (i = 0; i < nd.length; i++) nd[i] = N() * 2 - 1;

    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    // a voice: starts at film time e for dur seconds, env = [attack, level, release]
    function voice(e, dur, make, env, sends) {
      var end = e + dur + env[2];
      if (end <= from) return;
      var s = Math.max(e, from), g = ac.createGain(), T = at + s;
      g.gain.setValueAtTime(0, T);
      var peak = e < from ? env[1] * cl((from - e) / env[0], 0, 1) : 0;
      if (peak) g.gain.setValueAtTime(peak, T);
      g.gain.linearRampToValueAtTime(env[1], at + Math.max(s + 0.005, e + env[0]));
      g.gain.setValueAtTime(env[1], at + Math.max(s + 0.01, e + dur));
      g.gain.exponentialRampToValueAtTime(0.0001, at + end);
      (sends || [master]).forEach(function (n) { g.connect(n); });
      [].concat(make(g)).forEach(function (o) { o.start(T); o.stop(at + end + 0.05); src.push(o); });
    }
    function osc(type, f, det) { return function (dest) { var o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.connect(dest); return o; }; }
    function through(filter, makers) { return function (g) { filter.connect(g); return makers.map(function (m) { return m(filter); }); }; }
    function lp(f, q) { var n = ac.createBiquadFilter(); n.type = 'lowpass'; n.frequency.value = f; n.Q.value = q || 0.7; return n; }

    var CH = [[50, 53, 57], [50, 53, 58], [48, 53, 57], [48, 52, 55]], ROOT = [38, 34, 41, 36];
    for (var bar = 0; bar < 16; bar++) {
      var e = bar * BAR, last = bar === 15, chord = last ? [50, 54, 57] : CH[bar % 4], root = last ? 38 : ROOT[bar % 4];
      // the pad, all the way through
      chord.forEach(function (m) {
        voice(e, BAR - 0.1, through(lp(last ? 1400 : 900), [osc('sawtooth', hz(m), -7), osc('sawtooth', hz(m), 7)]), [0.8, 0.05, last ? 2.2 : 1.0], [master, verb]);
      });
      // the arpeggio, from bar 3, through the echo
      if (bar >= 2 && !last) [0, 1, 2, 1, 0, 2, 1, 2].forEach(function (s, k) {
        var m = chord[s] + 12 + (k > 3 && bar % 2 ? 12 : 0);
        voice(e + k * BEAT / 2, 0.08, through(lp(3200), [osc('triangle', hz(m))]), [0.006, 0.07, 0.28], [master, echo]);
      });
      // the bass, from bar 5
      if (bar >= 4) [0, 2].forEach(function (b) {
        voice(e + b * BEAT, BEAT * 1.7, through(lp(260), [osc('sine', hz(root)), osc('triangle', hz(root), 4)]), [0.04, 0.09, 0.3]);
      });
      // the kick, bars 9 to 15, and one on the last downbeat
      if ((bar >= 8 && !last) || last) for (var b4 = 0; b4 < (last ? 1 : 4); b4++) kick(e + b4 * BEAT);
      // the hats, bars 11 to 14, on the off-beats
      if (bar >= 10 && bar <= 13) for (var h = 0; h < 4; h++) hat(e + h * BEAT + BEAT / 2);
    }
    function kick(e) {
      if (e < from) return;
      var o = ac.createOscillator(), g = ac.createGain(), T = at + e;
      o.frequency.setValueAtTime(130, T); o.frequency.exponentialRampToValueAtTime(45, T + 0.12);
      g.gain.setValueAtTime(0.5, T); g.gain.exponentialRampToValueAtTime(0.001, T + 0.34);
      o.connect(g); g.connect(master); o.start(T); o.stop(T + 0.4); src.push(o);
    }
    function noiseAt(e, dur, filt, env, dest) {
      if (e + dur <= from) return;
      var s = Math.max(e, from), b = ac.createBufferSource(), g = ac.createGain(), T = at + s;
      b.buffer = noise; b.loop = true; b.connect(filt); filt.connect(g); (dest || [master]).forEach(function (n) { g.connect(n); });
      env(g.gain, at + e, T); b.start(T, (e * 7.3) % 0.9); b.stop(at + e + dur + 0.05); src.push(b);
    }
    function hat(e) {
      var f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      noiseAt(e, 0.08, f, function (g, E) { g.setValueAtTime(0.06, E); g.exponentialRampToValueAtTime(0.001, E + 0.07); });
    }
    // a whoosh into every new scene
    CUTS.slice(1, 6).forEach(function (cut) {
      var f = ac.createBiquadFilter(), E = at + cut - 0.9; f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(300, Math.max(E, at + from)); f.frequency.exponentialRampToValueAtTime(2600, E + 0.9); f.frequency.exponentialRampToValueAtTime(600, E + 1.6);
      noiseAt(cut - 0.9, 1.6, f, function (g, E0, T) { g.setValueAtTime(0.0001, T); g.exponentialRampToValueAtTime(0.2, E0 + 0.9); g.exponentialRampToValueAtTime(0.0001, E0 + 1.6); }, [master, verb]);
    });
    // a riser into the title card
    var rf = ac.createBiquadFilter(); rf.type = 'bandpass'; rf.Q.value = 2;
    rf.frequency.setValueAtTime(400, at + Math.max(31, from)); rf.frequency.exponentialRampToValueAtTime(6000, at + 33.3);
    noiseAt(31, 2.3, rf, function (g, E, T) { g.setValueAtTime(0.0001, T); g.exponentialRampToValueAtTime(0.16, E + 2.2); g.linearRampToValueAtTime(0, E + 2.3); }, [master, verb]);
    // bells: at the first light and on the title
    [[0.7, 880], [34, 587.33]].forEach(function (b) {
      [1, 2.76, 5.4, 8.93].forEach(function (p, k) {
        voice(b[0], 0.01, osc('sine', b[1] * p), [0.004, 0.12 / (k + 1), 3.5 / (k + 1)], [master, verb]);
      });
    });

    return {
      stop: function () {
        src.forEach(function (o) { try { o.stop(); } catch (e) {} });
        try { master.disconnect(); trim.disconnect(); } catch (e) {}
      }
    };
  }

  /* ---------- the player in the blog ---------- */
  function player(C) {
    var AN = C.AN, fa = C.fa, d = null, cv = null, cx = null, t = 0, playing = false, raf = 0, t0 = 0, ac = null, mus = null, sound = true, caps = false;
    function secs(x) { return fa(Math.floor(x)); }
    function build() {
      var tr = CAPS.map(function (c) { return '<li><span class="an-t-at">' + secs(c.a) + ' ثانیه</span> ' + C.esc(c.t) + '</li>'; }).join('');
      d = AN.dialog('an-t', '<div class="an-dlg-head"><h2 id="an-t-h">ویدیوی معرفی آینده‌نگار</h2><button type="button" class="an-dlg-x" aria-label="بستن">✕</button></div>' +
        '<div class="an-dlg-body an-x-pad">' +
        '<div class="an-t-stage"><canvas class="an-t-cv" width="960" height="540" role="img" aria-label="ویدیوی چهل‌ثانیه‌ای معرفی وبلاگ: نقطه‌ای از نور، شبکه‌ای که یاد می‌گیرد، شهری که اشیایش با هم حرف می‌زنند، سفر از زمین تا مریخ، طلوع خورشید و در پایان نام وبلاگ و سازنده‌اش"></canvas>' +
        '<button type="button" class="an-t-big" data-t="play" aria-label="پخش ویدیو"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg></button>' +
        '<p class="an-t-cap" aria-live="polite" hidden></p></div>' +
        '<div class="an-t-bar" role="group" aria-label="کنترل پخش">' +
        '<button type="button" class="an-btn an-btn-ghost an-btn-sm" data-t="play">پخش</button>' +
        '<button type="button" class="an-btn an-btn-ghost an-btn-sm" data-t="start">از اول</button>' +
        '<input type="range" class="an-t-seek" min="0" max="' + DUR * 10 + '" step="1" value="0" aria-label="جای پخش">' +
        '<span class="an-t-time" aria-hidden="true"></span>' +
        '<button type="button" class="an-btn an-btn-ghost an-btn-sm" data-t="sound" aria-pressed="true">صدا</button>' +
        '<button type="button" class="an-btn an-btn-ghost an-btn-sm" data-t="caps" aria-pressed="false">زیرنویس</button></div>' +
        '<p class="an-x-note">این ویدیو همین‌جا در مرورگر شما کشیده و نواخته می‌شود و چیزی دانلود یا ارسال نمی‌کند. صدا فقط با دکمه‌ی پخش شروع می‌شود؛ گفتار ندارد، فقط موسیقی و چند صدای کوتاه.</p>' +
        '<details class="an-t-tr"><summary>متن کامل ویدیو</summary><ol>' + tr + '</ol></details></div>', 'an-t-dlg');
      d.setAttribute('aria-labelledby', 'an-t-h');
      cv = d.querySelector('.an-t-cv'); cx = cv.getContext('2d');
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]'); if (!b) return;
        var k = b.getAttribute('data-t');
        if (k === 'play') { if (playing) pause(); else play(); }
        else if (k === 'start') { seek(0); play(); }
        else if (k === 'sound') { sound = !sound; b.setAttribute('aria-pressed', String(sound)); if (playing) { stopMusic(); if (sound) startMusic(); } }
        else if (k === 'caps') { caps = !caps; b.setAttribute('aria-pressed', String(caps)); capLine(); }
      });
      var sk = d.querySelector('.an-t-seek');
      sk.addEventListener('input', function () { var was = playing; if (was) pause(); seek(sk.value / 10); if (was) play(); });
      d.onclose = function () { pause(); };
      D.addEventListener('visibilitychange', function () { if (D.hidden && playing) pause(); });
      W.addEventListener('resize', function () { if (d.classList.contains('on')) { fit(); frame(); } });
    }
    function fit() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, W.devicePixelRatio || 1), w = Math.round(Math.min(1920, (r.width || 960) * dpr));
      if (w && cv.width !== w) { cv.width = w; cv.height = Math.round(w * 9 / 16); }
    }
    function frame() {
      draw(cx, t, cv.width, cv.height);
      var sk = d.querySelector('.an-t-seek'), tm = d.querySelector('.an-t-time');
      sk.value = String(Math.round(t * 10));
      sk.setAttribute('aria-valuetext', secs(t) + ' از ' + secs(DUR) + ' ثانیه');
      tm.textContent = secs(t) + ' از ' + secs(DUR);
      capLine();
    }
    function capLine() {
      var p = d.querySelector('.an-t-cap'), c = null;
      CAPS.forEach(function (x) { if (t >= x.a && t < x.b) c = x; });
      p.hidden = !caps || !c;
      var s = caps && c ? c.t : '';
      if (p.textContent !== s) p.textContent = s;
    }
    function label() {
      d.querySelectorAll('[data-t="play"]').forEach(function (b) {
        if (b.classList.contains('an-t-big')) { b.hidden = playing; return; }
        b.textContent = playing ? 'مکث' : 'پخش';
      });
    }
    function startMusic() {
      var A = W.AudioContext || W.webkitAudioContext; if (!A) return;
      try {
        if (!ac) ac = new A();
        if (ac.state === 'suspended') ac.resume();
        mus = score(ac, ac.destination, ac.currentTime + 0.05 - t, t);
      } catch (e) { mus = null; }
    }
    function stopMusic() { if (mus) { mus.stop(); mus = null; } }
    function play() {
      if (playing) return;
      if (t >= DUR - 0.05) t = 0;
      playing = true; t0 = performance.now() - t * 1000; label();
      if (sound) startMusic();
      (function loop() {
        if (!playing) return;
        t = (performance.now() - t0) / 1000;
        if (t >= DUR) { t = DUR; frame(); pause(); return; }
        frame(); raf = requestAnimationFrame(loop);
      })();
    }
    function pause() {
      if (!playing && !mus) return;
      playing = false; cancelAnimationFrame(raf); stopMusic(); label(); if (d) frame();
    }
    function seek(x) { t = cl(x, 0, DUR); frame(); }
    function open() {
      if (!d) build();
      AN.openDlg(d, '.an-t-big');
      requestAnimationFrame(function () {
        fit();
        // the title card as the poster until play is pressed
        var f = D.fonts && D.fonts.load ? D.fonts.load('700 40px "Vazirmatn"') : null;
        if (t === 0 && !playing) { t = 36.5; frame(); t = 0; d.querySelector('.an-t-seek').value = '0'; d.querySelector('.an-t-time').textContent = secs(0) + ' از ' + secs(DUR); }
        if (f) f.then(function () { if (!playing && t === 0) { t = 36.5; draw(cx, t, cv.width, cv.height); t = 0; } }, function () {});
      });
    }
    return { open: open, pause: pause, playing: function () { return playing; } };
  }

  W.AN_TEASER = player;
  W.AN_TEASER.film = { DUR: DUR, CUTS: CUTS, LINES: LINES, CAPS: CAPS, POSTER: 36.5, draw: draw, score: score };
})();
