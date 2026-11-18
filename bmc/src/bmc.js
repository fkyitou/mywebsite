/* Presentation mode for the Netemdad canvas page. Every slide is built from the page markup (#bmc), so the
   page body stays the single source of the canvas and research text; this script adds behaviour, the slide
   order and the speaker notes. */
(function(W,D){
var H=D.documentElement;
function start(){
var root=D.getElementById('bmc');
if(!root||root.bmcOn)return;root.bmcOn=1;
function el(t,c,x){var e=D.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function $$(s,c){return Array.prototype.slice.call((c||root).querySelectorAll(s));}
function clean(s){return String(s==null?'':s).replace(/\s+/g,' ').trim();}
function fa(n){return String(n).replace(/\d/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.charAt(d);});}
function btn(t,c,f){var b=el('button','bmc-btn'+(c?' '+c:''),t);b.type='button';b.onclick=f;return b;}
function one(s,c){return (c||root).querySelector(s);}
function txt(s,c){var n=one(s,c);return clean(n?n.textContent:'');}
function keyed(n,f){n.tabIndex=0;n.setAttribute('role','button');n.addEventListener('click',f);n.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();f(e);}});}
var RM=!!(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches);
function num(s){return +String(s).replace(/[۰-۹]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d);}).replace(/[^\d]/g,'');}
/* Line icons of the presentation toolbar (24px grid, drawn with the current text colour). */
var ICO={grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  laser:'<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  spot:'<circle cx="12" cy="12" r="9.5" stroke-dasharray="2.6 3"/><circle cx="12" cy="12" r="4.2"/>',
  qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 21h2M21 14v2"/>',
  notes:'<path d="M4 6h16M4 11h16M4 16h10M4 21h6"/>',
  pres:'<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  sfx:'<path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  auto:'<circle cx="12" cy="12" r="9.5"/><path d="M10 8.3v7.4l6-3.7Z"/>',
  full:'<path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"/>',
  help:'<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.3-2.8 4"/><path d="M12 17.6h.01"/>'};
function ibtn(ic,label,f,cls){var b=el('button','bmc-btn bmc-ib bmc-i-'+ic+(cls?' '+cls:''));b.type='button';b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+ICO[ic]+'</svg>';
  b.setAttribute('aria-label',label);b.title=label;b.onclick=function(e){e.stopPropagation();f();};return b;}
/* Count the scores of table 16 up from zero; the original text is put back at the end. */
function count(sc){if(RM)return;$$('.bmc-score b',sc).forEach(function(b,i){var o=b.textContent,n=num(o),t0=0,d=900+i*140;if(!n)return;b.textContent=fa(0);
  function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/d);if(k<1){b.textContent=fa(Math.round(n*(1-Math.pow(1-k,3))));W.requestAnimationFrame(f);}else b.textContent=o;}W.requestAnimationFrame(f);});}
var PAGE='ayandehnegar.blogfa.com/page/bmc';

/* Blogfa's editor turns line breaks into <br> and may leave empty paragraphs between blocks. */
$$('br').forEach(function(b){b.parentNode.removeChild(b);});
$$('p').forEach(function(p){if(!p.children.length&&!clean(p.textContent))p.parentNode.removeChild(p);});
var solo=root.parentNode===D.body&&!D.querySelector('.an-post-body');
if(solo){H.classList.add('bmc-solo');if(!H.getAttribute('dir'))H.setAttribute('dir','rtl');if(!H.getAttribute('lang'))H.setAttribute('lang','fa');}
root.classList.add('bmc-js');

var poster=one('.bmc-poster'),cells=[],SAY=$$('.bmc-pitch li').map(function(l){return clean(l.textContent);});
for(var k=1;k<=9;k++)cells.push(one('.bmc-c'+k));
var NAME='نِت‌امداد',L1=txt('.bmc-h1 .bmc-red').replace(/^نِت‌امداد؛\s*/,''),L2=txt('.bmc-h2 .bmc-blue'),SIGN=txt('.bmc-sign');
var WHO=(SIGN.match(/اجرا:\s*([^·]+)/)||[])[1];WHO=WHO?clean(WHO):'';
var TOUCH=!!(W.matchMedia&&W.matchMedia('(pointer:coarse)').matches);

/* Two decks: the full class conference and the 1.5-minute pitch of the assignment. */
var FULL=['title','agenda','problem','alts','scamper','need','why','whole',1,2,3,'journey',4,5,6,7,8,9,'strat','phases','values','sum','qa','thanks'];
var SHORT=['title','whole',1,2,3,4,5,6,7,8,9,'thanks'];
var STEPS=FULL,S=null;
var T={title:'عنوان',agenda:'فهرست ارائه',problem:'مسئله',alts:'راه‌حل‌های موجود',scamper:'ایده‌پردازی با اسکمپر',need:'نیاز، خواسته، تقاضا',why:'انتخاب ایده',whole:'بوم کامل',journey:'سفر مشتری',
  strat:'راهبرد',phases:'فازهای اجرا',values:'ارزش‌های اجتماعی',sum:'جمع‌بندی',qa:'پرسش و پاسخ',thanks:'سپاس'};
cells.forEach(function(c,i){if(c)T[i+1]=txt('.bmc-t',c);});
var CH=[['۱','مسئله و ایده','problem','مسئله، راه‌حل‌های موجود، اسکمپر، نیاز مشتری و انتخاب ایده'],['۲','بوم مدل کاروکسب','whole','بوم کامل، ۹ خانه به ترتیب شماره و سفر مشتری'],
  ['۳','راهبرد و اجرا','strat','راهبرد، نقشهٔ راهبرد، فازهای اجرا و ارزش‌های اجتماعی'],['۴','جمع‌بندی و پرسش','sum','چهار جملهٔ پایانی و پرسش‌های احتمالی']];
var TIP={1:'فرق «مشتری» (کسی که پول می‌دهد) و «مصرف‌کننده» (کسی که استفاده می‌کند) را با مثال پدر و فرزند بگویید.',
  2:'تأکید کنید تشخیص آنلاین رایگان است و قیمت پیش از کار اعلام می‌شود؛ این دو، فرق اصلی ما با تعمیرکار محل است.',
  3:'پنج وظیفهٔ کانال را بشمارید: آگاهی، ارزیابی، خرید، تحویل و پس از فروش. اسلاید بعدی همین پنج مرحله را به‌شکل سفر مشتری نشان می‌دهد.',
  4:'دو هدف ارتباط: جذب مشتری با تشخیص رایگان، و حفظ مشتری با اشتراک ماهانه و کارشناس ثابت.',
  5:'بگویید درآمد پایدار از اشتراک ماهانه است و بقیه درآمد کمکی‌اند.',
  6:'پنج نوع منبع: فیزیکی، مالی، اجتماعی، معنوی و انسانی؛ مهم‌ترینش مهارت خود تیم است.',
  7:'امن‌سازی شبکه با رمز قوی و شبکهٔ مهمان جدا را مثال بزنید.',
  8:'سه انگیزهٔ شراکت: کاهش خطر، کاهش هزینه، و گرفتن توانایی‌هایی که خودمان نداریم.',
  9:'مدل هزینهٔ ما ترکیبی است: ارزش‌محور در کیفیت خدمت، هزینه‌محور در اجرا.'};
