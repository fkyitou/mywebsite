/* Lab · From idea to invention: SCAMPER prompts with real historical examples, and NASA's Technology Readiness Levels as a ladder. */
(function () {
  'use strict';
  var W = window, AN = W.AN; if (!AN || !AN.ui) return;
  var ui = AN.ui, el = AN.el, esc = AN.esc;
  var SC = [
    ['S', 'جایگزین کن', 'به‌جای کدام جزء یا ماده‌ی «{x}» می‌شود چیز دیگری گذاشت؟', 'لامپ‌های LED جای لامپ رشته‌ای را گرفتند. جایزه‌ی نوبل فیزیک ۲۰۱۴ به سه دانشمندی رسید که LED آبیِ پربازده را ساختند و راه نور سفید کم‌مصرف را باز کردند.'],
    ['C', 'ترکیب کن', '«{x}» را با چه وسیله یا خدمت دیگری ترکیب کنیم تا کار تازه‌ای انجام دهد؟', 'وقتی آیفون در ژانویه‌ی ۲۰۰۷ معرفی شد، آن را ترکیب سه چیز نامیدند: پخش‌کننده‌ی موسیقی، تلفن همراه و ابزار ارتباط اینترنتی.'],
    ['A', 'اقتباس کن', 'چه ایده‌ای از طبیعت یا یک رشته‌ی دیگر را می‌شود در «{x}» به کار برد؟', 'ژرژ دو مسترال، مهندس سوئیسی، دید خارهای یک گیاه با قلاب‌های ریز به لباس و موی سگش می‌چسبند و از همین الگو چسب «ولکرو» را ساخت.'],
    ['M', 'بزرگ یا کوچکش کن', 'اگر «{x}» خیلی بزرگ‌تر، کوچک‌تر، سبک‌تر یا هوشمندتر شود چه می‌شود؟', 'کوچک‌تر شدن پیوسته‌ی ترانزیستورها، که گوردون مور در ۱۹۶۵ روندش را پیش‌بینی کرد، رایانه‌ای به اندازه‌ی یک اتاق را به تراشه‌ی داخل جیب ما رساند.'],
    ['P', 'کاربرد دیگری پیدا کن', '«{x}» برای چه کس دیگری یا چه کار دیگری مفید است؟', 'پرسی اسپنسر در دهه‌ی ۱۹۴۰ هنگام کار با مگنترون رادار متوجه شد شکلات جیبش آب شده؛ نتیجه، اجاق مایکروویو بود.'],
    ['E', 'حذف کن', 'کدام بخش «{x}» را می‌شود حذف کرد بی‌آن‌که کارش خراب شود؟', 'جیمز دایسون پس از ساختن هزاران نمونه‌ی اولیه، جاروبرقی بدون کیسه را به بازار آورد: کیسه‌ای که مدام پر و گرفته می‌شد حذف شد.'],
    ['R', 'برعکسش کن', 'اگر ترتیب، جهت یا نقش‌ها در «{x}» برعکس شود چه می‌شود؟', 'در کارخانه‌ی فورد (۱۹۱۳) به‌جای این‌که کارگرها دور خودرو بچرخند، خودرو روی خط متحرک از جلوی کارگرها گذشت و زمان سرهم کردن یک مدل T از ۱۲ ساعت و نیم به ۹۳ دقیقه رسید.']
  ];
  var THINGS = ['کیف مدرسه', 'بطری آب', 'دوچرخه', 'چتر', 'کفش ورزشی', 'میز تحریر', 'هدفون', 'ساعت مچی', 'جامدادی', 'سطل زباله', 'چراغ مطالعه', 'صندلی کلاس'];
  var TRL = [
    ['اصل علمی پشت ایده‌ات شناخته‌شده و گزارش شده است؟', 'اصول پایه مشاهده و گزارش شده‌اند.'],
    ['دقیق نوشته‌ای ایده چه کاربردی دارد و چطور قرار است کار کند؟', 'مفهوم فناوری و کاربردش صورت‌بندی شده است.'],
    ['با محاسبه یا یک آزمایش ساده نشان داده‌ای که بخش اصلی ایده واقعاً کار می‌کند؟', 'اثبات مفهوم با تحلیل و آزمایش انجام شده است.'],
    ['اجزای اصلی را ساخته‌ای و در کارگاه یا آزمایشگاه کنار هم آزموده‌ای؟', 'اجزا در محیط آزمایشگاهی اعتبارسنجی شده‌اند.'],
    ['اجزا را در شرایطی شبیه محیط واقعی آزموده‌ای؟', 'اجزا در محیط مرتبط اعتبارسنجی شده‌اند.'],
    ['یک نمونه‌ی اولیه‌ی کامل در شرایط شبیه محیط واقعی درست کار کرده است؟', 'نمونه‌ی اولیه‌ی سامانه در محیط مرتبط نمایش داده شده است.'],
    ['نمونه‌ی اولیه در محیط واقعی و با کاربران واقعی کار کرده است؟', 'نمونه‌ی اولیه در محیط عملیاتی نمایش داده شده است.'],
    ['محصول نهایی ساخته شده و آزمون‌های لازم را با موفقیت گذرانده است؟', 'سامانه‌ی واقعی کامل و با آزمون تأیید شده است.'],
    ['محصول در استفاده‌ی واقعی و مداوم موفق بوده است؟', 'سامانه‌ی واقعی در مأموریت یا بازار واقعی اثبات شده است.']
  ];

  AN.labs = AN.labs || {};
  AN.labs.idea = {
    title: 'کارگاه ایده: از جرقه تا اختراع',
    sub: 'با روش «اسکمپر» از یک وسیله‌ی ساده ایده بساز و با نردبان آمادگی فناوری ناسا ببین ایده‌ات کجای راه است.',
    mount: function (root) {
      var tabs = ui.tabs(root, ['ایده‌سازی با اسکمپر', 'نردبان آمادگی فناوری (TRL)']), P1 = tabs.panes[0], P2 = tabs.panes[1];
      var B = ui.body(P1), f = el('div', 'an-field'), saved = {};
      try { saved = JSON.parse(AN.store.get('an-scamper') || '{}') || {}; } catch (e) { saved = {}; }
      f.innerHTML = '<label for="an-thing"><span>یک وسیله‌ی روزمره</span></label><div class="an-pw-row"><input id="an-thing" type="text" value="' + esc(saved.x || 'کیف مدرسه') + '"><button type="button" class="an-btn an-btn-ghost an-btn-sm">🎲 تصادفی</button></div>';
      B.appendChild(f);
      var inp = f.querySelector('input'), grid = el('div', 'an-scamper'); B.appendChild(grid);
      SC.forEach(function (s, i) {
        var card = el('div', 'an-sc');
        card.innerHTML = '<div class="an-sc-h"><b>' + s[0] + '</b><span>' + esc(s[1]) + '</span></div><p class="an-sc-q"></p><textarea rows="2" placeholder="ایده‌ی خودت…" aria-label="ایده‌ی تو برای ' + esc(s[1]) + '"></textarea><details><summary>نمونه‌ی واقعی از تاریخ</summary><p>' + esc(s[3]) + '</p></details>';
        var ta = card.querySelector('textarea'); ta.value = (saved.n || [])[i] || '';
        ta.addEventListener('input', save); grid.appendChild(card);
      });
      var res = el('div', 'an-sc-out'); B.appendChild(res);
      ui.btns(B, [['جمع‌بندی ایده‌های من', summary, true], ['پاک کردن', function () { [].forEach.call(grid.querySelectorAll('textarea'), function (t) { t.value = ''; }); save(); res.textContent = ''; }]]);
      ui.note(B, 'اسکمپر (SCAMPER) فهرست هفت پرسش است که باب ابرل در دهه‌ی ۱۹۷۰ از ایده‌های الکس آزبورن، پدیدآورنده‌ی «طوفان فکری»، ساخت. نوشته‌هایت فقط در همین مرورگر ذخیره می‌شوند.');
      function paint() { var x = inp.value.trim() || 'این وسیله'; [].forEach.call(grid.querySelectorAll('.an-sc-q'), function (q, i) { q.textContent = SC[i][2].replace('{x}', x); }); }
      function save() { var n = [].map.call(grid.querySelectorAll('textarea'), function (t) { return t.value; }); AN.store.set('an-scamper', JSON.stringify({ x: inp.value, n: n })); }
      function summary() {
        var n = [].map.call(grid.querySelectorAll('textarea'), function (t, i) { return t.value.trim() ? SC[i][1] + ': ' + t.value.trim() : null; }).filter(Boolean);
        res.innerHTML = n.length ? '<p class="an-lab-note"><b>ایده‌های تو برای «' + esc(inp.value) + '»</b><br>' + n.map(esc).join('<br>') + '<br>حالا قوی‌ترین ایده را انتخاب کن و در زبانه‌ی «نردبان آمادگی فناوری» ببین قدم بعدی چیست.</p>' : '<p class="an-lab-note">هنوز ایده‌ای ننوشته‌ای. برای شروع، فقط یکی از هفت پرسش را جواب بده.</p>';
      }
      inp.addEventListener('input', function () { paint(); save(); });
      f.querySelector('button').addEventListener('click', function () { var t; do { t = THINGS[Math.floor(Math.random() * THINGS.length)]; } while (t === inp.value && THINGS.length > 1); inp.value = t; paint(); save(); });
      paint();
      /* ---- TRL ladder ---- */
      var B2 = ui.body(P2), lad = el('ol', 'an-trl'), q = el('div', 'an-trl-q'), lvl = 0;
      lad.setAttribute('reversed', ''); TRL.forEach(function (t, i) { lad.insertBefore(el('li', '', '<b>TRL ' + AN.fa(i + 1) + '</b><span>' + esc(t[1]) + '</span>'), lad.firstChild); });
      var wrap = el('div', 'an-trl-wrap'); wrap.appendChild(q); wrap.appendChild(lad); B2.appendChild(wrap);
      ui.note(B2, 'سطح‌های آمادگی فناوری (TRL) را ناسا برای سنجیدن بلوغ فناوری‌ها ساخت و امروز در اتحادیه‌ی اروپا و صنعت هم به کار می‌رود. اینجا جمله‌ها برای پروژه‌های دانش‌آموزی ساده شده‌اند.');
      function ask() {
        [].forEach.call(lad.children, function (li, i) { var n = TRL.length - i; li.className = n <= lvl ? 'done' : n === lvl + 1 ? 'next' : ''; });
        if (lvl >= TRL.length) { q.innerHTML = '<p class="an-trl-res">🏆 ایده‌ات به بالاترین پله (TRL ۹) رسیده: یک محصول اثبات‌شده در دنیای واقعی.</p><div class="an-lab-btns"><button type="button" data-a="r">از اول</button></div>'; }
        else q.innerHTML = '<p class="an-trl-step">پله‌ی ' + AN.fa(lvl + 1) + ' از ۹</p><p class="an-trl-ask">' + esc(TRL[lvl][0]) + '</p><div class="an-lab-btns"><button type="button" class="pri" data-a="y">بله</button><button type="button" data-a="n">هنوز نه</button>' + (lvl ? '<button type="button" data-a="r">از اول</button>' : '') + '</div>';
      }
      q.addEventListener('click', function (e) {
        var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (!a) return;
        if (a === 'y') { lvl++; ask(); }
        else if (a === 'r') { lvl = 0; ask(); }
        else { [].forEach.call(lad.children, function (li, i) { var n = TRL.length - i; li.className = n <= lvl ? 'done' : n === lvl + 1 ? 'next' : ''; }); q.innerHTML = '<p class="an-trl-res">ایده‌ی تو در <b>TRL ' + AN.fa(lvl) + '</b> است' + (lvl ? ': ' + esc(TRL[lvl - 1][1]) : ' و هنوز پله‌ی اول را کامل نکرده') + '</p><p class="an-trl-ask">قدم بعدی: ' + esc(TRL[lvl][1]) + '</p><div class="an-lab-btns"><button type="button" data-a="r">از اول</button></div>'; }
      });
      ask();
    }
  };
})();
