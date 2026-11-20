// Play Store ekran görüntüleri (V28). Örnek veriyle (yedek JSON) uygulamayı açar, ekranları 1080×1920 çeker.
// Kullanım: npm run build && node scripts/store-shots.mjs [en|tr]   → docs/play-store/raw/<dil>/*.png
// Örnek veri gerçek kullanıcı verisi değildir; yalnızca mağaza görselleri içindir.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { loadConfigFromFile } from 'vite';

const lang = process.argv[2] === 'tr' ? 'tr' : 'en';
const root = resolve(import.meta.dirname, '..');
const loaded = await loadConfigFromFile({ command: 'serve', mode: 'production' }, resolve(root, 'vite.config.ts'));
const base = loaded.config.base || '/';
const port = 4175;
const url = `http://127.0.0.1:${port}${base}`;
const out = resolve(root, 'docs/play-store/raw', lang);
await mkdir(out, { recursive: true });

// ---------- örnek veri ----------
const L = lang === 'tr'
  ? { program: 'Güç Bloğu', heavy: 'Ağır Gün', volume: 'Hacim Günü' }
  : { program: 'Strength Block', heavy: 'Heavy Day', volume: 'Volume Day' };
const EX = {
  incline: { exId: 'egimli-bench', name: 'Eğimli bench press', muscle: 'Göğüs' },
  dbPress: { exId: 'db-omuz-press', name: 'Oturarak dumbbell omuz press', muscle: 'Omuz (ön)' },
  shrug: { exId: 'bb-shrug', name: 'Barbell shrug', muscle: 'Trapez' },
  rdl: { exId: 'rdl', name: 'Romanian deadlift', muscle: 'Hamstring' },
  curl: { exId: 'leg-curl', name: 'Yatarak leg curl', muscle: 'Hamstring' },
  lateral: { exId: 'yana-acis', name: 'Yana açış', muscle: 'Omuz (yan)' },
};
const VL = [0.05, 0.18, 0.32, 0.47, 0.62];
const RIR = [5, 3, 2, 1, 0];
const DAY = 86400000;
const today = new Date(); today.setUTCHours(0, 0, 0, 0);
const at = (daysAgo, h, m = 0) => today.getTime() - daysAgo * DAY + (h * 60 + m) * 60000;
const item = (id, ex, sets, repMin, repMax, kg, rpeMin, rpeMax, rest) => ({ id, ...ex, sets, repMin, repMax, kg, rpeMin, rpeMax, rest, note: '' });
const heavyItems = [
  item('i_h1', EX.incline, 2, 5, 8, 75, 9, 10, 180),
  item('i_h2', EX.dbPress, 3, 8, 12, 22.5, 7, 8, 120),
  item('i_h3', EX.shrug, 2, 10, 15, 100, 9, 10, 90),
  item('i_h4', EX.rdl, 1, 8, 10, 100, 6, 7, 150),
  item('i_h5', EX.curl, 3, 8, 12, 45, 9, 10, 90),
];
const volumeItems = [
  item('i_v1', EX.incline, 5, 8, 12, 60, 6, 7, 120),
  item('i_v2', EX.rdl, 3, 8, 10, 100, 7, 8, 150),
  item('i_v3', EX.dbPress, 3, 10, 12, 20, 6, 7, 120),
  item('i_v4', EX.lateral, 3, 12, 15, 10, 8, 9, 75),
  item('i_v5', EX.curl, 2, 10, 12, 40, 7, 8, 90),
];
const program = {
  id: 'p_demo', name: L.program, createdAt: at(45, 9), updatedAt: at(2, 9),
  days: [
    { id: 'd_heavy', name: L.heavy, weekdays: [4], items: heavyItems },
    { id: 'd_volume', name: L.volume, weekdays: [2], items: volumeItems },
  ],
};
const set = (kg, reps, lvl, t) => ({ kg, reps, lvl, vl: VL[lvl], rpe: null, rir: RIR[lvl], rirEst: RIR[lvl], at: t });
const sessions = [];
// Son 6 hafta: salı hacim, perşembe ağır gün.
for (let d = 42; d >= 1; d--) {
  const date = new Date(today.getTime() - d * DAY);
  const wd = date.getUTCDay();
  if (wd !== 2 && wd !== 4) continue;
  const week = Math.floor((42 - d) / 7); // 0..5
  const heavy = wd === 4;
  const start = at(d, 18, 10);
  let t = start + 8 * 60000;
  const tick = (sec) => (t += sec * 1000);
  const items = (heavy ? heavyItems : volumeItems).map((p) => {
    const sets = [];
    for (let s = 0; s < p.sets; s++) {
      let kg = p.kg; let reps = p.repMin + 1; let lvl = 2;
      // Ağır gün üst setleri: tahmini 1RM ~93 → ~99 kg (hedef 100). Hacim günü setleri tükenişten uzak (1RM'e girmez).
      if (p.exId === 'egimli-bench' && heavy) { kg = [77.5, 77.5, 80, 80, 82.5, 82.5][week]; reps = s === 0 ? 5 : 4; lvl = s === 0 ? 3 : 2; }
      else if (p.exId === 'egimli-bench') { kg = 57.5 + Math.min(week, 4) * 1.25; reps = 10; lvl = 1; }
      else { kg = Math.round((p.kg + week * (p.kg >= 40 ? 2.5 : 1)) * 2) / 2; reps = Math.min(p.repMax, p.repMin + 2 - Math.floor(s / 2)); lvl = Math.min(4, 1 + Math.floor(s / 2) + (p.rpeMin >= 9 ? 1 : 0)); }
      tick(45);
      sets.push(set(kg, reps, lvl, t));
      tick(p.rest);
    }
    return { id: `si_${d}_${p.id}`, exId: p.exId, name: p.name, muscle: p.muscle, note: '', srcId: p.id,
      target: { sets: p.sets, repMin: p.repMin, repMax: p.repMax, kg: p.kg, rpeMin: p.rpeMin, rpeMax: p.rpeMax, rest: p.rest }, sets };
  });
  sessions.push({ id: `s_demo_${d}`, programId: program.id, programName: program.name, dayId: heavy ? 'd_heavy' : 'd_volume',
    dayName: heavy ? L.heavy : L.volume, startedAt: start, endedAt: t + 5 * 60000, status: 'done', items });
}
const sleepHours = [7.5, 6.8, 7.9, 7.2, 8.1, 6.5, 7.4, 7.7, 7.0, 8.0, 7.3, 6.9, 7.6, 7.8];
// Uyku kaydının kimliği gün anahtarıdır: c_YYYY-MM-DD (uygulama böyle arar).
const dayId = (ts) => 'c_' + new Date(ts).toISOString().slice(0, 10);
const checkins = sleepHours.map((sleep, i) => ({ id: dayId(at(i, 7, 30)), sleep, at: at(i, 7, 30) }));
const goals = [
  { id: 'g_demo_1', type: 'perf', exId: 'egimli-bench', name: 'Eğimli bench press', base: 95, target: 100, createdAt: at(40, 9) },
  { id: 'g_demo_2', type: 'skill', exId: 'serbest-amut', name: 'Serbest amut', stage: 1, createdAt: at(30, 9) },
];
const backup = { format: 'performance-backup', version: 2, exportedAt: new Date().toISOString(),
  data: { programs: [program], sessions, exercises: [], checkins, settings: [{ key: 'goals', value: goals }] } };
