// Smoke test for the built canvas page. It puts dist/bmc-page.html inside a stand-in for the blog's page
// template (article column, fixed header, Blogfa-like ad bar, the <br>s the editor adds), loads bmc.css and
// bmc.js the way the custom-code box does, then checks the content, the layout and all 13 presentation steps.
//   BMC_KIT_CSS  optional path to the blog kit's CSS, to test against the real template styles
//   BMC_SHOTS    screenshot folder (default test/shots)
//   BMC_QR_TOOLS optional node_modules folder holding jsqr and pngjs, to decode the QR code shown in the presentation
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const out = path.resolve(process.env.BMC_SHOTS || path.join(__dirname, 'shots'));
fs.mkdirSync(out, { recursive: true });
const page = fs.readFileSync(path.join(dist, 'bmc-page.html'), 'utf8');
const kit = process.env.BMC_KIT_CSS ? '<link rel="stylesheet" href="file://' + process.env.BMC_KIT_CSS + '">' : '';
const tpl = '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + kit +
  '<style>body{margin:0;background:#04060D;color:#EDF2FA;font-family:Tahoma;overflow-x:hidden}' +
  '#an-bar{position:fixed;top:0;left:0;right:0;height:68px;background:#0B1222;z-index:100}' +
  '.an-post{margin:0 auto 64px;max-width:760px;padding:120px 16px 0}' +
  '.an-post-body{color:#C9D3E3;font-size:1.125rem;line-height:2.1}' +
  '.an-post-body > *{margin-block:0 1.15em}.an-post-body p{margin-bottom:1.15em}' +
  '.an-post-body h2{margin:2.2em 0 .8em;font-size:2rem}.an-post-body h2::before{content:"# ";color:red}' +
  '.an-post-body h3{font-size:1.5rem;margin:1.5em 0 .5em}' +
  '.an-post-body ul,.an-post-body ol{padding-inline-start:1.4em;list-style:disc}.an-post-body li{margin-bottom:.45em}</style></head><body>' +
  '<div style="position:fixed;bottom:0;left:50%;margin-left:-364px;width:728px;height:90px;background:#777;z-index:9999">AD</div>' +
  '<div id="an-bar"></div><article class="an-post"><div class="an-post-body"><br>' + page.replace(/<\/li>/, '</li><br>') +
  '<br>&nbsp;<p></p></div></article><footer class="an-foot an-foot-min"><div class="an-custom"></div></footer>' +
  '<link rel="stylesheet" href="file://' + dist + '/bmc.css"><script src="file://' + dist + '/bmc.js"></script></body></html>';
const tplFile = path.join(out, 'in-template.html');
fs.writeFileSync(tplFile, tpl);

