/* Presentation mode for the Netemdad canvas page. It reads everything from the page markup (#bmc), so the
   page body stays the single source of the canvas text; this script only adds behaviour. */
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
function txt(s,c){return clean((c||root).querySelector(s)?(c||root).querySelector(s).textContent:'');}

/* Blogfa's editor turns line breaks into <br> and may leave empty paragraphs between blocks. */
$$('br').forEach(function(b){b.parentNode.removeChild(b);});
$$('p').forEach(function(p){if(!p.children.length&&!clean(p.textContent))p.parentNode.removeChild(p);});
var solo=root.parentNode===D.body&&!D.querySelector('.an-post-body');
if(solo){H.classList.add('bmc-solo');if(!H.getAttribute('dir'))H.setAttribute('dir','rtl');if(!H.getAttribute('lang'))H.setAttribute('lang','fa');}
root.classList.add('bmc-js');

var poster=root.querySelector('.bmc-poster'),cells=[],SAY=$$('.bmc-pitch li').map(function(l){return clean(l.textContent);});
for(var k=1;k<=9;k++)cells.push(root.querySelector('.bmc-c'+k));
cells.forEach(function(c,i){if(!c)return;$$('.bmc-notes li',c).forEach(function(l,j){l.style.setProperty('--d',i*2+j);});
  c.tabIndex=0;c.setAttribute('role','button');c.setAttribute('aria-label','ارائهٔ خانهٔ '+fa(i+1));
  c.addEventListener('click',function(){open(i+2);});
  c.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open(i+2);}});});
var NAME='نِت‌امداد',L1=txt('.bmc-h1 .bmc-red').replace(/^نِت‌امداد؛\s*/,''),L2=txt('.bmc-h2 .bmc-blue'),SIGN=txt('.bmc-sign');
var TOUCH=!!(W.matchMedia&&W.matchMedia('(pointer:coarse)').matches);
var HINT=TOUCH?'بعدی: یک ضربه روی صفحه  ·  جابه‌جایی: کشیدن به چپ یا راست  ·  خروج: «بستن ✕»':'بعدی: کلید → یا فاصله یا کلیک  ·  قبلی: ←  ·  خانه‌ها: ۱ تا ۹  ·  تمام‌صفحه: F  ·  خروج: Esc';

/* Toolbar above the poster */
var bar=el('div','bmc-bar'),go=btn('▶ شروع ارائه','',function(){open(0);});
bar.appendChild(go);bar.appendChild(el('p','',TOUCH?'برای ارائهٔ هر خانه، روی همان خانهٔ بوم بزنید.':'برای ارائهٔ هر خانه روی آن کلیک کنید؛ در حالت ارائه با کلید → جلو بروید و با F تمام‌صفحه کنید.'));
root.insertBefore(bar,poster);

/* Questions open one at a time */
$$('.bmc-q').forEach(function(q,i){var h=q.querySelector('h3');if(!h)return;h.tabIndex=0;h.setAttribute('role','button');
  function t(){var on=!q.classList.contains('bmc-open');q.classList.toggle('bmc-open',on);h.setAttribute('aria-expanded',on?'true':'false');}
  if(i===0)q.classList.add('bmc-open');h.setAttribute('aria-expanded',i===0?'true':'false');
  h.addEventListener('click',t);h.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();t();}});});

var STEPS=['title','whole',1,2,3,4,5,6,7,8,9,'strat','end'],S=null;
function adH(){var k=D.body.children,i,e,cs,h;for(i=0;i<k.length;i++){e=k[i];if(e.className||e.tagName!=='DIV')continue;cs=W.getComputedStyle(e);if(cs.position==='fixed'&&cs.bottom==='0px'&&cs.display!=='none'){h=Math.round(e.getBoundingClientRect().height);return h>240?0:h;}}return 0;}
function legend(){return root.querySelector('.bmc-legend').cloneNode(true);}