var NOTE={title:'سلام. '+(WHO?'من '+WHO+' هستم، ':'')+'هنرجوی رشتهٔ شبکه و نرم‌افزار رایانه. موضوع ارائهٔ من بوم مدل کاروکسب «نت‌امداد» است: امداد آنلاین شبکه و اینترنت برای خانه‌ها و کاروکسب‌های اراک.',
  agenda:'ارائه چهار بخش دارد: اول مسئله و اینکه ایده از کجا آمد، بعد بوم و ۹ خانه‌اش، بعد راهبرد و برنامهٔ اجرا، و در آخر جمع‌بندی و پرسش‌ها.',
  problem:'داستان را تعریف کنید؛ اگر نمونهٔ واقعی در فامیل یا محله دارید، همان را بگویید تا قوی‌تر شود. بعد مسئلهٔ اصلی را بلند بخوانید و شش نکتهٔ زیرش را بشمارید.',
  alts:'چهار راه‌حل فعلی را مرور کنید و برای هر کدام یک خوبی و یک ضعف بگویید. بعد جایگاه نت‌امداد را نشان دهید: تخصصی، محلی، اول از راه دور، قیمت ثابت و ضمانت. ضعف خودمان را هم صادقانه بگویید: باید اعتماد بسازیم.',
  scamper:'برای ایده‌پردازی از روش اسکمپر استفاده کردیم: هفت پرسش که یک کار موجود را به ایدهٔ تازه تبدیل می‌کند. دو یا سه مورد را مثال بزنید؛ مثلاً اقتباس از امداد خودرو، یا معکوس کردن «صبر تا خرابی» به بررسی دوره‌ای.',
  need:'با جدول ۱۵ دو گروه مشتری را جدا کردیم. فرق نیاز، خواسته و تقاضا را با همین مثال‌ها بگویید. رنگ نارنجی و صورتی بوم از همین دو گروه می‌آید. نیاز جدیدی که پیدا کردیم «معاینهٔ فنی شبکه» است.',
  why:'پنج ایده را با معیارهای جدول ۱۶ امتیاز دادیم و نت‌امداد با ۳۱ از ۳۵ اول شد. دو یا سه دلیل را بگویید: نیاز تکرارشونده، سرمایهٔ کم و درآمد ماهانه.',
  whole:'این بوم کامل ماست. رنگ برگه‌ها را توضیح دهید: نارنجی خانواده‌ها، صورتی کاروکسب‌ها، زرد هر دو گروه، سبز فاز ۲. با زدن روی هر رنگ در راهنما، برگه‌های همان گروه روشن می‌شوند. حالا خانه‌ها را به ترتیب شماره، مثل یک داستان، تعریف می‌کنیم.',
  journey:'این پنج مرحله همان پنج وظیفهٔ کانال در جدول ۲۰ است، این بار از نگاه مشتری. از راست به چپ بروید: مشتری اول از کجا ما را می‌شناسد، چطور مطمئن می‌شود، چطور سفارش می‌دهد، کار چطور انجام می‌شود و بعد از کار چه می‌شود. برای هر مرحله یک نمونه بگویید.',
  strat:'راهبرد را در یک جمله بگویید: «اول از راه دور، بعد در محل». بعد چهار دیدگاه نقشهٔ راهبرد را مرور کنید: مالی، مشتری، فرایندهای داخلی، و یادگیری و رشد.',
  phases:'فاز ۱ کمینه محصول پذیرفتنی است: با یک صفحهٔ ساده و آگهی شروع می‌کنیم و هدف عددی داریم. فاز ۲ همان برگه‌های سبز بوم است.',
  values:'نشان دهید بوم به مسئولیت اجتماعی هم فکر کرده است: حریم خصوصی مشتری، میزبان داخلی و معتبر، و کم کردن رفت‌وآمد و آلودگی هوا.',
  sum:'این چهار جمله را آرام بخوانید؛ خلاصهٔ کل ارائه است. بعد همکلاسی‌ها را به پرسیدن دعوت کنید.',
  qa:'هر پرسشی پرسیدند، روی همان پرسش بزنید تا پاسخ آماده دیده شود؛ با زبان خودتان توضیحش دهید.',
  thanks:'از هنرآموز و همکلاسی‌ها تشکر کنید.'};
var PLAN=[1,4,8,10,11];
function chap(i){var c=-1;if(STEPS[i]==='title')return -2;CH.forEach(function(ch,k){var j=STEPS.indexOf(ch[2]);if(j>=0&&j<=i)c=k;});return c;}
function chapName(i){var c=chap(i);if(c<0||STEPS[i]==='thanks')return '';return STEPS===SHORT?CH[c][1]:'بخش '+CH[c][0]+' · '+CH[c][1];}
function due(i){var c=chap(i);return STEPS===FULL?PLAN[c<0?0:c+1]:0;}
function note(st){return typeof st==='number'?(SAY[st-1]||'')+'\n\nنکته: '+TIP[st]+'\nبرای نشان دادن جدول همین خانه دکمهٔ «جزئیات» یا کلید D را بزنید.':NOTE[st]||'';}

/* Toolbar above the poster */
var bar=el('div','bmc-bar'),go=btn('▶ ارائهٔ کامل کلاس','',function(){open(0,FULL);});
bar.appendChild(go);bar.appendChild(btn('ارائهٔ کوتاه ۱٫۵ دقیقه‌ای','bmc-alt2',function(){open(0,SHORT);}));
bar.appendChild(el('p','',TOUCH?'برای ارائهٔ هر خانه، روی همان خانهٔ بوم بزنید.':'روی هر خانهٔ بوم کلیک کنید تا ارائه از همان‌جا شروع شود. در ارائه: → بعدی، O همهٔ اسلایدها، W قلم، Q کد QR، H راهنمای همهٔ کلیدها.'));
bar.appendChild(btn('چاپ بوم','bmc-print',function(){W.print();}));bar.appendChild(btn('چاپ گزارش','bmc-print',report));root.insertBefore(bar,poster);
/* Shortcuts to the sections under the poster. Labels are the slide titles, or the start of the section heading. */
var jump=el('nav','bmc-jump');jump.setAttribute('aria-label','پرش به بخش‌های صفحه');
['poster','pitch','problem','alts','scamper','need','why','details','strat','values','sum','qa'].forEach(function(k){var s=k==='poster'?poster:one('.bmc-sec.bmc-'+k);if(!s)return;
  var h=k==='poster'?null:one('h2',s),t=k==='poster'?'بوم':T[k]||clean(h?h.textContent:'').split(/[:：؛]/)[0];if(!t)return;
  var b=el('button','',t);b.type='button';b.onclick=function(){var g=h||s;if(!g.hasAttribute('tabindex'))g.tabIndex=-1;
    try{g.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});}catch(e){g.scrollIntoView();}try{g.focus({preventScroll:true});}catch(e){}};jump.appendChild(b);});
root.insertBefore(jump,poster);
/* Sections rise into view as the page is read; the scores of table 16 count up the first time they appear. */
if(!RM&&'IntersectionObserver' in W){var rv=$$('.bmc-sec');rv.forEach(function(s){s.classList.add('bmc-rv');});
  var io=new W.IntersectionObserver(function(es){es.forEach(function(en){if(!en.isIntersecting)return;var s=en.target;s.classList.add('bmc-in');io.unobserve(s);if(s.classList.contains('bmc-why'))count(s);});},{rootMargin:'0px 0px -5% 0px',threshold:.04});
  rv.forEach(function(s){io.observe(s);});W.addEventListener('beforeprint',function(){rv.forEach(function(s){s.classList.add('bmc-in');});});}
/* Report print: hide everything outside the page along the chain of its ancestors, so the report starts on the
   first sheet and leaves no blank sheets, and switch the sheet to portrait only for this print. */
function report(){var up=[],n=root.parentNode,pg=el('style');pg.textContent='@page{size:A4 portrait!important;margin:12mm 11mm!important}';
  while(n&&n!==D.documentElement){if(n.classList){n.classList.add('bmc-keep');up.push(n);}n=n.parentNode;}
  H.classList.add('bmc-print-report');D.body.appendChild(pg);var done=false;
  function end(){if(done)return;done=true;W.removeEventListener('afterprint',end);H.classList.remove('bmc-print-report');up.forEach(function(x){x.classList.remove('bmc-keep');});if(pg.parentNode)pg.parentNode.removeChild(pg);}
  W.addEventListener('afterprint',end);W.print();}

cells.forEach(function(c,i){if(!c)return;$$('.bmc-notes li',c).forEach(function(l,j){l.style.setProperty('--d',i*2+j);});
  c.setAttribute('aria-label','ارائهٔ خانهٔ '+fa(i+1));keyed(c,function(){open(FULL.indexOf(i+1),FULL);});});

