import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { createServer, loadConfigFromFile } from 'vite';

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
// V26 · ekran adları uygulamanın kendi sözlüğünden: aynı akış her dilde koşar (Türkçe akış ayrı, flow()).
const i18nServer = await createServer({ root, configFile: resolve(root, 'vite.config.ts'), server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
const i18n = await i18nServer.ssrLoadModule('/src/i18n/index.ts');
const names = await i18nServer.ssrLoadModule('/src/i18n/names.ts');
const appDocs = await i18nServer.ssrLoadModule('/src/legal/appDocs.ts');
await i18nServer.close();
const LANG_IDS = i18n.LANGS.map((l) => l.id).filter((id) => id !== 'tr');
const words = (lang) => {
  const on = (f) => (...a) => { i18n.setLang(lang, false); return f(...a); };
  return { T: on(i18n.t), X: on((id) => names.exName({ exId: id })), D: on(appDocs.appDocTitle) };
};
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
  // Pixel ekran giriş animasyonu (pxScrIn, 26 px kayarak gelir) "Animasyonlar" açıkken azaltılmış harekette de oynar;
  // ölçüm animasyon bitmeden yapılırsa düğme anlık olarak ekran dışında görünür (V32: CI'da rastgele kırılıyordu).
  // Sonsuz döngülü süslemeler beklenmez.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity), null, { timeout: 3000 }).catch(() => {});
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
      // V13.1: dinlenme sürerken (büyük sayaç gizliyse) kaydet düğmesinin yerinde dinlenme çubuğu durur.
      const button = document.querySelector('#log-set') || document.querySelector('.px .px-restbar');
      const br = button?.getBoundingClientRect();
      if (!br || !visible(button) || br.top < 0 || br.bottom >= tr.top || br.left < 0 || br.right > innerWidth) {
        errors.push(`#log-set / .px-restbar: kaydırmadan görünmüyor (düğme ${br?.top.toFixed(1)}–${br?.bottom.toFixed(1)}, sekme ${tr?.top.toFixed(1)})`);
      }
      const sesBody = document.querySelector('.ses2-body');
      if (sesBody && sesBody.scrollTop !== 0) errors.push('.ses2-body: seans ana kabı kaydırılmış');
      const pxScr = document.querySelector('.px .px-scr');
      if (pxScr && pxScr.scrollTop !== 0) errors.push('.px .px-scr: pixel ekranı kaydırılmış');
      if ((document.querySelector('.free-session #pq-0') || document.querySelector('.px #pq-0')) && !document.querySelector('#rest-big') && ![...document.querySelectorAll('.ps-r')].some(visible)) errors.push('pliometrik: seans temas sayısı görünmüyor');
      if (rest) {
        const timer = [...document.querySelectorAll('#rest-big, .restchip, .px .px-rchip, .px .px-restbar')].find(visible);
        const rr = timer?.getBoundingClientRect();
        if (!rr || rr.top < 0 || rr.bottom >= tr.top || rr.left < 0 || rr.right > innerWidth) errors.push('dinlenme sayacı: tamamı kaydırmadan görünmüyor');
        // V34 · dinlenme ekranında set özelliği düğmesi üstteki yazıların üstüne binmemeli
        const ask = document.querySelector('#set-attr-btn');
        const mid = document.querySelector('.px-rest-mid');
        if (ask && mid && visible(ask)) {
          const last = [...mid.children].filter(visible).at(-1);
          if (last && last.getBoundingClientRect().bottom > ask.getBoundingClientRect().top + 1) errors.push('dinlenme: set özelliği düğmesi üstteki yazıyla çakışıyor');
        }
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

async function closeSheet(page, name = 'Kapat') {
  await page.getByRole('dialog').last().getByRole('button', { name, exact: true }).last().click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

async function flow(viewport, scale = 1, tablet = false, safeArea = false) {
  const label = `${viewport.width}x${viewport.height}${scale !== 1 ? '-115' : ''}${safeArea ? '-insets' : ''}`;
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  // Ana akış Türkçe metinlerle yazıldı; İngilizce (varsayılan) ekranlar flowEn'de (V21).
  await context.addInitScript(() => { try { localStorage.setItem('outmove.lang', 'tr'); } catch { /* yok */ } });
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
    // V20: ilk açılışta yasal kabul kapısı
    screen = 'yasal-kapi';
    await page.locator('#legal-go').waitFor();
    await check(page, label, screen, { tablet });
    screen = 'yasal-metin';
    await page.locator('#legal-open-gizlilik').click();
    await page.locator('.lg-gate-doc').waitFor();
    await check(page, label, screen, { tablet });
    await page.locator('#legal-back').click();
    await page.locator('#legal-terms').check();
    await page.locator('#legal-notice').check();
    await page.locator('#legal-go').click();
    await page.locator('.lg-gate').waitFor({ state: 'detached' });
    screen = 'bugun-bos';
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
    // V33 · ısınma seti, hedef tekrar aralığı penceresi
    await page.locator('#speed-warm').click();
    screen = 'seans-isinma-seti';
    await check(page, label, screen, { session: true });
    await page.locator('#speed-warm').click();
    await page.locator('#rep-range').click();
    await page.locator('#range-ok').waitFor();
    screen = 'hedef-aralik';
    await check(page, label, screen);
    await page.locator('#range-ok').click();
    await page.locator('#range-ok').waitFor({ state: 'detached' });
    screen = 'seans-aralikli';
    await check(page, label, screen, { session: true });

    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    screen = 'seans-set-kayitli';
    await check(page, label, screen, { session: true, rest: true });
    // V34 · set özelliği dinlenmede
    await page.locator('#set-attr-btn').click();
    await page.locator('#attr-save').waitFor();
    screen = 'set-ozelligi';
    await check(page, label, screen);
    await page.locator('#set-attrs .fchip').first().click();
    await page.locator('#set-conds .fchip').nth(1).click();
    await page.locator('#attr-save').click();
    await page.locator('#attr-save').waitFor({ state: 'detached' });
    screen = 'seans-ozellikli-dinlenme';
    await check(page, label, screen, { session: true, rest: true });

    // Uzun set listesi yalnızca kendi içinde kaymalı; ana eylem yerinde kalmalı.
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: 'GEÇ' }).click();
      await page.locator('#log-set').click();
      await page.locator('#rest-big').waitFor();
    }
    await page.getByRole('button', { name: 'GİZLE' }).click();
    screen = 'seans-uzun-tablo';
    await check(page, label, screen, { session: true, rest: true });

    await page.locator('.px .px-restbar').click();
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
    // V33 · antrenman öncesi ısınma (süre + nabız skalası)
    await page.locator('#fx-add').click();
    await page.locator('#ex-search').fill('ısınma');
    await page.locator('.pk').filter({ hasText: 'Antrenman öncesi ısınma' }).first().click();
    await page.locator('#pick-add').click();
    await page.locator('.card-main').nth(3).click();
    await page.locator('#hz-3').waitFor();
    screen = 'seans-isinma';
    await check(page, label, screen, { session: true });
    await page.locator('#hz-4').click();
    await page.locator('#log-set').click();
    await page.getByRole('button', { name: 'Geri: antrenman listesi' }).click();
    screen = 'plansiz-liste-isinma';
    await check(page, label, screen);
    // İDMANI BİTİR yarım saniye basılı tutulur (HoldButton)
    const fb = await page.locator('#finish-btn').boundingBox();
    await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
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
    // V18: hareket seçilince set/tekrar penceresi kendiliğinden açılır (sürüklemeli ayarlar)
    screen = 'plan-hareket-ayar';
    await page.locator('.sheet-wrap .px-dr-bar').first().waitFor();
    await check(page, label, screen);
    // V29: notlu hareket (en uzun hedef şeridi) planlı pixel ekranında denenir
    await page.locator('.sheet-wrap .fchip.sm[aria-pressed]').nth(0).click();
    await page.locator('.sheet-wrap .fchip.sm[aria-pressed]').nth(4).click();
    await page.locator('.sheet-wrap .x-btn').last().click();
    await page.locator('.sheet-wrap').waitFor({ state: 'detached' });
    await page.locator('#ed-start').click();
    await page.locator('.px-card.cur').waitFor();
    screen = 'planli-liste';
    await check(page, label, screen);
    await page.locator('.px-card.cur .card-main').click();
    await page.locator('.px-plan').waitFor();
    screen = 'planli-seans';
    await check(page, label, screen, { session: true });
    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    screen = 'planli-dinlenme';
    await check(page, label, screen, { session: true, rest: true });
    // V34 · ısınma seti kutucukların önüne eklenir: iki satır
    await page.getByRole('button', { name: 'GEÇ' }).click();
    await page.locator('#speed-warm').click();
    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    await page.getByRole('button', { name: 'GEÇ' }).click();
    await page.locator('.px-slots .st.wu').waitFor();
    screen = 'planli-seans-iki-satir';
    await check(page, label, screen, { session: true });

    // V32 · kayıt dolu Gözlem: hareket gelişimi (liste + hareket) ve bu hafta yapılan yük
    screen = 'gozlem-dolu';
    await page.locator('#tab-gozlem').click();
    await page.locator('#day-panel').waitFor();
    await check(page, label, screen);
    screen = 'gelisim-liste';
    await page.locator('#obs-progress').click();
    await page.locator('.prog-row').first().waitFor();
    await check(page, label, screen);
    screen = 'gelisim-hareket';
    await page.locator('.prog-row').first().click();
    await page.locator('.prog-detail').waitFor();
    await check(page, label, screen);
    await page.getByRole('dialog').last().getByRole('button', { name: 'Kapat', exact: true }).last().click();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1);
    await closeSheet(page);
    screen = 'yapilan-yuk';
    await page.locator('#obs-done').click();
    await page.locator('.week-done').waitFor();
    await check(page, label, screen);
    await closeSheet(page);

    screen = 'lab-hareketler';
    await page.locator('#tab-lab').click();
    await page.locator('#lab-part-hareket').click();
    await check(page, label, screen);
    // V35: hareket bilgisinde kas payları (Göğüs + Omuz (ön) ½, Triceps ½)
    screen = 'hareket-bilgi';
    await page.locator('.screen [id$="-search"]').first().fill('deadlift');
    await page.locator('#labex-deadlift').click();
    await page.locator('.sheet-wrap .facts').waitFor();
    await check(page, label, screen);
    await closeSheet(page);
    screen = 'hesap';
    await page.locator('#tab-bugun').click();
    await page.locator('#account-btn').click();
    await page.getByRole('dialog', { name: 'Hesap ve ayarlar' }).waitFor();
    await check(page, label, screen);
    screen = 'yasal-kosullar';
    await page.locator('#legal-kosullar').click();
    await page.getByRole('dialog', { name: 'Kullanım Koşulları' }).waitFor();
    await check(page, label, screen);
    await page.getByRole('dialog').last().getByRole('button', { name: 'Kapat', exact: true }).last().click();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1);
    await closeSheet(page);
    console.log(`${label}: akış tamamlandı`);
  } catch (error) {
    failures.push(`${label} · ${screen} · ${error.message}`);
    await page.screenshot({ path: resolve(shots, `${label}-${screen}-akis.png`) }).catch(() => {});
  } finally {
    await context.close();
  }
}

