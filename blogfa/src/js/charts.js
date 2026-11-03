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
    var s, h, i, j;
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
          node(b, 'title', {}, r.label + (ns > 1 ? ' · ' + o.series[si] : '') + ': ' + fmt(v, r.ds[si]) + (unit.length >= 3 ? ' ' + unit : ''));
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
            node(c, 'title', {}, p[3] + (ns > 1 ? ' · ' + o.series[j] : '') + ': ' + fmt(p[2], p[4]));
            if (k === 0 || k === pts.length - 1 || n <= 8) node(s, 'text', { x: p[0], y: p[1] - 11, 'text-anchor': 'middle', class: 'an-ch-val' }, fmt(p[2], p[4]));
          });
        }
      } else {
        var gw = step * 0.72, bw2 = gw / ns;
        o.rows.forEach(function (r, ri) {
          r.vals.forEach(function (v, si) {
            if (v == null) return; var bh2 = chh * v / vmax, bx = pl + step * ri + (step - gw) / 2 + si * bw2;
            var b = node(s, 'rect', { x: bx + 1, y: pt + chh - bh2, width: Math.max(2, bw2 - 2), height: bh2, rx: 4, class: 'an-ch-bar', style: 'fill:' + COLS[si % COLS.length] + ';transition-delay:' + (ri * 0.05) + 's' });
            node(b, 'title', {}, r.label + (ns > 1 ? ' · ' + o.series[si] : '') + ': ' + fmt(v, r.ds[si]));
            if (bw2 > fs * 2.6) node(s, 'text', { x: bx + bw2 / 2, y: pt + chh - bh2 - 7, 'text-anchor': 'middle', class: 'an-ch-val' }, fmt(v, r.ds[si]));
          });
        });
      }
      if (ref != null) {
        var ry = pt + chh - chh * ref / vmax;
        node(s, 'line', { x1: pl, x2: w - pr, y1: ry, y2: ry, class: 'an-ch-ref' });
        node(s, 'text', { x: w - pr, y: ry - 7, 'text-anchor': 'end', class: 'an-ch-reft' }, (refL ? refL + ': ' : '') + fmt(ref, decs(tb.getAttribute('data-ref'))));
      }
      node(s, 'line', { x1: pl, x2: w - pr, y1: pt + chh, y2: pt + chh, class: 'an-ch-base' });
    }
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', (tb.getAttribute('data-title') || 'نمودار') + '؛ داده‌های کامل در جدول زیر نمودار آمده است.');
    s.style.fontSize = fs + 'px';
    box.appendChild(s);
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
