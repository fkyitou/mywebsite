# گزارش پژوهش و منابع

این گزارش می‌گوید هر بخش آینده‌نگار بر چه منبعی تکیه دارد: سازوکار بلاگفا، فعالیت کتاب درسی، داده‌های ابزارهای زنده و منابع هر ده مقاله. هر جا عددی در بازبینی اصلاح شده، اصلاح و منبعش در بخش «اصلاح‌ها» آمده است.

## روش کار

1. **اول منبع اصلی.** برای هر عدد، اول خود منبع اصلی خوانده شد: مقاله‌ی پژوهشی، سازمان علمی یا داده‌ی رسمی، مثل ناسا، IPCC، Ember و آژانس اطلاعات انرژی آمریکا (EIA). منبع دست‌دوم فقط وقتی آمد که منبع اصلی در دسترس نبود.
2. **برچسب سطح شاهد.** کنار ادعاهای مهم یکی از چهار برچسب آمده است: «اندازه‌گیری‌شده»، «نظریه‌ی پذیرفته»، «فرضیه» و «گمانه‌زنی». تعریف‌ها و حساب‌های خود مقاله برچسب ندارند.
3. **نمودار از داده‌ی خود مقاله.** هر کدام از ۱۲ نمودار از جدولی کشیده می‌شود که در متن مقاله هست، و منبع آن در توضیح همان جدول آمده است. نمودار هر عدد را با همان تعداد رقم اعشاری نشان می‌دهد که در جدول نوشته شده است. هر عددی که از تفریق یا محاسبه به دست آمده، در توضیح نمودار گفته شده است.
4. **بدون آمار ساختگی.** هیچ عدد، نقل‌قول یا منبعی ساخته نشده است. هر آزمایشگاهی که داده‌ی نمونه یا مدل ساده‌شده به کار می‌برد، این را در خود صفحه گفته است؛ مثلاً آزمایشگاه الگوریتم پست‌هایش را «ساختگی» و آزمایشگاه انرژی مدلش را «ساده‌سازی‌شده» می‌نامد.
5. **بازبینی دوباره.** عددهای حساس، مثل دمای مریخ، ارتفاع برج کایان و زمان ساخت مدل T فورد، دوباره با منبع اصلی مقایسه شدند. نتیجه در بخش «اصلاح‌ها» آمده است.

## منابع درباره‌ی بلاگفا