/* Legend chips filter the board by colour: who each note is for, or what belongs to phase 2. */
function colors(pz,lg){if(!lg)return;var items=$$('li',lg);lg.classList.add('bmc-lgf');
  items.forEach(function(li){var k=(li.className.match(/bmc-([opyg])\b/)||[])[1];if(!k)return;li.setAttribute('aria-pressed','false');
    keyed(li,function(e){if(e&&e.stopPropagation)e.stopPropagation();var on=li.getAttribute('aria-pressed')!=='true';items.forEach(function(x){x.setAttribute('aria-pressed','false');});
      'opyg'.split('').forEach(function(c){pz.classList.remove('bmc-f-'+c);});if(on){li.setAttribute('aria-pressed','true');pz.classList.add('bmc-f-'+k);}});});}
colors(poster,one('.bmc-legend',poster));

/* Questions and block tables open on demand */
function fold(sel,first){$$(sel).forEach(function(q,i){var h=one('h3',q);if(!h)return;
  function t(){var on=!q.classList.contains('bmc-open');q.classList.toggle('bmc-open',on);h.setAttribute('aria-expanded',on?'true':'false');}
  if(first&&i===0)q.classList.add('bmc-open');h.setAttribute('aria-expanded',q.classList.contains('bmc-open')?'true':'false');keyed(h,t);});}
fold('.bmc-q',true);fold('.bmc-dt',false);

function adH(){var k=D.body.children,i,e,cs,h;for(i=0;i<k.length;i++){e=k[i];if(e.className||e.tagName!=='DIV')continue;cs=W.getComputedStyle(e);if(cs.position==='fixed'&&cs.bottom==='0px'&&cs.display!=='none'){h=Math.round(e.getBoundingClientRect().height);return h>240?0:h;}}return 0;}
function copy(sec,parts,p){var s=one(sec);parts.forEach(function(q){var n=s&&one(q,s);if(n)p.appendChild(n.cloneNode(true));});}
function qa(p){var u=el('ul','bmc-qs'),ans=el('div','bmc-ans');ans.hidden=true;
  $$('.bmc-q').forEach(function(q){var b=el('button','',txt('h3',q)),a=txt('p',q);b.type='button';b.onclick=function(e){e.stopPropagation();var on=b.className!=='on';$$('button',u).forEach(function(x){x.className='';});
    ans.textContent='';if(on){b.className='on';ans.appendChild(el('b','',txt('h3',q)));ans.appendChild(el('span','',a));}ans.hidden=!on;fit();};var li=el('li');li.appendChild(b);u.appendChild(li);});
  p.appendChild(u);p.appendChild(ans);}

function scene(st){var sc=el('div','bmc-scene'),p;
if(st==='title'){p=el('div','bmc-paper bmc-title');
  [['o',6,8,-12],['p',4,84,9],['y',72,4,7],['g',70,88,-8]].forEach(function(f,i){var n=el('i','bmc-fly bmc-'+f[0]);n.style.cssText='top:'+f[1]+'%;right:'+f[2]+'%;transform:rotate('+f[3]+'deg);animation-delay:'+(i*120+200)+'ms';p.appendChild(n);});
  p.appendChild(el('p','bmc-eye','ارائهٔ بوم مدل کاروکسب'));p.appendChild(el('p','bmc-big',NAME));p.appendChild(el('p','bmc-l1',L1));p.appendChild(el('p','bmc-l2',L2));
  p.appendChild(one('.bmc-legend').cloneNode(true));p.appendChild(el('p','bmc-by',SIGN));}
else if(st==='agenda'){p=el('div','bmc-paper bmc-sect bmc-agenda');p.appendChild(el('h2','','فهرست ارائه'));var ol=el('ol','bmc-chap');
  CH.forEach(function(c){var li=el('li'),b=el('button');b.type='button';b.appendChild(el('span','bmc-cn',c[0]));var t=el('span','bmc-ct');t.appendChild(el('b','',c[1]));t.appendChild(el('small','',c[3]));b.appendChild(t);
    b.onclick=function(e){e.stopPropagation();show(STEPS.indexOf(c[2]));};li.appendChild(b);ol.appendChild(li);});p.appendChild(ol);}
else if(st==='whole'){p=el('div','bmc-whole');var c=poster.cloneNode(true);
  $$('.bmc-cell',c).forEach(function(x,i){x.removeAttribute('tabindex');x.addEventListener('click',function(e){e.stopPropagation();S.zoom=at(x);show(STEPS.indexOf(i+1));});});
  colors(c,one('.bmc-legend',c));
  p.appendChild(c);p.appendChild(el('p','bmc-cap',(TOUCH?'روی هر خانه بزنید':'روی هر خانه کلیک کنید')+' تا بزرگ شود؛ روی رنگ‌های راهنما بزنید تا برگه‌های همان گروه روشن شوند'));}
else if(typeof st==='number'){var cell=cells[st-1],h=el('div','bmc-bh'),mini=el('div','bmc-mini'),ul=el('ul','bmc-bnotes'),dt=one('.bmc-d'+st);
  p=el('div','bmc-paper bmc-block bmc-c'+st);
  h.appendChild(el('span','bmc-bn',fa(st)));h.appendChild(el('span','bmc-bi'));h.appendChild(el('span','bmc-bt',T[st]));
  if(dt){var db=el('button','bmc-dbtn','جزئیات: '+txt('h3',dt).replace(/^.*·\s*/,''));db.type='button';db.onclick=function(e){e.stopPropagation();detail();};h.appendChild(db);}
  for(var j=1;j<=9;j++){var m=el('i',j===st?'on':'',fa(j));m.style.gridArea='abcdefghi'.charAt(j-1);mini.appendChild(m);}h.appendChild(mini);
  $$('.bmc-notes li',cell).forEach(function(l,j){var n=el('li',l.className,clean(l.textContent));n.style.setProperty('--d',j);n.style.setProperty('--r',[-1.6,1.2,-.6,1.8,-1.1][j%5]+'deg');ul.appendChild(n);});
  var say=el('p','bmc-say');say.appendChild(el('b','','روایت:'));say.appendChild(el('span','',SAY[st-1]||''));
  p.appendChild(h);p.appendChild(ul);
  if(dt){var box=one('ul',dt).cloneNode(true);box.className='bmc-dbox';p.appendChild(box);}
  p.appendChild(say);}
else if(st==='journey'){p=el('div','bmc-paper bmc-sect bmc-jour');p.appendChild(el('h2','','سفر مشتری: پنج وظیفهٔ کانال'));
  p.appendChild(el('p','bmc-lead','از جدول ۲۰؛ از اولین باری که مشتری اسم نت‌امداد را می‌شنود تا بعد از تمام شدن کار'));var ol=el('ol','bmc-steps');
  ['آگاهی','ارزیابی','خرید','تحویل','پس از فروش'].forEach(function(k,j){var row=$$('.bmc-d3 li').filter(function(l){return txt('b',l).replace(/[:：]\s*$/,'')===k;})[0];if(!row)return;
    var li=el('li'),u=el('ul'),rest=clean(row.textContent).slice(txt('b',row).length).replace(/^[:：\s]+/,'');li.style.setProperty('--d',j);
    li.appendChild(el('span','bmc-sn',fa(j+1)));li.appendChild(el('b','',k));rest.split(/[،؛]\s*/).forEach(function(x){if(clean(x))u.appendChild(el('li','',clean(x)));});li.appendChild(u);ol.appendChild(li);});
  p.appendChild(ol);}
else if(st==='strat'){p=el('div','bmc-paper bmc-sect bmc-stratp');copy('.bmc-strat',['h2','.bmc-lead','.bmc-goal','.bmc-views'],p);}
else if(st==='phases'){p=el('div','bmc-paper bmc-sect bmc-phasep');p.appendChild(el('h2','','فازهای اجرا: از کمینه محصول تا برگه‌های سبز'));copy('.bmc-strat',['.bmc-phases'],p);}
else if(st==='qa'){p=el('div','bmc-paper bmc-sect bmc-qap');p.appendChild(el('h2','','پرسش و پاسخ'));p.appendChild(el('p','bmc-lead','روی هر پرسش بزنید تا پاسخ آن دیده شود.'));qa(p);}
else if(st==='thanks'){p=el('div','bmc-paper bmc-end');p.appendChild(el('p','bmc-big','سپاس از توجه شما'));p.appendChild(el('p','bmc-l1','آمادهٔ پاسخ به پرسش‌ها هستم'));
  if(STEPS===SHORT)qa(p);else p.appendChild(qrBox('bmc-qrrow'));p.appendChild(el('p','bmc-by',SIGN));}
else{var sec=one('.bmc-'+st);p=el('div','bmc-paper bmc-sect bmc-x-'+st+' bmc-'+st);if(sec)Array.prototype.forEach.call(sec.children,function(n){p.appendChild(n.cloneNode(true));});}
sc.appendChild(p);sc.classList.add('bmc-s-'+(typeof st==='number'?'block':st));return sc;}

