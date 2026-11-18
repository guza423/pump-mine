// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { HoldButton } from './HoldButton';

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('HoldButton', () => {
  it('basılı tutma süresi dolunca çalışır, dolan çubuk görünür', () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const { getByRole } = render(<HoldButton ms={1000} onHold={onHold}>Sil</HoldButton>);
    const b = getByRole('button', { name: 'Sil' });
    fireEvent.pointerDown(b, { button: 0, pointerId: 1 });
    expect(b.className).toContain(' on');
    act(() => { vi.advanceTimersByTime(999); });
    expect(onHold).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onHold).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(b, { button: 0, pointerId: 1 });
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it('erken bırakılırsa çalışmaz ve "basılı tut" ipucu yanıp söner; dokunmak (click) da çalıştırmaz', () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const { getByRole } = render(<HoldButton ms={500} onHold={onHold}>İDMANI BİTİR</HoldButton>);
    const b = getByRole('button', { name: 'İDMANI BİTİR' });
    fireEvent.pointerDown(b, { button: 0, pointerId: 1 });
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.pointerUp(b, { button: 0, pointerId: 1 });
    fireEvent.click(b, { detail: 1 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onHold).not.toHaveBeenCalled();
    expect(b.querySelector('.px-hold-hint')?.textContent).toBe('basılı tut');
  });

  it('klavye / ekran okuyucu ile etkinleştirme (detail 0) basılı tutmadan çalışır; devre dışıyken çalışmaz', () => {
    const onHold = vi.fn();
    const { getByRole, rerender } = render(<HoldButton onHold={onHold}>Sil</HoldButton>);
    fireEvent.click(getByRole('button', { name: 'Sil' }), { detail: 0 });
    expect(onHold).toHaveBeenCalledTimes(1);
    rerender(<HoldButton onHold={onHold} disabled>Sil</HoldButton>);
    fireEvent.click(getByRole('button', { name: 'Sil' }), { detail: 0 });
    expect(onHold).toHaveBeenCalledTimes(1);
  });
});
