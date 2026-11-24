import { describe, expect, it } from 'vitest';
import { dragRate, SLOW_RATE } from '../../features/antrenman/pixelHelpers';
import { setE1 } from './training';

describe('V34 · sürgü hızı parmağın konumuyla', () => {
  const r = { bottom: 300 };
  it('bar üstünde ve yakınında tam hız, alt kenarın 56 px altında %40', () => {
    expect(dragRate(250, r)).toBe(1);
    expect(dragRate(350, r)).toBe(1);
    expect(dragRate(357, r)).toBe(SLOW_RATE);
    expect(SLOW_RATE).toBe(0.4);
  });
  it('yavaştan çıkmak için 36 px eşiği (titremez)', () => {
    expect(dragRate(345, r, SLOW_RATE)).toBe(SLOW_RATE);
    expect(dragRate(335, r, SLOW_RATE)).toBe(1);
  });
});

describe('V34 · setin 1RM tahmini', () => {
  it('güvenilir aralıkta Epley, ok', () => {
    expect(setE1({ kg: 100, reps: 5, rir: 2 })).toEqual({ v: 123.5, ok: true });
  });
  it('yüksek tekrarda yaklaşık (gelişime girmez)', () => {
    // 20 × 16, RIR 0 → 20 × (1 + 16/30) = 30,67 → 30,5
    expect(setE1({ kg: 20, reps: 16, rir: 0 })).toEqual({ v: 30.5, ok: false });
  });
  it('hız "Aynı" (RIR 5+) 5 alınır, yaklaşık', () => {
    expect(setE1({ kg: 60, reps: 5, rir: 5 })).toEqual({ v: 80, ok: false });
  });
  it('kısmi tekrar yaklaşık; ısınma, pliometrik, beceri ve kilosuz set yok', () => {
    expect(setE1({ kg: 100, reps: 5, rir: 2, rom: 70 })?.ok).toBe(false);
    expect(setE1({ kg: 60, reps: 5, rir: 9, warm: true })).toBeNull();
    expect(setE1({ kg: 0, reps: 10, rir: 2 })).toBeNull();
    expect(setE1({ kg: 10, reps: 10, rir: 9, plyo: true })).toBeNull();
  });
});
