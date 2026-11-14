import { describe, expect, it } from 'vitest';
import { bestE1, itemFromEx, libById, sessionStats } from '../../features/antrenman/core';
import { fatigueAt, periodMetrics, planStats, simulatePlan } from './fatigue';

describe('pliometrik hesaplar', () => {
  const at = Date.now();
  const session = (reps: number) => ({ status: 'done', startedAt: at, endedAt: at + 1000, items: [{ exId: 'box-jump', muscle: 'Quadriceps', target: { rest: 120 }, sets: [{ kg: 20, reps, rir: 0, rpe: null, plyo: true, at }] }] });

  it('temasları kuvvet metriklerine katmaz', () => {
    for (const reps of [20, 5]) {
      const s = session(reps);
      expect(sessionStats(s)).toMatchObject({ hard: [], tonnage: 0, contacts: reps });
      expect(bestE1(s.items[0].sets)).toBe(0);
      expect(periodMetrics([s], 7)).toMatchObject({ hard: 0, ton: 0, avgRpe: 0, contacts: reps });
    }
  });

  it('100 orta yoğunluk temasını 5 yük olarak sayar ve 36 saatte azaltır', () => {
    const st = { sessions: [session(100)], checkins: [], programs: [] };
    expect(fatigueAt(st, at)).toMatchObject({ sum: 5, hard: 0, fail: 0, contacts: 100 });
    expect(fatigueAt(st, at + 36 * 36e5).sum).toBeCloseTo(5 / Math.E);
    const program = { days: [{ weekday: 1, items: [itemFromEx(libById('box-jump'))] }] };
    expect(planStats(program).muscles).toEqual({});
    expect(simulatePlan(program)?.post).toBeGreaterThan(0);
  });

  it('hareket türüne uygun varsayılanları kullanır', () => {
    expect(itemFromEx(libById('box-jump'))).toMatchObject({ sets: 3, repMin: 5, repMax: 5, rpeMin: null });
    expect(itemFromEx(libById('duz-bench'))).toMatchObject({ sets: 3, repMin: 8, repMax: 12, rpeMin: 7, rpeMax: 9 });
  });
});
