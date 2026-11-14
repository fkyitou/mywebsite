/* آینده‌نگار · live sky: the background follows the visitor's own clock (css/08-sky.css, "live sky").
   Nothing is asked from the visitor and nothing is sent anywhere: the only inputs are the clock and the date of the
   device. The sun's height comes from js/early.js (day of the year and hour, for a latitude of 35.7°N, so days are
   short in winter and long in summer); the moon's phase from the date; the constellation from the season. From these:
     · the version: «روز» (B) while the sun is up, «شب» (A) after dusk, unless the visitor chose one by hand;
     · a phase on <html data-sky>: twilight, sunrise, morning, noon, afternoon, sunset, night;
     · a soft sun or a moon with its real phase, a colour wash for the phase, and one constellation at night.
   It looks again every few minutes and when the tab is shown again; between two looks nothing runs.
   The figures are approximations meant for a background, not an almanac (docs/DECISION_LOG.md). */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement, AN = W.AN || (W.AN = {});
  var sky = D.getElementById('an-sky');
  if (!sky || !AN.sol) return;
  var R = Math.PI / 180, LAT = 35.7 * R, NS = 'http://www.w3.org/2000/svg';
  var pinned = null, keep = null; // a time being previewed (hours of today) or null; the version kept by hand before it

  function el(cls, html) { var e = D.createElement('div'); e.className = cls; if (html) e.innerHTML = html; return e; }
  var grain = sky.querySelector('.an-sky-grain');
  var tint = el('an-sky-tint'), sun = el('an-sky-orb an-sky-sun'), moon = el('an-sky-orb an-sky-moon'), cons = el('an-sky-const');
  [tint, sun, moon, cons].forEach(function (e) { sky.insertBefore(e, grain); });

  /* ---------- the sky for a moment in time ---------- */
  function dayOfYear(d) { return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); }
  function altOf(dec, ha) { return Math.asin(Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(ha)) / R; }
  function state(d) {
    var n = dayOfYear(d), so = AN.sol(d), hrs = so.h;
    var ha = (hrs - 12) * 15 * R, alt = so.alt, am = hrs < 12;
    // moon: age from a known new moon (6 Jan 2000, 18:14 UTC) and the mean length of a lunation; it trails the sun
    // by its age, and its declination follows the point of the ecliptic that far ahead of the sun
    var age = ((d.getTime() / 864e5 + 2440587.5 - 2451550.1) / 29.530588853) % 1; if (age < 0) age += 1;
    var mha = ha - age * 2 * Math.PI, lon = 2 * Math.PI * (n - 80) / 365 + age * 2 * Math.PI;
    mha = Math.atan2(Math.sin(mha), Math.cos(mha));
    var malt = altOf(23.44 * R * Math.sin(lon), mha), lit = (1 - Math.cos(age * 2 * Math.PI)) / 2;
    var ph = alt < -12 ? 'night' : alt < -4 ? 'twilight' : alt < 6 ? (am ? 'sunrise' : 'sunset') : Math.abs(hrs - 12) < 1.5 ? 'noon' : am ? 'morning' : 'afternoon';
    var mo = d.getMonth(), season = mo < 2 || mo === 11 ? 'winter' : mo < 5 ? 'spring' : mo < 8 ? 'summer' : 'autumn';
    return { phase: ph, v: alt > -4 ? 'b' : 'a', alt: alt, ha: ha, am: am, moon: { age: age, lit: lit, alt: malt, ha: mha }, season: season };
  }
  function now() {
    var d = AN.clock();
    if (pinned !== null) { d = new Date(d.getTime()); d.setHours(Math.floor(pinned), Math.round((pinned % 1) * 60), 0, 0); }
    return d;
  }

  /* ---------- drawing ---------- */
  // where a body stands in the window: east on the left, highest in the middle of its arc (a view toward the south)
  function place(e, ha, alt, top) {
    var x = 50 + 42 * Math.sin(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, ha)));
    var y = 34 - 26 * Math.max(0, Math.min(1, alt / top));
    e.style.left = x.toFixed(1) + '%'; e.style.top = y.toFixed(1) + '%';
    e.style.opacity = Math.max(0, Math.min(1, (alt + 5) / 9)).toFixed(2);
    e.setAttribute('data-side', ha < 0 ? 'e' : 'w');
    return x;
  }
  // the lit part of the moon: the limb on the lit side and the terminator, an ellipse that narrows toward the quarters
  function moonSVG(age) {
    var wax = age < 0.5, p = wax ? age : 1 - age, rx = (16 * Math.abs(Math.cos(2 * Math.PI * p))).toFixed(2);
    var path = 'M0-16A16 16 0 0 1 0 16A' + rx + ' 16 0 0 ' + (p < 0.25 ? 0 : 1) + ' 0-16Z';
    return '<svg xmlns="' + NS + '" viewBox="-20 -20 40 40" aria-hidden="true"><circle r="16" class="an-moon-dark"/><path d="' + path + '" class="an-moon-lit"' + (wax ? '' : ' transform="scale(-1 1)"') + '/></svg>';
  }
  // one constellation for the season, drawn from the real positions of its stars (right ascension in hours,
  // declination in degrees, size 1-3) and the lines usually drawn between them
  var CONS = {
    winter: { n: 'Orion', s: [[5.92, 7.4, 3], [5.42, 6.35, 2], [5.68, -1.94, 2], [5.6, -1.2, 2], [5.53, -0.3, 2], [5.8, -9.67, 2], [5.24, -8.2, 3], [5.585, 9.93, 1]], l: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6], [7, 0], [7, 1]] },
    spring: { n: 'Leo', s: [[10.14, 11.97, 3], [10.12, 16.76, 1], [10.33, 19.84, 2], [10.28, 23.42, 1], [9.88, 26, 1], [9.76, 23.77, 1], [11.82, 14.57, 2], [11.235, 20.52, 2], [11.237, 15.43, 1]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 7], [7, 6], [6, 8], [8, 0], [7, 8]] },
    summer: { n: 'Cygnus', s: [[20.69, 45.28, 3], [20.37, 40.26, 2], [19.51, 27.96, 2], [20.77, 33.97, 2], [19.75, 45.13, 2], [19.94, 35.08, 1]], l: [[0, 1], [1, 5], [5, 2], [4, 1], [1, 3]] },
    autumn: { n: 'Cassiopeia', s: [[0.153, 59.15, 2], [0.675, 56.54, 3], [0.945, 60.72, 2], [1.43, 60.24, 2], [1.907, 63.67, 1]], l: [[0, 1], [1, 2], [2, 3], [3, 4]] }
  };
  function consSVG(season) {
    var c = CONS[season], ra = 0, de = 0, i, pts = [], mx = 0;
    for (i = 0; i < c.s.length; i++) { ra += c.s[i][0]; de += c.s[i][1]; }
    ra /= c.s.length; de /= c.s.length;
    for (i = 0; i < c.s.length; i++) {
      var x = -(c.s[i][0] - ra) * 15 * Math.cos(de * R), y = -(c.s[i][1] - de);
      pts.push([x, y]); mx = Math.max(mx, Math.abs(x), Math.abs(y));
    }
    var k = 42 / mx, out = '<svg xmlns="' + NS + '" viewBox="-50 -50 100 100" aria-hidden="true" data-name="' + c.n + '"><g class="an-const-l">';
    for (i = 0; i < c.l.length; i++) { var a = pts[c.l[i][0]], b = pts[c.l[i][1]]; out += '<line x1="' + (a[0] * k).toFixed(1) + '" y1="' + (a[1] * k).toFixed(1) + '" x2="' + (b[0] * k).toFixed(1) + '" y2="' + (b[1] * k).toFixed(1) + '"/>'; }
    out += '</g><g class="an-const-s">';
    for (i = 0; i < pts.length; i++) out += '<circle cx="' + (pts[i][0] * k).toFixed(1) + '" cy="' + (pts[i][1] * k).toFixed(1) + '" r="' + (0.35 + c.s[i][2] * 0.22).toFixed(2) + '"/>';
    return out + '</g></svg>';
  }

  /* ---------- applying it ---------- */
  var last = '', lastMoon = '', lastCons = '';
  function fade(fn) {
    // a change of version made by the clock is a slow cross-fade (a View Transition; js/early.js sets its length for
    // html.an-fade), never the circle of a click; with reduced motion or in a hidden tab it is made at once
    if (D.startViewTransition && !AN.rm && !D.hidden && last) {
      try {
        H.classList.add('an-fade');
        var t = D.startViewTransition(fn), done = function () { H.classList.remove('an-fade'); };
        t.finished.then(done, done); return;
      } catch (e) { H.classList.remove('an-fade'); }
    }
    fn();
  }
  // quick: a look at another hour (AN.live.preview) changes the page at once, without the slow fade
  function apply(quick) {
    var tone = H.getAttribute('data-an-tone'), auto = AN.vm === 'auto' || pinned !== null, d = now(), s;
    if (tone) { H.removeAttribute('data-sky'); H.removeAttribute('data-moonlight'); last = 'tone'; return null; }
    if (!auto) {
      // a version chosen by hand keeps a fixed hour: late evening for «شب», mid-morning for «روز»
      d = new Date(d.getTime()); d.setHours(AN.v === 'a' ? 23 : 10, AN.v === 'a' ? 0 : 30, 0, 0);
      s = state(d); s.phase = AN.v === 'a' ? 'night' : 'morning'; s.v = AN.v;
    } else s = state(d);
    function paint() {
      H.setAttribute('data-sky', s.phase);
      if (s.v === 'a' && s.moon.lit > 0.5 && s.moon.alt > 8) H.setAttribute('data-moonlight', ''); else H.removeAttribute('data-moonlight');
      var day = s.v === 'b';
      place(sun, s.ha, day ? s.alt : -90, 70);
      var mx = place(moon, s.moon.ha, day ? -90 : s.moon.alt, 70);
      sky.style.setProperty('--hx', s.am ? '12%' : '88%'); sky.style.setProperty('--mx', mx.toFixed(1) + '%');
      var mk = s.moon.age.toFixed(2);
      if (mk !== lastMoon) { moon.innerHTML = moonSVG(s.moon.age); lastMoon = mk; }
      if (s.season !== lastCons) { cons.innerHTML = consSVG(s.season); lastCons = s.season; }
      // the constellation keeps to the side of the sky away from the moon
      cons.setAttribute('data-side', s.moon.alt > 0 && s.moon.ha < 0 ? 'w' : 'e');
    }
    var turn = function () { AN.setV(s.v, { now: true, auto: true }); paint(); };
    if (auto && s.v !== AN.v && AN.setV) { if (quick) turn(); else fade(turn); }
    else paint();
    last = s.phase;
    return s;
  }
  var timer = 0;
  function tick() { clearTimeout(timer); apply(); timer = setTimeout(tick, 5 * 60 * 1000); }
  D.addEventListener('visibilitychange', function () { if (!D.hidden) tick(); });
  // a change of version or of reading tone made elsewhere (the header button, the reader's toolkit)
  if (W.MutationObserver) new W.MutationObserver(function () { apply(); }).observe(H, { attributes: true, attributeFilter: ['data-v', 'data-an-tone'] });

  AN.live = {
    // the sky as it is shown now: { phase, v, alt, moon: { age, lit, alt }, season }
    state: function () { return apply(); },
    at: function (d) { return state(d); },
    // 'auto' follows the clock; 'a' and 'b' keep one version
    mode: function () { return AN.vm === 'auto' ? 'auto' : AN.v; },
    setMode: function (m, from) {
      pinned = null; keep = null;
      if (m === 'auto') AN.setAuto({ from: from });
      else if (m === 'a' || m === 'b') {
        if (AN.v !== m) AN.setV(m, { from: from });
        else { AN.vm = 'man'; AN.store.set('an-vm', 'man'); AN.store.set('an-v', m); H.setAttribute('data-vm', 'man'); if (AN.vLabel) AN.vLabel(); apply(); }
      }
      return AN.live.mode();
    },
    // look at another hour of today (0-24) without changing what is saved; preview(null) goes back to the clock, or
    // to the version the visitor had kept
    preview: function (h) {
      var on = typeof h === 'number' && h >= 0 && h <= 24;
      if (on && pinned === null) keep = AN.vm === 'auto' ? null : AN.v;
      pinned = on ? h : null;
      if (!on && keep) { var k = keep; keep = null; if (AN.v !== k) AN.setV(k, { now: true, auto: true }); }
      return apply(true);
    }
  };
  tick();
})();
