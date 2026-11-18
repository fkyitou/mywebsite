// Builds src/js/data-geo.js: compact land outlines (Natural Earth via world-atlas, public domain)
// and city points (GeoNames via all-the-cities, CC BY 4.0) for the hero globe.
// Encoding: URL-safe base64 alphabet, zigzag varints in 5-bit groups (bit 6 = continuation).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
const require = createRequire(import.meta.url);

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const zz = n => (n << 1) ^ (n >> 31);
function vint(u) { let s = ''; do { let c = u & 31; u >>>= 5; if (u) c |= 32; s += A[c]; } while (u); return s; }

// Douglas–Peucker on quantized integer points
function dp(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = -1, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = L === 1 && dx === 0 && dy === 0 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / L;
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const areaQ = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(s / 2); };

function encodeLand(file, q, tol, minArea) {
  const topo = JSON.parse(readFileSync(require.resolve('world-atlas/' + file), 'utf8'));
  const land = feature(topo, topo.objects.land);
  const polys = land.type === 'MultiPolygon' ? land.coordinates : land.features ? land.features.flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) : land.geometry.coordinates;
  let out = '', rings = 0, pts = 0;
  for (const poly of (land.geometry ? (land.geometry.type === 'Polygon' ? [land.geometry.coordinates] : land.geometry.coordinates) : polys)) {
    for (const ring of poly) {
      let r = ring.map(([lo, la]) => [Math.round((lo + 180) / q), Math.round((90 - la) / q)]);
      r = r.filter((p, i) => i === 0 || p[0] !== r[i - 1][0] || p[1] !== r[i - 1][1]);
      if (r.length > 2 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) r.pop();
      r = dp(r.concat([r[0]]), tol); r.pop();
      if (r.length < 3 || areaQ(r) * q * q < minArea) continue;
      out += vint(r.length) + vint(r[0][0]) + vint(r[0][1]);
      for (let i = 1; i < r.length; i++) out += vint(zz(r[i][0] - r[i - 1][0])) + vint(zz(r[i][1] - r[i - 1][1]));
      rings++; pts += r.length;
    }
  }
  return { out, rings, pts };
}

function encodeCities(minPop, q) {
  const c = require('all-the-cities').filter(x => x.population >= minPop)
    .map(x => ({ x: Math.round((x.loc.coordinates[0] + 180) / q), y: Math.round((90 - x.loc.coordinates[1]) / q), p: x.population }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  let out = vint(c.length), px = 0, py = 0;
  for (const k of c) {
    const cls = Math.max(0, Math.min(31, Math.round((Math.log10(k.p) - Math.log10(minPop)) * 8)));
    out += vint(k.x - px) + vint(zz(k.y - py)) + A[cls];
    px = k.x; py = k.y;
  }
  return { out, n: c.length };
}

const mode = process.argv[2] || 'build';
if (mode === 'measure') {
  for (const [f, q, t, m] of [['land-110m.json', .1, 0, .02], ['land-110m.json', .1, .6, .05], ['land-50m.json', .1, .8, .1], ['land-50m.json', .1, 1.2, .2], ['land-50m.json', .08, 1.5, .2]]) {
    const r = encodeLand(f, q, t, m); console.log(f, 'q', q, 'tol', t, 'minA', m, '→ rings', r.rings, 'pts', r.pts, 'chars', r.out.length);
  }
  for (const [p, q] of [[200e3, .1], [150e3, .1], [100e3, .1], [100e3, .2]]) { const r = encodeCities(p, q); console.log('cities ≥', p, 'q', q, '→', r.n, 'chars', r.out.length); }
} else {
  const [f, q, t, m] = JSON.parse(process.argv[3] || '["land-50m.json",0.1,1.2,0.2]');
  const L = encodeLand(f, q, t, m), C = encodeCities(+process.argv[4] || 150e3, .1);
  const js = `/* Geodata for the hero globe. Land: Natural Earth ${f.replace('.json', '')} (public domain) via world-atlas; ` +
    `cities ≥ ${(+process.argv[4] || 150e3) / 1e3}k people: GeoNames (CC BY 4.0) via all-the-cities. Encoded by tools/geodata.mjs. */\n` +
    `window.AN_GEO={q:${q},cq:0.1,land:"${L.out}",cities:"${C.out}"};\n`;
  writeFileSync(new URL('../src/js/data-geo.js', import.meta.url), js);
  console.log('wrote data-geo.js', js.length, 'bytes; rings', L.rings, 'pts', L.pts, 'cities', C.n);
}
