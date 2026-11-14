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
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    cleanup();
    db.close();
    await db.delete();
  });

  it('plansız ekranda yalnızca yapılan setleri gösterir, dinlenmeyi saklar ve setsiz hareketi çıkarır', async () => {
    const { container } = render(<App />);
    const click = selector => fireEvent.click(container.querySelector(selector));
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    click('#tab-antrenman');
    expect(container.querySelector('#free-session').textContent).toContain('Plansız antrenman');
    click('#free-session');
    await waitFor(() => expect(container.querySelector('#ses-add-first')).toBeTruthy());
    click('#ses-add-first');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'düz bench' } });
    fireEvent.click(container.querySelector('.exr-main'));
    expect(container.querySelector('.dock input[id^="kg-"]').value).toBe('20');
    expect(container.querySelector('.dock input[id^="reps-"]').value).toBe('10');
    expect(container.querySelector('.tgt2, .exprog, .exnav, .srow.plan, .srow.now, .spwrap')).toBeNull();
    expect(container.querySelector('#log-set').textContent).toBe('Seti kaydet');
    expect(screen.getByText('İlk setini kaydet')).toBeTruthy();
    click('#log-set');
    expect(container.querySelectorAll('.srow.done')).toHaveLength(1);
    expect(container.querySelector('#rest-big, .restchip')).toBeTruthy();
    await waitFor(() => expect(native.start).toHaveBeenCalledTimes(1));
    const saved = (await db.sessions.toArray())[0];
    expect(saved.rest).toMatchObject({ total: 180, exId: 'duz-bench', setNo: 1, start: saved.items[0].sets[0].at });
    expect(native.start).toHaveBeenLastCalledWith(expect.objectContaining({ endAt: saved.rest.start + 180000, body: '2. set sırada' }));
    expect(native.stop.mock.invocationCallOrder[0]).toBeLessThan(native.start.mock.invocationCallOrder[0]);
    fireEvent.click(screen.getByRole('button', { name: '15 saniye ekle' }));
    await waitFor(async () => expect((await db.settings.get('restPrefs')).value).toEqual({ 'duz-bench': 195 }));
    click('#log-set');
    await waitFor(() => expect(native.start).toHaveBeenCalledTimes(3));
    expect(native.stop.mock.invocationCallOrder.at(-1)).toBeLessThan(native.start.mock.invocationCallOrder.at(-1));
    await waitFor(async () => expect((await db.sessions.toArray())[0].rest.total).toBe(195));
    click('#tab-bugun');
    click('#tab-antrenman');
    await waitFor(() => expect(container.querySelector('#rest-big, .restchip')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Atla' }));
    await waitFor(async () => expect((await db.sessions.toArray())[0].rest).toBeUndefined());
    click('#fx-add');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'Oturarak dumbbell omuz press' } });
    fireEvent.click(container.querySelector('.exr-main'));
    expect(container.querySelectorAll('.fx-chip')).toHaveLength(2);
    expect(container.querySelector('.fx-chip.on').textContent).toContain('dumbbell');
    expect(container.querySelector('#log-set').disabled).toBe(true);
    expect(screen.getByText('Kiloyu gir')).toBeTruthy();
    fireEvent.click(container.querySelector('.fx-chip.on .fx-remove'));
    expect(container.querySelectorAll('.fx-chip')).toHaveLength(1);
    expect(container.querySelector('.fx-chip .fx-remove')).toBeNull();
    expect(container.querySelector('.s-v.off')).toBeNull();
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
    fireEvent.click(container.querySelector('.exr-main'));
    expect(container.querySelector('input[id^="kg-"]').value).toBe('60');
    expect(container.querySelector('input[id^="reps-"]').value).toBe('10');
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
    fireEvent.click(container.querySelector('.exr-main'));
    click('#log-set');
    await waitFor(() => expect(native.start).toHaveBeenCalled());
    await waitFor(async () => expect((await db.sessions.toArray())[0].items[0].sets).toHaveLength(1));
    click('#finish-btn');
    act(() => { backStack.dispatch(); });
    expect(container.querySelector('#finish-yes')).toBeNull();
    click('#finish-btn'); click('#finish-yes');
    await waitFor(() => expect(native.stop).toHaveBeenCalledTimes(2));
    await waitFor(async () => {
      const s = (await db.sessions.toArray())[0];
      expect(s.status).toBe('done'); expect(s.rest).toBeUndefined();
    });
  });

  it('yeni misafir boş başlar, program oluştur doğrudan düzenleyiciyi açar', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    expect(await db.programs.count()).toBe(0);
    expect(container.querySelector('#goal-add')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Program oluştur' }));
    expect(container.querySelector('.editor2')).toBeTruthy();
    fireEvent.click(container.querySelector('#tab-programlar'));
    fireEvent.click(container.querySelector('#tab-programlar'));
    expect(screen.getByText('Henüz programın yok')).toBeTruthy();
    expect(screen.queryByText('Şablonla başla')).toBeNull();
    expect(container.querySelector('.tmpl')).toBeNull();
    fireEvent.click(container.querySelector('#prog-empty-new'));
    expect(container.querySelector('.editor2')).toBeTruthy();
    expect(await db.programs.count()).toBe(0);
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
    await waitFor(() => expect(container.querySelector('#goal-add')).toBeTruthy());
    expect(await db.settings.get('goal')).toBeUndefined();
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
    await screen.findByRole('heading', { name: 'Bugün' });
    await waitFor(async () => expect(await db.programs.count()).toBe(1));
    click('#account-btn');
    expect(await screen.findByRole('dialog', { name: 'Hesap ve yedek' })).toBeTruthy();
    click('#email-signin');
    fireEvent.change(container.querySelector('#acct-email'), { target: { value: 'spor@example.com' } });
    fireEvent.change(container.querySelector('#acct-pass'), { target: { value: 'secret123' } });
    click('#acct-email-go');
    expect(await screen.findByRole('dialog', { name: 'Verilerin nasıl kullanılır' })).toBeTruthy();
    expect(container.querySelector('#consent-yes').disabled).toBe(true);
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

  it('kütüphaneyi filtreler ve karma pliometrik/kuvvet antrenmanını kaydeder', async () => {
    const { container } = render(<App />);
    const click = (selector) => fireEvent.click(container.querySelector(selector));
    const close = () => fireEvent.click(within(screen.getAllByRole('dialog').at(-1)).getAllByRole('button', { name: 'Kapat' }).at(-1));
    await screen.findByRole('heading', { name: 'Bugün' });
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
    await waitFor(() => expect(container.querySelector('#finish-btn')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Hareket ekle/ }));
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'box jump' } });
    fireEvent.click(container.querySelector('.exr-main'));
    await waitFor(() => expect(container.querySelector('#pq-1')).toBeTruthy());
    click('#pq-1');
    click('#log-set');
    click('#log-set');
    fireEvent.click(screen.getByRole('button', { name: 'Set 1: 5 temas. Ayrıntı' }));
    expect(within(screen.getAllByRole('dialog').at(-1)).getByText('Biraz düştü')).toBeTruthy();
    close();
    click('#fx-add');
    fireEvent.change(container.querySelector('#ex-search'), { target: { value: 'düz bench' } });
    fireEvent.click(container.querySelector('.exr-main'));
    await waitFor(() => expect(container.querySelector('#pq-1')).toBeNull());
    click('#log-set');
    click('#finish-btn');
    fireEvent.click(screen.getByRole('button', { name: 'Bitir ve özetle' }));
    expect(await screen.findByRole('dialog', { name: 'Antrenman özeti' })).toBeTruthy();
    await waitFor(async () => {
      const done = (await db.sessions.toArray()).find(s => s.status === 'done');
      expect(done.items[0].sets).toHaveLength(2);
      expect(done.items[0].sets[0]).toMatchObject({ plyo: true, reps: 5, rpe: null, q: 1 });
      expect(done.items[1].sets).toHaveLength(1);
    });
    expectHealthy();
  });

  it('v0.7 ana akışlarını hatasız tamamlar', async () => {
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

    await screen.findByRole('heading', { level: 1, name: 'Bugün' });
    await waitFor(async () => expect(await db.programs.count()).toBe(1));
    fireEvent.click(screen.getByRole('radio', { name: '5' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: '5' }).getAttribute('aria-checked')).toBe('true'));
    click('#ready-ring');
    expect(await screen.findByRole('dialog', { name: 'Yorgunluk ölçer' })).toBeTruthy();
    closeTopSheet();

    click('#tab-antrenman');
    const heavy = await screen.findByText('Ağır gün', { selector: 'strong' });
    fireEvent.click(heavy.closest('button')!);
    await waitFor(() => expect(container.querySelector('#log-set')).toBeTruthy());
    expect(container.querySelector('.tgt2')).toBeTruthy();
    expect(container.querySelector('.srow.plan')).toBeTruthy();
    expect(container.querySelector('#log-set').textContent).toBe('Set 1/2 kaydet');
    click('#log-set');
    click('#log-set');
    const firstSet = await screen.findByRole('button', { name: /Set 1:.*Ayrıntı/ });
    fireEvent.click(firstSet);
    expect(screen.getAllByRole('dialog').at(-1)).toBeTruthy();
    expect(screen.getByText('Kalan tekrar')).toBeTruthy();
    closeTopSheet();
    click('#finish-btn');
    fireEvent.click(await screen.findByRole('button', { name: 'Bitir ve özetle' }));
    expect(await screen.findByRole('dialog', { name: 'Antrenman özeti' })).toBeTruthy();
    expect(screen.getByText('Tonaj')).toBeTruthy();
    closeTopSheet();
    await waitFor(() => expect(container.querySelector('#tab-antrenman')?.getAttribute('aria-current')).toBe('page'));

    const menuButton = await screen.findByRole('button', { name: 'Ağır gün seçenekleri' });
    fireEvent.click(menuButton);
    const typeName = screen.getByLabelText('Tür adı');
    fireEvent.change(typeName, { target: { value: 'Ağır güç' } });
    fireEvent.blur(typeName);
    click('#wtype-del');
    expect(screen.getByRole('button', { name: 'Sil' })).toBeTruthy();
    closeTopSheet();

    click('#history-btn');
    click('#per-7');
    expect(container.querySelector('#per-7')?.getAttribute('aria-selected')).toBe('true');
    click('#hist-back');

    click('#free-session');
    await waitFor(() => expect(container.querySelector('#finish-btn')).toBeTruthy());
    click('#finish-btn');
    fireEvent.click(await screen.findByRole('button', { name: 'Kaydetmeden çık' }));
    await waitFor(() => expect(container.querySelector('#tab-antrenman')?.getAttribute('aria-current')).toBe('page'));

    click('#tab-programlar');
    await waitFor(() => expect(container.querySelector('button[id^="open-"]')).toBeTruthy());
    fireEvent.click(container.querySelector('button[id^="open-"]')!);
    click('#add-item');
    const picker = await screen.findByRole('dialog', { name: 'Hareket ekle' });
    fireEvent.click(picker.querySelector('.exr-main')!);
    click('#plan-dock');
    expect(await screen.findByRole('dialog', { name: 'Program analizi' })).toBeTruthy();
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
});
