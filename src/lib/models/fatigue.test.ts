import { describe, expect, it } from 'vitest';
import { fatigueResult, movementCost, proximityWeight, sleepScore, trainingLoad, trainingScoreFromLoad } from './fatigue';

describe('v0.7 yorgunluk modeli', () => {
  it('yakınlık ve hareket maliyetlerini uygular', () => {
    expect([0, 1, 2, 3, 4].map(proximityWeight)).toEqual([1.6, 1.3, 1.1, 1, 0.8]);
    expect([1, 2, 3].map((value) => movementCost(value as 1 | 2 | 3))).toEqual([0.6, 1, 1.5]);
  });

  it('36 saatlik üstel azalmayı uygular', () => {
    const now = Date.UTC(2026, 0, 8);
    const current = trainingLoad([{ at: now, rir: 0, fatigue: 3 }], now);
    const after36h = trainingLoad([{ at: now - 36 * 3_600_000, rir: 0, fatigue: 3 }], now);
    expect(after36h / current).toBeCloseTo(Math.exp(-1), 6);
  });

  it('yükü doygunluk eğrisiyle skora çevirir', () => {
    expect(trainingScoreFromLoad(20)).toBeCloseTo(63.212, 2);
  });

  it('tek bilinen 5 saatlik geceyi yaklaşık 23 olarak puanlar', () => {
    expect(sleepScore([5, null, null])).toBeCloseTo(23.333, 2);
  });

  it('toplamı durum etiketiyle döndürür', () => {
    const result = fatigueResult([], [5, null, null], Date.UTC(2026, 0, 8));
    expect(result.total).toBeCloseTo(23.333, 2);
    expect(result.label).toBe('Yönetilebilir');
  });
});