/* Centre and relative width of a node inside the slide area, used as the origin of the zoom between the canvas and a block. */
function at(n){var r=n.getBoundingClientRect(),h=S.host.getBoundingClientRect();return {x:r.left+r.width/2-h.left,y:r.top+r.height/2-h.top,s:Math.max(.12,Math.min(.6,r.width/h.width))};}
function zoom(sc,z,cls){sc.style.transformOrigin=Math.round(z.x)+'px '+Math.round(z.y)+'px';sc.style.setProperty('--zs',z.s.toFixed(3));sc.style.setProperty('--zb',Math.min(3.2,1/z.s).toFixed(3));sc.classList.add(cls);}
function detail(){if(!S||!S.sc)return;var p=S.sc.firstChild;if(!p.classList.contains('bmc-block'))return;var on=p.classList.toggle('bmc-showd'),b=one('.bmc-dbtn',p);if(b)b.setAttribute('aria-pressed',on?'true':'false');fit();}
function wide(){return W.innerWidth>720;}
/* Fit a slide (the current one unless another scene is given, as for the overview thumbnails): the whole canvas
   scales by width/height ratio, other slides shrink their type. */
function fit(x){var sc=x&&x.nodeType===1?x:S&&S.sc;if(!sc)return;var p=sc.firstChild,cs=W.getComputedStyle(sc),aw=sc.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=sc.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
if(p.classList.contains('bmc-whole')){var pz=one('.bmc-poster',p),cap=one('.bmc-cap',p);pz.style.setProperty('--pw','1000px');p.style.setProperty('--pw','1000px');
  var r=pz.offsetHeight/1000;pz.style.removeProperty('--pw');var room=ah-(cap?cap.offsetHeight+10:0),w=Math.floor(Math.max(260,Math.min(aw,wide()?room/r:aw)));p.style.setProperty('--pw',w+'px');return;}
p.style.fontSize='';if(!wide())return;var s=1,n=0,nb=one('.bmc-bnotes',p),dx=one('.bmc-dbox',p);
/* Layout boxes, not scrollHeight: the notes are still mid-animation (scaled and rotated) when this runs. */
function tall(e){if(!e||!e.offsetParent||!e.children.length)return 0;var t=1e9,b=-1e9;Array.prototype.forEach.call(e.children,function(c){t=Math.min(t,c.offsetTop);b=Math.max(b,c.offsetTop+c.offsetHeight);});return b-t>e.clientHeight+2;}
function over(){return p.scrollHeight>p.clientHeight+2||tall(nb)||tall(dx);}
while(over()&&s>.45&&n++<26){s-=.04;p.style.fontSize=s.toFixed(2)+'em';}}
function show(i){if(!S)return;i=Math.max(0,Math.min(STEPS.length-1,i));if(i===S.i)return;var old=S.sc,was=STEPS[S.i],back=S.i>=0&&i<S.i,sc=scene(STEPS[i]),z=S.zoom;S.zoom=null;
/* From the whole canvas to a block, the keyboard zooms into that block just as a click on it does. */
if(!z&&old&&was==='whole'&&typeof STEPS[i]==='number'&&wide()){var oc=one('.bmc-c'+STEPS[i],old);if(oc)z=at(oc);}
S.i=i;if(S.qo)qr();if(back)sc.classList.add('bmc-back');
if(old){if(back)old.classList.add('bmc-back');if(z&&typeof STEPS[i]==='number')zoom(old,z,'bmc-zo');old.classList.add('bmc-out');
  if(RM)old.parentNode.removeChild(old);else setTimeout(function(){if(old.parentNode)old.parentNode.removeChild(old);},480);}
S.host.appendChild(sc);S.sc=sc;
$$('button',S.dots).forEach(function(b,j){b.classList.toggle('on',j===i);if(j===i)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
S.cnt.textContent=fa(i+1)+' از '+fa(STEPS.length);S.pg.style.width=((i+1)/STEPS.length*100).toFixed(1)+'%';
S.cn.textContent=chapName(i);S.cn.hidden=!S.cn.textContent;S.nb.textContent=note(STEPS[i]);S.sr.textContent='اسلاید '+fa(i+1)+' از '+fa(STEPS.length)+': '+T[STEPS[i]];fit();
if(z&&typeof STEPS[i]==='number')zoom(sc,z,'bmc-zi');
else if(STEPS[i]==='whole'&&typeof was==='number'&&wide()){var cl=one('.bmc-c'+was,sc);if(cl)zoom(sc,at(cl),'bmc-zw');}
if(STEPS[i]==='why')count(sc);if(STEPS[i]==='thanks')confetti(sc);
inkDraw();sfx(STEPS[i]);auto();tick();pres();}
function size(){if(!S)return;S.el.style.setProperty('--bmc-ad',adH()+'px');var w=S.host.clientWidth,h=S.host.clientHeight;S.host.style.fontSize=(wide()?Math.max(10,Math.min(w/62,h/36)):14).toFixed(2)+'px';fit();inkSize();}
function full(){var p=null;try{if(D.fullscreenElement)p=D.exitFullscreen();else if(H.requestFullscreen)p=H.requestFullscreen();}catch(e){}if(p&&p.catch)p.catch(function(){});}
function clockText(){var t=Math.floor((Date.now()-S.t0)/1000);return fa(Math.floor(t/60)+':'+String(t%60).padStart(2,'0'));}
function press(n,on){var b=S&&S.B[n];if(b)b.setAttribute('aria-pressed',on?'true':'false');}
function notes(){if(!S)return;press('notes',S.el.classList.toggle('bmc-shown'));size();}
function laser(){if(!S)return;press('laser',S.el.classList.toggle('bmc-lz'));}
function black(){if(!S)return;S.el.classList.toggle('bmc-black');}
/* The clock turns amber in the full deck once the talk runs past the planned end of the current chapter. */
function tick(){if(!S)return;var t=Math.floor((Date.now()-S.t0)/1000),d=due(S.i),c=S.clock;c.textContent=clockText();
  c.className='bmc-clock'+(STEPS===SHORT?(t>=90?' bmc-late':t>=75?' bmc-near':''):d&&t>d*60?' bmc-near':'');
  if(S.pv&&S.pw&&!S.pw.closed){S.pv.ck.textContent=c.textContent;plan();}}
function plan(){var v=S.pv,d=due(S.i),t=(Date.now()-S.t0)/1000;if(!d){v.pl.textContent=STEPS===SHORT?'هدف: یک‌ونیم دقیقه':'';v.pl.className='';return;}
  v.pl.textContent='برنامه: این بخش تا دقیقهٔ '+fa(d)+(t>d*60?' (عقب‌تر از برنامه)':'');v.pl.className=t>d*60?'late':'';}

/* Presenter view: a second window with the speaker notes, the next slide and the clock, for a laptop
   connected to a projector. It is opened by this page, so it shares its origin and is driven directly. */
function presenter(){if(!S)return;var pw=S.pw;if(pw&&!pw.closed){pw.focus();return;}
  try{pw=W.open('','bmcPresenter','width=980,height=680');}catch(e){pw=null;}
  if(!pw){S.nb.textContent='مرورگر پنجرهٔ جدید را باز نکرد. اجازهٔ باز شدن پنجره (pop-up) را برای این وبلاگ بدهید، یا متن گوینده را با کلید N همین‌جا ببینید.';S.el.classList.add('bmc-shown');press('notes',true);size();return;}
  var d=pw.document;d.open();d.write('<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>نمای گوینده · '+NAME+'</title></head><body></body></html>');d.close();
  var st=d.createElement('style');st.textContent='body{margin:0;font-family:Vazirmatn,BmcVazir,Tahoma,sans-serif;background:#13221C;color:#EAF4EE;display:flex;flex-direction:column;height:100vh}'+
    'header{display:flex;gap:16px;align-items:center;padding:12px 18px;background:#1F5A47;font-size:18px}header b{font-size:30px;font-variant-numeric:tabular-nums;color:#F7EC4F}header span{margin-inline-start:auto}'+
    'header em{font-style:normal;font-size:16px;opacity:.9}header em.late{opacity:1;background:#B7791F;color:#fff;border-radius:999px;padding:2px 12px}'+
    'main{flex:1;overflow:auto;padding:18px 22px}h1{margin:0 0 10px;font-size:26px;color:#FFD7A8}.n{white-space:pre-wrap;font-size:24px;line-height:1.9}'+
    'footer{display:flex;gap:10px;align-items:center;padding:12px 18px;background:#0D1713;font-size:17px}footer i{font-style:normal;opacity:.75;margin-inline-end:auto}'+
    'button{font:inherit;font-weight:800;border:0;border-radius:999px;padding:8px 22px;cursor:pointer;background:#F7EC4F;color:#15191C}button.g{background:#2C3934;color:#fff}';
  d.head.appendChild(st);
  var hd=d.createElement('header'),ck=d.createElement('b'),ct=d.createElement('span'),mn=d.createElement('main'),h1=d.createElement('h1'),nt=d.createElement('div'),ft=d.createElement('footer'),nx=d.createElement('i');
  nt.className='n';ck.textContent=clockText();hd.appendChild(ck);hd.appendChild(D.createTextNode(''));var rs=d.createElement('button');rs.className='g';rs.textContent='صفر کردن زمان';rs.onclick=function(){if(S){S.t0=Date.now();}};hd.appendChild(rs);var pl=d.createElement('em');hd.appendChild(pl);hd.appendChild(ct);
  mn.appendChild(h1);mn.appendChild(nt);ft.appendChild(nx);
  var pv=d.createElement('button');pv.className='g';pv.textContent='قبلی';pv.onclick=function(){if(S)show(S.i-1);};var nv=d.createElement('button');nv.textContent='بعدی';nv.onclick=function(){if(S)show(S.i+1);};
  ft.appendChild(pv);ft.appendChild(nv);d.body.appendChild(hd);d.body.appendChild(mn);d.body.appendChild(ft);
  pw.addEventListener('keydown',function(e){var c=e.code;if(!S)return;if(c==='ArrowRight'||c==='PageDown'||c==='Space'){e.preventDefault();show(S.i+1);}else if(c==='ArrowLeft'||c==='PageUp'){e.preventDefault();show(S.i-1);}
    else if(c==='Home'){e.preventDefault();show(0);}else if(c==='End'){e.preventDefault();show(STEPS.length-1);}else if(c==='KeyB'||c==='Period'){e.preventDefault();black();}});
  S.pw=pw;S.pv={ck:ck,ct:ct,h1:h1,nt:nt,nx:nx,pl:pl};pres();}
function pres(){if(!S||!S.pw||S.pw.closed||!S.pv)return;var v=S.pv,st=STEPS[S.i],nx=STEPS[S.i+1];
  v.ck.textContent=clockText();plan();v.ct.textContent='اسلاید '+fa(S.i+1)+' از '+fa(STEPS.length);v.h1.textContent=(typeof st==='number'?fa(st)+' · ':'')+T[st];v.nt.textContent=note(st);
  v.nx.textContent=nx!=null?'بعدی: '+(typeof nx==='number'?fa(nx)+' · ':'')+T[nx]:'آخرین اسلاید';}

/* Keys. The listener runs first (window, capture), so keys handled here never reach the blog's own shortcuts;
   Enter and Space on a focused control are left to the control; with a modifier key the browser keeps its default. */
function key(e){if(!S)return;var c=e.code||'',k=e.keyCode,t=e.target,d=0,inS=!!(t&&t.nodeType===1&&S.el.contains(t));
if(e.ctrlKey||e.metaKey||e.altKey){e.stopPropagation();return;}
if(c==='Tab'||k===9){trap(e);return;}
if(inS&&t!==S.el&&t.closest&&t.closest('button,a[href],[role="button"]')&&(c==='Space'||c==='Enter'||c==='NumpadEnter'||k===13||k===32))return;
if(S.qo&&c!=='KeyQ'&&c!=='Escape'&&k!==27)qr();
if(c==='Escape'||k===27)esc();
else if(S.hp)help();
else if(S.ov){if(/^Arrow/.test(c))ovMove(c);else if(c==='KeyO')overview();else if(c==='Enter'||c==='NumpadEnter'||c==='Space'){var f=one('.bmc-ovc.on',S.ov);if(f)f.click();}}
else{if(c==='ArrowRight'||c==='ArrowDown'||c==='Space'||c==='Enter'||c==='NumpadEnter'||c==='PageDown'||k===39||k===40||k===32||k===13||k===34)d=1;
  else if(c==='ArrowLeft'||c==='ArrowUp'||c==='PageUp'||c==='Backspace'||k===37||k===38||k===33||k===8)d=-1;
  if(d)show(S.i+d);else if(c==='KeyF')full();else if(c==='KeyN')notes();else if(c==='KeyP')presenter();else if(c==='KeyD')detail();
  else if(c==='KeyL')laser();else if(c==='KeyB'||c==='Period'||k===190)black();
  else if(c==='KeyR'){S.t0=Date.now();tick();}else if(c==='Home')show(0);else if(c==='End')show(STEPS.length-1);
  else if(c==='KeyO')overview();else if(c==='KeyW')ink();else if(c==='KeyC')inkClear();else if(c==='KeyS')spot();else if(c==='KeyQ')qr();else if(c==='KeyA')auto(1);
  else if(c==='KeyH'||c==='Slash'||k===191)help();else if(c==='KeyM')musToggle();
  else if(/^(Digit|Numpad)[0-9]$/.test(c)){var n=+c.slice(-1);show(STEPS.indexOf(n||'whole'));}
  else{if(!inS)e.stopPropagation();return;}}
e.preventDefault();e.stopPropagation();}
/* Esc closes the last thing opened first, and the presentation itself last. */
function esc(){if(S.hp)help();else if(S.qo)qr();else if(S.ov)overview();else if(S.el.classList.contains('bmc-ink'))ink();else if(S.el.classList.contains('bmc-sp'))spot();
  else if(S.el.classList.contains('bmc-lz'))laser();else if(S.el.classList.contains('bmc-black'))black();else close();}
/* Tab stays inside the presentation, or inside the open overlay. */
function trap(e){var box=S.hp||S.ov||S.el,f=$$('button,[tabindex="0"],a[href]',box).filter(function(x){return !x.disabled&&!x.hidden&&x.getClientRects().length&&W.getComputedStyle(x).visibility!=='hidden'&&!x.closest('[inert],[aria-hidden="true"]');});
  e.stopPropagation();if(!f.length){e.preventDefault();return;}var a=D.activeElement,i=f.indexOf(a);
  if(e.shiftKey){if(i<=0){e.preventDefault();f[f.length-1].focus();}}else if(i<0||i===f.length-1){e.preventDefault();f[0].focus();}}
function refocus(){if(S)try{S.el.focus({preventScroll:true});}catch(e){S.el.focus();}}
function emit(on){try{D.dispatchEvent(new CustomEvent('bmc:present',{detail:{on:on}}));}catch(e){}}

/* Music: the button drives the blog's own player (window.AN.x.music) and is hidden where there is none. */
function mus(){var a=W.AN,m=a&&a.x&&a.x.music;return m&&typeof m.toggle==='function'?m:null;}
function musSync(){if(!S||!S.B.music)return;var b=S.B.music,m=mus(),on=false,s=null;b.hidden=!m;if(!m)return;
  try{on=typeof m.playing==='function'?!!m.playing():!!m.playing;s=typeof m.station==='function'?m.station():null;}catch(e){}
  press('music',on);b.title='موسیقی وبلاگ (M)'+(s&&s.name?' · '+s.name:'');if(s&&+s.bpm>0)S.el.style.setProperty('--beat',(60/+s.bpm).toFixed(3)+'s');S.el.classList.toggle('bmc-mon',on);}
function musToggle(){var m=mus();if(!m)return;try{m.toggle();}catch(e){}setTimeout(musSync,80);}

/* Sound effects, off until the button turns them on (remembered on this browser): a soft swish between slides,
   a pop for each note that lands on a block, a short chime on the last slide. Made with Web Audio, no files. */
var SFX=false,AC=null;try{SFX=W.localStorage.getItem('bmc-sfx')==='1';}catch(e){}
function ac(){if(!AC){var C=W.AudioContext||W.webkitAudioContext;if(!C)return null;try{AC=new C();}catch(e){return null;}}if(AC.state==='suspended'&&AC.resume){var r=AC.resume();if(r&&r.catch)r.catch(function(){});}return AC;}
function tone(f,t0,dur,vol,type,f2){var a=ac();if(!a)return;var o=a.createOscillator(),g=a.createGain(),t=a.currentTime+t0;o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.03);}
function swish(){var a=ac();if(!a)return;var n=Math.floor(a.sampleRate*.24),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0),i;for(i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  var s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),t=a.currentTime;s.buffer=b;f.type='bandpass';f.Q.value=1.4;f.frequency.setValueAtTime(2400,t);f.frequency.exponentialRampToValueAtTime(500,t+.22);
  g.gain.setValueAtTime(.09,t);g.gain.exponentialRampToValueAtTime(.0001,t+.24);s.connect(f);f.connect(g);g.connect(a.destination);s.start(t);}
