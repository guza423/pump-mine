// @vitest-environment jsdom
// @ts-nocheck
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../app/App';
import { db } from '../lib/store/database';
import { hipertrofiProgram } from './fixtures';
import { resetTestRuntime, testEnvironment } from './cloudRuntime';
import { LEGAL_KEY } from '../legal/acceptance';
import { LANG_KEY, LANGS, byLangKeys, getLang, registerLang, setLang } from '../i18n';
import { PACKS } from '../i18n/dicts';
import { EX_LIB } from '../lib/data/exlib';
import { LEGAL_BASES, docIn } from '../legal/docs';
import { writeFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { LEGAL } from '../legal/meta';

const native = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), checkPermissions: vi.fn(), requestPermissions: vi.fn() }));
vi.mock('@capacitor/core', async importOriginal => {
  const actual = await importOriginal();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true }, registerPlugin: (name, options) => name === 'RestTimer' ? native : actual.registerPlugin(name, options) };
});
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(async () => ({ remove: vi.fn() })), exitApp: vi.fn() } }));

vi.mock('../lib/cloud/runtime', async () => ({ get accountRuntime() { return testEnvironment.runtime; } }));

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'requestAnimationFrame', {
  configurable: true,
  value: vi.fn(() => 1),
});
Object.defineProperty(window, 'cancelAnimationFrame', {
  configurable: true,
  value: vi.fn(),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

Object.defineProperty(SVGElement.prototype, 'getTotalLength', {
  configurable: true,
  value: vi.fn(() => 100),
});
Object.defineProperty(SVGElement.prototype, 'getPointAtLength', {
  configurable: true,
  value: vi.fn((length) => ({ x: length, y: length / 2 })),
});

import { EN } from '../i18n/en';

const canvasContext = {
  setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
  save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), closePath: vi.fn(), fillText: vi.fn(), measureText: vi.fn(() => ({ width: 20 })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
};
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn(() => canvasContext),
});


// V21 · İngilizce (varsayılan dil) ekranları: Dashboard, Hesap ve ayarlar, yasal kapı, yorgunluk ölçer.
// Kullanıcının yazdığı adlar (plan, gün) Türkçe kalabilir; ekranın kendi metinlerinde Türkçe harf olmamalı.
const TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
// V25 · Türkçe harf taşımayan Türkçe kelimeler de yakalanır ("Tekrar", "Kilo", "Kapat"…): sözlük anahtarlarında geçip
// İngilizce karşılıkların hiçbirinde geçmeyen kelimeler.
const wordsOf = (v) => String(v).replace(/\{\w+\}/g, ' ').toLowerCase().match(/[a-zçğıöşü]+/g) || [];
const EN_WORDS = new Set(Object.values(EN).flat().flatMap(wordsOf));
const TR_ONLY = new Set(Object.keys(EN).map((k) => k.replace(/^[a-z]+\|/, '')).flatMap(wordsOf).filter((w) => w.length >= 3 && !TR_CHARS.test(w) && !EN_WORDS.has(w)));
const turkishIn = (el, skip = []) => {
  const clone = el.cloneNode(true);
  for (const sel of skip) clone.querySelectorAll(sel).forEach((n) => n.remove());
  // Bitişik öğelerin metni birleşmesin diye her metin düğümü ayrı okunur.
  const texts = [];
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n.nodeValue);
  return texts.flatMap((tx) => tx.match(/\S+/g) || []).filter((w) => TR_CHARS.test(w) || wordsOf(w).some((x) => TR_ONLY.has(x)));
};
const attrsTurkish = (el, skip = []) => [...el.querySelectorAll('[aria-label], [placeholder], [title]')]
  .filter((n) => !skip.some((sel) => n.closest(sel)))
  .flatMap((n) => ['aria-label', 'placeholder', 'title'].map((a) => n.getAttribute(a)).filter((v) => v && (TR_CHARS.test(v) || wordsOf(v).some((x) => TR_ONLY.has(x)))));

