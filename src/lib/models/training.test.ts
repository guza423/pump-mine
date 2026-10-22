import { describe, expect, it } from 'vitest';
import { e1rm, repVelocities, rirFromSpeed } from './training';

describe('hız / RIR modeli', () => {
  it.each([
    [8, 3, 2.5],
    [8, 4, 0.25],
    [5, 2, 3.25],
  ])('%i tekrar ve %i hız seviyesi için RIR ≈ %s', (reps, level, expected) => {
    expect(rirFromSpeed(reps, level)).toBeCloseTo(expected, 5);
  });

  it('tek tekrarlı setlerde sabit RIR eşlemesini kullanır', () => {
    expect([0, 1, 2, 3, 4].map((level) => rirFromSpeed(1, level))).toEqual([4, 3, 2, 1, 0]);
  });

  it('tekrar hızlarını monoton olarak düşürür', () => {
    const velocities = repVelocities(8, 2, 0.47);
    expect(velocities).toHaveLength(8);
    expect(velocities.every((value, index) => index === 0 || value <= velocities[index - 1])).toBe(true);
  });
});

describe('e1RM modeli', () => {
  it('75 kg × 8 @ 2 RIR için 100 kg hesaplar', () => {
    expect(e1rm(75, 8, 2)).toBe(100);
  });
});