function scene(st){var sc=el('div','bmc-scene'),p;
if(st==='title'){p=el('div','bmc-paper bmc-title');
  [['o',6,8,-12],['p',4,84,9],['y',72,4,7],['g',70,88,-8]].forEach(function(f,i){var n=el('i','bmc-fly bmc-'+f[0]);n.style.cssText='top:'+f[1]+'%;right:'+f[2]+'%;transform:rotate('+f[3]+'deg);animation-delay:'+(i*120+200)+'ms';p.appendChild(n);});
  p.appendChild(el('p','bmc-eye','ارائهٔ بوم مدل کاروکسب'));p.appendChild(el('p','bmc-big',NAME));p.appendChild(el('p','bmc-l1',L1));p.appendChild(el('p','bmc-l2',L2));p.appendChild(legend());p.appendChild(el('p','bmc-by',SIGN));}
else if(st==='whole'){p=el('div','bmc-whole');var c=poster.cloneNode(true);
  $$('.bmc-cell',c).forEach(function(x,i){x.removeAttribute('tabindex');x.addEventListener('click',function(e){e.stopPropagation();show(i+2);});});
  p.appendChild(c);p.appendChild(el('p','bmc-cap',TOUCH?'روی هر خانه بزنید تا بزرگ شود':'روی هر خانه کلیک کنید یا با کلید → به خانهٔ ۱ بروید'));}
else if(typeof st==='number'){var cell=cells[st-1],h=el('div','bmc-bh'),mini=el('div','bmc-mini'),ul=el('ul','bmc-bnotes');
  p=el('div','bmc-paper bmc-block bmc-c'+st);
  h.appendChild(el('span','bmc-bn',fa(st)));h.appendChild(el('span','bmc-bi'));h.appendChild(el('span','bmc-bt',txt('.bmc-t',cell)));
  for(var j=1;j<=9;j++){var m=el('i',j===st?'on':'',fa(j));m.style.gridArea='abcdefghi'.charAt(j-1);mini.appendChild(m);}h.appendChild(mini);
  $$('.bmc-notes li',cell).forEach(function(l,j){var n=el('li',l.className,clean(l.textContent));n.style.setProperty('--d',j);n.style.setProperty('--r',[-1.6,1.2,-.6,1.8,-1.1][j%5]+'deg');ul.appendChild(n);});
  var say=el('p','bmc-say');say.appendChild(el('b','','روایت:'));say.appendChild(el('span','',SAY[st-1]||''));
  p.appendChild(h);p.appendChild(ul);p.appendChild(say);}
else if(st==='strat'){p=el('div','bmc-paper bmc-stratp');var s=root.querySelector('.bmc-strat');
  ['h2','.bmc-lead','.bmc-goal','.bmc-views','.bmc-phases'].forEach(function(q){var n=s.querySelector(q);if(n)p.appendChild(n.cloneNode(true));});}
else{p=el('div','bmc-paper bmc-end');p.appendChild(el('p','bmc-big','سپاس از توجه شما'));p.appendChild(el('p','bmc-l1','آمادهٔ پاسخ به پرسش‌ها هستم'));
  var u=el('ul');$$('.bmc-q h3').forEach(function(q){u.appendChild(el('li','',clean(q.textContent)));});p.appendChild(u);p.appendChild(el('p','bmc-by',SIGN));}
sc.appendChild(p);return sc;}

