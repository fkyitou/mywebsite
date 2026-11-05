/* Lab · Digital security: how strong is a password really, and how do one-time codes (TOTP, RFC 6238) work? Everything runs locally. */
(function () {
  'use strict';
  var W = window, D = document, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, el = AN.el, esc = AN.esc;
  var WORDS = 'آب آتش آسمان آفتاب آهو آینه ابر اتاق اسب انار انگور باد باران باغ بال بام برف برگ بهار بوم پاییز پرنده پرچم پل پنجره تابستان تاج ترانه تخته تپه توپ جاده جنگل جوی چراغ چشمه چمن چنار حلزون خرما خورشید خوشه دامنه درخت دریا دشت دفتر دلفین دوچرخه رود روز زمستان زمین زنبور ساحل ستاره سنگ سیب سیاره شاخه شب شبنم شمع شهاب صخره صدف طاووس طوطی عقاب غنچه فانوس فنجان قایق قطار قلم کتاب کوه کوچه کویر گلدان گنجشک گندم لاله ماه مداد مروارید موج میز نارنج نسیم نقشه نیلوفر هلو یاقوت یخ آبشار آتشفشان آلبالو آهنگ اقیانوس انجیر باتلاق بادام بادبادک بلوط بنفشه بیابان پرتقال پروانه پسته پلنگ پونه تمشک تندر توت جزیره جغد جیرجیرک چکاوک چلچله خرگوش خرس خیار دارکوب درنا دره رنگین‌کمان روباه زرافه زیتون ژاله سار سرو سمور سنجاب سوسن سیمرغ شالیزار شاهین شقایق شیر صنوبر غزال فیل قناری قو کاج کبوتر کرم کلاغ کندو گوزن گیلاس لک‌لک مرجان مرغابی میمون نخل نهنگ هدهد یوزپلنگ آجر آسیاب اجاق ارغنون انبار ایوان بازار بالش برج بشقاب پارو پرده پیانو تار تبر ترازو تلسکوپ تنبور جام چتر چرخ چکش حصیر خانه دروازه دف دیوار رادیو ربات زنگ ساعت سبد سکه سماور سنتور سوزن شیشه طناب عینک فرش قالی قفس قندان کاسه کلاه کلید کمان کوزه گهواره لنگر مشعل منار نردبان نی هاون پیمانه آش باقلوا برنج بستنی پنیر تخم‌مرغ حلوا خرمالو زعفران سمنو شیرینی عسل قارچ کشمش کلوچه گردو گوجه لوبیا لیمو نان نارگیل نبات هندوانه اصفهان البرز تبریز دماوند زاگرس سهند شیراز کرمان کاشان یزد همدان گیلان خزر کارون هامون مریخ'.split(' ');
  var COMMON = ['123456', '123456789', '12345678', 'password', 'qwerty', '12345', '1234567', '111111', '123123', 'abc123', 'password1', '1234', 'iloveyou', '1q2w3e4r', '000000', 'qwerty123', 'admin', '654321', '123321', '666666', '7777777', 'dragon', 'monkey', 'football', 'letmein', 'welcome', 'sunshine', 'princess', 'master', 'iran', 'ali123', 'hello', 'zxcvbnm', 'asdfgh', '987654321', 'q1w2e3r4', 'aa123456', '1qaz2wsx', 'passw0rd', 'superman'];
  var WORDISH = ['password', 'pass', 'admin', 'love', 'iran', 'tehran', 'persia', 'hello', 'welcome', 'dragon', 'monkey', 'football', 'master', 'qwerty', 'user', 'login', 'secret', 'shadow', 'sunshine', 'mohammad', 'reza', 'ali', 'hossein', 'mahdi', 'zahra', 'fatemeh', 'maryam', 'sara'];
  var SEQ = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  function analyze(pw) {
    var ch = Array.from(pw), L = ch.length, pool = 0, flags = [], low = pw.toLowerCase();
    if (/[a-z]/.test(pw)) pool += 26; if (/[A-Z]/.test(pw)) pool += 26; if (/[0-9]/.test(pw)) pool += 10;
    if (/[؀-ۿ]/.test(pw)) pool += 40; if (/\s/.test(pw)) pool += 1; if (/[^a-zA-Z0-9\s؀-ۿ]/.test(pw)) pool += 33;
    var bits = L ? L * Math.log2(Math.max(pool, 2)) : 0;
    if (COMMON.indexOf(low) > -1 || COMMON.indexOf(low.replace(/\d+$/, '')) > -1) { bits = Math.min(bits, 10); flags.push('در فهرست رمزهای بسیار رایج است؛ مهاجم‌ها همین‌ها را اول امتحان می‌کنند.'); }
    if (/^\d+$/.test(pw)) { bits = Math.min(bits, L * 3.32); if (L >= 8 && L <= 11) { bits -= 6; flags.push('فقط عدد است؛ شبیه شماره‌تلفن یا تاریخ تولد.'); } }
    var rep = pw.match(/(.)\1{2,}/g); if (rep) { bits -= rep.length * 6; flags.push('حرف یا عدد تکراری پشت سر هم دارد.'); }
    var seqHit = 0;
    SEQ.forEach(function (s) { for (var i = 0; i + 3 <= s.length; i++) { var part = s.substr(i, 3); if (low.indexOf(part) > -1 || low.indexOf(part.split('').reverse().join('')) > -1) seqHit++; } });
    if (seqHit) { bits -= Math.min(24, seqHit * 4); flags.push('دنباله‌ی ساده دارد (مثل abc، ۱۲۳ یا ردیف صفحه‌کلید).'); }
    if (/(13|14|19|20)\d\d/.test(pw)) { bits -= 6; flags.push('شبیه یک سال است؛ سال تولد اولین حدس مهاجم است.'); }
    var wd = WORDISH.filter(function (w) { return w.length >= 3 && low.indexOf(w) > -1; });
    if (wd.length) { bits -= wd.length * 10; flags.push('واژه یا نام رایج دارد: ' + wd.slice(0, 3).join('، ')); }
    if (L && L < 12) flags.push('کوتاه است؛ طول، مهم‌ترین عامل قدرت رمز است (دست‌کم ۱۲ تا ۱۵ نویسه).');
    return { bits: Math.max(0, bits), len: L, pool: pool, flags: flags };
  }
  function rand(n) { var a = new Uint32Array(1), lim = Math.floor(4294967296 / n) * n; do { (W.crypto || W.msCrypto).getRandomValues(a); } while (a[0] >= lim); return a[0] % n; }

  /* SHA-1 and HMAC in plain JavaScript, so the demo also works where Web Crypto is unavailable */
  function sha1(m) {
    var ml = m.length, nb = ((ml + 8) >> 6) + 1, w = new Uint32Array(nb * 16), x = new Uint32Array(80), i, b;
    for (i = 0; i < ml; i++) w[i >> 2] |= m[i] << (24 - (i & 3) * 8);
    w[ml >> 2] |= 0x80 << (24 - (ml & 3) * 8); w[nb * 16 - 1] = ml * 8;
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    for (b = 0; b < w.length; b += 16) {
      for (i = 0; i < 16; i++) x[i] = w[b + i];
      for (i = 16; i < 80; i++) { var q = x[i - 3] ^ x[i - 8] ^ x[i - 14] ^ x[i - 16]; x[i] = (q << 1) | (q >>> 31); }
      var a = h0, bb = h1, c = h2, d = h3, e = h4;
      for (i = 0; i < 80; i++) {
        var f, k; if (i < 20) { f = (bb & c) | (~bb & d); k = 0x5A827999; } else if (i < 40) { f = bb ^ c ^ d; k = 0x6ED9EBA1; } else if (i < 60) { f = (bb & c) | (bb & d) | (c & d); k = 0x8F1BBCDC; } else { f = bb ^ c ^ d; k = 0xCA62C1D6; }
        var t = (((a << 5) | (a >>> 27)) + f + e + k + x[i]) | 0; e = d; d = c; c = (bb << 30) | (bb >>> 2); bb = a; a = t;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + bb) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
    }
    var o = new Uint8Array(20); [h0, h1, h2, h3, h4].forEach(function (h, j) { o[j * 4] = h >>> 24; o[j * 4 + 1] = h >>> 16 & 255; o[j * 4 + 2] = h >>> 8 & 255; o[j * 4 + 3] = h & 255; }); return o;
  }
  function hmac(key, msg) { if (key.length > 64) key = sha1(key); var k = new Uint8Array(64), ip = new Uint8Array(64 + msg.length), op = new Uint8Array(84), i; k.set(key); for (i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; } ip.set(msg, 64); op.set(sha1(ip), 64); return sha1(op); }
  function totp(key, T, digits) {
    var msg = new Uint8Array(8), t = T, i; for (i = 7; i >= 0; i--) { msg[i] = t & 255; t = Math.floor(t / 256); }
    var h = hmac(key, msg), off = h[19] & 15, bin = ((h[off] & 127) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
    return { code: String(bin % Math.pow(10, digits)).padStart(digits, '0'), h: h, off: off };
  }
  function b32(bytes) { var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', bits = 0, v = 0, out = ''; for (var i = 0; i < bytes.length; i++) { v = (v << 8) | bytes[i]; bits += 8; while (bits >= 5) { out += A[(v >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) out += A[(v << (5 - bits)) & 31]; return out; }
  function hex(b, n) { var s = ''; for (var i = 0; i < (n || b.length); i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  AN.totp = totp; AN.sha1 = sha1;

  AN.labs = AN.labs || {};
  AN.labs.security = {
    title: 'آزمایشگاه رمز: قدرت رمز و کدهای یک‌بارمصرف',
    sub: 'همه‌ی محاسبه‌ها در همین مرورگر انجام می‌شود و هیچ نویسه‌ای جایی فرستاده یا ذخیره نمی‌شود.',
    mount: function (root) {
      var tabs = ui.tabs(root, ['قدرت رمز', 'رمز یک‌بارمصرف (TOTP)']), P1 = tabs.panes[0], P2 = tabs.panes[1];
      /* ---- tab 1: strength ---- */
      var B = ui.body(P1), f = el('div', 'an-field');
      f.innerHTML = '<label for="an-pw"><span>یک رمز نمونه بنویس (رمز واقعی‌ات را ننویس)</span></label><div class="an-pw-row"><input type="password" id="an-pw" autocomplete="off" spellcheck="false" placeholder="مثلاً Tehran1404"><button type="button" class="an-btn an-btn-ghost an-btn-sm" aria-pressed="false">نمایش</button></div>';
      B.appendChild(f);
      var inp = f.querySelector('input'), eye = f.querySelector('button');
      var meter = el('div', 'an-meter an-meter-big', '<i></i>'), lbl = el('p', 'an-pw-lbl', '&nbsp;'); B.appendChild(meter); B.appendChild(lbl);
      var st = ui.stats(B, [['bits', 'آنتروپی تخمینی'], ['on', 'حمله‌ی آنلاین (۱۰۰ حدس در ثانیه)'], ['slow', 'هش کند bcrypt (حدود ۱۰ هزار در ثانیه)'], ['fast', 'هش سریع روی GPU (حدود ۱۰۰ میلیارد در ثانیه)']]);
      var tips = el('ul', 'an-pw-tips'); B.appendChild(tips);
      var gen = el('div', 'an-pw-gen'); B.appendChild(gen);
      ui.btns(B, [['ساخت گذرعبارت فارسی تصادفی', makePhrase, true], ['ساخت رمز تصادفی ۱۶ نویسه‌ای', makeRandom]]);
      ui.note(B, 'زمان‌ها «میانگین» تا پیدا شدن رمز با حدس‌زدن‌اند و فقط مرتبه‌ی بزرگی را نشان می‌دهند. هیچ سنجه‌ای رمزی را که قبلاً در نشت اطلاعات لو رفته تشخیص نمی‌دهد؛ برای هر سایت رمز جدا بساز، از مدیر رمز عبور کمک بگیر و تأیید دومرحله‌ای را روشن کن.');
      function render() {
        var pw = inp.value, a = analyze(pw), b = a.bits, g = Math.pow(2, Math.max(0, b - 1));
        var lv = !pw ? ['', '0%', 'var(--border-2)'] : b < 28 ? ['خیلی ضعیف', '12%', 'var(--danger)'] : b < 36 ? ['ضعیف', '30%', 'var(--danger)'] : b < 60 ? ['متوسط', '55%', 'var(--warn)'] : b < 80 ? ['قوی', '80%', 'var(--ok)'] : ['عالی', '100%', 'var(--ok)'];
        meter.firstChild.style.setProperty('--w', lv[1]); meter.firstChild.style.setProperty('--mc', lv[2]);
        lbl.innerHTML = pw ? '<b>' + lv[0] + '</b>، ' + AN.fa(a.len) + ' نویسه از میان حدود ' + AN.fa(a.pool) + ' نویسه‌ی ممکن' : 'هنوز چیزی ننوشته‌ای.';
        st.set('bits', pw ? AN.fa(b, 0) + ' بیت' : '—', b >= 60 ? 'good' : b >= 36 ? 'warn' : pw ? 'bad' : '');
        st.set('on', pw ? ui.fmtTime(g / 100) : '—'); st.set('slow', pw ? ui.fmtTime(g / 1e4) : '—'); st.set('fast', pw ? ui.fmtTime(g / 1e11) : '—', pw ? (g / 1e11 > 3.15e7 ? 'good' : 'bad') : '');
        tips.innerHTML = a.flags.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') || (pw ? '<li class="ok">الگوی ضعف آشکاری پیدا نشد.</li>' : '');
      }
      function makePhrase() {
        var n = 6, ws = []; for (var i = 0; i < n; i++) ws.push(WORDS[rand(WORDS.length)]);
        var num = String(rand(100)), p = ws.join('-') + '-' + AN.faDigits(num), bits = n * Math.log2(WORDS.length) + Math.log2(100);
        gen.innerHTML = '<p class="an-pw-out" dir="rtl">' + esc(p) + '</p><p class="an-lab-note">' + AN.fa(n) + ' واژه از فهرستی ' + AN.fa(WORDS.length) + 'تایی با مولد تصادفی رمزنگاشتی مرورگر انتخاب شد: ' + AN.fa(n) + ' × ' + AN.fa(Math.log2(WORDS.length)) + ' + عدد ۰ تا ۹۹ ≈ <b>' + AN.fa(bits, 0) + ' بیت</b>. حتی اگر مهاجم فهرست واژه‌ها را بداند، باید همه‌ی ترکیب‌ها را امتحان کند.</p>';
      }
      function makeRandom() {
        var A = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+?', s = '';
        for (var i = 0; i < 16; i++) s += A[rand(A.length)];
        gen.innerHTML = '<p class="an-pw-out an-code">' + esc(s) + '</p><p class="an-lab-note">۱۶ نویسه از ' + AN.fa(A.length) + ' نویسه‌ی ممکن ≈ <b>' + AN.fa(16 * Math.log2(A.length), 0) + ' بیت</b>؛ مناسب برای ذخیره در مدیر رمز عبور، نه برای حفظ کردن.</p>';
      }
      inp.addEventListener('input', render);
      eye.addEventListener('click', function () { var s = inp.type === 'password'; inp.type = s ? 'text' : 'password'; eye.textContent = s ? 'پنهان' : 'نمایش'; eye.setAttribute('aria-pressed', String(s)); });
      render();
      /* ---- tab 2: TOTP ---- */
      var B2 = ui.body(P2), key = new Uint8Array(20); (W.crypto || W.msCrypto).getRandomValues(key);
      var wrap = el('div', 'an-totp');
      wrap.innerHTML = '<div class="an-totp-dev"><small>گوشی تو (برنامه‌ی تأیید هویت)</small><svg viewBox="0 0 44 44" class="an-totp-ring" aria-hidden="true"><circle cx="22" cy="22" r="19" class="bg"/><circle cx="22" cy="22" r="19" class="fg" pathLength="100"/></svg><b class="an-code" data-c="a">------</b><span class="an-totp-left"></span></div>' +
        '<div class="an-totp-mid" aria-hidden="true">⟷</div>' +
        '<div class="an-totp-dev"><small>سرور سایت</small><svg viewBox="0 0 44 44" class="an-totp-ring" aria-hidden="true"><circle cx="22" cy="22" r="19" class="bg"/><circle cx="22" cy="22" r="19" class="fg" pathLength="100"/></svg><b class="an-code" data-c="b">------</b><span class="an-totp-ok">هر دو یک عدد را حساب کرده‌اند ✓</span></div>';
      B2.appendChild(wrap);
      var sec = el('p', 'an-lab-note', ''); B2.appendChild(sec);
      var steps = el('ol', 'an-totp-steps'); B2.appendChild(steps);
      var vf = el('div', 'an-field', '<label for="an-otp"><span>کد گوشی را وارد کن تا سرور بررسی کند</span></label><div class="an-pw-row"><input id="an-otp" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="۶ رقم"><button type="button" class="an-btn an-btn-primary an-btn-sm">ورود</button></div><p class="an-otp-res" aria-live="polite"></p>');
      B2.appendChild(vf);
      ui.btns(B2, [['کلید مخفی تازه', function () { (W.crypto || W.msCrypto).getRandomValues(key); tick(true); }]]);
      ui.note(B2, 'این همان الگوریتم TOTP در استاندارد RFC 6238 است که برنامه‌هایی مثل Google Authenticator به کار می‌برند. گوشی و سرور فقط یک بار «کلید مخفی» را با هم به اشتراک می‌گذارند (معمولاً با اسکن QR). بعد از آن هر کدام جداگانه از روی ساعت، همان کد شش‌رقمی را می‌سازند؛ پس کسی که فقط رمز تو را دزدیده، بدون گوشی نمی‌تواند وارد شود.');
      var lastT = -1;
      function tick(force) {
        var now = Date.now() / 1000, T = Math.floor(now / 30), left = 30 - (now % 30);
        qa(wrap, '.an-totp-ring .fg').forEach(function (c) { c.style.strokeDashoffset = String(100 - left / 30 * 100); });
        wrap.querySelector('.an-totp-left').textContent = AN.fa(Math.ceil(left)) + ' ثانیه تا کد بعدی';
        if (T === lastT && !force) return; lastT = T;
        var r = totp(key, T, 6), code = r.code.slice(0, 3) + ' ' + r.code.slice(3);
        wrap.querySelector('[data-c="a"]').textContent = code; wrap.querySelector('[data-c="b"]').textContent = code;
        sec.innerHTML = 'کلید مخفی مشترک (Base32): <span class="an-code">' + b32(key).replace(/(.{4})/g, '$1 ').trim() + '</span>';
        steps.innerHTML = '<li>شمارنده‌ی زمان: T = ⌊ زمان یونیکس ÷ ۳۰ ⌋ = <span class="an-code">' + T + '</span></li>' +
          '<li>HMAC-SHA1(کلید، T) = <span class="an-code">' + hex(r.h) + '</span></li>' +
          '<li>نیم‌بایت آخر می‌گوید از بایت شماره‌ی ' + AN.fa(r.off) + ' چهار بایت برداریم ← عدد ۳۱ بیتی ← باقیمانده بر ۱٬۰۰۰٬۰۰۰ = <b class="an-code">' + r.code + '</b></li>';
      }
      function qa(r, s) { return [].slice.call(r.querySelectorAll(s)); }
      var oi = vf.querySelector('input'), ob = vf.querySelector('button'), ores = vf.querySelector('.an-otp-res');
      function check() {
        var v = oi.value.replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/\D/g, ''), T = Math.floor(Date.now() / 30000);
        var ok = v.length === 6 && (totp(key, T, 6).code === v || totp(key, T - 1, 6).code === v);
        ores.textContent = ok ? 'کد درست است؛ ورود موفق ✓ (سرور معمولاً کد بازه‌ی قبلی را هم برای جبران اختلاف ساعت می‌پذیرد).' : 'کد نادرست یا منقضی است ✗';
        ores.className = 'an-otp-res ' + (ok ? 'good' : 'bad');
      }
      ob.addEventListener('click', check); oi.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
      tick(true);
      ui.loop(root, function () { if (!P2.hidden) tick(false); });
    }
  };
})();