describe('İngilizce arayüz (V21)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    native.start.mockResolvedValue(undefined);
    native.stop.mockResolvedValue(undefined);
    native.checkPermissions.mockResolvedValue({ notifications: 'granted' });
    resetTestRuntime();
    window.location.hash = '';
    localStorage.clear();
    localStorage.setItem(LEGAL_KEY, JSON.stringify({ v: LEGAL.VERSION, at: 1 }));
    setLang('en', false);
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    cleanup();
    setLang('tr', false);
    db.close();
    await db.delete();
  });

  it('boş Dashboard ve sekmeler İngilizce', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
    expect([...container.querySelectorAll('.tabbar .tab .tab-l')].map((el) => el.textContent)).toEqual(['Dashboard', 'Workout', 'Insights', 'Lab']);
    expect(screen.getByText('No plan yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quick workout' })).toBeTruthy();
    expect(turkishIn(container.querySelector('.device'))).toEqual([]);
    expect(attrsTurkish(container.querySelector('.device'))).toEqual([]);
    expect(document.documentElement.lang).toBe('en');
  });

  it('plan, hedef ve uyku dolu Dashboard İngilizce; kütüphane hareketi İngilizce adıyla', async () => {
    const p = hipertrofiProgram();
    const today = new Date().getDay();
    p.days[0].weekdays = [today];
    p.days[0].weekday = today;
    await db.programs.put(p);
    await db.settings.put({ key: 'goals', value: [
      { id: 'g1', type: 'perf', exId: 'egimli-bench', name: 'Eğimli bench press', base: 80, target: 100, createdAt: 1 },
      { id: 'g2', type: 'skill', exId: 'kip-up', name: 'Kip-up', stage: 1, createdAt: 2 },
    ] });
    await db.checkins.put({ id: 'c_x', sleep: 5, at: Date.now() });
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(await screen.findByText('Incline barbell bench press')).toBeTruthy();
    expect(screen.getByText('Working on the parts')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
    // Kullanıcının verdiği gün adı (Pump günü) olduğu gibi kalır; onun dışında Türkçe yok.
    expect(turkishIn(container.querySelector('.device'), ['.hero-card h3'])).toEqual([]);
    expect(attrsTurkish(container.querySelector('.device'))).toEqual([]);
  });

  it('yorgunluk ölçer İngilizce', async () => {
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    fireEvent.click(container.querySelector('#ready-ring'));
    const dialog = await screen.findByRole('dialog', { name: 'Fatigue meter' });
    expect(within(dialog).getByRole('tab', { name: 'Now' })).toBeTruthy();
    expect(turkishIn(dialog)).toEqual([]);
    expect(attrsTurkish(dialog)).toEqual([]);
  });

  it('Hesap ve ayarlar İngilizce; dil Türkçeye geçince pencere açık kalır ve tercih saklanır', async () => {
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Dashboard' });
    fireEvent.click(container.querySelector('#account-btn'));
    const dialog = await screen.findByRole('dialog', { name: 'Account & settings' });
    expect(within(dialog).getByRole('radio', { name: 'English' }).getAttribute('aria-checked')).toBe('true');
    expect(within(dialog).getByRole('button', { name: /Continue with Google/ })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Privacy Policy' })).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: /Privacy Policy \(English\)/ })).toBeNull();
    expect(turkishIn(dialog, ['.acct-lang'])).toEqual([]);
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Türkçe' }));
    await waitFor(() => expect(getLang()).toBe('tr'));
    expect(localStorage.getItem(LANG_KEY)).toBe('tr');
    expect(await screen.findByRole('dialog', { name: 'Hesap ve ayarlar' })).toBeTruthy();
    expect([...container.querySelectorAll('.tabbar .tab .tab-l')].map((el) => el.textContent)).toEqual(['Dashboard', 'Antrenman', 'Gözlem', 'Lab']);
    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(await screen.findByRole('dialog', { name: 'Account & settings' })).toBeTruthy();
    expect(localStorage.getItem(LANG_KEY)).toBe('en');
  });

  it('hesap silme onayı İngilizcede DELETE ister', async () => {
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    await screen.findByRole('heading', { name: 'Dashboard' });
    click('#account-btn');
    click('#email-signin');
    fireEvent.change(container.querySelector('#acct-email'), { target: { value: 'spor@example.com' } });
    fireEvent.change(container.querySelector('#acct-pass'), { target: { value: 'secret123' } });
    click('#acct-email-go');
    const consent = await screen.findByRole('dialog', { name: 'How your data is used' });
    expect(turkishIn(consent)).toEqual([]);
    click('#consent-check');
    click('#consent-yes');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    click('#account-btn');
    click('#delete-account');
    fireEvent.change(container.querySelector('#del-confirm'), { target: { value: 'SİL' } });
    expect(container.querySelector('#delete-yes').disabled).toBe(true);
    fireEvent.change(container.querySelector('#del-confirm'), { target: { value: 'delete' } });
    expect(container.querySelector('#delete-yes').disabled).toBe(false);
  });

  it('ilk açılışta yasal kapı İngilizce; Gizlilik Politikası İngilizce metni açar', async () => {
    localStorage.removeItem(LEGAL_KEY);
    const { container } = render(<App />);
    const gate = await screen.findByRole('dialog', { name: 'Before you start' });
    expect(within(gate).getByText(/I have read and accept the/)).toBeTruthy();
    expect(turkishIn(gate)).toEqual([]);
    fireEvent.click(container.querySelector('#legal-open-gizlilik'));
    const doc = await screen.findByRole('dialog', { name: 'Privacy Policy' });
    expect(doc.querySelector('.lg-gate-doc').textContent).toMatch(/Privacy Policy|personal data/i);
    fireEvent.click(container.querySelector('#legal-back'));
    fireEvent.click(container.querySelector('#legal-terms'));
    fireEvent.click(container.querySelector('#legal-notice'));
    fireEvent.click(container.querySelector('#legal-go'));
    await waitFor(() => expect(container.querySelector('.lg-gate')).toBeNull());
  });
  // V25 · yasal metinlerin İngilizcesi
  it('yasal metinler İngilizce: kapıdaki üç metin ve Hesap › Legal altındaki beş metin; Türkçede Türkçe açılır', async () => {
    // KVKK bent harfleri, ör. "Art. 5(2)(ç)", İngilizce metinde de aynen yazılır.
    const turkishDoc = (el) => turkishIn(el).filter((w) => TR_CHARS.test(w.replace(/\(?[çğ]\)/g, '')));
    localStorage.removeItem(LEGAL_KEY);
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    await screen.findByRole('dialog', { name: 'Before you start' });
    for (const [id, title] of [['kosullar', 'Terms of Use'], ['aydinlatma', 'KVKK Privacy Notice'], ['gizlilik', 'Privacy Policy']]) {
      expect(container.querySelector('#legal-open-' + id + ' span').textContent).toBe(title);
      click('#legal-open-' + id);
      const doc = await screen.findByRole('dialog', { name: title });
      expect(turkishDoc(doc)).toEqual([]);
      click('#legal-back');
    }
    click('#legal-terms');
    click('#legal-notice');
    click('#legal-go');
    await waitFor(() => expect(container.querySelector('.lg-gate')).toBeNull());
    click('#account-btn');
    await screen.findByRole('dialog', { name: 'Account & settings' });
    const titles = { kosullar: 'Terms of Use', gizlilik: 'Privacy Policy', aydinlatma: 'KVKK Privacy Notice', riza: 'Explicit Consent Notice', silme: 'Account and data deletion' };
    for (const [id, title] of Object.entries(titles)) {
      expect(container.querySelector('#legal-' + id).textContent).toBe(title);
      click('#legal-' + id);
      const sheet = await screen.findByRole('dialog', { name: title });
      expect(turkishDoc(sheet)).toEqual([]);
      fireEvent.click(within(sheet).getAllByRole('button', { name: 'Close' }).at(-1));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: title })).toBeNull());
    }
    // Metin içi bağlantı aynı dildeki metni açar.
    click('#legal-silme');
    const deletion = await screen.findByRole('dialog', { name: 'Account and data deletion' });
    expect(within(deletion).getByText(/Type DELETE in the box/)).toBeTruthy();
    fireEvent.click(within(deletion).getAllByRole('button', { name: 'Close' }).at(-1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Account and data deletion' })).toBeNull());
    click('#legal-kosullar');
    const terms = await screen.findByRole('dialog', { name: 'Terms of Use' });
    fireEvent.click(within(terms).getByRole('link', { name: 'Privacy Policy' }));
    expect(await screen.findByRole('dialog', { name: 'Privacy Policy' })).toBeTruthy();
    // Türkçeye geçince aynı bağlantılar Türkçe metinleri açar.
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1));
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Terms of Use' })).toBeNull());
    fireEvent.click(screen.getByRole('radio', { name: 'Türkçe' }));
    await screen.findByRole('dialog', { name: 'Hesap ve ayarlar' });
    expect(container.querySelector('#legal-kosullar').textContent).toBe('Kullanım Koşulları');
    click('#legal-riza');
    expect(await screen.findByRole('dialog', { name: 'Açık Rıza Metni' })).toBeTruthy();
  });
  // V22 · Antrenman sekmesi
  it('plansız oturum İngilizce: liste, seçici, set ekranı, dinlenme, set ayrıntısı, özet ve bildirim', async () => {
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    const device = () => container.querySelector('.device');
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    expect(container.querySelector('#free-session').textContent).toContain('Quick workout');
    expect(turkishIn(device())).toEqual([]);
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    expect(screen.getByText('not started')).toBeTruthy();
    expect(turkishIn(device())).toEqual([]);
    expect(attrsTurkish(device())).toEqual([]);
    click('#ses-add-first');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'incline barbell bench' } });
    expect(turkishIn(device())).toEqual([]);
    fireEvent.click(container.querySelector('.pk'));
    expect(container.querySelector('#pick-add').textContent).toBe('ADD 1 EXERCISE');
    click('#pick-add');
    await waitFor(() => expect(container.querySelector('.card-main')).toBeTruthy());
    expect(container.querySelector('.card-main').textContent).toContain('Incline barbell bench press');
    fireEvent.click(container.querySelector('.card-main'));
    expect(container.querySelector('#log-set').textContent).toBe('SET 1 DONE');
    expect(turkishIn(device())).toEqual([]);
    expect(attrsTurkish(device())).toEqual([]);
    click('#log-set');
    await waitFor(() => expect(container.querySelector('#rest-big')).toBeTruthy());
    expect(turkishIn(device())).toEqual([]);
    await waitFor(() => expect(native.start).toHaveBeenCalled());
    expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Rest · Incline barbell bench press', body: 'Set 2 is next', channelRunning: 'Rest timer', channelDone: 'Rest finished' }));
    fireEvent.click(screen.getByRole('button', { name: 'SKIP' }));
    await waitFor(() => expect(container.querySelector('#log-set')).toBeTruthy());
    expect(container.querySelector('#log-set').textContent).toBe('SET 2 DONE');
    fireEvent.click(container.querySelector('.st'));
    const detail = await screen.findByRole('dialog', { name: 'Set details' });
    expect(turkishIn(detail)).toEqual([]);
    fireEvent.click(within(detail).getByRole('button', { name: 'CLOSE' }));
    click('#ex-done');
    expect(await screen.findByText('EXERCISE DONE')).toBeTruthy();
    await waitFor(() => expect(container.querySelector('.px-done-tag')).toBeTruthy(), { timeout: 3000 });
    expect(container.querySelector('.px-ses-meta').textContent).toContain('started');
    expect(turkishIn(device())).toEqual([]);
    click('#finish-btn');
    await waitFor(() => expect(container.querySelector('#pixel-summary')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByText('WORKOUT DONE')).toBeTruthy();
    expect(turkishIn(device())).toEqual([]);
    expect(attrsTurkish(device())).toEqual([]);
  });

  it('planlı oturum, özet, plan menüsü ve plan düzenleyici İngilizce (kullanıcının yazdığı adlar hariç)', async () => {
    await db.programs.put(hipertrofiProgram());
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    const device = () => container.querySelector('.device');
    // Fikstürdeki plan adları ve notlar kullanıcı verisidir; Türkçe kalır.
    const userData = ['.wtype-n', '.hrow-t strong', '.ses2-name', '.tg-memo', '.wmenu-note', '.item-t em'];
    await screen.findByRole('heading', { name: 'Dashboard' });
    await waitFor(async () => expect(await db.programs.count()).toBe(1));
    click('#tab-antrenman');
    expect(await screen.findByText('My plans')).toBeTruthy();
    expect(turkishIn(device(), userData)).toEqual([]);
    const heavy = await screen.findByText('Ağır gün', { selector: 'strong' });
    fireEvent.click(heavy.closest('button'));
    const menu = await screen.findByRole('dialog', { name: 'Ağır gün' });
    expect(within(menu).getAllByText('Incline barbell bench press').length).toBeGreaterThan(0);
    expect(turkishIn(menu, ['.sheet-h', ...userData])).toEqual([]);
    click('#wtype-start');
    await waitFor(() => expect(container.querySelector('#log-set')).toBeTruthy());
    expect(container.querySelector('#log-set').textContent).toBe('Log set 1/2');
    expect(turkishIn(device(), userData)).toEqual([]);
    expect(attrsTurkish(device(), userData)).toEqual([]);
    click('#log-set');
    const firstSet = await screen.findByRole('button', { name: /Set 1:.*Details/ });
    fireEvent.click(firstSet);
    const setSheet = screen.getAllByRole('dialog').at(-1);
    expect(within(setSheet).getByText('Reps in reserve')).toBeTruthy();
    expect(turkishIn(setSheet)).toEqual([]);
    fireEvent.click(within(setSheet).getAllByRole('button', { name: 'Close' }).at(-1));
    click('#finish-btn');
    const summary = await screen.findByRole('dialog', { name: 'Workout summary' });
    expect(within(summary).getByText('Volume')).toBeTruthy();
    expect(turkishIn(summary)).toEqual([]);
    fireEvent.click(within(summary).getAllByRole('button', { name: 'Close' }).at(-1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    click('#new-plan');
    await waitFor(() => expect(container.querySelector('.editor2')).toBeTruthy());
    expect(screen.getByText('Empty plan')).toBeTruthy();
    expect(turkishIn(device(), userData)).toEqual([]);
    click('#add-item');
    const picker = await screen.findByRole('dialog', { name: 'Add exercise' });
    expect(turkishIn(picker)).toEqual([]);
    expect(attrsTurkish(picker)).toEqual([]);
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'squat' } });
    fireEvent.click(container.querySelector('.exr-main'));
    await waitFor(() => expect(container.querySelector('.itemsheet')).toBeTruthy());
    const itemSheet = screen.getAllByRole('dialog').at(-1);
    expect(turkishIn(itemSheet)).toEqual([]);
    expect(attrsTurkish(itemSheet)).toEqual([]);
  });
  // V23 · Gözlem (Insights)
  it('Insights sekmesi İngilizce: takvim, gün paneli, ay özeti, uyarılar, 1RM gelişimi, haftalık yük, plan seçimi', async () => {
    const now = new Date();
    await db.sessions.put({
      id: 's-month', dayId: null, dayName: 'Plansız antrenman', status: 'done',
      startedAt: now.getTime() - 1200_000, endedAt: now.getTime() - 600_000,
      items: [{ id: 'i1', exId: 'egimli-bench', name: 'Eğimli bench press', muscle: 'Göğüs', target: { rest: 180 },
        sets: [{ kg: 75, reps: 8, rir: 2, rpe: 8, lvl: 2, vl: 0.2, at: now.getTime() - 900_000 }] }],
    });
    const p = hipertrofiProgram();
    p.days[0].weekdays = [now.getDay()];
    p.days[0].weekday = now.getDay();
    await db.programs.put(p);
    await db.checkins.put({ id: 'c_x', sleep: 6, at: Date.now() });
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    const device = () => container.querySelector('.device');
    const userData = ['.day-plan-t strong', '.day-plan-more', '.pd2-n', '.plan-pick-opt strong'];
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-gozlem');
    expect(await screen.findByRole('heading', { level: 1, name: 'Plan & insights' })).toBeTruthy();
    expect(container.querySelector('.cal-wds').textContent).toBe('MonTueWedThuFriSatSun');
    expect(container.querySelector('.day-h').textContent).toMatch(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d+ · Today$/);
    expect(screen.getByText('Exercise progress')).toBeTruthy();
    expect(within(container.querySelector('.chips-scroll')).getByText('Incline barbell bench press')).toBeTruthy();
    expect(turkishIn(device(), userData)).toEqual([]);
    expect(attrsTurkish(device(), userData)).toEqual([]);
    click('#obs-week');
    const week = await screen.findByRole('dialog', { name: 'Weekly load' });
    expect(turkishIn(week, userData)).toEqual([]);
    fireEvent.click(within(week).getAllByRole('button', { name: 'Close' }).at(-1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    click('#cal-next');
    const future = [...container.querySelectorAll('.cal-d:not(.out)')].at(-1);
    fireEvent.click(future);
    click('#day-add-plan');
    const pick = await screen.findByRole('dialog', { name: 'Add a plan to this day' });
    expect(within(pick).getByText(/^Repeat every /)).toBeTruthy();
    expect(turkishIn(pick, userData)).toEqual([]);
  });
  // V24 · Lab
  it('Lab sekmesi İngilizce: temeller, hareket listesi, ölçüm, sinir sistemi dersleri, biyomekanik ve hareket sayfaları', async () => {
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    const device = () => container.querySelector('.device');
    const closeTop = async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    };
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-lab');
    expect(await screen.findByRole('heading', { level: 1, name: 'Lab' })).toBeTruthy();
    expect(screen.getByText('How is fatigue measured?')).toBeTruthy();
    expect(turkishIn(device())).toEqual([]);
    expect(attrsTurkish(device())).toEqual([]);

    click('#lab-measure');
    const measure = await screen.findByRole('dialog', { name: 'How is fatigue measured?' });
    expect(within(measure).getByText('hard set')).toBeTruthy();
    expect(turkishIn(measure)).toEqual([]);
    expect(attrsTurkish(measure)).toEqual([]);
    await closeTop();

    click('#lab-signal');
    const lesson = await screen.findByRole('dialog', { name: 'Nervous system' });
    const tabs = within(lesson).getAllByRole('tab');
    expect(tabs.map((b) => b.textContent)).toEqual(['1Signal', '2Recruitment', '3Rate coding', '4Fatigue']);
    for (const tab of tabs) {
      fireEvent.click(tab);
      expect(turkishIn(lesson)).toEqual([]);
      expect(attrsTurkish(lesson)).toEqual([]);
    }
    for (let i = 0; i < 4; i++) fireEvent.click(within(lesson).getByRole('button', { name: 'Do a rep' }));
    expect(turkishIn(lesson)).toEqual([]);
    await closeTop();

    click('#lab-part-hareket');
    expect(await screen.findByText('Incline barbell bench press')).toBeTruthy();
    expect(turkishIn(device())).toEqual([]);
    expect(attrsTurkish(device())).toEqual([]);
    // Hareket sayfasında yalnız Türkçe ad satırı (.ex-en) Türkçe kalır.
    for (const [q, id] of [['incline barbell', 'egimli-bench'], ['romanian', 'rdl'], ['band lateral', 'band-yana-acis'], ['depth jump', 'derinlik-sicrama'], ['kip-up', 'kip-up']]) {
      fireEvent.change(container.querySelector('#lab-search'), { target: { value: q } });
      const row = await waitFor(() => { const el = container.querySelector('#labex-' + id); expect(el).toBeTruthy(); return el; });
      fireEvent.click(row);
      const sheet = (await screen.findAllByRole('dialog')).at(-1);
      expect(turkishIn(sheet, ['.ex-en'])).toEqual([]);
      expect(attrsTurkish(sheet)).toEqual([]);
      if (id === 'egimli-bench') {
        expect(within(sheet).getByText(/^Turkish: /)).toBeTruthy();
        // Kas vurgusunda hedef etiketi kimlikle seçilir: üst göğüs ve ön omuz (V24'te kimlik düşmüştü, V25'te düzeldi).
        expect([...sheet.querySelectorAll('.emph-row')].filter((r) => r.querySelector('.goal-tag:not(.ghost)')).map((r) => r.querySelector('.emph-k span').textContent)).toEqual(['Upper chest', 'Front delts']);
      }
      await closeTop();
    }
  });
});