const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function run(name, file, vp, opts = {}) {
    const p = await browser.newPage({ viewport: vp, hasTouch: !!opts.touch, isMobile: !!opts.touch, reducedMotion: opts.rm ? 'reduce' : 'no-preference' });
    // Stand-ins for the blog: its music player API (desk run only) and a shortcut listener that must stay quiet while the stage is open.
    if (opts.music) await p.addInitScript(() => { window.AN = { x: { music: { on: false, toggle() { this.on = !this.on; window.dispatchEvent(new CustomEvent('an-music', { detail: { playing: this.on } })); },
      play() {}, pause() {}, open() {}, playing() { return this.on; }, station() { return { id: 't', name: 'ایستگاه آزمایشی', mood: 'calm', bpm: 96 }; } } } }; });
    await p.addInitScript(() => { window.__keys = []; window.__bp = []; document.addEventListener('keydown', (e) => window.__keys.push(e.code));
      document.addEventListener('bmc:present', (e) => window.__bp.push(e.detail.on)); });
    p.on('pageerror', (e) => errors.push(name + ' pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    await p.goto('file://' + file);
    await p.waitForSelector('.bmc-bar .bmc-btn');
    await p.waitForTimeout(1500);
    const c = await p.evaluate(() => {
      const r = document.getElementById('bmc');
      const notes = Array.from(r.querySelectorAll('.bmc-poster .bmc-notes li'));
      const by = (k) => notes.filter((n) => n.classList.contains('bmc-' + k)).length;
      const over = notes.filter((n) => n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1).map((n) => n.textContent);
      const cellsOver = Array.from(r.querySelectorAll('.bmc-poster .bmc-cell')).filter((c) => c.scrollHeight > c.clientHeight + 1).map((c) => c.className);
      return { notes: notes.length, o: by('o'), p: by('p'), y: by('y'), g: by('g'), cells: r.querySelectorAll('.bmc-poster .bmc-cell').length,
        over, cellsOver, hscroll: document.documentElement.scrollWidth > window.innerWidth + 1, br: r.querySelectorAll('br').length,
        font: document.fonts.check('16px BmcVazir') || document.fonts.check('16px Vazirmatn') };
    });
    console.log(name, JSON.stringify(c));
    check(c.notes === 36 && c.o === 3 && c.p === 5 && c.y === 24 && c.g === 4 && c.cells === 9, name + ': note or cell count wrong');
    check(!c.over.length, name + ': note text overflows: ' + c.over.join(' / '));
    check(!c.cellsOver.length, name + ': cell overflows: ' + c.cellsOver.join(' '));
    check(!c.hscroll, name + ': page scrolls sideways');
    await p.screenshot({ path: path.join(out, name + '-page.png') });
    await p.locator('.bmc-poster').screenshot({ path: path.join(out, name + '-poster.png') });
    await p.click('.bmc-bar .bmc-btn');
    await p.waitForSelector('.bmc-stage');
    const info = [];
    for (let i = 0; i < 24; i++) {
      await p.waitForTimeout(1300);
      const s = await p.evaluate(() => {
        const st = document.querySelector('.bmc-stage');
        const sc = st.querySelector('.bmc-scene:not(.bmc-out)');
        const pp = sc.firstChild;
        const pz = pp.querySelector('.bmc-poster');
        const bad = innerWidth > 720 && (pz ? pz.getBoundingClientRect().bottom > sc.getBoundingClientRect().bottom + 2 : pp.scrollHeight > pp.clientHeight + 2);
        return [pp.className, pp.style.fontSize || pp.style.getPropertyValue('--pw') || '-', st.querySelector('.bmc-cnt').textContent, bad ? 'OVERFLOW' : 'ok'].join('|');
      });
      info.push(s);
      check(!s.endsWith('OVERFLOW'), name + ' step ' + (i + 1) + ' overflows: ' + s);
      await p.screenshot({ path: path.join(out, name + '-s' + String(i + 1).padStart(2, '0') + '.png') });
      if (opts.touch) await p.evaluate(() => {
        const st = document.querySelector('.bmc-stage');
        const t = (type, x) => st.dispatchEvent(new TouchEvent(type, { changedTouches: [new Touch({ identifier: 1, target: st, clientX: x, clientY: 300 })], bubbles: true }));
        t('touchstart', 100); t('touchend', 260);
      });
      else await p.keyboard.press('ArrowRight');
    }
    console.log('  ' + info.join('\n  '));
    if (!opts.touch) {
      await p.keyboard.press('Escape');
      check(await p.evaluate(() => !document.querySelector('.bmc-stage')), name + ': Esc did not close');
      await p.click('.bmc-poster .bmc-c5');
      await p.waitForTimeout(900);
      check((await p.textContent('.bmc-stage .bmc-cnt')) === '۱۴ از ۲۴', name + ': clicking block 5 did not open step 14');
      // Details of the block replace its notes, and must fit too.
      await p.keyboard.press('KeyD');
      await p.waitForTimeout(900);
      const d = await p.evaluate(() => {
        const pp = document.querySelector('.bmc-stage .bmc-scene:not(.bmc-out)').firstChild, bx = pp.querySelector('.bmc-dbox');
        return { on: pp.classList.contains('bmc-showd'), rows: bx ? bx.children.length : 0, over: pp.scrollHeight > pp.clientHeight + 2 || (bx && bx.scrollHeight > bx.clientHeight + 2) };
      });
      check(d.on && d.rows > 2 && !d.over, name + ': block details wrong ' + JSON.stringify(d));
      await p.screenshot({ path: path.join(out, name + '-detail5.png') });
      // Speaker notes panel.
      await p.keyboard.press('KeyN');
      await p.waitForTimeout(700);
      const n = await p.evaluate(() => { const b = document.querySelector('.bmc-stage .bmc-notebox'); return b && b.offsetHeight > 20 ? b.textContent.length : 0; });
      check(n > 60, name + ': speaker notes did not show');
      await p.screenshot({ path: path.join(out, name + '-notes.png') });
      // Presenter window.
      const [pop] = await Promise.all([p.context().waitForEvent('page'), p.keyboard.press('KeyP')]);
      await pop.waitForTimeout(500);
      const pv = await pop.evaluate(() => [document.querySelector('h1') && document.querySelector('h1').textContent, document.querySelector('.n') && document.querySelector('.n').textContent.length]);
      check(pv[0] && pv[0].indexOf('جریان') >= 0 && pv[1] > 60, name + ': presenter view wrong ' + JSON.stringify(pv));
      await pop.setViewportSize({ width: 980, height: 680 });
      await pop.screenshot({ path: path.join(out, name + '-presenter.png') });
      await pop.click('footer button:last-child');
      await p.waitForTimeout(700);
      check((await p.textContent('.bmc-stage .bmc-cnt')) === '۱۵ از ۲۴', name + ': presenter next did not move the deck');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(300);
      check(pop.isClosed(), name + ': presenter window stayed open after close');
      // Whole canvas: a click on a block zooms into it; the top bar names the chapter.
      await p.click('.bmc-bar .bmc-btn');
      await p.keyboard.press('Digit0');
      await p.waitForTimeout(900);
      await p.click('.bmc-stage .bmc-scene:not(.bmc-out) .bmc-c2');
      await p.waitForTimeout(160);
      await p.screenshot({ path: path.join(out, name + '-zoom-mid.png') });
      await p.waitForTimeout(800);
      const z = await p.evaluate(() => [document.querySelector('.bmc-stage .bmc-cnt').textContent, document.querySelector('.bmc-stage .bmc-scene:not(.bmc-out)').className, document.querySelector('.bmc-stage .bmc-chapn').textContent]);
      check(z[0] === '۱۰ از ۲۴' && z[1].indexOf('bmc-zi') >= 0 && z[2].indexOf('بوم مدل کاروکسب') >= 0, name + ': zoom into block 2 wrong ' + JSON.stringify(z));
      // Customer journey: five stages from table 20, each with its own items, fitting the slide.
      await p.keyboard.press('Digit3');
      await p.keyboard.press('ArrowRight');
      await p.waitForTimeout(1600);
      const j = await p.evaluate(() => {
        const pp = document.querySelector('.bmc-stage .bmc-scene:not(.bmc-out)').firstChild;
        const st = Array.from(pp.querySelectorAll('.bmc-steps > li'));
        return { cls: pp.className, n: st.length, items: st.map((l) => l.querySelectorAll('li').length), names: st.map((l) => l.querySelector('b').textContent), over: pp.scrollHeight > pp.clientHeight + 2 };
      });
      check(j.cls.indexOf('bmc-jour') >= 0 && j.n === 5 && j.items.every((k) => k >= 2) && j.names.join(',') === 'آگاهی,ارزیابی,خرید,تحویل,پس از فروش' && !j.over, name + ': journey slide wrong ' + JSON.stringify(j));
      await p.screenshot({ path: path.join(out, name + '-journey.png') });
      // Laser pointer and blackout.
      await p.keyboard.press('KeyL');
      await p.mouse.move(600, 400);
      await p.waitForTimeout(200);
      const lz = await p.evaluate(() => { const l = document.querySelector('.bmc-stage .bmc-laser'); return getComputedStyle(l).display + '|' + l.style.transform; });
      check(lz.startsWith('block|translate(600px'), name + ': laser pointer wrong ' + lz);
      await p.screenshot({ path: path.join(out, name + '-laser.png') });
      await p.keyboard.press('KeyL');
      await p.keyboard.press('KeyB');
      await p.waitForTimeout(400);
      const bk = await p.evaluate(() => document.querySelector('.bmc-stage').classList.contains('bmc-black'));
      await p.keyboard.press('KeyB');
      check(bk && await p.evaluate(() => !document.querySelector('.bmc-stage').classList.contains('bmc-black')), name + ': blackout did not toggle');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(300);
      // Agenda jumps.
      await p.click('.bmc-bar .bmc-btn');
      await p.keyboard.press('ArrowRight');
      await p.waitForTimeout(800);
      await p.click('.bmc-stage .bmc-chap li:nth-child(3) button');
      await p.waitForTimeout(800);
      check((await p.textContent('.bmc-stage .bmc-cnt')) === '۱۹ از ۲۴', name + ': agenda chapter 3 did not open strategy');
      await p.keyboard.press('Escape');
      // Short pitch deck.
      await p.click('.bmc-bar .bmc-alt2');
      await p.waitForTimeout(800);
      check((await p.textContent('.bmc-stage .bmc-cnt')) === '۱ از ۱۲', name + ': short deck has wrong length');
      await p.keyboard.press('End');
      await p.waitForTimeout(900);
      const qs = await p.evaluate(() => document.querySelectorAll('.bmc-stage .bmc-scene:not(.bmc-out) .bmc-qs button').length);
      check(qs === 8, name + ': short deck thanks slide lacks questions');
      await p.keyboard.press('Escape');
      // Page folds.
      const f = await p.evaluate(() => {
        const dt = document.querySelector('.bmc-d3 h3'); dt.click();
        return [document.querySelector('.bmc-d3').classList.contains('bmc-open'), document.querySelectorAll('.bmc-dt').length, document.querySelectorAll('.bmc-q.bmc-open').length];
      });
      check(f[0] && f[1] === 9 && f[2] === 1, name + ': page folds wrong ' + JSON.stringify(f));
      // Printed report: portrait sheets with every fold open and nothing of the blog around it.
      await p.evaluate(() => { window.print = () => {}; });
      await p.click('.bmc-bar .bmc-print:last-child');
      const rp = await p.evaluate(() => [document.documentElement.classList.contains('bmc-print-report'), document.querySelectorAll('.bmc-keep').length, /portrait/.test(Array.from(document.querySelectorAll('style')).map((x) => x.textContent).join(''))]);
      check(rp[0] && rp[1] >= 1 && rp[2], name + ': report print setup wrong ' + JSON.stringify(rp));
      await p.emulateMedia({ media: 'print' });
      const pr = await p.evaluate(() => {
        const r = document.getElementById('bmc'), vis = (s) => { const e = document.querySelector(s); return e && e.getBoundingClientRect().height > 0; };
        return { h: r.getBoundingClientRect().height, top: Math.round(r.getBoundingClientRect().top), bar: vis('.bmc-bar'), d9: vis('.bmc-d9 ul'), q8: vis('.bmc-q:last-child p'), header: vis('#an-bar') };
      });
      check(pr.h > 3000 && pr.top <= 2 && !pr.bar && pr.d9 && pr.q8 && !pr.header, name + ': printed report layout wrong ' + JSON.stringify(pr));
      if (name === 'desk') await p.pdf({ path: path.join(out, 'report.pdf'), preferCSSPageSize: true, printBackground: true });
      await p.emulateMedia({ media: 'screen' });
      await extra(p, name, opts);
    } else {
      const ph = await p.evaluate(() => { const t = document.querySelector('.bmc-stage .bmc-top'); return [t.scrollWidth <= innerWidth + 1, document.querySelectorAll('.bmc-stage .bmc-tools .bmc-ib:not([hidden])').length,
        Array.from(document.querySelectorAll('.bmc-stage .bmc-tools .bmc-x')).every((b) => !b.getClientRects().length)]; });
      check(ph[0] && ph[1] >= 2 && ph[2], name + ': phone toolbar wrong ' + JSON.stringify(ph));
    }
    await p.close();
  }

  // Tools of the final release: keys and focus, music, overview, pen, spotlight, QR, key help, autoplay, count-up, confetti, page reveal.
  async function extra(p, name, opts) {
    const cnt = () => p.textContent('.bmc-stage .bmc-cnt');
    await p.click('.bmc-bar .bmc-btn');
    await p.waitForTimeout(500);
    const t0 = await p.evaluate(() => { const st = document.querySelector('.bmc-stage'); return { modal: st.getAttribute('aria-modal'), icons: st.querySelectorAll('.bmc-tools .bmc-ib').length, music: !st.querySelector('.bmc-mus').hidden, bp: window.__bp.join() }; });
    check(t0.modal === 'true' && t0.icons === 12, name + ': toolbar wrong ' + JSON.stringify(t0));
    check(t0.music === !!opts.music, name + ': music button shown ' + t0.music + ' without/with the blog player');
    check(/^true,false,true/.test(t0.bp), name + ': bmc:present events wrong ' + t0.bp);
    await p.evaluate(() => { window.__keys = []; });
    await p.keyboard.press('KeyG');
    await p.keyboard.press('Control+KeyK');
    await p.keyboard.press('KeyM');
    const leak = await p.evaluate(() => window.__keys.join());
    check(!leak, name + ': keys reached the blog behind the stage: ' + leak);
    if (opts.music) {
      await p.click('.bmc-stage .bmc-mus');
      await p.waitForTimeout(250);
      const m1 = await p.evaluate(() => [document.querySelector('.bmc-stage .bmc-mus').getAttribute('aria-pressed'), window.AN.x.music.playing(), document.querySelector('.bmc-stage').classList.contains('bmc-mon')].join());
      await p.keyboard.press('KeyM');
      await p.waitForTimeout(250);
      const m2 = await p.evaluate(() => [document.querySelector('.bmc-stage .bmc-mus').getAttribute('aria-pressed'), window.AN.x.music.playing()].join());
      check(m1 === 'false,false,false' || m1 === 'true,true,true', name + ': music button wrong ' + m1);
      check(m1.split(',')[0] !== m2.split(',')[0] && m1.split(',')[1] !== m2.split(',')[1], name + ': M did not toggle the music ' + m1 + ' / ' + m2);
    }
    // Enter on a focused tool runs that tool and does not turn the slide; Tab stays inside.
    await p.focus('.bmc-stage .bmc-i-help');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(400);
    const hp = await p.evaluate(() => { const h = document.querySelector('.bmc-stage .bmc-help'); return h ? [h.querySelectorAll('dt').length, document.activeElement.classList.contains('bmc-hpx')] : null; });
    check(hp && hp[0] >= 15 && hp[1] && (await cnt()) === '۱ از ۲۴', name + ': key help wrong ' + JSON.stringify(hp));
    await p.screenshot({ path: path.join(out, name + '-help.png') });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    check(!(await p.$('.bmc-stage .bmc-help')) && !!(await p.$('.bmc-stage')), name + ': Esc did not close only the key help');
    for (let k = 0; k < 40; k++) await p.keyboard.press('Tab');
    check(await p.evaluate(() => document.querySelector('.bmc-stage').contains(document.activeElement)), name + ': Tab left the presentation');
    await p.focus('.bmc-stage .bmc-close');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
    const fc = await p.evaluate(() => [!document.querySelector('.bmc-stage'), document.activeElement === document.querySelector('.bmc-bar .bmc-btn')].join());
    check(fc === 'true,true', name + ': close by Enter or focus return wrong ' + fc);
    // Overview of all slides, moved through with the arrow keys.
    await p.click('.bmc-bar .bmc-btn');
    await p.waitForTimeout(400);
    await p.keyboard.press('KeyO');
    await p.waitForTimeout(800);
    const ov = await p.evaluate(() => { const o = document.querySelector('.bmc-stage .bmc-ov'); return o ? [o.querySelectorAll('.bmc-ovc').length, o.querySelectorAll('.bmc-ovc .bmc-scene').length, document.activeElement.classList.contains('bmc-ovc')] : null; });
    check(ov && ov[0] === 24 && ov[1] === 24 && ov[2], name + ': overview wrong ' + JSON.stringify(ov));
    await p.screenshot({ path: path.join(out, name + '-overview.png') });
    await p.keyboard.press('ArrowLeft');
    await p.keyboard.press('ArrowLeft');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(900);
    check((await cnt()) === '۳ از ۲۴' && !(await p.$('.bmc-stage .bmc-ov')), name + ': overview did not go to slide 3');
    if (opts.rm) {
      await p.keyboard.press('ArrowRight');
      check((await p.evaluate(() => document.querySelectorAll('.bmc-stage .bmc-host .bmc-scene').length)) === 1, name + ': old slide stays with reduced motion');
      await p.keyboard.press('ArrowLeft');
      await p.waitForTimeout(300);
    }
    // Pen: a stroke shows on the slide and C clears it; the slide does not change.
    await p.keyboard.press('KeyW');
    await p.waitForTimeout(200);
    const bx = await p.locator('.bmc-stage .bmc-cv').boundingBox();
    await p.mouse.move(bx.x + 220, bx.y + 220);
    await p.mouse.down();
    await p.mouse.move(bx.x + 420, bx.y + 300, { steps: 10 });
    await p.mouse.move(bx.x + 520, bx.y + 220, { steps: 6 });
    await p.mouse.up();
    await p.waitForTimeout(150);
    const px = () => p.evaluate(() => { const c = document.querySelector('.bmc-stage .bmc-cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
    const inked = await px();
    await p.screenshot({ path: path.join(out, name + '-pen.png') });
    await p.keyboard.press('KeyC');
    await p.waitForTimeout(100);
    const cleared = await px();
    check(inked > 300 && cleared === 0 && (await cnt()) === '۳ از ۲۴', name + ': pen wrong ' + inked + '/' + cleared);
    await p.keyboard.press('KeyW');
    // Spotlight follows the mouse; the wheel resizes it.
    await p.keyboard.press('KeyS');
    await p.mouse.move(520, 400);
    await p.waitForTimeout(150);
    const s1 = await p.evaluate(() => { const s = document.querySelector('.bmc-stage .bmc-spot'); return [getComputedStyle(s).display, s.style.getPropertyValue('--sx'), s.style.getPropertyValue('--sr')]; });
    await p.mouse.wheel(0, 400);
    await p.waitForTimeout(150);
    const s2 = await p.evaluate(() => document.querySelector('.bmc-stage .bmc-spot').style.getPropertyValue('--sr'));
    check(s1[0] === 'block' && s1[1] && s2 && s2 !== s1[2], name + ': spotlight wrong ' + JSON.stringify(s1) + ' ' + s2);
    await p.screenshot({ path: path.join(out, name + '-spot.png') });
    await p.keyboard.press('KeyS');
    // QR code of the live page.
    await p.keyboard.press('KeyQ');
    await p.waitForTimeout(500);
    const qrEl = p.locator('.bmc-stage .bmc-qrc .bmc-qr');
    const bg = await qrEl.evaluate((e) => getComputedStyle(e).backgroundImage);
    check(/svg\+xml/.test(bg), name + ': QR image missing');
    await p.screenshot({ path: path.join(out, name + '-qr.png') });
    if (process.env.BMC_QR_TOOLS) {
      const jsQR = require(path.join(process.env.BMC_QR_TOOLS, 'jsqr')), { PNG } = require(path.join(process.env.BMC_QR_TOOLS, 'pngjs'));
      const img = PNG.sync.read(await qrEl.screenshot());
      const code = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
      check(code && code.data === 'https://ayandehnegar.blogfa.com/page/bmc', name + ': QR decodes to ' + (code && code.data));
    }
    await p.keyboard.press('KeyQ');
    await p.waitForTimeout(200);
    check(!(await p.$('.bmc-stage .bmc-qrov')), name + ': QR did not close');
    // Scores of table 16 count up and end on the page's own numbers.
    await p.evaluate(() => document.querySelectorAll('.bmc-stage .bmc-dots button')[6].click());
    await p.waitForTimeout(250);
    const mid = await p.evaluate(() => { const b = document.querySelector('.bmc-stage .bmc-scene:not(.bmc-out) .bmc-score b'); return b && b.textContent; });
    await p.waitForTimeout(1900);
    const fin = await p.evaluate(() => Array.from(document.querySelectorAll('.bmc-stage .bmc-scene:not(.bmc-out) .bmc-score b')).map((b) => b.textContent).join(','));
    check(fin === '۳۱,۲۷,۲۴,۲۰,۱۷' && (opts.rm ? mid === '۳۱' : mid !== '۳۱'), name + ': count-up wrong ' + mid + ' / ' + fin);
    // Closing slide: QR row, confetti that removes itself.
    await p.keyboard.press('End');
    await p.waitForTimeout(400);
    const th = await p.evaluate(() => { const sc = document.querySelector('.bmc-stage .bmc-scene:not(.bmc-out)'); return [!!sc.querySelector('.bmc-qrrow .bmc-qr'), !!sc.querySelector('.bmc-cf'), sc.firstChild.scrollHeight <= sc.firstChild.clientHeight + 2]; });
    await p.screenshot({ path: path.join(out, name + '-thanks.png') });
    await p.waitForTimeout(3600);
    const cf = await p.evaluate(() => !!document.querySelector('.bmc-stage .bmc-cf'));
    check(th[0] && th[1] === !opts.rm && th[2] && !cf, name + ': closing slide wrong ' + JSON.stringify(th) + ' confetti left ' + cf);
    // Autoplay moves on by itself.
    await p.keyboard.press('Home');
    await p.waitForTimeout(300);
    await p.keyboard.press('KeyA');
    const ta = Date.now();
    let moved = true;
    try { await p.waitForFunction(() => document.querySelector('.bmc-stage .bmc-cnt').textContent === '۲ از ۲۴', null, { timeout: 32000 }); } catch (e) { moved = false; }
    check(moved, name + ': autoplay did not move on');
    console.log('  autoplay moved after ' + ((Date.now() - ta) / 1000).toFixed(1) + 's');
    await p.keyboard.press('KeyA');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    check(!(await p.$('.bmc-stage')), name + ': Esc did not close after autoplay');
    // Page: legend filter fades the other notes; section shortcuts scroll to their section, which rises into view.
    await p.click('.bmc-poster .bmc-legend li.bmc-o');
    await p.waitForTimeout(500);
    const lf = await p.evaluate(() => { const r = document.querySelector('.bmc-poster'); return [+getComputedStyle(r.querySelector('.bmc-notes li.bmc-y')).opacity, getComputedStyle(r.querySelector('.bmc-notes li.bmc-o')).transform]; });
    await p.click('.bmc-poster .bmc-legend li.bmc-o');
    check(lf[0] < 0.5 && lf[1] !== 'none', name + ': legend filter wrong ' + JSON.stringify(lf));
    await p.click('.bmc-jump button:has-text("جمع‌بندی")');
    await p.waitForTimeout(1500);
    const jp = await p.evaluate(() => { const s = document.querySelector('.bmc-sec.bmc-sum'); return [Math.round(s.querySelector('h2').getBoundingClientRect().top), s.classList.contains('bmc-rv') ? s.classList.contains('bmc-in') : 'none', +getComputedStyle(s).opacity]; });
    check(jp[0] >= 0 && jp[0] <= 200 && (opts.rm ? jp[1] === 'none' : jp[1] === true) && jp[2] > 0.9, name + ': section shortcut wrong ' + JSON.stringify(jp));
    await p.screenshot({ path: path.join(out, name + '-jump.png') });
  }

  await run('desk', tplFile, { width: 1366, height: 768 }, { music: true });
  await run('proj', tplFile, { width: 1024, height: 768 }, { rm: true });
  await run('phone', tplFile, { width: 390, height: 844 }, { touch: true });
  await run('offline', path.join(dist, 'bmc-offline.html'), { width: 1440, height: 900 });
  await browser.close();
  if (errors.length) fails.push(...errors);
  if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
  console.log('PASS');
})();
