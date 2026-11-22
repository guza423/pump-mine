// Play Store vitrin görselleri (V28). Ham ekran görüntülerinden (store-shots.mjs) başlıklı 1080×1920 görseller,
// 1024×500 öne çıkan görsel üretir → docs/play-store/{en,tr}/. İkon: docs/play-store/icon-512.png = public/icon-512.png'nin
// RGBA (32 bit) kopyası; Play alfa kanallı PNG istiyor. Yeniden üretmek için:
//   python3 -c "from PIL import Image; Image.open('public/icon-512.png').convert('RGBA').save('docs/play-store/icon-512.png')"
// Kullanım: node scripts/store-art.mjs   (CHROME_PATH gerekebilir)
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const dir = resolve(root, 'docs/play-store');
const fu = (p) => pathToFileURL(resolve(root, p)).href;
const F = 'node_modules/@fontsource';
const fonts = `
@font-face { font-family: 'Saira'; font-weight: 100 900; font-stretch: 50% 125%; src: url(${fu(F + '-variable/saira/files/saira-latin-wdth-normal.woff2')}) format('woff2-variations'); unicode-range: U+0000-00FF; }
@font-face { font-family: 'Saira'; font-weight: 100 900; font-stretch: 50% 125%; src: url(${fu(F + '-variable/saira/files/saira-latin-ext-wdth-normal.woff2')}) format('woff2-variations'); unicode-range: U+0100-024F, U+1E00-1EFF; }
@font-face { font-family: 'Plex'; font-weight: 400; src: url(${fu(F + '/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2')}); unicode-range: U+0000-00FF; }
@font-face { font-family: 'Plex'; font-weight: 400; src: url(${fu(F + '/ibm-plex-sans/files/ibm-plex-sans-latin-ext-400-normal.woff2')}); unicode-range: U+0100-024F; }
@font-face { font-family: 'Plex'; font-weight: 600; src: url(${fu(F + '/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2')}); unicode-range: U+0000-00FF; }
@font-face { font-family: 'Plex'; font-weight: 600; src: url(${fu(F + '/ibm-plex-sans/files/ibm-plex-sans-latin-ext-600-normal.woff2')}); unicode-range: U+0100-024F; }
@font-face { font-family: 'Px'; src: url(${fu(F + '/press-start-2p/files/press-start-2p-latin-400-normal.woff2')}); }`;
const base = `${fonts}
* { box-sizing: border-box; margin: 0; }
html, body { background: #100e1b; color: #f5f1e8; }
body { background-image: linear-gradient(rgba(255,255,255,.035) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.035) 2px, transparent 2px); background-size: 40px 40px; overflow: hidden; }
.px { font-family: 'Px', monospace; }
.gold { color: #ffc53d; } .fire { color: #ff5b3a; }`;

const SHOTS = {
  en: [
    ['02-session', 'LOG A SET', 'IN SECONDS', 'Drag weight and reps. Tap how fast the last rep moved.'],
    ['01-dashboard', 'KNOW WHEN', 'TO PUSH', 'Fatigue from your sets and sleep, always up to date.'],
    ['07-progress', 'WATCH YOUR', 'STRENGTH CLIMB', 'Estimated 1RM, goals and smart alerts.'],
    ['03-rest', 'REST TIMER', 'ON YOUR SIDE', 'Drag to adjust. It alerts you when rest is over.'],
    ['05-workout', 'PLAN IT', 'OR JUST LIFT', 'Build plans in minutes or start a quick workout.'],
    ['04-insights', 'YOUR WEEKS', 'AT A GLANCE', 'Calendar, repeating days and a monthly summary.'],
    ['06-lab', '466', 'EXERCISES', 'Strength, Olympic, plyometric and skill. All searchable.'],
    ['08-biomech', 'SEE THE', 'BIOMECHANICS', 'Joint torque through the full range of motion.'],
  ],
  tr: [
    ['02-session', 'SETİ SANİYELER', 'İÇİNDE KAYDET', 'Kilo ve tekrarı sürükle. Son tekrarın hızına dokun.'],
    ['01-dashboard', 'NE ZAMAN', 'YÜKLENECEĞİNİ BİL', 'Setlerinden ve uykundan hesaplanan güncel yorgunluk.'],
    ['07-progress', 'GÜCÜNÜN', 'ARTIŞINI İZLE', 'Tahmini 1RM, hedefler ve akıllı uyarılar.'],
    ['03-rest', 'DİNLENME', 'SAYACI YANINDA', 'Sürükleyerek ayarla. Dinlenme bitince haber verir.'],
    ['05-workout', 'PLANLA YA DA', 'HEMEN BAŞLA', 'Dakikalar içinde plan kur ya da plansız antrenmana gir.'],
    ['04-insights', 'HAFTALARIN', 'TEK BAKIŞTA', 'Takvim, tekrar eden günler ve aylık özet.'],
    ['06-lab', '466', 'HAREKET', 'Kuvvet, olimpik, pliometrik ve beceri. Hepsi aranabilir.'],
    ['08-biomech', 'BİYOMEKANİĞİ', 'GÖR', 'Hareket boyunca eklem torku, adım adım.'],
  ],
};