// V21 · İngilizce ekranlar (varsayılan dil); V26'dan beri Türkçe dışındaki her dil için aynı akış (adlar sözlükten).
async function flowLang(lang, viewport, scale = 1, tablet = false, safeArea = false) {
  const { T, X, D } = words(lang);
  const label = `${lang}-${viewport.width}x${viewport.height}${scale !== 1 ? '-115' : ''}${safeArea ? '-insets' : ''}`;
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.route('**/*googleapis.com/**', route => route.abort());
  await page.route('**/*firebase*/**', route => route.abort());
  let screen = 'gate';
  try {
    // İngilizce varsayılan dildir (seçim yok); diğer diller açılmadan önce seçilmiş gibi başlar.
    if (lang !== 'en') await page.addInitScript((l) => localStorage.setItem('outmove.lang', l), lang);
    await page.goto(url);
    await page.locator('#legal-go').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await scaleFonts(page, scale);
    if (safeArea) await page.addStyleTag({ content: ':root { --sat: 24px; --sab: 24px; }' });
    if (await page.evaluate(() => document.documentElement.lang) !== lang) throw new Error(lang === 'en' ? 'varsayılan dil İngilizce değil' : `dil ${lang} değil`);
    await check(page, label, screen, { tablet });
    screen = 'gate-privacy';
    await page.locator('#legal-open-gizlilik').click();
    await page.locator('.lg-gate-doc').waitFor();
    await check(page, label, screen, { tablet });
    await page.locator('#legal-back').click();
    screen = 'gate-terms';
    await page.locator('#legal-open-kosullar').click();
    await page.getByRole('dialog', { name: D('kosullar') }).waitFor();
    await check(page, label, screen, { tablet });
    await page.locator('#legal-back').click();
    await page.locator('#legal-terms').check();
    await page.locator('#legal-notice').check();
    await page.locator('#legal-go').click();
    await page.locator('.lg-gate').waitFor({ state: 'detached' });
    screen = 'dashboard-empty';
    await page.locator('#goal-add').waitFor();
    await check(page, label, screen, { tablet });
    screen = 'goal-form';
    await page.locator('#goal-add').click();
    await check(page, label, screen);
    await page.locator('#goal-search').fill('bench');
    await page.getByRole('button', { name: X('egimli-bench'), exact: true }).click();
    await page.locator('#goal-base').fill('95');
    await page.locator('#goal-base').blur();
    await page.locator('#goal-target').fill('100');
    await page.locator('#goal-target').blur();
    await page.locator('#goal-save').click();
    await page.locator('#goal-card').waitFor();
    screen = 'dashboard-goal';
    await page.locator('.sl').nth(0).click();
    await check(page, label, screen);
    screen = 'fatigue';
    await page.locator('#ready-ring').click();
    await page.getByRole('dialog', { name: T('Yorgunluk ölçer') }).waitFor();
    await check(page, label, screen);
    await closeSheet(page, T('Kapat'));
    screen = 'account';
    await page.locator('#account-btn').click();
    await page.getByRole('dialog', { name: T('Hesap ve ayarlar') }).waitFor();
    await check(page, label, screen);
    // V25 · uygulama içindeki İngilizce yasal metin
    screen = 'account-legal-privacy';
    await page.locator('#legal-gizlilik').click();
    await page.getByRole('dialog', { name: D('gizlilik') }).waitFor();
    await check(page, label, screen);
    await page.getByRole('dialog').last().getByRole('button', { name: T('Kapat'), exact: true }).last().click();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1);
    screen = 'account-tr';
    await page.locator('#lang-tr').click();
    await page.getByRole('dialog', { name: 'Hesap ve ayarlar' }).waitFor();
    await check(page, label, screen);
    await page.locator(`#lang-${lang}`).click();
    await page.getByRole('dialog', { name: T('Hesap ve ayarlar') }).waitFor();
    await closeSheet(page, T('Kapat'));

    // V22 · Workout sekmesi (İngilizce metinler Türkçeden uzun olabilir)
    screen = 'workout-empty';
    await page.locator('#tab-antrenman').click();
    await check(page, label, screen);
    screen = 'plan-editor';
    await page.locator('#new-plan').click();
    await page.locator('.editor2').waitFor();
    await check(page, label, screen);
    await page.locator('#ed-back').click();
    await page.locator('#free-session').click();
    await page.locator('#ses-add-first').waitFor();
    screen = 'quick-list-empty';
    await check(page, label, screen);
    await page.locator('#ses-add-first').click();
    screen = 'picker';
    await page.locator('#ex-search').fill('bench');
    await check(page, label, screen);
    await page.locator('.pk').filter({ hasText: X('egimli-bench') }).first().click();
    await page.locator('#pick-add').click();
    await page.locator('.card-main').first().waitFor();
    screen = 'quick-list';
    await check(page, label, screen);
    await page.locator('.card-main').first().click();
    await page.locator('#log-set').waitFor();
    screen = 'session-strength';
    await check(page, label, screen, { session: true });
    // V33 · warm-up set, target rep range window
    await page.locator('#speed-warm').click();
    screen = 'session-warm-set';
    await check(page, label, screen, { session: true });
    await page.locator('#speed-warm').click();
    await page.locator('#rep-range').click();
    await page.locator('#range-ok').waitFor();
    screen = 'rep-range';
    await check(page, label, screen);
    await page.locator('#range-ok').click();
    await page.locator('#range-ok').waitFor({ state: 'detached' });
    screen = 'session-ranged';
    await check(page, label, screen, { session: true });
    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    screen = 'session-rest';
    await check(page, label, screen, { session: true, rest: true });
    // V34 · set details on the rest screen
    await page.locator('#set-attr-btn').click();
    await page.locator('#attr-save').waitFor();
    screen = 'set-details';
    await check(page, label, screen);
    await page.locator('#set-attrs .fchip').first().click();
    await page.locator('#set-conds .fchip').nth(1).click();
    await page.locator('#attr-save').click();
    await page.locator('#attr-save').waitFor({ state: 'detached' });
    screen = 'session-rest-details';
    await check(page, label, screen, { session: true, rest: true });
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: T('GEÇ') }).click();
      await page.locator('#log-set').click();
      await page.locator('#rest-big').waitFor();
    }
    await page.getByRole('button', { name: T('GİZLE') }).click();
    screen = 'session-long-table';
    await check(page, label, screen, { session: true, rest: true });
    await page.locator('.px .px-restbar').click();
    await page.getByRole('button', { name: T('GEÇ') }).click();
    await page.getByRole('button', { name: T('Geri: antrenman listesi') }).click();
    await page.locator('#fx-add').click();
    await page.locator('#ex-search').fill('box jump');
    await page.locator('.pk').first().click();
    await page.locator('#pick-add').click();
    await page.locator('.card-main').nth(1).click();
    await page.locator('#pq-0').waitFor();
    screen = 'session-plyo';
    await check(page, label, screen, { session: true });
    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    await page.getByRole('button', { name: T('GEÇ') }).click();
    await page.getByRole('button', { name: T('Geri: antrenman listesi') }).click();
    await page.locator('#fx-add').click();
    await page.locator('#ex-search').fill('kip-up');
    await page.locator('.pk').first().click();
    await page.locator('#pick-add').click();
    await page.locator('.card-main').nth(2).click();
    await page.locator('#sq-0').waitFor();
    screen = 'session-skill';
    await check(page, label, screen, { session: true });
    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    screen = 'session-skill-rest';
    await check(page, label, screen, { session: true, rest: true });
    await page.getByRole('button', { name: T('GEÇ') }).click();
    await page.getByRole('button', { name: T('Geri: antrenman listesi') }).click();
    // V33 · pre-workout warm-up (duration + heart-rate scale)
    await page.locator('#fx-add').click();
    await page.locator('#ex-search').fill(X('isinma'));
    await page.locator('.pk').filter({ hasText: X('isinma') }).first().click();
    await page.locator('#pick-add').click();
    await page.locator('.card-main').nth(3).click();
    await page.locator('#hz-3').waitFor();
    screen = 'session-warmup';
    await check(page, label, screen, { session: true });
    await page.locator('#hz-4').click();
    await page.locator('#log-set').click();
    await page.getByRole('button', { name: T('Geri: antrenman listesi') }).click();
    screen = 'quick-list-warmup';
    await check(page, label, screen);
    const fbEn = await page.locator('#finish-btn').boundingBox();
    await page.mouse.move(fbEn.x + fbEn.width / 2, fbEn.y + fbEn.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    await page.locator('#pixel-summary').waitFor();
    screen = 'quick-summary';
    await check(page, label, screen);
    await page.locator('#summary-done').click();
    screen = 'workout-history';
    await page.locator('.hist-inline .hrow').first().waitFor();
    await check(page, label, screen);
    screen = 'plan-item-settings';
    await page.locator('#new-plan').click();
    await page.locator('#add-item').click();
    await page.locator('#ex-search').fill('barbell bench');
    await page.locator('.exr-main').first().click();
    await page.locator('.sheet-wrap .px-dr-bar').first().waitFor();
    await check(page, label, screen);
    await page.locator('.sheet-wrap .fchip.sm[aria-pressed]').nth(0).click();
    await page.locator('.sheet-wrap .fchip.sm[aria-pressed]').nth(4).click();
    await page.locator('.sheet-wrap .x-btn').last().click();
    await page.locator('.sheet-wrap').waitFor({ state: 'detached' });
    await page.locator('#ed-start').click();
    await page.locator('.px-card.cur').waitFor();
    screen = 'planned-list';
    await check(page, label, screen);
    await page.locator('.px-card.cur .card-main').click();
    await page.locator('.px-plan').waitFor();
    screen = 'planned-session';
    await check(page, label, screen, { session: true });
    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    screen = 'planned-rest';
    await check(page, label, screen, { session: true, rest: true });
    // V34 · warm-up set goes in front of the slots: two rows
    await page.getByRole('button', { name: T('GEÇ') }).click();
    await page.locator('#speed-warm').click();
    await page.locator('#log-set').click();
    await page.locator('#rest-big').waitFor();
    await page.getByRole('button', { name: T('GEÇ') }).click();
    await page.locator('.px-slots .st.wu').waitFor();
    screen = 'planned-session-two-rows';
    await check(page, label, screen, { session: true });

    // V23 · Insights sekmesi (kayıtlar, uyarılar ve 1RM eğrisi dolu)
    screen = 'insights';
    await page.locator('#tab-gozlem').click();
    await page.locator('#day-panel').waitFor();
    await check(page, label, screen);
    // V32 · hareket gelişimi (liste + hareket) ve bu hafta yapılan yük
    screen = 'insights-progress';
    await page.locator('#obs-progress').click();
    await page.locator('.prog-row').first().waitFor();
    await check(page, label, screen);
    screen = 'insights-progress-exercise';
    await page.locator('.prog-row').first().click();
    await page.locator('.prog-detail').waitFor();
    await check(page, label, screen);
    await page.getByRole('dialog').last().getByRole('button', { name: T('Kapat'), exact: true }).last().click();
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1);
    await closeSheet(page, T('Kapat'));
    screen = 'insights-week-done';
    await page.locator('#obs-done').click();
    await page.locator('.week-done').waitFor();
    await check(page, label, screen);
    await closeSheet(page, T('Kapat'));

    // V24 · Lab sekmesi (dersler, ölçüm ve biyomekanik İngilizcede daha uzun)
    screen = 'lab-basics';
    await page.locator('#tab-lab').click();
    await page.locator('#lab-measure').waitFor();
    await check(page, label, screen);
    screen = 'lab-measure';
    await page.locator('#lab-measure').click();
    await page.getByRole('dialog', { name: T('Yorgunluk nasıl ölçülür?') }).waitFor();
    await check(page, label, screen);
    await closeSheet(page, T('Kapat'));
    await page.locator('#lab-signal').click();
    const lessonEn = page.getByRole('dialog', { name: T('Sinir sistemi') });
    await lessonEn.waitFor();
    for (const [i, name] of ['signal', 'recruit', 'rate', 'fatigue'].entries()) {
      screen = `lab-lesson-${name}`;
      await lessonEn.getByRole('tab').nth(i).click();
      if (name === 'fatigue') for (let r = 0; r < 3; r++) await lessonEn.getByRole('button', { name: T('Tekrar Yap') }).click();
      await check(page, label, screen);
    }
    await closeSheet(page, T('Kapat'));
    screen = 'lab-movements';
    await page.locator('#lab-part-hareket').click();
    await check(page, label, screen);
    for (const [q, id] of [['incline barbell', 'egimli-bench'], ['romanian', 'rdl'], ['band lateral', 'band-yana-acis']]) {
      screen = `lab-exercise-${id}`;
      await page.locator('#lab-search').fill(q);
      await page.locator(`#labex-${id}`).click();
      await page.locator('.exsheet').waitFor();
      await check(page, label, screen);
      await closeSheet(page, T('Kapat'));
    }
    console.log(`${label}: akış tamamlandı`);
  } catch (error) {
    failures.push(`${label} · ${screen} · ${error.message}`);
    await page.screenshot({ path: resolve(shots, `${label}-${screen}-akis.png`) }).catch(() => {});
  } finally {
    await context.close();
  }
}

