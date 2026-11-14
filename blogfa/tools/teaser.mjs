/* آینده‌نگار · renders the introduction film (src/addons/teaser.js) to a real video file, with its production package.
   The page and the file come from the same code: Chromium draws every frame with AN_TEASER.film.draw() at 1920×1080
   and 30 frames a second, and the music is rendered with an OfflineAudioContext from AN_TEASER.film.score(), so no
   frame is skipped and the sound is sample-exact. ffmpeg (already on the machine; no other software) joins them.

   node tools/teaser.mjs            → film/ayandehnegar-teaser.mp4 (H.264 + AAC, faststart, a Persian subtitle track),
                                      film/ayandehnegar-teaser.wav, film/poster.jpg, film/contact-sheet.jpg,
                                      film/captions.fa.vtt, film/captions.fa.srt and film/PRODUCTION.md
   node tools/teaser.mjs --fast     → the same at 960×540 and 15 frames a second, for a quick look

   The MP4 and the WAV are not committed (.gitignore) and never go to jsDelivr: the blog plays the film from the code
   itself. They are copied into the delivery folder with the kit. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'film');
const FAST = process.argv.includes('--fast');
const W = FAST ? 960 : 1920, H = FAST ? 540 : 1080, FPS = FAST ? 15 : 30, RATE = 48000;
const NAME = 'ayandehnegar-teaser';
fs.mkdirSync(OUT, { recursive: true });

// the page: Vazirmatn from the repository (the same files the blog serves) and the film's own code
const fonts = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'fonts', 'fonts.json'), 'utf8'));
const faces = fonts.faces.map(f => `@font-face{font-family:"Vazirmatn";font-weight:300 900;font-display:block;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'src', 'fonts', f.file)).toString('base64')}) format("woff2");unicode-range:${f.range}}`).join('');
const code = fs.readFileSync(path.join(ROOT, 'src', 'addons', 'teaser.js'), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.setContent(`<!doctype html><meta charset="utf-8"><style>${faces}</style><canvas id="c" width="${W}" height="${H}"></canvas><p style="font:700 20px Vazirmatn">آینده‌نگار ayandehnegar</p>`);
await page.addScriptTag({ content: code });
await page.evaluate(async () => { await document.fonts.load('800 40px Vazirmatn', 'آینده‌نگار'); await document.fonts.load('500 40px Vazirmatn', 'ayandehnegar'); await document.fonts.ready; });
const film = await page.evaluate(() => { const f = window.AN_TEASER.film; return { DUR: f.DUR, CUTS: f.CUTS, LINES: f.LINES, CAPS: f.CAPS, POSTER: f.POSTER }; });
if (!fs.existsSync('/usr/bin/ffmpeg') && !process.env.FFMPEG) throw new Error('ffmpeg is needed (apt install ffmpeg)');
const FF = process.env.FFMPEG || 'ffmpeg';

// 1. the music, rendered offline, as 16-bit PCM
console.log('music …');
const pcm = await page.evaluate(async ({ RATE }) => {
  const f = window.AN_TEASER.film, ac = new OfflineAudioContext(2, Math.round(RATE * f.DUR), RATE);
  f.score(ac, ac.destination, 0, 0);
  const buf = await ac.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
  const out = new Int16Array(n * 2); let peak = 0, sq = 0;
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i]));
    peak = Math.max(peak, Math.abs(l), Math.abs(r)); sq += l * l + r * r;
    out[i * 2] = l * 32767; out[i * 2 + 1] = r * 32767;
  }
  let s = ''; const b = new Uint8Array(out.buffer);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return { b64: btoa(s), peak, rms: Math.sqrt(sq / (n * 2)) };
}, { RATE });
const data = Buffer.from(pcm.b64, 'base64');
const wav = Buffer.alloc(44);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + data.length, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(RATE, 24);
wav.writeUInt32LE(RATE * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(data.length, 40);
const WAV = path.join(OUT, `${NAME}.wav`);
fs.writeFileSync(WAV, Buffer.concat([wav, data]));
const db = x => (20 * Math.log10(x || 1e-9)).toFixed(1);
console.log(`  ${film.DUR} s, peak ${db(pcm.peak)} dBFS, rms ${db(pcm.rms)} dBFS`);

// 2. the captions, from the film's own list
const ts = (x, sep) => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`; };
fs.writeFileSync(path.join(OUT, 'captions.fa.vtt'), 'WEBVTT\nKind: captions\nLanguage: fa\n\n' + film.CAPS.map((c, i) => `${i + 1}\n${ts(c.a, '.')} --> ${ts(c.b, '.')}\n${c.t}\n`).join('\n'));
const SRT = path.join(OUT, 'captions.fa.srt');
fs.writeFileSync(SRT, film.CAPS.map((c, i) => `${i + 1}\n${ts(c.a, ',')} --> ${ts(c.b, ',')}\n${c.t}\n`).join('\n'));

// 3. the picture: every frame, drawn and handed to ffmpeg as it comes
const MP4 = path.join(OUT, `${NAME}.mp4`);
const frames = Math.round(film.DUR * FPS);
console.log(`picture: ${frames} frames at ${W}×${H}, ${FPS} fps …`);
const ff = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', WAV, '-i', SRT,
  '-map', '0:v', '-map', '1:a', '-map', '2:s',
  '-c:v', 'libx264', '-preset', FAST ? 'veryfast' : 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=per', '-metadata:s:s:0', 'title=فارسی',
  '-metadata', 'title=آینده‌نگار: ویدیوی معرفی', '-metadata', 'artist=امیرحسین همتی', '-metadata', 'comment=طراحی، مدیریت و نویسندگی: امیرحسین همتی · ayandehnegar.blogfa.com',
  '-movflags', '+faststart', '-t', String(film.DUR), MP4], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((ok, no) => ff.on('close', c => c === 0 ? ok() : no(new Error('ffmpeg exited with ' + c))));
const shot = t => page.evaluate(({ t, W, H }) => {
  const c = document.getElementById('c'); window.AN_TEASER.film.draw(c.getContext('2d'), t, W, H);
  return c.toDataURL('image/jpeg', 0.94).slice(23);
}, { t, W, H });
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  const jpg = Buffer.from(await shot(i / FPS), 'base64');
  if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % (FPS * 5) === 0) process.stdout.write(`  ${(i / FPS).toFixed(0)} s\r`);
}
ff.stdin.end();
await ffDone;
console.log(`  done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// 4. the poster (the title card) and a contact sheet of the six scenes
fs.writeFileSync(path.join(OUT, 'poster.jpg'), Buffer.from(await shot(film.POSTER), 'base64'));
const mids = film.CUTS.slice(0, -1).map((a, i) => (a + film.CUTS[i + 1]) / 2 + (i === 5 ? 1 : 0));
const tiles = [];
for (const [i, t] of mids.entries()) { const f = path.join(OUT, `.tile-${i}.jpg`); fs.writeFileSync(f, Buffer.from(await shot(t), 'base64')); tiles.push(f); }
execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...tiles.flatMap(f => ['-i', f]),
  '-filter_complex', tiles.map((_, i) => `[${i}:v]scale=640:-1[s${i}]`).join(';') + ';' + tiles.map((_, i) => `[s${i}]`).join('') + 'xstack=inputs=6:layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0',
  path.join(OUT, 'contact-sheet.jpg')]);
tiles.forEach(f => fs.rmSync(f));
await browser.close();
if (errors.length) throw new Error('page errors: ' + errors.join(' | '));

// 5. what the file really is, measured, and the production package
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', MP4]).toString());
const v = probe.streams.find(s => s.codec_type === 'video'), a = probe.streams.find(s => s.codec_type === 'audio'), sub = probe.streams.find(s => s.codec_type === 'subtitle');
// loudness as players measure it (EBU R128): ffmpeg prints the summary on stderr
const r128 = spawn(FF, ['-hide_banner', '-nostats', '-i', MP4, '-af', 'ebur128', '-f', 'null', '-']);
let r128log = ''; r128.stderr.on('data', d => { r128log += d; });
await new Promise(ok => r128.on('close', ok));
const lufs = +((r128log.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop() || 'I: NaN').replace(/[^-\d.]/g, '');
const meta = { lufs, file: path.basename(MP4), bytes: +probe.format.size, seconds: +(+probe.format.duration).toFixed(3), video: `${v.codec_name} ${v.width}×${v.height} ${v.r_frame_rate}`, audio: `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch`, subtitles: sub ? sub.codec_name : 'none', peakDb: +db(pcm.peak), rmsDb: +db(pcm.rms), fast: FAST };
fs.writeFileSync(path.join(OUT, 'film.json'), JSON.stringify(meta, null, 1) + '\n');
console.log(meta);

const fmt = x => x.toFixed(1).replace(/\.0$/, '');
const SCENE = ['یک نقطه‌ی نور در تاریکی بزرگ می‌شود و مداری دورش کشیده می‌شود.', 'شبکه‌ای چهارلایه؛ نشانه‌های نور از لایه‌ای به لایه‌ی بعد می‌روند و گره‌ها روشن می‌شوند.',
  'شهری در شب؛ پنجره‌ها روشن و خاموش می‌شوند، آنتن‌ها موج می‌فرستند و کمان‌هایی میان بام‌ها پیام جابه‌جا می‌کنند.', 'زمین و مریخ؛ مسیری نقطه‌چین از زمین تا مریخ کشیده می‌شود و فضاپیمایی کوچک آن را می‌پیماید.',
  'افقی آرام؛ شب به سپیده و روز می‌رسد، خورشید بالا می‌آید و ماه پایین می‌رود.', 'نام وبلاگ، شعار، نام سازنده و نشانی وبلاگ زیر همان نقطه‌ی نور و مدار.'];
const MUSIC = ['آغاز با زنگ آرام (۰٫۷ ثانیه) و پد گرم', 'آرپژ با پژواک از میزان ۳', 'باس از میزان ۵', 'ضرب از میزان ۹ (ثانیه‌ی ۲۰)', 'های‌هت میزان‌های ۱۱ تا ۱۴', 'صدای اوج‌گیرنده ۳۱ تا ۳۳٫۳ و زنگ پایانی ۳۴ ثانیه، آکورد ر ماژور'];
fs.writeFileSync(path.join(OUT, 'PRODUCTION.md'), `# بسته‌ی تولید ویدیوی معرفی «آینده‌نگار»

طراحی، مدیریت و نویسندگی: **امیرحسین همتی** · ayandehnegar.blogfa.com

این بسته را \`tools/teaser.mjs\` از روی همان کدی می‌سازد که وبلاگ ویدیو را با آن پخش می‌کند (\`src/addons/teaser.js\`). هر عدد این صفحه از خود فایل خوانده شده است.

## فایل نهایی (اندازه‌گیری‌شده با ffprobe)

| ویژگی | مقدار |
| --- | --- |
| فایل | \`${meta.file}\` |
| مدت | ${meta.seconds} ثانیه |
| تصویر | ${meta.video} |
| صدا | ${meta.audio}، AAC با ۱۹۲ کیلوبیت بر ثانیه |
| زیرنویس | فارسی، درون فایل (${meta.subtitles}) و جدا: \`captions.fa.vtt\` و \`captions.fa.srt\` |
| حجم | ${(meta.bytes / 1048576).toFixed(2)} مگابایت |
| بلندی کلی (EBU R128) | ${meta.lufs} LUFS |
| بلندترین قله‌ی صدا / میانگین (RMS) | ${meta.peakDb} / ${meta.rmsDb} dBFS |

ویدیو گفتار ندارد: فقط موسیقی، چند صدای کوتاه و متن روی تصویر. صدای گوینده در این نسخه نیست؛ متن پیشنهادی گوینده پایین همین صفحه آمده و ضبطش با خود سازنده است.

## فیلم‌نامه و فهرست نماها

| نما | زمان (ثانیه) | تصویر | متن روی تصویر |
| --- | --- | --- | --- |
${film.CUTS.slice(0, -1).map((a, i) => `| ${i + 1} | ${fmt(a)} تا ${fmt(film.CUTS[i + 1])} | ${SCENE[i]} | ${i < 5 ? film.LINES[i].t : 'آینده‌نگار؛ روایت انسان، ایده و فناوری · ' + 'طراحی، مدیریت و نویسندگی: امیرحسین همتی'} |`).join('\n')}

میان نماها ۰٫۶ ثانیه هم‌پوشانی محو هست؛ ویدیو از سیاهی شروع و به سیاهی تمام می‌شود.

## موسیقی و صداها (برگه‌ی نشانه‌ها)

۹۶ ضرب در دقیقه، ۱۶ میزان چهارضربی (۴۰ ثانیه)، در ر مینور: Dm، Bb، F، C و پایان روی D ماژور. همه‌ی صداها در مرورگر با Web Audio ساخته می‌شوند؛ هیچ نمونه‌ی صوتی، موسیقی یا جلوه‌ی آماده‌ای از جای دیگر در کار نیست.

${MUSIC.map(m => '- ' + m).join('\n')}
- صدای «ووش» در مرز هر نما: ${film.CUTS.slice(1, 6).map(fmt).join('، ')} ثانیه

## زیرنویس

${film.CAPS.map(c => `- ${fmt(c.a)} تا ${fmt(c.b)} ثانیه: ${c.t}`).join('\n')}

## متن پیشنهادی گوینده (اختیاری، ضبط‌نشده)

هر ایده، اول نقطه‌ای از نور است. ماشین‌ها از مثال‌ها یاد می‌گیرند، شهرها و اشیا با هم حرف می‌زنند و کنجکاوی ما را از زمین تا مریخ می‌برد. «آینده‌نگار»، روایت انسان، ایده و فناوری؛ با ساعت شما، در شب و روز.

## سازندگان و مجوزها

- طراحی، مدیریت و نویسندگی: امیرحسین همتی
- قلم: Vazirmatn، مجوز SIL Open Font License 1.1 (\`src/fonts/OFL.txt\`)
- تصویر و موسیقی: کد همین مخزن، بدون هیچ دارایی بیرونی
- ساخت فایل: Chromium (Playwright) برای قاب‌ها و صدا، ffmpeg برای کدگذاری H.264 و AAC

## بازسازی

\`\`\`
cd blogfa
node tools/teaser.mjs
\`\`\`
`);
console.log('production package → film/PRODUCTION.md');