function sfx(st){if(!SFX||!S)return;swish();if(typeof st==='number'){var n=Math.min(8,$$('.bmc-bnotes li',S.sc).length);for(var j=0;j<n;j++)tone(620+60*j,.45+j*.11,.09,.05,'triangle',380);}
  else if(st==='thanks')[1047,1319,1568,2093].forEach(function(f,j){tone(f,.15+j*.12,.5,.06,'sine');});}
function sfxToggle(){SFX=!SFX;try{W.localStorage.setItem('bmc-sfx',SFX?'1':'0');}catch(e){}press('sfx',SFX);if(SFX)tone(880,0,.12,.05,'sine');}

/* Depth: the title and closing papers tilt a little towards the mouse and their notes drift the other way. */
function par(e){if(RM||TOUCH||!S)return;S.mx=e.clientX/W.innerWidth*2-1;S.my=e.clientY/W.innerHeight*2-1;if(S.pr)return;
  S.pr=W.requestAnimationFrame(function(){if(!S)return;S.pr=0;S.el.style.setProperty('--mx',S.mx.toFixed(3));S.el.style.setProperty('--my',S.my.toFixed(3));});}
/* Confetti in the colours of the notes, shot from both lower corners of the closing slide. */
function confetti(sc){if(RM)return;var cv=el('canvas','bmc-cf'),x=cv.getContext&&cv.getContext('2d');if(!x)return;sc.appendChild(cv);
  var w=cv.width=Math.max(1,sc.clientWidth),h=cv.height=Math.max(1,sc.clientHeight),C=['#FFA24C','#FF7DB5','#F7EC4F','#97DE62','#1F4FD1','#C81E2B'],P=[],t0=0,i,g=h*.0005;
  for(i=0;i<120;i++){var L=i%2,v=h*(.017+Math.random()*.015),a=.2+Math.random()*.55;
    P.push({x:L?w*.03:w*.97,y:h*1.02,vx:(L?1:-1)*Math.sin(a)*v,vy:-Math.cos(a)*v,s:5+Math.random()*7,c:C[i%6],r:Math.random()*6.3,vr:(Math.random()-.5)*.35,f:Math.random()*6.3});}
  function fr(t){if(!D.body.contains(cv))return;if(!t0)t0=t;var e=t-t0;x.clearRect(0,0,w,h);x.globalAlpha=e>2600?Math.max(0,1-(e-2600)/900):1;
    P.forEach(function(p){p.vx*=.985;p.vy=Math.min(p.vy*.985+g,h*.0045);p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;p.f+=.14;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.scale(1,Math.cos(p.f));x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s*.3,p.s,p.s*.6);x.restore();});
    if(e<3500)W.requestAnimationFrame(fr);else if(cv.parentNode)cv.parentNode.removeChild(cv);}
  W.requestAnimationFrame(fr);}

