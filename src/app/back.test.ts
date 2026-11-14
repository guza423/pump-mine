// @vitest-environment jsdom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { backStack, createExitGuard, useAndroidBack, useBack } from './back';

const native = vi.hoisted(() => ({ back: undefined as undefined | (() => void), exit: vi.fn(), remove: vi.fn(), enabled: true }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.enabled } }));
vi.mock('@capacitor/app', () => ({ App: {
  addListener: vi.fn(async (_event: string, callback: () => void) => { native.back = callback; return { remove: native.remove }; }),
  exitApp: native.exit,
} }));
beforeEach(() => { vi.clearAllMocks(); native.exit.mockResolvedValue(undefined); native.enabled = true; native.back = undefined; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

function Layer({ name, close }: { name: string; close: () => void }) {
  useBack(true, close);
  return React.createElement('span', null, name);
}
function Harness() {
  const [tab, setTab] = useState('antrenman');
  const [layers, setLayers] = useState(['alt ekran', 'onay', 'sheet', 'üst sheet']);
  const toast = useAndroidBack(tab, () => setTab('bugun'));
  return React.createElement(React.Fragment, null,
    React.createElement('div', { 'data-testid': 'tab' }, tab),
    React.createElement('div', null, 'oturum sürüyor'),
    layers.map(name => React.createElement(Layer, { key: name, name, close: () => setLayers(a => a.filter(x => x !== name)) })),
    React.createElement('button', { onClick: () => setTab('lab') }, 'Lab'),
    toast ? React.createElement('div', { role: 'status' }, 'Çıkmak için tekrar bas') : null,
  );
}

it('sheet > onay > alt ekran > oturum/sekme → Bugün > çift basış sırasını uygular', async () => {
  vi.useFakeTimers(); render(React.createElement(Harness));
  await act(async () => { await Promise.resolve(); });
  for (const name of ['üst sheet', 'sheet', 'onay', 'alt ekran']) {
    act(() => native.back!());
    expect(screen.queryByText(name)).toBeNull();
    expect(screen.getByTestId('tab').textContent).toBe('antrenman');
  }
  act(() => native.back!());
  expect(screen.getByTestId('tab').textContent).toBe('bugun');
  expect(screen.getByText('oturum sürüyor')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Lab' }));
  act(() => native.back!()); expect(screen.getByTestId('tab').textContent).toBe('bugun');
  act(() => native.back!()); expect(screen.getByRole('status').textContent).toBe('Çıkmak için tekrar bas');
  expect(native.exit).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(2001)); expect(screen.queryByRole('status')).toBeNull();
  act(() => native.back!()); expect(native.exit).not.toHaveBeenCalled();
  act(() => native.back!()); expect(native.exit).toHaveBeenCalledTimes(1);
});

it('kanca kapanınca yığından çıkar, güncel işleyiciyi kullanır ve native dinleyiciyi temizler', async () => {
  const first = vi.fn(), latest = vi.fn();
  const view = render(React.createElement(Layer, { name: 'sheet', close: first }));
  view.rerender(React.createElement(Layer, { name: 'sheet', close: latest }));
  act(() => { backStack.dispatch(); }); expect(first).not.toHaveBeenCalled(); expect(latest).toHaveBeenCalledOnce();
  view.unmount(); expect(backStack.dispatch()).toBe(false);
  const root = render(React.createElement(Harness));
  await act(async () => { await Promise.resolve(); });
  root.unmount(); expect(native.remove).toHaveBeenCalledOnce();
});

it('iki saniye sınırında çıkış yerine yeniden toast gösterir', () => {
  let now = 1000; const toast = vi.fn(), exit = vi.fn();
  const guard = createExitGuard(toast, exit, () => now);
  guard.press(); now = 3000; guard.press();
  expect(exit).not.toHaveBeenCalled(); expect(toast).toHaveBeenCalledTimes(2);
  guard.reset(); guard.press(); expect(exit).not.toHaveBeenCalled();
});