// V25 · herkese açık yasal sayfa (legal.html): on metin, iki dil; yatay taşma olmamalı.
async function legalPages(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  const label = `legal-${viewport.width}x${viewport.height}`;
  try {
    for (const id of ['kosullar', 'gizlilik', 'aydinlatma', 'riza', 'silme', 'terms-en', 'privacy-en', 'kvkk-en', 'consent-en', 'deletion-en']) {
      await page.goto(`${url}legal.html#${id}`);
      await page.locator('.lg-doc').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const errors = await page.evaluate(() => {
        const out = [];
        if (document.scrollingElement.scrollWidth > innerWidth) out.push('yatay taşma');
        if (!document.querySelector('.lgp-nav [aria-current="page"]')) out.push('seçili sekme yok');
        if (!document.querySelector('.lgp-lang')) out.push('dil bağlantısı yok');
        return out;
      });
      failures.push(...errors.map((e) => `${label} · ${id} · ${e}`));
      if (errors.length || process.env.LAYOUT_SHOTS) await page.screenshot({ path: resolve(shots, `${label}-${id}.png`) });
    }
    console.log(`${label}: yasal sayfa tamam`);
  } catch (error) {
    failures.push(`${label} · ${error.message}`);
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
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const cases = [[320, 568], [360, 640], [360, 800], [384, 832], [393, 873], [412, 915], [430, 932], [360, 720, 1.15], [411, 770, 1.15], [884, 1104], [320, 568, 1.15, true]];
  // LAYOUT_LANGS=de npm run test:layout → yalnız istenen diller (yeni dil eklerken hızlı deneme). Boşsa hepsi.
  const only = (process.env.LAYOUT_LANGS || '').split(',').map((x) => x.trim()).filter(Boolean);
  const want = (lang) => !only.length || only.includes(lang);
  for (const [width, height, scale = 1, safeArea = false] of cases) {
    if (want('tr')) await flow({ width, height }, scale, width === 884, safeArea);
    if (want('en')) await flowLang('en', { width, height }, scale, width === 884, safeArea);
  }
  // Ek diller (V26): uzun kelimeler en çok dar ekranda ve büyük yazıda taşar; o boyutlarda aynı akış.
  const extraCases = [[320, 568], [360, 640], [360, 720, 1.15], [412, 915], [884, 1104], [320, 568, 1.15, true]];
  for (const lang of LANG_IDS.filter((l) => l !== 'en' && want(l))) {
    for (const [width, height, scale = 1, safeArea = false] of extraCases) await flowLang(lang, { width, height }, scale, width === 884, safeArea);
  }
  for (const [width, height] of [[320, 568], [884, 1104]]) await legalPages({ width, height });
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