/* Overview: every slide as a live thumbnail built from the same page markup; a click or Enter goes there. */
function overview(){if(!S)return;if(S.ov){var o=S.ov;S.ov=null;if(o.parentNode)o.parentNode.removeChild(o);press('grid',false);refocus();return;}
  if(S.hp)help();if(S.qo)qr();
  var ov=el('div','bmc-ov'),hd=el('p','bmc-ovh','همهٔ اسلایدها · روی هر اسلاید بزنید یا با کلیدهای جهت و Enter بروید · خروج: Esc'),g=el('div','bmc-ovg'),hw=S.host.clientWidth,hh=S.host.clientHeight,fs=S.host.style.fontSize,cards=[];
  ov.setAttribute('role','dialog');ov.setAttribute('aria-label','همهٔ اسلایدها');
  STEPS.forEach(function(s,j){var b=el('button','bmc-ovc'+(j===S.i?' on':'')),f=el('span','bmc-ovf'),inn=el('span','bmc-ovi'),sc=scene(s);b.type='button';
    b.setAttribute('aria-label','اسلاید '+fa(j+1)+': '+T[s]);if(j===S.i)b.setAttribute('aria-current','step');
    inn.setAttribute('aria-hidden','true');inn.setAttribute('inert','');inn.style.width=hw+'px';inn.style.height=hh+'px';inn.style.fontSize=fs;sc.classList.add('bmc-still');inn.appendChild(sc);f.appendChild(inn);
    b.appendChild(f);b.appendChild(el('span','bmc-ovt',fa(j+1)+' · '+T[s]));b.onclick=function(e){e.stopPropagation();overview();show(j);};g.appendChild(b);cards.push([f,inn,sc]);});
  ov.appendChild(hd);ov.appendChild(g);ov.onclick=function(e){e.stopPropagation();if(e.target===ov||e.target===g||e.target===hd)overview();};
  S.el.appendChild(ov);S.ov=ov;press('grid',true);
  var k=cards.length?cards[0][0].clientWidth/hw:1;cards.forEach(function(c){c[1].style.transform='scale('+k.toFixed(4)+')';c[0].style.height=Math.round(hh*k)+'px';});
  cards.forEach(function(c){fit(c[2]);});
  var cur=one('.bmc-ovc.on',ov);if(cur){try{cur.focus({preventScroll:true});}catch(e){cur.focus();}cur.scrollIntoView({block:'nearest'});}}
function ovMove(c){var cs=$$('.bmc-ovc',S.ov),i=cs.indexOf(D.activeElement),cols=1,n;if(i<0)i=Math.max(0,cs.indexOf(one('.bmc-ovc.on',S.ov)));
  while(cols<cs.length&&cs[cols].offsetTop===cs[0].offsetTop)cols++;
  n=c==='ArrowLeft'?i+1:c==='ArrowRight'?i-1:c==='ArrowDown'?i+cols:i-cols;n=Math.max(0,Math.min(cs.length-1,n));try{cs[n].focus({preventScroll:true});}catch(e){cs[n].focus();}cs[n].scrollIntoView({block:'nearest'});}

