import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { loadConfigFromFile } from 'vite';

const root = resolve(import.meta.dirname, '..');
const loaded = await loadConfigFromFile({ command: 'serve', mode: 'production' }, resolve(root, 'vite.config.ts'));
const base = loaded.config.base || '/';
const url = `http://127.0.0.1:4173${base}`;
const server = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
server.stdout.on('data', data => { serverOutput += data; });
server.stderr.on('data', data => { serverOutput += data; });
const serverError = new Promise((_, reject) => server.once('error', reject));
const shots = resolve(root, 'layout-shots');
const failures = [];
let browser;

async function scaleFonts(page, factor) {
  if (factor === 1) return;
  await page.evaluate(scale => {
    const walk = rules => {
      for (const rule of rules) {
        const size = rule.style?.getPropertyValue('font-size');
        if (size && /^\d*\.?\d+px$/.test(size.trim())) {
          rule.style.setProperty('font-size', `${parseFloat(size) * scale}px`, rule.style.getPropertyPriority('font-size'));
        }
        // CSSMediaRule, CSSContainerRule ve iç içe gruplar da ölçeklenir.
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) walk(sheet.cssRules);
  }, factor);
}

async function check(page, label, screen, { session = false, tablet = false, rest = false } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const errors = await page.evaluate(({ session, tablet, rest }) => {
    const errors = [];
    const selector = el => el.id ? `#${CSS.escape(el.id)}` : `${el.localName}${[...el.classList].map(c => '.' + CSS.escape(c)).join('')}`;
    const visible = el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden' && el.checkVisibility();
    };
    const clipped = el => {
      for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(parent).overflowX)) return true;
      }
      return false;
    };
    if (document.scrollingElement.scrollWidth > innerWidth) errors.push('document.scrollingElement: yatay taşma');
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const rect = el.getBoundingClientRect();
      if ((rect.left < -1 || rect.right > innerWidth + 1) && !clipped(el)) errors.push(`${selector(el)}: yatay sınır dışında (${rect.left.toFixed(1)}–${rect.right.toFixed(1)})`);
    }
    // Kökün overflow:hidden olması içerik taşmasını gizlemesin.
    for (const el of document.querySelectorAll('.scr, .px .px-scr, .sheet-body, .ses2-body, .dock, .tabbar, .s-t.now-t, .px .px-sets-box, .px .px-ro-grid')) {
      if (visible(el) && el.scrollWidth > el.clientWidth + 1) errors.push(`${selector(el)}: içerik yatay taşıyor (${el.scrollWidth} > ${el.clientWidth})`);
    }
    // Pixel listeleri ekran genişliğinde olmalı (V13'te global `.sl` sınıfı listeyi 30 px'e sıkıştırmıştı).
    for (const el of document.querySelectorAll('.px .px-scroll, .px .addrow, .px .px-card, .px .pk')) {
      if (!visible(el)) continue;
      const root = el.closest('.px').getBoundingClientRect();
      const w = el.getBoundingClientRect().width;
      if (w < root.width * 0.7) errors.push(`${selector(el)}: pixel öğesi dar (${w.toFixed(1)} < ${(root.width * 0.7).toFixed(1)})`);
    }
    const tab = document.querySelector('.tabbar');
    const tr = tab?.getBoundingClientRect();
    if (!tr || tr.top < 0 || tr.bottom > innerHeight + 1 || tr.left < 0 || tr.right > innerWidth + 1) errors.push('.tabbar: tamamı ekranda değil');
    if (session) {
      const button = document.querySelector('#log-set');
      const br = button?.getBoundingClientRect();
      if (!br || !visible(button) || br.top < 0 || br.bottom >= tr.top || br.left < 0 || br.right > innerWidth) {
        errors.push(`#log-set: kaydırmadan görünmüyor (düğme ${br?.top.toFixed(1)}–${br?.bottom.toFixed(1)}, sekme ${tr?.top.toFixed(1)})`);
      }
      const sesBody = document.querySelector('.ses2-body');
      if (sesBody && sesBody.scrollTop !== 0) errors.push('.ses2-body: seans ana kabı kaydırılmış');
      const pxScr = document.querySelector('.px .px-scr');
      if (pxScr && pxScr.scrollTop !== 0) errors.push('.px .px-scr: pixel ekranı kaydırılmış');
      if ((document.querySelector('.free-session #pq-0') || document.querySelector('.px #pq-0')) && !document.querySelector('#rest-big') && ![...document.querySelectorAll('.ps-r')].some(visible)) errors.push('pliometrik: seans temas sayısı görünmüyor');
      if (rest) {
        const timer = [...document.querySelectorAll('#rest-big, .restchip, .px .px-rchip')].find(visible);
        const rr = timer?.getBoundingClientRect();
        if (!rr || rr.top < 0 || rr.bottom >= tr.top || rr.left < 0 || rr.right > innerWidth) errors.push('dinlenme sayacı: tamamı kaydırmadan görünmüyor');
        for (const control of timer?.querySelectorAll('button') || []) {
          const cr = control.getBoundingClientRect();
          if (!visible(control) || cr.top < rr.top || cr.bottom > rr.bottom + 1) errors.push('dinlenme sayacı: süre düğmesi kırpılıyor');
        }
      }
    }
    if (tablet && getComputedStyle(document.querySelector('.device')).borderRadius !== '0px') errors.push('.device: dokunmatik tablette telefon çerçevesi var');
    return errors;
  }, { session, tablet, rest });
  if (errors.length) {
    failures.push(...errors.map(error => `${label} · ${screen} · ${error}`));
  }
  if (errors.length || process.env.LAYOUT_SHOTS) {
    await page.screenshot({ path: resolve(shots, `${label}-${screen}.png`) });
  }
}

