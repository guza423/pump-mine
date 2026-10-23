// @vitest-environment jsdom
// @ts-nocheck
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('tüm sekmeleri, hareketleri, aşamaları ve antrenman özetini hatasız açar', async () => {
    const { container } = render(<App />);

    fireEvent.click(document.querySelector('#tab-merkez'));
    expect(screen.getByRole('heading', { level: 1, name: 'Merkez' })).toBeTruthy();
    expectHealthy();

    fireEvent.click(document.querySelector('#tab-gunluk'));
    expect(screen.getByRole('heading', { level: 1, name: 'Günlük' })).toBeTruthy();
    await screen.findByText('Hipertrofi bloğu');
    expectHealthy();

    fireEvent.click(document.querySelector('#tab-biyomekanik'));
    expect(screen.getByRole('heading', { level: 1, name: 'Biyomekanik' })).toBeTruthy();
    for (const id of ['bench', 'rdl', 'yanaacis']) {
      fireEvent.click(container.querySelector(`#move-${id}`));
      expect(container.querySelector(`#move-${id}`)?.getAttribute('aria-selected')).toBe('true');
      expectHealthy();
    }

    fireEvent.click(document.querySelector('#tab-yorgunluk'));
    expect(screen.getByRole('heading', { level: 1, name: 'Yorgunluk' })).toBeTruthy();
    for (const id of ['sinyal', 'kazanim', 'atesleme', 'periferik', 'toparlanma']) {
      fireEvent.click(container.querySelector(`#node-${id}`));
      await waitFor(() => expect(container.querySelector(`#node-${id}`)?.getAttribute('aria-current')).toBe('step'));
      expectHealthy();
    }

    fireEvent.click(document.querySelector('#tab-gunluk'));
    await screen.findByText('Hipertrofi bloğu');
    const startButton = container.querySelector('button[id^="start-"]:not([disabled])');
    expect(startButton).toBeTruthy();
    fireEvent.click(startButton);

    const logSet = await waitFor(() => {
      const button = container.querySelector('#log-set');
      expect(button).toBeTruthy();
      return button;
    });
    fireEvent.click(logSet);
    expect(await screen.findByText(/1 set/)).toBeTruthy();

    fireEvent.click(container.querySelector('#finish-btn'));
    fireEvent.click(await screen.findByRole('button', { name: 'Bitir ve özetle' }));

    await waitFor(() => expect(container.querySelector('.summary')).toBeTruthy());
    expect(screen.getByText('Antrenman tamamlandı')).toBeTruthy();
    expectHealthy();

    await act(async () => {
      await Promise.resolve();
    });
  });
});