/* Key help, opened with H or ? */
function help(){if(!S)return;if(S.hp){var h=S.hp;S.hp=null;if(h.parentNode)h.parentNode.removeChild(h);press('help',false);refocus();return;}
  if(S.qo)qr();
  var o=el('div','bmc-help'),c=el('div','bmc-hpc'),dl=el('dl'),x=btn('بستن','bmc-hpx',function(e){e.stopPropagation();help();});o.setAttribute('role','dialog');o.setAttribute('aria-label','راهنمای کلیدهای ارائه');
  c.appendChild(el('h2','','راهنمای کلیدهای ارائه'));
  [['→  فاصله  کلیک','اسلاید بعدی'],['←','اسلاید قبلی'],['۱ … ۹  ۰','خانهٔ ۱ تا ۹ بوم؛ ۰ بوم کامل'],['Home  End','اولین و آخرین اسلاید'],['O','همهٔ اسلایدها'],['W  C','قلم روی اسلاید و پاک کردن آن'],
   ['L','نشانگر لیزری'],['S','نورافکن؛ با چرخ ماوس بزرگ و کوچک می‌شود'],['Q','کد QR برای باز کردن بوم روی گوشی'],['A','پخش خودکار اسلایدها'],['D','جدول جزئیات خانه'],['N','متن گوینده'],
   ['P','نمای گوینده در پنجرهٔ جدا'],['B','صفحهٔ سیاه'],['F','تمام‌صفحه'],mus()?['M','پخش و توقف موسیقی وبلاگ']:null,['R','صفر کردن زمان'],['Esc','بستن ابزار باز، یا خروج از ارائه']].forEach(function(r){if(!r)return;
    var dt=el('dt');r[0].split(/\s{2,}/).forEach(function(q){dt.appendChild(el('kbd','',q));});dl.appendChild(dt);dl.appendChild(el('dd','',r[1]));});
  c.appendChild(dl);c.appendChild(x);o.appendChild(c);o.onclick=function(e){e.stopPropagation();if(e.target===o)help();};S.el.appendChild(o);S.hp=o;press('help',true);try{x.focus({preventScroll:true});}catch(e){x.focus();}}
/* QR code of the canvas page, big enough to scan from the back of the class. */
function qrBox(cls){var r=el('div',cls),q=el('i','bmc-qr'),t=el('div');q.setAttribute('role','img');q.setAttribute('aria-label','کد QR نشانی '+PAGE);
  t.appendChild(el('b','','اسکن کنید تا بوم روی گوشی‌تان باز شود'));t.appendChild(el('span','bmc-url',PAGE));r.appendChild(q);r.appendChild(t);return r;}
function qr(){if(!S)return;if(S.qo){var q=S.qo;S.qo=null;if(q.parentNode)q.parentNode.removeChild(q);press('qr',false);return;}
  var o=el('div','bmc-qrov');o.setAttribute('role','dialog');o.setAttribute('aria-label','کد QR بوم');o.appendChild(qrBox('bmc-qrc'));o.onclick=function(e){e.stopPropagation();qr();};S.el.appendChild(o);S.qo=o;press('qr',true);}

/* Pen: strokes are kept per slide in coordinates relative to the slide area, so they survive a resize. */
var PEN=['#E0262F','#1F4FD1','#0D7A63','#FFE600'];
function ink(){if(!S)return;var on=S.el.classList.toggle('bmc-ink');if(on&&S.el.classList.contains('bmc-sp'))spot();press('pen',on);if(on)inkSize();}
function inkSize(){if(!S||!S.cv)return;var r=S.host.getBoundingClientRect(),d=W.devicePixelRatio||1,cv=S.cv,w=Math.round(r.width*d),h=Math.round(r.height*d);
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}S.cw=r.width;S.ch=r.height;S.dpr=d;inkDraw();}
function inkDraw(){if(!S||!S.cv)return;var x=S.cv.getContext('2d');if(!x)return;var d=S.dpr||1,w=S.cw||1,h=S.ch||1,L=S.ink[S.i]||[];x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,S.cv.width,S.cv.height);
  x.setTransform(d,0,0,d,0,0);x.lineCap='round';x.lineJoin='round';
  L.forEach(function(s){var p=s.p,i;if(!p.length)return;x.globalAlpha=s.hl?.4:1;x.strokeStyle=s.c;x.lineWidth=Math.max(2,s.w*w)*(s.hl?4:1);x.beginPath();x.moveTo(p[0][0]*w,p[0][1]*h);
    if(p.length===1)x.lineTo(p[0][0]*w+.01,p[0][1]*h);for(i=1;i<p.length;i++)x.lineTo(p[i][0]*w,p[i][1]*h);x.stroke();});x.globalAlpha=1;}
function inkPt(e){var r=S.cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];}
function inkDown(e){if(!S||!S.el.classList.contains('bmc-ink'))return;e.preventDefault();e.stopPropagation();try{S.cv.setPointerCapture(e.pointerId);}catch(x){}
  var c=S.pc|0,s={c:PEN[c],hl:c===3,w:.0035,p:[inkPt(e)]};(S.ink[S.i]=S.ink[S.i]||[]).push(s);S.cur=s;inkDraw();}
function inkMove(e){if(!S||!S.cur)return;e.preventDefault();S.cur.p.push(inkPt(e));if(!S.raf)S.raf=W.requestAnimationFrame(function(){if(!S)return;S.raf=0;inkDraw();});}
function inkUp(){if(S)S.cur=null;}
function inkClear(){if(!S)return;S.ink[S.i]=[];inkDraw();}
/* Spotlight: everything but a circle around the mouse goes dark; the wheel changes its size. */
function spot(){if(!S)return;var on=S.el.classList.toggle('bmc-sp');if(on&&S.el.classList.contains('bmc-ink'))ink();press('spot',on);
  if(on&&S.sx==null){var r=S.host.getBoundingClientRect();spotAt(r.left+r.width/2,r.top+r.height/2);}}
function spotAt(x,y){if(!S)return;var r=S.host.getBoundingClientRect();S.sx=x;S.sy=y;S.sp.style.setProperty('--sx',Math.round(x-r.left)+'px');S.sp.style.setProperty('--sy',Math.round(y-r.top)+'px');S.sp.style.setProperty('--sr',S.rad+'px');}
/* Autoplay: each slide stays long enough to read it (7 to 30 s by the amount of text); it waits while the
   pen, the overview or the key help is open, and starts again from the first slide after the last. */
function dur(){var t=S&&S.sc?clean(S.sc.innerText||S.sc.textContent).length:0;return Math.round(Math.max(7,Math.min(30,t/16))*1000);}
function auto(tog){if(!S)return;if(tog){S.auto=!S.auto;press('auto',S.auto);S.el.classList.toggle('bmc-apon',S.auto);}clearTimeout(S.ap);var b=S.apb;b.style.animation='none';
  if(!S.auto)return;var ms=dur();void b.offsetWidth;b.style.animation='bmcAp '+ms+'ms linear forwards';
  S.ap=setTimeout(function step(){if(!S||!S.auto)return;if(S.ov||S.hp||S.el.classList.contains('bmc-ink')){S.ap=setTimeout(step,1000);return;}show(S.i>=STEPS.length-1?0:S.i+1);},ms);}

