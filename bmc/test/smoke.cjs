// Smoke test: loads the built code standalone and inside a stand-in for the
// blog's page template (720px article column, fixed header, Blogfa-like ad bar),
// opens the presentation and walks through all 13 steps.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const dist = path.join(__dirname, '..', 'dist');
  const out = process.env.BMC_SHOTS || path.join(__dirname, 'shots');
  fs.mkdirSync(out, { recursive: true });
  const code = fs.readFileSync(path.join(dist, 'bmc-blogfa.html'), 'utf8');
  const tpl = '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>' +
    'body{margin:0;background:#04060D;color:#EDF2FA;font-family:Tahoma;overflow-x:hidden}' +
    '#an-bar{position:fixed;top:0;left:0;right:0;height:68px;background:#0B1222;z-index:100}' +
    '.an-post{margin:0 auto 64px;max-width:720px;padding-top:120px}' +
    '.an-post-body{color:#C9D3E3;font-size:1.125rem;line-height:2.1}' +
    '.an-post-body > *{margin-block:0 1.15em}.an-post-body p{margin-bottom:1.15em}' +
    '.an-post-body h2{counter-increment:an-h2;margin:2.2em 0 .8em;font-size:2rem}' +
    '.an-post-body h2::before{content:counter(an-h2) ". ";color:red}' +
    '.an-post-body ul,.an-post-body ol{padding-inline-start:1.4em}.an-post-body li{margin-bottom:.45em}' +
    '.an-post-body a{color:#8ab4ff;text-decoration:underline}</style></head><body>' +
    '<div style="position:fixed;bottom:0;left:50%;margin-left:-364px;width:728px;height:90px;background:#777;z-index:9999">AD</div>' +
    '<div id="an-bar"></div><article class="an-post"><div class="an-post-body">' + code +
    '<br>&nbsp;<p></p></div></article></body></html>';
  const tplFile = path.join(out, 'in-template.html');
  fs.writeFileSync(tplFile, tpl);

  const browser = await chromium.launch();
  const errors = [];
  async function run(name, file, vp) {
    const page = await browser.newPage({ viewport: vp });
    page.on('pageerror', (e) => errors.push(name + ' pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    await page.goto('file://' + file);
    await page.waitForSelector('.bmc-go');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, name + '-page.png') });
    await page.click('.bmc-go');
    await page.waitForSelector('.bmc-stage');
    const info = [];
    for (let i = 0; i < 13; i++) {
      const shot = [0, 1, 2, 7, 11, 12].includes(i);
      await page.waitForTimeout(shot ? 1700 : 450);
      info.push(await page.evaluate(() => {
        const st = document.querySelector('.bmc-stage');
        const sc = st.querySelector('.bmc-scene:not(.bmc-out)');
        const cells = Array.from(sc.querySelectorAll('.bmc-sboard .bmc-cell'));
        return [sc.className.replace('bmc-scene ', ''), sc.style.fontSize || '1', getComputedStyle(st.querySelector('.bmc-host')).fontSize,
          sc.scrollHeight - sc.clientHeight, cells.filter((c) => c.scrollHeight > c.clientHeight + 2).length,
          st.querySelector('.bmc-tools span').textContent, getComputedStyle(st).paddingBottom].join('|');
      }));
      if (shot) await page.screenshot({ path: path.join(out, name + '-s' + i + '.png') });
      await page.keyboard.press('ArrowRight');
    }
    console.log(name + '\n  ' + info.join('\n  '));
    await page.keyboard.press('Escape');
    console.log(name, 'closed after Esc:', await page.evaluate(() => !document.querySelector('.bmc-stage')));
    await page.close();
  }
  await run('solo', path.join(dist, 'bmc-blogfa.html'), { width: 1366, height: 768 });
  await run('tpl', tplFile, { width: 1366, height: 768 });
  await run('xga', path.join(dist, 'bmc-offline.html'), { width: 1024, height: 768 });
  await browser.close();
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO PAGE OR CONSOLE ERRORS');
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
