/* آینده‌نگار · sound: an optional sound layer, off until the reader turns it on (speaker button, or M).
   Everything is synthesised with the Web Audio API, so there are no audio files to host or download.
   It stays quiet and short: a low "orbital" drone while the hero is on screen, soft ticks on hover,
   a blip on press, a breath of air when a dialog opens, a chord when switching A/B, and ticks that follow
   lab sliders so the controls feel physical. The choice is remembered (localStorage 'an-snd'); browsers only
   allow audio after a click or key press, so a remembered "on" waits for the first one.
   Sound never carries anything that is not also on screen: muting it loses nothing. */
(function () {
  'use strict';
  var W = window, D = document, AN = W.AN || (W.AN = {});
  var AC = W.AudioContext || W.webkitAudioContext;
  var btns = Array.prototype.slice.call(D.querySelectorAll('[data-an="sound"]'));
  if (!AC) { btns.forEach(function (b) { b.hidden = true; }); return; }
  var store = AN.store || { get: function () { return null; }, set: function () {} };
  var want = store.get('an-snd') === '1', ctx = null, out = null, noise = null, drone = null, heroOn = false, last = {};

  function boot() {
    if (ctx) return true;
    try {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.connect(ctx.destination);
      out = ctx.createGain(); out.gain.value = 0; out.connect(comp);
      var len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
      for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      noise = buf;
      return true;
    } catch (e) { ctx = null; return false; }
  }
  function live() { return want && ctx && ctx.state === 'running'; }
  function throttle(k, ms) { var n = performance.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; }
  // one short tone with a fast attack and an exponential tail
  function tone(f, dur, type, gain, glide, delay) {
    if (!live()) return;
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(f * glide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  // filtered noise swept up (open) or down (close)
  function air(up) {
    if (!live()) return;
    var t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(up ? 380 : 2200, t); f.frequency.exponentialRampToValueAtTime(up ? 2400 : 360, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.36);
  }
  var cue = {
    hover: function () { if (throttle('h', 70)) tone(2100 + Math.random() * 300, 0.045, 'sine', 0.018); },
    press: function () { if (throttle('p', 60)) { tone(620, 0.09, 'triangle', 0.05, 1.5); tone(1240, 0.07, 'sine', 0.02, 1.2, 0.03); } },
    open: function () { air(true); tone(880, 0.18, 'sine', 0.02, 1.25, 0.05); },
    close: function () { air(false); },
    night: function () { [220, 261.63, 329.63].forEach(function (f, i) { tone(f, 0.6, 'sine', 0.035, 1, i * 0.07); }); },
    day: function () { [392, 493.88, 587.33].forEach(function (f, i) { tone(f, 0.55, 'sine', 0.035, 1, i * 0.06); }); },
    slide: function (v) { if (throttle('s', 45)) tone(280 + v * 640, 0.05, 'triangle', 0.03); }
  };
  AN.sound = cue;

  /* the drone: two detuned low voices and a soft fifth, breathing through a slowly moving low-pass */
  function droneOn() {
    if (!live() || drone) return;
    var t = ctx.currentTime, g = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain(), vs = [];
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 3;
    lfo.frequency.value = 0.05; lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
    [[55, 'sawtooth', 0.5], [55.4, 'sawtooth', 0.5], [82.41, 'triangle', 0.6], [220, 'sine', 0.12]].forEach(function (v) {
      var o = ctx.createOscillator(), og = ctx.createGain(); o.type = v[1]; o.frequency.value = v[0]; og.gain.value = v[2];
      o.connect(og); og.connect(lp); o.start(t); vs.push(o);
    });
    lp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 2.4);
    drone = { g: g, vs: vs.concat([lfo]) };
  }
  function droneOff() {
    if (!drone || !ctx) return;
    var d = drone, t = ctx.currentTime; drone = null;
    d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(Math.max(d.g.gain.value, 0.0001), t); d.g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    d.vs.forEach(function (o) { o.stop(t + 1.5); });
  }
  function sync() { if (live() && heroOn && !D.hidden) droneOn(); else droneOff(); }

  function paint() {
    btns.forEach(function (b) {
      b.setAttribute('aria-pressed', want ? 'true' : 'false');
      b.setAttribute('aria-label', want ? 'صدای وبلاگ: روشن' : 'صدای وبلاگ: خاموش');
    });
  }
  function start() {
    if (!want || !boot()) return;
    var go = function () { out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0.9, ctx.currentTime, 0.15); sync(); };
    if (ctx.state === 'suspended') ctx.resume().then(go, function () {}); else go();
  }
  function set(on) {
    want = on; store.set('an-snd', on ? '1' : '0'); paint();
    if (on) { start(); setTimeout(cue.press, 60); if (AN.toast) AN.toast('صدا روشن شد. برای خاموش کردن، دوباره روی بلندگو بزنید یا کلید M را فشار دهید.'); }
    else { droneOff(); if (ctx && out) out.gain.setTargetAtTime(0, ctx.currentTime, 0.08); if (AN.toast) AN.toast('صدا خاموش شد.'); }
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { set(!want); }); });
  paint();
  // a remembered "on" starts with the first click or key press (browsers block audio before that)
  if (want) {
    var first = function () { D.removeEventListener('pointerdown', first, true); D.removeEventListener('keydown', first, true); start(); };
    D.addEventListener('pointerdown', first, true); D.addEventListener('keydown', first, true);
  }

  /* where the cues come from */
  var HOVER = '.an-card, .an-feat, .an-realm, .an-btn, .an-nav a, .an-chip, .an-ico-btn, .an-pillar, .an-toc a, .an-lab button';
  D.addEventListener('pointerover', function (e) {
    if (!live() || e.pointerType !== 'mouse') return;
    var t = e.target.closest && e.target.closest(HOVER);
    if (t !== last.el) { last.el = t; if (t) cue.hover(); }
  }, { passive: true });
  D.addEventListener('click', function (e) {
    if (!live() || !e.target.closest) return;
    if (e.target.closest('[data-an="sound"]')) return;
    if (e.target.closest('[data-an="ab"]')) { setTimeout(function () { (AN.v === 'b' ? cue.day : cue.night)(); }, 10); return; }
    if (e.target.closest('a, button, [role="tab"], summary, label')) cue.press();
  }, true);
  D.addEventListener('input', function (e) {
    var r = e.target;
    if (!live() || !r || r.type !== 'range') return;
    var mn = parseFloat(r.min) || 0, mx = parseFloat(r.max) || 100, v = (parseFloat(r.value) - mn) / Math.max(1e-9, mx - mn);
    cue.slide(Math.min(1, Math.max(0, v)));
  }, true);
  // dialogs (search, shortcuts, comments): AN.openDlg / AN.closeDlg live in core.js and pages.js
  ['openDlg', 'closeDlg'].forEach(function (k) {
    var f = AN[k];
    if (typeof f !== 'function') return;
    AN[k] = function () {
      var was = !!D.querySelector('.an-dlg.on'), r = f.apply(this, arguments);
      if (live() && (k === 'openDlg' || was)) (k === 'openDlg' ? cue.open : cue.close)();
      return r;
    };
  });
  D.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (e.target && e.target.isContentEditable)) return;
    if (e.key === 'm' || e.key === 'M' || e.key === 'پ') set(!want);
  });
  // the drone follows the hero, and stops with the tab
  var hero = D.getElementById('an-hero');
  if (hero && AN.page === 'home' && 'IntersectionObserver' in W) {
    new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting && es[0].intersectionRatio > 0.25; sync(); }, { threshold: [0, 0.25, 0.5] }).observe(hero);
  }
  D.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (D.hidden) { droneOff(); if (ctx.state === 'running') ctx.suspend(); }
    else if (want) ctx.resume().then(sync, function () {});
  });
})();
