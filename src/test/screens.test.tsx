// @vitest-environment jsdom
// @ts-nocheck
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../app/App';
import { db } from '../lib/store/database';
import { hipertrofiProgram } from './fixtures';
import { resetTestRuntime, testEnvironment } from './cloudRuntime';
import { backStack } from '../app/back';
import { dateKey } from '../features/plan/plans';
import { LEGAL_KEY, readAcceptance } from '../legal/acceptance';
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

const canvasContext = {
  setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
  save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), closePath: vi.fn(), fillText: vi.fn(), measureText: vi.fn(() => ({ width: 20 })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
};
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn(() => canvasContext),
});

function expectHealthy() {
  expect(screen.queryByText('Bir şeyler ters gitti')).toBeNull();
}

describe('ana ekran akışları', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    native.start.mockResolvedValue(undefined);
    native.stop.mockResolvedValue(undefined);
    native.checkPermissions.mockResolvedValue({ notifications: 'granted' });
    resetTestRuntime();
    window.location.hash = '';
    localStorage.setItem(LEGAL_KEY, JSON.stringify({ v: LEGAL.VERSION, at: 1 }));
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    cleanup();
    db.close();
    await db.delete();
  });

  it('alt menü Dashboard / Antrenman / Gözlem / Lab gösterir ve Dashboard başlığıyla açılır', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
    const tabs = [...container.querySelectorAll('.tabbar .tab .tab-l')].map((el) => el.textContent);
    expect(tabs).toEqual(['Dashboard', 'Antrenman', 'Gözlem', 'Lab']);
    expect(container.querySelector('#tab-programlar')).toBeNull();
    expect(container.querySelector('#tab-gozlem')).toBeTruthy();
  });

  it('plansız ekranda yalnızca yapılan setleri gösterir, dinlenmeyi saklar ve setsiz hareketi çıkarır', async () => {
    const { container } = render(<App />);
    const click = selector => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    expect(container.querySelector('#free-session').textContent).toContain('Plansız antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    expect(screen.getByText('başlamadı')).toBeTruthy();
    expect(container.querySelector('.px-ses-meta').textContent).toMatch(/\d/);
    click('#ses-add-first');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'düz bench' } });
    fireEvent.click(container.querySelector('.pk'));
    expect(container.querySelector('#pick-add').textContent).toBe('1 HAREKET EKLE');
    click('#pick-add');
    await waitFor(() => expect(container.querySelector('.card-main')).toBeTruthy());
    fireEvent.click(container.querySelector('.card-main'));

    expect(container.querySelector('[id^="kg-"]').getAttribute('aria-valuenow')).toBe('20');
    expect(container.querySelector('[id^="reps-"]').getAttribute('aria-valuenow')).toBe('10');
    expect(container.querySelector('.tgt2, .exprog, .exnav, .srow.plan, .srow.now, .spwrap, .rpe-chips')).toBeNull();
    expect(container.querySelector('#log-set').textContent).toBe('SET 1 BİTTİ');
    expect(container.querySelector('#log-set').className).toContain('px-lv1');
    expect(screen.getByText('İlk setini kaydet')).toBeTruthy();

    click('#log-set');
    expect(container.querySelectorAll('.st')).toHaveLength(1);
    await waitFor(() => expect(container.querySelector('#rest-big')).toBeTruthy());
    await waitFor(() => expect(native.start).toHaveBeenCalledTimes(1));
    const saved = (await db.sessions.toArray())[0];
    expect(saved.rest).toMatchObject({ total: 180, exId: 'duz-bench', setNo: 1, start: saved.items[0].sets[0].at });
    expect(saved.items[0].sets[0]).toMatchObject({ rom: 100, rpe: null });
    expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ endAt: saved.rest.start + 180000, body: '2. set sırada' }));
    expect(native.stop.mock.invocationCallOrder[0]).toBeLessThan(native.start.mock.invocationCallOrder[0]);

    fireEvent.click(screen.getByRole('button', { name: '15 saniye ekle' }));
    await waitFor(async () => expect((await db.settings.get('restPrefs')).value).toEqual({ 'duz-bench': 195 }));
    fireEvent.click(screen.getByRole('button', { name: 'GİZLE' }));
    expect(container.querySelector('#rest-big')).toBeNull();
    // V13.1: dinlenme sürerken kaydet düğmesi yerine dinlenme çubuğu; iptal büyük sayaçtan
    expect(container.querySelector('#log-set')).toBeNull();
    expect(container.querySelector('.px-restbar')).toBeTruthy();
    click('.px-restbar');
    await waitFor(() => expect(container.querySelector('#rest-big')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'GEÇ' }));
    await waitFor(() => expect(container.querySelector('#log-set')).toBeTruthy());
    expect(container.querySelector('#log-set').textContent).toBe('SET 2 BİTTİ');

    click('#log-set');
    await waitFor(() => expect(native.start).toHaveBeenCalledTimes(3));
    expect(native.stop.mock.invocationCallOrder.at(-1)).toBeLessThan(native.start.mock.invocationCallOrder.at(-1));
    await waitFor(async () => expect((await db.sessions.toArray())[0].rest.total).toBe(195));

    click('#tab-bugun');
    click('#tab-antrenman');
    await waitFor(() => expect(container.querySelector('.px-rchip')).toBeTruthy());
    click('.px-rchip');
    await waitFor(() => expect(container.querySelector('#rest-big')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'GEÇ' }));
    await waitFor(async () => expect((await db.sessions.toArray())[0].rest).toBeUndefined());

    // HAREKETİ BİTİR (basılı tut): animasyon, listeye dönüş, kartta BİTTİ; başlıkta başlama saati
    expect(container.querySelector('#ex-done').className).toContain('px-hold');
    click('#ex-done');
    expect(await screen.findByText('HAREKET BİTTİ')).toBeTruthy();
    await waitFor(() => expect(container.querySelector('.px-done-tag')).toBeTruthy(), { timeout: 3000 });
    await waitFor(async () => expect((await db.sessions.toArray())[0].items[0].done).toBe(true));
    expect(container.querySelector('.px-ses-meta').textContent).toContain("'de başladı");
    click('#fx-add');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'Oturarak dumbbell omuz press' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    expect(container.querySelectorAll('.px-card')).toHaveLength(2);
    expect(container.querySelector('.card-del')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Oturarak dumbbell omuz press hareketini çıkar' }));
    expect(container.querySelectorAll('.px-card')).toHaveLength(1);
    expect(container.querySelector('.card-del')).toBeNull();
  });

  it('plansız hareketin kilosunu, tekrarını ve hızını en yeni bitmiş setten alır', async () => {
    const item = (sets) => ({ id: 'bench', exId: 'duz-bench', name: 'Düz bench press', muscle: 'Göğüs', target: { rest: 180 }, sets });
    const set = (kg, reps, lvl, at) => ({ kg, reps, lvl, at, vl: .2, rpe: 8, rir: 2 });
    await db.sessions.bulkPut([
      { id: 'new-session', dayId: null, dayName: 'Boş antrenman', status: 'done', startedAt: 20, items: [item([set(80, 8, 1, 100)])] },
      { id: 'last-set', dayId: null, dayName: 'Boş antrenman', status: 'done', startedAt: 10, items: [item([set(60, 10, 3, 200), set(40, 12, 0, 50)])] },
    ]);
    const { container } = render(<App />);
    const click = selector => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    expect(container.querySelector('.shead-sub').textContent).toContain('Plansız antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    click('#ses-add-first');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'düz bench' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    fireEvent.click(container.querySelector('.card-main'));
    expect(container.querySelector('[id^="kg-"]').getAttribute('aria-valuenow')).toBe('60');
    expect(container.querySelector('[id^="reps-"]').getAttribute('aria-valuenow')).toBe('10');
    expect(container.querySelector('#speed-3').getAttribute('aria-checked')).toBe('true');
    expect((await db.sessions.get('new-session')).dayName).toBe('Boş antrenman');
  });

  it('bildirim hatası set kaydını engellemez; bitirince sayaç durur ve oturumdan silinir', async () => {
    native.start.mockRejectedValue(new Error('Bildirim kullanılamıyor'));
    const { container } = render(<App />);
    const click = selector => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman'); click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    click('#ses-add-first');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'düz bench' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    fireEvent.click(container.querySelector('.card-main'));
    click('#log-set');
    await waitFor(() => expect(native.start).toHaveBeenCalled());
    await waitFor(async () => expect((await db.sessions.toArray())[0].items[0].sets).toHaveLength(1));
    fireEvent.click(await screen.findByRole('button', { name: 'GİZLE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Geri: antrenman listesi' }));
    expect(container.querySelector('#finish-btn').className).toContain('px-hold');
    click('#finish-btn');
    expect(await screen.findByText('İDMAN BİTTİ')).toBeTruthy();
    await waitFor(() => expect(native.stop).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await waitFor(async () => {
      const s = (await db.sessions.toArray())[0];
      expect(s.status).toBe('done'); expect(s.rest).toBeUndefined();
    });
    expect(container.querySelector('#pixel-summary')).toBeTruthy();
  });

  it('yeni misafir boş başlar, Plan oluştur doğrudan düzenleyiciyi açar ve dokunmadan çıkılırsa kaydedilmez', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    expect(await db.programs.count()).toBe(0);
    expect(container.querySelector('#goal-add')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Plan oluştur' }));
    expect(container.querySelector('.editor2')).toBeTruthy();
    fireEvent.click(container.querySelector('#ed-back'));
    expect(await db.programs.count()).toBe(0);
  });

  it('Antrenman sekmesinde #hist-btn yoktur, geçmiş doğrudan sayfada görünür ve #new-plan ile oluşturulan plan Planlarım listesinde yer alır', async () => {
    await db.sessions.put({
      id: 'done-1',
      dayId: null,
      dayName: 'Plansız antrenman',
      status: 'done',
      startedAt: Date.now() - 3600_000,
      endedAt: Date.now() - 1800_000,
      items: [{ id: 'i1', exId: 'duz-bench', name: 'Düz bench press', muscle: 'Göğüs', target: { rest: 180 }, sets: [{ kg: 80, reps: 8, rir: 2, rpe: 8, lvl: 2, vl: 0.2, at: Date.now() - 3000_000 }] }],
    });
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    expect(container.querySelector('#hist-btn')).toBeNull();
    expect(container.querySelector('#history-btn')).toBeNull();
    expect(container.querySelector('.hist-inline .hrow')).toBeTruthy();
    expect(screen.getByText('Planın yok. Plansız başla ya da bir plan oluştur.')).toBeTruthy();

    click('#new-plan');
    expect(container.querySelector('.editor2')).toBeTruthy();
    fireEvent.change(container.querySelector('#plan-name'), { target: { value: 'Push Planı' } });
    fireEvent.click(within(container.querySelector('.wd-pick')).getByRole('button', { name: 'Pzt' }));
    click('#add-item');
    const picker = await screen.findByRole('dialog', { name: 'Hareket ekle' });
    // V33 · antrenman öncesi ısınma listenin başında; ilk kuvvet hareketi ikinci sırada
    expect(picker.querySelectorAll('.exr-n')[0].textContent).toBe('Antrenman öncesi ısınma');
    const exName = picker.querySelectorAll('.exr-n')[1].textContent;
    fireEvent.click(picker.querySelectorAll('.exr-main')[1]);
    // Hareket seçilince ayar penceresi kendiliğinden açılır; sayılar sürüklemeli, not hazır seçeneklerden
    const itemSheet = await screen.findByRole('dialog', { name: exName });
    const setSlider = within(itemSheet).getByRole('slider', { name: 'Set' });
    const before = Number(setSlider.getAttribute('aria-valuenow'));
    fireEvent.keyDown(setSlider, { key: 'ArrowRight' });
    await waitFor(() => expect(Number(within(itemSheet).getByRole('slider', { name: 'Set' }).getAttribute('aria-valuenow'))).toBe(before + 1));
    fireEvent.keyDown(within(itemSheet).getByRole('slider', { name: 'En çok tekrar' }), { key: 'ArrowLeft' });
    fireEvent.click(within(itemSheet).getByRole('button', { name: 'Altta beklet' }));
    await waitFor(() => expect(within(itemSheet).getByRole('button', { name: 'Altta beklet' }).getAttribute('aria-pressed')).toBe('true'));
    fireEvent.click(within(itemSheet).getAllByRole('button', { name: 'Kapat' }).at(-1));
    await waitFor(() => expect(container.querySelector('.ed2-list .item-t em')?.textContent).toBe('Altta beklet'));
    expect(container.querySelector('.ed2-list .item-t small').textContent).toContain((before + 1) + ' × ');
    click('#ed-back');

    await waitFor(() => expect(container.querySelector('.plan-list')).toBeTruthy());
    expect(container.querySelector('.plan-list').textContent).toContain('Push Planı');
    expect(container.querySelector('.plan-list').textContent).toContain('1 hareket · Pzt');
  });

  it('Gözlem sekmesinde 42 hücreli takvimi, haftalık ve tek günlük plan halkalarını, ay geçişini ve gözlem metriklerini gösterir', async () => {
    const now = new Date();
    await db.sessions.put({
      id: 's-month',
      dayId: null,
      dayName: 'Plansız antrenman',
      status: 'done',
      startedAt: now.getTime() - 1200_000,
      endedAt: now.getTime() - 600_000,
      items: [{
        id: 'i1',
        exId: 'egimli-bench',
        name: 'Eğimli bench press',
        muscle: 'Göğüs',
        target: { rest: 180 },
        sets: [{ kg: 75, reps: 8, rir: 2, rpe: 8, lvl: 2, vl: 0.2, at: now.getTime() - 900_000 }],
      }],
    });
    await db.programs.put({
      id: 'p-mon',
      name: 'Pazartesi Planı',
      createdAt: 1,
      updatedAt: 2,
      days: [{
        id: 'd-mon',
        name: 'Pazartesi Planı',
        weekdays: [1],
        dates: [],
        skip: [],
        items: [{ id: 'i1', exId: 'squat', name: 'Squat', muscle: 'Quadriceps', sets: 3, repMin: 5, repMax: 5, kg: 100, rpeMin: 8, rpeMax: 8, rest: 180, note: '' }],
      }],
    });

    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-gozlem');

    expect(await screen.findByRole('heading', { level: 1, name: 'Antrenman plan ve gözlem' })).toBeTruthy();
    const cells = container.querySelectorAll('.cal .cal-d');
    expect(cells).toHaveLength(42);
    const todayKey = dateKey(now);
    const todayCell = container.querySelector(`.cal-d[data-date="${todayKey}"]`);
    expect(todayCell?.classList.contains('today')).toBe(true);
    expect(todayCell?.classList.contains('sel')).toBe(true);

    // Gelecek Pazartesi hücresinde halka (.cal-m.plan)
    let nextMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    while (nextMon.getDay() !== 1) {
      nextMon = new Date(nextMon.getFullYear(), nextMon.getMonth(), nextMon.getDate() + 1);
    }
    const nextMonKey = dateKey(nextMon);
    if (nextMon.getMonth() !== now.getMonth()) {
      click('#cal-next');
    }
    const monCell = container.querySelector(`.cal-d[data-date="${nextMonKey}"]`);
    expect(monCell?.querySelector('.cal-m.plan')).toBeTruthy();
    if (nextMon.getMonth() !== now.getMonth()) {
      click('#cal-prev');
    }

    // Yarın için tek günlük plan ekle -> halka oluşur -> Bu günden kaldır -> halka gider
    // (Yarın Pazartesi ise Çarşamba seçelim ki haftalık Pazartesi planıyla çakışmasın)
    let targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (targetDay.getDay() === 1) {
      targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    }
    const targetKey = dateKey(targetDay);
    if (targetDay.getMonth() !== now.getMonth()) {
      click('#cal-next');
    }
    fireEvent.click(container.querySelector(`.cal-d[data-date="${targetKey}"]`));
    expect(container.querySelector(`.cal-d[data-date="${targetKey}"] .cal-m.plan`)).toBeNull();
    click('#day-add-plan');
    expect(await screen.findByRole('dialog', { name: 'Bu güne plan ekle' })).toBeTruthy();
    click('#plan-pick-save');
    await waitFor(() => expect(container.querySelector(`.cal-d[data-date="${targetKey}"] .cal-m.plan`)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Pazartesi Planı menüsü' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bu günden kaldır' }));
    await waitFor(() => expect(container.querySelector(`.cal-d[data-date="${targetKey}"] .cal-m.plan`)).toBeNull());

    if (targetDay.getMonth() !== now.getMonth()) {
      click('#cal-prev');
    }

    // Ay geçişi (#cal-next / #cal-prev)
    click('#cal-next');
    expect(container.querySelector('#cal-today')).toBeTruthy();
    click('#cal-prev');
    expect(container.querySelector('#cal-today')).toBeNull();

    // Gözlem bölümünde Metric; hareket gelişimi (V32) düğmeyle açılan listede, grafik hareketin penceresinde
    expect(container.querySelector('.mgrid .metric')).toBeTruthy();
    expect(container.querySelector('.chart-svg')).toBeNull();
    click('#obs-progress');
    const list = await screen.findByRole('dialog', { name: 'Hareket gelişimi' });
    const row = list.querySelector('.prog-row');
    expect(row).toBeTruthy();
    fireEvent.click(row!);
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBe(2));
    expect(screen.getAllByRole('dialog').at(-1)!.querySelector('.chart-svg')).toBeTruthy();
  });

  it('hedef boş açılır, yalnızca geçerli hedef kaydedilir ve kaldırılabilir', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    const click = selector => fireEvent.click(container.querySelector(selector));
    expect(container.querySelector('#goal-add')).toBeTruthy();
    expect(container.querySelector('#goal-card')).toBeNull();
    click('#goal-add');
    expect(container.querySelector('#goal-save').disabled).toBe(true);
    expect(screen.getByText('Önce bir hareket seç')).toBeTruthy();
    fireEvent.change(container.querySelector('#goal-search'), { target: { value: 'bench' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eğimli bench press', exact: true }));
    expect(container.querySelector('#goal-base').value).toBe('0');
    expect(container.querySelector('#goal-target').value).toBe('0');
    expect(container.querySelector('#goal-save').disabled).toBe(true);
    fireEvent.change(container.querySelector('#goal-base'), { target: { value: '95' } });
    fireEvent.blur(container.querySelector('#goal-base'));
    fireEvent.change(container.querySelector('#goal-target'), { target: { value: '95' } });
    fireEvent.blur(container.querySelector('#goal-target'));
    expect(container.querySelector('#goal-save').disabled).toBe(true);
    expect(screen.getByText('Hedef, başlangıçtan büyük olmalı')).toBeTruthy();
    fireEvent.change(container.querySelector('#goal-target'), { target: { value: '100' } });
    fireEvent.blur(container.querySelector('#goal-target'));
    expect(container.querySelector('#goal-save').disabled).toBe(false);
    click('#goal-save');
    await waitFor(() => expect(container.querySelector('#goal-card')).toBeTruthy());
    expect(container.querySelector('#goal-card').textContent).toContain('Eğimli bench press');
    expect(container.querySelector('#goal-card').textContent).toContain('100');
    click('#goal-card');
    expect(container.querySelector('#goal-base').value).toBe('95');
    click('#goal-remove');
    await waitFor(() => expect(container.querySelector('#goal-card')).toBeNull());
    expect(await db.settings.get('goal')).toBeUndefined();
  });

  it('eski goal ayarı olan kullanıcı güç kartını görür', async () => {
    await db.settings.put({
      key: 'goal',
      value: { exId: 'egimli-bench', name: 'Eğimli bench press', base: 85, target: 105, createdAt: 100 },
    });
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    expect(container.querySelector('.goal-card')).toBeTruthy();
    expect(container.querySelector('.goal-card').textContent).toContain('Eğimli bench press');
    expect(container.querySelector('.goal-card').textContent).toContain('105');
  });

  it('öğrenme hedefi ekler, Pratik et ile Kip-up seansı başlatır ve özetten aşamayı ilerletir', async () => {
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());

    click('#goal-add');
    click('#goal-type-skill');
    fireEvent.change(container.querySelector('#goal-search'), { target: { value: 'kip' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kip-up', exact: true }));
    fireEvent.click(screen.getByRole('radio', { name: 'Parçalarını yapıyorum' }));
    click('#goal-save');

    await waitFor(() => expect(container.querySelector('.skill-card')).toBeTruthy());
    expect(container.querySelector('.skill-card').textContent).toContain('Kip-up');
    expect(container.querySelector('.skill-card').textContent).toContain('Parçalarını yapıyorum');

    fireEvent.click(container.querySelector('.skill-card .skill-go'));
    await waitFor(() => expect(container.querySelector('#sq-0')).toBeTruthy());
    expect(container.querySelector('.px-head-title').textContent).toContain('KIP-UP');

    fireEvent.change(container.querySelector('input[id^="reps-"]'), { target: { value: '2' } });
    click('#sq-0');
    click('#log-set');
    fireEvent.click(await screen.findByRole('button', { name: 'GİZLE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Geri: antrenman listesi' }));

    click('#finish-btn');
    const summaryEl = await waitFor(() => {
      const el = container.querySelector('#pixel-summary');
      expect(el).toBeTruthy();
      return el!;
    });
    expect(summaryEl.textContent).toContain('Kip-up');
    expect(summaryEl.textContent).toContain('2 temiz deneme');
    fireEvent.click(within(summaryEl).getByRole('button', { name: 'Aşamayı ilerlet' }));
    click('#summary-done');

    click('#tab-bugun');
    await waitFor(() => expect(container.querySelector('.skill-card')).toBeTruthy());
    expect(container.querySelector('.skill-card').textContent).toContain('İlk temiz tekrar');
    expect(container.querySelector('.skill-card').textContent).toContain('1 pratik');
  });

  it('hedef önerilerinde son kayıt öndedir ve başlangıç son e1RM ile dolar', async () => {
    const session = (id, at, exId, kg) => ({ id, status: 'done', startedAt: at, endedAt: at + 1000, items: [{ exId, sets: [{ kg, reps: 8, rir: 2 }] }] });
    await db.sessions.bulkPut([session('old', 1, 'rdl', 60), session('new', 2, 'egimli-bench', 75)]);
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    fireEvent.click(container.querySelector('#goal-add'));
    const chips = container.querySelectorAll('.note-sheet .fchip');
    expect(chips).toHaveLength(8);
    expect(chips[0].textContent).toBe('Eğimli bench press');
    fireEvent.click(chips[0]);
    expect(container.querySelector('#goal-base').value).toBe('100');
    expect(container.querySelector('#goal-target').value).toBe('0');
    expect(await db.programs.count()).toBe(0);
  });

  it('hesap, e-posta, onay ve hesap silme ekranlarını açar', async () => {
    await db.programs.put(hipertrofiProgram());
    const { container } = render(<App />);
    const click = selector => fireEvent.click(container.querySelector(selector));
    await screen.findByRole('heading', { name: 'Dashboard' });
    await waitFor(async () => expect(await db.programs.count()).toBe(1));
    click('#account-btn');
    expect(await screen.findByRole('dialog', { name: 'Hesap ve ayarlar' })).toBeTruthy();
    click('#email-signin');
    fireEvent.change(container.querySelector('#acct-email'), { target: { value: 'spor@example.com' } });
    fireEvent.change(container.querySelector('#acct-pass'), { target: { value: 'secret123' } });
    click('#acct-email-go');
    expect(await screen.findByRole('dialog', { name: 'Verilerin nasıl kullanılır' })).toBeTruthy();
    expect(container.querySelector('#consent-yes').disabled).toBe(true);
    expect(screen.getByText(/özgür irademle açık rıza veriyorum/)).toBeTruthy();
    expect(container.querySelector('#consent-no').textContent).toBe('Rıza vermeden misafir devam et');
    click('#consent-check');
    click('#consent-yes');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(async () => expect(await db.snapshots.count()).toBe(1));
    click('#account-btn');
    click('#delete-account');
    expect(container.querySelector('#delete-yes').disabled).toBe(true);
    fireEvent.change(container.querySelector('#del-confirm'), { target: { value: 'SİL' } });
    expect(container.querySelector('#delete-yes').disabled).toBe(false);
    expect(testEnvironment.runtime.deleteAccount).not.toHaveBeenCalled();
    expectHealthy();
  });

  it('ilk açılışta yasal kapı çıkar: koşullar kabul, aydınlatma yalnızca okundu', async () => {
    localStorage.removeItem(LEGAL_KEY);
    const { container } = render(<App />);
    const click = selector => fireEvent.click(container.querySelector(selector));
    expect(await screen.findByRole('heading', { name: 'Başlamadan önce' })).toBeTruthy();
    expect(container.querySelector('.app2-main').hasAttribute('inert')).toBe(true);
    expect(container.querySelector('#legal-go').disabled).toBe(true);
    click('#legal-open-kosullar');
    expect(await screen.findByRole('dialog', { name: 'Kullanım Koşulları' })).toBeTruthy();
    expect(screen.getByText(/tıbbi bir cihaz değildir/)).toBeTruthy();
    click('#legal-back');
    click('#legal-terms');
    expect(container.querySelector('#legal-go').disabled).toBe(true);
    click('#legal-notice');
    click('#legal-go');
    await waitFor(() => expect(container.querySelector('.lg-gate')).toBeNull());
    expect(readAcceptance().v).toBe(LEGAL.VERSION);
    expect(container.querySelector('.app2-main').hasAttribute('inert')).toBe(false);
    expectHealthy();
  });

  it('metin sürümü değişince kapı yeniden çıkar', async () => {
    localStorage.setItem(LEGAL_KEY, JSON.stringify({ v: '2000-01-01', at: 1 }));
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Metinler güncellendi' })).toBeTruthy();
  });

  it('hesap penceresinden yasal metinler açılır, misafir cihaz verisini siler', async () => {
    await db.programs.put(hipertrofiProgram());
    const { container } = render(<App />);
    const click = selector => fireEvent.click(container.querySelector(selector));
    await screen.findByRole('heading', { name: 'Dashboard' });
    await waitFor(async () => expect(await db.programs.count()).toBe(1));
    click('#account-btn');
    await screen.findByRole('dialog', { name: 'Hesap ve ayarlar' });
    click('#legal-gizlilik');
    expect(await screen.findByRole('dialog', { name: 'Gizlilik Politikası' })).toBeTruthy();
    expect(screen.getAllByText(/PRWAGON LLC/).length).toBeGreaterThan(0);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Gizlilik Politikası' })).getAllByRole('link', { name: 'Açık Rıza Metni' })[0]);
    expect(await screen.findByRole('dialog', { name: 'Açık Rıza Metni' })).toBeTruthy();
    const close = () => fireEvent.click(within(screen.getAllByRole('dialog').at(-1)).getAllByRole('button', { name: 'Kapat' }).at(-1));
    close(); close();
    click('#wipe-device');
    click('#wipe-yes');
    await waitFor(async () => expect(await db.programs.count()).toBe(0));
    expectHealthy();
  });

  it('hesaplı kullanıcı açık rızasını geri alabilir', async () => {
    testEnvironment.setConsent(true);
    testEnvironment.login('password', 'spor@example.com');
    const { container } = render(<App />);
    const click = selector => fireEvent.click(container.querySelector(selector));
    await screen.findByRole('heading', { name: 'Dashboard' });
    await waitFor(() => expect(container.querySelector('#account-btn.ok')).toBeTruthy());
    click('#account-btn');
    await screen.findByRole('dialog', { name: 'Hesap ve ayarlar' });
    click('#withdraw-consent');
    expect(screen.getByText(/Kayıtların bu telefonda misafir olarak kalır/)).toBeTruthy();
    click('#withdraw-yes');
    await waitFor(() => expect(testEnvironment.runtime.withdraw).toHaveBeenCalledTimes(1));
    expectHealthy();
  });

  it('kütüphaneyi filtreler ve karma pliometrik/kuvvet antrenmanını kaydeder', async () => {
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    const close = () => fireEvent.click(within(screen.getAllByRole('dialog').at(-1)).getAllByRole('button', { name: 'Kapat' }).at(-1));
    await screen.findByRole('heading', { name: 'Dashboard' });
    click('#tab-lab');
    click('#lab-part-hareket');
    fireEvent.change(container.querySelector('#lab-search'), { target: { value: 'bench' } });
    expect(container.querySelector('#labex-duz-bench')).toBeTruthy();
    fireEvent.change(container.querySelector('#lab-search'), { target: { value: '' } });
    click('#lab-kind-plyo');
    click('#labex-derinlik-sicrama');
    expect(await screen.findByRole('dialog', { name: 'Derinlik sıçraması (depth jump)' })).toBeTruthy();
    expect(screen.getByText(/48–72/)).toBeTruthy();
    close();
    click('#tab-antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    click('#ses-add-first');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'box jump' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    fireEvent.click(container.querySelector('.card-main'));
    await waitFor(() => expect(container.querySelector('#pq-1')).toBeTruthy());
    click('#pq-1');
    click('#log-set');
    await waitFor(() => expect(container.querySelector('#rest-big')).toBeTruthy());
    click('#log-set');
    fireEvent.click(await screen.findByRole('button', { name: 'GEÇ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set 1: 5 temas. Ayrıntı' }));
    expect(within(screen.getByRole('dialog', { name: 'Set ayrıntısı' })).getByText('Biraz düştü')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'KAPAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Geri: antrenman listesi' }));
    click('#fx-add');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'düz bench' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    fireEvent.click(container.querySelectorAll('.card-main')[1]);
    await waitFor(() => expect(container.querySelector('#pq-1')).toBeNull());
    click('#log-set');
    fireEvent.click(await screen.findByRole('button', { name: 'GİZLE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Geri: antrenman listesi' }));
    click('#finish-btn');
    await waitFor(() => expect(container.querySelector('#pixel-summary')).toBeTruthy());
    await waitFor(async () => {
      const done = (await db.sessions.toArray()).find(s => s.status === 'done');
      expect(done.items[0].sets).toHaveLength(2);
      expect(done.items[0].sets[0]).toMatchObject({ plyo: true, reps: 5, rpe: null, q: 1 });
      expect(done.items[1].sets).toHaveLength(1);
    });
    expectHealthy();
  });

  it('ana akışları hatasız tamamlar', async () => {
    await db.programs.put(hipertrofiProgram());
    const { container } = render(<App />);

    const click = (selector: string) => {
      const element = container.querySelector(selector);
      expect(element, selector).toBeTruthy();
      fireEvent.click(element!);
    };
    const closeTopSheet = () => {
      const dialog = screen.getAllByRole('dialog').at(-1)!;
      fireEvent.click(within(dialog).getAllByRole('button', { name: 'Kapat' }).at(-1)!);
    };

    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
    await waitFor(async () => expect(await db.programs.count()).toBe(1));
    fireEvent.click(screen.getByRole('radio', { name: '5' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: '5' }).getAttribute('aria-checked')).toBe('true'));
    click('#ready-ring');
    expect(await screen.findByRole('dialog', { name: 'Yorgunluk ölçer' })).toBeTruthy();
    // Kaydırıcı oynayınca ibre simülasyonu gösterir; "Şu an" ile gerçek değere döner.
    const gauge = () => screen.getByRole('img', { name: /SSS yorgunluk ölçer/ }).getAttribute('aria-label');
    const nowLabel = gauge();
    expect(screen.getByRole('tab', { name: 'Şu an' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.change(container.querySelector('#f-sets')!, { target: { value: '80' } });
    fireEvent.change(container.querySelector('#f-rir')!, { target: { value: '0' } });
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Simülasyon' }).getAttribute('aria-selected')).toBe('true'));
    const simLabel = gauge();
    expect(simLabel).not.toBe(nowLabel);
    fireEvent.change(container.querySelector('#f-sets')!, { target: { value: '4' } });
    await waitFor(() => expect(gauge()).not.toBe(simLabel));
    click('#fat-now');
    await waitFor(() => expect(gauge()).toBe(nowLabel));
    closeTopSheet();

    click('#tab-antrenman');
    const heavy = await screen.findByText('Ağır gün', { selector: 'strong' });
    fireEvent.click(heavy.closest('button')!);
    expect(await screen.findByRole('dialog', { name: 'Ağır gün' })).toBeTruthy();
    click('#wtype-start');
    // V29: planlı oturum da plansızla aynı pixel ekranında; liste plan adını, hedefleri ve notları gösterir
    await waitFor(() => expect(container.querySelector('.px-card.cur')).toBeTruthy());
    expect(container.querySelector('.px-ses-title').textContent).toBe('AĞIR GÜN');
    const card = container.querySelector('.px-card.cur');
    expect(card.querySelector('.px-card-tg').textContent).toContain('2 × 5–8');
    expect(card.querySelector('.px-card-tg').textContent).toContain('Ağır setler');
    expect(card.textContent).toContain('0/2 set');
    fireEvent.click(card.querySelector('.card-main'));
    await waitFor(() => expect(container.querySelector('#log-set')).toBeTruthy());
    expect(container.querySelector('.px-plan').textContent).toContain('RPE 9–10');
    expect(container.querySelector('.px-plan-note').textContent).toBe('Ağır setler');
    expect(container.querySelector('.px-head-sub').textContent).toContain('SET 1/2');
    // ilk set hedef kilodan başlar
    expect(container.querySelector('.px-kg-bar').getAttribute('aria-valuenow')).toBe('75');
    click('#log-set');
    fireEvent.click(await screen.findByRole('button', { name: 'GEÇ' }));
    click('#log-set');
    fireEvent.click(await screen.findByRole('button', { name: 'GEÇ' }));
    expect(container.querySelector('.px-sets-sum').textContent).toContain('2/2 set');
    await waitFor(async () => {
      const act = (await db.sessions.toArray()).find(x => x.status === 'active');
      expect(act.items[0].sets).toHaveLength(2);
      expect(act.items[0].sets[0]).toMatchObject({ kg: 75, reps: 8 });
    });
    fireEvent.click(screen.getByRole('button', { name: /Set 1:.*Ayrıntı/ }));
    expect(screen.getByRole('dialog', { name: 'Set ayrıntısı' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'KAPAT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Geri: antrenman listesi' }));
    expect(container.querySelector('.px-card').textContent).toContain('2/2 set');
    click('#finish-btn');
    const pxSummary = await waitFor(() => {
      const el = container.querySelector('#pixel-summary');
      expect(el).toBeTruthy();
      return el!;
    });
    expect(pxSummary.textContent).toContain('AĞIR GÜN · ÖZET');
    click('#summary-done');
    // Geçmişten açılan özet: geçmiş setin kutucuğu salt okunur ayrıntı açar (hız, ROM, tonaj; silme yok)
    fireEvent.click(await waitFor(() => { const r = container.querySelector('.hist-inline .hrow'); expect(r).toBeTruthy(); return r!; }));
    const summary = await screen.findByRole('dialog', { name: 'Antrenman özeti' });
    expect(screen.getByText('Tonaj')).toBeTruthy();
    fireEvent.click(within(summary).getByRole('button', { name: 'Set 1 ayrıntısı' }));
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThan(1));
    const detail = screen.getAllByRole('dialog').at(-1);
    expect(within(detail).getByText('Son tekrar hızı')).toBeTruthy();
    expect(within(detail).getByText('ROM')).toBeTruthy();
    expect(within(detail).queryByRole('button', { name: /Seti sil/ })).toBeNull();
    closeTopSheet();
    closeTopSheet();
    await waitFor(() => expect(container.querySelector('#tab-antrenman')?.getAttribute('aria-current')).toBe('page'));

    const menuButton = await screen.findByRole('button', { name: 'Ağır gün seçenekleri' });
    fireEvent.click(menuButton);
    const typeName = screen.getByLabelText('Plan adı');
    fireEvent.change(typeName, { target: { value: 'Ağır güç' } });
    fireEvent.blur(typeName);
    // silme düğmeleri basılı tutmalı (1 sn); dokunmak silmez
    expect(container.querySelector('#wtype-del').className).toContain('px-hold');
    closeTopSheet();

    click('#free-session');
    await waitFor(() => expect(container.querySelector('#start-ses-btn')).toBeTruthy());
    expect(container.querySelector('#discard-ready-btn').className).toContain('px-hold');
    click('#discard-ready-btn');
    await waitFor(() => expect(container.querySelector('#tab-antrenman')?.getAttribute('aria-current')).toBe('page'));

    click('#tab-gozlem');
    await waitFor(() => expect(container.querySelector('#obs-done')).toBeTruthy());
    click('#obs-done');
    const doneSheet = await screen.findByRole('dialog', { name: 'Yapılan haftalık yük' });
    expect(doneSheet.querySelector('.mbar')).toBeTruthy();
    closeTopSheet();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(container.querySelector('#obs-plan').disabled).toBe(false);
    click('#obs-plan');
    expect(await screen.findByRole('dialog', { name: 'Planlanan haftalık yük' })).toBeTruthy();
    fireEvent.click(container.querySelector('.plan2-meter')!);
    expect(await screen.findByRole('dialog', { name: 'Yorgunluk ölçer' })).toBeTruthy();
    closeTopSheet();
    closeTopSheet();

    click('#tab-lab');
    click('#lab-measure');
    expect(await screen.findByRole('dialog', { name: 'Yorgunluk nasıl ölçülür?' })).toBeTruthy();
    closeTopSheet();
    click('#lab-part-hareket');
    click('#labex-egimli-bench');
    expect(await screen.findByRole('dialog', { name: 'Eğimli bench press' })).toBeTruthy();
    expectHealthy();

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('set ekranı açılınca hazır oturum başlar ve bildirim çıkar; geri tuşu listeye döner', async () => {
    const { container } = render(<App />);
    const click = (s) => fireEvent.click(container.querySelector(s));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    expect((await db.sessions.toArray())[0].ready).toBe(true);

    click('#ses-add-first');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'düz bench' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    expect((await db.sessions.toArray())[0].ready).toBe(true);

    fireEvent.click(container.querySelector('.card-main'));
    expect(screen.getByText('İDMAN BAŞLADI')).toBeTruthy();
    expect(screen.getByText('Set ekranını açtın, süreyi başlattım')).toBeTruthy();
    await waitFor(async () => expect((await db.sessions.toArray())[0].ready).toBeUndefined());

    act(() => { backStack.dispatch(); });
    await waitFor(() => expect(container.querySelector('#finish-btn')).toBeTruthy());
    expect(container.querySelector('.card-main')).toBeTruthy();
  });

  it('çoklu seçimle iki hareket eklenince listeye dönülür; ROM sıfırlanır ve setler yeniden eskiye sıralanır', async () => {
    const { container } = render(<App />);
    const click = (s) => fireEvent.click(container.querySelector(s));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    click('#ses-add-first');

    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'bench' } });
    const rows = container.querySelectorAll('.pk');
    fireEvent.click(rows[0]);
    fireEvent.click(rows[1]);
    expect(container.querySelector('#pick-add').textContent).toBe('2 HAREKET EKLE');
    click('#pick-add');

    await waitFor(() => expect(container.querySelectorAll('.px-card')).toHaveLength(2));
    fireEvent.click(container.querySelectorAll('.card-main')[0]);

    const kgSlider = container.querySelector('[id^="kg-"]');
    const romSlider = screen.getByRole('slider', { name: 'Hareket açıklığı (ROM)' });

    // Set 1: 20 kg
    click('#log-set');
    fireEvent.click(await screen.findByRole('button', { name: 'GEÇ' }));

    // Set 2: 22.5 kg, Belirgin hız (RIR 2 -> 10+2=12) ve ROM %85
    fireEvent.keyDown(kgSlider, { key: 'ArrowRight' });
    expect(kgSlider.getAttribute('aria-valuenow')).toBe('22.5');
    click('#speed-2');
    fireEvent.keyDown(romSlider, { key: 'ArrowLeft' });
    fireEvent.keyDown(romSlider, { key: 'ArrowLeft' });
    fireEvent.keyDown(romSlider, { key: 'ArrowLeft' });
    expect(romSlider.getAttribute('aria-valuenow')).toBe('85');
    click('#log-set');

    // Kaydet sonrası ROM %100'e döner
    expect(romSlider.getAttribute('aria-valuenow')).toBe('100');
    fireEvent.click(await screen.findByRole('button', { name: 'GİZLE' }));

    // Set kutucukları yeniden eskiye sıralanır
    const tiles = [...container.querySelectorAll('.px-sets-grid .st .st-main')].map((el) => el.textContent);
    expect(tiles).toEqual(['22,5×10', '20×10']);

    // ROM %85 olan sette e1RM yok
    fireEvent.click(container.querySelectorAll('.px-sets-grid .st')[0]);
    expect(screen.getByRole('dialog', { name: 'Set ayrıntısı' }).textContent).toContain('ROM %90 altı');
  });

  it('kilo barı klavye okuyla barbell için 2,5 kg, makinede 5 kg adım atar', async () => {
    const { container } = render(<App />);
    const click = (s) => fireEvent.click(container.querySelector(s));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    click('#ses-add-first');

    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'leg extension' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');

    fireEvent.click(container.querySelector('.card-main'));
    const mkSlider = container.querySelector('[id^="kg-"]');
    expect(mkSlider.getAttribute('aria-valuenow')).toBe('0');
    fireEvent.keyDown(mkSlider, { key: 'ArrowRight' });
    expect(mkSlider.getAttribute('aria-valuenow')).toBe('5');
    fireEvent.keyDown(mkSlider, { key: 'PageUp' });
    expect(mkSlider.getAttribute('aria-valuenow')).toBe('25');
  });
  // V32 · unutulan antrenman: 10 dk girişsiz → "Hâlâ orada mısın?"; 15 dk → son girişte kendiliğinden biter.
  // Son giriş cihazda oturum kimliğiyle saklanır; her test kendi kimliğini kullanır.
  let idleN = 0;
  const activeSession = (lastSetAgoMin, sets = true) => {
    const now = Date.now();
    idleN += 1;
    return {
      id: 's-idle-' + idleN, programId: null, programName: '', dayId: null, dayName: 'Plansız antrenman', status: 'active',
      startedAt: now - (lastSetAgoMin + 30) * 60_000, endedAt: null,
      items: [{ id: 'i1', exId: 'egimli-bench', name: 'Eğimli bench press', muscle: 'Göğüs', note: '', target: { rest: 120 },
        sets: sets ? [{ kg: 80, reps: 8, lvl: 2, vl: 0.3, rpe: null, rir: 2, rom: 100, at: now - lastSetAgoMin * 60_000 }] : [] }],
    };
  };

  it('10 dk giriş yoksa "Hâlâ orada mısın?" sorar; "Buradayım" antrenmanı sürdürür', async () => {
    const s = activeSession(11);
    await db.sessions.put(s);
    render(<App />);
    const ask = await screen.findByRole('alertdialog', { name: 'Hâlâ orada mısın?' });
    expect(ask.textContent).toMatch(/\d:\d\d/);
    fireEvent.click(within(ask).getByRole('button', { name: 'Buradayım, devam' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect((await db.sessions.get(s.id)).status).toBe('active');
  });

  it('pencerede "Antrenmanı bitir" son girişin saatinde bitirir (kendiliğinden işareti yok)', async () => {
    const s = activeSession(12);
    await db.sessions.put(s);
    render(<App />);
    const ask = await screen.findByRole('alertdialog', { name: 'Hâlâ orada mısın?' });
    fireEvent.click(within(ask).getByRole('button', { name: 'Antrenmanı bitir' }));
    await waitFor(async () => expect((await db.sessions.get(s.id)).status).toBe('done'));
    const done = await db.sessions.get(s.id);
    expect(done.endedAt).toBe(s.items[0].sets[0].at);
    expect(done.autoEnd).toBeUndefined();
  });

  it('15 dk giriş yoksa antrenman son girişin saatinde kendiliğinden biter ve kayıtta belirtilir', async () => {
    const s = activeSession(20);
    await db.sessions.put(s);
    const { container } = render(<App />);
    await waitFor(async () => expect((await db.sessions.get(s.id)).status).toBe('done'));
    const done = await db.sessions.get(s.id);
    expect(done.endedAt).toBe(s.items[0].sets[0].at);
    expect(done.autoEnd.last).toBe(s.items[0].sets[0].at);
    expect(done.fatigue).toMatchObject({ v: 2 });
    expect(container.querySelector('#idle-notice').textContent).toContain('kendiliğinden bitti');
    fireEvent.click(container.querySelector('#tab-antrenman'));
    expect(await screen.findByText('Kendiliğinden bitirildi: 15 dakika giriş olmadı. Bitiş saati son girişin saati.')).toBeTruthy();
  });

  it('set kaydı yoksa 15 dk sonra kayıt açılmaz: antrenman hazır durumuna döner', async () => {
    const s = activeSession(20, false);
    await db.sessions.put(s);
    render(<App />);
    await waitFor(async () => expect((await db.sessions.get(s.id)).ready).toBe(true));
    expect((await db.sessions.get(s.id)).status).toBe('active');
  });
  // V33 · ısınma seti, set özelliği, hedef aralık, sürükleme hızı
  it('ısınma seti hesaplara girmez; set özelliği "Tükenişe kadar" hızı Zar zor yapar; hedef aralık hatırlanır', async () => {
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    click('#ses-add-first');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'düz bench' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    await waitFor(() => expect(container.querySelector('.card-main')).toBeTruthy());
    fireEvent.click(container.querySelector('.card-main'));
    // barbell 20 kg'ın altına inmez
    const kgBar = container.querySelector('[id^="kg-"]');
    expect(kgBar.getAttribute('aria-valuemin')).toBe('20');
    fireEvent.keyDown(kgBar, { key: 'ArrowLeft' });
    expect(kgBar.getAttribute('aria-valuenow')).toBe('20');

    click('#speed-warm');
    expect(container.querySelector('#log-set').textContent).toBe('ISINMA SETİ BİTTİ');
    expect(container.querySelector('.px-head-sub').textContent).toContain('ISINMA SETİ');
    click('#log-set');
    fireEvent.click(await screen.findByRole('button', { name: 'GEÇ' }));
    await waitFor(() => expect(container.querySelector('#log-set')).toBeTruthy());
    let saved = (await db.sessions.toArray())[0];
    expect(saved.items[0].sets[0]).toMatchObject({ warm: true, rir: 9, lvl: null });
    expect(saved.rest).toBeUndefined();
    // ısınma bir kez seçilir: sonraki set yine iş seti, numarası 1
    expect(container.querySelector('#log-set').textContent).toBe('SET 1 BİTTİ');

    // set özelliği: sağ üstten
    click('#note-btn');
    const sheet = await screen.findByRole('dialog');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Drop set' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Tükenişe kadar' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(container.querySelector('#speed-4').getAttribute('aria-checked')).toBe('true'));
    expect(container.querySelector('.px-head-sub').textContent).toContain('DROP SET');
    expect(container.querySelector('#note-btn .ib-badge').textContent).toBe('2');

    // hedef tekrar aralığı (plansız)
    click('#rep-range');
    const win = await screen.findByRole('dialog', { name: 'Hedef tekrar aralığı' });
    fireEvent.click(within(win).getByRole('button', { name: 'TAMAM' }));
    await waitFor(() => expect(container.querySelector('#rep-range').textContent).toContain('HEDEF'));
    click('#log-set');
    await waitFor(async () => expect((await db.sessions.toArray())[0].items[0].sets).toHaveLength(2));
    saved = (await db.sessions.toArray())[0];
    expect(saved.items[0].sets[1]).toMatchObject({ lvl: 4, rir: 0, tags: ['Drop set', 'Tükenişe kadar'] });
    expect(saved.items[0].sets[1].warm).toBeUndefined();
    expect(saved.items[0].range).toEqual({ lo: 8, hi: 12 });
    expect((await db.settings.get('repRanges')).value).toEqual({ 'duz-bench': [8, 12] });
  });

  it('sürgü hızı %40 ayarı kilo başlığından açılıp kapanır', async () => {
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    click('#ses-add-first');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'düz bench' } });
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    await waitFor(() => expect(container.querySelector('.card-main')).toBeTruthy());
    fireEvent.click(container.querySelector('.card-main'));
    expect(container.querySelector('#drag-speed').getAttribute('aria-pressed')).toBe('false');
    click('#drag-speed');
    await waitFor(async () => expect((await db.settings.get('fx')).value.slow).toBe(true));
    await waitFor(() => expect(container.querySelector('#drag-speed').getAttribute('aria-pressed')).toBe('true'));
  });

  it('antrenman öncesi ısınma: listenin başında, süre ve nabız skalası kaydolur', async () => {
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    click('#ses-add-first');
    expect(container.querySelector('.pk').textContent).toContain('Antrenman öncesi ısınma');
    fireEvent.click(container.querySelector('.pk'));
    click('#pick-add');
    await waitFor(() => expect(container.querySelector('.card-main')).toBeTruthy());
    fireEvent.click(container.querySelector('.card-main'));
    expect(container.querySelector('#log-set').textContent).toBe('ISINMA BİTTİ');
    expect(container.querySelector('[id^="kg-"]')).toBeNull();
    click('#hz-3');
    expect(container.querySelector('#hz-3').getAttribute('aria-checked')).toBe('true');
    click('#log-set');
    await waitFor(async () => expect((await db.sessions.toArray())[0].items[0].sets).toHaveLength(1));
    expect((await db.sessions.toArray())[0].items[0].sets[0]).toMatchObject({ warm: true, dur: 10, z: 3 });
  });

  it('planlı antrenman hazır açılır, hedef setler kutucuk olarak sırayla dolar; plan penceresinde gün basılı tutulur', async () => {
    await db.programs.put({ id: 'p1', name: '', createdAt: 1, updatedAt: 1, days: [{ id: 'd1', name: 'Buff', weekdays: [2], dates: [], skip: [], items: [
      { id: 'i1', exId: 'duz-bench', name: 'Düz bench press', muscle: 'Göğüs', sets: 3, repMin: 8, repMax: 12, kg: 60, rpeMin: 8, rpeMax: 9, rest: 120, note: '' },
    ] }] });
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    await waitFor(() => expect(container.querySelector('.wtype-main, .plan-row, [data-plan]')).toBeTruthy());
    fireEvent.click(container.querySelector('.wtype-main, .plan-row, [data-plan]'));
    const menu = await screen.findByRole('dialog');
    // kısa dokunuş günü değiştirmez (basılı tutmak gerekir)
    const wed = within(menu).getByRole('button', { name: 'Çarşamba: basılı tut' });
    fireEvent.pointerDown(wed, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(wed, { button: 0, pointerId: 1 });
    expect((await db.programs.get('p1')).days[0].weekdays).toEqual([2]);
    // Başlat (klavye/erişilebilirlik tıklaması basılı tutmadan çalışır) → hazır
    fireEvent.click(within(menu).getByRole('button', { name: /Başlat/ }));
    await waitFor(() => expect(container.querySelector('#start-ses-btn')).toBeTruthy());
    expect(screen.getByText('başlamadı')).toBeTruthy();
    click('#start-ses-btn');
    await waitFor(() => expect(container.querySelector('#finish-btn')).toBeTruthy());
    fireEvent.click(container.querySelector('.card-main'));
    expect(container.querySelectorAll('.st.slot')).toHaveLength(3);
    expect(container.querySelector('.st.slot-next').textContent).toContain('60×8–12');
    expect(screen.queryByText(/Son sefer/)).toBeNull();
    click('#log-set');
    await waitFor(() => expect(container.querySelectorAll('.st.slot.fill')).toHaveLength(1));
    expect(container.querySelectorAll('.st.slot')).toHaveLength(3);
  });

  it('takvimde parmakla sola kaydırınca sonraki aya geçer, kaydırma gün seçmez', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    fireEvent.click(container.querySelector('#tab-gozlem'));
    await waitFor(() => expect(container.querySelector('.cal')).toBeTruthy());
    const title = container.querySelector('.cal-title').textContent;
    const cal = container.querySelector('.cal');
    fireEvent.pointerDown(cal, { clientX: 260, clientY: 300 });
    fireEvent.pointerUp(cal, { clientX: 120, clientY: 305 });
    fireEvent.click(cal);
    await waitFor(() => expect(container.querySelector('.cal-title').textContent).not.toBe(title));
    fireEvent.pointerDown(cal, { clientX: 100, clientY: 300 });
    fireEvent.pointerUp(cal, { clientX: 260, clientY: 300 });
    await waitFor(() => expect(container.querySelector('.cal-title').textContent).toBe(title));
  });
});