function open(i,deck){deck=deck||FULL;if(S){if(deck!==STEPS)close();else{show(i);return;}}STEPS=deck;var back=D.activeElement;
var st=el('div','bmc bmc-stage'),top=el('div','bmc-top'),dots=el('div','bmc-dots'),tools=el('div','bmc-tools'),host=el('div','bmc-host'),cnt=el('span','bmc-cnt'),br=el('div','bmc-brand'),nb=el('div','bmc-notebox'),
  hint=el('div','bmc-hint',TOUCH?'بعدی: یک ضربه روی صفحه  ·  جابه‌جایی: کشیدن به چپ یا راست  ·  خروج: «بستن ✕»':'بعدی: → یا فاصله یا کلیک  ·  قبلی: ←  ·  همهٔ اسلایدها: O  ·  قلم: W  ·  راهنمای همهٔ کلیدها: H  ·  خروج: Esc'),
  cn=el('span','bmc-chapn'),lz=el('i','bmc-laser'),cv=el('canvas','bmc-cv'),sp=el('i','bmc-spot'),sr=el('div','bmc-sr'),apb=el('i','bmc-apb'),pal=el('div','bmc-pal'),B={};
st.setAttribute('dir','rtl');st.setAttribute('lang','fa');st.setAttribute('role','dialog');st.setAttribute('aria-modal','true');st.setAttribute('aria-label','ارائهٔ بوم '+NAME);st.tabIndex=-1;
sr.setAttribute('role','status');sr.setAttribute('aria-live','polite');cv.setAttribute('aria-hidden','true');
br.appendChild(el('b','',NAME));br.appendChild(D.createTextNode(deck===SHORT?' · ارائهٔ کوتاه':' · ارائهٔ کلاس'));top.appendChild(br);cn.hidden=true;top.appendChild(cn);
STEPS.forEach(function(s,j){var b=el('button',typeof s==='number'?'bmc-dsq':'');b.type='button';b.title=fa(j+1)+' · '+T[s];b.setAttribute('aria-label','اسلاید '+fa(j+1)+': '+T[s]);b.onclick=function(e){e.stopPropagation();show(j);};dots.appendChild(b);});top.appendChild(dots);
var clock=el('span','bmc-clock','۰:۰۰');clock.title=deck===SHORT?'زمان ارائه؛ هدف: یک‌ونیم دقیقه':'زمان ارائه (R: صفر کردن)';tools.appendChild(clock);tools.appendChild(cnt);
tools.appendChild(btn('قبلی','bmc-nav',function(e){e.stopPropagation();show(S.i-1);}));tools.appendChild(btn('بعدی','bmc-nav',function(e){e.stopPropagation();show(S.i+1);}));
[['grid','همهٔ اسلایدها (O)',overview],['pen','قلم روی اسلاید (W)',ink,'bmc-x'],['laser','لیزر (L)',laser,'bmc-x bmc-lzb'],['spot','نورافکن (S)',spot,'bmc-x'],['qr','کد QR برای باز کردن بوم روی گوشی (Q)',qr,'bmc-x'],
 ['auto','پخش خودکار (A)',function(){auto(1);}],['music','موسیقی وبلاگ (M)',musToggle,'bmc-mus'],['sfx','صدای جلوه‌ها',sfxToggle,'bmc-x'],['notes','متن گوینده (N)',notes,'bmc-x'],
 ['pres','نمای گوینده (P)',presenter,'bmc-x'],['full','تمام‌صفحه (F)',full,'bmc-x'],['help','راهنمای کلیدها (H)',help,'bmc-x']].forEach(function(p){var b=ibtn(p[0],p[1],p[2],p[3]);B[p[0]]=b;tools.appendChild(b);});
['grid','pen','laser','spot','qr','auto','music','sfx','notes','help'].forEach(function(k){B[k].setAttribute('aria-pressed','false');});
var eq=el('i','bmc-eq');eq.setAttribute('aria-hidden','true');for(var q=0;q<3;q++)eq.appendChild(el('i'));B.music.appendChild(eq);B.music.hidden=true;
tools.appendChild(btn('بستن ✕','bmc-close',function(e){e.stopPropagation();close();}));top.appendChild(tools);
pal.setAttribute('role','toolbar');pal.setAttribute('aria-label','رنگ قلم');
[['#E0262F','قرمز'],['#1F4FD1','آبی'],['#0D7A63','سبز'],['#FFE600','ماژیک زرد']].forEach(function(p,j){var b=el('button','bmc-sw'+(j?'':' on'));b.type='button';b.style.setProperty('--c',p[0]);b.title=p[1];b.setAttribute('aria-label',p[1]);b.setAttribute('aria-pressed',j?'false':'true');
  b.onclick=function(e){e.stopPropagation();S.pc=j;$$('.bmc-sw',pal).forEach(function(x,k){x.classList.toggle('on',k===j);x.setAttribute('aria-pressed',k===j?'true':'false');});};pal.appendChild(b);});
pal.appendChild(btn('پاک کردن (C)','bmc-pc',function(e){e.stopPropagation();inkClear();}));pal.appendChild(btn('پایان قلم','bmc-pe',function(e){e.stopPropagation();ink();}));
var pg=el('i','bmc-pg');top.appendChild(pg);top.appendChild(apb);host.appendChild(cv);host.appendChild(sp);
st.appendChild(top);st.appendChild(host);st.appendChild(pal);st.appendChild(nb);st.appendChild(hint);st.appendChild(lz);st.appendChild(sr);D.body.appendChild(st);H.classList.add('bmc-lock');
S={el:st,host:host,dots:dots,cnt:cnt,cn:cn,pg:pg,nb:nb,clock:clock,i:-1,sc:null,sw:0,t0:Date.now(),pw:null,pv:null,zoom:null,back:back,B:B,cv:cv,sp:sp,sr:sr,apb:apb,
  ink:{},pc:0,cur:null,raf:0,rad:Math.round(Math.min(W.innerWidth,W.innerHeight)*.22),sx:null,sy:null,ov:null,hp:null,qo:null,auto:false,ap:0,mx:0,my:0,pr:0};
S.tick=setInterval(tick,1000);
st.addEventListener('mousemove',function(e){if(!S)return;if(S.el.classList.contains('bmc-lz'))lz.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';if(S.el.classList.contains('bmc-sp'))spotAt(e.clientX,e.clientY);par(e);});
st.addEventListener('wheel',function(e){if(!S||S.ov||S.hp||!S.el.classList.contains('bmc-sp'))return;e.preventDefault();S.rad=Math.round(Math.max(60,Math.min(460,S.rad*(e.deltaY>0?.9:1.1))));spotAt(e.clientX,e.clientY);},{passive:false});
/* Keys from inside the presentation never reach the blog's shortcuts behind it. */
st.addEventListener('keydown',function(e){e.stopPropagation();});
/* After a mouse click on a control, focus goes back to the slide, so Space and Enter keep moving the deck. */
st.addEventListener('click',function(e){var b=e.detail&&e.target.closest&&e.target.closest('button,[role="button"]');if(b)setTimeout(function(){if(S&&!S.ov&&!S.hp){var a=D.activeElement;if(!a||a===D.body||S.el.contains(a))refocus();}},0);},true);
st.onclick=function(e){if(!S)return;if(S.el.classList.contains('bmc-black')){black();return;}if(S.el.classList.contains('bmc-ink')||S.ov||S.hp||S.qo)return;
  if(Date.now()-S.sw<600||(e.target.closest&&e.target.closest('.bmc-top,.bmc-notebox,.bmc-dbox,.bmc-pal,button,[role="button"]')))return;show(S.i+1);};
/* The deck reads right to left, so the next slide comes in from the left: a drag to the right moves forward. */
var tx=0,ty=0;st.addEventListener('touchstart',function(e){var t=e.changedTouches[0];tx=t.clientX;ty=t.clientY;},{passive:true});
st.addEventListener('touchend',function(e){if(!S||S.ov||S.hp||S.el.classList.contains('bmc-ink'))return;var t=e.changedTouches[0],dx=t.clientX-tx,dy=t.clientY-ty;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.5){S.sw=Date.now();show(S.i+(dx>0?1:-1));}else if(Math.abs(dy)>12)S.sw=Date.now();},{passive:true});
cv.addEventListener('pointerdown',inkDown);cv.addEventListener('pointermove',inkMove);cv.addEventListener('pointerup',inkUp);cv.addEventListener('pointercancel',inkUp);
W.addEventListener('keydown',key,true);W.addEventListener('resize',size);W.addEventListener('an-music',musSync);
press('sfx',SFX);musSync();size();show(i||0);refocus();setTimeout(function(){hint.style.opacity=0;},8000);S.iv=setInterval(size,2500);
if(D.fonts&&D.fonts.ready)D.fonts.ready.then(function(){fit();});emit(true);}
function close(){if(!S)return;var s=S;W.removeEventListener('keydown',key,true);W.removeEventListener('resize',size);W.removeEventListener('an-music',musSync);clearInterval(s.iv);clearInterval(s.tick);clearTimeout(s.ap);
  try{if(s.pw&&!s.pw.closed)s.pw.close();}catch(e){}if(s.el.parentNode)s.el.parentNode.removeChild(s.el);S=null;H.classList.remove('bmc-lock');if(D.fullscreenElement)full();
  var b=s.back;if(!b||!b.focus||b===D.body||b===H||!D.body.contains(b))b=go;try{b.focus({preventScroll:true});}catch(e){}emit(false);}
W.bmcOpen=function(i,short){open(i||0,short?SHORT:FULL);};
}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',start);else start();
})(window,document);
