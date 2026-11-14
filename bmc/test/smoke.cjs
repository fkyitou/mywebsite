// Smoke test for the built canvas page. It puts dist/bmc-page.html inside a stand-in for the blog's page
// template (article column, fixed header, Blogfa-like ad bar, the <br>s the editor adds), loads bmc.css and
// bmc.js the way the custom-code box does, then checks the content, the layout and all 13 presentation steps.
//   BMC_KIT_CSS  optional path to the blog kit's CSS, to test against the real template styles
//   BMC_SHOTS    screenshot folder (default test/shots)
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
    const p = await browser.newPage({ viewport: vp, hasTouch: !!opts.touch, isMobile: !!opts.touch });
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
    for (let i = 0; i < 23; i++) {
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
      check((await p.textContent('.bmc-stage .bmc-cnt')) === '۱۳ از ۲۳', name + ': clicking block 5 did not open step 13');
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
      check((await p.textContent('.bmc-stage .bmc-cnt')) === '۱۴ از ۲۳', name + ': presenter next did not move the deck');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(300);
      check(pop.isClosed(), name + ': presenter window stayed open after close');
      // Agenda jumps.
      await p.click('.bmc-bar .bmc-btn');
      await p.keyboard.press('ArrowRight');
      await p.waitForTimeout(800);
      await p.click('.bmc-stage .bmc-chap li:nth-child(3) button');
      await p.waitForTimeout(800);
      check((await p.textContent('.bmc-stage .bmc-cnt')) === '۱۸ از ۲۳', name + ': agenda chapter 3 did not open strategy');
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
    }
    await p.close();
  }
  await run('desk', tplFile, { width: 1366, height: 768 });
  await run('proj', tplFile, { width: 1024, height: 768 });
  await run('phone', tplFile, { width: 390, height: 844 }, { touch: true });
  await run('offline', path.join(dist, 'bmc-offline.html'), { width: 1440, height: 900 });
  await browser.close();
  if (errors.length) fails.push(...errors);
  if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); }
  console.log('PASS');
})();