// V26 · yeni dil hazırlığı.
// Katalog: çevrilecek her metin = İngilizce sözlüğün anahtarları + byLang yapılarının "bağlam|Türkçe" metinleri
// (App içe aktarıldığı için bütün byLang sabitleri kayıtlı). Yeni dil bu kataloğun tamamını çevirir.
const catalog = () => {
  const m = new Map(Object.entries(EN));
  for (const [k, en] of byLangKeys()) m.set(k, en);
  return m;
};
const formsOf = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v : Object.values(v));
const varsOf = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('yeni dil hazırlığı (V26)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    native.start.mockResolvedValue(undefined);
    native.stop.mockResolvedValue(undefined);
    native.checkPermissions.mockResolvedValue({ notifications: 'granted' });
    resetTestRuntime();
    window.location.hash = '';
    localStorage.clear();
    localStorage.setItem(LEGAL_KEY, JSON.stringify({ v: LEGAL.VERSION, at: 1 }));
    await db.delete();
    await db.open();
  });
  afterEach(async () => {
    cleanup();
    setLang('tr', false);
    db.close();
    await db.delete();
  });

  it('byLang yapılarının her metninin İngilizcesi var', () => {
    const keys = byLangKeys();
    expect(keys.size).toBeGreaterThan(100);
    const bad = [...keys].filter(([, en]) => !en || TR_CHARS.test(en)).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  // I18N_WORKLIST=de npm run i18n:worklist → i18n-worklist-de.json: eksik metinler (İngilizcesiyle), hareket adları, yasal metinler.
  it('her ek dilin sözlüğü eksiksiz, değişkenleri ve çoğulları doğru (iş listesi: I18N_WORKLIST=<dil>)', () => {
    const cat = catalog();
    const extra = LANGS.map((l) => l.id).filter((id) => id !== 'tr' && id !== 'en');
    const want = process.env.I18N_WORKLIST;
    const langs = want ? [want] : extra;
    const problems = [];
    for (const lang of langs) {
      const pack = PACKS[lang] || { dict: {} };
      const missing = {};
      for (const [k, en] of cat) {
        const v = pack.dict[k];
        if (v == null) { missing[k] = en; continue; }
        for (const f of formsOf(v)) {
          if (varsOf(f) !== varsOf(formsOf(en)[0])) problems.push(`${lang} değişken: ${k} → ${f}`);
          if (/[ığşİĞŞ]/.test(f)) problems.push(`${lang} Türkçe harf: ${k} → ${f}`);
        }
        if (Array.isArray(v) && v.length !== 2) problems.push(`${lang} çoğul: ${k}`);
        if (v && typeof v === 'object' && !Array.isArray(v) && !v.other) problems.push(`${lang} çoğul (other yok): ${k}`);
      }
      for (const k of Object.keys(pack.dict)) if (!cat.has(k)) problems.push(`${lang} artık kullanılmayan: ${k}`);
      for (const id of Object.keys(pack.exercises || {})) if (!EX_LIB.some((e) => e.id === id)) problems.push(`${lang} bilinmeyen hareket: ${id}`);
      if (want) {
        const exercises = Object.fromEntries(EX_LIB.filter((e) => !(pack.exercises || {})[e.id]).map((e) => [e.id, { tr: e.name, en: e.en }]));
        const legal = LEGAL_BASES.filter((b) => docIn(b, lang).lang !== lang).map((b) => `src/legal/texts/${lang}/${b}.md ← src/legal/texts/en/${b}.md`);
        const file = resolvePath(import.meta.dirname, '../..', `i18n-worklist-${lang}.json`);
        writeFileSync(file, JSON.stringify({ lang, missing, exercises, legal }, null, 1));
        console.log(`${file}: ${Object.keys(missing).length} metin, ${Object.keys(exercises).length} hareket adı, ${legal.length} yasal metin`);
      } else if (Object.keys(missing).length) problems.push(`${lang}: ${Object.keys(missing).length} eksik metin (ör. ${Object.keys(missing).slice(0, 3).join(' · ')})`);
    }
    expect(problems).toEqual([]);
  });

  // Sözde dil: her metin İngilizcesinin ünlüleri vurgulanmış hali ("Save" → "Sávé"). Ekranda vurgusuz ünlü taşıyan kelime
  // sözlükten geçmemiş demektir (koda gömülü İngilizce ya da Türkçe metin); yeni dile çevrilmeden kalırdı.
  it('sözde dilde ekrandaki her metin sözlükten gelir', async () => {
    const ACC = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' };
    const ps = (s) => String(s).replace(/(\{\w+\}|\*\*)|([aeiouAEIOU])/g, (m, keep, v) => keep || ACC[v]);
    const dict = {};
    for (const [k, en] of catalog()) dict[k] = typeof en === 'string' ? ps(en) : Array.isArray(en) ? en.map(ps) : Object.fromEntries(Object.entries(en).map(([c, f]) => [c, ps(f)]));
    registerLang({ id: 'xx', label: 'Pseudo', locale: 'de-DE' }, { dict, exercises: Object.fromEntries(EX_LIB.map((e) => [e.id, ps(e.en)])) });
    setLang('xx', false);
    // İzinli: marka ve kısaltmalar; yasal metin başlıkları (bu dilin yasal metni yoksa İngilizcesi açılır, beklenen);
    // Intl'nin dilin kendi yerel ayarıyla yazdığı tarih (.px-ses-date); hareket sayfasındaki İngilizce ad satırı (.ex-en).
    const ALLOW = new Set(['OUTMOVE', 'PRWAGON', 'LLC', 'Google', 'JSON', 'RPE', 'RIR', 'ROM', 'NSCA', 'EMG']);
    const SKIP = 'script, style, .acct-lang, .lg-acct-links, .px-ses-date, .ex-en';
    const leaks = new Set();
    const scan = (where) => {
      const root = document.body;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.parentElement?.closest(SKIP)) continue;
        for (const w of n.nodeValue.match(/[A-Za-zÀ-ÿĀ-ž]{3,}/g) || []) if (/[aeiouAEIOU]/.test(w) && !ALLOW.has(w)) leaks.add(`${where}: ${w} ‹${n.parentElement?.className || n.parentElement?.localName}›`);
      }
      for (const el of root.querySelectorAll('[aria-label], [placeholder], [title]')) {
        for (const a of ['aria-label', 'placeholder', 'title']) {
          for (const w of (el.getAttribute(a) || '').match(/[A-Za-zÀ-ÿĀ-ž]{3,}/g) || []) if (/[aeiouAEIOU]/.test(w) && !ALLOW.has(w)) leaks.add(`${where} [${a}]: ${w}`);
        }
      }
    };
    const { container } = render(<App />);
    const click = (sel) => fireEvent.click(container.querySelector(sel));
    const closeTop = async () => {
      fireEvent.click(screen.getAllByRole('button', { name: ps('Close') }).at(-1));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    };
    const sheet = async (sel, where) => {
      click(sel);
      await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0));
      scan(where);
      await closeTop();
    };
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    scan('dashboard');
    await sheet('#ready-ring', 'yorgunluk');
    await sheet('#account-btn', 'hesap');
    await sheet('#goal-add', 'hedef');
    // Antrenman: plan düzenleyici, plansız oturum, seçici, set, dinlenme, set ayrıntısı, özet
    click('#tab-antrenman');
    scan('antrenman');
    click('#new-plan');
    await waitFor(() => expect(container.querySelector('.editor2')).toBeTruthy());
    scan('plan-duzenleyici');
    click('#ed-back');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    scan('plansiz');
    click('#ses-add-first');
    scan('secici');
    // Arama kutusuna yazılan metin "özel hareket ekle" satırında aynen görünür (kullanıcı verisi); taramadan sonra yazılır.
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'incline barbell bench' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    await waitFor(() => expect(container.querySelector('.card-main')).toBeTruthy());
    scan('liste');
    fireEvent.click(container.querySelector('.card-main'));
    scan('set');
    click('#log-set');
    await waitFor(() => expect(container.querySelector('#rest-big')).toBeTruthy());
    scan('dinlenme');
    fireEvent.click(screen.getByRole('button', { name: ps('SKIP') }));
    await waitFor(() => expect(container.querySelector('#log-set')).toBeTruthy());
    fireEvent.click(container.querySelector('.st'));
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0));
    scan('set-ayrinti');
    fireEvent.click(within(screen.getAllByRole('dialog').at(-1)).getByRole('button', { name: ps('CLOSE') }));
    await waitFor(() => expect(container.querySelector('#ex-done')).toBeTruthy());
    click('#ex-done');
    await waitFor(() => expect(container.querySelector('.px-done-tag')).toBeTruthy(), { timeout: 3000 });
    click('#finish-btn');
    await waitFor(() => expect(container.querySelector('#pixel-summary')).toBeTruthy(), { timeout: 3000 });
    scan('ozet');
    click('#summary-done');
    await waitFor(() => expect(container.querySelector('.hist-inline .hrow')).toBeTruthy());
    scan('gecmis');
    // Gözlem (kayıt dolu)
    click('#tab-gozlem');
    await waitFor(() => expect(container.querySelector('#day-panel')).toBeTruthy());
    scan('gozlem');
    // Lab: temeller, ölçüm, dersler, hareketler, biyomekanikli hareket sayfası
    click('#tab-lab');
    scan('lab');
    await sheet('#lab-measure', 'olcum');
    click('#lab-signal');
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0));
    for (const [i, tab] of within(screen.getAllByRole('dialog').at(-1)).getAllByRole('tab').entries()) { fireEvent.click(tab); scan('ders-' + (i + 1)); }
    await closeTop();
    click('#lab-part-hareket');
    scan('hareketler');
    for (const [q, id] of [['incline barbell', 'egimli-bench'], ['romanian', 'rdl'], ['band lateral', 'band-yana-acis']]) {
      fireEvent.change(container.querySelector('#lab-search'), { target: { value: q } });
      await waitFor(() => expect(container.querySelector('#labex-' + id)).toBeTruthy());
      await sheet('#labex-' + id, 'hareket-' + id);
    }
    // Planlı oturum: plan düzenleyicide hareket ayarı, planlı set ekranı ve dinlenme
    click('#tab-antrenman');
    click('#new-plan');
    await waitFor(() => expect(container.querySelector('.editor2')).toBeTruthy());
    click('#add-item');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'barbell bench' } });
    fireEvent.click(container.querySelector('.exr-main'));
    await waitFor(() => expect(container.querySelector('.itemsheet')).toBeTruthy());
    scan('plan-hareket-ayari');
    await closeTop();
    click('#ed-start');
    await waitFor(() => expect(container.querySelector('.tgt2')).toBeTruthy());
    scan('planli');
    click('#log-set');
    await waitFor(() => expect(container.querySelector('.restchip')).toBeTruthy());
    scan('planli-dinlenme');
    expect([...leaks]).toEqual([]);
  });
});
