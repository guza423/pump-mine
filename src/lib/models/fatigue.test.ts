import { describe, expect, it } from 'vitest';
import { fatigueAt, fatigueResult, isoLocalDate, movementCost, proximityWeight, simulatePlan, sleepScore, trainingLoad, trainingScoreFromLoad } from './fatigue';
import { TEMPLATES, programFromTemplate } from '../../features/antrenman/core';

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

  it('üç gece 5 saat uykuyu 30, eksik kaydı 0 puanlar', () => {
    expect(sleepScore([5, 5, 5])).toBe(30);
    expect(sleepScore([null, null, null])).toBe(0);
  });

  it('toplamı durum etiketiyle döndürür', () => {
    const result = fatigueResult([], [5, null, null], Date.UTC(2026, 0, 8));
    expect(result.total).toBeCloseTo(23.333, 2);
    expect(result.label).toBe('Yönetilebilir');
  });

  it('Ağır gün kaydı ve uykuya göre toplam skoru üretir', () => {
    const now = new Date(2026, 9, 25, 12).getTime();
    const program = programFromTemplate(TEMPLATES[0]);
    const day = program.days.find((item: any) => item.name === 'Ağır gün');
    const startedAt = now - 16 * 3_600_000;
    let cursor = startedAt;
    const session = {
      id: 's_test', status: 'done', startedAt, endedAt: now, items: day.items.map((item: any) => ({
        exId: item.exId, name: item.name, muscle: item.muscle,
        sets: Array.from({ length: item.sets }, () => {
          cursor += (item.rest + 40) * 1000;
          const rir = 10 - (item.rpeMin == null ? 8 : (item.rpeMin + (item.rpeMax ?? item.rpeMin)) / 2);
          return { kg: item.kg || 40, reps: item.repMax, rir, rpe: 10 - rir, at: cursor };
        }),
      })),
    };
    const state = (sleep: number) => ({ programs: [program], sessions: [session], checkins: [{ id: `c_${isoLocalDate(now)}`, sleep, at: now }] });
    expect(fatigueAt(state(8), now).score).toBeCloseTo(52, 0);
    expect(fatigueAt(state(5), now).score).toBeCloseTo(75, 0);
  });

  it('şablon program simülasyonunu prototiple aynı aralıkta tutar', () => {
    const result = simulatePlan(programFromTemplate(TEMPLATES[0]));
    expect(Math.abs((result?.pre || 0) - 21)).toBeLessThanOrEqual(1);
    expect(Math.abs((result?.post || 0) - 76)).toBeLessThanOrEqual(1);
  });
});