function wide(){return W.innerWidth>720;}
/* Fit the current slide: the whole canvas scales by width/height ratio, other slides shrink their type. */
function fit(){if(!S||!S.sc)return;var sc=S.sc,p=sc.firstChild,cs=W.getComputedStyle(sc),aw=sc.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=sc.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
if(p.classList.contains('bmc-whole')){var pz=p.querySelector('.bmc-poster'),cap=p.querySelector('.bmc-cap');pz.style.setProperty('--pw','1000px');p.style.setProperty('--pw','1000px');
  var r=pz.offsetHeight/1000;pz.style.removeProperty('--pw');var room=ah-(cap?cap.offsetHeight+10:0),w=Math.floor(Math.max(260,Math.min(aw,wide()?room/r:aw)));p.style.setProperty('--pw',w+'px');return;}
p.style.fontSize='';if(!wide())return;var s=1,n=0;
var nb=p.querySelector('.bmc-bnotes');function over(){return p.scrollHeight>p.clientHeight+2||(nb&&nb.scrollHeight>nb.clientHeight+2);}
while(over()&&s>.45&&n++<24){s-=.04;p.style.fontSize=s.toFixed(2)+'em';}}
function show(i){if(!S)return;i=Math.max(0,Math.min(STEPS.length-1,i));if(i===S.i)return;var old=S.sc,sc=scene(STEPS[i]);S.i=i;
if(old){old.classList.add('bmc-out');setTimeout(function(){if(old.parentNode)old.parentNode.removeChild(old);},320);}
S.host.appendChild(sc);S.sc=sc;$$('button',S.dots).forEach(function(b,j){b.className=j===i?'on':'';});S.cnt.textContent=fa(i+1)+' از '+fa(STEPS.length);fit();}
function size(){if(!S)return;S.el.style.setProperty('--bmc-ad',adH()+'px');var w=S.host.clientWidth,h=S.host.clientHeight;S.host.style.fontSize=(wide()?Math.max(10,Math.min(w/62,h/36)):14).toFixed(2)+'px';fit();}
function full(){var p=null;try{if(D.fullscreenElement)p=D.exitFullscreen();else if(H.requestFullscreen)p=H.requestFullscreen();}catch(e){}if(p&&p.catch)p.catch(function(){});}
function key(e){if(!S||e.ctrlKey||e.metaKey||e.altKey)return;var c=e.code||'',k=e.keyCode,d=0;
if(c==='ArrowRight'||c==='ArrowDown'||c==='Space'||c==='Enter'||c==='PageDown'||k===39||k===40||k===32||k===13||k===34)d=1;
else if(c==='ArrowLeft'||c==='ArrowUp'||c==='PageUp'||c==='Backspace'||k===37||k===38||k===33||k===8)d=-1;
if(d)show(S.i+d);else if(c==='Escape'||k===27)close();else if(c==='KeyF')full();else if(c==='Home')show(0);else if(c==='End')show(STEPS.length-1);
else if(/^(Digit|Numpad)[0-9]$/.test(c)){var n=+c.slice(-1);show(n?n+1:1);}else return;
e.preventDefault();e.stopPropagation();}
function open(i){if(S){show(i);return;}var st=el('div','bmc bmc-stage'),top=el('div','bmc-top'),dots=el('div','bmc-dots'),tools=el('div','bmc-tools'),host=el('div','bmc-host'),cnt=el('span'),hint=el('div','bmc-hint',HINT),br=el('div','bmc-brand');
st.setAttribute('dir','rtl');st.setAttribute('lang','fa');st.setAttribute('role','dialog');st.setAttribute('aria-label','ارائهٔ بوم '+NAME);st.tabIndex=-1;
br.appendChild(el('b','',NAME));br.appendChild(D.createTextNode(' · بوم مدل کاروکسب'));top.appendChild(br);
STEPS.forEach(function(s,j){var b=el('button');b.type='button';b.title=fa(j+1);b.setAttribute('aria-label','اسلاید '+fa(j+1));b.onclick=function(e){e.stopPropagation();show(j);};dots.appendChild(b);});top.appendChild(dots);
tools.appendChild(cnt);[['قبلی',function(){show(S.i-1);}],['بعدی',function(){show(S.i+1);}],['تمام‌صفحه',full,'bmc-x'],['بستن ✕',close]].forEach(function(p){tools.appendChild(btn(p[0],p[2]||'',function(e){e.stopPropagation();p[1]();}));});top.appendChild(tools);
st.appendChild(top);st.appendChild(host);st.appendChild(hint);D.body.appendChild(st);H.classList.add('bmc-lock');
S={el:st,host:host,dots:dots,cnt:cnt,i:-1,sc:null,sw:0};
st.onclick=function(e){if(Date.now()-S.sw<600||(e.target.closest&&e.target.closest('.bmc-top')))return;show(S.i+1);};
/* The deck reads right to left, so the next slide comes in from the left: a drag to the right moves forward. */
var tx=0,ty=0;st.addEventListener('touchstart',function(e){var t=e.changedTouches[0];tx=t.clientX;ty=t.clientY;},{passive:true});
st.addEventListener('touchend',function(e){if(!S)return;var t=e.changedTouches[0],dx=t.clientX-tx,dy=t.clientY-ty;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.5){S.sw=Date.now();show(S.i+(dx>0?1:-1));}else if(Math.abs(dy)>12)S.sw=Date.now();},{passive:true});
W.addEventListener('keydown',key,true);W.addEventListener('resize',size);
size();show(i||0);try{st.focus({preventScroll:true});}catch(e){st.focus();}setTimeout(function(){hint.style.opacity=0;},7000);S.iv=setInterval(size,2500);
if(D.fonts&&D.fonts.ready)D.fonts.ready.then(fit);}
function close(){if(!S)return;W.removeEventListener('keydown',key,true);W.removeEventListener('resize',size);clearInterval(S.iv);S.el.parentNode.removeChild(S.el);S=null;H.classList.remove('bmc-lock');if(D.fullscreenElement)full();try{go.focus({preventScroll:true});}catch(e){}}
W.bmcOpen=open;
}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',start);else start();
})(window,document);
