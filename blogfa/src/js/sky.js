/* آینده‌نگار · sky: drives the site background (css/08-sky.css).
   Scroll moves the two star layers at different depths, turns the orbit rings and raises the dawn wash
   toward the footer, so reading down the page feels like travelling toward the sunrise. A fine pointer
   moves a soft light. Only transform and opacity change, at most once per frame and only after an event,
   so nothing runs while the page is still or hidden. Reduced motion keeps the sky still.
   The CSS star field is swapped for seeded canvas tiles: denser, crisp on Retina, the same on every visit. */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement, AN = W.AN || (W.AN = {});
  var sky = D.getElementById('an-sky');
  if (!sky) return;
  var q = function (s) { return sky.querySelector(s); };
  var stars = Array.prototype.slice.call(sky.querySelectorAll('[data-depth]'));
  var dawn = q('.an-sky-dawn'), orbits = q('.an-sky-orbits'), light = q('.an-sky-light');
  var still = function () { return !!AN.rm || H.getAttribute('data-motion') === 'reduce'; };
  stars.forEach(function (el) { el._t = parseFloat(W.getComputedStyle(el).getPropertyValue('--tile')) || 300; });

  /* seeded star tiles (Park–Miller generator): no image to download, the same sky on every visit.
     Each tile is a small SVG (one circle with a soft radial gradient per star) set as the layer's background.
     An SVG is drawn by the browser's raster threads and stays sharp at any pixel density; the first version
     drew a canvas and encoded it with toBlob, which waits for the GPU and blocked the page for seconds on a
     machine without a hardware GPU (docs/06-qa-report.md, performance). */
  function rnd(seed) { return function () { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }; }
  var TINT = { w: '236,242,255', o: '255,214,170', b: '176,204,255' };
  function tile(el, size, count, maxR, seed) {
    var r = rnd(seed), defs = '', dots = '';
    for (var k in TINT) defs += '<radialGradient id="' + k + '"><stop offset="0" stop-color="rgb(' + TINT[k] + ')"/><stop offset=".32" stop-color="rgb(' + TINT[k] + ')" stop-opacity=".42"/><stop offset="1" stop-color="rgb(' + TINT[k] + ')" stop-opacity="0"/></radialGradient>';
    for (var i = 0; i < count; i++) {
      var rad = 0.3 + Math.pow(r(), 4) * maxR, m = rad * 3 + 1, px = m + r() * (size - 2 * m), py = m + r() * (size - 2 * m);
      var a = 0.2 + Math.pow(r(), 1.7) * 0.8, t = r(), c = t < 0.12 ? 'o' : t > 0.88 ? 'b' : 'w';
      dots += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + (rad * 3).toFixed(2) + '" fill="url(#' + c + ')" opacity="' + a.toFixed(2) + '"/>';
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '"><defs>' + defs + '</defs>' + dots + '</svg>';
    el.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    el.style.backgroundSize = size + 'px ' + size + 'px';
    el.style.setProperty('--tile', size + 'px'); el._t = size; req();
  }
  function makeTiles() {
    if (H.getAttribute('data-v') === 'b') return; // the day sky has no stars; tiles are drawn if A is chosen later
    if (sky._tiles) return; sky._tiles = 1;
    var big = W.innerWidth > 700;
    stars.forEach(function (el, i) {
      if (i === 0 && big) tile(el, 256, 70, 0.9, 7919);
      else if (i === 1) tile(el, 512, big ? 46 : 30, 1.9, 104729);
    });
  }

  /* scroll and pointer → one frame of transforms */
  var vh = W.innerHeight, span = 1, y = 0, px = 0, py = 0, lx = 0, ly = 0, on = false, raf = 0;
  function measure() { vh = W.innerHeight; span = Math.max(1, H.scrollHeight - vh); req(); }
  function req() { if (!raf) raf = W.requestAnimationFrame(frame); }
  function frame() {
    raf = 0;
    y = W.pageYOffset || H.scrollTop || 0;
    var p = Math.min(1, Math.max(0, y / span));
    if (dawn) dawn.style.opacity = (0.22 + 0.78 * p * p).toFixed(3);
    if (still()) return;
    for (var i = 0; i < stars.length; i++) {
      var el = stars[i], d = parseFloat(el.getAttribute('data-depth')) || 0;
      el.style.transform = 'translate3d(0,' + (-((y * d) % el._t)).toFixed(1) + 'px,0)';
    }
    if (orbits) orbits.style.transform = 'translate3d(0,' + (-y * 0.025).toFixed(1) + 'px,0) rotate(' + (y * 0.006).toFixed(2) + 'deg)';
    if (light && on) {
      lx += (px - lx) * 0.14; ly += (py - ly) * 0.14;
      light.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)';
      if (Math.abs(px - lx) + Math.abs(py - ly) > 0.5) req();
    }
  }
  W.addEventListener('scroll', req, { passive: true });
  W.addEventListener('resize', measure);
  if (W.ResizeObserver) new W.ResizeObserver(measure).observe(D.body || H);
  if (light && !still() && W.matchMedia && W.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    W.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      px = e.clientX; py = e.clientY;
      if (!on) { on = true; lx = px; ly = py; light.classList.add('on'); }
      req();
    }, { passive: true });
    var off = function () { on = false; light.classList.remove('on'); };
    H.addEventListener('mouseleave', off); W.addEventListener('blur', off);
  }
  /* Software rendering (no hardware GPU: SwiftShader, llvmpipe, Windows WARP, or the GPU switched off) draws
     every frame on the CPU. There the endless background animations pause (css/08-sky.css), because each of
     them makes the browser redraw the whole screen every frame: measured on an article, 496 frames in 4 s
     with them and 16 without. A WebGL context asked to fail on a "major performance caveat" is the browser's
     own answer; the renderer name is the backup. The answer is kept for the browser session. */
  function probeGPU() {
    var s = AN.gpu;
    if (!s) {
      var gl = null, soft = true;
      try { gl = D.createElement('canvas').getContext('webgl', { failIfMajorPerformanceCaveat: true }); } catch (e) {}
      if (gl) {
        var rn = String(gl.getParameter(gl.RENDERER)), dbg = /^webkit webgl$/i.test(rn) && gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) rn = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
        soft = /swiftshader|llvmpipe|softpipe|software|basic render|warp/i.test(rn);
        var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      }
      s = AN.gpu = soft ? 'soft' : 'hw';
      try { sessionStorage.setItem('an-gpu', s); } catch (e) {}
    }
    if (s === 'soft') H.setAttribute('data-gpu', 'soft');
  }
  // A ↔ B: the night sky needs its stars the first time A is shown
  if (W.MutationObserver) new W.MutationObserver(function () { if (H.getAttribute('data-v') !== 'b') makeTiles(); }).observe(H, { attributes: true, attributeFilter: ['data-v'] });
  (W.requestIdleCallback || function (f) { return setTimeout(f, 300); })(function () { probeGPU(); makeTiles(); });
  measure();
  AN.sky = { refresh: measure };
})();
