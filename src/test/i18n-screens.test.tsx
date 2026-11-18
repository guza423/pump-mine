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
import { LANG_KEY, getLang, setLang } from '../i18n';
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


// V21 · İngilizce (varsayılan dil) ekranları: Dashboard, Hesap ve ayarlar, yasal kapı, yorgunluk ölçer.
// Kullanıcının yazdığı adlar (plan, gün) Türkçe kalabilir; ekranın kendi metinlerinde Türkçe harf olmamalı.
const TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
const turkishIn = (el, skip = []) => {
  const clone = el.cloneNode(true);
  for (const sel of skip) clone.querySelectorAll(sel).forEach((n) => n.remove());
  return (clone.textContent.match(/\S*[çğıöşüÇĞİÖŞÜ]\S*/g) || []);
};
const attrsTurkish = (el, skip = []) => [...el.querySelectorAll('[aria-label], [placeholder], [title]')]
  .filter((n) => !skip.some((sel) => n.closest(sel)))
  .flatMap((n) => ['aria-label', 'placeholder', 'title'].map((a) => n.getAttribute(a)).filter((v) => v && TR_CHARS.test(v)));

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
    // Ders kısayolları Lab ile birlikte çevrilecek (V24).
    expect(turkishIn(dialog, ['.fat2-learn'])).toEqual([]);
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
});