const backupFile = resolve(root, 'docs/play-store/raw', `demo-backup-${lang}.json`);
await writeFile(backupFile, JSON.stringify(backup, null, 2));

// ---------- ekranlar ----------
const server = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(url)).ok) break; } catch { /* bekle */ } await delay(200); }
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  // 432×768 @2.5 = 1080×1920 (9:16)
  const context = await browser.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true,
    reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'UTC', locale: lang === 'tr' ? 'tr-TR' : 'en-US' });
  if (lang === 'tr') await context.addInitScript(() => { try { localStorage.setItem('outmove.lang', 'tr'); } catch { /* yok */ } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('dialog', (d) => d.accept());
  await page.route('**/*googleapis.com/**', (r) => r.abort());
  await page.route('**/*firebase*/**', (r) => r.abort());
  const settle = async () => {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await delay(400);
  };
  const shot = async (name) => { await settle(); await page.screenshot({ path: resolve(out, `${name}.png`) }); console.log('✓', lang, name); };

  await page.goto(url);
  await page.locator('#legal-go').waitFor();
  await page.locator('#legal-terms').check();
  await page.locator('#legal-notice').check();
  await page.locator('#legal-go').click();
  await page.locator('.lg-gate').waitFor({ state: 'detached' });

  // Örnek yedeği geri yükle (Hesap ve ayarlar › Yedek › Geri yükle)
  await page.locator('#account-btn').click();
  await page.locator('.backup-card input[type=file]').setInputFiles(backupFile);
  await page.locator('.backup-status.ok').waitFor();
  await page.getByRole('dialog').last().getByRole('button', { name: lang === 'tr' ? 'Kapat' : 'Close', exact: true }).last().click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  // Misafir "yedekle" şeridi mağaza görselinde gizlenir (uygulamanın geri kalanı olduğu gibi).
  await page.addStyleTag({ content: '#guest-banner { display: none !important; }' });
  await page.locator('#tab-bugun').click();
  await page.locator('#goal-card').waitFor();
  await shot('01-dashboard');

  await page.locator('#tab-gozlem').click();
  await page.locator('#day-panel').waitFor();
  await shot('04-insights');
  await page.locator('#obs-fatigue').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await shot('07-progress');

  await page.locator('#tab-antrenman').click();
  await shot('05-workout');

  // Plansız antrenman: eğimli bench, iki set
  await page.locator('#free-session').click();
  await page.locator('#ses-add-first').click();
  await page.locator('#ex-search').fill('incline');
  await page.locator('.pk').filter({ hasText: lang === 'tr' ? 'Eğimli bench press' : 'Incline barbell bench press' }).first().click();
  await page.locator('#pick-add').click();
  await page.locator('.card-main').first().click();
  await page.locator('#log-set').waitFor();
  await page.locator('#log-set').click();
  await page.locator('#rest-big').waitFor();
  await page.locator('.px-toast').waitFor({ state: 'detached', timeout: 12000 }).catch(() => page.addStyleTag({ content: '.px-toast { display: none !important; }' }));
  await shot('03-rest');
  await page.getByRole('button', { name: lang === 'tr' ? 'GEÇ' : 'SKIP' }).click();
  await page.locator('#log-set').waitFor();
  await shot('02-session');

  await page.getByRole('button', { name: lang === 'tr' ? 'Geri: antrenman listesi' : 'Back: workout list' }).click();
  await page.locator('#tab-lab').click();
  await page.locator('#lab-part-hareket').click();
  await shot('06-lab');
  await page.getByText(lang === 'tr' ? 'Eğimli bench press' : 'Incline barbell bench press', { exact: true }).first().click();
  await delay(800);
  await shot('08-biomech');
} finally {
  await browser?.close();
  server.kill();
}