| منبع | آنچه از آن برداشته شد |
|---|---|
| [راهنمای رسمی قالب بلاگفا](https://blogfa.com/help/Show.aspx?id=template) | فهرست برچسب‌های قالب مثل `<-PostTitle->` و `<-PostContent->`، بلوک‌هایی مثل `<BLOGFA>` و `<BlogPreviousItems>`، برچسب‌های صفحه‌های جداگانه، و این‌که یک کد می‌تواند هر سه قالب را با `<blog:PostTemplate>`، `<blog:ArchiveTemplate>` و `<blog:PageTemplate>` در خود داشته باشد. |
| [پرسش‌های متداول بلاگفا، مطلب ۲ تا ۴](https://faq.blogfa.com/post/2) | بلاگفا کدهای ویروس‌مانند، تغییر مسیر، حذف تبلیغ، پنجره‌های بازشو و شبکه‌های تبلیغاتی را مسدود می‌کند و ممکن است قالبی را که به کاربر آسیب بزند یا میزبان بیرونی‌اش از کار بیفتد به حالت پیش‌فرض برگرداند. |
| [پرسش‌های متداول بلاگفا، مطلب ۱۵](https://faq.blogfa.com/post/15) | حذف تبلیغ خدمت پولی است (۱۰۰ هزار تومان در سال). |
| کد HTML صفحه‌های faq.blogfa.com | بلاگفا در ابتدای `<head>` یک اسکریپت تبلیغ و آرایه‌ی `BlogComments` را با تعداد نظرهای هر مطلب می‌گذارد؛ صفحه‌ی نظرها نشانی `/comments/?blogid=…&postid=…` در همان دامنه دارد. |
| [آموزش طراحی قالب بلاگفا، فرادرس](https://blog.faradars.org/طراحی-قالب-بلاگفا/) | مسیر «تنظیمات و دیگر امکانات» ← «ویرایش قالب وبلاگ» و سه زبانه‌ی «صفحات اصلی»، «آرشیو» و «صفحات جداگانه»؛ کد قالب پیش‌فرض امروزی. |
| [studyblog.blogfa.com، مطلب ۳](https://studyblog.blogfa.com/post/3) | نام دیگر همین بخش در پنل: «قالب وبلاگ و کدهای بکار گرفته شده در وبلاگ»؛ پاک کردن کد قبلی و جای‌گذاری کد تازه. |
| [ساخت صفحات جداگانه در بلاگفا، bloging.ir (۲۰۱۲)](https://bloging.ir/blogging/blogfa/ساخت-صفحات-جداگانه-بلاگفا/) | هر صفحه‌ی جداگانه عنوان و نشانی‌ای با حروف انگلیسی می‌گیرد و نشانی‌اش به‌شکل `/page/نشانی` است. منبع قدیمی است؛ برای همین در راهنما بررسی آن خواسته شده است. |
| [گذاشتن ویدیوی آپارات در بلاگفا، panjoohaft.blogfa.com، مطلب ۱۶](https://panjoohaft.blogfa.com/post/16) | کاربران کد HTML، مثل کد ویدیوی آپارات، را در حالت کد ویرایشگر مطلب جای‌گذاری می‌کنند. این همان راهی است که مقاله‌های آینده‌نگار منتشر می‌شوند، و راه گذاشتن ویدیوی کوتاه گام ۳۳ کتاب هم هست. |
| فرم ثبت‌نام بلاگفا (تصویرهایی که خود شما فرستادید) | بخش‌های فرم: نام کاربری، رمز عبور و تکرار آن، عنوان وبلاگ، نام نویسنده، توضیح وبلاگ، ایمیل و تکرار آن، و کد امنیتی. |

**آنچه پیدا نشد:** سقف اندازه‌ی قالب، رفتار ویرایشگر مطلب با کلاس‌ها و ویژگی‌های `data-`، و نام دقیق امروزی همه‌ی دکمه‌های پنل. این‌ها در راهنمای نصب «تأییدنشده» نامیده شده‌اند و برای هر کدام راه جایگزین گذاشته شده است.

## کتاب درسی

کتاب «تجارت الکترونیک و امنیت شبکه» (کد ۲۱۲۲۹۰) در فعالیت صفحه‌ی ۴۳ پیشنهاد می‌کند پیش از خرید تارنما، وبلاگی به‌عنوان کمینه محصول پذیرفتنی (MVP) روی یک سرویس رایگان وبلاگ ساخته شود. در گام ۳۳ ساختن دو نسخه‌ی A و B و یک ویدیوی کوتاه، و در گام ۳۴ مقایسه‌ی عملکرد دو نسخه در جدول ۳۳ (صفحه‌ی ۴۴) خواسته شده است. ارزشیابی مرحله‌ی ۵ در صفحه‌ی ۴۵ آمده است.

آینده‌نگار دو نسخه‌ی ظاهری A «شب» و B «روز» دارد که با پیوندهای `?v=a` و `?v=b` جدا به بازدیدکننده‌ها داده می‌شوند (راهنمای نصب، بخش آخر). شرط «دست‌کم ۱۰ مطلب» و رقابت سه وبلاگ برتر، طبق گفته‌ی خود شما، از طرف هنرآموز است و در کتاب نیامده است.

## داده‌ها و دارایی‌های ابزارهای زنده

| بخش | منبع یا روش | پروانه |
|---|---|---|
| پنل زنده‌ی صفحه‌ی اول: انرژی خورشید | تابش خورشید در فاصله‌ی زمین (۱٬۳۶۱ وات بر متر مربع) ضرب در سطح مقطع زمین با شعاع ۶٬۳۷۱ کیلومتر، یعنی حدود ۱۷۳٫۶ پتاوات. هر دو عدد از [برگه‌ی مشخصات زمین NSSDCA ناسا](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) است. نتیجه با جمله‌ی MIT News هم‌خوان است: «A total of 173,000 terawatts … of solar energy strikes the Earth continuously». هر دو منبع در بازبینی نهایی آبان ۱۴۰۵ دوباره خوانده شدند. | داده‌ی عمومی |
| پنل زنده: مسافتی که زمین پیموده | سرعت میانگین مداری زمین، ۲۹٫۷۸ کیلومتر بر ثانیه، از همان برگه | داده‌ی عمومی |
| پنل زنده: تأخیر پیام تا مریخ | عناصر مداری «Approximate Positions of the Planets» آزمایشگاه پیشرانش جت ناسا (Standish، برای سال‌های ۱۸۰۰ تا ۲۰۵۰) و سرعت نور | داده‌ی عمومی |
| پنل زنده: ساعت هماهنگ مریخ | الگوریتم Mars24 مؤسسه‌ی مطالعات فضایی گادارد ناسا (GISS)، بر پایه‌ی Allison و McEwen (۲۰۰۰) | داده‌ی عمومی |
| کره‌ی زمین: خط ساحلی | Natural Earth، مقیاس ۱:۵۰ میلیون، از بسته‌ی world-atlas | مالکیت عمومی |
| کره‌ی زمین: نقطه‌های شهرها | GeoNames، شهرهای بالای ۱۰۰ هزار نفر، از بسته‌ی all-the-cities | CC BY 4.0؛ اعتبارش در صفحه‌ی درباره آمده است |
| کره‌ی زمین: کمان‌ها | تزئینی؛ ترافیک واقعی اینترنت را نشان نمی‌دهند و این در صفحه‌ی درباره گفته شده است. | — |
| قلم | وزیرمتن، اثر صابر راستی‌کردار | SIL Open Font License |
| تصویرهای سرصفحه، کارت‌ها، لوگو و کارت‌های اشتراک | با کد خود پروژه ساخته شده‌اند (`src/js/covers.js` و `tools/assets.mjs`). | متعلق به پروژه |

## اصلاح‌ها

در بازبینی، چهار عدد با منبع اصلی مقایسه شد و اصلاح شد:

| کجا | پیش از اصلاح | پس از اصلاح | منبع |
|---|---|---|---|
| مقاله‌ی ۶ و آزمایشگاهش: دمای میانگین مریخ | حدود منفی ۶۳ درجه‌ی سلسیوس | حدود منفی ۵۹ درجه‌ی سلسیوس | NSSDCA Mars Fact Sheet: «Average temperature: ~214 K (-59 C)» |
| مقاله‌ی ۷ و آزمایشگاهش: برج کایان | ۳۰۶ متر | ۳۰۷ متر، ۷۵ طبقه، ۹۰ درجه چرخش | SOM، معمار برج: «Building Height: 307 meters» |
| مقاله‌ی ۷ و آزمایشگاهش: برج شانگهای | «به گزارش طراحان … در آزمایش تونل باد، نیروی باد را حدود ۲۴٪ کم کرد» | «به گزارش مهندسان سازه‌ی برج شانگهای، اصلاح فرم برج بار باد را ۲۴٪ کم کرد و سازه را سبک‌تر کرد» | Thornton Tomasetti، مهندس سازه‌ی برج |
| مقاله‌ی ۱۰ و کارگاه ایده: خط تولید فورد | از حدود ۱۲ ساعت به حدود یک‌ونیم ساعت | از ۱۲ ساعت و نیم به ۹۳ دقیقه | کتابخانه‌ی کنگره‌ی آمریکا (منبع ۷ مقاله‌ی ۱۰) |

اصلاح‌های دیگر همان بازبینی:

- **مقاله‌ی ۱۰:** برچسب سطح شاهد از کنار تعریف نردبان آمادگی فناوری (TRL) برداشته شد، چون تعریف است نه اندازه‌گیری.
- **مقاله‌ی ۱۰:** کار الکس آزبورن دقیق‌تر توصیف شد. متن فعلی: «روشی برای ایده‌سازی ساخت و نامش را "طوفان فکری" گذاشت» (منبع ۳ همان مقاله، آرشیو آزبورن در دانشگاه بوفالو استیت).
- **مقاله‌ی ۹:** توضیح نمودار منابع برق می‌گوید ردیف «بقیه‌ی منابع» حاصل تفریق و تقریبی است.
- **همه‌ی نمودارها:** هر عدد با همان تعداد رقم اعشاری جدولش نشان داده می‌شود، و برچسب‌های فارسی نمودارها راست‌به‌چپ چیده می‌شوند.

## منابع هر مقاله

فهرست زیر مستقیماً از بخش «منابع» پایان هر فایل استخراج شده است.

### هوش مصنوعی چطور یاد می‌گیرد؟

`posts/01-ai.html` · ۹ منبع

1. Krizhevsky, A., Sutskever, I., Hinton, G. E. (2012). ImageNet Classification with Deep Convolutional Neural Networks. NeurIPS. [proceedings.neurips.cc](https://proceedings.neurips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf)
2. نتایج رسمی مسابقه‌ی ILSVRC در سال‌های ۲۰۱۱ و ۲۰۱۳. [image-net.org (2011)](https://www.image-net.org/challenges/LSVRC/2011/results.php) و [image-net.org (2013)](https://www.image-net.org/challenges/LSVRC/2013/results.php)
3. Szegedy, C. et al. (2015). Going Deeper with Convolutions (GoogLeNet). [arxiv.org/abs/1409.4842](https://arxiv.org/abs/1409.4842)
4. He, K. et al. (2016). Deep Residual Learning for Image Recognition (ResNet). [arxiv.org/abs/1512.03385](https://arxiv.org/abs/1512.03385)
5. Karpathy, A. (2014). What I learned from competing against a ConvNet on ImageNet. [karpathy.github.io](http://karpathy.github.io/2014/09/02/what-i-learned-from-competing-against-a-convnet-on-imagenet/)
6. Rumelhart, D. E., Hinton, G. E., Williams, R. J. (1986). Learning representations by back-propagating errors. Nature 323, 533–536. [doi.org/10.1038/323533a0](https://doi.org/10.1038/323533a0)
7. Szegedy, C. et al. (2014). Intriguing properties of neural networks. [arxiv.org/abs/1312.6199](https://arxiv.org/abs/1312.6199)
8. Brown, T. et al. (2020). Language Models are Few-Shot Learners (GPT-3). [arxiv.org/abs/2005.14165](https://arxiv.org/abs/2005.14165)
9. Buolamwini, J., Gebru, T. (2018). Gender Shades: Intersectional Accuracy Disparities in Commercial Gender Classification. PMLR 81. [proceedings.mlr.press](https://proceedings.mlr.press/v81/buolamwini18a.html)

### اینترنت اشیا: وقتی یخچال هم آی‌پی دارد

`posts/02-iot.html` · ۴ منبع

1. Sinha, S. (2025). State of IoT 2025: Number of connected IoT devices growing 14% to 21.1 billion globally. IoT Analytics. [iot-analytics.com](https://iot-analytics.com/number-connected-iot-devices/)
2. Antonakakis, M. et al. (2017). Understanding the Mirai Botnet. 26th USENIX Security Symposium. [usenix.org](https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/antonakakis)
3. UK Government (2024). Regulations: consumer connectable product security. [gov.uk](https://www.gov.uk/guidance/regulations-consumer-connectable-product-security)
4. UK National Cyber Security Centre. Smart devices: new law helps citizens to choose secure products. [ncsc.gov.uk](https://www.ncsc.gov.uk/blog-post/smart-devices-law)

### شهر هوشمند: چراغ راهنمایی که فکر می‌کند

`posts/03-city.html` · ۳ منبع

1. United Nations, Department of Economic and Social Affairs, Population Division (2019). World Urbanization Prospects: The 2018 Revision. [population.un.org](https://population.un.org/wup/assets/WUP2018-Report.pdf)
2. Carnegie Mellon University (2012). Smart Traffic Signals. [cmu.edu](https://www.cmu.edu/homepage/computing/2012/fall/smart-traffic-signals.shtml)
3. Federal Highway Administration (2008). Traffic Signal Timing Manual, Chapter 5: Basic Signal Timing Procedure and Controller Parameters (FHWA-HOP-08-024). [ops.fhwa.dot.gov](https://ops.fhwa.dot.gov/publications/fhwahop08024/chapter5.htm)

### امنیت دیجیتال: رمز عبورت چند ثانیه دوام می‌آورد؟

`posts/04-security.html` · ۵ منبع

1. Chick3nman. hashcat v6.2.6 benchmark on the Nvidia RTX 4090 (GitHub Gist). [gist.github.com](https://gist.github.com/Chick3nman/32e662a5bb63bc4f51b847bb422222fd)
2. National Institute of Standards and Technology (2025). NIST Special Publication 800-63B-4: Digital Identity Guidelines, Authentication and Authenticator Management. [pages.nist.gov](https://pages.nist.gov/800-63-4/sp800-63b.html)
3. M'Raihi, D. et al. (2011). RFC 6238: TOTP: Time-Based One-Time Password Algorithm. IETF. [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc6238)
4. Microsoft Security (2019). One simple action you can take to prevent 99.9 percent of attacks on your accounts. [microsoft.com](https://www.microsoft.com/en-us/security/blog/2019/08/20/one-simple-action-you-can-take-to-prevent-99-9-percent-of-account-attacks/)
5. UK National Cyber Security Centre. Three random words. [ncsc.gov.uk](https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online/three-random-words)

### مغز چطور یاد می‌گیرد و چرا فراموش می‌کند؟

`posts/05-brain.html` · ۶ منبع

1. Azevedo, F. A. C. et al. (2009). Equal numbers of neuronal and nonneuronal cells make the human brain an isometrically scaled-up primate brain. Journal of Comparative Neurology, 513(5), 532–541. [pubmed.ncbi.nlm.nih.gov](https://pubmed.ncbi.nlm.nih.gov/19226510/)
2. Murre, J. M. J., & Dros, J. (2015). Replication and Analysis of Ebbinghaus’ Forgetting Curve. PLOS ONE, 10(7), e0120644. [doi.org](https://doi.org/10.1371/journal.pone.0120644)
3. Cepeda, N. J. et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. Psychological Bulletin, 132(3), 354–380. [pubmed.ncbi.nlm.nih.gov](https://pubmed.ncbi.nlm.nih.gov/16719566/)
4. Roediger, H. L., & Karpicke, J. D. (2006). Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention. Psychological Science, 17(3), 249–255. [pubmed.ncbi.nlm.nih.gov](https://pubmed.ncbi.nlm.nih.gov/16507066/)
5. Pashler, H. et al. (2008). Learning Styles: Concepts and Evidence. Psychological Science in the Public Interest, 9(3), 105–119. [pubmed.ncbi.nlm.nih.gov](https://pubmed.ncbi.nlm.nih.gov/26162104/)
6. Diekelmann, S., & Born, J. (2010). The memory function of sleep. Nature Reviews Neuroscience, 11(2), 114–126. [pubmed.ncbi.nlm.nih.gov](https://pubmed.ncbi.nlm.nih.gov/20046194/)

### زندگی روی مریخ: از رؤیا تا محاسبه

`posts/06-space.html` · ۸ منبع

1. NASA Space Science Data Coordinated Archive. Mars Fact Sheet. [nssdc.gsfc.nasa.gov](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)
2. NASA Space Science Data Coordinated Archive. Planetary Fact Sheet – Metric. [nssdc.gsfc.nasa.gov](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
3. European Space Agency (2012). Time delay between Mars and Earth. Mars Express blog. [blogs.esa.int](https://blogs.esa.int/mex/2012/08/05/time-delay-between-mars-and-earth/)
4. NASA Jet Propulsion Laboratory (2023). NASA’s Oxygen-Generating Experiment MOXIE Completes Mars Mission. [jpl.nasa.gov](https://www.jpl.nasa.gov/news/nasas-oxygen-generating-experiment-moxie-completes-mars-mission)
5. NASA. The Human Body in Space. [nasa.gov](https://www.nasa.gov/humans-in-space/the-human-body-in-space/)
6. NASA. Crew Health and Performance Exploration Analog (CHAPEA). [nasa.gov](https://www.nasa.gov/humans-in-space/chapea/)
7. NASA Jet Propulsion Laboratory, Solar System Dynamics. Approximate Positions of the Planets. [ssd.jpl.nasa.gov](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
8. Allison, M., & McEwen, M. (2000). A post-Pathfinder evaluation of areocentric solar coordinates (Mars24 algorithm). [giss.nasa.gov](https://www.giss.nasa.gov/tools/mars24/help/algorithm.html)

### معماری آینده: برج‌هایی که با باد کنار می‌آیند

`posts/07-arch.html` · ۵ منبع

1. Council on Tall Buildings and Urban Habitat. The 100 Tallest Completed Buildings in the World. The Skyscraper Center. [skyscrapercenter.com](https://www.skyscrapercenter.com/buildings)
2. Thornton Tomasetti. Shanghai Tower. [thorntontomasetti.com](https://www.thorntontomasetti.com/project/shanghai-tower)
3. SOM (Skidmore, Owings & Merrill). Cayan Tower. [som.com](https://www.som.com/projects/cayan-tower/)
4. Thornton Tomasetti. Taipei 101. [thorntontomasetti.com](https://www.thorntontomasetti.com/project/taipei-101)
5. Stefano Boeri Architetti. Vertical Forest, Milan. [stefanoboeriarchitetti.net](https://www.stefanoboeriarchitetti.net/en/project/vertical-forest/)

### الگوریتم‌ها: چه کسی فید تو را می‌چیند؟

`posts/08-algo.html` · ۳ منبع

1. CNET (2018). YouTube’s AI is the puppet master over most of what you watch. [cnet.com](https://www.cnet.com/tech/services-and-software/youtube-ces-2018-neal-mohan/)
2. Brady, W. J., Wills, J. A., Jost, J. T., Tucker, J. A., & Van Bavel, J. J. (2017). Emotion shapes the diffusion of moralized content in social networks. PNAS, 114(28), 7313–7318. [doi.org](https://doi.org/10.1073/pnas.1618923114)
3. European Union (2022). Regulation (EU) 2022/2065 (Digital Services Act), Article 38: Recommender systems. [eur-lex.europa.eu](https://eur-lex.europa.eu/eli/reg/2022/2065/oj)

### انرژی پاک: یک روز از زندگی شبکه‌ی برق

`posts/09-energy.html` · ۷ منبع

1. MIT News (2011). Shining brightly. [news.mit.edu](https://news.mit.edu/2011/energy-scale-part3-1026)
2. Energy Institute (2024). Statistical Review of World Energy 2024. [energyinst.org](https://www.energyinst.org/statistical-review)
3. Ember (2026). Global Electricity Review 2026. [ember-energy.org](https://ember-energy.org/latest-insights/global-electricity-review-2026/)
4. Ember (2026). World: electricity generation data and insights. [ember-energy.org](https://ember-energy.org/countries-and-regions/world/)
5. IPCC (2014). Annex III: Technology-specific cost and performance parameters. In: Climate Change 2014: Mitigation of Climate Change, contribution of Working Group III to the Fifth Assessment Report. [ipcc.ch](https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-iii.pdf)
6. U.S. Energy Information Administration (2023). As solar capacity grows, duck curves are getting deeper in California. [eia.gov](https://www.eia.gov/todayinenergy/detail.php?id=56880)
7. NASA NSSDCA. Mars Fact Sheet. [nssdc.gsfc.nasa.gov](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)

### از جرقه تا اختراع: ایده‌ها چطور به دنیا می‌آیند؟

`posts/10-idea.html` · ۷ منبع

1. 3M Post-it. History Timeline: Post-it® Notes. [post-it.com](https://www.post-it.com/3M/en_US/post-it/contact-us/about-us/)
2. National Inventors Hall of Fame. How Did Art Fry Co-Invent Post-it Notes? [invent.org](https://www.invent.org/blog/inventors/art-fry-post-it-notes)
3. Center for Applied Imagination, SUNY Buffalo State. Alex Osborn Archives. [buffalostate.edu](https://creativity.buffalostate.edu/alex-osborn-archives)
4. 3M Post-it. SCAMPER method. [post-it.com](https://www.post-it.com/3M/en_US/post-it/ideas/articles/scamper-method/)
5. NASA (2023). Technology Readiness Levels. [nasa.gov](https://www.nasa.gov/directorates/somd/space-communications-navigation-program/technology-readiness-levels/)
6. NASA Earth Science Technology Office. Technology Readiness Levels: definitions. [esto.nasa.gov](https://esto.nasa.gov/trl/)
7. Library of Congress. Ford Implements the Moving Assembly Line (This Month in Business History). [guides.loc.gov](https://guides.loc.gov/this-month-in-business-history/october/ford)

### درباره‌ی آینده‌نگار

`pages/about.html` · ۷ منبع

1. NASA NSSDCA. Earth Fact Sheet. [nssdc.gsfc.nasa.gov](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html)
2. MIT News (2011). Shining brightly. [news.mit.edu](https://news.mit.edu/2011/energy-scale-part3-1026)
3. NASA Jet Propulsion Laboratory, Solar System Dynamics. Approximate Positions of the Planets. [ssd.jpl.nasa.gov](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
4. Allison, M., & McEwen, M. (2000). A post-Pathfinder evaluation of areocentric solar coordinates (Mars24 algorithm). [giss.nasa.gov](https://www.giss.nasa.gov/tools/mars24/help/algorithm.html)
5. Natural Earth. Free vector and raster map data. [naturalearthdata.com](https://www.naturalearthdata.com/)
6. GeoNames. Geographical database, licensed under CC BY 4.0. [geonames.org](https://www.geonames.org/)
7. Rastikerdar, S. Vazirmatn font. [github.com](https://github.com/rastikerdar/vazirmatn)

روی هم ۶۴ منبع: ۵۷ منبع در ده مقاله و ۷ منبع در صفحه‌ی درباره.

