/* آینده‌نگار · shared building blocks for the live labs: sharp canvases, sliders, toggles, stats, a power-aware loop. */
(function () {
  'use strict';
  var W = window, D = document, AN = W.AN;
  if (!AN || !AN.el) return;
  var el = AN.el, esc = AN.esc, uid = 0;
  var ui = AN.ui = {};
  ui.stage = function (root, o) {
    o = o || {};
    var wrap = el('div', 'an-lab-stage' + (o.tall ? ' an-stage-tall' : '')), cv = el('canvas');
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', o.label || 'نمایش زنده‌ی آزمایشگاه');
    cv.style.aspectRatio = o.ratio || '16 / 9'; wrap.appendChild(cv);
    if (o.hint) wrap.appendChild(el('p', 'an-lab-hint', esc(o.hint)));
    root.appendChild(wrap);
    var S = { wrap: wrap, cv: cv, ctx: cv.getContext('2d'), w: 0, h: 0, k: 1, cbs: [] };
    S.fit = function () {
      var r = cv.getBoundingClientRect(), k = Math.min(W.devicePixelRatio || 1, 2.5), w = Math.max(1, Math.round(r.width * k)), h = Math.max(1, Math.round(r.height * k));
      if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; }
      S.w = w; S.h = h; S.k = k; S.cbs.forEach(function (f) { f(S); });
    };
    S.onResize = function (f) { S.cbs.push(f); };
    S.pos = function (e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; return { x: (p.clientX - r.left) / r.width * S.w, y: (p.clientY - r.top) / r.height * S.h }; };
    var t; W.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(S.fit, 120); });
    setTimeout(S.fit, 0); S.fit();
    return S;
  };
  ui.body = function (root) { var b = el('div', 'an-lab-body'); root.appendChild(b); return b; };
  ui.row = function (p, cls) { var r = el('div', cls || 'an-lab-ctl'); p.appendChild(r); return r; };
  ui.range = function (p, o) {
    var id = 'an-r' + (++uid), f = el('div', 'an-field'), fmt = o.fmt || function (v) { return AN.fa(v); };
    f.innerHTML = '<label for="' + id + '"><span>' + esc(o.label) + '</span><output for="' + id + '"></output></label><input class="an-range" type="range" id="' + id + '" min="' + o.min + '" max="' + o.max + '" step="' + (o.step || 1) + '" value="' + o.value + '">';
    p.appendChild(f);
    var inp = f.querySelector('input'), out = f.querySelector('output');
    function paint() { var v = +inp.value; out.textContent = fmt(v); inp.style.setProperty('--v', ((v - o.min) / (o.max - o.min) * 100) + '%'); inp.setAttribute('aria-valuetext', out.textContent); }
    inp.addEventListener('input', function () { paint(); if (o.on) o.on(+inp.value); });
    paint();
    return { el: f, input: inp, get: function () { return +inp.value; }, set: function (v, silent) { inp.value = v; paint(); if (!silent && o.on) o.on(+inp.value); } };
  };
  ui.seg = function (p, label, opts, val, on) {
    var f = el('div', 'an-field'), g = el('div', 'an-seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', label);
    if (label) f.appendChild(el('span', 'an-lbl', '<span>' + esc(label) + '</span>'));
    f.appendChild(g); p.appendChild(f);
    var bs = opts.map(function (o) { var b = el('button', '', esc(o[1])); b.type = 'button'; b.setAttribute('aria-pressed', String(o[0] === val)); b.addEventListener('click', function () { set(o[0]); if (on) on(o[0]); }); g.appendChild(b); return b; });
    function set(v) { val = v; opts.forEach(function (o, i) { bs[i].setAttribute('aria-pressed', String(o[0] === v)); }); }
    return { el: f, set: set, get: function () { return val; } };
  };
  ui.btns = function (p, list) {
    var g = el('div', 'an-lab-btns'); p.appendChild(g);
    return list.map(function (b) { var x = el('button', b[2] ? 'pri' : '', b[0]); x.type = 'button'; x.addEventListener('click', b[1]); g.appendChild(x); return x; });
  };
  ui.stats = function (p, list) {
    var g = el('div', 'an-lab-out'), m = {}; g.setAttribute('aria-live', 'polite'); p.appendChild(g);
    list.forEach(function (s) { var d = el('div', 'an-stat', '<small>' + esc(s[1]) + '</small><b>—</b>'); g.appendChild(d); m[s[0]] = d; });
    return { el: g, set: function (k, v, cls) { var d = m[k]; if (!d) return; d.querySelector('b').textContent = v; d.className = 'an-stat' + (cls ? ' ' + cls : ''); } };
  };
  ui.note = function (p, html) { var n = el('p', 'an-lab-note', html); p.appendChild(n); return n; };
  ui.tabs = function (root, names, on) {
    var bar = el('div', 'an-lab-tabs'), panes = []; bar.setAttribute('role', 'tablist'); root.appendChild(bar);
    var btns = names.map(function (n, i) {
      var b = el('button', '', esc(n)), pn = el('div', 'an-lab-pane'); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'an-tb' + (++uid); pn.setAttribute('role', 'tabpanel'); pn.setAttribute('aria-labelledby', b.id);
      b.addEventListener('click', function () { show(i); }); bar.appendChild(b); root.appendChild(pn); panes.push(pn); return b;
    });
    function show(i) { btns.forEach(function (b, j) { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; panes[j].hidden = i !== j; }); if (on) on(i); }
    bar.addEventListener('keydown', function (e) { var i = btns.indexOf(D.activeElement); if (i < 0) return; if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); var n = (i + (e.key === 'ArrowLeft' ? 1 : -1) + btns.length) % btns.length; btns[n].focus(); show(n); } });
    show(0);
    return { panes: panes, show: show };
  };
  /* requestAnimationFrame loop that sleeps when the lab is off-screen or the tab is hidden */
  ui.loop = function (box, fn) {
    var on = true, vis = true, raf = 0, last = 0;
    function tick(t) { raf = 0; if (!on || !vis || D.hidden) return; var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t; fn(dt, t); raf = requestAnimationFrame(tick); }
    function go() { if (!raf && on && vis && !D.hidden) { last = 0; raf = requestAnimationFrame(tick); } }
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; go(); }).observe(box);
    D.addEventListener('visibilitychange', go);
    go();
    return { stop: function () { on = false; }, start: function () { on = true; go(); }, get running() { return on; } };
  };
  ui.col = function (name) { return getComputedStyle(D.documentElement).getPropertyValue(name).trim() || '#FFB36B'; };
  ui.fmtTime = function (sec) {
    if (!isFinite(sec)) return 'بی‌نهایت';
    var u = [[3.15576e16, 'میلیارد سال'], [3.15576e13, 'میلیون سال'], [3.15576e10, 'هزار سال'], [31557600, 'سال'], [2629800, 'ماه'], [86400, 'روز'], [3600, 'ساعت'], [60, 'دقیقه'], [1, 'ثانیه']];
    if (sec < 1) return 'کمتر از یک ثانیه';
    if (sec > 3.15576e19) return 'بیش از ' + AN.fa(1000) + ' میلیارد سال';
    for (var i = 0; i < u.length; i++) if (sec >= u[i][0]) { var v = sec / u[i][0]; return AN.fa(v, v < 10 ? 1 : 0) + ' ' + u[i][1]; }
    return AN.fa(sec) + ' ثانیه';
  };
})();
