// @vitest-environment jsdom
// @ts-nocheck
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../app/App';
import { db } from '../lib/store/database';

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
    window.location.hash = '';
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    cleanup();
    db.close();
    await db.delete();
  });

  it('v0.7 ana akışlarını hatasız tamamlar', async () => {
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
    click('#labex-egimli-bench');
    expect(await screen.findByRole('dialog', { name: 'Eğimli bench press' })).toBeTruthy();
    expectHealthy();

    await act(async () => {
      await Promise.resolve();
    });
  });
});
