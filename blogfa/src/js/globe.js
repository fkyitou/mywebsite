/* آینده‌نگار · hero globe
   WebGL1 Earth seen from orbit at sunrise: real coastlines (Natural Earth), real city lights
   (GeoNames cities ≥ 100k, the set in data-geo.js), clouds baked once into a texture, analytic atmosphere, a sun that
   rises over the limb, and illustrative data arcs between cities drawn on a 2D overlay.
   Progressive: WebGL → static Canvas2D night globe → CSS gradient only.
   Pauses off-screen and in hidden tabs; lowers its resolution when frames get slow, and keeps a still
   picture (as with reduced motion) where the device cannot draw it smoothly. */
(function () {
  'use strict';
  var W = window, D = document, AN = W.AN || (W.AN = {});
  var G = W.AN_GEO, host = D.getElementById('an-globe');
  if (!host || !G) return;
  if (AN.page && AN.page !== 'home') return; // the hero (and its globe) only shows on the home page
  var RM = !!(W.AN && W.AN.rm) || (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var COARSE = W.matchMedia && W.matchMedia('(pointer: coarse)').matches;
  var LOWEND = COARSE || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

  /* ---------- compact geodata decoding (format: tools/geodata.mjs) ---------- */
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', LUT = new Int8Array(128);
  for (var i = 0; i < 64; i++) LUT[B64.charCodeAt(i)] = i;
  function reader(s) {
    var p = 0;
    return {
      more: function () { return p < s.length; },
      u: function () { var r = 0, m = 1, c; do { c = LUT[s.charCodeAt(p++)]; r += (c & 31) * m; m *= 32; } while (c & 32); return r; },
      z: function () { var u = this.u(); return u % 2 ? -(u + 1) / 2 : u / 2; },
      ch: function () { return LUT[s.charCodeAt(p++)]; }
    };
  }
  var LAND = [], CITIES = [];
  (function () {
    var r = reader(G.land);
    while (r.more()) {
      var n = r.u(), x = r.u(), y = r.u(), a = new Float32Array(n * 2);
      a[0] = x; a[1] = y;
      for (var k = 1; k < n; k++) { x += r.z(); y += r.z(); a[2 * k] = x; a[2 * k + 1] = y; }
      LAND.push(a);
    }
    var c = reader(G.cities), cn = c.u(), cx = 0, cy = 0;
    for (var j = 0; j < cn; j++) { cx += c.u(); cy += c.z(); CITIES.push([90 - cy * G.cq, cx * G.cq - 180, c.ch()]); }
  })();

  /* Hubs and links are illustrative (not measured traffic): they show the idea of a connected planet. */
  var HUBS = {
    teh: [35.69, 51.39, 'تهران'], ist: [41.01, 28.98], dxb: [25.2, 55.27], bom: [19.08, 72.88], sin: [1.35, 103.82],
    sha: [31.23, 121.47], tyo: [35.68, 139.69], syd: [-33.87, 151.21], fra: [50.11, 8.68], lon: [51.51, -0.13],
    nyc: [40.71, -74.01], sfo: [37.77, -122.42], sao: [-23.55, -46.63], los: [6.52, 3.38], jnb: [-26.2, 28.05],
    cai: [30.04, 31.24], mow: [55.76, 37.62], sel: [37.57, 126.98], nbo: [-1.29, 36.82], mex: [19.43, -99.13]
  };
  var LINKS = [['teh', 'ist'], ['teh', 'dxb'], ['teh', 'mow'], ['teh', 'bom'], ['dxb', 'bom'], ['bom', 'sin'], ['sin', 'sha'],
    ['sha', 'tyo'], ['tyo', 'sfo'], ['sfo', 'nyc'], ['nyc', 'lon'], ['lon', 'fra'], ['fra', 'ist'], ['ist', 'mow'], ['cai', 'dxb'],
    ['los', 'lon'], ['los', 'jnb'], ['jnb', 'nbo'], ['nbo', 'dxb'], ['sao', 'nyc'], ['sao', 'los'], ['syd', 'sin'], ['sel', 'tyo'],
    ['mex', 'sfo'], ['fra', 'teh'], ['cai', 'fra']];

  /* ---------- shared camera / rotation math (shader and overlay use the same) ---------- */
  var DIST = 4.0, ALPHA = Math.asin(1 / DIST), TANA = Math.tan(ALPHA);
  var st = {
    yaw: -50 * Math.PI / 180, pitch: 24 * Math.PI / 180, vyaw: 0, drag: null, tiltX: 0, tiltY: 0, ttX: 0, ttY: 0,
    prog: 0, rise: RM ? 1 : 0, t: 0, alive: RM ? 1 : 0.35, vis: true, cx: 0, cy: 0, R: 1, w: 1, h: 1
  };
  function rotM(yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // M = Rx(pitch) · Ry(yaw), row-major
    return [cy, 0, sy, sp * sy, cp, -sp * cy, -cp * sy, sp, cp * cy];
  }
  function llq(lat, lon) {
    var a = lat * Math.PI / 180, o = lon * Math.PI / 180, c = Math.cos(a);
    return [c * Math.sin(o), Math.sin(a), c * Math.cos(o)];
  }
  function mul(M, v) { return [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]]; }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function sunDir() {
    // From just behind the limb (sunrise) toward the front-right as the reader scrolls.
    var e = 1 - Math.pow(1 - st.rise, 3), behind = ALPHA + (e * 0.034 - 0.02);
    var ph = 0.62, s0 = [Math.sin(behind) * Math.cos(ph), Math.sin(behind) * Math.sin(ph), -Math.cos(behind)];
    var s1 = [0.78, 0.36, 0.52], k = Math.min(1, Math.max(0, st.prog)) * 0.9;
    return norm([s0[0] + (s1[0] - s0[0]) * k, s0[1] + (s1[1] - s0[1]) * k, s0[2] + (s1[2] - s0[2]) * k]);
  }
  function layout() {
    var r = host.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    st.w = w; st.h = h;
    // One column (≤ 860px, as in 07-responsive.css): the Earth rises as a horizon across the lower part of the
    // first screen, its limb behind the buttons, instead of sitting at the bottom of a hero taller than the
    // screen, where the stats card and the hero's fade-out hid it.
    if (w <= 860) { var vh = Math.min(h, W.innerHeight || h); st.R = Math.min(w * 0.92, vh * 0.6); st.cx = w * 0.5; st.cy = vh * 0.62 + st.R; }
    else { st.R = Math.min(w * 0.27, h * 0.43); st.cx = w * 0.29; st.cy = h * 0.53; }
  }

  /* ---------- textures built on the client from vector data ---------- */
  function makeCanvas(w, h) { var c = D.createElement('canvas'); c.width = w; c.height = h; return c; }
  // the map layers are read back with getImageData: keep them in main memory, so reading them does not wait for the GPU
  function cpu2d(c) { return c.getContext('2d', { willReadFrequently: true }); }
  function landCanvas(TW, TH) {
    var c = makeCanvas(TW, TH), x = cpu2d(c), sx = TW / (360 / G.q), sy = TH / (180 / G.q);
    x.fillStyle = '#000'; x.fillRect(0, 0, TW, TH); x.fillStyle = '#fff'; x.beginPath();
    for (var i = 0; i < LAND.length; i++) {
      var a = LAND[i]; x.moveTo(a[0] * sx, a[1] * sy);
      for (var k = 2; k < a.length; k += 2) x.lineTo(a[k] * sx, a[k + 1] * sy);
      x.closePath();
    }
    x.fill('evenodd');
    return c;
  }
  function blurred(src, f) {
    var w = Math.max(8, src.width / f | 0), h = Math.max(4, src.height / f | 0), s = makeCanvas(w, h), sx = cpu2d(s);
    sx.imageSmoothingEnabled = true; sx.drawImage(src, 0, 0, w, h);
    var s2 = makeCanvas(w >> 1 || 1, h >> 1 || 1), s2x = cpu2d(s2); s2x.drawImage(s, 0, 0, s2.width, s2.height);
    var o = makeCanvas(src.width, src.height), ox = cpu2d(o);
    ox.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in ox) ox.imageSmoothingQuality = 'high';
    ox.globalAlpha = 0.5; ox.drawImage(s, 0, 0, o.width, o.height); ox.drawImage(s2, 0, 0, o.width, o.height);
    return o;
  }
  function lightsCanvas(TW, TH) {
    var c = makeCanvas(TW, TH), x = cpu2d(c), k = TW / 2048;
    x.fillStyle = '#000'; x.fillRect(0, 0, TW, TH);
    var sp = makeCanvas(32, 32), s = cpu2d(sp), g = s.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.55)'); g.addColorStop(0.65, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    s.fillStyle = g; s.fillRect(0, 0, 32, 32);
    x.globalCompositeOperation = 'lighter';
    for (var i = 0; i < CITIES.length; i++) {
      var ci = CITIES[i], px = (ci[1] + 180) / 360 * TW, py = (90 - ci[0]) / 180 * TH, cls = ci[2];
      var r = (1.3 + cls * 0.2) * k * (1 / Math.max(0.35, Math.cos(ci[0] * Math.PI / 180)));
      x.globalAlpha = Math.min(1, 0.38 + cls * 0.03);
      x.drawImage(sp, px - r, py - r * Math.cos(ci[0] * Math.PI / 180), 2 * r, 2 * r * Math.cos(ci[0] * Math.PI / 180));
    }
    return c;
  }
  /* Arid regions (soft ellipses in degrees): Sahara, Arabia, Iranian plateau, Thar, Karakum, Taklamakan, Gobi,
     Australian interior, Kalahari–Namib, Atacama, North American deserts, Patagonia, Horn of Africa. */
  var ARID = [[9, 23.5, 26, 8.5, 1], [47, 23, 11, 7, 1], [56, 32, 7.5, 4.5, .8], [71, 27, 4, 3, .7], [61, 41, 7, 4, .7],
    [83, 39, 7, 2.6, .9], [104, 42.5, 11, 4, .75], [131, -25, 15, 8, .85], [20, -24, 6.5, 6, .65], [-70, -22, 2.6, 9, .8],
    [-112, 32, 7, 5, .6], [-69, -45, 4, 6, .5], [46, 7, 5, 5, .55]];
  function aridCanvas(TW, TH) {
    var c = makeCanvas(TW, TH), x = cpu2d(c);
    x.fillStyle = '#000'; x.fillRect(0, 0, TW, TH); x.globalCompositeOperation = 'lighter';
    ARID.forEach(function (a) {
      var px = (a[0] + 180) / 360 * TW, py = (90 - a[1]) / 180 * TH, rx = a[2] / 360 * TW * 1.35, ry = a[3] / 180 * TH * 1.35;
      x.save(); x.translate(px, py); x.scale(rx / ry, 1);
      var g = x.createRadialGradient(0, 0, 0, 0, 0, ry), v = Math.round(255 * a[4]);
      [[0, 1], [0.3, 0.86], [0.55, 0.55], [0.78, 0.22], [1, 0]].forEach(function (k) { g.addColorStop(k[0], 'rgba(' + v + ',' + v + ',' + v + ',' + k[1] + ')'); });
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, ry, 0, 6.2832); x.fill(); x.restore();
    });
    return c;
  }
  function packMap(TW, TH) {
    var land = landCanvas(TW, TH), coast = blurred(land, 10), lights = lightsCanvas(TW, TH), arid = aridCanvas(TW, TH);
    var L = cpu2d(land).getImageData(0, 0, TW, TH).data, C = cpu2d(coast).getImageData(0, 0, TW, TH).data;
    var Li = cpu2d(lights).getImageData(0, 0, TW, TH).data, Ar = cpu2d(arid).getImageData(0, 0, TW, TH).data;
    var out = new ImageData(TW, TH), o = out.data;
    for (var i = 0; i < o.length; i += 4) { o[i] = L[i]; o[i + 1] = C[i]; o[i + 2] = Li[i]; o[i + 3] = Ar[i]; }
    return { img: out, land: land, lights: lights };
  }

  /* ---------- shaders ---------- */
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var NOISE = [
    'float hs(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
    'return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),',
    'mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float fbm(vec3 p,int o){float a=.5,s=0.;for(int i=0;i<7;i++){if(i>=o)break;s+=a*vn(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}'
  ].join('\n');
  var BAKE = [
    'uniform vec2 uRes;', NOISE,
    'void main(){vec2 uv=gl_FragCoord.xy/uRes;float lon=(uv.x-.5)*6.2831853,lat=(uv.y-.5)*3.1415927;',
    'vec3 p=vec3(cos(lat)*sin(lon),sin(lat),cos(lat)*cos(lon));',
    'vec3 w=vec3(fbm(p*1.6,4),fbm(p*1.6+5.2,4),fbm(p*1.6+9.7,4));',
    'float c1=fbm(p*2.4+w*1.6,6);',
    'float c2=fbm(p*5.1-w*1.1+3.3,5);',
    'float t=fbm(p*7.0,5);',
    'float f=vn(p*96.)*.6+vn(p*230.)*.4;',
    'gl_FragColor=vec4(c1,t,f,c2);}'
  ].join('\n');
  var FS = [
    'uniform vec2 uRes;uniform vec3 uGlobe;uniform float uF,uD,uT,uCloud,uDpr,uLife;uniform mat3 uR;uniform vec3 uSun,uSunPx;',
    'uniform sampler2D uMap,uDet;',
    'const float PI=3.1415927;',
    'vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}',
    'float h12(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
    'vec2 lluv(vec3 q){return vec2(atan(q.x,q.z)/(2.*PI)+.5,.5-asin(clamp(q.y,-1.,1.))/PI);}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy;vec3 ro=vec3(0.,0.,uD);vec3 rd=normalize(vec3(fc-uGlobe.xy,-uF));',
    ' float b=dot(ro,rd),c=dot(ro,ro)-1.,h=b*b-c,sd=dot(rd,uSun);',
    ' vec3 col=vec3(0.);',
    // limb coverage over ~1.2 px: the planet edge stays smooth even when the canvas is scaled down on slow devices
    ' float dm=sqrt(max(dot(ro,ro)-b*b,0.)),aa=uD/uF*1.2,cov=smoothstep(1.+aa,1.-aa,dm);',
    // background: stars and a faint galactic band
    ' if(cov<1.){',
    '  vec2 sv=lluv(rd)*vec2(6.2831853*uF/(6.*uDpr),3.1415927*uF/(6.*uDpr));vec2 ce=floor(sv);float r=h12(ce);',
    '  if(r>.986){float d=length(fract(sv)-vec2(h12(ce+1.3),h12(ce+7.1))*.8-.1);float tw=.7+.3*sin(uT*(1.+r*3.)+r*40.);',
    '   col+=vec3(.85,.9,1.)*smoothstep(.16,0.,d)*(r-.986)*70.*tw;}',
    '  vec3 bn=normalize(vec3(.35,.86,-.36));float band=exp(-pow(dot(rd,bn)/.2,2.));',
    '  col+=vec3(.35,.42,.7)*band*texture2D(uDet,lluv(rd.zxy)*vec2(2.,1.)).g*.07;',
    ' }',
    ' if(cov>0.){',
    '  float t=-b-sqrt(max(h,0.));vec3 n=normalize(ro+rd*t);vec3 q=uR*n;vec2 uv=lluv(q);',
    '  vec4 m=texture2D(uMap,uv);vec4 d=texture2D(uDet,uv);vec4 dc=texture2D(uDet,uv+vec2(uCloud,0.));',
    '  float ndl=dot(n,uSun),lam=max(ndl,0.),day=smoothstep(-.1,.2,ndl),lat=asin(clamp(q.y,-1.,1.)),lon=atan(q.x,q.z);',
    '  float land=smoothstep(.4,.6,m.r+(d.b-.5)*.22);',
    '  float ice=smoothstep(-1.04,-1.13,lat)+smoothstep(1.02,1.07,lat)*step(-1.3,lon)*step(lon,-.2);',
    '  vec3 veg=mix(vec3(.045,.1,.04),vec3(.12,.17,.075),d.g);vec3 sav=vec3(.27,.25,.13);vec3 dry=mix(vec3(.4,.31,.19),vec3(.62,.5,.33),d.g);',
    '  float ar=m.a*(.7+.6*d.g)+(d.g-.5)*.3;vec3 lc=mix(mix(veg,sav,smoothstep(.12,.42,ar)),dry,smoothstep(.42,.8,ar));',
    '  lc=mix(lc,vec3(.13,.13,.1),smoothstep(.95,1.2,abs(lat))*(1.-smoothstep(.3,.6,ar)));lc=mix(lc,vec3(.8,.85,.9),clamp(ice,0.,1.));',
    '  vec3 oc=mix(vec3(.01,.035,.09),vec3(.025,.15,.22),smoothstep(.05,.62,m.g)*(1.-land));',
    '  vec3 sf=mix(oc,lc,land);',
    '  float tw=exp(-pow((ndl-.04)*10.,2.));',
    '  vec3 dc3=sf*(.04+1.3*lam)*mix(vec3(1.),vec3(1.3,.68,.42),tw*.8);',
    '  vec3 v=-rd,hv=normalize(uSun+v);dc3+=vec3(1.,.82,.6)*pow(max(dot(n,hv),0.),90.)*(1.-land)*smoothstep(0.,.25,ndl)*.75;',
    '  float cl=smoothstep(.47,.78,mix(dc.r,dc.a,.35))*(.78+.22*cos(lat*6.));',
    '  vec3 cc=vec3(.95,.97,1.)*(.03+1.25*lam)*mix(vec3(1.),vec3(1.35,.62,.38),tw*.9);',
    '  vec3 lit=mix(dc3,cc,cl*.9);',
    '  float e=m.b,sp=smoothstep(.5,.85,d.b+e*.18);float li=(e*.12+e*sp*1.5+pow(e,3.)*2.2)*uLife;',
    '  vec3 nt=(vec3(1.,.66,.3)*li*(1.-cl*.7)+mix(vec3(.0007,.0013,.0035),vec3(.0022,.0024,.003),land)+vec3(.0015,.002,.003)*cl)*(1.-day);',
    '  vec3 pl=lit*day+nt;',
    '  float fr=pow(1.-max(dot(n,v),0.),2.6);',
    '  pl+=fr*mix(vec3(1.,.42,.16),vec3(.3,.56,1.),smoothstep(.0,.45,ndl))*smoothstep(-.3,.35,ndl)*.95+fr*fr*vec3(.02,.05,.06)*(1.-day);',
    '  col=mix(col,pl,cov);',
    ' }',
    // atmosphere halo around the limb, warm toward the sun (forward scattering)
    ' vec3 pc=ro-rd*b;float sa=dot(normalize(pc),uSun);',
    ' float hal=mix(exp(-max(dm-1.,0.)/.028),exp(-max(1.-dm,0.)/.012)*.6,cov);vec2 s2=normalize(uSun.xy+vec2(1e-5));float wv=dot(normalize(pc.xy+vec2(1e-5)),s2);hal*=.1+.9*pow(max(wv*.5+.5,0.),4.);',
    ' vec3 hc=mix(vec3(1.,.45,.17),vec3(.33,.6,1.),smoothstep(-.05,.45,sa))*smoothstep(-.42,.08,sa);',
    ' float mie=pow(max(sd,0.),40.)*1.8+pow(max(sd,0.),8.)*.12;',
    ' col+=hal*(hc*.9+vec3(1.,.72,.42)*mie);',
    // the sun and its lens streak (hidden when the planet covers it)
    ' float occ=1.-cov,s=max(sd,0.);',
    ' col+=vec3(1.,.93,.82)*occ*(pow(s,9000.)*30.+pow(s,500.)*.7+pow(s,60.)*.06);',
    ' vec2 ds=fc-uSunPx.xy;col+=vec3(1.,.78,.5)*uSunPx.z*(exp(-abs(ds.y)/(2.2*uDpr))*exp(-abs(ds.x)/(uRes.x*.22))*.35+exp(-length(ds)/(60.*uDpr))*.22);',
    ' col=aces(col*1.08);col=pow(col,vec3(1./2.2));col+=(h12(fc+fract(uT))-.5)/255.;',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  /* ---------- WebGL engine ---------- */
  var gl, cv, ov, ox, prog, uni = {}, texMap, texDet, raf = 0, last = 0, scale = LOWEND ? 0.62 : 0.85, ftAcc = 0, ftN = 0, ok = false;
  var SOFT = false, gaps = [], seen = 0, checks = 0;
  function sh(type, src, prec) {
    var s = gl.createShader(type); gl.shaderSource(s, (type === gl.FRAGMENT_SHADER ? 'precision ' + prec + ' float;\n' : '') + src); gl.compileShader(s);
    return s;
  }
  // Every status query waits for the GPU to finish compiling, so the program is linked first and asked once;
  // the shaders' own logs are read only when linking failed.
  function program(fs, prec) {
    var v = sh(gl.VERTEX_SHADER, VS, prec), f = sh(gl.FRAGMENT_SHADER, fs, prec), p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getShaderInfoLog(f) || gl.getShaderInfoLog(v) || gl.getProgramInfoLog(p));
    return p;
  }
  function tex(w, h, data) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if (data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function initGL() {
    cv = D.createElement('canvas'); cv.className = 'an-globe-gl'; cv.setAttribute('aria-hidden', 'true');
    gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) return false;
    // A software renderer (no usable GPU: SwiftShader, llvmpipe, Windows WARP) runs this shader on the CPU at a
    // few frames a second and holds the rest of the page back with it. There the globe is drawn once, still.
    var rn = String(gl.getParameter(gl.RENDERER)), dbg = /^webkit webgl$/i.test(rn) && gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) rn = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    SOFT = AN.gpu === 'soft' || /swiftshader|llvmpipe|softpipe|software|basic render|warp/i.test(rn);
    if (SOFT) { scale = Math.min(scale, 0.62); goStill(); }
    var hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT), prec = hp && hp.precision > 0 ? 'highp' : 'mediump';
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var TW = LOWEND || SOFT ? 1024 : 2048, TH = TW / 2, mp = packMap(TW, TH);
    texMap = tex(0, 0, mp.img);
    // bake procedural clouds/terrain detail once
    var BW = LOWEND || SOFT ? 1024 : 2048, BH = BW / 2, bp = program(BAKE, prec);
    texDet = tex(BW, BH, null);
    var fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texDet, 0);
    gl.viewport(0, 0, BW, BH); gl.useProgram(bp); gl.uniform2f(gl.getUniformLocation(bp, 'uRes'), BW, BH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); gl.deleteProgram(bp);
    prog = program(FS, prec); gl.useProgram(prog);
    ['uRes', 'uGlobe', 'uF', 'uD', 'uT', 'uCloud', 'uDpr', 'uLife', 'uR', 'uSun', 'uSunPx', 'uMap', 'uDet'].forEach(function (k) { uni[k] = gl.getUniformLocation(prog, k); });
    gl.uniform1i(uni.uMap, 0); gl.uniform1i(uni.uDet, 1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texMap);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texDet);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); ok = false; cancelAnimationFrame(raf); host.classList.add('an-globe-lost'); }, false);
    return true;
  }
  function sizeGL() {
    var dpr = Math.min(W.devicePixelRatio || 1, LOWEND ? 1.5 : 2), k = dpr * scale;
    var w = Math.max(2, Math.round(st.w * k)), h = Math.max(2, Math.round(st.h * k));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return k;
  }
  function drawGL() {
    var k = sizeGL(), M = rotM(st.yaw + st.tiltX, st.pitch + st.tiltY), s = sunDir();
    gl.viewport(0, 0, cv.width, cv.height);
    var R = st.R * k, F = R / TANA, cx = st.cx * k, cy = (st.h - st.cy) * k;
    gl.uniform2f(uni.uRes, cv.width, cv.height); gl.uniform3f(uni.uGlobe, cx, cy, R); gl.uniform1f(uni.uF, F);
    gl.uniform1f(uni.uD, DIST); gl.uniform1f(uni.uT, st.t); gl.uniform1f(uni.uCloud, (st.t * 0.0016) % 1); gl.uniform1f(uni.uDpr, k);
    gl.uniform1f(uni.uLife, 0.75 + 0.25 * st.alive);
    gl.uniformMatrix3fv(uni.uR, false, new Float32Array(M)); gl.uniform3f(uni.uSun, s[0], s[1], s[2]);
    // sun position on screen + how much of it peeks over the limb
    var sp = [0, 0, 0];
    if (s[2] < 0) {
      var ang = Math.acos(Math.max(-1, Math.min(1, -s[2]))) - ALPHA;
      sp = [cx + s[0] / -s[2] * F, cy + s[1] / -s[2] * F, Math.max(0, Math.min(1, (ang + 0.004) / 0.03))];
    }
    gl.uniform3f(uni.uSunPx, sp[0], sp[1], sp[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ---------- overlay: arcs, hubs, Tehran label ---------- */
  var ARCS = [], sprite;
  function buildArcs() {
    LINKS.forEach(function (l, i) {
      var a = HUBS[l[0]], b = HUBS[l[1]], qa = llq(a[0], a[1]), qb = llq(b[0], b[1]);
      var om = Math.acos(Math.max(-1, Math.min(1, qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2]))), so = Math.sin(om) || 1, pts = [];
      var N = 56, lift = 0.05 + om * 0.075;
      for (var k = 0; k <= N; k++) {
        var t = k / N, f1 = Math.sin((1 - t) * om) / so, f2 = Math.sin(t * om) / so, al = 1 + lift * Math.sin(Math.PI * t);
        pts.push([(qa[0] * f1 + qb[0] * f2) * al, (qa[1] * f1 + qb[1] * f2) * al, (qa[2] * f1 + qb[2] * f2) * al]);
      }
      ARCS.push({ p: pts, off: (i * 0.137) % 1, sp: 0.16 + (i % 5) * 0.025, ir: l[0] === 'teh' || l[1] === 'teh', order: i });
    });
    ARCS.sort(function (x, y) { return (y.ir - x.ir) || (x.order - y.order); });
    sprite = makeCanvas(48, 48); var s = sprite.getContext('2d'), g = s.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,240,220,.8)'); g.addColorStop(1, 'rgba(255,200,140,0)');
    s.fillStyle = g; s.fillRect(0, 0, 48, 48);
  }
  function project(M, v) {
    var p = mul(M, v), dx = p[0], dy = p[1], dz = p[2] - DIST, F = st.R / TANA;
    var x = st.cx + dx / -dz * F, y = st.cy - dy / -dz * F;
    // occlusion by the planet: does the ray camera→p hit the sphere first?
    var l = Math.hypot(dx, dy, dz), r = [dx / l, dy / l, dz / l], b = DIST * r[2], c = DIST * DIST - 1, h = b * b - c, vis = 1;
    if (h > 0) { var t1 = -b - Math.sqrt(h); if (t1 < l - 1e-3) vis = Math.max(0, Math.min(1, (t1 - l + 0.06) / 0.06)); }
    return [x, y, vis];
  }
  function drawOverlay() {
    var dpr = Math.min(W.devicePixelRatio || 1, 2), w = Math.round(st.w * dpr), h = Math.round(st.h * dpr);
    if (ov.width !== w || ov.height !== h) { ov.width = w; ov.height = h; }
    ox.setTransform(dpr, 0, 0, dpr, 0, 0); ox.clearRect(0, 0, st.w, st.h);
    var M = rotM(st.yaw + st.tiltX, st.pitch + st.tiltY), n = Math.max(1, Math.round(ARCS.length * st.alive));
    ox.lineCap = 'round'; ox.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var a = ARCS[i], P = a.p.map(function (v) { return project(M, v); });
      var cyan = a.ir ? '255,178,107' : '83,224,224';
      ox.lineWidth = 1; ox.beginPath();
      for (var k = 1; k < P.length; k++) {
        var al = Math.min(P[k][2], P[k - 1][2]); if (al <= 0.02) continue;
        ox.strokeStyle = 'rgba(' + cyan + ',' + (0.16 * al).toFixed(3) + ')';
        ox.beginPath(); ox.moveTo(P[k - 1][0], P[k - 1][1]); ox.lineTo(P[k][0], P[k][1]); ox.stroke();
      }
      var head = ((RM ? 0.55 : st.t * a.sp) + a.off) % 1, hk = head * (P.length - 1), tail = 14;
      for (var j = 0; j < tail; j++) {
        var idx = Math.floor(hk) - j; if (idx < 1) break;
        var q0 = P[idx - 1], q1 = P[idx], va = Math.min(q0[2], q1[2]); if (va <= 0.02) continue;
        var f = 1 - j / tail; ox.lineWidth = 0.6 + 1.8 * f;
        ox.strokeStyle = 'rgba(' + cyan + ',' + (0.85 * f * va).toFixed(3) + ')';
        ox.beginPath(); ox.moveTo(q0[0], q0[1]); ox.lineTo(q1[0], q1[1]); ox.stroke();
      }
      var hp = P[Math.min(P.length - 1, Math.floor(hk))];
      if (hp[2] > 0.05) { ox.globalAlpha = hp[2]; ox.drawImage(sprite, hp[0] - 7, hp[1] - 7, 14, 14); ox.globalAlpha = 1; }
    }
    ox.globalCompositeOperation = 'source-over';
    for (var key in HUBS) {
      var hb = HUBS[key], pp = project(M, llq(hb[0], hb[1])); if (pp[2] < 0.05) continue;
      var isT = key === 'teh';
      ox.fillStyle = isT ? 'rgba(255,190,120,' + pp[2] + ')' : 'rgba(190,250,250,' + (0.8 * pp[2]) + ')';
      ox.beginPath(); ox.arc(pp[0], pp[1], isT ? 2.6 : 1.7, 0, 6.2832); ox.fill();
      if (isT) {
        var ph = RM ? 0.4 : (st.t * 0.6) % 1;
        ox.strokeStyle = 'rgba(255,190,120,' + ((1 - ph) * 0.9 * pp[2]).toFixed(3) + ')'; ox.lineWidth = 1.2;
        ox.beginPath(); ox.arc(pp[0], pp[1], 3 + ph * 16, 0, 6.2832); ox.stroke();
        ox.font = '600 12px Vazirmatn, Tahoma, sans-serif'; ox.textAlign = 'left'; ox.direction = 'rtl';
        ox.fillStyle = 'rgba(255,226,190,' + (0.92 * pp[2]).toFixed(3) + ')'; ox.fillText(hb[2], pp[0] + 9, pp[1] - 7);
      }
    }
  }

  /* ---------- loop, interaction, visibility, adaptivity ---------- */
  /* The time spent in drawGL is only the CPU side: when the GPU cannot keep up, what grows is the gap
     between frames. So the gaps are watched too. After a short warm-up (the page is still building),
     a median gap over 50 ms (under 20 frames a second) first drops the resolution; if the frames stay
     that slow, the globe keeps a still picture, so scrolling and the rest of the page stay smooth. */
  function goStill() { RM = true; st.rise = 1; st.alive = 1; host.classList.add('an-globe-still'); }
  function pace(gap) {
    if (++seen <= 8 || checks >= 2 || RM) return;
    gaps.push(gap); if (gaps.length < 16) return;
    var m = gaps.sort(function (a, b) { return a - b; })[8]; gaps = []; checks++;
    if (m <= 50) { checks = 2; return; }
    if (checks === 1 && scale > 0.5) { scale = 0.42; seen = 0; } else goStill();
  }
  function frame(now) {
    raf = 0; if (!ok || !st.vis || D.hidden) return;
    if (last) pace(now - last);
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    st.t += dt;
    if (!RM) {
      if (st.rise < 1) st.rise = Math.min(1, st.rise + dt / 3.2);
      if (!st.drag) { st.vyaw *= Math.pow(0.05, dt); st.yaw += (0.018 + st.vyaw) * dt; }
      st.tiltX += (st.ttX - st.tiltX) * Math.min(1, dt * 3); st.tiltY += (st.ttY - st.tiltY) * Math.min(1, dt * 3);
      var target = Math.min(1, 0.35 + st.prog * 1.4); st.alive += (target - st.alive) * Math.min(1, dt * 1.5);
    }
    var t0 = performance.now(); drawGL(); drawOverlay();
    ftAcc += performance.now() - t0 + (dt * 1000 > 40 ? 12 : 0); ftN++;
    if (ftN >= 45) {
      var avg = ftAcc / ftN; ftAcc = ftN = 0;
      if (avg > 22 && scale > 0.42) scale = Math.max(0.42, scale * 0.82);
      else if (avg < 7 && scale < (LOWEND ? 0.75 : 1)) scale = Math.min(LOWEND ? 0.75 : 1, scale * 1.1);
    }
    if (!RM) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && ok) { last = 0; raf = requestAnimationFrame(frame); } }
  function onScroll() {
    var r = host.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
    if (Math.abs(p - st.prog) > 0.002) { st.prog = p; if (RM) { st.alive = 1; kick(); } }
  }
  function bindInput() {
    var el = host;
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || (e.target.closest && e.target.closest('a,button'))) return;
      st.drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, t: performance.now(), lx: e.clientX };
    });
    W.addEventListener('pointermove', function (e) {
      if (st.drag) {
        var dx = e.clientX - st.drag.x;
        if (Math.abs(dx) > 4 || st.drag.on) {
          st.drag.on = true; st.yaw = st.drag.yaw + dx / Math.max(120, st.R) * 1.1;
          var now = performance.now(); st.vyaw = (e.clientX - st.drag.lx) / Math.max(120, st.R) / Math.max(0.008, (now - st.drag.t) / 1000) * 0.6; st.drag.t = now; st.drag.lx = e.clientX;
          if (RM) kick();
        }
      } else if (!COARSE && !RM) {
        st.ttX = ((e.clientX / W.innerWidth) - 0.5) * 0.12; st.ttY = ((e.clientY / W.innerHeight) - 0.5) * 0.08;
      }
    }, { passive: true });
    W.addEventListener('pointerup', function () { st.drag = null; });
    W.addEventListener('pointercancel', function () { st.drag = null; });
  }
  function fallback2D() {
    host.classList.add('an-globe-2d');
    var c = D.createElement('canvas'); c.className = 'an-globe-gl'; c.setAttribute('aria-hidden', 'true'); host.insertBefore(c, host.firstChild);
    function paint() {
      layout(); var dpr = Math.min(W.devicePixelRatio || 1, 2), w = Math.round(st.w * dpr), h = Math.round(st.h * dpr);
      c.width = w; c.height = h; var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      var R = st.R, cx = st.cx, cy = st.cy, g = x.createRadialGradient(cx + R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R * 1.25);
      g.addColorStop(0, '#13284a'); g.addColorStop(0.55, '#08142a'); g.addColorStop(1, '#03060f');
      x.fillStyle = '#04060d'; x.fillRect(0, 0, st.w, st.h);
      var halo = x.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.22); halo.addColorStop(0, 'rgba(90,150,255,.55)'); halo.addColorStop(1, 'rgba(90,150,255,0)');
      x.fillStyle = halo; x.beginPath(); x.arc(cx, cy, R * 1.22, 0, 6.2832); x.fill();
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 6.2832); x.fill();
      var M = rotM(st.yaw, st.pitch); x.globalCompositeOperation = 'lighter';
      for (var i = 0; i < CITIES.length; i += 1) {
        var ci = CITIES[i], p = mul(M, llq(ci[0], ci[1])); if (p[2] < 0.05) continue;
        var px = cx + p[0] * R, py = cy - p[1] * R, rr = 0.6 + ci[2] * 0.09;
        x.fillStyle = 'rgba(255,190,110,' + (0.25 + ci[2] * 0.02) * p[2] + ')'; x.beginPath(); x.arc(px, py, rr, 0, 6.2832); x.fill();
      }
      x.globalCompositeOperation = 'source-over';
    }
    paint(); W.addEventListener('resize', function () { clearTimeout(paint.t); paint.t = setTimeout(paint, 150); });
    c.addEventListener('contextrestored', paint); // a 2D canvas whose GPU context was reset comes back empty
  }
  function start() {
    layout();
    var okGL = false;
    try { okGL = initGL(); } catch (e) { okGL = false; if (W.console) console.warn('[globe] WebGL off:', e && e.message); }
    if (!okGL) { fallback2D(); return; }
    host.insertBefore(cv, host.firstChild);
    ov = D.createElement('canvas'); ov.className = 'an-globe-ov'; ov.setAttribute('aria-hidden', 'true'); host.insertBefore(ov, cv.nextSibling);
    ox = ov.getContext('2d'); buildArcs(); bindInput(); ok = true; host.classList.add('an-globe-on');
    function relayout() { layout(); kick(); if (RM) { drawGL(); drawOverlay(); } }
    W.addEventListener('resize', relayout);
    // the hero can change height without the window resizing (a late font, the film button the reader's box
    // adds on the home page); without this the canvas keeps its first shape and the Earth is drawn stretched
    if ('ResizeObserver' in W) new ResizeObserver(function () {
      var r = host.getBoundingClientRect();
      if (Math.abs(r.width - st.w) > 1 || Math.abs(r.height - st.h) > 1) relayout();
    }).observe(host);
    W.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    D.addEventListener('visibilitychange', function () { if (!D.hidden) kick(); });
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { st.vis = es[0].isIntersecting; if (st.vis) kick(); }, { rootMargin: '80px' }).observe(host);
    if (RM) { st.rise = 1; drawGL(); drawOverlay(); } else kick();
    AN.globe = { state: st, redraw: function () { drawGL(); drawOverlay(); } };
  }
  // AN.ready (core.js) also waits for the stylesheet, so the globe is sized on the styled page
  if (AN.ready) AN.ready(start); else if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
