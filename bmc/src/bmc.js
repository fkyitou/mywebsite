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
bar.appendChild(el('p','',TOUCH?'برای ارائهٔ هر خانه، روی همان خانهٔ بوم بزنید.':'روی هر خانهٔ بوم کلیک کنید تا ارائه از همان‌جا شروع شود. در ارائه: → بعدی، F تمام‌صفحه، N متن گوینده، P نمای گوینده.'));
bar.appendChild(btn('چاپ بوم','bmc-print',function(){W.print();}));bar.appendChild(btn('چاپ گزارش','bmc-print',report));root.insertBefore(bar,poster);
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
  if(STEPS===SHORT)qa(p);p.appendChild(el('p','bmc-by',SIGN));}
else{var sec=one('.bmc-'+st);p=el('div','bmc-paper bmc-sect bmc-x-'+st+' bmc-'+st);if(sec)Array.prototype.forEach.call(sec.children,function(n){p.appendChild(n.cloneNode(true));});}
sc.appendChild(p);return sc;}

/* Centre and relative width of a node inside the slide area, used as the origin of the zoom between the canvas and a block. */
function at(n){var r=n.getBoundingClientRect(),h=S.host.getBoundingClientRect();return {x:r.left+r.width/2-h.left,y:r.top+r.height/2-h.top,s:Math.max(.12,Math.min(.6,r.width/h.width))};}
function zoom(sc,z,cls){sc.style.transformOrigin=Math.round(z.x)+'px '+Math.round(z.y)+'px';sc.style.setProperty('--zs',z.s.toFixed(3));sc.style.setProperty('--zb',Math.min(3.2,1/z.s).toFixed(3));sc.classList.add(cls);}
function detail(){if(!S||!S.sc)return;var p=S.sc.firstChild;if(!p.classList.contains('bmc-block'))return;var on=p.classList.toggle('bmc-showd'),b=one('.bmc-dbtn',p);if(b)b.setAttribute('aria-pressed',on?'true':'false');fit();}
function wide(){return W.innerWidth>720;}
/* Fit the current slide: the whole canvas scales by width/height ratio, other slides shrink their type. */
function fit(){if(!S||!S.sc)return;var sc=S.sc,p=sc.firstChild,cs=W.getComputedStyle(sc),aw=sc.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=sc.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
if(p.classList.contains('bmc-whole')){var pz=one('.bmc-poster',p),cap=one('.bmc-cap',p);pz.style.setProperty('--pw','1000px');p.style.setProperty('--pw','1000px');
  var r=pz.offsetHeight/1000;pz.style.removeProperty('--pw');var room=ah-(cap?cap.offsetHeight+10:0),w=Math.floor(Math.max(260,Math.min(aw,wide()?room/r:aw)));p.style.setProperty('--pw',w+'px');return;}
p.style.fontSize='';if(!wide())return;var s=1,n=0,nb=one('.bmc-bnotes',p),dx=one('.bmc-dbox',p);
/* Layout boxes, not scrollHeight: the notes are still mid-animation (scaled and rotated) when this runs. */
function tall(e){if(!e||!e.offsetParent||!e.children.length)return 0;var t=1e9,b=-1e9;Array.prototype.forEach.call(e.children,function(c){t=Math.min(t,c.offsetTop);b=Math.max(b,c.offsetTop+c.offsetHeight);});return b-t>e.clientHeight+2;}
function over(){return p.scrollHeight>p.clientHeight+2||tall(nb)||tall(dx);}
while(over()&&s>.45&&n++<26){s-=.04;p.style.fontSize=s.toFixed(2)+'em';}}
function show(i){if(!S)return;i=Math.max(0,Math.min(STEPS.length-1,i));if(i===S.i)return;var old=S.sc,was=STEPS[S.i],sc=scene(STEPS[i]),z=S.zoom;S.zoom=null;S.i=i;
if(old){if(z&&typeof STEPS[i]==='number')zoom(old,z,'bmc-zo');old.classList.add('bmc-out');setTimeout(function(){if(old.parentNode)old.parentNode.removeChild(old);},460);}
S.host.appendChild(sc);S.sc=sc;$$('button',S.dots).forEach(function(b,j){b.className=j===i?'on':'';});S.cnt.textContent=fa(i+1)+' از '+fa(STEPS.length);S.pg.style.width=((i+1)/STEPS.length*100).toFixed(1)+'%';
S.cn.textContent=chapName(i);S.cn.hidden=!S.cn.textContent;S.nb.textContent=note(STEPS[i]);fit();
if(z&&typeof STEPS[i]==='number')zoom(sc,z,'bmc-zi');
else if(STEPS[i]==='whole'&&typeof was==='number'&&wide()){var cl=one('.bmc-c'+was,sc);if(cl)zoom(sc,at(cl),'bmc-zw');}
tick();pres();}
function size(){if(!S)return;S.el.style.setProperty('--bmc-ad',adH()+'px');var w=S.host.clientWidth,h=S.host.clientHeight;S.host.style.fontSize=(wide()?Math.max(10,Math.min(w/62,h/36)):14).toFixed(2)+'px';fit();}
function full(){var p=null;try{if(D.fullscreenElement)p=D.exitFullscreen();else if(H.requestFullscreen)p=H.requestFullscreen();}catch(e){}if(p&&p.catch)p.catch(function(){});}
function clockText(){var t=Math.floor((Date.now()-S.t0)/1000);return fa(Math.floor(t/60)+':'+String(t%60).padStart(2,'0'));}
function notes(){if(!S)return;S.el.classList.toggle('bmc-shown');size();}
function laser(){if(!S)return;S.el.classList.toggle('bmc-lz');}
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
  if(!pw){S.nb.textContent='مرورگر پنجرهٔ جدید را باز نکرد. اجازهٔ باز شدن پنجره (pop-up) را برای این وبلاگ بدهید، یا متن گوینده را با کلید N همین‌جا ببینید.';S.el.classList.add('bmc-shown');size();return;}
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
  pw.addEventListener('keydown',function(e){var c=e.code;if(c==='ArrowRight'||c==='PageDown'||c==='Space'){e.preventDefault();if(S)show(S.i+1);}else if(c==='ArrowLeft'||c==='PageUp'){e.preventDefault();if(S)show(S.i-1);}});
  S.pw=pw;S.pv={ck:ck,ct:ct,h1:h1,nt:nt,nx:nx,pl:pl};pres();}
