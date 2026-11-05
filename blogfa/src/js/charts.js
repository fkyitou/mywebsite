/* آینده‌نگار · data tables become charts. Write a normal <table class="an-data" data-chart="bar|hbar|line">
   in the post; this turns it into an animated SVG chart and keeps the original table one click away. */
(function () {
  'use strict';
  var W = window, D = document, AN = W.AN;
  if (!AN || !AN.$) return;
  var $$ = AN.$$, el = AN.el, esc = AN.esc, NS = 'http://www.w3.org/2000/svg';
  var COLS = ['var(--rc, var(--accent))', 'var(--cyan)', 'var(--c-mind)', 'var(--c-energy)', 'var(--c-idea)'];

  function num(s) {
    s = String(s || '').replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; })
      .replace(/[٬,\s]/g, '').replace('٫', '.').replace(/[−–]/g, '-').replace(/[^\d.\-]/g, '');
    var v = parseFloat(s); return isFinite(v) ? v : null;
  }
  function decs(s) { var m = /[.٫](\d+)/.exec(String(s).replace(/[۰-۹]/g, '0')); return m ? m[1].length : 0; }
  function tick(v) { var d = 0; while (d < 2 && Math.abs(v * Math.pow(10, d) - Math.round(v * Math.pow(10, d))) > 1e-9) d++; return AN.fa(v, d); }
  function nice(maxV) { if (maxV <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(maxV))), f = maxV / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function svg(w, h) { var s = D.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); s.setAttribute('width', w); s.setAttribute('height', h); s.setAttribute('direction', 'ltr'); return s; }
  function node(p, tag, at, txt) { var n = D.createElementNS(NS, tag); for (var k in at) n.setAttribute(k, at[k]); if (txt != null) n.textContent = txt; p.appendChild(n); return n; }

  // chart type from data-chart, or from a class (an-chart-bar…) in case an editor strips data-* attributes
  function typeOf(tb) { var t = tb.getAttribute('data-chart'); if (t) return t; var m = /\ban-chart-(bar|hbar|line)\b/.exec(tb.className); return m ? m[1] : ''; }
  function read(tb) {
    var heads = $$('thead th', tb).map(function (t) { return t.textContent.trim(); }), rows = [], dmax = 0;
    $$('tbody tr', tb).forEach(function (tr) {
      var cells = $$('th,td', tr); if (cells.length < 2) return;
      var ds = [], vals = cells.slice(1).map(function (c) { var dd = decs(c.textContent); ds.push(dd); dmax = Math.max(dmax, dd); return num(c.textContent); });
      rows.push({ label: cells[0].textContent.trim(), vals: vals, ds: ds });
    });
    return { series: heads.slice(1), rows: rows, d: dmax };
  }

  function draw(fig) {
    var tb = fig._tb, o = fig._data, box = fig.querySelector('.an-ch-box'), type = typeOf(tb), unit = tb.getAttribute('data-unit') || '';
    var ref = num(tb.getAttribute('data-ref')), refL = tb.getAttribute('data-ref-label') || '', fixMax = num(tb.getAttribute('data-max'));
    var w = Math.max(300, Math.min(860, Math.round(box.clientWidth || 640))), fs = w < 480 ? 11 : 12.5, ns = o.series.length;
    var all = []; o.rows.forEach(function (r) { r.vals.forEach(function (v) { if (v != null) all.push(v); }); }); if (ref != null) all.push(ref);
    var vmax = fixMax || nice(Math.max.apply(null, all.concat([0])) * 1.08), fmt = function (v, d) { return AN.fa(v, d == null ? o.d : d) + (unit && unit.length < 3 ? unit : ''); };
    var s, h, i, j, refT = null;
    box.textContent = '';
    if (type === 'hbar') {
      var rowH = ns > 1 ? 18 * ns + 18 : 34, labW = Math.round(w * (w < 480 ? 0.42 : 0.34)), padL = 64; h = o.rows.length * rowH + 30;
      s = svg(w, h); s.setAttribute('class', 'an-ch h');
      var x0 = w - labW - 10, span = x0 - padL;
      for (i = 0; i <= 4; i++) { var gx = x0 - span * i / 4; node(s, 'line', { x1: gx, x2: gx, y1: 4, y2: h - 22, class: 'an-ch-grid' }); node(s, 'text', { x: gx, y: h - 6, 'text-anchor': 'middle', class: 'an-ch-ax' }, tick(vmax * i / 4)); }
      o.rows.forEach(function (r, ri) {
        var y = ri * rowH + 6;
        node(s, 'text', { x: w - 4, y: y + rowH / 2, 'text-anchor': 'start', direction: 'rtl', 'dominant-baseline': 'middle', class: 'an-ch-lab' }, r.label);
        r.vals.forEach(function (v, si) {
          if (v == null) return; var bh = ns > 1 ? 14 : 20, by = y + (ns > 1 ? si * 18 + 4 : (rowH - bh) / 2 - 2), bw = Math.max(2, span * v / vmax);
          var b = node(s, 'rect', { x: x0 - bw, y: by, width: bw, height: bh, rx: 4, class: 'an-ch-bar', style: 'fill:' + COLS[si % COLS.length] + ';transition-delay:' + (ri * 0.06) + 's' });
          node(b, 'title', {}, r.label + (ns > 1 ? '، ' + o.series[si] : '') + ': ' + fmt(v, r.ds[si]) + (unit.length >= 3 ? ' ' + unit : ''));
          node(s, 'text', { x: x0 - bw - 6, y: by + bh / 2, 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'an-ch-val' }, fmt(v, r.ds[si]));
        });
      });
    } else {
      h = Math.round(Math.min(380, Math.max(240, w * 0.5)));
      var pl = 52, pr = 16, pt = 18, pb = 44, cw = w - pl - pr, chh = h - pt - pb, n = o.rows.length;
      s = svg(w, h); s.setAttribute('class', 'an-ch');
      for (i = 0; i <= 4; i++) { var gy = pt + chh - chh * i / 4; node(s, 'line', { x1: pl, x2: w - pr, y1: gy, y2: gy, class: 'an-ch-grid' }); node(s, 'text', { x: pl - 8, y: gy, 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'an-ch-ax' }, tick(vmax * i / 4)); }
      var step = cw / n, every = Math.ceil(n / Math.max(2, Math.floor(cw / (fs * 4.2))));
      o.rows.forEach(function (r, ri) { if (ri % every === 0 || ri === n - 1) node(s, 'text', { x: pl + step * (ri + 0.5), y: h - pb + 20, 'text-anchor': 'middle', direction: 'rtl', class: 'an-ch-lab' }, r.label); });
      if (type === 'line') {
        for (j = 0; j < ns; j++) {
          var pts = []; o.rows.forEach(function (r, ri) { if (r.vals[j] != null) pts.push([pl + step * (ri + 0.5), pt + chh - chh * r.vals[j] / vmax, r.vals[j], r.label, r.ds[j]]); });
          if (!pts.length) continue;
          var d = pts.map(function (p, k) { return (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' '), col = COLS[j % COLS.length];
          var area = node(s, 'path', { d: d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (pt + chh) + ' L' + pts[0][0].toFixed(1) + ' ' + (pt + chh) + ' Z', class: 'an-ch-area', style: 'fill:' + col });
          area.setAttribute('opacity', '0.12');
          var ln = node(s, 'path', { d: d, class: 'an-ch-line', pathLength: 100, style: 'stroke:' + col });
          pts.forEach(function (p, k) {
            var c = node(s, 'circle', { cx: p[0], cy: p[1], r: 4.5, class: 'an-ch-dot', style: 'stroke:' + col + ';transition-delay:' + (0.2 + k * 0.08) + 's' });
            node(c, 'title', {}, p[3] + (ns > 1 ? '، ' + o.series[j] : '') + ': ' + fmt(p[2], p[4]));
            if (k === 0 || k === pts.length - 1 || n <= 8) node(s, 'text', { x: p[0], y: p[1] - 11, 'text-anchor': 'middle', class: 'an-ch-val' }, fmt(p[2], p[4]));
          });
        }
      } else {
        var gw = step * 0.72, bw2 = gw / ns;
        o.rows.forEach(function (r, ri) {
          r.vals.forEach(function (v, si) {
            if (v == null) return; var bh2 = chh * v / vmax, bx = pl + step * ri + (step - gw) / 2 + si * bw2;
            var b = node(s, 'rect', { x: bx + 1, y: pt + chh - bh2, width: Math.max(2, bw2 - 2), height: bh2, rx: 4, class: 'an-ch-bar', style: 'fill:' + COLS[si % COLS.length] + ';transition-delay:' + (ri * 0.05) + 's' });
            node(b, 'title', {}, r.label + (ns > 1 ? '، ' + o.series[si] : '') + ': ' + fmt(v, r.ds[si]));
            if (bw2 > fs * 2.6) node(s, 'text', { x: bx + bw2 / 2, y: pt + chh - bh2 - 7, 'text-anchor': 'middle', class: 'an-ch-val' }, fmt(v, r.ds[si]));
          });
        });
      }
      if (ref != null) {
        var ry = pt + chh - chh * ref / vmax;
        node(s, 'line', { x1: pl, x2: w - pr, y1: ry, y2: ry, class: 'an-ch-ref' });
        // direction rtl: in the chart's ltr frame a Persian label lost its «٪» to the far end of the line
        refT = node(s, 'text', { x: w - pr, y: ry - 7, 'text-anchor': 'start', direction: 'rtl', class: 'an-ch-reft' }, (refL ? refL + ': ' : '') + fmt(ref, decs(tb.getAttribute('data-ref'))));
        refT._at = [pl + 4, w - pr, pt, pt + chh, ry];
      }
      node(s, 'line', { x1: pl, x2: w - pr, y1: pt + chh, y2: pt + chh, class: 'an-ch-base' });
    }
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', (tb.getAttribute('data-title') || 'نمودار') + '؛ داده‌های کامل در جدول زیر نمودار آمده است.');
    s.style.fontSize = fs + 'px';
    // the halo of the values and the reference label (css: stroke in the card colour) goes under the letters; set
    // here as an SVG attribute, since the CSS validator the tests run does not know the paint-order property
    $$('.an-ch-val, .an-ch-reft', s).forEach(function (t) { t.setAttribute('paint-order', 'stroke'); });
    box.appendChild(s);
    if (refT) placeRef(s, refT, fs);
  }

  // The reference label goes to whichever end of its line, above or below it, covers the least of the value labels,
  // points, bars and line. Its old fixed place (right end, above) sat on the last values of post 1's chart on a phone.
  function placeRef(s, t, fs) {
    var a = t._at, asc = fs * 0.85, dsc = fs * 0.3, obs = [], best = null;
    function len(n) { var v = 0; try { v = n.getComputedTextLength(); } catch (e) { /* not laid out */ } return v || n.textContent.length * fs * 0.56; }
    $$('.an-ch-val', s).forEach(function (v) { var vw = len(v); obs.push([+v.getAttribute('x') - vw / 2, +v.getAttribute('y') - asc, vw, asc + dsc]); });
    $$('.an-ch-dot', s).forEach(function (c) { obs.push([+c.getAttribute('cx') - 6, +c.getAttribute('cy') - 6, 12, 12]); });
    $$('.an-ch-bar', s).forEach(function (b) { obs.push([+b.getAttribute('x'), +b.getAttribute('y'), +b.getAttribute('width'), +b.getAttribute('height')]); });
    $$('.an-ch-line', s).forEach(function (l) {
      var p = (l.getAttribute('d').match(/[\d.]+ [\d.]+/g) || []).map(function (q) { return q.split(' ').map(Number); });
      for (var i = 1; i < p.length; i++) for (var k = 0; k <= 10; k++) obs.push([p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k / 10 - 2, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k / 10 - 2, 4, 4]);
    });
    var tw = len(t), below = a[4] + asc + 5;
    // anchors in the label's rtl sense: 'start' puts its right edge at x, 'end' its left edge
    [[a[1], a[4] - 7, 'start'], [a[0], a[4] - 7, 'end'], [a[1], below, 'start'], [a[0], below, 'end']].forEach(function (c) {
      var r = [(c[2] === 'start' ? c[0] - tw : c[0]) - 3, c[1] - asc - 2, tw + 6, asc + dsc + 4], hit = 0;
      if (r[1] < a[2] - fs || r[1] + r[3] > a[3] + 2) return;
      obs.forEach(function (o) {
        var ix = Math.min(r[0] + r[2], o[0] + o[2]) - Math.max(r[0], o[0]), iy = Math.min(r[1] + r[3], o[1] + o[3]) - Math.max(r[1], o[1]);
        if (ix > 0 && iy > 0) hit += ix * iy;
      });
      if (!best || hit < best.hit) best = { c: c, hit: hit };
    });
    if (best) { t.setAttribute('x', best.c[0]); t.setAttribute('y', best.c[1]); t.setAttribute('text-anchor', best.c[2]); }
  }

  AN.charts = function (root) {
    $$('table.an-data', root || D).filter(typeOf).forEach(function (tb) {
      if (tb.closest('.an-fig')) return;
      var data = read(tb); if (!data.rows.length || !data.series.length) return;
      var title = tb.getAttribute('data-title'), cap = tb.querySelector('caption');
      var fig = el('figure', 'an-fig an-rv');
      fig.innerHTML = (title ? '<p class="an-fig-t">' + esc(title) + '</p>' : '') +
        (data.series.length > 1 ? '<div class="an-ch-leg">' + data.series.map(function (n, i) { return '<span><i style="background:' + COLS[i % COLS.length] + '"></i>' + esc(n) + '</span>'; }).join('') + '</div>' : '') +
        '<div class="an-ch-box"></div>' + (cap ? '<figcaption>' + cap.innerHTML + '</figcaption>' : '') +
        '<details class="an-fig-raw"><summary>نمایش جدول داده‌ها</summary></details>';
      tb.parentNode.insertBefore(fig, tb); fig.querySelector('details').appendChild(tb);
      fig._tb = tb; fig._data = data; draw(fig);
      var lastW = fig.clientWidth, t;
      W.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (Math.abs(fig.clientWidth - lastW) > 40) { lastW = fig.clientWidth; draw(fig); } }, 200); });
    });
    if (AN.reveal) AN.reveal(root);
  };
})();
