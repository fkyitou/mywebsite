/* آینده‌نگار · «رادیو آینده»: a music player whose music is composed live, in the reader's browser.
   The reader's toolkit (src/addons/addons.js) fetches this file only when a reader presses the radio button, from the
   same pinned commit and with Subresource Integrity, like the film and the guide.
   There are no audio files: five stations are small generative scores played with the Web Audio API. Each press of
   «قطعه‌ی تازه» (and each new start) draws a new seed, so the piece is new every time while the station keeps its
   character: its tempo, key, chords, instruments and the shape of its sections (an intro, the full band, a part with
   a melody, a breakdown). «همراه آسمان» picks the station from the phase of the live sky, so the music follows the
   reader's own clock: dawn, noon, the afternoon, sunset and night.
   Nothing plays by itself: sound starts only with the play button. The volume, the station and the sky choice are
   kept in this browser (localStorage 'an-mu'); nothing is sent anywhere. While the toolkit reads an article aloud the
   music steps back, and a sleep timer can fade it out. Muting it loses nothing: everything is also on screen.
   Design, management and writing: امیرحسین همتی. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;

  /* ---------- small tools ---------- */
  // mulberry32: the same numbers for the same seed, in every browser
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function cl(x, a, b) { return x < a ? a : x > b ? b : x; }
  function pat(s) { return s.split('').map(function (c) { return c === 'x' ? 1 : c === 'o' ? 0.55 : 0; }); }

  /* ---------- the five stations ---------- */
  // root: MIDI note of the key; sc: the scale in semitones; prog: the chords as scale degrees; cb: bars per chord;
  // pad/arp/mel/bass/keys/drums: which instruments play and how; sky: the phases of the live sky it belongs to;
  // c: three colours for the picture (light, second light, deep).
  var ST = [
    { id: 'dawn', name: 'سپیده‌ی مدار', mood: 'آرام و روشن، برای آغاز روز', sky: ['twilight', 'sunrise'],
      bpm: 72, root: 50, sc: [0, 2, 4, 6, 7, 9, 11], prog: [0, 1, 5, 4], cb: 2, cut: 1500,
      pad: 1, arp: { rate: 2, p: 0.8, kind: 'updown' }, mel: { rate: 8, p: 0.5, v: 'bell', oct: 2 }, bass: { pat: 'long', v: 'sub' },
      c: ['#FFD08A', '#FF8FB1', '#2A1B4A'] },
    { id: 'noon', name: 'نیم‌روز داده', mood: 'پرانرژی و شفاف، برای کار و ساختن', sky: ['morning', 'noon'],
      bpm: 108, root: 57, sc: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 6, 4], cb: 1, cut: 2200,
      pad: 1, arp: { rate: 1, p: 0.75, kind: 'up' }, mel: { rate: 4, p: 0.55, v: 'pluck', oct: 2 }, bass: { pat: 'eighth', v: 'saw' },
      drums: { k: pat('x...x...x...x...'), s: pat('....x.......x...'), h: pat('..x...x...x...xo') },
      c: ['#7FE7FF', '#8CFFB4', '#0B2A4A'] },
    { id: 'focus', name: 'تمرکز کهربایی', mood: 'گرم و آهسته، برای خواندن و تمرکز', sky: ['afternoon'],
      bpm: 80, root: 53, sc: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 1, 4], cb: 1, cut: 1100, swing: 0.32, crackle: 1,
      pad: 0.6, keys: 1, mel: { rate: 4, p: 0.35, v: 'keys', oct: 2 }, bass: { pat: 'groove', v: 'sub' },
      drums: { k: pat('x.....x...x.....'), s: pat('....x.......x...'), h: pat('x.o.x.o.x.o.x.oo'), soft: 1 },
      c: ['#FFC46B', '#FF8A5C', '#3A1E12'] },
    { id: 'sunset', name: 'غروب نئون', mood: 'پرشور و سینمایی، برای راه رفتن در شهر آینده', sky: ['sunset'],
      bpm: 96, root: 57, sc: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 2, 6], cb: 1, cut: 1800,
      pad: 1, arp: { rate: 1, p: 0.95, kind: 'updown' }, mel: { rate: 4, p: 0.45, v: 'bell', oct: 2 }, bass: { pat: 'drive', v: 'saw' },
      drums: { k: pat('x.......x.......'), s: pat('....x.......x...'), h: pat('..x...x...x...x.'), big: 1 },
      c: ['#FF5FA2', '#FFB36B', '#2B0B3A'] },
    { id: 'night', name: 'شب ستاره‌ها', mood: 'فضایی و آرام، برای شب و خیال', sky: ['night'],
      bpm: 60, root: 48, sc: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 4], cb: 2, cut: 900, shimmer: 1,
      pad: 1, mel: { rate: 4, p: 0.4, v: 'bell', oct: 2, penta: [0, 2, 3, 4, 6] }, bass: { pat: 'long', v: 'sub' },
      c: ['#9DB4FF', '#C69CFF', '#060B22'] }
  ];
  function bySky(phase) {
    for (var i = 0; i < ST.length; i++) if (ST[i].sky.indexOf(phase) >= 0) return i;
    return 4;
  }

  /* ---------- the instruments ---------- */
  // ctx: an AudioContext or an OfflineAudioContext; the same code plays in the page and renders in the tests.
  function rack(ctx, dest, seed) {
    var R = rng(seed ^ 0x5bd1e995);
    var bus = ctx.createGain(); bus.gain.value = 1; bus.connect(dest);
    // the room: a reverb from a generated impulse, and a delay whose time follows the tempo
    var len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var i = 0; i < len; i++) dd[i] = (R() * 2 - 1) * Math.pow(1 - i / len, 3.1); }
    var rev = ctx.createConvolver(); rev.buffer = ir;
    var revIn = ctx.createGain(); revIn.gain.value = 1; var revOut = ctx.createGain(); revOut.gain.value = 0.55;
    revIn.connect(rev); rev.connect(revOut); revOut.connect(bus);
    var dly = ctx.createDelay(2), fb = ctx.createGain(), dlp = ctx.createBiquadFilter(), dlyIn = ctx.createGain(), dlyOut = ctx.createGain();
    dly.delayTime.value = 0.45; fb.gain.value = 0.34; dlp.type = 'lowpass'; dlp.frequency.value = 2600; dlyOut.gain.value = 0.6;
    dlyIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dlyOut); dlyOut.connect(bus); dlyOut.connect(revIn);
    var nlen = ctx.sampleRate * 2, nb = ctx.createBuffer(1, nlen, ctx.sampleRate), nd = nb.getChannelData(0);
    for (var j = 0; j < nlen; j++) nd[j] = R() * 2 - 1;

    // one voice's output, sent dry, to the delay and to the room
    function out(dry, d, r) {
      var g = ctx.createGain(); g.gain.value = 0;
      if (dry) { var a = ctx.createGain(); a.gain.value = dry; g.connect(a); a.connect(bus); }
      if (d) { var b = ctx.createGain(); b.gain.value = d; g.connect(b); b.connect(dlyIn); }
      if (r) { var c = ctx.createGain(); c.gain.value = r; g.connect(c); c.connect(revIn); }
      return g;
    }
    function osc(type, f, t, end, det) { var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.setValueAtTime(det, t); o.start(t); o.stop(end); return o; }
    function noise(t, end) { var s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t, R() * 1.5); s.stop(end); return s; }
    function env(g, t, a, peak, hold, rel) {
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
      return t + a + hold + rel + 0.05;
    }
    var V = {
      setTempo: function (bpm, t) { dly.delayTime.setTargetAtTime(cl(60 / bpm * 0.75, 0.05, 1.9), t, 0.05); },
      pad: function (notes, t, dur, cut, lvl) {
        var a = Math.min(1.6, dur * 0.3), g = out(0.55, 0, 0.6), f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.Q.value = 0.7; f.frequency.setValueAtTime(cut * 0.55, t); f.frequency.linearRampToValueAtTime(cut, t + dur * 0.5); f.frequency.linearRampToValueAtTime(cut * 0.7, t + dur + 1);
        f.connect(g);
        var end = env(g, t, a, 0.05 * (lvl || 1), Math.max(0, dur - a), 1.6);
        notes.forEach(function (m) {
          osc('sawtooth', mtof(m), t, end, -7).connect(f);
          osc('sawtooth', mtof(m), t, end, 7).connect(f);
        });
        osc('sine', mtof(notes[0] - 12), t, end).connect(f);
      },
      pluck: function (m, t, v) {
        var g = out(0.5, 0.38, 0.22), f = ctx.createBiquadFilter(), end = t + 0.9;
        f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(4800, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.28); f.connect(g);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        osc('triangle', mtof(m), t, end).connect(f);
        var s = osc('square', mtof(m), t, end, 5), sg = ctx.createGain(); sg.gain.value = 0.3; s.connect(sg); sg.connect(f);
      },
      bell: function (m, t, v) {
        var f = mtof(m), g = out(0.42, 0.2, 0.62), end = t + 3.4;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
        var c = osc('sine', f, t, end), mo = osc('sine', f * 3.5, t, end), mg = ctx.createGain();
        mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.6);
        mo.connect(mg); mg.connect(c.frequency); c.connect(g);
      },
      keys: function (m, t, dur, v) {
        var f = mtof(m), g = out(0.62, 0.1, 0.28), end = t + dur + 0.7;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.075 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.045 * v, t + 0.9);
        g.gain.setValueAtTime(0.045 * v, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
        var c = osc('sine', f, t, end), mo = osc('sine', f, t, end), mg = ctx.createGain();
        mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.25, t + 0.5);
        mo.connect(mg); mg.connect(c.frequency); c.connect(g);
        var tn = osc('sine', f * 7, t, t + 0.3), tg = ctx.createGain(); tg.gain.setValueAtTime(0.18, t); tg.gain.exponentialRampToValueAtTime(0.001, t + 0.25); tn.connect(tg); tg.connect(g);
      },
      bass: function (m, t, dur, v, kind) {
        var g = out(0.85, 0, 0.04), end = t + dur + 0.2, f = ctx.createBiquadFilter();
        f.type = 'lowpass'; f.Q.value = kind === 'saw' ? 5 : 0.5;
        if (kind === 'saw') { f.frequency.setValueAtTime(1300, t); f.frequency.exponentialRampToValueAtTime(260, t + Math.min(0.3, dur)); }
        else f.frequency.value = 600;
        f.connect(g);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2 * v, t + 0.008);
        g.gain.setValueAtTime(0.17 * v, t + Math.max(0.01, dur - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
        osc(kind === 'saw' ? 'sawtooth' : 'sine', mtof(m), t, end).connect(f);
        if (kind !== 'saw') { var h = osc('triangle', mtof(m + 12), t, end), hg = ctx.createGain(); hg.gain.value = 0.18; h.connect(hg); hg.connect(f); }
      },
      kick: function (t, v) {
        var g = out(0.95, 0, 0), o = osc('sine', 150, t, t + 0.5);
        o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.62 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        o.connect(g);
      },
      snare: function (t, v, big) {
        var g = out(0.6, 0, big ? 0.55 : 0.22), f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8; f.connect(g);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + (big ? 0.32 : 0.2));
        noise(t, t + 0.4).connect(f);
        var b = osc('triangle', 190, t, t + 0.15), bg = ctx.createGain(); bg.gain.setValueAtTime(0.5, t); bg.gain.exponentialRampToValueAtTime(0.001, t + 0.1); b.connect(bg); bg.connect(g);
      },
      hat: function (t, v, open) {
        var g = out(0.45, 0, 0.08), f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 7200; f.connect(g);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.24 : 0.05));
        noise(t, t + 0.3).connect(f);
      },
      crackle: function (t) {
        var g = out(0.5, 0, 0), f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 2400; f.connect(g);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03 + R() * 0.03, t + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
        noise(t, t + 0.03).connect(f);
      },
      shimmer: function (t, dur) {
        var g = out(0, 0.2, 0.9), f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(6500, t + dur); f.connect(g);
        env(g, t, dur * 0.4, 0.05, dur * 0.2, dur * 0.6);
        noise(t, t + dur * 1.3).connect(f);
      },
      stop: function () { try { bus.disconnect(); } catch (e) {} }
    };
    return V;
  }

  /* ---------- the score ---------- */
  // One step is a sixteenth note. Every eight bars the section changes: intro, full, melody, breakdown.
  function composer(S, seed) {
    var R = rng(seed), n = S.sc.length, mel = 7, arpI = 0, lastBar = -1, chordNotes = null;
    function deg(d, oct) { var o = Math.floor(d / n); return S.root + 12 * (o + (oct || 0)) + S.sc[((d % n) + n) % n]; }
    // the chord progression keeps its shape, but every 16 bars one chord may be swapped for a neighbour
    var prog = S.prog.slice();
    function reprog() { prog = S.prog.slice(); if (R() < 0.5) { var k = 1 + Math.floor(R() * (prog.length - 1)); prog[k] = (prog[k] + (R() < 0.5 ? 2 : 5)) % n; } }
    function section(bar) { return Math.floor(bar / 8) % 4; }
    return function (i, t, V, s16) {
      var bar = Math.floor(i / 16), pos = i % 16, sec = section(bar), drums = S.drums, full = sec === 1 || sec === 2;
      if (bar !== lastBar) { lastBar = bar; if (bar % 16 === 0 && bar) reprog(); }
      var ci = Math.floor(bar / S.cb) % prog.length, root = prog[ci];
      var chord = [root, root + 2, root + 4, root + 6];
      if (pos === 0 && bar % S.cb === 0) {
        chordNotes = chord.map(function (d) { return deg(d, 0); });
        if (S.pad) V.pad(chordNotes, t, S.cb * 16 * s16, S.cut * (sec === 3 ? 0.6 : 1), S.pad);
        if (S.shimmer && bar % 8 === 4) V.shimmer(t, 6);
      }
      // bass
      var b = S.bass, bn = deg(root, -1);
      if (b && !(drums && sec === 0)) {
        if (b.pat === 'long' && pos === 0) V.bass(bn, t, 16 * s16 * 0.95, 0.9, b.v);
        else if (b.pat === 'eighth' && pos % 2 === 0) V.bass(pos === 14 ? deg(root + 4, -1) : bn, t, s16 * 1.6, pos % 4 ? 0.7 : 1, b.v);
        else if (b.pat === 'groove' && (pos === 0 || pos === 6 || pos === 10 || pos === 14)) V.bass(pos === 14 ? deg(root + 4, -1) : bn, t, s16 * (pos === 0 ? 5 : 2.5), pos === 0 ? 1 : 0.75, b.v);
        else if (b.pat === 'drive' && pos % 2 === 0) V.bass(pos % 4 === 2 && full ? bn + 12 : bn, t, s16 * 1.7, 0.85, b.v);
      }
      // drums: hats in the intro, everything in the full sections, nothing in the breakdown
      if (drums && sec !== 3) {
        var soft = drums.soft ? 0.7 : 1;
        if (full && drums.k[pos]) V.kick(t, drums.k[pos] * soft);
        if (full && drums.s[pos]) V.snare(t, drums.s[pos] * soft, drums.big);
        if (drums.h[pos]) V.hat(t, drums.h[pos] * (0.75 + R() * 0.25) * soft, drums.h[pos] < 1 && R() < 0.5);
        // a ghost note now and then
        if (full && !drums.k[pos] && !drums.s[pos] && pos % 2 && R() < 0.06) V.snare(t, 0.25, 0);
        if (full && bar % 4 === 3 && pos >= 12 && R() < 0.35) V.kick(t, 0.5 * soft);
      }
      if (S.crackle && R() < 0.22) V.crackle(t + R() * s16);
      // the electric piano of the focus station
      if (S.keys && (pos === 0 || (pos === 6 && R() < 0.8) || (pos === 11 && R() < 0.25))) {
        var kv = pos === 0 ? 1 : 0.7;
        chord.forEach(function (d, k) { V.keys(deg(d, 1), t + k * 0.012, s16 * (pos === 0 ? 5 : 3), kv); });
      }
      // arpeggio over the chord, across two octaves
      var a = S.arp;
      if (a && (full || (!drums && sec !== 0)) && pos % a.rate === 0 && R() < a.p) {
        var tones = [], o, k2;
        for (o = 1; o <= 2; o++) for (k2 = 0; k2 < 3; k2++) tones.push(deg(chord[k2], o));
        var idx;
        if (a.kind === 'up') idx = arpI % tones.length;
        else { var per = tones.length * 2 - 2, q = arpI % per; idx = q < tones.length ? q : per - q; }
        arpI++;
        V.pluck(tones[idx], t, pos % 4 === 0 ? 1 : 0.7);
      }
      // melody: a walk over the scale (or a pentatonic subset) that leans on the chord's notes; it rests at the end of
      // every fourth bar, and plays most in the melody section
      var m = S.mel;
      if (m && pos % m.rate === 0 && sec !== 0 && !(bar % 4 === 3 && pos >= 8)) {
        var p = m.p * (sec === 2 ? 1.25 : sec === 3 ? 0.9 : 0.6);
        if (R() < p) {
          var steps = [-2, -1, -1, 0, 1, 1, 2, 3, -3];
          mel = cl(mel + steps[Math.floor(R() * steps.length)], 3, 12);
          var d2 = mel;
          if (m.penta) { var pn = m.penta, oo = Math.floor(d2 / pn.length); d2 = pn[d2 % pn.length] + oo * n; }
          if (pos === 0 && !m.penta) { var best = d2, bd = 99; for (var c = 0; c < 4; c++) for (var oc = 0; oc < 3; oc++) { var cd = chord[c] + oc * n; if (Math.abs(cd - d2) < bd) { bd = Math.abs(cd - d2); best = cd; } } d2 = best; }
          var note = deg(d2, m.oct - 1), vel = 0.7 + R() * 0.3;
          if (m.v === 'bell') V.bell(note, t, vel);
          else if (m.v === 'keys') V.keys(note, t, s16 * m.rate * 1.5, vel * 0.9);
          else V.pluck(note, t, vel);
        }
      }
    };
  }

  /* ---------- the player in the blog ---------- */
  function player(C) {
    var AN = C.AN, fa = C.fa, esc = C.esc;
    var AC = W.AudioContext || W.webkitAudioContext;
    var KEY = 'an-mu', saved = {};
    try { saved = JSON.parse((AN.store && AN.store.get(KEY)) || '{}') || {}; } catch (e) { saved = {}; }
    var cfg = { st: cl(+saved.st || 0, 0, ST.length - 1), vol: saved.vol == null ? 0.7 : cl(+saved.vol, 0, 1), auto: saved.auto == null ? 1 : saved.auto ? 1 : 0 };
    function keep() { if (AN.store) AN.store.set(KEY, JSON.stringify(cfg)); }
    function skyIdx() { return bySky(H.getAttribute('data-sky') || ''); }
    var cur = cfg.auto ? skyIdx() : cfg.st, pend = -1, seed = 0;
    var ctx = null, master = null, comp = null, an = null, freq = null, V = null, play1 = null;
    var playing = false, timer = 0, nextT = 0, step = 0, duck = 1, fade = 1, sleepAt = 0, sleepT = 0, sleepTick = 0;
    var d = null, cv = null, cx = null, dock = null, dcv = null, dcx = null, raf = 0, t0 = performance.now();
    var RM = function () { return !!AN.rm || H.getAttribute('data-motion') === 'reduce'; };

    function newSeed() { seed = (Math.floor(Math.random() * 9000) + 1000); }
    function boot() {
      if (ctx) return true;
      if (!AC) return false;
      try {
        // the toolkit makes the context inside the reader's press (Safari starts sound only from one) and lends it here
        ctx = (C.ctx && C.ctx()) || new AC({ latencyHint: 'playback' });
        // on iPhones this lets the music play even when the ring switch is on silent, like any music app
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
        master = ctx.createGain(); master.gain.value = 0;
        comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
        an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.8; freq = new Uint8Array(an.frequencyBinCount);
        master.connect(comp); comp.connect(an); an.connect(ctx.destination);
        return true;
      } catch (e) { ctx = null; return false; }
    }
    function level() { return cfg.vol * cfg.vol * duck * fade; }
    function setGain(tc) { if (master) master.gain.setTargetAtTime(level(), ctx.currentTime, tc || 0.08); }
    function start() {
      var S = ST[cur];
      if (V) { var old = V; setTimeout(function () { old.stop(); }, 4000); }
      if (!seed) newSeed();
      V = rack(ctx, master, seed); play1 = composer(S, seed); step = 0;
      V.setTempo(S.bpm, ctx.currentTime);
      nextT = Math.max(nextT, ctx.currentTime + 0.08);
      ui();
    }
    // the clock: notes are scheduled a little ahead; a hidden tab gets its timers slowed, so it looks further ahead
    function tick() {
      if (!playing || !ctx) return;
      var sp = !!(W.speechSynthesis && W.speechSynthesis.speaking), want = sp ? 0.28 : 1;
      if (want !== duck) { duck = want; setGain(0.4); }
      var ahead = D.hidden ? 1.6 : 0.16, S = ST[cur], s16 = 60 / S.bpm / 4;
      while (nextT < ctx.currentTime + ahead) {
        if (step % 16 === 0 && pend >= 0) { cur = pend; pend = -1; start(); S = ST[cur]; s16 = 60 / S.bpm / 4; }
        var sw = S.swing && step % 4 === 2 ? S.swing * s16 : 0;
        try { play1(step, nextT + sw, V, s16); } catch (e) { if (W.console) console.warn('[آینده‌نگار رادیو]', e); }
        nextT += s16; step++;
      }
    }
    function play() {
      if (playing) return;
      if (!boot()) { AN.toast('مرورگر شما پخش صدای ساخته‌شده را پشتیبانی نمی‌کند.'); return; }
      if (ctx.state === 'suspended') ctx.resume();
      playing = true; fade = 1;
      if (!V) start(); else { nextT = ctx.currentTime + 0.08; ui(); }
      setGain(0.25);
      clearInterval(timer); timer = setInterval(tick, 40); tick();
      media(); ui(); loop();
    }
    function pause(quick) {
      if (!playing) return;
      playing = false; clearInterval(timer);
      if (master) master.gain.setTargetAtTime(0, ctx.currentTime, quick ? 0.02 : 0.12);
      setTimeout(function () { if (!playing && ctx && ctx.state === 'running') ctx.suspend(); }, quick ? 120 : 700);
      sleepOff();
      media(); ui();
    }
    function toggle() { if (playing) pause(); else play(); }
    function choose(i, byHand) {
      i = (i + ST.length) % ST.length;
      if (byHand && cfg.auto) { cfg.auto = 0; }
      cfg.st = i; keep();
      if (i === cur && pend < 0) { ui(); return; }
      cur = i; seed = 0;
      // playing: the new station starts on the next scheduled step, as a fresh bar; the old notes ring out
      if (playing) { pend = i; step = Math.ceil(step / 16) * 16; } else V = null;
      ui(); media();
    }
    function fresh() {
      newSeed();
      if (playing) { pend = cur; step = Math.ceil(step / 16) * 16; } else V = null;
      ui();
      AN.toast('قطعه‌ی تازه: شماره‌ی ' + fa(seed) + ' در «' + ST[cur].name + '».');
    }

    /* sleep timer: fades out over eight seconds, then pauses */
    function sleepOff() { clearTimeout(sleepT); clearInterval(sleepTick); sleepAt = 0; var s = d && d.querySelector('.an-mu-sleep'); if (s) s.value = '0'; sleepNote(); }
    function sleep(min) {
      clearTimeout(sleepT); clearInterval(sleepTick); sleepAt = 0;
      if (min > 0) {
        sleepAt = Date.now() + min * 60000;
        sleepT = setTimeout(function () { fade = 0; if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 2.5); setTimeout(function () { pause(true); fade = 1; }, 8000); }, min * 60000);
        sleepTick = setInterval(sleepNote, 30000);
      }
      sleepNote();
    }
    function sleepNote() {
      var n = d && d.querySelector('.an-mu-sleepn'); if (!n) return;
      n.textContent = sleepAt ? 'تا حدود ' + fa(Math.max(1, Math.round((sleepAt - Date.now()) / 60000))) + ' دقیقه‌ی دیگر آرام خاموش می‌شود.' : '';
    }

    /* the system's media controls (lock screen, headphones, keyboard media keys) */
    function media() {
      var ms = navigator.mediaSession; if (!ms) return;
      try {
        if (W.MediaMetadata) ms.metadata = new W.MediaMetadata({ title: ST[cur].name, artist: 'رادیو آینده · آینده‌نگار', album: ST[cur].mood });
        ms.playbackState = playing ? 'playing' : 'paused';
        ms.setActionHandler('play', play); ms.setActionHandler('pause', function () { pause(); });
        ms.setActionHandler('nexttrack', function () { choose(cur + 1, true); });
        ms.setActionHandler('previoustrack', function () { choose(cur - 1, true); });
      } catch (e) {}
    }

    /* ---------- the window ---------- */
    var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
    var NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l8 6-8 6zM16 6h2.5v12H16z"/></svg>';
    var PREV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6l-8 6 8 6zM5.5 6H8v12H5.5z"/></svg>';
    var DICE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3"/><circle cx="15" cy="15" r="1.3"/><circle cx="15" cy="9" r="1.3"/><circle cx="9" cy="15" r="1.3"/></svg>';
    function build() {
      var list = ST.map(function (s, i) {
        return '<label class="an-mu-st" style="--m1:' + s.c[0] + ';--m2:' + s.c[1] + ';--m3:' + s.c[2] + '"><input type="radio" name="an-mu-st" value="' + i + '"><span class="an-mu-sw" aria-hidden="true"></span><b>' + esc(s.name) + '</b><small>' + esc(s.mood) + ' · ' + fa(s.bpm) + ' ضرب در دقیقه</small></label>';
      }).join('');
      d = AN.dialog('an-mu', '<div class="an-dlg-head"><h2 id="an-mu-h">رادیو آینده</h2><button type="button" class="an-dlg-x" aria-label="بستن">✕</button></div>' +
        '<div class="an-dlg-body an-x-pad">' +
        '<div class="an-mu-stage"><canvas class="an-mu-cv" width="960" height="540" role="img" aria-label="تصویر زنده‌ی موسیقی: حلقه‌ای از نور که با صدا می‌تپد و سیاره‌ای کوچک که با هر میزان یک دور می‌زند"></canvas>' +
        '<div class="an-mu-now" aria-live="polite"><b class="an-mu-name"></b><span class="an-mu-mood"></span><small class="an-mu-seed"></small></div></div>' +
        '<div class="an-mu-bar" role="group" aria-label="کنترل پخش">' +
        '<button type="button" class="an-mu-b" data-m="prev" aria-label="ایستگاه قبلی">' + PREV + '</button>' +
        '<button type="button" class="an-mu-b an-mu-play" data-m="play" aria-label="پخش">' + PLAY + '</button>' +
        '<button type="button" class="an-mu-b" data-m="next" aria-label="ایستگاه بعدی">' + NEXT + '</button>' +
        '<button type="button" class="an-btn an-btn-ghost an-btn-sm an-mu-fresh" data-m="fresh">' + DICE + 'قطعه‌ی تازه</button>' +
        '<label class="an-mu-vol"><span>بلندی</span><input type="range" class="an-mu-v" min="0" max="100" step="1" aria-label="بلندی صدا"></label></div>' +
        '<div class="an-mu-opts"><label class="an-mu-auto"><input type="checkbox" class="an-mu-a"> <span>همراه آسمان: ایستگاه با ساعت شما عوض می‌شود</span></label>' +
        '<label class="an-mu-sl"><span>خاموش شدن خودکار</span> <select class="an-mu-sleep"><option value="0">هرگز</option><option value="15">پس از ' + fa(15) + ' دقیقه</option><option value="30">پس از ' + fa(30) + ' دقیقه</option><option value="60">پس از ' + fa(60) + ' دقیقه</option></select></label>' +
        '<p class="an-x-note an-mu-sleepn" aria-live="polite"></p></div>' +
        '<fieldset class="an-mu-list"><legend>ایستگاه‌ها</legend>' + list + '</fieldset>' +
        '<p class="an-x-note">این موسیقی همین‌جا در مرورگر شما نواخته و ساخته می‌شود: فایلی دانلود نمی‌شود و چیزی به جایی فرستاده نمی‌شود. هر بار قطعه‌ای تازه است. صدا فقط با دکمه‌ی پخش شروع می‌شود و با بستن این پنجره قطع نمی‌شود؛ دکمه‌ی کوچک پایین صفحه آن را نگه می‌دارد. وقتی «بشنوید» متن مقاله را می‌خواند، موسیقی آرام می‌شود. کلید <kbd>U</kbd> همین پنجره را باز می‌کند.</p></div>', 'an-mu-dlg');
      d.setAttribute('aria-labelledby', 'an-mu-h');
      cv = d.querySelector('.an-mu-cv'); cx = cv.getContext('2d');
      d.addEventListener('click', function (e) {
        var b = e.target.closest('[data-m]'); if (!b) return;
        var k = b.getAttribute('data-m');
        if (k === 'play') toggle(); else if (k === 'next') choose(cur + 1, true); else if (k === 'prev') choose(cur - 1, true); else if (k === 'fresh') fresh();
      });
      d.addEventListener('change', function (e) {
        var t = e.target;
        if (t.name === 'an-mu-st') choose(+t.value, true);
        else if (t.classList.contains('an-mu-a')) { cfg.auto = t.checked ? 1 : 0; keep(); if (cfg.auto && skyIdx() !== cur) choose(skyIdx()); ui(); }
        else if (t.classList.contains('an-mu-sleep')) sleep(+t.value);
      });
      var v = d.querySelector('.an-mu-v');
      v.value = String(Math.round(cfg.vol * 100));
      v.addEventListener('input', function () { cfg.vol = cl(+v.value / 100, 0, 1); setGain(0.05); vText(); });
      v.addEventListener('change', keep);
      function vText() { v.setAttribute('aria-valuetext', fa(Math.round(cfg.vol * 100)) + ' درصد'); }
      vText();
      d.onclose = function () { dockShow(); };
      W.addEventListener('resize', function () { if (d.classList.contains('on')) fit(); });
    }
    function fit() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, W.devicePixelRatio || 1), w = Math.round(Math.min(1600, (r.width || 960) * dpr));
      if (w && cv.width !== w) { cv.width = w; cv.height = Math.round(w * 9 / 16); }
    }
    function ui() {
      var S = ST[cur];
      if (d) {
        d.style.setProperty('--m1', S.c[0]); d.style.setProperty('--m2', S.c[1]); d.style.setProperty('--m3', S.c[2]);
        d.querySelector('.an-mu-name').textContent = S.name;
        d.querySelector('.an-mu-mood').textContent = S.mood;
        d.querySelector('.an-mu-seed').textContent = (seed ? 'قطعه‌ی شماره‌ی ' + fa(seed) + ' · ' : '') + fa(S.bpm) + ' ضرب در دقیقه' + (cfg.auto ? ' · همراه آسمان' : '');
        var pb = d.querySelector('.an-mu-play'); pb.innerHTML = playing ? PAUSE : PLAY; pb.setAttribute('aria-label', playing ? 'مکث' : 'پخش');
        d.querySelectorAll('input[name="an-mu-st"]').forEach(function (r) { r.checked = +r.value === cur; });
        d.querySelector('.an-mu-a').checked = !!cfg.auto;
      }
      if (dock) {
        dock.querySelector('.an-mu-dn').textContent = S.name;
        var db = dock.querySelector('[data-md="play"]'); db.innerHTML = playing ? PAUSE : PLAY; db.setAttribute('aria-label', playing ? 'مکث رادیو آینده' : 'پخش رادیو آینده');
        dock.style.setProperty('--m1', S.c[0]); dock.style.setProperty('--m2', S.c[1]);
        dock.classList.toggle('on', playing);
      }
      if (C.onState) C.onState(playing, S);
    }

    /* ---------- the little dock that keeps the music when the window is closed ---------- */
    function dockShow() {
      if (!playing && !dock) return;
      if (!dock) {
        dock = D.createElement('div'); dock.className = 'an-mu-dock'; dock.setAttribute('role', 'group'); dock.setAttribute('aria-label', 'رادیو آینده');
        dock.innerHTML = '<button type="button" class="an-mu-db" data-md="play"></button><button type="button" class="an-mu-dopen" data-md="open"><canvas class="an-mu-dcv" width="56" height="32" aria-hidden="true"></canvas><span class="an-mu-dn"></span></button><button type="button" class="an-mu-db an-mu-dx" data-md="stop" aria-label="بستن رادیو آینده">✕</button>';
        dcv = dock.querySelector('.an-mu-dcv'); dcx = dcv.getContext('2d');
        dock.addEventListener('click', function (e) {
          var b = e.target.closest('[data-md]'); if (!b) return;
          var k = b.getAttribute('data-md');
          if (k === 'play') toggle(); else if (k === 'open') open(); else if (k === 'stop') { pause(); dock.hidden = true; }
        });
        D.body.appendChild(dock);
      }
      dock.hidden = false; ui(); loop();
    }

    /* ---------- the picture ---------- */
    var stars = (function () { var R = rng(77), a = []; for (var i = 0; i < 90; i++) a.push([R(), R(), 0.3 + R() * 1.2, R() * 6.28]); return a; })();
    function energy() {
      if (!an || !playing) return { lo: 0, all: 0 };
      an.getByteFrequencyData(freq);
      var lo = 0, all = 0, i;
      for (i = 1; i < 8; i++) lo += freq[i];
      for (i = 1; i < 160; i++) all += freq[i];
      return { lo: lo / (7 * 255), all: all / (159 * 255) };
    }
    function draw(now) {
      var w = cv.width, h = cv.height, S = ST[cur], rm = RM(), e = energy(), ts = (now - t0) / 1000;
      var cxp = w / 2, cyp = h / 2, base = Math.min(w, h) * 0.2 * (1 + e.lo * 0.12);
      var g = cx.createRadialGradient(cxp, cyp, 0, cxp, cyp, Math.max(w, h) * 0.7);
      g.addColorStop(0, S.c[2]); g.addColorStop(1, '#03050c');
      cx.fillStyle = g; cx.fillRect(0, 0, w, h);
      // the stars twinkle with the music
      stars.forEach(function (s) {
        var tw = rm ? 0.6 : 0.4 + 0.4 * Math.sin(ts * (0.6 + s[2]) + s[3]) + e.all * 0.8;
        cx.globalAlpha = cl(tw, 0.08, 1); cx.fillStyle = '#fff';
        cx.beginPath(); cx.arc(s[0] * w, s[1] * h, s[2] * w / 960, 0, 6.283); cx.fill();
      });
      cx.globalAlpha = 1;
      // the glow in the middle
      var og = cx.createRadialGradient(cxp, cyp, 0, cxp, cyp, base * 1.25);
      og.addColorStop(0, S.c[0]); og.addColorStop(0.45, S.c[1]); og.addColorStop(1, 'rgba(0,0,0,0)');
      cx.globalAlpha = 0.35 + e.lo * 0.5; cx.fillStyle = og; cx.beginPath(); cx.arc(cxp, cyp, base * 1.25, 0, 6.283); cx.fill(); cx.globalAlpha = 1;
      // the ring: one bar per slice of the spectrum, mirrored left and right
      var N = 96, rot = rm ? 0 : ts * 0.06;
      cx.lineCap = 'round'; cx.lineWidth = Math.max(2, w / 300);
      for (var i = 0; i < N; i++) {
        // low notes at the bottom, high ones at the top, the same on both sides; highs are lifted so the ring stays round
        var half = i < N / 2 ? i : N - 1 - i, x = 1 - half / (N / 2), bin = 2 + Math.floor(Math.pow(x, 1.7) * 150);
        var v = playing && freq ? Math.min(1, Math.pow(freq[bin] / 255, 0.85) * (1 + (1 - x) * 1.4)) : 0.04 + 0.03 * Math.sin(i * 0.7);
        var ang = rot + i / N * 6.2832 - Math.PI / 2, r1 = base * 1.05, r2 = r1 + base * (0.08 + v * 0.95);
        cx.strokeStyle = half % 2 ? S.c[0] : S.c[1]; cx.globalAlpha = 0.45 + v * 0.55;
        cx.beginPath(); cx.moveTo(cxp + Math.cos(ang) * r1, cyp + Math.sin(ang) * r1); cx.lineTo(cxp + Math.cos(ang) * r2, cyp + Math.sin(ang) * r2); cx.stroke();
      }
      cx.globalAlpha = 1;
      // the orbit: a small planet goes round once a bar, so the beat can be seen
      var orb = base * 2.15, bar = 60 / S.bpm * 4, ph = playing && ctx ? ((ctx.currentTime % bar) / bar) : 0.12;
      cx.strokeStyle = 'rgba(255,255,255,.18)'; cx.lineWidth = Math.max(1, w / 900);
      cx.beginPath(); cx.ellipse(cxp, cyp, orb, orb * 0.36, -0.18, 0, 6.283); cx.stroke();
      var pa = (rm ? 0.12 : ph) * 6.2832, px = cxp + Math.cos(pa) * orb * Math.cos(-0.18) - Math.sin(pa) * orb * 0.36 * Math.sin(-0.18), py = cyp + Math.cos(pa) * orb * Math.sin(-0.18) + Math.sin(pa) * orb * 0.36 * Math.cos(-0.18);
      var pr = Math.max(4, w / 110), pg = cx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 0, px, py, pr);
      pg.addColorStop(0, '#fff'); pg.addColorStop(1, S.c[0]);
      cx.fillStyle = pg; cx.beginPath(); cx.arc(px, py, pr, 0, 6.283); cx.fill();
    }
    function drawDock(now) {
      var w = dcv.width, h = dcv.height, rm = RM(), ts = (now - t0) / 1000;
      dcx.clearRect(0, 0, w, h);
      var css = W.getComputedStyle(dock), c1 = css.getPropertyValue('--m1').trim() || '#FFB36B';
      dcx.fillStyle = c1;
      for (var i = 0; i < 5; i++) {
        var v = playing && freq ? freq[3 + i * 18] / 255 : 0.15;
        if (rm && playing) v = 0.5;
        if (!rm && playing && !freq) v = 0.4 + 0.3 * Math.sin(ts * 6 + i);
        var bh = Math.max(3, v * (h - 4)), x = 4 + i * ((w - 8) / 5);
        dcx.fillRect(x, (h - bh) / 2, (w - 8) / 5 - 4, bh);
      }
    }
    var lastDraw = 0;
    function loop() {
      if (raf) return;
      raf = requestAnimationFrame(function f(now) {
        var big = d && d.classList.contains('on'), small = dock && !dock.hidden && !big && playing;
        if ((!big && !small) || D.hidden) { raf = 0; if (dock && !dock.hidden && dcx) drawDock(now); return; }
        // with reduced motion, a still picture that changes four times a second
        if (!RM() || now - lastDraw > 250) {
          lastDraw = now;
          if (big) draw(now);
          if (small) drawDock(now);
        }
        raf = requestAnimationFrame(f);
      });
    }
    D.addEventListener('visibilitychange', function () { if (!D.hidden) loop(); });
    // «همراه آسمان»: when the sky changes phase, the station follows at the next bar line
    if (W.MutationObserver) new W.MutationObserver(function () { if (cfg.auto && skyIdx() !== cur) choose(skyIdx()); }).observe(H, { attributes: true, attributeFilter: ['data-sky'] });

    function open() {
      if (!d) build();
      ui(); sleepNote();
      if (dock) dock.hidden = true;
      AN.openDlg(d, '.an-mu-play');
      requestAnimationFrame(function () { fit(); draw(performance.now()); loop(); });
    }
    return { open: open, toggle: toggle, play: play, pause: pause, playing: function () { return playing; }, station: function () { return ST[cur]; }, seed: function () { return seed; } };
  }

  W.AN_MUSIC = player;
  // for tools/music.mjs: render a station into an OfflineAudioContext with the same code as the page
  W.AN_MUSIC.ST = ST;
  W.AN_MUSIC.bySky = bySky;
  W.AN_MUSIC.render = function (ctx, dest, si, seed, secs) {
    var S = ST[si], V = rack(ctx, dest, seed), f = composer(S, seed), s16 = 60 / S.bpm / 4, t = 0.05, i = 0;
    V.setTempo(S.bpm, 0);
    while (t < secs) { f(i, t + (S.swing && i % 4 === 2 ? S.swing * s16 : 0), V, s16); t += s16; i++; }
    return i;
  };
})();