function pres(){if(!S||!S.pw||S.pw.closed||!S.pv)return;var v=S.pv,st=STEPS[S.i],nx=STEPS[S.i+1];
  v.ck.textContent=clockText();plan();v.ct.textContent='اسلاید '+fa(S.i+1)+' از '+fa(STEPS.length);v.h1.textContent=(typeof st==='number'?fa(st)+' · ':'')+T[st];v.nt.textContent=note(st);
  v.nx.textContent=nx!=null?'بعدی: '+(typeof nx==='number'?fa(nx)+' · ':'')+T[nx]:'آخرین اسلاید';}

function key(e){if(!S||e.ctrlKey||e.metaKey||e.altKey)return;var c=e.code||'',k=e.keyCode,d=0;
if(c==='ArrowRight'||c==='ArrowDown'||c==='Space'||c==='Enter'||c==='PageDown'||k===39||k===40||k===32||k===13||k===34)d=1;
else if(c==='ArrowLeft'||c==='ArrowUp'||c==='PageUp'||c==='Backspace'||k===37||k===38||k===33||k===8)d=-1;
if(d)show(S.i+d);else if(c==='Escape'||k===27)close();else if(c==='KeyF')full();else if(c==='KeyN')notes();else if(c==='KeyP')presenter();else if(c==='KeyD')detail();
else if(c==='KeyL')laser();else if(c==='KeyB'||c==='Period'||k===190)black();
else if(c==='KeyR'){S.t0=Date.now();tick();}else if(c==='Home')show(0);else if(c==='End')show(STEPS.length-1);
else if(/^(Digit|Numpad)[0-9]$/.test(c)){var n=+c.slice(-1);show(STEPS.indexOf(n||'whole'));}else return;
e.preventDefault();e.stopPropagation();}
function open(i,deck){deck=deck||FULL;if(S){if(deck!==STEPS)close();else{show(i);return;}}STEPS=deck;
var st=el('div','bmc bmc-stage'),top=el('div','bmc-top'),dots=el('div','bmc-dots'),tools=el('div','bmc-tools'),host=el('div','bmc-host'),cnt=el('span','bmc-cnt'),br=el('div','bmc-brand'),nb=el('div','bmc-notebox'),
  hint=el('div','bmc-hint',TOUCH?'بعدی: یک ضربه روی صفحه  ·  جابه‌جایی: کشیدن به چپ یا راست  ·  خروج: «بستن ✕»':'بعدی: → یا فاصله یا کلیک  ·  قبلی: ←  ·  خانه‌ها: ۱ تا ۹  ·  تمام‌صفحه: F  ·  متن گوینده: N  ·  نمای گوینده: P  ·  جزئیات: D  ·  لیزر: L  ·  صفحهٔ سیاه: B  ·  خروج: Esc'),
  cn=el('span','bmc-chapn'),lz=el('i','bmc-laser');
st.setAttribute('dir','rtl');st.setAttribute('lang','fa');st.setAttribute('role','dialog');st.setAttribute('aria-label','ارائهٔ بوم '+NAME);st.tabIndex=-1;
br.appendChild(el('b','',NAME));br.appendChild(D.createTextNode(deck===SHORT?' · ارائهٔ کوتاه':' · ارائهٔ کلاس'));top.appendChild(br);cn.hidden=true;top.appendChild(cn);
STEPS.forEach(function(s,j){var b=el('button');b.type='button';b.title=fa(j+1)+' · '+T[s];b.setAttribute('aria-label','اسلاید '+fa(j+1)+': '+T[s]);b.onclick=function(e){e.stopPropagation();show(j);};dots.appendChild(b);});top.appendChild(dots);
var clock=el('span','bmc-clock','۰:۰۰');clock.title=deck===SHORT?'زمان ارائه؛ هدف: یک‌ونیم دقیقه':'زمان ارائه (R: صفر کردن)';tools.appendChild(clock);tools.appendChild(cnt);
[['قبلی',function(){show(S.i-1);}],['بعدی',function(){show(S.i+1);}],['متن گوینده',notes,'bmc-x'],['نمای گوینده',presenter,'bmc-x'],['لیزر',laser,'bmc-x bmc-lzb'],['تمام‌صفحه',full,'bmc-x'],['بستن ✕',close]].forEach(function(p){tools.appendChild(btn(p[0],p[2]||'',function(e){e.stopPropagation();p[1]();}));});top.appendChild(tools);
var pg=el('i','bmc-pg');top.appendChild(pg);st.appendChild(top);st.appendChild(host);st.appendChild(nb);st.appendChild(hint);st.appendChild(lz);D.body.appendChild(st);H.classList.add('bmc-lock');
S={el:st,host:host,dots:dots,cnt:cnt,cn:cn,pg:pg,nb:nb,clock:clock,i:-1,sc:null,sw:0,t0:Date.now(),pw:null,pv:null,zoom:null};
S.tick=setInterval(tick,1000);
st.addEventListener('mousemove',function(e){if(S&&S.el.classList.contains('bmc-lz'))lz.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';});
st.onclick=function(e){if(S.el.classList.contains('bmc-black')){black();return;}if(Date.now()-S.sw<600||(e.target.closest&&e.target.closest('.bmc-top,.bmc-notebox,.bmc-dbox,button')))return;show(S.i+1);};
/* The deck reads right to left, so the next slide comes in from the left: a drag to the right moves forward. */
var tx=0,ty=0;st.addEventListener('touchstart',function(e){var t=e.changedTouches[0];tx=t.clientX;ty=t.clientY;},{passive:true});
st.addEventListener('touchend',function(e){if(!S)return;var t=e.changedTouches[0],dx=t.clientX-tx,dy=t.clientY-ty;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.5){S.sw=Date.now();show(S.i+(dx>0?1:-1));}else if(Math.abs(dy)>12)S.sw=Date.now();},{passive:true});
W.addEventListener('keydown',key,true);W.addEventListener('resize',size);
size();show(i||0);try{st.focus({preventScroll:true});}catch(e){st.focus();}setTimeout(function(){hint.style.opacity=0;},8000);S.iv=setInterval(size,2500);
if(D.fonts&&D.fonts.ready)D.fonts.ready.then(fit);}
function close(){if(!S)return;W.removeEventListener('keydown',key,true);W.removeEventListener('resize',size);clearInterval(S.iv);clearInterval(S.tick);
  try{if(S.pw&&!S.pw.closed)S.pw.close();}catch(e){}S.el.parentNode.removeChild(S.el);S=null;H.classList.remove('bmc-lock');if(D.fullscreenElement)full();try{go.focus({preventScroll:true});}catch(e){}}
W.bmcOpen=function(i,short){open(i||0,short?SHORT:FULL);};
}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',start);else start();
})(window,document);