async function closeSheet(page) {
  await page.getByRole('dialog').last().getByRole('button', { name: 'Kapat', exact: true }).last().click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

async function flow(viewport, scale = 1, tablet = false, safeArea = false) {
  const label = `${viewport.width}x${viewport.height}${scale !== 1 ? '-115' : ''}${safeArea ? '-insets' : ''}`;
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.route('**/*googleapis.com/**', route => route.abort());
  await page.route('**/*firebase*/**', route => route.abort());
  let screen = 'bugun-bos';
  try {
    await page.goto(url);
    await page.locator('#goal-add').waitFor();
    await page.locator('.skeleton').waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts.ready);
    await scaleFonts(page, scale);
    if (safeArea) await page.addStyleTag({ content: ':root { --sat: 24px; --sab: 24px; }' });
    await check(page, label, screen, { tablet });

    screen = 'hedef-form';
    await page.locator('#goal-add').click();
    await check(page, label, screen);
    await page.locator('#goal-search').fill('bench');
    await page.getByRole('button', { name: 'Eğimli bench press', exact: true }).click();
    await page.locator('#goal-base').fill('95');
    await page.locator('#goal-base').blur();
    await page.locator('#goal-target').fill('100');
    await page.locator('#goal-target').blur();
    await page.locator('#goal-save').click();
    await page.locator('#goal-card').waitFor();
    screen = 'bugun-hedef';
    await check(page, label, screen);

    screen = 'gozlem';
    await page.locator('#tab-gozlem').click();
    await page.locator('#day-panel').waitFor();
    await check(page, label, screen);

    screen = 'antrenman-bos';
    await page.locator('#tab-antrenman').click();
    await check(page, label, screen);
    screen = 'plan-editor';
    await page.locator('#new-plan').click();
    await page.locator('.editor2').waitFor();
    await check(page, label, screen);
    await page.locator('#ed-back').click();

    await page.locator('#free-session').click();
    await page.locator('#ses-add-first').waitFor();
    screen = 'plansiz-liste-bos';
    await check(page, label, screen);
    await page.locator('#ses-add-first').click();
    screen = 'hareket-sec';
    await page.locator('#ex-search').fill('bench');
    await check(page, label, screen);
    await page.locator('.pk').filter({ hasText: 'Eğimli bench press' }).first().click();
    await page.locator('#pick-add').click();
    await page.locator('.card-main').first().waitFor();
    screen = 'plansiz-liste';
    await check(page, label, screen);
    await page.locator('.card-main').first().click();
    await page.locator('#log-set').waitFor();
    screen = 'seans-kuvvet';
    await check(page, label, screen, { session: true });

    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    screen = 'seans-set-kayitli';
    await check(page, label, screen, { session: true, rest: true });

    // Uzun set listesi yalnızca kendi içinde kaymalı; ana eylem yerinde kalmalı.
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: 'GİZLE' }).click();
      await page.locator('#log-set').click();
      await page.locator('#rest-big').waitFor();
    }
    await page.getByRole('button', { name: 'GİZLE' }).click();
    screen = 'seans-uzun-tablo';
    await check(page, label, screen, { session: true, rest: true });

    await page.locator('.px .px-rchip').click();
    await page.getByRole('button', { name: 'GEÇ' }).click();
    await page.getByRole('button', { name: 'Geri: antrenman listesi' }).click();
    await page.locator('#fx-add').click();
    await page.locator('#ex-search').fill('box jump');
    await page.locator('.pk').first().click();
    await page.locator('#pick-add').click();
    await page.locator('.card-main').nth(1).click();
    await page.locator('#pq-0').waitFor();
    screen = 'seans-plyo';
    await check(page, label, screen, { session: true });
    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    screen = 'seans-plyo-dinlenme';
    await check(page, label, screen, { session: true, rest: true });

    await page.getByRole('button', { name: 'GEÇ' }).click();
    await page.getByRole('button', { name: 'Geri: antrenman listesi' }).click();
    await page.locator('#fx-add').click();
    await page.locator('#ex-search').fill('kip-up');
    await page.locator('.pk').first().click();
    await page.locator('#pick-add').click();
    await page.locator('.card-main').nth(2).click();
    await page.locator('#sq-0').waitFor();
    screen = 'seans-beceri';
    await check(page, label, screen, { session: true });
    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    screen = 'seans-beceri-dinlenme';
    await check(page, label, screen, { session: true, rest: true });

    await page.getByRole('button', { name: 'GEÇ' }).click();
    await page.getByRole('button', { name: 'Geri: antrenman listesi' }).click();
    await page.locator('#finish-btn').click();
    await page.locator('#finish-yes').click();
    await page.locator('#pixel-summary').waitFor();
    screen = 'plansiz-ozet';
    await check(page, label, screen);
    await page.locator('#summary-done').click();

    screen = 'antrenman-gecmis';
    await page.locator('.hist-inline .hrow').first().waitFor();
    await check(page, label, screen);

    screen = 'planli-editor';
    await page.locator('#new-plan').click();
    await page.locator('#add-item').click();
    await page.locator('#ex-search').fill('düz bench');
    await page.locator('.exr-main').first().click();
    await page.locator('#ed-start').click();
    await page.locator('.tgt2').waitFor();
    screen = 'planli-seans';
    await check(page, label, screen, { session: true });
    await page.locator('#log-set').click();
    await page.locator('.restchip').waitFor();
    screen = 'planli-dinlenme';
    await check(page, label, screen, { session: true, rest: true });

    screen = 'lab-hareketler';
    await page.locator('#tab-lab').click();
    await page.locator('#lab-part-hareket').click();
    await check(page, label, screen);
    screen = 'hesap';
    await page.locator('#tab-bugun').click();
    await page.locator('#account-btn').click();
    await page.getByRole('dialog', { name: 'Hesap ve yedek' }).waitFor();
    await check(page, label, screen);
    await closeSheet(page);
    console.log(`${label}: akış tamamlandı`);
  } catch (error) {
    failures.push(`${label} · ${screen} · ${error.message}`);
    await page.screenshot({ path: resolve(shots, `${label}-${screen}-akis.png`) }).catch(() => {});
  } finally {
    await context.close();
  }
}

try {
  await mkdir(shots, { recursive: true });
  await Promise.race([serverError, (async () => {
    for (let i = 0; i < 80; i++) {
      if (server.exitCode !== null) throw new Error(`vite preview kapandı: ${serverOutput}`);
      try { if ((await fetch(url)).ok) return; } catch { /* sunucu açılıyor */ }
      await delay(250);
    }
    throw new Error(`vite preview açılamadı: ${serverOutput}`);
  })()]);
  browser = await chromium.launch();
  const cases = [[320, 568], [360, 640], [360, 800], [384, 832], [393, 873], [412, 915], [430, 932], [360, 720, 1.15], [411, 770, 1.15], [884, 1104], [320, 568, 1.15, true]];
  for (const [width, height, scale = 1, safeArea = false] of cases) {
    await flow({ width, height }, scale, width === 884, safeArea);
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    console.error(`Başarısız ekranlar: ${shots}`);
    process.exitCode = 1;
  } else console.log('Yerleşim kontrolü geçti.');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