const shotPage = (img, l1, l2, sub) => `<!doctype html><html><head><meta charset="utf-8"><style>${base}
body { width: 1080px; height: 1920px; position: relative; }
.head { position: absolute; left: 72px; right: 72px; top: 92px; }
h1 { font-family: 'Saira'; font-weight: 800; font-stretch: 112%; font-size: 92px; line-height: .98; letter-spacing: -.5px; text-transform: uppercase; }
h1 .gold { display: block; }
p { font-family: 'Plex'; font-weight: 400; font-size: 38px; line-height: 1.32; color: #aaa4ca; margin-top: 26px; max-width: 900px; }
.mark { position: absolute; right: 72px; top: 104px; width: 22px; height: 22px; background: #ff5b3a; box-shadow: -34px 0 0 #ffc53d, -68px 0 0 #4fa8ff; }
.phone { position: absolute; left: 50%; top: 520px; width: 760px; transform: translateX(-50%); border: 8px solid #3c3660; background: #3c3660; box-shadow: 16px 16px 0 #07060d; }
.phone img { display: block; width: 100%; }
</style></head><body>
<div class="mark"></div>
<div class="head"><h1>${l1}<span class="gold">${l2}</span></h1><p>${sub}</p></div>
<div class="phone"><img src="${pathToFileURL(img).href}"></div>
</body></html>`;

const featurePage = (img, lang) => `<!doctype html><html><head><meta charset="utf-8"><style>${base}
body { width: 1024px; height: 500px; position: relative; }
.brand { position: absolute; left: 64px; top: 70px; }
.row { display: flex; align-items: center; gap: 26px; }
.mark { width: 112px; height: 112px; image-rendering: pixelated; box-shadow: 8px 8px 0 #07060d; border-radius: 24px; }
.logo { font-size: 50px; line-height: 1; letter-spacing: 2px; color: #f5f1e8; text-shadow: 5px 5px 0 #ff5b3a; }
.tag { font-family: 'Saira'; font-weight: 800; font-stretch: 112%; font-size: 44px; line-height: 1.05; margin-top: 34px; text-transform: uppercase; }
.sub { font-family: 'Plex'; font-size: 22px; color: #aaa4ca; margin-top: 18px; }
.bar { position: absolute; left: 64px; bottom: 64px; display: flex; gap: 10px; }
.bar i { width: 26px; height: 26px; background: #ffc53d; display: block; }
.bar i:nth-child(n+6) { background: #302b4c; }
.phone { position: absolute; right: 70px; top: 46px; width: 300px; border: 6px solid #3c3660; background: #3c3660; box-shadow: 12px 12px 0 #07060d; transform: rotate(4deg); }
.phone img { display: block; width: 100%; }
</style></head><body>
<div class="brand"><div class="row"><img class="mark" src="${fu('public/icon-512.png')}"><div class="px logo">OUTMOVE</div></div><div class="tag">${lang === 'tr' ? 'Hızlı kaydet.<br><span class="gold">Akıllı çalış.</span>' : 'Log fast.<br><span class="gold">Train smart.</span>'}</div><div class="sub">${lang === 'tr' ? 'Antrenman günlüğü · yorgunluk · gelişim' : 'Workout log · fatigue · progress'}</div></div>
<div class="bar"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
<div class="phone"><img src="${pathToFileURL(img).href}"></div>
</body></html>`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const render = async (html, path, w, h) => {
    await page.setViewportSize({ width: w, height: h });
    // file:// yazı tipi ve görselleri yüklensin diye sayfa da dosyadan açılır.
    const tmp = resolve(tmpdir(), `outmove-art-${process.pid}.html`);
    await writeFile(tmp, html);
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
    await rm(tmp, { force: true });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path, clip: { x: 0, y: 0, width: w, height: h } });
    console.log('✓', path.replace(root + '/', ''));
  };
  for (const lang of ['en', 'tr']) {
    await mkdir(resolve(dir, lang), { recursive: true });
    let n = 1;
    for (const [name, l1, l2, sub] of SHOTS[lang]) {
      const img = resolve(dir, 'raw', lang, name + '.png');
      await render(shotPage(img, l1, l2, sub), resolve(dir, lang, `${String(n).padStart(2, '0')}-${name.slice(3)}.png`), 1080, 1920);
      n++;
    }
  }
  for (const lang of ['en', 'tr']) await render(featurePage(resolve(dir, `raw/${lang}/02-session.png`), lang), resolve(dir, lang, 'feature-graphic.png'), 1024, 500);
} finally {
  await browser.close();
}
