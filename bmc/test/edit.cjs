// Edit-mode test: edits fields and list items, checks that the change survives
// a reload (localStorage), reaches the presentation, and that the exported
// "fresh code" is one line and works on its own in a clean browser profile.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const dist = path.join(__dirname, '..', 'dist');
  const out = process.env.BMC_SHOTS || path.join(__dirname, 'shots');
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(dist, 'bmc-blogfa.html');
  const browser = await chromium.launch();
  const errors = [];
  const fails = [];
  const check = (ok, label) => { console.log((ok ? 'ok   ' : 'FAIL ') + label); if (!ok) fails.push(label); };

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => {
    window.__copied = null;
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } },
      });
    } catch (e) { /* the page falls back to execCommand */ }
  });
  await page.goto('file://' + file);
  await page.waitForSelector('.bmc-go');
  const bar = (t) => page.locator('.bmc-bar .bmc-btn', { hasText: t });
  const retype = async (loc, text) => { await loc.click(); await page.keyboard.press('Control+A'); await page.keyboard.type(text); };

  await bar('ویرایش محتوا').click();
  await retype(page.locator('#bmc [data-f="name"]'), 'کافه‌کتاب راوی');
  await retype(page.locator('#bmc .bmc-k1 li').first(), 'دانشجویان شهر');
  await page.locator('#bmc .bmc-k2 .bmc-add').click();
  await page.keyboard.type('مورد تازهٔ آزمایشی');
  const second = page.locator('#bmc .bmc-k3 li').nth(1);
  await second.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
  await page.screenshot({ path: path.join(out, 'edit-mode.png') });
  await bar('کپی کد تازه').click();
  await page.waitForTimeout(400);
  const copied = await page.evaluate(() => window.__copied);
  await bar('پایان ویرایش').click();

  const read = () => page.evaluate(() => {
    const t = (s) => Array.from(document.querySelectorAll(s)).map((x) => x.textContent);
    return { name: t('#bmc [data-f="name"]')[0], k1: t('#bmc .bmc-k1 li'), k2: t('#bmc .bmc-k2 li'), k3: t('#bmc .bmc-k3 li'),
      editable: document.querySelectorAll('#bmc [contenteditable]').length, adds: document.querySelectorAll('#bmc .bmc-add').length };
  });
  let s = await read();
  check(s.name === 'کافه‌کتاب راوی', 'title edited: ' + s.name);
  check(s.k1[0] === 'دانشجویان شهر', 'block 1 first item edited');
  check(s.k2.length === 5 && s.k2[4] === 'مورد تازهٔ آزمایشی', 'block 2 got a fifth item');
  check(s.k3.length === 3, 'emptied item of block 3 was removed (' + s.k3.length + ' left)');
  check(s.editable === 0 && s.adds === 0, 'edit controls are gone after finishing');

  await page.reload();
  await page.waitForSelector('.bmc-go');
  s = await read();
  check(s.name === 'کافه‌کتاب راوی' && s.k2.length === 5 && s.k3.length === 3, 'edits survive a reload');
  await page.click('.bmc-go');
  await page.waitForTimeout(700);
  check(await page.evaluate(() => document.querySelector('.bmc-stage .bmc-big').textContent) === 'کافه‌کتاب راوی', 'presentation shows the edited title');
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(700);
  check(await page.evaluate(() => document.querySelectorAll('.bmc-stage .bmc-pi li').length) === 5, 'presentation block 2 shows five items');
  await page.keyboard.press('Escape');

  check(typeof copied === 'string' && copied.length > 20000, 'fresh code was copied (' + (copied ? copied.length : 0) + ' chars)');
  check(!/[\r\n]/.test(copied || ''), 'fresh code is a single line');
  check(!/contenteditable|bmc-add|bmc-bar|bmc-editing/.test((copied || '').split('<script')[0].split('</style>')[1] || ''), 'fresh code markup has no editor leftovers');
  const exp = path.join(out, 'exported.html');
  fs.writeFileSync(exp, copied || '');
  const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push('exported pageerror: ' + e.message));
  await p2.goto('file://' + exp);
  await p2.waitForSelector('.bmc-go');
  const e2 = await p2.evaluate(() => ({ name: document.querySelector('#bmc [data-f="name"]').textContent,
    k1: document.querySelector('#bmc .bmc-k1 li').textContent, k2: document.querySelectorAll('#bmc .bmc-k2 li').length,
    k3: document.querySelectorAll('#bmc .bmc-k3 li').length, bars: document.querySelectorAll('.bmc-bar').length }));
  check(e2.name === 'کافه‌کتاب راوی' && e2.k1 === 'دانشجویان شهر' && e2.k2 === 5 && e2.k3 === 3 && e2.bars === 1, 'fresh code opens in a clean profile with the edits: ' + JSON.stringify(e2));
  await p2.click('.bmc-go');
  await p2.waitForTimeout(600);
  check(await p2.evaluate(() => !!document.querySelector('.bmc-stage .bmc-big')), 'fresh code can start the presentation');

  await bar('ویرایش محتوا').click();
  await bar('بازگشت به متن اولیه').click();
  await page.waitForSelector('.bmc-go');
  s = await read();
  check(s.name === 'آینده‌نگار' && s.k2.length === 4 && s.k3.length === 4, 'reset brings back the original text');

  await browser.close();
  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'NO PAGE OR CONSOLE ERRORS');
  console.log(fails.length ? fails.length + ' CHECK(S) FAILED' : 'ALL CHECKS PASSED');
  process.exit(errors.length || fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
